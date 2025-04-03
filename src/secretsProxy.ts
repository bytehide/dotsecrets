/**
 * DotSecrets: Secret Value Management Module
 * 
 * This module provides a flexible proxy-based system for accessing secrets with
 * both synchronous and asynchronous capabilities, along with type conversion
 * and validation features.
 */
import { secretsCache } from "./secretsManager.js";
import { ConsoleUtils } from "./utils/console.js";

/** Tracks whether preload has been executed to enable synchronous access */
let preloadExecuted = false;

/**
 * Marks the preload process as executed, enabling synchronous access to secrets
 * 
 * This function should be called after you have preloaded all secrets using
 * `preloadAllSecrets()`. Once marked as executed, the secrets proxy will allow
 * synchronous access to secrets and return empty strings for secrets not found
 * instead of throwing errors.
 * 
 * @example
 * // Usually called internally by preloadAllSecrets()
 * import { markPreloadExecuted } from 'dotsecrets';
 * 
 * // After all secrets are loaded
 * markPreloadExecuted();
 * 
 * // Now synchronous access won't throw errors
 * const apiKey = secrets.API_KEY; // Works even if not preloaded
 */
export function markPreloadExecuted(): void {
  preloadExecuted = true;
  ConsoleUtils.debug("Preload marked as executed");
}

/**
 * Helper to parse a string into boolean (`"true" => true`, `"false" => false`).
 * Returns `null` if not recognized, enabling validation.
 * 
 * @param str - String value to parse
 * @returns Parsed boolean or null if not a valid boolean string
 */
function parseBoolean(str: string): boolean | null {
  const lower = str.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;
  return null;
}

/**
 * A chainable wrapper for string secret values with validation and transformation capabilities
 * 
 * SecretValue enables multiple methods of access:
 * - Synchronous access (if preloaded or already in cache)
 * - Asynchronous access (using await)
 * - Chainable validations and transformations
 * - Type conversions (to number, boolean, JSON)
 * 
 * @implements PromiseLike<string> - Makes the class awaitable
 * 
 * @example
 * // Synchronous usage (requires preload)
 * const apiKey = secrets.API_KEY;
 * console.log(`Using API key: ${apiKey}`);
 * 
 * @example
 * // Asynchronous usage
 * const apiKey = await secrets.API_KEY;
 * 
 * @example
 * // With validations
 * const apiKey = await secrets.API_KEY.required().regex(/^[a-z0-9]{32}$/);
 * 
 * @example
 * // With transformations
 * const userId = await secrets.USER_ID.trim().number().positive().integer();
 */
export class SecretValue implements PromiseLike<string> {
  /**
   * Creates a new SecretValue instance
   * 
   * @param secretName - The name of the secret for error messages
   * @param syncValue - The synchronously available value (or undefined)
   * @param asyncValue - Promise that resolves to the secret value
   */
  constructor(
    private readonly secretName: string,
    protected readonly syncValue: string | undefined,
    protected readonly asyncValue: Promise<string>
  ) {}

  /**
   * Allows using `await secretValue` by implementing the Promise-like interface
   * 
   * @example
   * const apiKey = await secrets.API_KEY;
   */
  then<TResult1 = string, TResult2 = never>(
    onfulfilled?:
      | ((value: string) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | null
  ): Promise<TResult1 | TResult2> {
    return this.asyncValue.then(onfulfilled, onrejected);
  }

  /**
   * Marks the secret as required - validates that it exists and is not empty
   * 
   * @throws Error if the secret value is empty or undefined
   * @returns This instance for chaining
   * 
   * @example
   * // Will throw if API_KEY is empty or undefined
   * const apiKey = await secrets.API_KEY.required();
   */
  required(): this {
    const newSync = this.syncValue;
    if (newSync !== undefined && newSync === "") {
      ConsoleUtils.error(`Secret ${this.secretName} is required but not available (or empty).`)
      throw new Error("[dotsecrets]: Validation exception => Secret is required but not available (or empty).")
    }
    const newAsync = this.asyncValue.then((val) => {
      if (!val) {
        ConsoleUtils.error(`Secret ${this.secretName} is required but got empty string.`)
        throw new Error("[dotsecrets]: Validation exception => Secret is required but got empty string.");
      }
      return val;
    });
    return new SecretValue(this.secretName, newSync, newAsync) as this;
  }

  /**
   * Validates that the string is not empty (has at least one character)
   * 
   * @throws Error if the string is empty
   * @returns This instance for chaining
   * 
   * @example
   * const username = await secrets.USERNAME.notEmpty();
   */
  notEmpty(): this {
    const newSync = this.syncValue;
    if (newSync !== undefined && newSync.length === 0) {
      ConsoleUtils.error(`Secret ${this.secretName} is empty (notEmpty() check failed).`)
      throw new Error("[dotsecrets]: Validation exception => String is empty (notEmpty() check failed).");
    }
    const newAsync = this.asyncValue.then((val) => {
      if (val.length === 0) {
        ConsoleUtils.error(`Secret ${this.secretName} is empty (notEmpty() check failed).`)
        throw new Error("[dotsecrets]: Validation exception => String is empty (notEmpty() check failed).");
      }
      return val;
    });
    return new SecretValue(this.secretName, newSync, newAsync) as this;
  }

  /**
   * Removes whitespace from the beginning and end of the string
   * 
   * @returns This instance with trimmed value for chaining
   * 
   * @example
   * const username = await secrets.USERNAME.trim();
   */
  trim(): this {
    const newSync = this.syncValue !== undefined ? this.syncValue.trim() : undefined;
    const newAsync = this.asyncValue.then((val) => val.trim());
    return new SecretValue(this.secretName, newSync, newAsync) as this;
  }

  /**
   * Validates that the string length is between min and max (inclusive)
   * 
   * @param min - Minimum length (inclusive)
   * @param max - Maximum length (inclusive)
   * @throws Error if string length is outside the range
   * @returns This instance for chaining
   * 
   * @example
   * // Password must be 8-20 characters
   * const password = await secrets.PASSWORD.lengthBetween(8, 20);
   */
  lengthBetween(min: number, max: number): this {
    const newSync = this.syncValue;
    if (newSync !== undefined) {
      if (newSync.length < min || newSync.length > max) {
        ConsoleUtils.error(`Secret ${this.secretName} length out of range [${min}, ${max}]`)
        throw new Error(`[dotsecrets]: Validation exception => String length out of range [${min}, ${max}].`);
      }
    }
    const newAsync = this.asyncValue.then((val) => {
      if (val.length < min || val.length > max) {
        ConsoleUtils.error(`Secret ${this.secretName} length out of range [${min}, ${max}]`)
        throw new Error(`[dotsecrets]: Validation exception => String length out of range [${min}, ${max}].`);
      }
      return val;
    });
    return new SecretValue(this.secretName, newSync, newAsync) as this;
  }

  /**
   * Validates the string against a regular expression pattern
   * 
   * @param pattern - Regular expression to test against
   * @param msg - Optional custom error message
   * @throws Error if the string does not match the pattern
   * @returns This instance for chaining
   * 
   * @example
   * // Validate email format
   * const email = await secrets.EMAIL.regex(/^[\w.-]+@[\w.-]+\.\w+$/);
   * 
   * @example
   * // With custom error message
   * const uuid = await secrets.USER_ID.regex(
   *   /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
   *   "Not a valid UUID format"
   * );
   */
  regex(pattern: RegExp, msg?: string): this {
    const newSync = this.syncValue;
    if (newSync !== undefined) {
      if (!pattern.test(newSync)) {
        ConsoleUtils.error(msg || `Secret ${this.secretName} does not match regex: ${pattern}`)
        throw new Error(msg || `[dotsecrets]: Validation exception => String does not match regex: ${pattern}`);
      }
    }
    const newAsync = this.asyncValue.then((val) => {
      if (!pattern.test(val)) {
        ConsoleUtils.error(msg || `Secret ${this.secretName} does not match regex: ${pattern}`)
        throw new Error(msg || `[dotsecrets]: Validation exception => String does not match regex: ${pattern}`);
      }
      return val;
    });
    return new SecretValue(this.secretName, newSync, newAsync) as this;
  }

  /**
   * Converts the string to lowercase
   * 
   * @returns This instance with lowercase value for chaining
   * 
   * @example
   * const username = await secrets.USERNAME.toLowerCase();
   * 
   * @example
   * // Can be combined with other validations
   * const email = await secrets.EMAIL.toLowerCase().regex(/^[\w.-]+@[\w.-]+\.\w+$/);
   */
  toLowerCase(): this {
    const newSync = this.syncValue !== undefined ? this.syncValue.toLowerCase() : undefined;
    const newAsync = this.asyncValue.then((val) => val.toLowerCase());
    return new SecretValue(this.secretName, newSync, newAsync) as this;
  }

  /**
   * Converts the string to uppercase
   * 
   * @returns This instance with uppercase value for chaining
   * 
   * @example
   * const countryCode = await secrets.COUNTRY_CODE.toUpperCase();
   * 
   * @example
   * // Normalize input values
   * const currency = await secrets.CURRENCY.trim().toUpperCase();
   */
  toUpperCase(): this {
    const newSync = this.syncValue !== undefined ? this.syncValue.toUpperCase() : undefined;
    const newAsync = this.asyncValue.then((val) => val.toUpperCase());
    return new SecretValue(this.secretName, newSync, newAsync) as this;
  }

  /**
   * Converts the secret to a number and enables number-specific validations
   * 
   * @throws Error if the string cannot be converted to a number
   * @returns A NumberSecretValue instance for chaining number-specific validations
   * 
   * @example
   * const port = await secrets.PORT.number().integer().between(1024, 65535);
   * 
   * @example
   * // Using in calculations
   * const price = await secrets.PRICE.number();
   * const quantity = await secrets.QUANTITY.number();
   * const total = price * quantity;
   */
  number(): NumberSecretValue {
    let newSync: number | undefined;
    if (this.syncValue !== undefined) {
      const parsed = Number(this.syncValue);
      if (isNaN(parsed)) {
        ConsoleUtils.error(`Secret ${this.secretName} is not a number`)
        throw new Error(`[dotsecrets]: Validation exception => Cannot convert "${this.syncValue}" to number`);
      }
      newSync = parsed;
    }
    const newAsync = this.asyncValue.then((val) => {
      const parsed = Number(val);
      if (isNaN(parsed)) {
        ConsoleUtils.error(`Secret ${this.secretName} is not a number`)
        throw new Error(`[dotsecrets]: Validation exception => Cannot convert "${val}" to number`);
      }
      return parsed;
    });
    return new NumberSecretValue(this.secretName, newSync, newAsync);
  }

  /**
   * Converts the secret to a boolean and enables boolean-specific validations
   * 
   * Only recognizes "true" and "false" strings (case insensitive)
   * 
   * @throws Error if the string cannot be converted to a boolean
   * @returns A BooleanSecretValue instance for chaining boolean-specific validations
   * 
   * @example
   * const isEnabled = await secrets.FEATURE_ENABLED.boolean();
   * if (isEnabled) {
   *   // Feature is enabled
   * }
   * 
   * @example
   * // Validate that a feature is explicitly enabled
   * const isEnabled = await secrets.FEATURE_ENABLED.boolean().true();
   */
  boolean(): BooleanSecretValue {
    let newSync: boolean | undefined;
    if (this.syncValue !== undefined) {
      const b = parseBoolean(this.syncValue);
      if (b === null) {
        ConsoleUtils.error(`Secret ${this.secretName} is not a boolean`)
        throw new Error(`[dotsecrets]: Validation exception => Cannot convert "${this.syncValue}" to boolean`);
      }
      newSync = b;
    }
    const newAsync = this.asyncValue.then((val) => {
      const b = parseBoolean(val);
      if (b === null) {
        ConsoleUtils.error(`Secret ${this.secretName} is not a boolean`)
        throw new Error(`[dotsecrets]: Validation exception => Cannot convert "${val}" to boolean`);
      }
      return b;
    });
    return new BooleanSecretValue(this.secretName, newSync, newAsync);
  }

  /**
   * Parses the secret as JSON and enables object-specific validations
   * 
   * @template T - The expected type of the parsed JSON
   * @throws Error if the string cannot be parsed as valid JSON
   * @returns A JsonSecretValue<T> instance for typed access to the JSON data
   * 
   * @example
   * // Access typed JSON configuration
   * interface DatabaseConfig {
   *   host: string;
   *   port: number;
   *   credentials: { username: string; password: string; }
   * }
   * 
   * const dbConfig = await secrets.DB_CONFIG.json<DatabaseConfig>();
   * console.log(`Connecting to ${dbConfig.host}:${dbConfig.port}`);
   */
  json<T>(): JsonSecretValue<T> {
    let newSync: T | undefined;
    if (this.syncValue !== undefined) {
      try {
        newSync = JSON.parse(this.syncValue) as T;
      } catch {
        ConsoleUtils.error(`Secret ${this.secretName} can't be parsed to JSON using his value`)
        throw new Error(`[dotsecrets]: Validation exception => Cannot parse JSON from "${this.syncValue}"`);
      }
    }
    const newAsync = this.asyncValue.then((val) => {
      try {
        return JSON.parse(val) as T;
      } catch {
        ConsoleUtils.error(`Secret ${this.secretName} can't be parsed to JSON using his value`)
        throw new Error(`[dotsecrets]: Validation exception => Cannot parse JSON from "${val}"`);
      }
    });
    return new JsonSecretValue<T>(this.secretName, newSync, newAsync);
  }

  /**
   * Provides synchronous access to the secret value
   * 
   * Used when the secret is accessed directly without await.
   * Requires that the secret has been preloaded or is a PUBLIC_ key.
   * 
   * @throws Error if the secret is accessed synchronously without preloading
   * @returns The string value of the secret
   * 
   * @example
   * // After preloading
   * await preloadAllSecrets();
   * console.log(`API Key: ${secrets.API_KEY}`); // toString() called implicitly
   */
  valueOf(): string {
    if (this.syncValue === undefined) {
      const errorMsg = `Secret "${this.secretName}" accessed synchronously without preload. You must either run await preloadAllSecrets() first or use await secrets.${this.secretName}`;
      ConsoleUtils.error(errorMsg);
      throw new Error(`[dotsecrets]: Validation exception => ${errorMsg}`);
    }
    return this.syncValue;
  }

  /**
   * Converts the secret to a string, enabling use in string operations
   * 
   * @returns The string value of the secret
   * @throws Error if accessed synchronously without preload
   */
  toString(): string {
    return this.valueOf();
  }

  /**
   * Enables automatic conversion in type coercion contexts
   * 
   * @returns The primitive string value of the secret
   * @throws Error if accessed synchronously without preload
   */
  [Symbol.toPrimitive](): string {
    return this.valueOf();
  }

  /**
   * Controls how the value appears in Node.js console output
   * 
   * @returns The string representation for inspection
   * @throws Error if accessed synchronously without preload
   */
  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return this.valueOf();
  }
}

/**
 * A chainable wrapper for numeric secret values with validation capabilities
 * 
 * NumberSecretValue provides both synchronous and asynchronous access to numeric
 * secrets, with chainable validation methods specific to numbers.
 * 
 * @implements PromiseLike<number> - Makes the class awaitable
 * 
 * @example
 * // Synchronous usage (requires preload)
 * const port = secrets.PORT.number();
 * server.listen(port);
 * 
 * @example
 * // Asynchronous usage
 * const port = await secrets.PORT.number();
 * 
 * @example
 * // With validations
 * const port = await secrets.PORT.number().required().between(1024, 65535);
 */
export class NumberSecretValue implements PromiseLike<number> {
  /**
   * Creates a new NumberSecretValue instance
   * 
   * @param secretName - The name of the secret for error messages
   * @param syncValue - The synchronously available value (or undefined)
   * @param asyncValue - Promise that resolves to the numeric value
   */
  constructor(
    private readonly secretName: string,
    private readonly syncValue: number | undefined,
    private readonly asyncValue: Promise<number>
  ) {}

  /**
   * Allows using `await numberSecretValue` by implementing the Promise-like interface
   * 
   * @example
   * const port = await secrets.PORT.number();
   */
  then<TResult1 = number, TResult2 = never>(
    onfulfilled?:
      | ((value: number) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | null
  ): Promise<TResult1 | TResult2> {
    return this.asyncValue.then(onfulfilled, onrejected);
  }

  /**
   * Marks the number as required - validates that it exists and is a valid number
   * 
   * @throws Error if the number value is undefined, null, or NaN
   * @returns This instance for chaining
   * 
   * @example
   * const port = await secrets.PORT.number().required();
   */
  required(): NumberSecretValue {
    const newAsync = this.asyncValue.then(val => {
      if (val === undefined || val === null || Number.isNaN(val)) {
        ConsoleUtils.error(`Secret ${this.secretName} is required but got empty or null.`)
        throw new Error("[dotsecrets]: Validation exception => Number secret is required but got empty or null.");
      }
      return val;
    });
    
    return new NumberSecretValue(this.secretName, this.syncValue, newAsync);
  }

  /**
   * Validates that the number is greater than or equal to a minimum value
   * 
   * @param n - The minimum value (inclusive)
   * @throws Error if the number is less than the minimum
   * @returns This instance for chaining
   * 
   * @example
   * const age = await secrets.USER_AGE.number().min(18);
   */
  min(n: number): NumberSecretValue {
    let newSync = this.syncValue;
    if (newSync !== undefined && newSync < n) {
      ConsoleUtils.error(`Secret ${this.secretName} is less than min ${n}.`)
      throw new Error(`[dotsecrets]: Validation exception => Number ${newSync} is less than min ${n}.`);
    }
    const newAsync = this.asyncValue.then((val) => {
      if (val < n) {
        ConsoleUtils.error(`Secret ${this.secretName} is less than min ${n}.`)
        throw new Error(`[dotsecrets]: Validation exception => Number ${val} is less than min ${n}.`);
      }
      return val;
    });
    return new NumberSecretValue(this.secretName, newSync, newAsync);
  }

  /**
   * Validates that the number is less than or equal to a maximum value
   * 
   * @param n - The maximum value (inclusive)
   * @throws Error if the number is greater than the maximum
   * @returns This instance for chaining
   * 
   * @example
   * const priority = await secrets.TASK_PRIORITY.number().max(10);
   */
  max(n: number): NumberSecretValue {
    let newSync = this.syncValue;
    if (newSync !== undefined && newSync > n) {
      ConsoleUtils.error(`Secret ${this.secretName} is greater than max ${n}.`)
      throw new Error(`[dotsecrets]: Validation exception => Number ${newSync} is greater than max ${n}.`);
    }
    const newAsync = this.asyncValue.then((val) => {
      if (val > n) {
        ConsoleUtils.error(`Secret ${this.secretName} is greater than max ${n}.`)
        throw new Error(`[dotsecrets]: Validation exception => Number ${val} is greater than max ${n}.`);
      }
      return val;
    });
    return new NumberSecretValue(this.secretName, newSync, newAsync);
  }

  /**
   * Validates that the number is within a range [min, max] (inclusive)
   * 
   * @param min - The minimum value (inclusive)
   * @param max - The maximum value (inclusive)
   * @throws Error if the number is outside the range
   * @returns This instance for chaining
   * 
   * @example
   * const port = await secrets.PORT.number().between(1024, 65535);
   * 
   * @example
   * // Validate temperature in a reasonable range
   * const temperature = await secrets.TEMP_CELSIUS.number().between(-50, 50);
   */
  between(min: number, max: number): NumberSecretValue {
    let newSync = this.syncValue;
    if (newSync !== undefined) {
      if (newSync < min || newSync > max) {
        ConsoleUtils.error(`Secret ${this.secretName} is out of range [${min}, ${max}].`)
        throw new Error(`[dotsecrets]: Validation exception => Number ${newSync} is out of range [${min}, ${max}].`);
      }
    }
    const newAsync = this.asyncValue.then((val) => {
      if (val < min || val > max) {
        ConsoleUtils.error(`Secret ${this.secretName} is out of range [${min}, ${max}].`)
        throw new Error(`[dotsecrets]: Validation exception => Number ${val} is out of range [${min}, ${max}].`);
      }
      return val;
    });
    return new NumberSecretValue(this.secretName, newSync, newAsync);
  }

  /**
   * Validates that the number is positive (greater than zero)
   * 
   * @throws Error if the number is zero or negative
   * @returns This instance for chaining
   * 
   * @example
   * const quantity = await secrets.ITEM_QUANTITY.number().positive();
   * 
   * @example
   * // Ensure application has a positive balance
   * const balance = await secrets.ACCOUNT_BALANCE.number().positive();
   */
  positive(): NumberSecretValue {
    let newSync = this.syncValue;
    if (newSync !== undefined && newSync <= 0) {
      ConsoleUtils.error(`Secret ${this.secretName} is not positive.`)
      throw new Error(`[dotsecrets]: Validation exception => Number ${newSync} is not positive.`);
    }
    const newAsync = this.asyncValue.then((val) => {
      if (val <= 0) {
        ConsoleUtils.error(`Secret ${this.secretName} is not positive.`)
        throw new Error(`[dotsecrets]: Validation exception => Number ${val} is not positive.`);
      }
      return val;
    });
    return new NumberSecretValue(this.secretName, newSync, newAsync);
  }

  /**
   * Validates that the number is negative (less than zero)
   * 
   * @throws Error if the number is zero or positive
   * @returns This instance for chaining
   * 
   * @example
   * const adjustment = await secrets.PRICE_ADJUSTMENT.number().negative();
   * 
   * @example
   * // Verify a threshold is properly negative
   * const threshold = await secrets.TEMPERATURE_THRESHOLD.number().negative();
   */
  negative(): NumberSecretValue {
    let newSync = this.syncValue;
    if (newSync !== undefined && newSync >= 0) {
      ConsoleUtils.error(`Secret ${this.secretName} is not negative.`)
      throw new Error(`[dotsecrets]: Validation exception => Number ${newSync} is not negative.`);
    }
    const newAsync = this.asyncValue.then((val) => {
      if (val >= 0) {
        ConsoleUtils.error(`Secret ${this.secretName} is not negative.`)
        throw new Error(`[dotsecrets]: Validation exception => Number ${val} is not negative.`);
      }
      return val;
    });
    return new NumberSecretValue(this.secretName, newSync, newAsync);
  }

  /**
   * Validates that the number is an integer (no decimal part)
   * 
   * @throws Error if the number is not an integer
   * @returns This instance for chaining
   * 
   * @example
   * const port = await secrets.PORT.number().integer();
   * 
   * @example
   * // Ensure user count is a whole number
   * const userCount = await secrets.USER_COUNT.number().integer().positive();
   */
  integer(): NumberSecretValue {
    let newSync = this.syncValue;
    if (newSync !== undefined && !Number.isInteger(newSync)) {
      ConsoleUtils.error(`Secret ${this.secretName} is not an integer.`)
      throw new Error(`[dotsecrets]: Validation exception => Number ${newSync} is not an integer.`);
    }
    const newAsync = this.asyncValue.then((val) => {
      if (!Number.isInteger(val)) {
        ConsoleUtils.error(`Secret ${this.secretName} is not an integer.`)
        throw new Error(`[dotsecrets]: Validation exception => Number ${val} is not an integer.`);
      }
      return val;
    });
    return new NumberSecretValue(this.secretName, newSync, newAsync);
  }

  /**
   * Provides synchronous access to the numeric value
   * 
   * Used when the number is accessed directly without await.
   * Requires that the secret has been preloaded or is a PUBLIC_ key.
   * 
   * @throws Error if the secret is accessed synchronously without preloading
   * @returns The numeric value of the secret
   * 
   * @example
   * // After preloading
   * await preloadAllSecrets();
   * const port = secrets.PORT.number();
   * server.listen(port); // Automatic valueOf() called
   */
  valueOf(): number {
    if (this.syncValue === undefined) {
      const errorMsg = `Secret "${this.secretName}" of type number accessed synchronously without preload. You must either run await preloadAllSecrets() first or use await secrets.${this.secretName}`;
      ConsoleUtils.error(errorMsg);
      throw new Error(`[dotsecrets]: Validation exception => ${errorMsg}`);
    }
    return this.syncValue;
  }

  /**
   * Converts the numeric secret to a string, enabling use in string operations
   * 
   * @returns The string representation of the number
   * @throws Error if accessed synchronously without preload
   */
  toString(): string {
    return String(this.valueOf());
  }

  /**
   * Enables automatic conversion in type coercion contexts
   * 
   * @returns The primitive number value
   * @throws Error if accessed synchronously without preload
   */
  [Symbol.toPrimitive](): number {
    return this.valueOf();
  }

  /**
   * Controls how the value appears in Node.js console output
   * 
   * @returns The string representation for inspection
   * @throws Error if accessed synchronously without preload
   */
  [Symbol.for("nodejs.util.inspect.custom")](): string {
        return String(this.valueOf());
  }
}

/**
 * A chainable wrapper for boolean secret values with validation capabilities
 * 
 * BooleanSecretValue provides both synchronous and asynchronous access to boolean
 * secrets, with chainable validation methods specific to booleans.
 * 
 * @implements PromiseLike<boolean> - Makes the class awaitable
 * 
 * @example
 * // Synchronous usage (requires preload)
 * const isEnabled = secrets.FEATURE_ENABLED.boolean();
 * if (isEnabled) {
 *   // Feature is enabled
 * }
 * 
 * @example
 * // Asynchronous usage
 * const isEnabled = await secrets.FEATURE_ENABLED.boolean();
 * 
 * @example
 * // With validations
 * const debugMode = await secrets.DEBUG_MODE.boolean().true();
 */
export class BooleanSecretValue implements PromiseLike<boolean> {
  /**
   * Creates a new BooleanSecretValue instance
   * 
   * @param secretName - The name of the secret for error messages
   * @param syncValue - The synchronously available value (or undefined)
   * @param asyncValue - Promise that resolves to the boolean value
   */
  constructor(
    private readonly secretName: string,
    private readonly syncValue: boolean | undefined,
    private readonly asyncValue: Promise<boolean>
  ) {}

  /**
   * Allows using `await booleanSecretValue` by implementing the Promise-like interface
   * 
   * @example
   * const isEnabled = await secrets.FEATURE_ENABLED.boolean();
   */
  then<TResult1 = boolean, TResult2 = never>(
    onfulfilled?:
      | ((value: boolean) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | null
  ): Promise<TResult1 | TResult2> {
    return this.asyncValue.then(onfulfilled, onrejected);
  }

  /**
   * Marks the boolean as required - validates that it exists
   * 
   * @throws Error if the boolean value is undefined
   * @returns This instance for chaining
   * 
   * @example
   * const isEnabled = await secrets.FEATURE_ENABLED.boolean().required();
   */
  required(): BooleanSecretValue {
    if (this.syncValue === undefined) {
      ConsoleUtils.error(`Secret ${this.secretName} is required but not available.`)
      throw new Error("[dotsecrets]: Validation exception => Boolean secret is required but not available.");
    }
    return new BooleanSecretValue(this.secretName, this.syncValue, this.asyncValue);
  }

  /**
   * Validates that the boolean value is true
   * 
   * @throws Error if the boolean is not true
   * @returns This instance for chaining
   * 
   * @example
   * // Verify feature flag is enabled
   * await secrets.FEATURE_ENABLED.boolean().true();
   * 
   * @example
   * // Conditionally execute code based on validation
   * try {
   *   await secrets.SECURITY_CHECK.boolean().true();
   *   // Continue with secure operations
   * } catch (error) {
   *   // Handle security check failure
   * }
   */
  true(): BooleanSecretValue {
    const newSync = this.syncValue;
    if (newSync !== undefined && newSync !== true) {
      ConsoleUtils.error(`Secret ${this.secretName} is not true (got: ${newSync}).`)
      throw new Error(`[dotsecrets]: Validation exception => Boolean is not true (got: ${newSync}).`);
    }
    const newAsync = this.asyncValue.then((val) => {
      if (val !== true) {
        ConsoleUtils.error(`Secret ${this.secretName} is not true (got: ${val}).`)
        throw new Error(`[dotsecrets]: Validation exception => Boolean is not true (got: ${val}).`);
      }
      return val;
    });
    return new BooleanSecretValue(this.secretName, newSync, newAsync);
  }

  /**
   * Validates that the boolean value is false
   * 
   * @throws Error if the boolean is not false
   * @returns This instance for chaining
   * 
   * @example
   * // Verify maintenance mode is disabled
   * await secrets.MAINTENANCE_MODE.boolean().false();
   * 
   * @example
   * // Check security-related flags
   * await secrets.DISABLE_SECURITY.boolean().false();
   */
  false(): BooleanSecretValue {
    const newSync = this.syncValue;
    if (newSync !== undefined && newSync !== false) {
      ConsoleUtils.error(`Secret ${this.secretName} is not false (got: ${newSync}).`)
      throw new Error(`[dotsecrets]: Validation exception => Boolean is not false (got: ${newSync}).`);
    }
    const newAsync = this.asyncValue.then((val) => {
      if (val !== false) {
        ConsoleUtils.error(`Secret ${this.secretName} is not false (got: ${val}).`)
        throw new Error(`[dotsecrets]: Validation exception => Boolean is not false (got: ${val}).`);
      }
      return val;
    });
    return new BooleanSecretValue(this.secretName, newSync, newAsync);
  }

  /**
   * Provides synchronous access to the boolean value
   * 
   * Used when the boolean is accessed directly without await.
   * Requires that the secret has been preloaded or is a PUBLIC_ key.
   * 
   * @throws Error if the secret is accessed synchronously without preloading
   * @returns The boolean value of the secret
   * 
   * @example
   * // After preloading
   * await preloadAllSecrets();
   * if (secrets.FEATURE_ENABLED.boolean()) {
   *   // Feature is enabled
   * }
   */
  valueOf(): boolean {
    if (this.syncValue === undefined) {
      const errorMsg = `Secret "${this.secretName}" of type boolean accessed synchronously without preload. You must either run await preloadAllSecrets() first or use await secrets.${this.secretName}`;
      ConsoleUtils.error(errorMsg);
      throw new Error(`[dotsecrets]: Validation exception => ${errorMsg}`);
    }
    return this.syncValue;
  }

  /**
   * Converts the boolean secret to a string, enabling use in string operations
   * 
   * @returns "true" or "false" string
   * @throws Error if accessed synchronously without preload
   */
  toString(): string {
    return String(this.valueOf());
  }

  /**
   * Enables automatic conversion in numeric type coercion contexts
   * 
   * @returns 1 for true, 0 for false
   * @throws Error if accessed synchronously without preload
   */
  [Symbol.toPrimitive](): number {
    // For "primitive" boolean => we return 1 for true, 0 for false
    return this.valueOf() ? 1 : 0;
  }

  /**
   * Controls how the value appears in Node.js console output
   * 
   * @returns The string representation for inspection
   * @throws Error if accessed synchronously without preload
   */
  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return String(this.valueOf());
  }
}

/**
 * A chainable wrapper for JSON-parsed secret values with type safety
 * 
 * JsonSecretValue provides both synchronous and asynchronous access to 
 * complex structured data parsed from JSON strings.
 * 
 * @template T - The expected type of the parsed JSON
 * @implements PromiseLike<T> - Makes the class awaitable
 * 
 * @example
 * interface DatabaseConfig {
 *   host: string;
 *   port: number;
 *   credentials: {
 *     username: string;
 *     password: string;
 *   }
 * }
 * 
 * // Asynchronous usage
 * const dbConfig = await secrets.DB_CONFIG.json<DatabaseConfig>();
 * console.log(`Connecting to ${dbConfig.host}:${dbConfig.port}`);
 */
export class JsonSecretValue<T> implements PromiseLike<T> {
  /**
   * Creates a new JsonSecretValue instance
   * 
   * @param secretName - The name of the secret for error messages
   * @param syncValue - The synchronously available value (or undefined)
   * @param asyncValue - Promise that resolves to the parsed JSON value
   */
  constructor(
    private readonly secretName: string,
    private readonly syncValue: T | undefined,
    private readonly asyncValue: Promise<T>
  ) {}

  /**
   * Allows using `await jsonSecretValue` by implementing the Promise-like interface
   * 
   * @example
   * const config = await secrets.CONFIG.json<AppConfig>();
   */
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | null
  ): Promise<TResult1 | TResult2> {
    return this.asyncValue.then(onfulfilled, onrejected);
  }

  /**
   * Marks the JSON value as required - validates that it exists
   * 
   * @throws Error if the JSON value is undefined
   * @returns This instance for chaining
   * 
   * @example
   * const config = await secrets.CONFIG.json<AppConfig>().required();
   */
  required(): JsonSecretValue<T> {
    if (this.syncValue === undefined) {
      ConsoleUtils.error(`Secret ${this.secretName} is required but not available.`)
      throw new Error("[dotsecrets]: Validation exception => JSON secret is required but not available.");
    }
    return new JsonSecretValue(this.secretName, this.syncValue, this.asyncValue);
  }

  /**
   * Provides synchronous access to the parsed JSON value
   * 
   * Used when the JSON value is accessed directly without await.
   * Requires that the secret has been preloaded or is a PUBLIC_ key.
   * 
   * @throws Error if the secret is accessed synchronously without preloading
   * @returns The parsed JSON value of type T
   * 
   * @example
   * // After preloading
   * await preloadAllSecrets();
   * const config = secrets.APP_CONFIG.json<AppConfig>();
   * initializeApp(config);
   */
  valueOf(): T {
    if (this.syncValue === undefined) {
      const errorMsg = `Secret "${this.secretName}" of type JSON accessed synchronously without preload. You must either run await preloadAllSecrets() first or use await secrets.${this.secretName}`;
      ConsoleUtils.error(errorMsg);
      throw new Error(`[dotsecrets]: Validation exception => ${errorMsg}`);
    }
    return this.syncValue;
  }

  /**
   * Converts the JSON value to a JSON string representation
   * 
   * @returns A JSON string representation of the value
   * @throws Error if accessed synchronously without preload
   */
  toString(): string {
    return JSON.stringify(this.valueOf());
  }

  /**
   * Enables automatic conversion to string in type coercion contexts
   * 
   * @returns A JSON string representation of the value
   * @throws Error if accessed synchronously without preload
   */
  [Symbol.toPrimitive](): string {
    return this.toString();
  }

  /**
   * Controls how the value appears in Node.js console output
   * 
   * @returns A JSON string representation for inspection
   * @throws Error if accessed synchronously without preload
   */
  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return this.toString();
  }
}

/**
 * The secrets proxy - the main interface for accessing secrets
 * 
 * This proxy provides a flexible way to access secrets:
 * - PUBLIC_* keys are always available synchronously
 * - Other keys require preloading for synchronous access or can be accessed asynchronously
 * - All secrets can be chained with validation and transformation methods
 * 
 * @example
 * // Synchronous usage (requires preload)
 * import { preloadAllSecrets, secrets } from 'dotsecrets';
 * 
 * await preloadAllSecrets();
 * const apiKey = secrets.API_KEY;
 * 
 * @example
 * // Asynchronous usage (recommended)
 * const apiKey = await secrets.API_KEY;
 * 
 * @example
 * // Using validations
 * const port = await secrets.PORT.number().between(1000, 9999);
 * 
 * @example
 * // Public values (always available synchronously)
 * const appName = secrets.PUBLIC_APP_NAME;
 */
export const secrets: Record<string, SecretValue> = new Proxy({}, {
  get: (_target, prop: string | symbol) => {
    if (typeof prop === "symbol") return undefined;
    const key = String(prop);

    // PUBLIC keys => always available as string. If you want them chainable,
    // wrap them in SecretValue just like private keys.
    if (key.startsWith("PUBLIC_")) {
      ConsoleUtils.debug(`Accessing public key: ${key}`);
      const publicVal = secretsCache.getPublicSync(key) ?? "";
      
      // Return chainable object for PUBLIC keys
      return new SecretValue(
        key,
        publicVal,               // syncValue
        Promise.resolve(publicVal) // asyncValue
      );
    }

    ConsoleUtils.debug(`Accessing secret key: ${key}`);

    // Decide syncValue vs. asyncValue
    let syncValue: string | undefined;
    let asyncValue: Promise<string>;

    // 1) If the secret is in cache, we can do sync usage
    const cached = secretsCache.getSecretSync(key);
    if (cached !== undefined) {
      ConsoleUtils.debug(`Secret ${key} found in cache`);
      syncValue = cached;
      asyncValue = Promise.resolve(cached);
    }
    // 2) If preload was executed but the key isn't in cache, return empty
    else if (preloadExecuted) {
      ConsoleUtils.debug(`Secret ${key} not found after preload, returning ""`);
      syncValue = "";
      asyncValue = Promise.resolve("");
    }
    // 3) If not in cache and preload not executed, we only have an async path
    else {
      ConsoleUtils.debug(`Secret ${key} must be loaded asynchronously`);
      // No syncValue
      syncValue = undefined;
      asyncValue = secretsCache.loadSecret(key).then(val => val ?? "");
    }

    // Return a chainable SecretValue
    return new SecretValue(key, syncValue, asyncValue);
  }
});