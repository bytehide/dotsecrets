# Next.js Example with DotSecrets

This example demonstrates how to use DotSecrets in a Next.js application, handling both server-side and client-side concerns properly.

## Features Demonstrated
- Server-side usage of DotSecrets in Next.js
- Client-side access to public secrets
- Environment-specific configuration
- Proper initialization in the App Router

## Running the Example

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) to see the result.

## Understanding the Example

This example demonstrates:

- How to initialize DotSecrets in a Next.js App Router application
- How to use secrets in server components
- How to use `PUBLIC_` prefixed secrets in client components
- How to work with environment-specific secrets

### Project Structure

- `app/layout.js` - Root layout with DotSecrets initialization
- `app/page.js` - Server component showing secret usage
- `app/client-demo.js` - Client component showing public secret usage
- `app/api/config/route.js` - API route using DotSecrets for configuration
- `.secrets` - Secret values (not committed to git in real projects)
- `.public` - Public values (safe to commit)

### Server vs Client Usage

This example carefully distinguishes between server and client usage of secrets:

- Server components and API routes can access all secrets
- Client components can only access `PUBLIC_` prefixed secrets
- The initialization happens only on the server side 