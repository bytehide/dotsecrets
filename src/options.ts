import fs from 'fs';
import path from 'path';
import { ConsoleUtils } from './utils/console.js';

/**
 * Configuration options for DotSecrets
 * 
 * These options control the behavior of the library, including file paths,
 * environments, and various features such as watching for changes.
 * 
 * @interface DotSecretsOptions
 */
export interface DotSecretsOptions {
  /**
   * Path to the secrets file (default: ".secrets")
   * 
   * @example
   * // Use a custom path for secrets
   * const options = { path: "./config/.secrets" };
   */
  path?: string;

  /**
   * Path to the environment file (default: ".env")
   * 
   * @example
   * // Use a custom path for environment variables
   * const options = { envPath: "./config/.env" };
   */
  envPath?: string;

  /**
   * Environment name to use for loading environment-specific files
   * Falls back to process.env.NODE_ENV if not specified
   * 
   * @example
   * // Load staging environment files
   * const options = { environment: "staging" };
   */
  environment?: string;

  /**
   * Encoding to use when reading files (default: "utf8")
   * 
   * @example
   * // Use latin1 encoding
   * const options = { encoding: "latin1" };
   */
  encoding?: BufferEncoding;

  /**
   * Whether to watch files for changes (default: true in development)
   * 
   * @example
   * // Disable file watching
   * const options = { watch: false };
   */
  watch?: boolean;

  /**
   * Enable debug logging (default: false or DOTSECRETS_DEBUG=true)
   * 
   * @example
   * // Enable debug output
   * const options = { debug: true };
   */
  debug?: boolean;

  /**
   * Whether to override existing environment variables (default: false)
   * 
   * @example
   * // Override existing environment variables
   * const options = { override: true };
   */
  override?: boolean;

  /**
   * Whether to expand variable references in values (default: false)
   * 
   * @example
   * // Enable variable expansion
   * const options = { expand: true };
   */
  expand?: boolean;

  /**
   * Encryption key for decrypting secrets (from DOTSECRETS_ENCRYPTION_KEY)
   * 
   * @example
   * // Provide encryption key explicitly
   * const options = { encryptionKey: "your-encryption-key" };
   */
  encryptionKey?: string;

  /**
   * Whether to automatically initialize DotSecrets (default: true)
   * 
   * @example
   * // Disable auto-initialization
   * const options = { autoInit: false };
   */
  autoInit?: boolean;

  /**
   * Whether to skip auto-configuration (from DOTSECRETS_SKIP_AUTO_CONFIG)
   * 
   * @example
   * // Skip auto-configuration
   * const options = { skipAutoConfig: true };
   */
  skipAutoConfig?: boolean;
}

// Singleton to hold the current options
let currentOptions: DotSecretsOptions = {};
let isInitialized = false;

/**
 * Loads options from various sources with the following priority:
 * 1. Explicit parameters (highest priority)
 * 2. Environment variables
 * 3. Configuration file (dotsecrets.config.js or dotsecrets.config.json)
 * 4. Default values (lowest priority)
 * 
 * @param customOptions - Custom options to override defaults
 * @returns The merged configuration options
 * 
 * @example
 * // Load default options
 * const options = loadOptions();
 * 
 * @example
 * // Load with custom overrides
 * const options = loadOptions({
 *   path: "./config/.secrets",
 *   debug: true
 * });
 */
export function loadOptions(customOptions: DotSecretsOptions = {}): DotSecretsOptions {
  if (isInitialized && Object.keys(customOptions).length === 0) {
    // Just return current options if already initialized and no new options
    return currentOptions;
  }

  const isLocalEnv = !process.env.NODE_ENV || process.env.NODE_ENV === "development";
  
  // Start with default options
  const newOptions: DotSecretsOptions = {
    path: ".secrets",
    envPath: ".env",
    environment: process.env.NODE_ENV || "",
    encoding: "utf8",
    watch: isLocalEnv,
    debug: process.env.DOTSECRETS_DEBUG === "true" || false,
    override: false,
    expand: false,
    encryptionKey: process.env.DOTSECRETS_ENCRYPTION_KEY || "",
    autoInit: true,
    skipAutoConfig: process.env.DOTSECRETS_SKIP_AUTO_CONFIG === "true" || false
  };

  // Try to load from config file
  try {
    const configFilePath = findConfigFile();
    if (configFilePath) {
      const fileOptions = loadConfigFile(configFilePath);
      Object.assign(newOptions, fileOptions);
      ConsoleUtils.debug(`Loaded options from ${configFilePath}`);
    }
  } catch (error) {
    ConsoleUtils.debug(`Error loading config file: ${error}`);
  }

  // Override with environment variables
  loadFromEnv(newOptions);

  // Override with explicit options (highest priority)
  Object.assign(newOptions, customOptions);

  // Set debug mode early so we can log the rest of initialization
  if (newOptions.debug) {
    ConsoleUtils.setDebug(true);
  }

  // Log the final options if in debug mode
  ConsoleUtils.debug('dotsecrets options:');
  ConsoleUtils.debug(JSON.stringify(newOptions, null, 2));

  // Update the current options
  currentOptions = newOptions;
  isInitialized = true;

  return currentOptions;
}

/**
 * Gets the current options, loading defaults if not initialized
 * 
 * This function ensures that options are always available, loading
 * defaults if the library hasn't been explicitly initialized.
 * 
 * @returns The current configuration options
 * 
 * @example
 * // Get the current configuration
 * const options = getOptions();
 * console.log(`Secrets path: ${options.path}`);
 */
export function getOptions(): DotSecretsOptions {
  if (!isInitialized) {
    return loadOptions();
  }
  return currentOptions;
}

/**
 * Attempts to find a configuration file in the project
 * 
 * Searches for configuration files in the current directory, parent directories,
 * and config subdirectories, supporting both JS and JSON formats.
 * 
 * @returns The path to the config file, or null if not found
 * @internal
 */
function findConfigFile(): string | null {
  let currentDir = process.cwd();
  const possibleFiles = [
    'dotsecrets.config.js',
    'dotsecrets.config.json',
    '.dotsecrets.config.js',
    '.dotsecrets.config.json',
    path.join('config', 'dotsecrets.config.js'),
    path.join('config', 'dotsecrets.config.json')
  ];
  
  while (currentDir !== path.parse(currentDir).root) {
    for (const file of possibleFiles) {
      const fullPath = path.join(currentDir, file);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    
    currentDir = path.dirname(currentDir);
  }
  
  for (const file of possibleFiles) {
    const fullPath = path.join(path.parse(currentDir).root, file);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

/**
 * Loads options from a configuration file
 * 
 * Supports both JavaScript (.js) and JSON (.json) file formats.
 * 
 * @param filePath - Path to the configuration file
 * @returns The loaded options
 * @internal
 */
function loadConfigFile(filePath: string): DotSecretsOptions {
  if (filePath.endsWith('.js')) {
    // For .js files, require them (they should export an object)
    try {
      // Use dynamic import for ESM compatibility
      return require(filePath);
    } catch (error) {
      ConsoleUtils.warn(`Failed to load JS config file, falling back to JSON parsing: ${error}`);
      // Fall back to reading as JSON if require fails
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
  } else {
    // For .json files, parse JSON
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  }
}

/**
 * Loads options from environment variables
 * 
 * Maps environment variables to their corresponding option properties,
 * handling type conversion as needed.
 * 
 * @param options - The options object to update
 * @internal
 */
function loadFromEnv(options: DotSecretsOptions): void {
  // Map environment variables to option properties
  const envMap = {
    DOTSECRETS_PATH: 'path',
    DOTSECRETS_ENV_PATH: 'envPath',
    DOTSECRETS_ENVIRONMENT: 'environment',
    DOTSECRETS_ENCODING: 'encoding',
    DOTSECRETS_WATCH: 'watch',
    DOTSECRETS_DEBUG: 'debug',
    DOTSECRETS_OVERRIDE: 'override',
    DOTSECRETS_EXPAND: 'expand',
    DOTSECRETS_ENCRYPTION_KEY: 'encryptionKey',
    DOTSECRETS_AUTO_INIT: 'autoInit',
    DOTSECRETS_SKIP_AUTO_CONFIG: 'skipAutoConfig'
  };

  // Process environment variables
  for (const [envVar, optionKey] of Object.entries(envMap)) {
    const envValue = process.env[envVar];
    if (envValue !== undefined) {
      // Convert string values to appropriate types
      if (envValue.toLowerCase() === 'true') {
        (options as any)[optionKey] = true;
      } else if (envValue.toLowerCase() === 'false') {
        (options as any)[optionKey] = false;
      } else if (!isNaN(Number(envValue))) {
        (options as any)[optionKey] = Number(envValue);
      } else {
        (options as any)[optionKey] = envValue;
      }
    }
  }
}

/**
 * Returns whether auto-initialization should be performed
 * 
 * Auto-initialization is enabled by default but can be disabled via configuration.
 * 
 * @returns True if auto-initialization should be performed, false otherwise
 * 
 * @example
 * if (shouldAutoInit()) {
 *   // Initialize the library
 *   config();
 * }
 */
export function shouldAutoInit(): boolean {
  const options = getOptions();
  return options.autoInit ?? true;
}

/**
 * Returns whether auto-configuration should be skipped
 * 
 * This function checks configuration sources in a specific order to determine
 * if auto-configuration should be skipped, avoiding full initialization.
 * 
 * @returns True if auto-configuration should be skipped, false otherwise
 * 
 * @example
 * if (!shouldSkipAutoConfig()) {
 *   // Perform automatic configuration
 *   setupEnvironment();
 * }
 */
export function shouldSkipAutoConfig(): boolean {
  // Check environment variable directly for early access
  if (process.env.DOTSECRETS_SKIP_AUTO_CONFIG === "true") {
    return true;
  }
  
  // Check config file without triggering full config() if possible
  try {
    const configFilePath = findConfigFile();
    if (configFilePath) {
      const fileConfig = loadConfigFile(configFilePath);
      if (fileConfig.skipAutoConfig === true) {
        return true;
      }
    }
  } catch (error) {
    // Ignore errors when checking config file
  }
  
  return false;
}