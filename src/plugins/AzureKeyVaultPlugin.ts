import { ISecretsPlugin } from "./ISecretsPlugin.js";
import chalk from "chalk";
import boxen from "boxen";
import { ConsoleUtils } from "../utils/console.js";
import type { SecretClient } from "@azure/keyvault-secrets";
import type { DefaultAzureCredential } from "@azure/identity";
import { getInstallCommand } from "../utils/manager.js";
import { BaseSecretsPlugin } from "./BaseSecretsPlugin.js";
import { ensureAndPersistEnvVars, ensurePackageInstalled, ensureVariables, filterSecretsWithExclusions, forceSetVars } from "../cli/utils.js";
import pLimit from "p-limit";
import cliProgress from "cli-progress";

/**
 * Configuration options for Azure Key Vault plugin.
 */
interface AzurePluginOptions {
  /** URL of the Azure Key Vault instance */
  vaultUrl: string;
  /** Optional custom credential for authentication */
  credential?: DefaultAzureCredential;
}

/**
 * AzureKeyVaultPlugin manages secrets using Azure Key Vault.
 *
 * @class
 * @extends BaseSecretsPlugin
 * @implements ISecretsPlugin
 * @description
 * Provides functionality to retrieve (async & sync stub), push, and setup secrets in Azure Key Vault.
 * Requires the following environment variables:
 * - AZURE_KEYVAULT_URI: URL of the Key Vault
 * - AZURE_CLIENT_ID: Azure service principal client ID
 * - AZURE_TENANT_ID: Azure tenant ID
 * - AZURE_CLIENT_SECRET: Azure service principal secret
 */
export class AzureKeyVaultPlugin extends BaseSecretsPlugin implements ISecretsPlugin {
  pluginName = "Azure Key Vault";
  private client?: SecretClient;
  private initialized?: Promise<void>;

  /**
   * Constructs a new plugin instance.
   * @param options - Azure Key Vault configuration
   * @param skip - If true, skips initialization
   */
  constructor(options: AzurePluginOptions, skip = false) {
    super();
    if (!skip) this.initialized = this.initializeClient(options);
  }

  /**
   * Dynamically imports Azure SDK and initializes the SecretClient.
   * @private
   * @param options - Plugin configuration options
   * @throws Will throw if SDK is not installed
   */
  private async initializeClient(options: AzurePluginOptions): Promise<void> {
    ConsoleUtils.info("Initializing Azure Key Vault plugin...");
  
    let SecretClient: any, DefaultAzureCredential: any;
  
    try {
      // Attempt to import SDKs separately to handle missing dependencies
      ({ SecretClient } = await import("@azure/keyvault-secrets"));
      ({ DefaultAzureCredential } = await import("@azure/identity"));
    } catch (sdkError) {
      ConsoleUtils.error(
        `Azure SDK not installed. Run: ${ConsoleUtils.clickable(getInstallCommand("@azure/keyvault-secrets"))} and ${ConsoleUtils.clickable(getInstallCommand("@azure/identity"))} or better ${ConsoleUtils.clickable("npx dotsecrets setup")}`
      );
      throw sdkError;
    }
  
    try {
      const credential = options.credential ?? new DefaultAzureCredential();
      this.client = new SecretClient(options.vaultUrl, credential);
      ConsoleUtils.debug("Azure Key Vault plugin initialized successfully.");
    } catch (clientError) {
      ConsoleUtils.error(`Failed to initialize Azure Key Vault client: ${clientError}`);
      throw clientError;
    }
  }

  /**
   * Retrieves a secret value asynchronously from Azure Key Vault.
   * @param key - Name of the secret to fetch
   * @returns The secret value or undefined if not found
   */
  async getSecret(key: string): Promise<string | undefined> {
    await this.initialized;
    if (!this.client) {
      ConsoleUtils.error("Azure Key Vault plugin not initialized correctly.");
      return undefined;
    }

    key = this.parseSecretName(key);
    
    try {
      ConsoleUtils.debug(`Fetching secret "${key}" from Azure Key Vault...`);
      const response = await this.client.getSecret(key);
      ConsoleUtils.debug(`Secret "${key}" retrieved successfully.`);
      return response.value;
    } catch (error) {
      ConsoleUtils.warn(`Secret "${key}" not found or error retrieving: ${error}`);
      return undefined;
    }
  }

  /**
   * Stub for synchronous secret retrieval. Azure Key Vault does not support sync calls.
   * @param key - Name of the secret
   * @returns Always undefined
   */
  getSecretSync(key: string): string | undefined {
    ConsoleUtils.error("Azure Key Vault does not support synchronous retrieval.");
    return undefined;
  }

  /**
   * Pushes multiple secrets to Azure Key Vault with concurrency control and progress reporting.
   * @param secrets - Key-value map of secrets to push
   * @returns True if at least one secret succeeded, false otherwise
   */
  async pushSecrets(secrets: Record<string, string>): Promise<boolean | undefined> {
    const ok1 = await ensurePackageInstalled("@azure/keyvault-secrets");
    const ok2 = await ensurePackageInstalled("@azure/identity");
    if (!ok1 || !ok2) return false;

    const vars = await ensureVariables({
      AZURE_KEYVAULT_URI: undefined,
      AZURE_CLIENT_ID: undefined,
      AZURE_TENANT_ID: undefined,
      AZURE_CLIENT_SECRET: undefined,
    });

    process.env.AZURE_KEYVAULT_URI = vars.AZURE_KEYVAULT_URI;
    process.env.AZURE_CLIENT_ID = vars.AZURE_CLIENT_ID;
    process.env.AZURE_TENANT_ID = vars.AZURE_TENANT_ID;
    process.env.AZURE_CLIENT_SECRET = vars.AZURE_CLIENT_SECRET;

    this.initialized = this.initializeClient({vaultUrl:vars.AZURE_KEYVAULT_URI});
    await this.initialized;
    if (!this.client) {
      ConsoleUtils.error("Azure Key Vault plugin not initialized correctly.");
      return false;
    }

    secrets = await filterSecretsWithExclusions({secrets:secrets, excludeKeys: ["AZURE_KEYVAULT_URI", "AZURE_CLIENT_ID", "AZURE_TENANT_ID", "AZURE_CLIENT_SECRET", "DOTSECRETS_PLUGIN"],
      promptMessage: "Heads up! You’re uploading your environment variables to Azure, and we noticed:\n\nKEYS\n\nThese [are/is] in the list and seem intended for local use. Exclude them?", })

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

    await Promise.all(
      entries.map(([key, value]) =>
        limit(async () => {
          try {
            key = this.parseSecretName(key);
            await this.client!.setSecret(key, value);
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
   * Sets up Azure Key Vault plugin by installing dependencies, ensuring environment variables,
   * and configuring DOTSECRETS_PLUGIN.
   * @returns True on successful setup, false otherwise
   */
  async setup(): Promise<boolean | undefined> {
    console.log(boxen(chalk.cyanBright("Setting up Azure Key Vault Plugin..."), { padding: 1, borderColor: "cyan", borderStyle: "round" }));
    const ok1 = await ensurePackageInstalled("@azure/keyvault-secrets", true);
    const ok2 = await ensurePackageInstalled("@azure/identity", true);
    if (!ok1 || !ok2) return false;

    const env = await ensureAndPersistEnvVars(
      "AZURE_KEYVAULT_URI",
      "AZURE_CLIENT_ID",
      "AZURE_TENANT_ID",
      "AZURE_CLIENT_SECRET",
    );

    if (process.env.DOTSECRETS_PLUGIN === "azure") {
      ConsoleUtils.success("DOTSECRETS_PLUGIN already set to azure.");
    } else {
      ConsoleUtils.info("Setting DOTSECRETS_PLUGIN=azure...", true);
      await forceSetVars({ DOTSECRETS_PLUGIN: "azure" });
    }

    console.log(
      boxen(
        chalk.blueBright(
          `Reminder 🔥 In production you should set:\n\n   DOTSECRETS_PLUGIN=azure\n   AZURE_KEYVAULT_URI=${env.AZURE_KEYVAULT_URL}\n   AZURE_CLIENT_ID=${env.AZURE_CLIENT_ID}\n   AZURE_TENANT_ID=${env.AZURE_TENANT_ID}\n   AZURE_CLIENT_SECRET=***\n\nin the environment variables directly on your host (or use AZ Identity if you are deploying directly to Azure)`
        ),
        { padding: 1, borderColor: "blueBright", borderStyle: "round" }
      )
    );

    return true;
  }
}