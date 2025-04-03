# Contributing to DotSecrets

Thank you for your interest in contributing to DotSecrets! This document provides guidelines and instructions for contributing to the project, particularly for those interested in implementing new secrets providers.

## Table of Contents

- [Contributing to DotSecrets](#contributing-to-dotsecrets)
  - [Table of Contents](#table-of-contents)
  - [Code of Conduct](#code-of-conduct)
  - [Getting Started](#getting-started)
  - [Development Workflow](#development-workflow)
  - [Implementing a New Secrets Provider](#implementing-a-new-secrets-provider)
    - [1. Understand the Interface](#1-understand-the-interface)
    - [2. Create a New Provider Class](#2-create-a-new-provider-class)
    - [3. Implement Provider-Specific Logic](#3-implement-provider-specific-logic)
    - [4. Best Practices for Provider Implementation](#4-best-practices-for-provider-implementation)
    - [5. Documentation](#5-documentation)
  - [Pull Request Process](#pull-request-process)
  - [Style Guide](#style-guide)
  - [Testing](#testing)

## Code of Conduct

Please help us keep DotSecrets open and inclusive. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Install dependencies with `npm install`
4. Create a feature branch for your changes

## Development Workflow

1. Make sure you have the latest changes from the upstream repository
2. Run tests to ensure everything is working properly
3. Make your changes, following the code style guidelines
4. Add tests for your changes
5. Run the test suite to make sure everything passes
6. Commit your changes with clear, descriptive commit messages
7. Push your changes to your fork
8. Submit a pull request to the main repository

## Implementing a New Secrets Provider

DotSecrets is designed to be extensible with new secrets providers. Here's how to implement a new provider:

### 1. Understand the Interface

All secrets providers must implement the `ISecretsPlugin` interface. The primary methods that must be implemented are:

- `getSecret(secretKey: string): Promise<string | undefined>` - Retrieves a secret asynchronously
- `getSecretSync(secretKey: string): string | undefined` (optional) - Retrieves a secret synchronously if supported
- `pushSecrets(secrets: Record<string, string>): Promise<boolean | undefined>` - Pushes multiple secrets to the provider
- `setup(): Promise<boolean | undefined>` - Interactive setup method for the provider

### 2. Create a New Provider Class

Create a new file in the `src/plugins` directory named after your provider (e.g., `MyProviderPlugin.ts`):

```typescript
import { ISecretsPlugin } from "./ISecretsPlugin.js";
import { BaseSecretsPlugin } from "./BaseSecretsPlugin.js";
import { ConsoleUtils } from "../utils/console.js";
// Import any other necessary dependencies

export class MyProviderPlugin extends BaseSecretsPlugin implements ISecretsPlugin {
  pluginName = "My Provider";
  private client?: any;
  private initialized?: Promise<void>;

  constructor(_: Record<string, unknown> = {}, skip = false) {
    super();
    if (!skip) this.initialized = this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    try {
      // Initialize the client for your provider
      // Check for required environment variables or configuration
      this.client = /* your client initialization */;
      ConsoleUtils.debug("My Provider plugin initialized successfully.");
    } catch (error) {
      ConsoleUtils.error(`Failed to initialize My Provider client: ${error}`);
      throw error;
    }
  }

  async getSecret(key: string): Promise<string | undefined> {
    await this.initialized;
    key = this.parseSecretName(key);

    try {
      // Implement secret retrieval logic
      return /* retrieved secret */;
    } catch (error) {
      ConsoleUtils.warn(`Secret "${key}" not found or error retrieving: ${error}`);
      return undefined;
    }
  }

  getSecretSync(key: string): string | undefined {
    // Implement synchronous retrieval if supported, or:
    ConsoleUtils.error("My Provider does not support synchronous retrieval.");
    return undefined;
  }

  async pushSecrets(secrets: Record<string, string>): Promise<boolean | undefined> {
    // Implement logic to push multiple secrets to your provider
    // Include validation, error handling, and progress reporting
    return true; // Return true if successful
  }

  async setup(): Promise<boolean | undefined> {
    // Implement interactive setup for your provider
    // Guide the user through configuration, collect necessary credentials
    return true; // Return true if setup was successful
  }
}
```

### 3. Implement Provider-Specific Logic

For each method, implement the provider-specific logic:

- **initializeClient**: Initialize your provider's client, check for required environment variables.
- **getSecret**: Fetch a secret from your provider using the provider's API.
- **getSecretSync**: If your provider supports it, implement synchronous secret retrieval.
- **pushSecrets**: Implement pushing secrets to your provider, with proper error handling and progress reporting.
- **setup**: Create an interactive setup process to guide users through configuration.

### 4. Best Practices for Provider Implementation

- **Error Handling**: Properly handle errors from your provider's API and give meaningful error messages.
- **Caching**: Consider implementing caching to improve performance.
- **Authentication**: Securely handle authentication credentials for your provider.
- **Rate Limiting**: Implement rate limiting if your provider has API restrictions.
- **Progress Reporting**: For operations that might take time, provide progress feedback to users.

### 5. Documentation

Update the README.md file to include documentation for your provider:

- Add it to the provider table in the "Available Providers" section
- Create a new section under "Provider Configuration" with detailed setup instructions
- Document all required environment variables

## Pull Request Process

1. Ensure your code follows the style guidelines
2. Update the README.md with details of your provider
3. Include tests for your provider
4. Ensure all tests pass
5. Submit your PR with a clear description of the changes and the value they add

## Style Guide

- Use TypeScript for all new code
- Follow the existing code style and patterns
- Use meaningful variable and function names
- Include JSDoc comments for public APIs
- Keep functions small and focused on a single responsibility

## Testing

When implementing a new provider:

1. Create unit tests for your provider in the `test` directory
2. Mock external API calls in tests
3. Test both success and failure cases
4. Test configuration validation
5. Run tests with `npm test` to make sure everything passes

---

Thank you for contributing to DotSecrets and helping make it better for everyone! 