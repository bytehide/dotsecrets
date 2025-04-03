// src/plugins/BaseSecretsPlugin.ts

import { ConsoleUtils } from "../utils/console.js";
import { normalizeSecretName, providerMap, validateSecretName } from "../utils/providers.js";
import { ISecretsPlugin } from "./ISecretsPlugin.js";

/**
 * Abstract base class for secret management plugins
 * 
 * This class provides a foundation for building secret management plugins
 * by implementing common functionality and enforcing the ISecretsPlugin interface.
 * Plugin developers can extend this class to create new secret provider
 * implementations with minimal boilerplate code.
 * 
 * @implements {ISecretsPlugin}
 */
export abstract class BaseSecretsPlugin implements ISecretsPlugin {
  /**
   * The name of the plugin for identification and logging purposes
   * 
   * This property should be overridden by subclasses to provide a unique
   * identifier for the plugin.
   */
  abstract pluginName: string;

  /**
   * Asynchronously retrieves a secret value by its key
   * 
   * This method must be implemented by all concrete plugin classes to
   * retrieve secrets from their respective storage systems.
   * 
   * @param secretKey - The key or identifier of the secret to retrieve
   * @returns A promise that resolves to the secret value, or undefined if not found
   */
  abstract getSecret(secretKey: string): Promise<string | undefined>;

  /**
   * Synchronously retrieves a secret value by its key
   * 
   * This method is optional and should be implemented by plugins that can
   * provide synchronous access to secrets. Default implementation returns undefined.
   * 
   * @param secretKey - The key or identifier of the secret to retrieve
   * @returns The secret value, or undefined if not found
   */
  getSecretSync?(secretKey: string): string | undefined {
    return undefined;
  }

  /**
   * Pushes multiple secrets to the secret storage system
   * 
   * This abstract method must be implemented by concrete plugin classes to
   * store multiple secrets in their respective storage systems.
   * 
   * @param secrets - A record of key-value pairs representing the secrets to store
   * @returns A promise that resolves to true if successful, false or undefined otherwise
   */
  abstract pushSecrets(secrets: Record<string,string>): Promise<boolean | undefined>;
  
  /**
   * Sets up the plugin with necessary configurations
   * 
   * This abstract method must be implemented by concrete plugin classes to
   * initialize the plugin with any required configurations or connections.
   * 
   * @returns A promise that resolves to true if setup was successful, false or undefined otherwise
   */
  abstract setup(): Promise<boolean | undefined>;

  /**
   * Converts an ENV-style key to the appropriate format for the provider
   * 
   * This method handles the transformation of standard environment variable style
   * secret keys to the format expected by the specific secret provider.
   * 
   * @param rawKey - The original secret key in ENV-style format
   * @returns The normalized secret key in the format expected by the provider
   * 
   * @example
   * // For AWS Secrets Manager, might convert:
   * // DB_PASSWORD -> db/password
   * const awsKey = plugin.parseSecretName('DB_PASSWORD');
   */
  parseSecretName(rawKey: string): string {
    const provider = providerMap[this.pluginName];
    
    let providerSecret = rawKey;
    if(!validateSecretName(provider, rawKey)){
      providerSecret = normalizeSecretName(provider, rawKey);
      ConsoleUtils.warn(`${this.pluginName} doesn't accept the current secret format '${rawKey}', secret key was modified to: '${providerSecret}'`, true)
    }
    return providerSecret;
  }
}