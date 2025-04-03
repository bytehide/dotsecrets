import { ISecretsPlugin } from "./ISecretsPlugin.js";
import chalk from "chalk";
import boxen from "boxen";
import { ConsoleUtils } from "../utils/console.js";
import { getInstallCommand } from "../utils/manager.js";
import { BaseSecretsPlugin } from "./BaseSecretsPlugin.js";
import { ensureAndPersistEnvVars, ensurePackageInstalled, ensureVariables, filterSecretsWithExclusions, forceSetVars } from "../cli/utils.js";
import pLimit from "p-limit";
import cliProgress from "cli-progress";
import type { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

/**
 * Configuration options for AWS Secrets Manager plugin.
 */
interface AwsPluginOptions {
  /** Optional custom AWS region */
  region?: string;
}

/**
 * AwsSecretsManagerPlugin manages secrets using AWS Secrets Manager.
 *
 * @class
 * @extends BaseSecretsPlugin
 * @implements ISecretsPlugin
 * @description
 * Provides functionality to retrieve (async & sync stub), push, and setup secrets in AWS Secrets Manager.
 * Requires the following environment variables:
 * - AWS_ACCESS_KEY_ID: AWS access key
 * - AWS_SECRET_ACCESS_KEY: AWS secret key
 * - AWS_REGION: AWS region
 */
export class AwsSecretsManagerPlugin extends BaseSecretsPlugin implements ISecretsPlugin {
  pluginName = "AWS Secrets Manager";
  private client?: SecretsManagerClient;
  private initialized?: Promise<void>;

  /**
   * Constructs a new plugin instance.
   * @param options - AWS configuration
   * @param skip - If true, skips initialization
   */
  constructor(options: AwsPluginOptions = {}, skip = false) {
    super();
    if (!skip) this.initialized = this.initializeClient(options);
  }

  /**
   * Dynamically imports AWS SDK and initializes the SecretsManagerClient.
   * @private
   * @param options - Plugin configuration options
   * @throws Will throw if SDK is not installed
   */
  private async initializeClient(options: AwsPluginOptions): Promise<void> {
    ConsoleUtils.info("Initializing AWS Secrets Manager plugin...");
  
    let SecretsManagerClient: any;
    try {
      // Separate block to catch missing SDK
      ({ SecretsManagerClient } = await import("@aws-sdk/client-secrets-manager"));
    } catch (sdkError) {
      ConsoleUtils.error(
        `AWS SDK not installed. Run: ${ConsoleUtils.clickable(getInstallCommand("@aws-sdk/client-secrets-manager"))} or better ${ConsoleUtils.clickable("npx dotsecrets setup")}`
      );
      throw sdkError;
    }
  
    try {
      const region = options.region ?? process.env.AWS_REGION ?? "us-east-1";
      this.client = new SecretsManagerClient({ region });
      ConsoleUtils.debug("AWS Secrets Manager plugin initialized successfully.");
    } catch (clientError) {
      ConsoleUtils.error(`Failed to initialize AWS Secrets Manager client: ${clientError}`);
      throw clientError;
    }
  }

  /**
   * Retrieves a secret value asynchronously from AWS Secrets Manager.
   * @param key - Name of the secret to fetch
   * @returns The secret value or undefined if not found
   */
  async getSecret(key: string): Promise<string | undefined> {
    await this.initialized;
    if (!this.client) {
      ConsoleUtils.error("AWS Secrets Manager plugin not initialized correctly.");
      return undefined;
    }

    key = this.parseSecretName(key);

    try {
      ConsoleUtils.debug(`Fetching secret "${key}" from AWS Secrets Manager...`);
      const { GetSecretValueCommand } = await import("@aws-sdk/client-secrets-manager");
      const command = new GetSecretValueCommand({ SecretId: key });
      const response = await this.client.send(command);
      ConsoleUtils.debug(`Secret "${key}" retrieved successfully.`);
      return response.SecretString;
    } catch (error) {
      ConsoleUtils.warn(`Secret "${key}" not found or error retrieving: ${error}`);
      return undefined;
    }
  }

  /**
   * Stub for synchronous secret retrieval. AWS Secrets Manager does not support sync calls.
   * @param key - Name of the secret
   * @returns Always undefined
   */
  getSecretSync(key: string): string | undefined {
    ConsoleUtils.error("AWS Secrets Manager does not support synchronous retrieval.");
    return undefined;
  }

  /**
   * Pushes multiple secrets to AWS Secrets Manager with concurrency control and progress reporting.
   * @param secrets - Key-value map of secrets to push
   * @returns True if at least one secret succeeded, false otherwise
   */
  async pushSecrets(secrets: Record<string, string>): Promise<boolean | undefined> {
    const ok = await ensurePackageInstalled("@aws-sdk/client-secrets-manager");
    if (!ok) return false;

    const vars = await ensureVariables({
      AWS_ACCESS_KEY_ID: undefined,
      AWS_SECRET_ACCESS_KEY: undefined,
      AWS_REGION: undefined,
    });

    process.env.AWS_ACCESS_KEY_ID = vars.AWS_ACCESS_KEY_ID;
    process.env.AWS_SECRET_ACCESS_KEY = vars.AWS_SECRET_ACCESS_KEY;
    process.env.AWS_REGION = vars.AWS_REGION;

    this.initialized = this.initializeClient({ region: vars.AWS_REGION });
    await this.initialized;
    if (!this.client) {
      ConsoleUtils.error("AWS Secrets Manager plugin not initialized correctly.");
      return false;
    }

    secrets = await filterSecretsWithExclusions({
      secrets,
      excludeKeys: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "DOTSECRETS_PLUGIN"],
      promptMessage: "Heads up! You’re uploading your environment variables to AWS, and we noticed:\n\nKEYS\n\nThese [are/is] in the list and seem intended for local use. Exclude them?",
    });

    const entries = Object.entries(secrets);
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

    const { CreateSecretCommand, PutSecretValueCommand } = await import("@aws-sdk/client-secrets-manager");

    await Promise.all(
      entries.map(([key, value]) =>
        limit(async () => {
          try {
            key = this.parseSecretName(key);

            try {
              const createCmd = new CreateSecretCommand({ Name: key, SecretString: value });
              await this.client!.send(createCmd);
            } catch (err: any) {
              if (err.name === "ResourceExistsException") {
                const putCmd = new PutSecretValueCommand({ SecretId: key, SecretString: value });
                await this.client!.send(putCmd);
              } else {
                throw err;
              }
            }

            successCount++;
          } catch (error) {
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

  /**
   * Sets up AWS Secrets Manager plugin by installing dependencies, ensuring environment variables,
   * and configuring DOTSECRETS_PLUGIN.
   * @returns True on successful setup, false otherwise
   */
  async setup(): Promise<boolean | undefined> {
    console.log(boxen(chalk.cyanBright("Setting up AWS Secrets Manager Plugin..."), { padding: 1, borderColor: "cyan", borderStyle: "round" }));
    const ok = await ensurePackageInstalled("@aws-sdk/client-secrets-manager", true);
    if (!ok) return false;

    const env = await ensureAndPersistEnvVars(
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_REGION",
    );

    if (process.env.DOTSECRETS_PLUGIN === "aws") {
      ConsoleUtils.success("DOTSECRETS_PLUGIN already set to aws.");
    } else {
      ConsoleUtils.info("Setting DOTSECRETS_PLUGIN=aws...", true);
      await forceSetVars({ DOTSECRETS_PLUGIN: "aws" });
    }

    console.log(
      boxen(
        chalk.blueBright(
          `Reminder 🔥 In production you should set:\n\n   DOTSECRETS_PLUGIN=aws\n   AWS_ACCESS_KEY_ID=${env.AWS_ACCESS_KEY_ID}\n   AWS_SECRET_ACCESS_KEY=***\n   AWS_REGION=${env.AWS_REGION}\n\nin the environment variables directly on your host or CI/CD pipeline.`
        ),
        { padding: 1, borderColor: "blueBright", borderStyle: "round" }
      )
    );

    return true;
  }
}