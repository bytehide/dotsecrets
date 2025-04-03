# DotSecrets Cloud Provider Example

This example demonstrates how to use DotSecrets with cloud secret management providers, showcasing the seamless transition from local development to cloud production environments.

## Features Demonstrated
- Configuring cloud providers
- Local to cloud transition without code changes
- AWS Secrets Manager integration
- Azure Key Vault integration
- ByteHide Secrets integration
- Provider selection logic

## Environment Setup

For each provider, you'll need to set specific environment variables. This example includes configuration templates for several popular providers.

### AWS Secrets Manager

```bash
# Set environment variables (or use .env file)
export DOTSECRETS_PLUGIN=aws
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
```

### Azure Key Vault

```bash
# Set environment variables (or use .env file)
export DOTSECRETS_PLUGIN=azure
export AZURE_KEYVAULT_URI=https://your-vault.vault.azure.net
export AZURE_CLIENT_ID=your-client-id
export AZURE_TENANT_ID=your-tenant-id
export AZURE_CLIENT_SECRET=your-client-secret
```

### ByteHide Secrets

```bash
# Set environment variables (or use .env file)
export DOTSECRETS_PLUGIN=bytehide
export BYTEHIDE_SECRETS_TOKEN=your-token
export BYTEHIDE_SECRETS_ENVIRONMENT=production
```

## Running the Example

1. Install dependencies:
```bash
npm install
```

2. Choose a provider by setting the environment variables shown above

3. Run the example:
```bash
node index.js
```

## Understanding the Example

This example demonstrates:

- How to write code that seamlessly works with both local files and cloud providers
- How to configure different cloud providers
- How the provider selection logic works
- How to use a configuration file (`dotsecrets.config.json`) for DotSecrets settings
- Strategies for handling provider-specific features and fallbacks

The code is exactly the same regardless of which provider is used - only the environment configuration changes.

### Configuration File

The example includes a `dotsecrets.config.json` file that configures DotSecrets with the following settings:

```json
{
  "debug": true,
  "defaultProvider": "env",
  "loadImplicitFiles": true,
  "allowPublicInBrowser": true
}
```

This configuration is automatically loaded when importing DotSecrets, providing a cleaner alternative to runtime configuration. 