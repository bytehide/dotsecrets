import { config } from "./config.js";
import { ISecretsPlugin } from "./plugins/ISecretsPlugin.js";
import { EnvSecretsPlugin } from "./plugins/EnvSecretsPlugin.js";
import { normalizeSecretName, providerMap, validateSecretName } from "./utils/providers.js";
import { ConsoleUtils } from "./utils/console.js";

/**
 * Manages application secrets with caching capabilities and plugin support.
 * 
 * The SecretsManager class serves as the central repository for all secrets in the application.
 * It provides both synchronous and asynchronous access to secrets, with built-in caching 
 * for improved performance. It also supports extensibility through plugins for 
 * different secret storage providers.
 */
class SecretsManager {
  /** Internal cache for storing regular secrets */
  private cache: Map<string, string> = new Map();
  
  /** Internal cache for storing public (non-sensitive) values */
  private publicCache: Map<string, string> = new Map();
  
  /** The active secrets plugin for fetching secrets from external sources */
  private plugin: ISecretsPlugin;
  
  /** Tracks whether initialization has been performed */
  private initialized: boolean = false;

  /**
   * Creates a new SecretsManager instance.
   * 
   * By default, the manager uses the EnvSecretsPlugin which sources secrets
   * from environment variables and local files.
   */
  constructor() {
    this.plugin = new EnvSecretsPlugin();
  }

  /**
   * Initializes and loads secrets into cache using `config()`.
   * 
   * This method is called automatically when secrets are accessed for the first time.
   * It ensures initialization only happens once (lazy initialization pattern).
   * Loads secrets from files and environment variables using the config function,
   * and segregates PUBLIC_ prefixed keys into a separate cache.
   */
  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    const secrets = config({ override: true, expand: true });

    //Split PUBLIC_ keys from private ones
    for (const key in secrets) {
      if (key.startsWith("PUBLIC_")) {
        this.publicCache.set(key, secrets[key]);
      } else {
        this.cache.set(key, secrets[key]);
      }
    }
  }

  /**
   * Configures an external secrets plugin to use as the secrets provider.
   * 
   * This allows integration with various external secret management systems
   * such as ByteHide, AWS Secrets Manager, Azure Key Vault, HashiCorp Vault, etc.
   * 
   * @param plugin - The secrets plugin implementation to use
   * 
   * @example
   * // Configure to use Azure Key Vault
   * const azurePlugin = new AzureKeyVaultPlugin({
   *   vaultUrl: "https://my-vault.vault.azure.net",
   *   clientId: "client-id",
   *   clientSecret: "client-secret"
   * });
   * secretsCache.setSecretsPlugin(azurePlugin);
   */
  setSecretsPlugin(plugin: ISecretsPlugin): void {
    this.plugin = plugin;
  }

  /**
   * Gets a secret from the cache if it exists.
   * 
   * This method only returns values that are already in the cache,
   * and does not attempt to load them from external sources.
   * It automatically initializes the manager on first use.
   * 
   * @param key - The key of the secret to retrieve
   * @returns The secret value or undefined if not found
   * 
   * @example
   * const apiKey = secretsCache.getSecretSync("API_KEY");
   * if (apiKey) {
   *   // Use the API key
   * } else {
   *   // Handle missing secret
   * }
   */
  getSecretSync(key: string): string | undefined {
    this.initialize();
    return this.cache.get(key);
  }

  /**
   * Gets a public variable (prefixed with "PUBLIC_") from the public cache.
   * 
   * Public values are non-sensitive configuration values that are safe to
   * expose in client-side code or logs. They are stored separately from
   * sensitive secrets.
   * 
   * @param key - The key of the public variable to retrieve (should start with PUBLIC_)
   * @returns The public value or undefined if not found
   * 
   * @example
   * const appName = secretsCache.getPublicSync("PUBLIC_APP_NAME");
   * console.log(`Application: ${appName}`);
   */
  getPublicSync(key: string): string | undefined {
    this.initialize();
    return this.publicCache.get(key);
  }

  /**
   * Gets a secret from the cache if it exists (asynchronous version).
   * 
   * This method only returns values that are already in the cache,
   * and does not attempt to load them from external sources.
   * 
   * @param key - The key of the secret to retrieve
   * @returns Promise resolving to the secret value or undefined if not found
   * 
   * @example
   * const apiKey = await secretsCache.getSecret("API_KEY");
   */
  async getSecret(key: string): Promise<string | undefined> {
    this.initialize();
    return this.cache.get(key);
  }

  /**
   * Loads a secret from the configured source (file, env, plugin) synchronously.
   * 
   * This method checks the cache first, then tries to get the secret from
   * the configured plugin if the synchronous retrieval is supported.
   * 
   * @param key - The key of the secret to load
   * @returns The secret value or undefined if not found
   * 
   * @example
   * const dbPassword = secretsCache.loadSecretSync("DB_PASSWORD");
   * if (dbPassword) {
   *   // Connect to database
   * }
   */
  loadSecretSync(key: string): string | undefined {
    this.initialize();

    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // Try to get from plugin if configured
    const pluginValue = this.plugin.getSecretSync?.(key);
    if (pluginValue !== undefined) {
      this.cache.set(key, pluginValue);
      return pluginValue;
    }

    return undefined;
  }

  /**
   * Loads a secret from the configured source asynchronously.
   * 
   * This method checks the cache first, then tries to get the secret from
   * the configured plugin. It handles secret key normalization for different
   * providers that have specific naming requirements.
   * 
   * @param key - The key of the secret to load
   * @returns Promise resolving to the secret value or undefined if not found
   * 
   * @example
   * // Async retrieval from external provider
   * const apiKey = await secretsCache.loadSecret("API_KEY");
   * if (apiKey) {
   *   // Make API request
   * } else {
   *   // Handle missing API key
   * }
   */
  async loadSecret(key: string): Promise<string | undefined> {
    this.initialize();

    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const provider = providerMap[this.plugin.pluginName];

    let providerSecret = key;
    if(!validateSecretName(provider, key)){
      providerSecret = normalizeSecretName(provider, key);
      ConsoleUtils.warn(`${this.plugin.pluginName} doesn't accept the current secret format '${key}', secret key was modified to: '${providerSecret}'`)
    }
    
    // Try to get from plugin asynchronously
    const pluginValue = await this.plugin.getSecret(providerSecret);
    if (pluginValue !== undefined) {
      this.cache.set(key, pluginValue);
      return pluginValue;
    }

    return undefined;
  }
}

/**
 * Singleton instance to handle caching and reading of secrets
 * 
 * This instance is exported and used throughout the application to
 * provide a centralized access point for all secrets.
 * 
 * @example
 * import { secretsCache } from 'dotsecrets';
 * 
 * // Configure to use a custom plugin
 * secretsCache.setSecretsPlugin(myCustomPlugin);
 * 
 * // Get a secret
 * const secret = await secretsCache.loadSecret('MY_SECRET');
 */
export const secretsCache = new SecretsManager();