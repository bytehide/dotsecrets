import { secrets } from 'dotsecrets';

// Debug is active because dotsecrets.config.json has debug: true

// This application code is exactly the same regardless of which provider is used!
// You can switch between local development and any cloud provider without changing a line of code.

class DatabaseClient {
  constructor(config) {
    this.config = config;
    console.log(`✅ Connected to database at ${config.host}:${config.port}/${config.name}`);
    console.log(`   Connected as user: ${config.user}`);
  }

  async query(sql) {
    console.log(`🔍 Executing query: ${sql}`);
    return [{ id: 1, name: 'Example data' }];
  }
}

class ApiClient {
  constructor(key, secret) {
    this.key = key;
    this.secret = secret;
    console.log(`✅ API client initialized with key: ${this.maskSecret(key)}`);
  }

  maskSecret(secret) {
    if (!secret) return 'undefined';
    return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`;
  }

  async request(endpoint, data) {
    console.log(`📡 Making API request to: ${endpoint}`);
    return { success: true, data: { message: 'Sample response' } };
  }
}

// Detect which provider is being used
function detectProvider() {
  const plugin = process.env.DOTSECRETS_PLUGIN || 'env';
  
  const providers = {
    'aws': 'AWS Secrets Manager',
    'azure': 'Azure Key Vault',
    'bytehide': 'ByteHide Secrets',
    'gcp': 'Google Cloud Secret Manager',
    'hashicorp': 'HashiCorp Vault',
    'env': 'Local Environment Variables'
  };
  
  return providers[plugin] || 'Unknown Provider';
}

// Main application logic - same code works with ANY provider!
async function main() {
  const provider = detectProvider();
  
  console.log('\n🔐 DotSecrets Cloud Provider Example 🔐');
  console.log(`Currently using: ${provider}\n`);
  
  try {
    // Database configuration - works with any provider
    const dbConfig = {
      host: await secrets.DB_HOST.required(),
      port: await secrets.DB_PORT.number().required(),
      name: await secrets.DB_NAME.required(),
      user: await secrets.DB_USER.required(),
      password: await secrets.DB_PASSWORD.required(),
    };
    
    const db = new DatabaseClient(dbConfig);
    
    // API credentials - works with any provider
    const apiKey = await secrets.API_KEY.required();
    const apiSecret = await secrets.API_SECRET.required();
    
    const api = new ApiClient(apiKey, apiSecret);
    
    // Service endpoints - works with any provider
    const paymentServiceUrl = await secrets.PAYMENT_SERVICE_URL.required();
    const notificationServiceUrl = await secrets.NOTIFICATION_SERVICE_URL.required();
    
    console.log('\n📡 Service Configuration:');
    console.log(`Payment Service: ${paymentServiceUrl}`);
    console.log(`Notification Service: ${notificationServiceUrl}`);
    
    // Feature flags - works with any provider
    const enableBetaFeatures = await secrets.ENABLE_BETA_FEATURES.boolean().default(false);
    
    console.log('\n🚩 Feature Flags:');
    console.log(`Beta Features: ${enableBetaFeatures ? 'Enabled' : 'Disabled'}`);
    
    // Simulate some operations
    console.log('\n🚀 Simulating application operations:');
    await db.query('SELECT * FROM users LIMIT 10');
    await api.request(paymentServiceUrl + '/process', { amount: 100 });
    
    if (enableBetaFeatures) {
      console.log('🧪 Beta feature executed successfully');
    }
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error('\nMake sure you have:');
    console.error('1. Set up the appropriate environment variables for your chosen provider');
    console.error('2. Created the required secrets in your provider (with the same names as in .secrets file)');
    console.error('3. Installed the necessary dependencies for your provider');
  }
}

// Run the application
main().then(() => {
  console.log('\n✅ Example completed successfully');
  console.log('\n📝 Remember:');
  console.log('- In local development, secrets come from the .secrets file');
  console.log('- In production, switch providers by setting DOTSECRETS_PLUGIN and provider-specific env vars');
  console.log('- No code changes are needed when switching between providers');
}); 