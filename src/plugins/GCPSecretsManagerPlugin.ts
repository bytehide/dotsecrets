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
import inquirer from "inquirer";

/**
 * GcpSecretsManagerPlugin manages secrets using GCP Secret Manager.
 *
 * Supports two authentication modes:
 * - Key file via GOOGLE_APPLICATION_CREDENTIALS (default)
 * - Inline credentials via GCP_CLIENT_EMAIL + GCP_PRIVATE_KEY
 */
export class GcpSecretsManagerPlugin extends BaseSecretsPlugin implements ISecretsPlugin {
  pluginName = "Google Cloud Secret Manager";
  private client?: import("@google-cloud/secret-manager").SecretManagerServiceClient;
  private initialized?: Promise<void>;

  constructor(_: Record<string, unknown> = {}, skip = false) {
    super();
    if (!skip) this.initialized = this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    let SecretManagerServiceClient: any;
  
    // Intentar importar el SDK
    try {
      ({ SecretManagerServiceClient } = await import("@google-cloud/secret-manager"));
    } catch (sdkError) {
      ConsoleUtils.error(
        `GCP SDK not installed. Run: ${ConsoleUtils.clickable(getInstallCommand("@google-cloud/secret-manager"))} or better ${ConsoleUtils.clickable("npx dotsecrets setup")}`
      );
      throw sdkError;
    }
  
    // Inicializar el cliente y comprobar credenciales
    try {
      const credentials =
        process.env.GCP_CLIENT_EMAIL && process.env.GCP_PRIVATE_KEY
          ? {
              credentials: {
                client_email: process.env.GCP_CLIENT_EMAIL,
                private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, "\n"),
              },
              projectId: process.env.GOOGLE_PROJECT_ID,
            }
          : undefined;
  
      this.client = new SecretManagerServiceClient(credentials);
      ConsoleUtils.debug("GCP Secret Manager client initialized successfully.");
    } catch (initError) {
      ConsoleUtils.error(`Failed to initialize GCP Secret Manager client: ${initError}`);
      throw initError;
    }
  }

  async getSecret(key: string): Promise<string | undefined> {
    await this.initialized;
    if (!this.client) return;

    const projectId = process.env.GOOGLE_PROJECT_ID;
    if (!projectId) throw new Error("Missing GOOGLE_PROJECT_ID");

    key = this.parseSecretName(key);

    try {
      const [accessResponse] = await this.client.accessSecretVersion({
        name: `projects/${projectId}/secrets/${key}/versions/latest`,
      });

      return accessResponse.payload?.data?.toString();
    } catch (error) {
      ConsoleUtils.warn(`Secret \"${key}\" not found or error retrieving: ${error}`);
      return undefined;
    }
  }

  getSecretSync(): string | undefined {
    ConsoleUtils.error("GCP Secret Manager does not support synchronous retrieval.");
    return undefined;
  }

  async pushSecrets(secrets: Record<string, string>): Promise<boolean | undefined> {
    const ok = await ensurePackageInstalled("@google-cloud/secret-manager");
    if (!ok) return false;

    const { method } = await inquirer.prompt([
        {
          type: "list",
          name: "method",
          message: "How do you want to authenticate with Google Cloud?",
          choices: [
            {
              name: "🔐 GOOGLE_APPLICATION_CREDENTIALS (.json file) — recommended (downloaded from Google)",
              value: "json",
            },
            {
              name: "📄 GCP_CLIENT_EMAIL + GCP_PRIVATE_KEY (set manually as env vars - NOT RECOMMENDED)",
              value: "inline",
            },
          ],
        },
      ]);
    let vars;
    if (method === "json") {
      vars = await ensureVariables({
        GOOGLE_PROJECT_ID: undefined,
        GOOGLE_APPLICATION_CREDENTIALS: undefined,
      });
    } else {
      vars = await ensureVariables({
        GOOGLE_PROJECT_ID: undefined,
        GCP_CLIENT_EMAIL: undefined,
        GCP_PRIVATE_KEY: undefined,
      });
    }

    process.env = { ...process.env, ...vars };

    this.initialized = this.initializeClient();
    await this.initialized;
    if (!this.client) {
      ConsoleUtils.error("GCP Secret Manager plugin not initialized correctly.");
      return false;
    }

    secrets = await filterSecretsWithExclusions({
      secrets,
      excludeKeys: [
        "GOOGLE_PROJECT_ID",
        "GOOGLE_APPLICATION_CREDENTIALS",
        "GCP_CLIENT_EMAIL",
        "GCP_PRIVATE_KEY",
        "DOTSECRETS_PLUGIN",
      ],
      promptMessage:
        "Heads up! You’re uploading your environment variables to GCP, and we noticed:\n\nKEYS\n\nThese [are/is] in the list and seem intended for local use. Exclude them?",
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

    const projectId = process.env.GOOGLE_PROJECT_ID!;

    await Promise.all(
      entries.map(([key, value]) =>
        limit(async () => {
          try {
            const [existing] = await this.client!.getSecret({ name: `projects/${projectId}/secrets/${key}` }).catch(() => [null]);

            if (!existing) {
              await this.client!.createSecret({
                parent: `projects/${projectId}`,
                secretId: key,
                secret: { replication: { automatic: {} } },
              });
            }

            await this.client!.addSecretVersion({
              parent: `projects/${projectId}/secrets/${key}`,
              payload: { data: Buffer.from(value, "utf8") },
            });

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
      boxen(chalk.cyanBright("Setting up GCP Secret Manager Plugin..."), {
        padding: 1,
        borderColor: "cyan",
        borderStyle: "round",
      })
    );

    const ok = await ensurePackageInstalled("@google-cloud/secret-manager", true);
    if (!ok) return false;

    const { method } = await inquirer.prompt([
        {
          type: "list",
          name: "method",
          message: "How do you want to authenticate with Google Cloud?",
          choices: [
            {
              name: "🔐 GOOGLE_APPLICATION_CREDENTIALS (.json file) — recommended (downloaded from Google)",
              value: "json",
            },
            {
              name: "📄 GCP_CLIENT_EMAIL + GCP_PRIVATE_KEY (set manually as env vars - NOT RECOMMENDED)",
              value: "inline",
            },
          ],
        },
      ]);

    let env;
    if (method === "json") {
      env = await ensureAndPersistEnvVars("GOOGLE_PROJECT_ID", "GOOGLE_APPLICATION_CREDENTIALS");
    } else {
      env = await ensureAndPersistEnvVars("GOOGLE_PROJECT_ID", "GCP_CLIENT_EMAIL", "GCP_PRIVATE_KEY");
    }

    if (process.env.DOTSECRETS_PLUGIN === "google") {
      ConsoleUtils.success("DOTSECRETS_PLUGIN already set to gcp.");
    } else {
      ConsoleUtils.info("Setting DOTSECRETS_PLUGIN=google...", true);
      await forceSetVars({ DOTSECRETS_PLUGIN: "google" });
    }

    const reminderVars = method === "json"
      ? `GOOGLE_PROJECT_ID=${env.GOOGLE_PROJECT_ID}\n   GOOGLE_APPLICATION_CREDENTIALS=***`
      : `GOOGLE_PROJECT_ID=${env.GOOGLE_PROJECT_ID}\n   GCP_CLIENT_EMAIL=${env.GCP_CLIENT_EMAIL}\n   GCP_PRIVATE_KEY=***`;

    console.log(
      boxen(
        chalk.blueBright(
          `Reminder 🔐 In production you should set:\n\n   DOTSECRETS_PLUGIN=gcp\n   ${reminderVars}\n\nDirectly in your environment or CI/CD pipeline.`
        ),
        { padding: 1, borderColor: "blueBright", borderStyle: "round" }
      )
    );

    return true;
  }
}