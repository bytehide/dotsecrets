// Import the secrets object from DotSecrets
// No configuration needed - DotSecrets automatically loads secrets on import
import { secrets } from 'dotsecrets';

// Simulated database client
class DatabaseClient {
  constructor(config) {
    this.config = config;
    console.log(`✅ Connected to database at ${config.host}:${config.port}/${config.database}`);
  }

  async query(sql) {
    console.log(`Executing query: ${sql}`);
    return [{ id: 1, name: 'Example' }];
  }
}

// Simulated API client
class ApiClient {
  constructor(apiKey, endpoint) {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
    console.log(`✅ API client initialized with endpoint: ${endpoint}`);
  }

  async call(path, data) {
    console.log(`Making API call to ${this.endpoint}/${path}`);
    return { success: true };
  }
}

// Main function using async/await for accessing secrets
async function main() {
  console.log('\n🔐 DotSecrets Basic Example 🔐\n');

  try {
    // ===== Database Configuration =====
    // Using validation chains to ensure proper types and values
    const dbConfig = {
      host: await secrets.DB_HOST.required(),
      port: await secrets.DB_PORT.number().min(1024).max(65535),
      user: await secrets.DB_USER.required(),
      password: await secrets.DB_PASSWORD.required(),
      database: await secrets.DB_NAME.required(),
    };

    const db = new DatabaseClient(dbConfig);
    
    // ===== API Configuration =====
    // Example of required validation
    const apiKey = await secrets.API_KEY.required();
    
    // Example of providing a default value
    const apiEndpoint = await secrets.API_ENDPOINT.default('https://api.default.com');
    
    const api = new ApiClient(apiKey, apiEndpoint);

    // ===== Feature Flags =====
    // Example of boolean conversion
    const enableLogging = await secrets.ENABLE_LOGGING.boolean().default(false);
    
    // Example of number conversion with default
    const maxRetries = await secrets.MAX_RETRIES.number().default(5);
    
    console.log(`\nFeature Configuration:`);
    console.log(`- Logging enabled: ${enableLogging}`);
    console.log(`- Max retries: ${maxRetries}`);

    // ===== Public Values =====
    // Public values can be accessed synchronously (without await)
    // These typically come from .public files which are safe to commit to version control
    const apiVersion = secrets.PUBLIC_API_VERSION;
    
    // Example of JSON parsing from a public configuration
    const featureFlags = secrets.PUBLIC_FEATURE_FLAGS.json();
    
    console.log(`\nPublic Configuration:`);
    console.log(`- API Version: ${apiVersion}`);
    console.log(`- Feature Flags: ${JSON.stringify(featureFlags, null, 2)}`);

    // Simulate some operations
    console.log('\nSimulating application operations:');
    await db.query('SELECT * FROM users LIMIT 10');
    await api.call('users', { action: 'list' });

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

// Run the main function
main().then(() => {
  console.log('\n✅ Example completed successfully');
}); 