/**
 * Interface for secret management plugins
 * 
 * This interface defines the contract that all secret provider plugins must implement.
 * It enables consistent access to various secret storage systems like Azure Key Vault,
 * AWS Secrets Manager, HashiCorp Vault, etc.
 */
export interface ISecretsPlugin {
  /**
   * The name of the plugin for identification and logging purposes
   * 
   * This property helps identify which plugin is being used, especially for
   * error messages and debugging.
   */
  pluginName: string;
  
  /**
   * Asynchronously retrieves a secret value by its key
   * 
   * This is the primary method that all plugins must implement. It retrieves
   * a secret from the underlying storage system.
   * 
   * @param secretKey - The key or identifier of the secret to retrieve
   * @returns A promise that resolves to the secret value, or undefined if not found
   * 
   * @example
   * const apiKey = await secretsPlugin.getSecret('API_KEY');
   */
  getSecret(secretKey: string): Promise<string | undefined>;
  
  /**
   * Synchronously retrieves a secret value by its key
   * 
   * This is an optional method that plugins can implement if they support
   * synchronous retrieval. It's useful for plugins that maintain a local cache
   * or access secrets from memory or local files.
   * 
   * @param secretKey - The key or identifier of the secret to retrieve
   * @returns The secret value, or undefined if not found
   * 
   * @example
   * const apiKey = secretsPlugin.getSecretSync('API_KEY');
   */
  getSecretSync?(secretKey: string): string | undefined;

  /**
   * Gets the value of a secret asynchronously.
   * 
   * @param key - The key of the secret to retrieve
   * @returns Promise resolving to the secret value or undefined if not found
   */
  //pushSecrets(key: Record<string,string>): Promise<boolean | undefined>;

  /**
   * Gets the value of a secret asynchronously.
   * 
   * @param key - The key of the secret to retrieve
   * @returns Promise resolving to the secret value or undefined if not found
   */
  //setup(): Promise<boolean | undefined>;
}