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

/**
 * OnePasswordSecretsPlugin manages secrets using the official 1Password SDK.
 *
 * Requires:
 * - OP_SERVICE_ACCOUNT_TOKEN: 1Password service account token
 * - OP_VAULT: Vault name (not ID)
 */
export class OnePasswordSecretsPlugin extends BaseSecretsPlugin implements ISecretsPlugin {
  pluginName = "1Password";
  private client?: Awaited<ReturnType<typeof import("@1password/sdk").createClient>>;
  private initialized?: Promise<void>;

  constructor(_: Record<string, unknown> = {}, skip = false) {
    super();
    if (!skip) this.initialized = this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    let sdk;
    try {
      sdk = await import("@1password/sdk");
    } catch (importErr) {
      ConsoleUtils.error(
        `1Password SDK not installed. Run: ${ConsoleUtils.clickable(getInstallCommand("@1password/sdk"))} or better ${ConsoleUtils.clickable(getInstallCommand("npx dotsecrets setup"))}`
      );
      throw importErr;
    }

    const token = process.env.OP_SERVICE_ACCOUNT_TOKEN;
    if (!token) {
      ConsoleUtils.error("Missing OP_SERVICE_ACCOUNT_TOKEN. Please set the environment variable before using this plugin.");
      throw new Error("OP_SERVICE_ACCOUNT_TOKEN is missing");
    }

    try {
      this.client = await sdk.createClient({
        auth: token,
        integrationName: "DotSecrets Integration",
        integrationVersion: "v1.0.0",
      });

      ConsoleUtils.debug("1Password SDK client initialized successfully.");
    } catch (clientErr) {
      ConsoleUtils.error("Failed to initialize 1Password client. Please check your service account token.");
      throw clientErr;
    }
  }

  async getSecret(key: string): Promise<string | undefined> {
    await this.initialized;
    if (!this.client) return;

    const vault = process.env.OP_VAULT;
    if (!vault) throw new Error("Missing OP_VAULT environment variable");

    const uri = `op://${vault}/${key}/value`;
    try {
      ConsoleUtils.debug(`Resolving 1Password secret: ${uri}`);
      const secret = await this.client.secrets.resolve(uri);
      return secret;
    } catch (error) {
      ConsoleUtils.warn(`Secret \"${key}\" not found or error retrieving: ${error}`);
      return undefined;
    }
  }

  getSecretSync(): string | undefined {
    ConsoleUtils.error("1Password does not support synchronous retrieval.");
    return undefined;
  }

  async pushSecrets(secrets: Record<string, string>): Promise<boolean | undefined> {
    const ok = await ensurePackageInstalled("@1password/sdk");
    if (!ok) return false;

    const vars = await ensureVariables({
      OP_SERVICE_ACCOUNT_TOKEN: undefined,
      OP_VAULT: undefined,
    });

    process.env.OP_SERVICE_ACCOUNT_TOKEN = vars.OP_SERVICE_ACCOUNT_TOKEN;
    process.env.OP_VAULT = vars.OP_VAULT;

    this.initialized = this.initializeClient();
    await this.initialized;

    if (!this.client) {
      ConsoleUtils.error("1Password SDK client not initialized correctly.");
      return false;
    }

    secrets = await filterSecretsWithExclusions({
      secrets,
      excludeKeys: ["OP_SERVICE_ACCOUNT_TOKEN", "OP_VAULT", "DOTSECRETS_PLUGIN"],
      promptMessage:
        "Heads up! You’re uploading your environment variables to 1Password, and we noticed:\n\nKEYS\n\nThese [are/is] in the list and seem intended for local use. Exclude them?",
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
    let sdk = await import("@1password/sdk");

    await Promise.all(
      entries.map(([key, value]) =>
        limit(async () => {
          try {
            const vault = process.env.OP_VAULT!;
            await this.client!.items.create({
                title: key,
                category: sdk.ItemCategory.ApiCredentials,
                vaultId: vault,
                fields: [
                  {
                    id: "api_key",
                    title: "API Key",
                    fieldType: sdk.ItemFieldType.Concealed,
                    value,
                  },
                ],
                tags: ["dotsecrets"],
              });
            successCount++;
          } catch (error: any) {
            if (error?.message?.includes("already exists")) {
              failed.push(key);
            } else {
              failed.push(key);
            }
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
      boxen(chalk.cyanBright("Setting up 1Password Secrets Plugin..."), {
        padding: 1,
        borderColor: "cyan",
        borderStyle: "round",
      })
    );

    const ok = await ensurePackageInstalled("@1password/sdk", true);
    if (!ok) return false;

    const env = await ensureAndPersistEnvVars("OP_SERVICE_ACCOUNT_TOKEN", "OP_VAULT");

    if (process.env.DOTSECRETS_PLUGIN === "1password") {
      ConsoleUtils.success("DOTSECRETS_PLUGIN already set to 1password.");
    } else {
      ConsoleUtils.info("Setting DOTSECRETS_PLUGIN=1password...", true);
      await forceSetVars({ DOTSECRETS_PLUGIN: "1password" });
    }

    console.log(
      boxen(
        chalk.blueBright(
          `Reminder 🔐 In production you should set:\n\n   DOTSECRETS_PLUGIN=1password\n   OP_SERVICE_ACCOUNT_TOKEN=***\n   OP_VAULT=${env.OP_VAULT}\n\nDirectly in your environment or CI/CD pipeline.`
        ),
        { padding: 1, borderColor: "blueBright", borderStyle: "round" }
      )
    );

    return true;
  }
}
