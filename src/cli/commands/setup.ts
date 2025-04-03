import { Command } from "commander";
import path from "path";
import fs from "fs";
import inquirer from "inquirer";
import { ConsoleUtils } from "../../utils/console.js";
import fg from "fast-glob";

// Importar directamente todos los plugins necesarios
import { EnvSecretsPlugin } from "../../plugins/EnvSecretsPlugin.js";
import { ByteHideSecretsPlugin } from "../../plugins/ByteHideSecretsPlugin.js";
import { AwsSecretsManagerPlugin } from "../../plugins/AWSSecretsManagerPlugin.js";
import { AzureKeyVaultPlugin } from "../../plugins/AzureKeyVaultPlugin.js";
import { DopplerSecretsManagerPlugin } from "../../plugins/DopplerSecretsPlugin.js";
import { GcpSecretsManagerPlugin } from "../../plugins/GCPSecretsManagerPlugin.js";
import { HashiCorpVaultPlugin } from "../../plugins/HashiCorpVaultPlugin.js";
import { IbmSecretsManagerPlugin } from "../../plugins/IBMCloudSecretsManagerPlugin.js";
import { KeeperSecretsManagerPlugin } from "../../plugins/KeeperSecretsPlugin.js";
import { OnePasswordSecretsPlugin } from "../../plugins/OnePasswordSecretsPlugin.js";


export const setupCommand = new Command("setup")
  .description("Configure a secrets provider")
  .option("--path <folder>", "Folder to scan (default: current dir)", ".")
  .action(async ({ path: folderArg }) => {

    const folder = path.resolve(folderArg);
    ConsoleUtils.log(`Running setup in ${folder}…`);

    // 1️⃣ Check for .secrets / .env
    const envFiles = await fg([".secrets", ".env"], { cwd: folder, dot: true });
    if (!envFiles.length) {
      const { fileType } = await inquirer.prompt({
        type: "list",
        name: "fileType",
        message:
          "No .secrets or .env found. dotsecrets works with both, but we recommend using `.secrets` for clarity. Which file would you like to create?",
        choices: [".secrets", ".env"],
      });
      fs.writeFileSync(path.join(folder, fileType), "# Add your sensitive variables here\n");
      ConsoleUtils.log(`Created ${fileType}`);
    }

    // 2️⃣ Check for .public
    const publicPath = path.join(folder, ".public");
    if (!fs.existsSync(publicPath)) {
      const { createPublic } = await inquirer.prompt({
        type: "confirm",
        name: "createPublic",
        message:
          "No `.public` file found. This is for non‑sensitive variables (e.g. API keys exposed to frontend). They can be checked into git, but **must** start with `PUBLIC_`. Create it now?",
        default: true,
      });
      if (createPublic) {
        fs.writeFileSync(publicPath, "# PUBLIC_* variables go here\n# Like PUBLIC_BACKEND_ENDPOINT\n");
        ConsoleUtils.log("Created .public");
      }
    }

    // 3️⃣ Ensure .gitignore excludes sensitive files
    const gitignorePath = path.join(folder, ".gitignore");
    const ignoreTargets = [".secrets", ".env"];
    let gitignore = "";
    if (fs.existsSync(gitignorePath)) {
      gitignore = fs.readFileSync(gitignorePath, "utf-8");
    }

    const missing = ignoreTargets.filter((f) => !gitignore.split(/\r?\n/).includes(f));
    if (missing.length) {
      const { addIgnores } = await inquirer.prompt({
        type: "confirm",
        name: "addIgnores",
        message: `Your .gitignore is missing ${missing.join(" & ")}. Add them to avoid accidentally committing secrets?`,
        default: true,
      });
      if (addIgnores) {
        fs.appendFileSync(gitignorePath, `${missing.map((m) => `\n${m}`).join("")}\n`);
        ConsoleUtils.log(`Added ${missing.join(", ")} to .gitignore`);
      }
    }

    // Lista estática de plugins - mucho más simple y predecible
    ConsoleUtils.log("Loading available secrets-provider plugins...");
    
    // Crea una instancia de cada plugin
    const plugins = [
      new EnvSecretsPlugin(),
      new ByteHideSecretsPlugin({}, true),
      new AwsSecretsManagerPlugin({}, true),
      new AzureKeyVaultPlugin({vaultUrl: ""}, true),
      new DopplerSecretsManagerPlugin({}, true),
      new GcpSecretsManagerPlugin({}, true),
      new HashiCorpVaultPlugin({}, true),
      new IbmSecretsManagerPlugin({}, true),
      new KeeperSecretsManagerPlugin({}, true),
      new OnePasswordSecretsPlugin({}, true)
    ].filter(p => p.pluginName && !p.pluginName.toLowerCase().includes("local"));

    if (plugins.length === 0) {
      return ConsoleUtils.error("No plugins available to configure.", true);
    }

    const { selected } = await inquirer.prompt({
      type: "list",
      name: "selected",
      message: "Select a secrets provider to configure:",
      choices: plugins.map((p) => p.pluginName),
    });

    const plugin = plugins.find((p) => p.pluginName === selected)!;
    ConsoleUtils.log(`Running setup for '${selected}'...`);

    try {
      const success = await plugin.setup();
      if (success) {
        ConsoleUtils.success(`${selected} configured successfully 🎉!`);
      } else {
        ConsoleUtils.error(`${selected} setup did not complete successfully.`);
      }
    } catch (err) {
      ConsoleUtils.error(`Error during setup of '${selected}': ${err}`, true);
    }
  });