# Basic Node.js Example

This example demonstrates the basic usage of DotSecrets in a simple Node.js application.

## Features Demonstrated
- Basic setup and usage of DotSecrets
- Loading secrets from `.secrets` and `.env` files
- Using the async pattern to access secrets
- Type conversion and validation
- Default values

## Running the Example

1. Install dependencies:
```bash
npm install
```

2. Run the example:
```bash
node index.js
```

## Understanding the Example

This example shows:
- How to access secrets asynchronously (recommended approach)
- How to perform type conversion and validation in a single chain
- How to provide default values for optional secrets
- How secrets from both `.env` and `.secrets` files are loaded automatically

The example application simulates connecting to a database and API using configuration from secrets. 