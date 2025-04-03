# DotSecrets Migration from dotenv Example

This example demonstrates how to migrate from dotenv to DotSecrets, showing both manual and automatic migration approaches.

## Features Demonstrated
- Manual migration steps
- Using the automatic migration tool
- Compatibility with existing dotenv code
- Gradual adoption of DotSecrets features

## Running the Example

1. Install dependencies:
```bash
npm install
```

2. Run the example before migration:
```bash
node app-before.js
```

3. Run the example after manual migration:
```bash
node app-after-manual.js
```

4. Run the example after automatic migration:
```bash
node app-after-auto.js
```

## Understanding the Example

This example includes:

### Before Migration
- A typical Node.js application using dotenv
- Common dotenv patterns and limitations

### Manual Migration
- Step-by-step manual migration process
- Preserving compatibility with `process.env`
- Adding DotSecrets features gradually

### Automatic Migration
- Using the `npx dotsecrets migrate` command
- Automatically converting dotenv code
- Adding type validation and other enhancements

### Migration Benefits
- Better error handling
- Type validation and conversion
- Default values
- Production readiness

## Migration Command

The automatic migration can be run with:

```bash
npx dotsecrets migrate
```

This command:
- Handles your existing `.env` files
- Sets up DotSecrets configuration
- Adds appropriate entries to `.gitignore`
- Generates TypeScript definitions for IDE autocompletion
- Transforms `process.env.X` references in your code to `secrets.X`