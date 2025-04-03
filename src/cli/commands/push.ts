import { Command } from "commander";
import path from "path";
import fs from "fs";
import fg from "fast-glob";
import inquirer from "inquirer";
import { parseEnvFile } from "../utils.js";
import { ConsoleUtils } from "../../utils/console.js";
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


export const pushCommand = new Command("push")
  .description("Push local secrets (.secrets/.env) into a secrets provider")
  .option("--path <folder>", "Folder to scan (default: current dir)", ".")
  .action(async ({ path: folderArg }) => {
    
    const folder = path.resolve(folderArg);
    ConsoleUtils.log(`Scanning ${folder} for .secrets & .env files…`);

    const files = await fg([".secrets*", ".env*"], {
      cwd: folder,
      dot: true,
      ignore: ["**/*.example", "**/*.sample", "**/*.template"],
    });

    if (!files.length) {
      return ConsoleUtils.error("No .secrets or .env files found.", true);
    }

    const { selectedFile } = await inquirer.prompt({
      type: "list",
      name: "selectedFile",
      message: "Select the file containing secrets to push:",
      choices: files /*.map((f) => path.join(folder, f))*/,
    });

    const raw = fs.readFileSync(selectedFile, "utf-8");
    const allSecrets = parseEnvFile(raw);
    const keys = Object.keys(allSecrets);
    ConsoleUtils.log(`Detected ${keys.length} secrets.`);

    let secretsToPush = allSecrets;
    if (keys.length > 0) {
      const { excludeSome } = await inquirer.prompt({
        type: "confirm",
        name: "excludeSome",
        message: "Exclude any secrets from push?",
        default: false,
      });

      if (excludeSome) {
        const { selectedKeys } = await inquirer.prompt({
          type: "checkbox",
          name: "selectedKeys",
          message: "Uncheck any secrets you DO NOT want to push: (Press <space> to toggle, <enter> to confirm)",
          choices: keys.map((k) => ({ name: k, value: k, checked: true })),
        });
        secretsToPush = Object.fromEntries(
          selectedKeys.map((k: string) => [k, allSecrets[k]])
        );
      }
    }

    // Load plugins dynamically
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

    if (!plugins.length) {
      return ConsoleUtils.error("No secrets-provider plugins found.", true);
    }

    const { selectedPlugin } = await inquirer.prompt({
      type: "list",
      name: "selectedPlugin",
      message: "Select destination secrets provider:",
      choices: plugins.map((p) => ({ name: p.pluginName, value: p })),
    });

    ConsoleUtils.log(`Pushing ${Object.keys(secretsToPush).length} secrets to ${selectedPlugin.pluginName}…`);
    await selectedPlugin.pushSecrets(secretsToPush);
  });