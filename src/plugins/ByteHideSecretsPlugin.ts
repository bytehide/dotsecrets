import type { SecretsManager } from "@bytehide/secrets";
import chalk from "chalk";
import boxen from "boxen";
import { ConsoleUtils } from "../utils/console.js";
import pLimit from "p-limit";
import cliProgress from "cli-progress";
import { BaseSecretsPlugin } from "./BaseSecretsPlugin.js";
import {
  ensureAndPersistEnvVars,
  ensurePackageInstalled,
  ensureVariables,
  filterSecretsWithExclusions,
  forceSetVars,
} from "../cli/utils.js";
import { getInstallCommand } from "../utils/manager.js";

/**
 * ByteHideSecretsPlugin manages secrets using the @bytehide/secrets SDK.
 *
 * @class
 * @extends BaseSecretsPlugin
 * @description
 * This plugin provides capabilities to:
 * - Retrieve secrets synchronously and asynchronously
 * - Push multiple secrets to ByteHide
 * - Set up ByteHide secrets configuration
 *
 * @requires @bytehide/secrets
 *
 * @remarks
 * Requires the following environment variables:
 * - BYTEHIDE_SECRETS_TOKEN: Authentication token
 * - BYTEHIDE_SECRETS_ENVIRONMENT: Target environment (default: 'production')
 */
export class ByteHideSecretsPlugin extends BaseSecretsPlugin {
  /** Name of the plugin for identification */
  pluginName = "ByteHide Secrets";

  /** Tracks the initialization promise of the client */
  private initialized: Promise<void> | undefined;

  /** ByteHide Secrets Manager client */
  private client?: typeof SecretsManager;

  /**
   * Creates a new ByteHide Secrets plugin instance
   *
   * @param {object} [options={}] - Configuration options for the plugin
   * @param {boolean} [skip=false] - Flag to skip initialization
   */
  constructor(options: object = {}, skip: boolean = false) {
    super();
    if (skip) return;
    this.initialized = this.initializeClient(options);
  }

  /**
   * Dynamically imports and initializes the ByteHide Secrets SDK
   *
   * @private
   * @param {object} options - Initialization options
   * @returns {Promise<void>} Promise resolving when client is initialized
   * @throws {Error} If SDK cannot be imported
   */
  private async initializeClient(options: {}): Promise<void> {
    try {
      ConsoleUtils.debug("Initializing Azure Key Vault plugin...");

      const { SecretsManager } = await import("@bytehide/secrets");
      this.client = SecretsManager;

      ConsoleUtils.debug("ByteHide Secrets plugin initialized successfully.");
    } catch (error) {
      ConsoleUtils.error(
        `ByteHide Secrets SDK is not installed. Run: ${ConsoleUtils.clickable(
          getInstallCommand("@bytehide/secrets")
        )} or better ${ConsoleUtils.clickable(
          getInstallCommand("npx dotsecrets setup")
        )}`
      );
      throw error;
    }
  }

  /**
   * Retrieves a secret value asynchronously from ByteHide
   *
   * @param {string} key - The secret key to retrieve
   * @returns {Promise<string | undefined>} The secret value or undefined if not found
   */
  async getSecret(key: string): Promise<string | undefined> {
    await this.initialized;
    if (!this.client) {
      ConsoleUtils.error("ByteHide Secrets plugin not initialized correctly.");
      return undefined;
    }

    key = this.parseSecretName(key);
    try {
      return await this.client.get(key);
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Stub for synchronous secret retrieval. ByteHide Secrets support sync calls but it's not recommended for production envs.
   * @param key - Name of the secret
   * @returns Always undefined
   */
  getSecretSync(key: string): string | undefined {
    ConsoleUtils.error("ByteHide Secrets does not support synchronous retrieval.");
    return undefined;
  }

  /**
   * Pushes multiple secrets to ByteHide Secrets
   *
   * @param {Record<string, string>} secrets - Key-value pairs of secrets to push
   * @returns {Promise<boolean | undefined>} Success status of secret push operation
   *
   * @description
   * - Checks if @bytehide/secrets is installed
   * - Verifies authentication token and environment
   * - Pushes secrets with concurrency limit
   * - Provides progress bar and error tracking
   */
  async pushSecrets(
    secrets: Record<string, string>
  ): Promise<boolean | undefined> {
    const success = await ensurePackageInstalled("@bytehide/secrets");
    if (!success) return false;

    this.initialized = this.initializeClient({});

    await this.initialized;

    if (!this.client) {
      ConsoleUtils.error("ByteHide Secrets plugin not initialized correctly.");
      throw new Error();
    }

    let keys = await ensureVariables({
      BYTEHIDE_SECRETS_TOKEN: undefined, // sin default
      BYTEHIDE_SECRETS_ENVIRONMENT: "production", // default si no existe                    // default
    });

    process.env.BYTEHIDE_SECRETS_TOKEN = keys["BYTEHIDE_SECRETS_TOKEN"];
    process.env.BYTEHIDE_SECRETS_ENVIRONMENT = keys["BYTEHIDE_SECRETS_ENVIRONMENT"];

    secrets = await filterSecretsWithExclusions({secrets:secrets, excludeKeys: ["BYTEHIDE_SECRETS_TOKEN", "BYTEHIDE_SECRETS_ENVIRONMENT", "DOTSECRETS_PLUGIN"],
      promptMessage: "Heads up! You're uploading your environment variables to ByteHide, and we noticed:\n\nKEYS\n\nThese [are/is] in the list and seem intended for local use. Exclude them?", })

    this.client.initialize();

    const entries = Object.entries(secrets);
    const limit = pLimit(5);

    ConsoleUtils.log(
      `Pushing ${entries.length} secrets with concurrency limit 5…`
    );
    let events = 0;
    let failed = [] as string[];
    const multi = new cliProgress.MultiBar(
      {
        format: "[{bar}] {percentage}% | {value}/{total} secrets",
        clearOnComplete: true,
        hideCursor: true,
      },
      cliProgress.Presets.shades_classic
    );

    const bar = multi.create(entries.length, 0);
    const tasks = entries.map(([key, value]) =>
      limit(async () => {
        try {
          key = this.parseSecretName(key);
          var uploaded = await this.client?.set(key, value);
          if (uploaded) events++;
          else failed.push(key);
        } catch (err: any) {
          failed.push(key);
        } finally {
          bar.increment();
        }
      })
    );

    await Promise.all(tasks);
    bar.stop();
    multi.stop();

    failed.forEach((f) =>
      ConsoleUtils.error(
        `${f} failed to push: Check your ByteHide token, the secret key format and that '${keys["BYTEHIDE_SECRETS_ENVIRONMENT"]}' environment exists.`
      )
    );

    if (events === entries.length) ConsoleUtils.success("All secrets pushed!");
    else if (events === 0) ConsoleUtils.error("All secrets failed to push!");
    else ConsoleUtils.warn(`Only ${events}/${entries.length} pushed`);

    return true;
  }

  /**
   * Sets up the ByteHide Secrets plugin
   *
   * @returns {Promise<boolean | undefined>} Success status of setup
   *
   * @description
   * Setup process:
   * 1. Check if @bytehide/secrets is installed
   * 2. Ensure necessary environment variables
   * 3. Set DOTSECRETS_PLUGIN to 'bytehide'
   * 4. Provide setup reminders and instructions
   */
  async setup(): Promise<boolean | undefined> {
    console.log(
      boxen(chalk.cyanBright("Setting up ByteHide Secrets Plugin..."), {
        padding: 1,
        borderStyle: "round",
        borderColor: "cyan",
      })
    );

    const success = await ensurePackageInstalled("@bytehide/secrets", true);

    if (!success) return false;

    ConsoleUtils.info(
      "Now, let's check the environment variables needed for ByteHide Secrets to work.",
      true
    );
    let env = await ensureAndPersistEnvVars(
      "BYTEHIDE_SECRETS_TOKEN",
      "BYTEHIDE_SECRETS_ENVIRONMENT"
    );

    if (process.env.DOTSECRETS_PLUGIN === "bytehide") {
      ConsoleUtils.success("DOTSECRETS_PLUGIN already setup.");
      console.log(
        boxen(
          chalk.yellow(
            "Reminder: In production you should set DOTSECRETS_PLUGIN=bytehide environment variable directly on your host to work with ByteHide Secrets."
          ),
          { padding: 1, borderColor: "yellow", borderStyle: "round" }
        )
      );
    } else {
      ConsoleUtils.info(
        "Now, let's check that the variable that sets bytehide as a plugin is present.",
        true
      );

      await forceSetVars({ DOTSECRETS_PLUGIN: "bytehide" });
    }

    console.log(
      boxen(
        chalk.blueBright(
          `Reminder 🔥 In production you should set:\n\n   DOTSECRETS_PLUGIN=bytehide\n   BYTEHIDE_SECRETS_TOKEN=***\n   BYTEHIDE_SECRETS_ENVIRONMENT=${env["BYTEHIDE_SECRETS_ENVIRONMENT"]}\n\nin the environment variables directly on your host.`
        ),
        { padding: 1, borderColor: "blueBright", borderStyle: "round" }
      )
    );

    return true;
  }
}
