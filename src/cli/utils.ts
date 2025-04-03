// src/cli/utils.ts
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { execSync } from "child_process";
import { detectPackageManager } from "../utils/manager.js";
import inquirer from "inquirer";
import { config } from "../config.js";
import { ConsoleUtils } from "../utils/console.js";
import { getInstallCommand } from "../utils/manager.js";
import { spawnSync } from "child_process";
import { createRequire } from "module";
import fg from "fast-glob";
import boxen from "boxen";



export function parseEnvFile(content: string): Record<string, string> {
  const lines = content.split("\n");
  const result: Record<string, string> = {};

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.substring(0, eqIndex).trim();
    const val = line.substring(eqIndex + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
    result[key] = val;
  }
  return result;
}
/**
 * Writes or updates secrets in a .env or similar configuration file
 * while preserving comments, formatting, and existing non-updated variables.
 * 
 * @param {Record<string, string>} vars - Object containing new or updated secrets
 * @param {string} secretsFile - Path to the secrets file
 * 
 * @example
 * // Update or add secrets to .env file
 * writeDotSecrets({
 *   DATABASE_URL: 'postgresql://user:pass@host:port/db',
 *   API_KEY: 'new-api-key'
 * }, '.env');
 * 
 * @remarks
 * - Preserves comments and empty lines
 * - Handles commented variables with #
 * - Adds new secrets at the end of the file
 * - Does not duplicate existing variables
 * - Maintains original file structure
 */
export function writeDotSecrets(vars: Record<string,string>, secretsFile: string) {
  const existingLines = fs.existsSync(secretsFile)
    ? fs.readFileSync(secretsFile, 'utf-8').split('\n')
    : [];

  const existingSecrets: Record<string,string> = {};

  // Parse existing file
  existingLines.forEach(line => {
    const trimmed = line.trim();
    // Skip blank
    if (!trimmed) return;

    // Commented-out variable?
    const commentedMatch = trimmed.match(/^#\s*([A-Za-z0-9_]+)=(.*)$/);
    if (commentedMatch) {
      existingSecrets[commentedMatch[1]] = commentedMatch[2];
      return;
    }

    // Active variable
    const kvMatch = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (kvMatch) {
      existingSecrets[kvMatch[1]] = kvMatch[2];
    }
  });

  // Merge (new vars override existing)
  const merged = { ...existingSecrets, ...vars };

  // Rebuild content: preserve comments + unchanged keys, then updated/added at end
  const seen = new Set<string>();
  const newLines: string[] = existingLines.map(line => {
    const trimmed = line.trim();
    const kvMatch = trimmed.match(/^#?\s*([A-Za-z0-9_]+)=/);
    if (kvMatch) {
      const key = kvMatch[1];
      if (key in vars) {
        seen.add(key);
        return `${key}=${merged[key]}`;
      }
    }
    return line;
  });

  // Append any new keys not in original file
  Object.entries(vars).forEach(([k, v]) => {
    if (!seen.has(k)) {
      newLines.push(`${k}=${v}`);
    }
  });

  fs.writeFileSync(secretsFile, newLines.join('\n'));
}


export function uninstallDotenv(cwd: string = process.cwd()) {
  const pm = detectPackageManager();
  let cmd = "";

  switch (pm) {
    case "yarn":
      cmd = "yarn remove dotenv";
      break;
    case "pnpm":
      cmd = "pnpm remove dotenv";
      break;
    default:
      cmd = "npm uninstall dotenv";
      break;
  }

  console.log(chalk.gray(`Detected package manager: ${pm}. Running: ${cmd}`));

  try {
    execSync(cmd, { stdio: "inherit", cwd });
    console.log(chalk.green("Successfully uninstalled dotenv."));
  } catch (error) {
    console.log(chalk.red("Failed to uninstall dotenv:"), error);
  }
}


export async function ensureVariables(vars: Record<string, string | undefined>): Promise<Record<string,string>> {
  // 1️⃣ Load current values (but don’t override process.env)
  const existing = config({watch:false, override: true, autoInit: false, skipAutoConfig: true, debug: false});

  // 2️⃣ Build prompts
  const questions = Object.entries(vars).map(([key, defaultValue]) => {
    const current = existing[key] ?? process.env[key];
    return {
      type: "input" as const,
      name: key,
      message: current
      ? `Enter value for ${key} (current: ${ConsoleUtils.clickable(existing[key])}):`
      : (defaultValue !== undefined ? `Enter value for ${key} (default: ${ConsoleUtils.clickable(defaultValue)}):`: `Enter value for ${key}:`),
      default: current ?? defaultValue,
      validate: (v: string) => (v.trim() ? true : `${key} is required.`),
    };
  });

  // 3️⃣ Ask all at once
  const answers = await inquirer.prompt(questions);

  // 4️⃣ Persist into process.env and return
  for (const [k, v] of Object.entries(answers)) {
    process.env[k] = v.trim();
  }

  ConsoleUtils.info(`✔️  Environment variables ready: ${Object.keys(vars).join(", ")}`);
  return answers;
}

export async function forceSetVars(
  vars: Record<string, string | undefined>
): Promise<Record<string,string>> {
  // 1️⃣ Apply to process.env
  Object.entries(vars).forEach(([key, val]) => {
    process.env[key] = val ?? "";
  });

  // 2️⃣ Show summary
  ConsoleUtils.log("🔧 Now setting environment variables:");
  Object.entries(vars).forEach(([k, v]) =>
    ConsoleUtils.log(`  ${chalk.bold(k)} = ${ConsoleUtils.clickable(v ?? "")}`)
  );

  // 3️⃣ Select persistence
  const { save } = await inquirer.prompt({
    type: "confirm",
    name: "save",
    message: "Do you want to persist these values to disk?",
    default: true,
  });

  if (save) {
    const candidates = await fg([".env*", ".secrets*"], {
      dot: true,
      ignore: ["**/*.example", "**/*.sample", "**/*.template"],
    });

    if (candidates.length === 0) {
      ConsoleUtils.warn("No .env or .secrets files found to write into.");
    } else {
      const { target } = await inquirer.prompt({
        type: "list",
        name: "target",
        message: "Select file to write into:",
        choices: candidates,
      });

      const fullPath = path.resolve(target);
      const isSecrets = target.startsWith(".secrets");

      // Write all keys at once
      if (isSecrets) {
        writeDotSecrets(vars as Record<string,string>, fullPath);
      } else {
        let content = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
        Object.entries(vars).forEach(([key, value]) => {
          const line = `${key}=${value}\n`;
          const regex = new RegExp(`^${key}=.*$`, "m");
          content = regex.test(content) ? content.replace(regex, line.trim()) : content + line;
        });
        fs.writeFileSync(fullPath, content);
      }
      ConsoleUtils.success(`Persisted to ${target}`);
    }
  }

  // 4️⃣ Production reminder
  console.log(
    boxen(
      chalk.yellow(
        "Reminder: In production set these variables directly on your host — do NOT commit secrets files."
      ),
      { padding: 1, borderColor: "yellow", borderStyle: "round" }
    )
  );

  return vars as Record<string,string>;
}

export async function ensureAndPersistEnvVars(
  ...keys: string[]
): Promise<Record<string,string>> {

  // 1️⃣ Load existing values
  const existing = config({watch:false, override: true, autoInit: false, skipAutoConfig: true, debug: false});
  const answers = await inquirer.prompt(
    keys.map((key) => ({
      type: "input" as const,
      name: key,
      message: existing[key]
        ? `Enter value for ${key} (current: ${ConsoleUtils.clickable(existing[key])}):`
        : `Enter value for ${key}:`,
      default: existing[key],
      validate: (val: string) => (val.trim() ? true : `${key} is required.`),
    }))
  );

  Object.entries(answers).forEach(([k, v]) => {
    process.env[k] = v.trim();
  });

  // 2️⃣ Ask if user wants to save
  const { save } = await inquirer.prompt({
    type: "confirm",
    name: "save",
    message: "Would you like to save these values to a file?",
    default: true,
  });
  if (save) {
    // 3️⃣ Discover all .env* & .secrets* files
    const candidates = await fg([".env*", ".secrets*"], {
      dot: true,
      ignore: ["**/*.example", "**/*.sample", "**/*.template"],
    });

    if (candidates.length === 0) {
      ConsoleUtils.warn("No .env or .secrets files found to save into.");
    } else {
      const { target } = await inquirer.prompt({
        type: "list",
        name: "target",
        message: "Select file to write values into:",
        choices: candidates,
      });

      const fullPath = path.resolve(target);
      const isSecrets = target.startsWith(".secrets");

      for (const [key, value] of Object.entries(answers)) {
        const line = `${key}=${value}\n`;
        if (isSecrets) {
          // use writeDotSecrets (merges existing)
          writeDotSecrets({ [key]: value }, fullPath);
        } else {
          // .env append/update
          let content = "";
          if (fs.existsSync(fullPath)) content = fs.readFileSync(fullPath, "utf8");
          const regex = new RegExp(`^${key}=.*$`, "m");
          content = regex.test(content)
            ? content.replace(regex, line.trim())
            : content + line;
          fs.writeFileSync(fullPath, content);
        }
        ConsoleUtils.success(`Saved ${key} to ${target}`);
      }
    }
  }

  // 4️⃣ Production warning
  console.log(
    boxen(
      chalk.yellow(
        "Reminder: In production you should set these environment variables directly on your host — do NOT commit .env/.secrets with sensitive data."
      ),
      { padding: 1, borderColor: "yellow", borderStyle: "round" }
    )
  );

  return answers;
}

/**
 * Checks if an npm package is installed, otherwise prompts the user to install it.
 * @param pkgName Full package name (e.g. "@bytehide/secrets" or "lodash")
 * @returns Promise<boolean> true if installed (or successfully installed), false if user skipped
 */
export async function ensurePackageInstalled(pkgName: string, log: boolean = false): Promise<boolean> {
  const require = createRequire(import.meta.url);

  try {
    require.resolve(pkgName);
    if(log)
      ConsoleUtils.success(`${pkgName} is installed.`);
    return true;
  } catch {
    ConsoleUtils.warn(`${pkgName} is not installed.`);
  }

  const { install } = await inquirer.prompt([
    {
      type: "confirm",
      name: "install",
      message: `Would you like to install ${chalk.bold(pkgName)} now?`,
      default: true,
    },
  ]);

  if (!install) return false;

  const installCmd = getInstallCommand(pkgName);
  ConsoleUtils.log(`Running: ${ConsoleUtils.clickable(installCmd)}`);

  const [cmd, ...args] = installCmd.split(" ");
  const result = spawnSync(cmd, args, { stdio: "inherit" });

  if (result.error || result.status !== 0) {
    ConsoleUtils.error(`Failed to install ${pkgName}: ${result.error?.message ?? `exit code ${result.status}`}`, true);
    return false;
  }

  try {
    require.resolve(pkgName);
    ConsoleUtils.success(`${pkgName} installed successfully.`);
    return true;
  } catch {
    ConsoleUtils.error(`Unable to resolve ${pkgName} after installation.`, true);
    return false;
  }
}

type ExcludeSecretsOptions = {
  secrets: Record<string, string>;
  excludeKeys: string[];
  promptMessage: string; // con "KEY" como placeholder
};

export async function filterSecretsWithExclusions({
  secrets,
  excludeKeys,
  promptMessage,
}: ExcludeSecretsOptions): Promise<Record<string, string>> {
  const finalSecrets: Record<string, string> = { ...secrets };
  const found: string[] = [];

  for (const key of excludeKeys) {
    if (key in finalSecrets) {
      found.push(key);
    }
  }

  if (found.length === 0) return finalSecrets;

  const keysText = found.map(k => `  - ${k}`).join("\n");
  const plural = found.length === 1 ? "is" : "are";

  const message = promptMessage
    .replace(/KEYS/g, keysText)
    .replace(/\[are\/is\]/g, plural);

  const { exclude } = await inquirer.prompt([
    {
      type: "confirm",
      name: "exclude",
      message,
      default: true,
    },
  ]);

  if (exclude) {
    for (const key of found) {
      delete finalSecrets[key];
    }
  }

  return finalSecrets;
}