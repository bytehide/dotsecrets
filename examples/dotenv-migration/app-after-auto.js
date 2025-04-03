// Automatically migrated from dotenv to DotSecrets

// This file simulates the result of running:
// npx dotsecrets migrate

import { secrets } from 'dotsecrets';

console.log('🔄 Running app with DotSecrets (after automatic migration)');
console.log('🔄 This file represents code after running: npx dotsecrets migrate');

// Main async function
async function startApp() {
  try {
    // Automatically converted from process.env.PORT
    const PORT = await secrets.PORT.number().between(1000, 9999).default(3000);
    
    // Automatically converted from database configuration
    const dbConfig = {
      host: await secrets.DB_HOST.required(),
      port: await secrets.DB_PORT.number().required(), 
      user: await secrets.DB_USER.required(),
      password: await secrets.DB_PASSWORD.required(),
      database: await secrets.DB_NAME.required()
    };
    
    // Automatically converted from process.env.DEBUG === 'true'
    const isDebug = await secrets.DEBUG.boolean();
    
    // Automatically converted from feature flags
    const enableFeatureX = await secrets.ENABLE_FEATURE_X.boolean();
    const enableFeatureY = await secrets.ENABLE_FEATURE_Y.boolean();
    
    // Automatically converted with enhanced validation
    const maxItems = await secrets.MAX_ITEMS.number().positive().default(50);
    
    // Automatically converted with defaults and validation
    const apiUrl = await secrets.API_URL.default('https://api.default.com');
    const apiKey = await secrets.API_KEY.required();
    
    // Display the loaded configuration
    console.log('\n📋 Configuration loaded:');
    console.log(`Server port: ${PORT}`);
    console.log(`Debug mode: ${isDebug}`);
    console.log(`Database: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    console.log(`API URL: ${apiUrl}`);
    console.log(`API Key: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
    console.log(`Feature X: ${enableFeatureX ? 'Enabled' : 'Disabled'}`);
    console.log(`Feature Y: ${enableFeatureY ? 'Enabled' : 'Disabled'}`);
    console.log(`Max items: ${maxItems}`);
    
    // Examples of compatibility with legacy code still using process.env
    console.log('\n🔄 Legacy code compatibility:');
    console.log(`- process.env.PORT is still available: ${process.env.PORT}`);
    console.log(`- process.env.DB_HOST is still available: ${process.env.DB_HOST}`);
    
    console.log('\n✅ App started successfully with DotSecrets (automatic migration)');
    console.log('✨ The migration tool automatically:');
    console.log('   - Converted process.env calls to secrets.*');
    console.log('   - Added appropriate validation');
    console.log('   - Maintained backwards compatibility');
    console.log('   - Made your app production-ready for cloud providers');
    
  } catch (error) {
    console.error('❌ Configuration error:', error.message);
    process.exit(1);
  }
}

// Example of synchronous mode (for legacy code) - optional
// Uncomment to demonstrate synchronous access
/*
// This would be at the application entry point
await preloadAllSecrets();

// Then legacy synchronous code would still work
function legacyFunction() {
  // This works because we called preloadAllSecrets()
  const apiKey = secrets.API_KEY;
  return apiKey;
}

console.log('Legacy synchronous access:', legacyFunction());
*/

// Start the application
startApp(); 