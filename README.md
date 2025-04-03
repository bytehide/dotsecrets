# DotSecrets

Beyond environment variables: a complete secrets ecosystem for local development and cloud production.

[![npm version](https://img.shields.io/npm/v/dotsecrets.svg)](https://www.npmjs.com/package/dotsecrets)
[![License](https://img.shields.io/npm/l/dotsecrets.svg)](https://github.com/bytehide/dotsecrets/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](https://www.typescriptlang.org/)

**The next generation of environment variables management.** DotSecrets takes everything you love about dotenv and supercharges it for modern applications. Use local files during development and seamlessly connect to any secrets provider in production – all with zero code changes.

**DotSecrets = dotenv + external providers + validation + type safety + encryption + IDE autocompletion**

![DotSecrets Schema](./docs/images/dotsecrets%20schema.png)

## Key Features

✨ **Drop-in dotenv replacement with superpowers** • 🚀 **Local to cloud with zero code changes** • 🛡️ **Prevent app crashes from missing secrets** • 🔄 **Auto-convert strings to numbers, booleans, JSON** • 💡 **Never mistype a secret name again** • 🔌 **AWS, Azure, ByteHide, HashiCorp — one command** • 🔒 **Push secrets securely to production**

## 📋 Table of Contents

- [1. 🌱 Install](#1--install)
- [2. 🚀 Getting Started](#2--getting-started)
- [3. 🔄 Migrating from dotenv](#3--migrating-from-dotenv)
- [4. 🏗️ Core Features](#4-️-core-features)
  - [Multiple ENV Files](#multiple-env-files)
  - [Environment-Specific Files](#environment-specific-files)
  - [Push Secrets to Production](#push-secrets-to-production)
  - [Asynchronous-First Approach](#asynchronous-first-approach)
  - [Powerful Validation \& Type Conversion](#powerful-validation--type-conversion)
  - [External Secrets Providers](#external-secrets-providers)
    - [Zero-code production configuration](#zero-code-production-configuration)
  - [Variable Expansion](#variable-expansion)
  - [Public Secrets](#public-secrets)
  - [Auto-reloading \& File Watching](#auto-reloading--file-watching)
  - [IDE Autocompletion](#ide-autocompletion)
  - [Encryption Support](#encryption-support)
- [5. 🔌 Secrets Providers](#5--secrets-providers)
  - [Provider Configuration](#provider-configuration)
    - [Environment Variables (Default)](#environment-variables-default)
    - [ByteHide Secrets](#bytehide-secrets)
    - [AWS Secrets Manager](#aws-secrets-manager)
    - [Azure Key Vault](#azure-key-vault)
    - [Google Cloud Secret Manager](#google-cloud-secret-manager)
    - [HashiCorp Vault](#hashicorp-vault)
    - [IBM Cloud Secrets Manager](#ibm-cloud-secrets-manager)
    - [1Password](#1password)
    - [Keeper Secrets Manager](#keeper-secrets-manager)
    - [Doppler](#doppler)
- [6. 🛠️ Common Usage Patterns](#6-️-common-usage-patterns)
- [7. ⚙️ Configuration](#7-️-configuration)
- [8. 🛠️ CLI Tools](#8-️-cli-tools)
- [9. 🔬 Advanced Usage](#9--advanced-usage)
- [10. ❓ FAQ \& Troubleshooting](#10--faq--troubleshooting)
- [11. 📚 API Reference](#11--api-reference)
- [12. 💪 Contributing & Community](#12--contributing--community)

## 1. 🌱 Install

```bash
# npm
npm install dotsecrets

# yarn
yarn add dotsecrets

# pnpm
pnpm add dotsecrets
```

## 2. 🚀 Getting Started

DotSecrets is designed to be **plug-and-play**. Unlike other libraries, it requires no manual initialization in your code. Simply install it and start using it right away.

### Just import and use

```javascript
// Just import the secrets object and start using it
import { secrets } from 'dotsecrets';

// RECOMMENDED: Always use the async pattern with await
async function getApiClient() {
  const endpoint = await secrets.API_ENDPOINT;
  const key = await secrets.API_KEY.required();
  
  return new ApiClient(endpoint, key);
}
```

### Create configuration files (optional)

If you don't have `.env` or `.secrets` files yet, you can easily set them up:

```bash
# Creates .env, .secrets, and adds them to .gitignore
npx dotsecrets setup
```

### No manual initialization needed

DotSecrets automatically loads your environment variables and secrets on import. You don't need to call any initialization functions like with dotenv:

```javascript
// ❌ NOT needed with DotSecrets
// import dotenv from 'dotenv';
// dotenv.config();

// ✅ Just import and use
import { secrets } from 'dotsecrets';
```

### The async-first approach

Always use the asynchronous pattern with `await` for the most reliable access to your secrets:

```javascript
// ✅ Recommended: Async pattern
const apiKey = await secrets.API_KEY;
const isDebug = await secrets.DEBUG_MODE.boolean();
const serverPort = await secrets.PORT.number().min(1000);

// ❌ Avoid using the synchronous pattern unless absolutely necessary
// const apiKey = secrets.API_KEY; // Not recommended without preloadAllSecrets()
```

### For legacy code (optional)

Only in cases where async/await cannot be used, you can preload secrets at application startup:

```javascript
import { preloadAllSecrets, secrets } from 'dotsecrets';

// At application startup:
await preloadAllSecrets();

// Then in synchronous code:
function getLegacyConfig() {
  return secrets.API_KEY; // Works after preloading
}
```

## 3. 🔄 Migrating from dotenv

Already using dotenv? DotSecrets makes it easy to upgrade to a more powerful secrets management solution while maintaining compatibility.

### Automatic migration

You can quickly migrate from dotenv to DotSecrets using the migrate command:

```bash
npx dotsecrets migrate
```

This command:
- Handles your existing `.env` files
- Sets up DotSecrets configuration
- Adds appropriate entries to `.gitignore`
- Generates TypeScript definitions for IDE autocompletion

### Full compatibility with process.env

DotSecrets maintains full compatibility with `process.env`, so your existing code will continue to work:

```javascript
// This still works - no changes needed for existing code
const apiUrl = process.env.API_URL;
```

All variables from `.env`, `.secrets`, and `.public` files are automatically loaded into `process.env`, just like with dotenv.

### Benefits of switching to secrets.KEY pattern

While DotSecrets maintains compatibility with `process.env`, you gain significant advantages by migrating to the `secrets.KEY` pattern:

| Feature | process.env.KEY | secrets.KEY |
|---------|-----------------|-------------|
| Type safety | ❌ Always string or undefined | ✅ Type conversion (number, boolean, JSON) |
| Validation | ❌ Manual validation required | ✅ Built-in validation chains |
| Error handling | ❌ Silent undefined errors | ✅ Clear error messages |
| Asynchronous loading | 🫠 Don't apply | ✅ Async providers supported |
| Default values | ❌ Manual defaulting | ✅ Built-in `.default()` method |
| IDE autocompletion | ❌ No key suggestions | ✅ Full autocompletion support |
| Production-ready | ❌ Local-only solution | ✅ Seamless transition to cloud providers |
| Provider switching | ❌ Code changes required | ✅ Zero code changes when switching providers |
| Frontend access | ❌ Not available in browser | ✅ `secrets.PUBLIC_*` works in frontend code |

#### Production-ready secret management

Using `secrets.KEY` makes your application immediately ready for production environments:

```javascript
// Your code stays EXACTLY THE SAME when moving from development to production
async function getApiClient() {
  const apiKey = await secrets.API_KEY.required();
  // ...
}
```

You can start with local `.env` files during development, then seamlessly switch to AWS Secrets Manager, Azure Key Vault, ByteHide Secrets, Google Cloud Secret Manager, or any other provider in production - **without changing a single line of application code**. DotSecrets handles the provider configuration separately from your business logic.

#### Seamless provider switching

With process.env:

```javascript
// Hard-coded to use environment variables
const apiKey = process.env.API_KEY;
// Must rewrite code to use a different provider
```

With DotSecrets:

```javascript
// Works with ANY provider - local files, ByteHide, Azure, AWS, Google Cloud, etc.
const apiKey = await secrets.API_KEY;
```

Simply configure your preferred provider with `npx dotsecrets setup` and your application will automatically retrieve secrets from the right source, regardless of environment.

### Migration example

Before (with dotenv):

```javascript
// Manual validation, type conversion, and error handling
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
if (isNaN(port) || port < 1000 || port > 9999) {
  throw new Error('PORT must be a number between 1000 and 9999');
}

const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error('API_KEY is required');
}
```

After (with DotSecrets):

```javascript
// Built-in validation, type conversion, and error handling
const port = await secrets.PORT.number().between(1000, 9999).default(3000);
const apiKey = await secrets.API_KEY.required();
```

## 4. 🏗️ Core Features

### Multiple ENV Files

![DotSecrets Workflow Schema](./docs/images/dotsecrets%20files%20schema.png)

DotSecrets manages different types of configuration files:

| File | Purpose | In Git? | Example Values |
|------|---------|---------|---------------|
| `.secrets` | Sensitive information | ❌ No | Passwords, API keys, tokens |
| `.env` | Development variables | ❌ No | Local hostnames, debug flags |
| `.public` | Non-sensitive config | ✅ Yes | Public URLs, feature flags (with `PUBLIC_` prefix) |

> ⚠️ **Note**: Using `.secrets` is optional - you can continue using `.env` files like with dotenv. However, the separate files provide better organization: `.secrets` clearly indicates sensitive information, `.env` can contain mixed values, and `.public` explicitly marks values safe for version control. This naming convention helps prevent accidental exposure of sensitive data.

### Environment-Specific Files

Automatically load environment-specific configurations:

```bash
.secrets         # Base secrets for all environments
.secrets.staging # Overrides for staging environment
.secrets.production # Overrides for production
```

> The same with .env and .public files

Set your environment with `NODE_ENV` or explicitly in configuration.

### Push Secrets to Production

DotSecrets makes it easy to sync your local secrets to production environments without ever exposing them in version control:

```bash
npx dotsecrets push
```

This interactive command:

1. Scans for all available `.secrets` and `.env` files
2. Lets you select which file to push from
3. Allows you to exclude specific secrets from being pushed
4. Guides you through selecting a destination provider (AWS, Azure, ByteHide, etc.)
5. Securely uploads your secrets to the selected provider

This seamless workflow ensures your development and production environments stay in sync while maintaining the highest security standards - your secrets never need to pass through git or any other intermediary.

### Asynchronous-First Approach

DotSecrets is designed with modern JavaScript in mind:

```javascript
// RECOMMENDED: Clean async access pattern
async function initializeApi() {
  const endpoint = await secrets.API_ENDPOINT;
  const key = await secrets.API_KEY.required();
  const timeout = await secrets.TIMEOUT.number().default(5000);
  
  return new ApiClient(endpoint, key, { timeout });
}

// Only for legacy code: Synchronous access pattern
// Requires preloading secrets at application startup
if (needsSynchronousAccess) {
  await preloadAllSecrets();
  const apiKey = secrets.API_KEY; // Only works after preload
}
```

### Powerful Validation & Type Conversion

Ensure your secrets meet your requirements:

```javascript
// Convert to number with range validation
const port = await secrets.PORT.number().between(1000, 9999);

// Required values
const apiKey = await secrets.API_KEY.required();

// String validation
const email = await secrets.EMAIL.trim().regex(/^[\w.-]+@[\w.-]+\.\w+$/);

// Boolean conversion with validation
const enabled = await secrets.FEATURE_FLAG.boolean().true();

// JSON parsing with type safety
const config = await secrets.CONFIG.json();
```

### External Secrets Providers

Connect to external providers with simple configuration:

- Environment variables (built-in)
- ByteHide Secrets
- AWS Secrets Manager
- Azure Key Vault
- Google Cloud Secret Manager
- HashiCorp Vault
- 1Password
- And more...

#### Zero-code production configuration

In production environments, you can automatically load secrets from external providers without changing your code. Simply set environment variables to configure the provider:

```bash
# Example: Use IBM Cloud Secrets Manager in production
DOTSECRETS_PLUGIN=ibm
IBM_CLOUD_API_KEY=your-api-key
IBM_SECRETS_MANAGER_URL=your-instance-url

# Example: Use AWS Secrets Manager
DOTSECRETS_PLUGIN=aws
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Example: Use ByteHide Secrets
DOTSECRETS_PLUGIN=bytehide
BYTEHIDE_SECRETS_TOKEN=your-token
```

Your application will automatically load secrets from the configured provider in production while continuing to use local `.env` and `.secrets` files in development – all without changing a single line of code.

> [🔗 See all available providers and their configuration options](#7-secrets-providers)
>
### Variable Expansion

DotSecrets supports referencing other variables within your configuration:

```bash
# Variable references are automatically expanded
PASSWORD=super-secret-password
DATABASE_URL=postgresql://user:${PASSWORD}@localhost:5432/mydb

# Works across different files too
API_VERSION=v1
PUBLIC_API_ENDPOINT=https://api.example.com/${API_VERSION}
```

Enable variable expansion with:

```javascript
config({ expand: true });
```

Or just set `DOTSECRETS_EXPAND=true` in your environment.

### Public Secrets

Values prefixed with `PUBLIC_` are considered non-sensitive and can be safely exposed to frontend code:

```bash
# .public file (can be committed to git)
PUBLIC_API_VERSION=v2
PUBLIC_FEATURE_FLAGS={"darkMode":true,"beta":false}
```

Public secrets:

- Can be stored in the `.public` file (safe to commit to git)
- Are always loaded locally, never from external providers
- Can be accessed synchronously without await (even without preload)

```javascript
// Access public values without await
const apiVersion = secrets.PUBLIC_API_VERSION;
const features = secrets.PUBLIC_FEATURE_FLAGS.json();

// In frontend code
console.log("Using API version:", secrets.PUBLIC_API_VERSION);
```

### Auto-reloading & File Watching

Automatically detect changes to configuration files in development:

```javascript
// Enable file watching
config({ watch: true });
```

When changes are detected, secrets are reloaded and optional update scripts are executed.

### IDE Autocompletion

Generate TypeScript definitions for your secrets:

```bash
# Generate type definitions for IDE autocompletion
npx dotsecrets sync-ide
```

Get full IntelliSense support for available secrets and chainable methods.

### Encryption Support

DotSecrets includes support for encrypting `.secrets` files:

```javascript
// Load with encryption key
config({ encryptionKey: process.env.DOTSECRETS_ENCRYPTION_KEY });
```

> **Note**: While encryption is available, we recommend using dedicated secrets management providers rather than storing encrypted secrets in version control. The `push` command provides a more secure way to synchronize secrets between environments without exposing them, even in encrypted form.
>
> For production environments, consider services like AWS Secrets Manager, Azure Key Vault, ByteHide Secrets, or HashiCorp Vault, which offer additional security features such as access auditing, rotation policies, and fine-grained permissions.

## 5. 🔌 Secrets Providers

DotSecrets supports multiple secrets providers, allowing you to store your secrets in different systems while maintaining a consistent access pattern in your code.

> ⚠️ **Important Warning**: Local variables in `.env` or `.secrets` files always take precedence over external providers. If you want to retrieve a secret like `API_KEY` from AWS Secrets Manager (or any other provider), make sure you do not define that same variable in your local `.env` or `.secrets` files, and do not deploy these files to production servers. If the variable exists locally, it will override the one from your configured provider, which can lead to unexpected behavior in production environments.

### Available Providers

| Provider | Plugin ID | Type | Support |
|----------|-----------|------|---------|
| Environment Variables | `env` | Local | ✅ |
| ByteHide Secrets | `bytehide` | Cloud | ✅ |
| AWS Secrets Manager | `aws` | Cloud | ✅ |
| Azure Key Vault | `azure` | Cloud | ✅ |
| Google Cloud Secret Manager | `gcp` | Cloud | ✅ |
| HashiCorp Vault | `hashicorp` | Self-hosted/Cloud | ✅ |
| IBM Cloud Secrets Manager | `ibm` | Cloud | ✅ |
| 1Password | `onepassword` | Cloud | ✅ |
| Keeper Secrets Manager | `keeper` | Cloud | ✅ |
| Doppler | `doppler` | Cloud | ✅ |
| CyberArk Conjur | `cyberark` | Self-hosted/Cloud | Coming soon |
| Akeyless Vault | `akeyless` | Cloud | Coming soon |

> 🔌 **Looking for a different provider?** We're constantly expanding our support for secrets management systems. Open an issue in our [GitHub repository](https://github.com/bytehide/dotsecrets) describing the provider you need, or submit a pull request implementing a new provider by following our [contribution guidelines](./CONTRIBUTING.md).

### Provider Configuration

Each provider has specific configuration requirements. The easiest way to configure a provider is using the setup command:

```bash
npx dotsecrets setup
```

Alternatively, you can configure providers manually by setting the appropriate environment variables:

#### Environment Variables (Default)

No configuration needed - works out of the box.

#### ByteHide Secrets

```bash
DOTSECRETS_PLUGIN=bytehide
BYTEHIDE_SECRETS_TOKEN=your-token
BYTEHIDE_SECRETS_ENVIRONMENT=production
```

#### AWS Secrets Manager

```bash
DOTSECRETS_PLUGIN=aws
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

#### Azure Key Vault

```bash
DOTSECRETS_PLUGIN=azure
AZURE_KEYVAULT_URI=https://your-vault.vault.azure.net
AZURE_CLIENT_ID=your-client-id
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_SECRET=your-client-secret
```

#### Google Cloud Secret Manager

```bash
DOTSECRETS_PLUGIN=gcp
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
# Or use credential object directly
GOOGLE_CREDENTIALS={"type":"service_account",...}
```

#### HashiCorp Vault

Self-hosted option:

```bash
DOTSECRETS_PLUGIN=hashicorp
VAULT_ADDR=https://your-vault-instance:8200
VAULT_TOKEN=your-vault-token
```

HCP Cloud option:

```bash
DOTSECRETS_PLUGIN=hashicorp
HCP_CLIENT_ID=your-client-id
HCP_CLIENT_SECRET=your-client-secret
HCP_ORG_ID=your-org-id
HCP_PROJECT_ID=your-project-id
HCP_APP_NAME=your-app-name
```

#### IBM Cloud Secrets Manager

```bash
DOTSECRETS_PLUGIN=ibm
IBM_CLOUD_API_KEY=your-api-key
IBM_SECRETS_MANAGER_URL=your-instance-url
```

#### 1Password

```bash
DOTSECRETS_PLUGIN=onepassword
OP_CONNECT_HOST=your-connect-server-url
OP_CONNECT_TOKEN=your-connect-token
OP_VAULT=your-vault-name
```

#### Keeper Secrets Manager

```bash
DOTSECRETS_PLUGIN=keeper
KEEPER_CONFIG_FILE=/path/to/your/config.json
KEEPER_FOLDER_UID=your-folder-uid
```

#### Doppler

```bash
DOTSECRETS_PLUGIN=doppler
DOPPLER_TOKEN=your-doppler-token
DOPPLER_PROJECT=your-project-name
DOPPLER_CONFIG=your-config-name
```

### Provider Selection Logic

DotSecrets determines which provider to use in the following order:

1. `DOTSECRETS_PLUGIN` environment variable
2. Configuration in `dotsecrets.config.json`
3. Defaults to environment variables if no provider is specified

### Performance Optimization

DotSecrets includes built-in performance optimizations for production environments:

- **Automatic caching**: Secrets retrieved from external providers are automatically cached in memory to minimize API calls.
- **Batch loading**: When possible, DotSecrets retrieves multiple secrets in a single network request.
- **Parallel requests**: For providers that don't support batch loading, DotSecrets uses concurrent requests with rate limiting.

This ensures high performance in production environments while maintaining minimal network overhead, even when accessing dozens or hundreds of secrets.

### Development vs. Production Workflow

Typical workflow between environments:

```javascript
// Development: Uses local .env and .secrets files
// No special configuration needed

// Production: Set the provider via environment variables
// DOTSECRETS_PLUGIN=bytehide
// BYTEHIDE_SECRETS_TOKEN=your-bytehide-token

// Your code stays EXACTLY THE SAME
async function getDatabase() {
  // Works with ANY provider
  const connectionString = await secrets.DATABASE_URL.required();
  return createConnection(connectionString);
}
```

## 6. 🛠️ Common Usage Patterns

DotSecrets provides numerous validation and transformation methods to ensure your secrets meet your requirements.

### Basic Validation

```javascript
// Ensure a secret exists
const apiKey = await secrets.API_KEY.required();

// Check that a secret is not empty
const username = await secrets.USERNAME.notEmpty();

// Trim whitespace
const email = await secrets.EMAIL.trim();

// String length validation
const password = await secrets.PASSWORD.lengthBetween(8, 100);
```

### Type Conversion

```javascript
// Convert to number
const port = await secrets.PORT.number();

// Convert to boolean (true for: "true", "yes", "1", "on")
const debugMode = await secrets.DEBUG_MODE.boolean();

// Parse JSON with type safety
const config = await secrets.CONFIG.json();
const serverSettings = await secrets.SETTINGS.json();
```

### Default Values

When a secret might not exist, you can provide defaults:

```javascript
// Use default if secret doesn't exist
const timeout = await secrets.TIMEOUT.default("5000");

// With type conversion
const maxRetries = await secrets.MAX_RETRIES.number().default(3);
const isFeatureEnabled = await secrets.FEATURE_ENABLED.boolean().default(false);
```

### Complex Validation Chains

Chain multiple validations together for complex requirements:

```javascript
// Number validation chain
const serverPort = await secrets.PORT
  .number()        // Convert to number
  .required()      // Must exist
  .min(1024)       // Must be >= 1024
  .max(65535);     // Must be <= 65535

// String validation chain
const emailAddress = await secrets.EMAIL
  .trim()                              // Remove whitespace
  .required()                          // Must exist
  .regex(/^[\w.-]+@[\w.-]+\.\w+$/);   // Must match pattern

// Boolean with validation
const featureFlag = await secrets.FEATURE_FLAG
  .boolean()      // Convert to boolean
  .required()     // Must exist
  .true();        // Must be true
```

### Transformations

Apply transformations to secret values:

```javascript
// Case transformations
const countryCode = await secrets.COUNTRY_CODE.toUpperCase();
const username = await secrets.USERNAME.toLowerCase();

// JSON transformation with validation
const config = await secrets.CONFIG
  .json()
  .required();
```

### Error Handling

Handle validation errors gracefully:

```javascript
try {
  const apiKey = await secrets.API_KEY.required();
  // Use apiKey...
} catch (error) {
  // Handle specific validation error
  console.error("API key missing:", error.message);
  // Fallback or exit gracefully
}
```

### Using in Express.js Middleware

Create middleware to ensure required secrets exist:

```javascript
function requireSecrets(...secretKeys) {
  return async (req, res, next) => {
    try {
      for (const key of secretKeys) {
        // This will throw if any secret is missing
        await secrets[key].required();
      }
      next();
    } catch (error) {
      res.status(500).json({
        error: `Missing required secret: ${error.message}`
      });
    }
  };
}

// Use middleware on routes that need specific secrets
app.get('/api/data', 
  requireSecrets('API_KEY', 'DATABASE_URL'), 
  (req, res) => {
    // All required secrets exist
    // Your route handler...
  }
);
```

## 7. ⚙️ Configuration

DotSecrets is designed to work with zero configuration, but offers extensive customization options when needed.

### Configuration File (Recommended)

The recommended way to configure DotSecrets is through a JSON configuration file. Create a file named `dotsecrets.config.json` in your project root:

```json
{
  "path": ".secrets",
  "envPath": ".env",
  "environment": "development",
  "watch": true,
  "expand": true,
  "debug": false,
  "override": false
}
```

DotSecrets will automatically discover and load this file. Alternatively, you can place it in:

- `.dotsecrets.config.json`
- `config/dotsecrets.config.json`

### Configuration Priority

DotSecrets loads configuration from multiple sources, with the following priority (highest to lowest):

1. Explicit parameters in code: `config({ watch: true })`
2. Environment variables: `DOTSECRETS_WATCH=true`
3. Configuration file: `dotsecrets.config.json`
4. Default values

### Available Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `path` | string | `.secrets` | Path to the secrets file |
| `envPath` | string | `.env` | Path to the environment file |
| `environment` | string | `process.env.NODE_ENV` | Environment name for loading specific files |
| `encoding` | string | `utf8` | File encoding for reading config files |
| `watch` | boolean | `true` in development | Watch files for changes and reload |
| `debug` | boolean | `false` | Enable debug logging |
| `override` | boolean | `false` | Override existing environment variables |
| `expand` | boolean | `false` | Expand variable references like `${VAR}` |
| `encryptionKey` | string | `process.env.DOTSECRETS_ENCRYPTION_KEY` | Key for decrypting encrypted secrets |
| `autoInit` | boolean | `true` | Automatically initialize on import |
| `skipAutoConfig` | boolean | `false` | Skip automatic configuration |

### Environment Variables

All options can also be set using environment variables:

```bash
# Configuration via environment variables
DOTSECRETS_PATH=./config/.secrets
DOTSECRETS_ENV_PATH=./config/.env
DOTSECRETS_ENVIRONMENT=staging
DOTSECRETS_WATCH=true
DOTSECRETS_DEBUG=true
DOTSECRETS_OVERRIDE=false
DOTSECRETS_EXPAND=true
DOTSECRETS_ENCRYPTION_KEY=your-encryption-key
DOTSECRETS_AUTO_INIT=true
DOTSECRETS_SKIP_AUTO_CONFIG=false
DOTSECRETS_PLUGIN=aws
```

### Programmatic Configuration

For advanced use cases, you can configure DotSecrets programmatically:

```javascript
import { config } from 'dotsecrets';

// Override configuration programmatically
const loadedSecrets = config({
  path: './config/secrets/.secrets',
  environment: 'staging',
  watch: true,
  expand: true,
  debug: process.env.DEBUG === 'true'
});

console.log(`Loaded ${Object.keys(loadedSecrets).length} secrets`);
```

### File Watching and Reload Hooks

DotSecrets can automatically reload secrets when configuration files change and execute custom scripts:

```javascript
// Enable file watching (default in development)
config({ watch: true });
```

When a watched file changes, DotSecrets will:

1. Reload all secrets automatically
2. Execute reload hooks in the following order:

#### Custom Reload Hooks

Define a script in your `package.json`:

```json
{
  "scripts": {
    "onSecretsUpdate": "node scripts/reload-app.js"
  }
}
```

Or create a standalone script file in your project root:

- `dotSecretsUpdate.js` 
- `dotSecretsUpdate.ts`

These scripts will be executed whenever your secrets change, allowing you to:

- Restart server components
- Clear caches
- Notify systems of configuration changes
- Update connected clients

### Custom Configuration Example

Here's a complete example with custom configuration:

```javascript
// In your application entry point
import { config } from 'dotsecrets';

// Load configuration with custom settings
config({
  // Custom file paths
  path: './config/secrets/.secrets',
  envPath: './config/env/.env',
  
  // Use production environment explicitly
  environment: 'production',
  
  // Enable variable expansion
  expand: true,
  
  // Enable file watching in development
  watch: process.env.NODE_ENV !== 'production',
  
  // Enable debugging in development
  debug: process.env.NODE_ENV !== 'production',
  
  // Use encryption key from environment
  encryptionKey: process.env.SECRET_KEY
});
```

For most applications, the zero-configuration approach is sufficient, with DotSecrets automatically loading configuration from files and environment variables.

## 8. 🛠️ CLI Tools

DotSecrets includes several command-line tools to simplify setup, migration, and integration with your development environment.

### Setup Command

The `setup` command helps you initialize and configure DotSecrets in your project:

```bash
npx dotsecrets setup
```

This interactive wizard:

1. Creates necessary configuration files (`.secrets`, `.env`, `.public`) if they don't exist
2. Updates your `.gitignore` to exclude sensitive files
3. Guides you through configuring a secrets provider (ByteHide, AWS, Azure, etc.)
4. Sets up required environment variables for your chosen provider

Options:

- `--path <folder>` - Specify a folder path (default: current directory)

### Push Command

The `push` command enables you to securely transfer your local secrets to any supported production provider:

```bash
npx dotsecrets push
```

This interactive tool:

1. Scans your project for `.secrets` and `.env` files
2. Allows you to select which file contains the secrets to push
3. Lets you choose specific secrets to include or exclude
4. Presents a list of available secrets providers (AWS, Azure, ByteHide, etc.)
5. Securely uploads your selected secrets to the chosen provider

This command provides a secure bridge between development and production environments without ever exposing secrets in version control, making it easy to maintain consistent configurations across all environments.

Options:

- `--path <folder>` - Specify a folder path to scan (default: current directory)

### Migrate Command

The `migrate` command helps you transition from dotenv to DotSecrets:

```bash
npx dotsecrets migrate
```

This comprehensive migration tool:

1. Scans for existing `.env` files and converts them to `.secrets` equivalents
2. Transforms `process.env.X` references in your code to `secrets.X`
3. Removes dotenv configuration code from your project
4. Optionally uninstalls the dotenv package

Options:

- `--path <folder>` - Specify a folder path to scan (default: current directory)

### Sync IDE Command

The `sync-ide` command generates TypeScript definitions for IDE autocompletion:

```bash
npx dotsecrets sync-ide
```

This tool:

1. Scans your project for all available secrets
2. Generates TypeScript definition files for enhanced IDE experience
3. Creates complete type definitions for the `secrets` object and all validation methods
4. Supports both TypeScript and JavaScript files with JSDoc annotations

Options:

- `--outDir <dir>` - Directory to output type definitions (default: "types")
- `--fileName <name>` - Name of the generated definition file (default: "dotsecrets.d.ts")
- `--verbose` - Show verbose output during generation

## 9. 🔬 Advanced Usage

### Creating Custom Providers

The recommended way to add support for a new secrets provider is to contribute directly to the DotSecrets project by submitting a Pull Request. Please refer to our [CONTRIBUTING.md](./CONTRIBUTING.md) guide for detailed instructions on implementing a new provider.

For a quick overview, here's how to create a custom provider:

```typescript
import { BaseSecretsPlugin, ISecretsPlugin } from 'dotsecrets/plugins';

export class MyCustomProvider extends BaseSecretsPlugin implements ISecretsPlugin {
  pluginName = "My Custom Provider";
  
  async getSecret(secretKey: string): Promise<string | undefined> {
    // Your implementation
    const parsedKey = this.parseSecretName(secretKey);
    return await yourSecretsFetcher(parsedKey);
  }
  
  // Implement other required methods
}

// Register your provider
import { autoInitSecretsPlugin } from 'dotsecrets';
autoInitSecretsPlugin({ plugin: new MyCustomProvider(), priority: 10 });
```

See the [CONTRIBUTING.md](./CONTRIBUTING.md) file for the complete guide on implementing providers, including best practices, testing requirements, and documentation.

### Custom Validators

You can extend the validation capabilities with your own custom validators by extending the `SecretValue` class:

```typescript
import { SecretValue } from 'dotsecrets';

// Extend the SecretValue prototype to add custom validators
declare module 'dotsecrets' {
  interface SecretValue {
    // Add declaration for your custom method
    isValidEmail(): SecretValue;
  }
}

// Add custom validator implementation
SecretValue.prototype.isValidEmail = function(this: SecretValue): SecretValue {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return this.regex(emailRegex, "Invalid email format");
};

// Now you can use your custom validator
const email = await secrets.USER_EMAIL.isValidEmail();
```

### Integration with Frameworks

#### Express.js Middleware

Create middleware to ensure required secrets exist:

```javascript
import { secrets } from 'dotsecrets';

function requireSecrets(...secretKeys) {
  return async (req, res, next) => {
    try {
      for (const key of secretKeys) {
        // This will throw if any secret is missing
        await secrets[key].required();
      }
      next();
    } catch (error) {
      res.status(500).json({
        error: `Missing required secret: ${error.message}`
      });
    }
  };
}

// Use middleware on routes that need specific secrets
app.get('/api/data', 
  requireSecrets('API_KEY', 'DATABASE_URL'), 
  (req, res) => {
    // All required secrets exist
    // Your route handler...
  }
);
```

#### Next.js Integration

For Next.js applications, be careful to only initialize DotSecrets on the server side:

```javascript
// app/layout.js or pages/_app.js (server-side initialization)
import { preloadAllSecrets } from 'dotsecrets';

// Only initialize on the server, not in the browser
if (typeof window === 'undefined') {
  // This runs only on the server side
  preloadAllSecrets();
}

export default function RootLayout({ children }) {
  return <html lang="en">{children}</html>;
}
```

In your server components or API routes, you can use `await` directly:

```javascript
// Server component
import { secrets } from 'dotsecrets';

export default async function AdminPage() {
  const apiKey = await secrets.API_KEY.required();
  // Use the apiKey...
  return <div>Admin features</div>;
}
```

For client-side components, only use `PUBLIC_` prefixed secrets from the `.public` file:

```javascript
// Client component
'use client';
import { secrets } from 'dotsecrets';

export default function ClientComponent() {
  // Only PUBLIC_ values can be used on the client side
  const apiVersion = secrets.PUBLIC_API_VERSION;
  const featureFlags = secrets.PUBLIC_FEATURE_FLAGS.json();
  
  return <div>Using API v{apiVersion}</div>;
}
```

### Testing with DotSecrets

For testing environments, you can mock secrets or provide test-specific values:

#### Using Environment Files for Tests

Create a `.secrets.test` file with test-specific values:

```bash
# .secrets.test
DATABASE_URL=postgresql://test:test@localhost:5432/testdb
API_KEY=test-api-key
```

Then configure your test runner to set `NODE_ENV=test` to automatically load these files.

#### Mocking Secrets in Tests

For unit tests, you can mock the entire secrets module:

```javascript
// __mocks__/dotsecrets.js
const mockSecrets = {
  API_KEY: { 
    required: () => Promise.resolve('test-api-key'),
    valueOf: () => 'test-api-key',
    toString: () => 'test-api-key'
  },
  DATABASE_URL: {
    required: () => Promise.resolve('mock-db-url'),
    valueOf: () => 'mock-db-url',
    toString: () => 'mock-db-url'
  }
};

export const secrets = new Proxy({}, {
  get: (target, prop) => {
    if (mockSecrets[prop]) return mockSecrets[prop];
    return {
      required: () => Promise.resolve(`mock-${prop}`),
      valueOf: () => `mock-${prop}`,
      toString: () => `mock-${prop}`
    };
  }
});

export const preloadAllSecrets = async () => Promise.resolve(true);
```

Then in your Jest configuration:

```javascript
// jest.config.js
module.exports = {
  // ...
  moduleNameMapper: {
    '^dotsecrets$': '<rootDir>/__mocks__/dotsecrets.js',
  },
};
```

#### Integration Tests

For integration tests that need to access real configurations:

```javascript
import { config, preloadAllSecrets, secrets } from 'dotsecrets';

beforeAll(async () => {
  // Set up test-specific configuration
  config({
    path: '.secrets.test',
    environment: 'test',
    expand: true
  });
  
  // Preload secrets for synchronous access in tests
  await preloadAllSecrets();
});

test('database connection works', async () => {
  const dbUrl = await secrets.DATABASE_URL.required();
  // Test database connection with the URL
  expect(dbUrl).toContain('testdb');
});
```

By using these patterns, you can ensure your tests run with consistent, isolated configurations without affecting your development or production environments.

## 10. ❓ FAQ & Troubleshooting

### Common Issues

#### Secrets not loading in production

**Problem**: Secrets are available in development but not in production.

**Solution**:

- Verify your provider configuration is correct
- Check environment variables for the chosen provider
- Enable debug mode with `DOTSECRETS_DEBUG=true` to see detailed logs
- Confirm that the secret keys are correctly formatted for your provider

```javascript
// Enable debug mode to troubleshoot
config({ debug: true });
```

#### TypeError: secrets.X is not a function

**Problem**: Getting error when trying to access a secret.

**Solution**: This usually happens when using synchronous access without preloading.

```javascript
// ❌ Incorrect usage without preloading
const apiKey = secrets.API_KEY.required(); // TypeError

// ✅ Correct async usage
const apiKey = await secrets.API_KEY.required();

// ✅ Correct sync usage (after preloading)
await preloadAllSecrets();
const apiKey = secrets.API_KEY.required();
```

#### Validation errors not showing expected messages

**Problem**: Error messages from validation are unclear or not showing.

**Solution**: Wrap secret access in try/catch blocks to handle validation errors properly.

```javascript
try {
  const port = await secrets.PORT.number().between(1000, 65535);
} catch (error) {
  console.error('Validation failed:', error.message);
  // Provide fallback or exit gracefully
}
```

#### Secrets not updating after file changes

**Problem**: Changes to `.env` or `.secrets` files are not reflected in the application.

**Solution**: Make sure file watching is enabled and your reload hooks are working.

```javascript
// Enable file watching explicitly
config({ watch: true });

// Add a script in package.json
// "scripts": {
//   "onSecretsUpdate": "node ./scripts/reload-app.js"
// }
```

### Performance Considerations

#### Optimize secret loading

- **Secret Caching**: DotSecrets automatically caches secrets after their first retrieval. Once you've used `await secrets.SECRET_NAME` once, subsequent accesses to the same secret will use the cached value without making additional provider API calls.
- **Use preloading** for initial loading: `preloadAllSecrets()` is useful to load all secrets at startup, but remember that individual secrets are already cached after their first access.
- **Transformations are not cached**: Each call to transformers like `.number()` or `.boolean()` is executed again, so store the result rather than calling the transformation repeatedly.

```javascript
// Efficient pattern - secrets are automatically cached after first retrieval
const apiKey = await secrets.API_KEY; // First access fetches from provider
const sameApiKey = await secrets.API_KEY; // Uses cached value

// For transformed values, store the result
const port = await secrets.PORT.number(); // Store the transformed value
// Later use port directly instead of secrets.PORT.number() again
```

#### Reduce network overhead

- **Group related secrets** under a single key as JSON to minimize API calls
- **Consider local caching** for high-traffic applications

```javascript
// Instead of many individual secrets
// db_host, db_user, db_password, db_port, db_name

// Use a single JSON configuration
// DB_CONFIG={"host":"localhost","user":"admin","password":"secret","port":5432,"name":"mydb"}
const dbConfig = await secrets.DB_CONFIG.json();
```

#### Minimize validation chains

- **Create custom validators** for frequently used validation patterns
- **Use appropriate validators** based on your needs

```javascript
// Custom validator for common patterns
SecretValue.prototype.isValidPort = function() {
  return this.number().between(1024, 65535);
};

// Now use the custom validator
const port = await secrets.PORT.isValidPort();
```

### Security Best Practices

#### Protect sensitive files

- **Always** add `.secrets` and `.env` to your `.gitignore`
- Use the `.public` file for non-sensitive values
- Consider encrypting `.secrets` files for additional security

```bash
# Set encryption key
export DOTSECRETS_ENCRYPTION_KEY=your-secure-key
```

#### Limit access to secrets

- Use environment-specific files for different deployment environments
- Apply the principle of least privilege for cloud provider IAM roles
- Regularly rotate sensitive credentials

```
.secrets.development # Development-only secrets
.secrets.staging     # Staging-only secrets
.secrets.production  # Production-only secrets
```

#### Secure secret transmission

- Never log or display full secret values
- Use HTTPS/TLS for all API calls to secrets providers
- Consider using a VPC or private network for cloud provider APIs

```javascript
// ❌ Don't log full secrets
console.log(`Using API key: ${apiKey}`); // Security risk

// ✅ Log only references or masked values
console.log("API key loaded successfully"); // Safe
```

#### Audit and monitoring

- Enable audit logs for cloud provider secret access
- Monitor for unusual access patterns
- Implement alerting for suspicious activities

## 11. 📚 API Reference

### Key Functions and Classes

#### `secrets` object

The main entry point for accessing secrets, supporting both synchronous and asynchronous access patterns.

```javascript
import { secrets } from 'dotsecrets';

// Asynchronous access (recommended)
const apiKey = await secrets.API_KEY;

// Synchronous access (after preloading)
const port = secrets.PORT;
```

#### `config(options)`

Configures the library with the specified options and loads secrets from all sources.

```javascript
import { config } from 'dotsecrets';

// Configure with custom options
const loadedSecrets = config({
  path: '.custom-secrets',
  environment: 'staging',
  watch: true
});
```

Returns a `Record<string, string>` of loaded secrets.

#### `preloadAllSecrets()`

Preloads all secrets for synchronous access.

```javascript
import { preloadAllSecrets, secrets } from 'dotsecrets';

// At application startup
await preloadAllSecrets();

// Later in synchronous code
function getApiClient() {
  return new ApiClient(secrets.API_KEY);
}
```

Returns a `Promise<void>` that resolves when all secrets are preloaded.

#### `preloadSecrets(keys)`

Preloads specific secrets for synchronous access.

```javascript
import { preloadSecrets, secrets } from 'dotsecrets';

// Preload only specific secrets
await preloadSecrets(['API_KEY', 'DATABASE_URL']);

// Now use them synchronously
const apiClient = new ApiClient(secrets.API_KEY);
```

Returns a `Promise<void>` that resolves when the specified secrets are preloaded.

#### `autoInitSecretsPlugin(options)`

Registers a custom secrets plugin with the specified options.

```javascript
import { autoInitSecretsPlugin } from 'dotsecrets';
import { MyCustomProvider } from './MyCustomProvider';

// Register custom provider
autoInitSecretsPlugin({
  plugin: new MyCustomProvider(),
  priority: 10 // Higher number = higher priority
});
```

#### `SecretValue` class

A chainable wrapper for string secret values with validation and transformation methods.

```javascript
// String validation methods
await secrets.EMAIL.required();
await secrets.USERNAME.notEmpty();
await secrets.PASSWORD.lengthBetween(8, 20);
await secrets.API_KEY.regex(/^[a-z0-9]{32}$/);

// Transformations
await secrets.URL.trim();
await secrets.CODE.toLowerCase();
await secrets.COUNTRY.toUpperCase();

// Type conversions
await secrets.PORT.number();
await secrets.DEBUG.boolean();
await secrets.CONFIG.json();
```

#### `NumberSecretValue` class

Specialized validation for numeric values.

```javascript
// Number validation
await secrets.PORT.number().min(1024);
await secrets.TIMEOUT.number().max(30000);
await secrets.RETRY_COUNT.number().between(1, 5);
await secrets.USER_COUNT.number().positive();
await secrets.TEMPERATURE.number().negative();
await secrets.PAGE_SIZE.number().integer();
```

#### `BooleanSecretValue` class

Specialized validation for boolean values.

```javascript
// Boolean validation
await secrets.FEATURE_ENABLED.boolean().required();
await secrets.DEBUG_MODE.boolean().true();
await secrets.MAINTENANCE_MODE.boolean().false();
```

#### `JsonSecretValue` class

Specialized validation for JSON values.

```javascript
// JSON validation and access
const config = await secrets.SERVER_CONFIG.json();
const features = await secrets.FEATURE_FLAGS.json();
```

### Options Documentation

#### `DotSecretsOptions` interface

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `path` | string | `.secrets` | Path to the secrets file |
| `envPath` | string | `.env` | Path to the environment file |
| `environment` | string | `process.env.NODE_ENV` | Environment name for loading specific files |
| `encoding` | BufferEncoding | `utf8` | File encoding for reading config files |
| `watch` | boolean | `true` in development | Watch files for changes and reload |
| `debug` | boolean | `false` | Enable debug logging |
| `override` | boolean | `false` | Override existing environment variables |
| `expand` | boolean | `false` | Expand variable references like `${VAR}` |
| `encryptionKey` | string | `process.env.DOTSECRETS_ENCRYPTION_KEY` | Key for decrypting encrypted secrets |
| `autoInit` | boolean | `true` | Automatically initialize on import |
| `skipAutoConfig` | boolean | `false` | Skip automatic configuration |

#### `AutoInitOptions` interface

| Option | Type | Description |
|--------|------|-------------|
| `plugin` | `ISecretsPlugin` | The plugin instance to register |
| `priority` | number | Priority level for resolution (higher = higher priority) |
| `condition` | () => boolean | Optional function to determine if this plugin should be used |

#### All Environment Variables

| Variable | Description |
|----------|-------------|
| `DOTSECRETS_PATH` | Path to the secrets file |
| `DOTSECRETS_ENV_PATH` | Path to the environment file |
| `DOTSECRETS_ENVIRONMENT` | Environment name for loading specific files |
| `DOTSECRETS_ENCODING` | File encoding for reading config files |
| `DOTSECRETS_WATCH` | Watch files for changes and reload |
| `DOTSECRETS_DEBUG` | Enable debug logging |
| `DOTSECRETS_OVERRIDE` | Override existing environment variables |
| `DOTSECRETS_EXPAND` | Expand variable references like `${VAR}` |
| `DOTSECRETS_ENCRYPTION_KEY` | Key for decrypting encrypted secrets |
| `DOTSECRETS_AUTO_INIT` | Automatically initialize on import |
| `DOTSECRETS_SKIP_AUTO_CONFIG` | Skip automatic configuration |
| `DOTSECRETS_PLUGIN` | ID of the plugin to use for loading secrets |

## 12. 💪 Contributing & Community

We believe that great tools are built together. DotSecrets is an open-source project that welcomes contributions from developers of all experience levels.

### How to Contribute

Whether you're fixing a bug, adding a feature, or improving documentation, your contributions make DotSecrets better for everyone.

1. Check out our [CONTRIBUTING.md](./CONTRIBUTING.md) guide for detailed instructions
2. Fork the repository and create your branch from `main`
3. Make your changes and ensure tests pass
4. Submit a pull request with a clear description of your improvements

### Code of Conduct

We're committed to fostering an open and welcoming community. Please read our [Code of Conduct](./CODE_OF_CONDUCT.md) to understand the behavior we expect from all participants.

### Security Disclosures

DotSecrets takes security seriously. If you discover a vulnerability or security issue:

- **Do not** create a public GitHub issue
- Report it confidentially to [support@bytehide.com](mailto:support@bytehide.com)
- Include detailed information about the vulnerability
- Allow time for the issue to be addressed before public disclosure

We appreciate your help in keeping DotSecrets and its users safe.

### License

DotSecrets is available under the [BSD 2-Clause License](./LICENSE). This permissive license allows you to use, modify, and distribute the code in both commercial and non-commercial applications, with minimal restrictions.

## 🚀 From ByteHide with 💙

DotSecrets was created by the team at [ByteHide](https://www.bytehide.com) with a simple mission: to simplify the lives of developers while enhancing security.

We built this tool because we believe that security shouldn't come at the cost of developer experience. Managing secrets should be straightforward, standardized, and accessible to everyone—from solo developers to enterprise teams.

DotSecrets represents our commitment to democratizing security practices. We want to empower you to build with confidence, knowing your sensitive information is handled properly without adding complexity to your workflow.

We're excited to see what you build with DotSecrets, and we hope you'll join our community in making secret management simple, secure, and standardized across the JavaScript ecosystem.

Whether you're using DotSecrets in a weekend project or an enterprise application, we'd love to hear from you! Share your feedback, stories, or just say hello at [@byte_hide](https://x.com/byte_hide).

---

Built with passion by the ByteHide team and the open-source community. Happy coding! 🎉
