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
import { createRequire } from "module";

export class IbmSecretsManagerPlugin extends BaseSecretsPlugin implements ISecretsPlugin {
  pluginName = "IBM Secrets Manager";
  private client?: any;
  private initialized?: Promise<void>;

  constructor(_: Record<string, unknown> = {}, skip = false) {
    super();
    if (!skip) this.initialized = this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    let SecretsManagerV2, IamAuthenticator;

    try {
        const require = createRequire(import.meta.url);
        SecretsManagerV2 = require("@ibm-cloud/secrets-manager/secrets-manager/v2");
        IamAuthenticator = require("@ibm-cloud/secrets-manager/auth").IamAuthenticator;
    } catch (sdkError) {
      ConsoleUtils.error(
        `IBM SDK not installed. Run: ${ConsoleUtils.clickable(getInstallCommand("@ibm-cloud/secrets-manager"))} or better ${ConsoleUtils.clickable("npx dotsecrets setup")}`
      );
      throw sdkError;
    }

    const apikey = process.env.IBM_CLOUD_API_KEY;
    const url = process.env.IBM_SECRETS_MANAGER_URL;

    if (!apikey || !url) {
      ConsoleUtils.error("Missing required environment variables: IBM_CLOUD_API_KEY and/or IBM_SECRETS_MANAGER_URL.");
      throw new Error("IBM_CLOUD_API_KEY and IBM_SECRETS_MANAGER_URL are required");
    }

    try {
      const authenticator = new IamAuthenticator!({ apikey });
      this.client = new SecretsManagerV2!({ authenticator, serviceUrl: url });
      ConsoleUtils.debug("IBM Secrets Manager plugin initialized successfully.");
    } catch (clientError) {
      ConsoleUtils.error(`Failed to initialize IBM Secrets Manager client: ${clientError}`);
      throw clientError;
    }
  }

  async getSecret(key: string): Promise<string | undefined> {
    await this.initialized;
    if (!this.client) return;

    key = this.parseSecretName(key);

    try {
      const { result } = await this.client.getSecretByNameType({ name: key, secretType: "arbitrary", secretGroupName: process.env.IBM_SECRET_GROUP_NAME ?? 'default' });
      return result.payload;
    } catch (error) {
      ConsoleUtils.warn(`Secret \"${key}\" not found or error retrieving: ${error}`);
      return undefined;
    }
  }

  getSecretSync(): string | undefined {
    ConsoleUtils.error("IBM Secrets Manager does not support synchronous retrieval.");
    return undefined;
  }

  async pushSecrets(secrets: Record<string, string>): Promise<boolean | undefined> {

    const vars = await ensureVariables({
      IBM_CLOUD_API_KEY: undefined,
      IBM_SECRETS_MANAGER_URL: undefined,
    });

    process.env = { ...process.env, ...vars };

    try {
        await this.initializeClient();
    } catch {
        return false;
    }

    secrets = await filterSecretsWithExclusions({
      secrets,
      excludeKeys: ["IBM_CLOUD_API_KEY", "IBM_SECRETS_MANAGER_URL", "DOTSECRETS_PLUGIN"],
      promptMessage:
        "Heads up! You’re uploading your environment variables to IBM, and we noticed:\n\nKEYS\n\nThese [are/is] in the list and seem intended for local use. Exclude them?",
    });

    const entries = Object.entries(secrets).map(([key, value]) => [this.parseSecretName(key), value]);

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
            const res = await this.client.createSecret({
              secretPrototype: {
                name: key,
                secret_type: "arbitrary",
                secret_group_id: "default",
                payload: value,
              },
            });

            if (!res?.result?.id) throw new Error("No ID returned");

            successCount++;
          } catch (err) {
            failed.push(key);
          } finally {
            bar.increment();
          }
        })
      )
    );

    bar.stop();
    multi.stop();
    failed.forEach(key => ConsoleUtils.error(`${key} failed to push.`));
    if (successCount === entries.length) ConsoleUtils.success("All secrets pushed!");
    else ConsoleUtils.warn(`${successCount}/${entries.length} pushed successfully.`);
    return successCount > 0;
  }

  async setup(): Promise<boolean | undefined> {
    console.log(
      boxen(chalk.cyanBright("Setting up IBM Secrets Manager Plugin..."), {
        padding: 1,
        borderColor: "cyan",
        borderStyle: "round",
      })
    );

    const ok = await ensurePackageInstalled("@ibm-cloud/secrets-manager/auth", true);
    if (!ok) return false;

    const env = await ensureAndPersistEnvVars("IBM_CLOUD_API_KEY", "IBM_SECRETS_MANAGER_URL");

    if (process.env.DOTSECRETS_PLUGIN === "ibm") {
      ConsoleUtils.success("DOTSECRETS_PLUGIN already set to ibm.");
    } else {
      ConsoleUtils.info("Setting DOTSECRETS_PLUGIN=ibm...", true);
      await forceSetVars({ DOTSECRETS_PLUGIN: "ibm" });
    }

    console.log(
      boxen(
        chalk.blueBright(
          `Reminder 🔐 In production you should set:\n\n   DOTSECRETS_PLUGIN=ibm\n   IBM_CLOUD_API_KEY=${env.IBM_CLOUD_API_KEY}\n   IBM_SECRETS_MANAGER_URL=${env.IBM_SECRETS_MANAGER_URL}\n\nDirectly in your environment or CI/CD pipeline.`
        ),
        { padding: 1, borderColor: "blueBright", borderStyle: "round" }
      )
    );

    return true;
  }
}
