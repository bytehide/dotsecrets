// Traditional dotenv application

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

console.log('🔄 Running app with dotenv (before migration)');

// Function to ensure a required environment variable exists
function requireEnv(key) {
  const value = process.env[key];
  if (value === undefined) {
    throw new Error(`Required environment variable ${key} is missing`);
  }
  return value;
}

// Common pattern: parsing PORT with fallback
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
if (isNaN(PORT)) {
  throw new Error('PORT must be a number');
}

// Database configuration with manual validation
let dbConfig;
try {
  dbConfig = {
    host: requireEnv('DB_HOST'),
    port: parseInt(requireEnv('DB_PORT'), 10),
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    database: requireEnv('DB_NAME')
  };
  
  if (isNaN(dbConfig.port)) {
    throw new Error('DB_PORT must be a number');
  }
} catch (error) {
  console.error('❌ Database configuration error:', error.message);
  process.exit(1);
}

// Parsing boolean from string - common pattern
const isDebug = process.env.DEBUG === 'true';

// Feature flags with manual parsing
const enableFeatureX = process.env.ENABLE_FEATURE_X === 'true';
const enableFeatureY = process.env.ENABLE_FEATURE_Y === 'true';

// Parse number with validation
let maxItems;
try {
  maxItems = process.env.MAX_ITEMS ? parseInt(process.env.MAX_ITEMS, 10) : 50;
  if (isNaN(maxItems) || maxItems < 1) {
    throw new Error('MAX_ITEMS must be a positive number');
  }
} catch (error) {
  console.error('❌ Configuration error:', error.message);
  maxItems = 50; // Fallback
}

// API configuration
const apiUrl = process.env.API_URL || 'https://api.default.com';
const apiKey = requireEnv('API_KEY');

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

console.log('\n✅ App started successfully with dotenv');
console.log('⚠️ Notice the extra boilerplate code needed for validation, type conversion, and defaults');
console.log('⚠️ Any errors in parsing would crash the application');
console.log('⚠️ No built-in way to transition to cloud secret providers'); 