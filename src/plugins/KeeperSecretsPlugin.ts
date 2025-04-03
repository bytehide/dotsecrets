import { ISecretsPlugin } from "./ISecretsPlugin.js";
import chalk from "chalk";
import boxen from "boxen";
import { ConsoleUtils } from "../utils/console.js";
import { getInstallCommand } from "../utils/manager.js";
import { BaseSecretsPlugin } from "./BaseSecretsPlugin.js";
import {
  ensureAndPersistEnvVars,
  ensurePackageInstalled,
  ensureVariables,
  filterSecretsWithExclusions,
  forceSetVars,
} from "../cli/utils.js";
import pLimit from "p-limit";
import cliProgress from "cli-progress";
import fs from "fs";

export class KeeperSecretsManagerPlugin extends BaseSecretsPlugin implements ISecretsPlugin {
  pluginName = "Keeper Secrets Manager";
  private initialized?: Promise<void>;
  private storage: any;

  constructor(_: Record<string, unknown> = {}, skip = false) {
    super();
    if (!skip) this.initialized = this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    let localConfigStorage: any;
  
    // Importar SDK, y capturar si no está instalado
    try {
      ({ localConfigStorage } = await import("@keeper-security/secrets-manager-core"));
    } catch (sdkError) {
      ConsoleUtils.error(
        `Keeper SDK not installed. Run: ${ConsoleUtils.clickable(getInstallCommand("@keeper-security/secrets-manager-core"))} or better ${ConsoleUtils.clickable("npx dotsecrets setup")}`
      );
      throw sdkError;
    }
  
    // Verificar configuración e inicializar
    try {
      const configPath = process.env.KEEPER_CONFIG_FILE;
  
      if (!configPath || !fs.existsSync(configPath)) {
        throw new Error("KEEPER_CONFIG_FILE is not set or does not exist.");
      }
  
      this.storage = localConfigStorage(configPath);
      ConsoleUtils.debug("Keeper Secrets Manager client initialized successfully.");
    } catch (initError) {
      ConsoleUtils.error(`Failed to initialize Keeper Secrets Manager client: ${initError}`);
      throw initError;
    }
  }

  async getSecret(key: string): Promise<string | undefined> {
    await this.initialized;
    key = this.parseSecretName(key);

    try {
      const { getSecretByTitle } = await import("@keeper-security/secrets-manager-core");
      
      const { secrets } = await getSecretByTitle({ storage: this.storage }, key) as any;

      const record = secrets?.[key];
      const passwordField = record?.data?.fields?.find((f: any) => f.type === "password");
      return passwordField?.value?.[0];
    } catch (error) {
      ConsoleUtils.warn(`Secret \"${key}\" not found or error retrieving: ${error}`);
      return undefined;
    }
  }

  getSecretSync(): string | undefined {
    ConsoleUtils.error("Keeper Secrets Manager does not support synchronous retrieval.");
    return undefined;
  }

  async pushSecrets(secrets: Record<string, string>): Promise<boolean | undefined> {
    const vars = await ensureVariables({ KEEPER_CONFIG_FILE: undefined, KEEPER_FOLDER_UID: undefined });
    process.env = { ...process.env, ...vars };

    await this.initializeClient();
    if (!this.storage) return false;

    secrets = await filterSecretsWithExclusions({
      secrets,
      excludeKeys: ["KEEPER_CONFIG_FILE", "KEEPER_FOLDER_UID", "DOTSECRETS_PLUGIN"],
      promptMessage:
        "Heads up! You’re uploading your environment variables to Keeper, and we noticed:\n\nKEYS\n\nThese [are/is] in the list and seem intended for local use. Exclude them?",
    });

    const entries = Object.entries(secrets).map(([key, value]) => [this.parseSecretName(key), value]);

    const { createSecret } = await import("@keeper-security/secrets-manager-core");
    const multi = new cliProgress.MultiBar(
      {
        format: "[{bar}] {percentage}% | {value}/{total} secrets",
        clearOnComplete: true,
        hideCursor: true,
      },
      cliProgress.Presets.shades_classic
    );

    const bar = multi.create(entries.length, 0);
    bar.start(entries.length, 0);
    const limit = pLimit(5);
    const failed: string[] = [];
    let successCount = 0;

    await Promise.all(
      entries.map(([key, value]) =>
        limit(async () => {
          try {
            const record = {
              title: key,
              type: "login",
              fields: [
                { type: "login", value: ["dotsecrets"] },
                { type: "password", value: [value] },
              ],
              notes: "Uploaded from dotsecrets",
            };

            await createSecret({ storage: this.storage }, process.env.KEEPER_FOLDER_UID!, record);
            successCount++;
          } catch (err) {
            failed.push(key);
          } finally {
            bar.increment();
          }
        })
    ));

    bar.stop();
    multi.stop();
    failed.forEach((key) => ConsoleUtils.error(`${key} failed to push.`));
    if (successCount === entries.length) ConsoleUtils.success("All secrets pushed!");
    else ConsoleUtils.warn(`${successCount}/${entries.length} pushed successfully.`);
    return successCount > 0;
  }

  async setup(): Promise<boolean | undefined> {
    console.log(
      boxen(chalk.cyanBright("Setting up Keeper Secrets Manager Plugin..."), {
        padding: 1,
        borderColor: "cyan",
        borderStyle: "round",
      })
    );

    const ok = await ensurePackageInstalled("@keeper-security/secrets-manager-core", true);
    if (!ok) return false;

    const env = await ensureAndPersistEnvVars("KEEPER_CONFIG_FILE", "KEEPER_FOLDER_UID");

    if (process.env.DOTSECRETS_PLUGIN === "keeper") {
      ConsoleUtils.success("DOTSECRETS_PLUGIN already set to keeper.");
    } else {
      ConsoleUtils.info("Setting DOTSECRETS_PLUGIN=keeper...", true);
      await forceSetVars({ DOTSECRETS_PLUGIN: "keeper" });
    }

    console.log(
      boxen(
        chalk.blueBright(
          `Reminder 🔐 In production you should set:\n\n   DOTSECRETS_PLUGIN=keeper\n   KEEPER_CONFIG_FILE=${env.KEEPER_CONFIG_FILE}\n   KEEPER_FOLDER_UID=${env.KEEPER_FOLDER_UID}\n\nDirectly in your environment or CI/CD pipeline.`
        ),
        { padding: 1, borderColor: "blueBright", borderStyle: "round" }
      )
    );

    return true;
  }
}
