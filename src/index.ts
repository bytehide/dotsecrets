/**
 * dotsecrets - A .env-like library for secrets management in Node.js/TypeScript.
 * 
 * This index file re-exports components and initializes the secrets system.
 */
import { autoInitSecretsPlugin } from "./autoInit.js";
import { config, shouldSkipAutoConfig } from "./config.js";
import { ConsoleUtils } from "./utils/console.js";

// Export the secrets proxy for accessing secrets
export { secrets } from "./secretsProxy.js";

// Export configuration functions
export { config } from "./config.js";
export { autoInitSecretsPlugin } from "./autoInit.js";
export { preloadAllSecrets } from "./preload.js";

// Export plugin interfaces and implementations
//export { ISecretsPlugin } from "./plugins/ISecretsPlugin.js";
//export { EnvSecretsPlugin } from "./plugins/EnvSecretsPlugin.js";
//export { AzureKeyVaultPlugin } from "./plugins/AzureKeyVaultPlugin.js";
//export { ByteHideSecretsPlugin } from "./plugins/ByteHideSecretsPlugin.js";

if (!shouldSkipAutoConfig()) {
    //Load .env & .secrets
    config();
    ConsoleUtils.debug("Init dotsecrets automatically, set 'autoInit: false' in the options file or 'DOTSECRETS_AUTO_INIT=false' in your env vars to disable it.")

    // Automatically initialize with default settings
    autoInitSecretsPlugin();
} else ConsoleUtils.debug("Skipping auto init because user set it false in options.")
