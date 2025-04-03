import fs from "fs";
import path from "path";
import crypto from "crypto";
import chokidar from "chokidar";
import { exec } from "child_process";
import { getRunCommand } from "./utils/manager.js";
import { ConsoleUtils } from "./utils/console.js";
import { loadOptions, DotSecretsOptions } from './options.js';

/**
 * Loads and merges secrets from .env and .secrets files with proper priority handling.
 * 
 * This function handles:
 * 1. Loading from .env and .env.{environment} files
 * 2. Loading from .secrets and .secrets.{environment} files
 * 3. Merging results with priority for .secrets files
 * 4. Expanding variable references
 * 5. Setting up file watchers for auto-reload
 * 
 * @param options - Configuration options object
 * @returns Record of loaded secrets and environment variables
 * 
 * @example
 * // Basic usage with defaults
 * const secrets = config();
 * 
 * @example
 * // Custom configuration
 * const secrets = config({
 *   path: '.custom-secrets',
 *   environment: 'staging',
 *   watch: true,
 *   expand: true
 * });
 */
export function config(options: DotSecretsOptions = {}): Record<string, string> {
  // Get combined options from files, env vars and parameters
  const mergedOptions = loadOptions(options);
  
  // Destructure options for use in this function
  const {
    path: basePath,
    envPath,
    environment,
    encoding,
    watch,
    debug,
    override,
    expand,
    encryptionKey
  } = mergedOptions;

  ConsoleUtils.setDebug(debug as boolean);

  // 1. Load .env and .env.{environment} files
  const envBase = loadEnvFile(envPath as string, encoding as BufferEncoding, override as boolean);
  const envEnvironment = environment ? loadEnvFile(`${envPath}.${environment}`, encoding as BufferEncoding, override as boolean) : {};

  // 2. Load .secrets files and .secrets.{environment} files
  const secretsBase = loadSecretsFile(basePath as string, encoding as BufferEncoding, override as boolean, encryptionKey as string);
  const secretsEnvironment = environment ? loadSecretsFile(`${basePath}.${environment}`, encoding as BufferEncoding, override as boolean, encryptionKey as string) : {};

  // 3. Merge results with priority for .secrets files
  const finalResult = {
    ...envBase,
    ...envEnvironment,
    ...secretsBase,
    ...secretsEnvironment, // .secrets overrides .env in case of conflict
  };

  // 4. Load public configuration files
  const publicFiles = [
    ".public",
    ".secrets.public",
    ".env.public"
  ];

  for (const pFile of publicFiles) {
    const fullP = path.resolve(pFile);
    if (fs.existsSync(fullP)) {
      const publicResult = loadSecretsFile(fullP, encoding as BufferEncoding, override as boolean, encryptionKey as string|undefined); 
      Object.assign(finalResult, publicResult);
    }
  }

  // 5. Expand variables if expand is true (resolves ${VAR} references)
  if (expand) {
    expandVariables(finalResult);
  }

  // 6. Set up file watchers if enabled
  if (watch) {
    watchSecretsFiles();
  }

  return finalResult;
}

// Re-export useful functions from options.ts
export { shouldSkipAutoConfig, shouldAutoInit } from './options.js';
export type { DotSecretsOptions } from './options.js';

/**
 * Loads a .env file, parses it and assigns values to process.env
 * 
 * @param fileName - Path to the .env file
 * @param encoding - File encoding
 * @param override - Whether to override existing env variables
 * @returns Record of parsed environment variables
 */
function loadEnvFile(
  fileName: string,
  encoding: BufferEncoding,
  override: boolean
): Record<string, string> {
  const fullPath = path.resolve(fileName);
  const result: Record<string, string> = {};

  if (!fs.existsSync(fullPath)) {
      ConsoleUtils.warn(`.env file not found: ${fullPath}`);
    return result;
  }

  const raw = fs.readFileSync(fullPath, { encoding });
  const lines = raw.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.substring(0, eqIndex).trim();
    const val = trimmed.substring(eqIndex + 1).trim();

    if (!override && process.env[key] !== undefined) {
        ConsoleUtils.debug(`Skipping existing .env var ${key}`);
      continue;
    }

    process.env[key] = val;
    result[key] = val;

    ConsoleUtils.debug(`Loaded .env var ${key}=***`);
  }

  return result;
}

/**
 * Reads a .secrets file, decrypts it if necessary, and assigns values to process.env
 * 
 * @param fileName - Path to the .secrets file
 * @param encoding - File encoding
 * @param override - Whether to override existing env variables
 * @param encryptionKey - Key for decryption, if encrypted
 * @returns Record of parsed secrets
 */
function loadSecretsFile(
  fileName: string,
  encoding: BufferEncoding,
  override: boolean,
  encryptionKey?: string
): Record<string, string> {
  const fullPath = path.resolve(fileName);
  const result: Record<string, string> = {};

  if (!fs.existsSync(fullPath)) {
    ConsoleUtils.warn(`.secrets file not found: ${fullPath}`);
    return result;
  }

  let raw = fs.readFileSync(fullPath, { encoding });

  // Decrypt if encryptionKey is provided and not empty
  if (encryptionKey !== undefined && encryptionKey !== "") {
    raw = decryptData(raw, encryptionKey);
  }

  const lines = raw.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.substring(0, eqIndex).trim();
    const val = trimmed.substring(eqIndex + 1).trim();

    if (!override && process.env[key] !== undefined) {
        ConsoleUtils.debug(`Skipping existing secret ${key}`);
      continue;
    }

    process.env[key] = val;
    result[key] = val;

    // Hide actual value in logs for security
    ConsoleUtils.debug(`Loaded secret ${key}=***`);
  }

  return result;
}

/**
 * Decrypts an encrypted .secrets file using AES-256-CBC
 * 
 * The encryption format expects:
 * - Base64-encoded data
 * - First 16 bytes: Initialization Vector (IV)
 * - Remaining bytes: Ciphertext
 * 
 * @param encryptedBase64 - Base64 encoded encrypted data
 * @param encryptionKey - Key for decryption
 * @returns Decrypted data as string
 */
function decryptData(encryptedBase64: string, encryptionKey: string): string {
  try {
    const encryptedBuffer = Buffer.from(encryptedBase64, "base64");
    const iv = encryptedBuffer.slice(0, 16);
    const ciphertext = encryptedBuffer.slice(16);

    const key = crypto.createHash("sha256").update(encryptionKey).digest();
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

    let decrypted = decipher.update(ciphertext, undefined, "utf8");
    decrypted += decipher.final("utf8");

    ConsoleUtils.debug("Decrypted .secrets successfully.");
    
    return decrypted;
  } catch (err) {
    const msg = `Failed to decrypt data, check your encryption key, error: ${err}`;
    ConsoleUtils.error(msg);
    throw new Error(msg);
  }
}

/**
 * Expands references like ${ANOTHER_VAR} within each value
 * 
 * This enables variable interpolation in configuration values.
 * For example:
 * ```
 * DATABASE_HOST=localhost
 * DATABASE_URL=postgresql://${DATABASE_HOST}:5432/mydb
 * ```
 * 
 * The function will recursively expand references until no more changes occur.
 * 
 * @param vars - Record of variables to process
 */
function expandVariables(vars: Record<string, string>): void {
  let changed = true;

  while (changed) {
    changed = false;
    for (const key of Object.keys(vars)) {
      const originalValue = vars[key];
      const newValue = originalValue.replace(/\$\{([^}]+)\}/g, (_, varName) => {
        return vars[varName] !== undefined ? vars[varName] : "";
      });

      if (newValue !== originalValue) {
        vars[key] = newValue;
        process.env[key] = newValue;
        changed = true;
        ConsoleUtils.debug(`Expanded ${key} to ***`);
      }
    }
  }
}

let watchersInitialized = false;

/**
 * Watches .secrets and .env files for changes and reloads secrets dynamically
 * 
 * This function:
 * 1. Watches for changes in configuration files
 * 2. Reloads secrets when files change
 * 3. Executes optional handler scripts, with the following priority:
 *    - First looks for "onSecretsUpdate" script in package.json
 *    - Then tries to execute dotSecretsUpdate.js or dotSecretsUpdate.ts
 */
function watchSecretsFiles(): void {
  if (watchersInitialized) {
    ConsoleUtils.debug("Skipping 'watchSecretsFiles' because it's already active.")
    return; // Skip if already watching
  }
  watchersInitialized = true;

  const filesToWatch = [
    ".secrets",
    ".secrets." + process.env.NODE_ENV,
    ".secrets.public",
    ".env",
    ".env." + process.env.NODE_ENV,
    ".env.public",
    ".public"
  ].filter(fs.existsSync);

  if (filesToWatch.length === 0) return;

  ConsoleUtils.debug(`Watching ${filesToWatch.join(", ")} for changes...`);

  chokidar.watch(filesToWatch, { ignoreInitial: true }).on("change", async (filePath) => {
    ConsoleUtils.info(`${filePath} changed, reloading secrets...`);

    // Reload secrets
    import("./config.js").then(({ config }) => {
      config({ override: true, expand:true, watch: false });
    });

    // First priority: Run onSecretsUpdate script from package.json if available
    const packageJsonPath = path.resolve("package.json");
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      if (pkg.scripts && pkg.scripts["onSecretsUpdate"]) {
        const runCommand = getRunCommand("onSecretsUpdate");

        ConsoleUtils.info(`Running '${runCommand}'...`);
        exec(runCommand, (err, stdout, stderr) => {
          if (err) {
            ConsoleUtils.error(`Error executing script: ${stderr}`);
          } else {
            ConsoleUtils.debug(`Script output:\n${stdout}`);
          }
        });
        return;
      }
    }

    // Second priority: Run custom handler scripts if they exist
    const scriptJS = path.resolve("dotSecretsUpdate.js");
    const scriptTS = path.resolve("dotSecretsUpdate.ts");

    if (fs.existsSync(scriptJS)) {
      ConsoleUtils.info(`Executing custom script: ${scriptJS}`);
      exec(`node ${scriptJS}`, (err, stdout, stderr) => {
        if (err) {
          ConsoleUtils.error(`Error executing script: ${stderr}`);
        } else {
          ConsoleUtils.debug(`Script output:\n${stdout}`);
        }
      });
    } else if (fs.existsSync(scriptTS)) {
      ConsoleUtils.info(`Executing TypeScript script: ${scriptTS}`);
      exec(`ts-node ${scriptTS}`, (err, stdout, stderr) => {
        if (err) {
          ConsoleUtils.error(`Error executing script: ${stderr}`);
        } else {
          ConsoleUtils.debug(`Script output:\n${stdout}`);
        }
      });
    }
  });
}