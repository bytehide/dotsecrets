import { BaseSecretsPlugin } from "./BaseSecretsPlugin.js";

/**
 * Environment Variables Secrets Plugin
 * 
 * This plugin provides access to secrets stored in environment variables.
 * It's the default and simplest plugin, using Node.js process.env to retrieve secrets.
 * 
 * @extends {BaseSecretsPlugin}
 */
export class EnvSecretsPlugin extends BaseSecretsPlugin {
  /**
   * The name of the plugin for identification and logging purposes
   */
  pluginName = "Local Secrets";

  /**
   * Asynchronously retrieves a secret value from environment variables
   * 
   * @param secretKey - The environment variable name to retrieve
   * @returns A promise that resolves to the environment variable value, or undefined if not found
   * 
   * @example
   * const dbPassword = await envPlugin.getSecret('DATABASE_PASSWORD');
   */
  async getSecret(secretKey: string): Promise<string | undefined> {
    return process.env[secretKey];
  }

  /**
   * Synchronously retrieves a secret value from environment variables
   * 
   * @param secretKey - The environment variable name to retrieve
   * @returns The environment variable value, or undefined if not found
   * 
   * @example
   * const apiKey = envPlugin.getSecretSync('API_KEY');
   */
  getSecretSync(secretKey: string): string | undefined {
    return process.env[secretKey];
  }

  /**
   * Sets environment variables from the provided secrets
   * 
   * @param secrets - A record of key-value pairs to set as environment variables
   * @returns A promise that resolves to true if successful
   * 
   * @example
   * await envPlugin.pushSecrets({
   *   API_KEY: 'abc123',
   *   DATABASE_URL: 'postgresql://user:pass@localhost/db'
   * });
   */
  async pushSecrets(secrets: Record<string, string>): Promise<boolean> {
    for (const [key, value] of Object.entries(secrets)) {
      process.env[key] = value;
    }
    return true;
  }

  /**
   * Sets up the plugin (no-op for environment variables)
   * 
   * This method is included for compatibility with the BaseSecretsPlugin interface
   * but doesn't require any setup for environment variables.
   * 
   * @returns A promise that resolves to true
   */
  async setup(): Promise<boolean> {
    return true;
  }
}