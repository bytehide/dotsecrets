import { EnvSecretsPlugin } from "./plugins/EnvSecretsPlugin.js";
import { AzureKeyVaultPlugin } from "./plugins/AzureKeyVaultPlugin.js";
import { ByteHideSecretsPlugin } from "./plugins/ByteHideSecretsPlugin.js";
import { secretsCache } from "./secretsManager.js";
import { AwsSecretsManagerPlugin } from "./plugins/AWSSecretsManagerPlugin.js";
import { ConsoleUtils } from "./utils/console.js";
import { HashiCorpVaultPlugin } from "./plugins/HashiCorpVaultPlugin.js";
import { OnePasswordSecretsPlugin } from "./plugins/OnePasswordSecretsPlugin.js";
import { GcpSecretsManagerPlugin } from "./plugins/GCPSecretsManagerPlugin.js";
import { IbmSecretsManagerPlugin } from "./plugins/IBMCloudSecretsManagerPlugin.js";
import { KeeperSecretsManagerPlugin } from "./plugins/KeeperSecretsPlugin.js";
import { DopplerSecretsManagerPlugin } from "./plugins/DopplerSecretsPlugin.js";

/**
 * Options for automatically initializing a secrets plugin
 * 
 * These options control which plugin to use and how it should be configured
 * during automatic initialization.
 */
interface AutoInitOptions {
  /**
   * The type of plugin to initialize
   * 
   * Supported values:
   * - "env" (default): Use local environment variables and files
   * - "azure": Azure Key Vault
   * - "aws": AWS Secrets Manager
   * - "bytehide": ByteHide Secrets
   * - "hashicorp": HashiCorp Vault/HCP Vault
   * - "1password": 1Password Connect API
   * - "google": Google Cloud Secret Manager
   * - "ibm": IBM Cloud Secrets Manager
   * - "keeper": Keeper Secrets Manager
   * - "doppler": Doppler
   * 
   * If not specified, the value will be taken from the DOTSECRETS_PLUGIN
   * environment variable, or defaulted to "env".
   */
  plugin?: string;
}

/**
 * Automatically initializes the appropriate secrets plugin based on configuration
 * or environment variables.
 * 
 * This function determines which plugin to use either from the provided options
 * or from the DOTSECRETS_PLUGIN environment variable. It then initializes the
 * corresponding plugin with appropriate configurations from environment variables.
 * 
 * Each plugin has specific environment variable requirements, and the function
 * will validate that the necessary variables are present.
 * 
 * @param options - Configuration options for initializing the plugin
 * @throws Error if required configuration for a plugin is missing
 * 
 * @example
 * // Use environment variables to determine the plugin
 * autoInitSecretsPlugin();
 * 
 * @example
 * // Explicitly specify the plugin
 * autoInitSecretsPlugin({ plugin: "aws" });
 */
export function autoInitSecretsPlugin(options: AutoInitOptions = {}) {
  const { plugin = process.env.DOTSECRETS_PLUGIN || "env" } = options;

  if (!process.env.DOTSECRETS_PLUGIN)
    ConsoleUtils.debug("DOTSECRETS_PLUGIN is not set using default local plugin.");

  switch (plugin.toLowerCase()) {
    case "azure": {
      // Azure Key Vault plugin
      const vaultUrl = process.env.AZURE_KEYVAULT_URI;
      if (!vaultUrl) {
        ConsoleUtils.error("AZURE_KEYVAULT_URI is required to use the Azure plugin. Please set it in your environment.", true);
      }
      const force = vaultUrl as string;
      secretsCache.setSecretsPlugin(new AzureKeyVaultPlugin({ vaultUrl: force }));
      break;
    }
    case "aws": {
      // AWS Secrets Manager plugin
      const region = process.env.AWS_REGION;
      if (!region) {
        ConsoleUtils.error("AWS_REGION is required to use the AWS plugin. Please set it in your environment.", true);
      }
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
      secretsCache.setSecretsPlugin(new AwsSecretsManagerPlugin({
        region,
        ...(accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : {})
      }));
      break;
    }
    case "bytehide": {
      // ByteHide Secrets Manager plugin
      secretsCache.setSecretsPlugin(new ByteHideSecretsPlugin());
      break;
    }
    case "hashicorp": {
      // HashiCorp Vault plugin (supports both self-hosted Vault and HCP Vault)
      const hcpId = process.env.HCP_CLIENT_ID;
      const hcpSecret = process.env.HCP_CLIENT_SECRET;
      const hcpOrg = process.env.HCP_ORG_ID;
      const hcpProject = process.env.HCP_PROJECT_ID;
      const hcpApp = process.env.HCP_APP_NAME;
      const vaultAddr = process.env.VAULT_ADDR;
      const vaultToken = process.env.VAULT_TOKEN;

      const usingHCP = hcpId && hcpSecret && hcpOrg && hcpProject && hcpApp;
      const usingVault = vaultAddr && vaultToken;

      if (!usingHCP && !usingVault) {
        ConsoleUtils.error("HashiCorp plugin requires either HCP_* variables (HCP_CLIENT_ID, HCP_CLIENT_SECRET, HCP_ORG_ID, HCP_PROJECT_ID, HCP_APP_NAME) or Vault variables (VAULT_ADDR, VAULT_TOKEN).", true);
      }

      secretsCache.setSecretsPlugin(new HashiCorpVaultPlugin());
      break;
    }
    case "1password": {
      // 1Password Connect API plugin
      if (!process.env.OP_SERVICE_ACCOUNT_TOKEN || !process.env.OP_VAULT) {
        ConsoleUtils.error("1Password plugin requires OP_SERVICE_ACCOUNT_TOKEN and OP_VAULT to be set in your environment.", true);
      }
      secretsCache.setSecretsPlugin(new OnePasswordSecretsPlugin());
      break;
    }
    case "google": {
      // Google Cloud Secret Manager plugin
      const email = process.env.GCP_CLIENT_EMAIL;
      const key = process.env.GCP_PRIVATE_KEY;
      const projectId = process.env.GOOGLE_PROJECT_ID;

      if (email && (!key || !projectId)) {
        ConsoleUtils.error("When using GCP_CLIENT_EMAIL, you must also set GCP_PRIVATE_KEY and GOOGLE_PROJECT_ID.", true);
      }

      if (!email && !projectId) {
        ConsoleUtils.error("Google plugin requires either GCP_CLIENT_EMAIL + GCP_PRIVATE_KEY + GOOGLE_PROJECT_ID or just GOOGLE_PROJECT_ID (if using implicit credentials).", true);
      }

      secretsCache.setSecretsPlugin(new GcpSecretsManagerPlugin());
      break;
    }
    case "ibm": {
      // IBM Cloud Secrets Manager plugin
      if (!process.env.IBM_CLOUD_API_KEY || !process.env.IBM_SECRETS_MANAGER_URL) {
        ConsoleUtils.error("IBM plugin requires IBM_CLOUD_API_KEY and IBM_SECRETS_MANAGER_URL to be set in your environment.", true);
      }
      secretsCache.setSecretsPlugin(new IbmSecretsManagerPlugin());
      break;
    }
    case "keeper": {
      // Keeper Secrets Manager plugin
      if (!process.env.KEEPER_CONFIG_FILE) {
        ConsoleUtils.error("Keeper plugin requires KEEPER_CONFIG_FILE to be set in your environment and point to a valid config file.", true);
      }
      secretsCache.setSecretsPlugin(new KeeperSecretsManagerPlugin());
      break;
    }
    case "doppler": {
      // Doppler plugin
      if (!process.env.DOPPLER_TOKEN) {
        ConsoleUtils.error("Doppler plugin requires DOPPLER_TOKEN to be set in your environment.", true);
      }
      secretsCache.setSecretsPlugin(new DopplerSecretsManagerPlugin());
      break;
    }
    case "env":
    default:
      // Default local environment plugin
      secretsCache.setSecretsPlugin(new EnvSecretsPlugin());
      break;
  }
}
