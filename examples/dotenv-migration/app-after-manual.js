// Manual migration from dotenv to DotSecrets

// Instead of dotenv, import DotSecrets
import { secrets } from 'dotsecrets';

console.log('🔄 Running app with DotSecrets (after manual migration)');
console.log('🔄 Demonstrating step-by-step manual migration from dotenv');

// Main function using async/await with DotSecrets
async function startApp() {
  try {
    // Port configuration with validation
    // Before: const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    const PORT = await secrets.PORT.number().min(1000).max(9999).default(3000);
    
    // Database configuration with automatic validation
    // Before: Manual validation with try/catch and requireEnv
    const dbConfig = {
      host: await secrets.DB_HOST.required(),
      port: await secrets.DB_PORT.number().required(),
      user: await secrets.DB_USER.required(),
      password: await secrets.DB_PASSWORD.required(),
      database: await secrets.DB_NAME.required()
    };
    
    // Boolean conversion (no more string comparison)
    // Before: const isDebug = process.env.DEBUG === 'true';
    const isDebug = await secrets.DEBUG.boolean().default(false);
    
    // Feature flags with proper boolean conversion
    // Before: const enableFeatureX = process.env.ENABLE_FEATURE_X === 'true';
    const enableFeatureX = await secrets.ENABLE_FEATURE_X.boolean().default(false);
    const enableFeatureY = await secrets.ENABLE_FEATURE_Y.boolean().default(false);
    
    // Number parsing with validation
    // Before: Complex try/catch with manual parsing and validation
    const maxItems = await secrets.MAX_ITEMS.number().min(1).default(50);
    
    // API configuration with defaults
    // Before: const apiUrl = process.env.API_URL || 'https://api.default.com';
    const apiUrl = await secrets.API_URL.default('https://api.default.com');
    const apiKey = await secrets.API_KEY.required();
    
    // Simulate app startup with loaded configuration
    console.log('\n📋 Configuration loaded:');
    console.log(`Server port: ${PORT}`);
    console.log(`Debug mode: ${isDebug}`);
    console.log(`Database: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    console.log(`API URL: ${apiUrl}`);
    console.log(`API Key: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
    console.log(`Feature X: ${enableFeatureX ? 'Enabled' : 'Disabled'}`);
    console.log(`Feature Y: ${enableFeatureY ? 'Enabled' : 'Disabled'}`);
    console.log(`Max items: ${maxItems}`);
    
    console.log('\n✅ App started successfully with DotSecrets');
    console.log('✨ Notice the simplified validation, type conversion, and defaults');
    console.log('✨ All validation errors would be caught and reported cleanly');
    console.log('✨ Ready for transition to cloud secret providers with zero code changes');
    
  } catch (error) {
    console.error('❌ Configuration error:', error.message);
    process.exit(1);
  }
}

// Start the application
startApp(); 