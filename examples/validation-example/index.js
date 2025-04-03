import { secrets, SecretValue } from 'dotsecrets';

// Adding a custom validator
SecretValue.prototype.isValidEmail = function() {
  return this.regex(/^[\w.-]+@[\w.-]+\.\w+$/, 'Invalid email format');
};

SecretValue.prototype.isValidHexColor = function() {
  return this.regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format');
};

SecretValue.prototype.isValidUUID = function() {
  return this.regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'Invalid UUID format'
  );
};

// Helper function to demonstrate validation outcomes
async function demonstrateValidation(title, validationFn) {
  console.log(`\n${title}:`);
  try {
    const result = await validationFn();
    console.log(`✅ Success: ${result}`);
    return result;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return null;
  }
}

// Main function to run all validations
async function runValidationExamples() {
  console.log('🔐 DotSecrets Validation Examples 🔐\n');
  
  // ====== SECTION 1: STRING VALIDATION ======
  console.log('\n📝 STRING VALIDATION');

  // Basic required validation
  await demonstrateValidation(
    'Required value',
    () => secrets.API_KEY.required()
  );
  
  // String length validation
  await demonstrateValidation(
    'String length (min length)',
    () => secrets.PASSWORD.lengthMin(8)
  );
  
  await demonstrateValidation(
    'String length (exact range)',
    () => secrets.USERNAME.lengthBetween(3, 20)
  );
  
  // Whitespace handling
  await demonstrateValidation(
    'Trimming whitespace',
    () => secrets.WHITESPACE_VALUE.trim()
  );
  
  // Empty value handling
  await demonstrateValidation(
    'Not empty validation',
    () => secrets.EMPTY_VALUE.notEmpty()
  );
  
  // Regex pattern matching
  await demonstrateValidation(
    'Regular expression pattern',
    () => secrets.API_KEY.regex(/^sk_test_[A-Za-z0-9]+$/)
  );
  
  // Custom validator
  await demonstrateValidation(
    'Custom email validator',
    () => secrets.EMAIL.isValidEmail()
  );
  
  // Case transformation
  await demonstrateValidation(
    'Lowercase transformation',
    () => secrets.USERNAME.toLowerCase()
  );

  // ====== SECTION 2: NUMERIC VALIDATION ======
  console.log('\n🔢 NUMERIC VALIDATION');
  
  // Basic number conversion
  await demonstrateValidation(
    'Number conversion',
    () => secrets.PORT.number()
  );
  
  // Range validation
  await demonstrateValidation(
    'Number range (min)',
    () => secrets.PORT.number().min(1000)
  );
  
  await demonstrateValidation(
    'Number range (max)',
    () => secrets.TIMEOUT_MS.number().max(10000)
  );
  
  await demonstrateValidation(
    'Number range (between)',
    () => secrets.RANGE_VALUE.number().between(0, 100)
  );
  
  // Integer validation
  await demonstrateValidation(
    'Integer validation',
    () => secrets.RETRY_COUNT.number().integer()
  );
  
  // Sign validation
  await demonstrateValidation(
    'Positive number validation',
    () => secrets.PORT.number().positive()
  );
  
  await demonstrateValidation(
    'Negative number validation',
    () => secrets.NEGATIVE_VALUE.number().negative()
  );
  
  // Invalid number handling
  await demonstrateValidation(
    'Invalid number handling',
    () => secrets.INVALID_NUMBER.number()
  );
  
  // Default values
  await demonstrateValidation(
    'Default value for number',
    () => secrets.NON_EXISTENT_NUMBER.number().default(42)
  );

  // ====== SECTION 3: BOOLEAN VALIDATION ======
  console.log('\n🔄 BOOLEAN VALIDATION');
  
  // Basic boolean conversion
  await demonstrateValidation(
    'Boolean conversion (true)',
    () => secrets.DEBUG_MODE.boolean()
  );
  
  await demonstrateValidation(
    'Boolean conversion (yes)',
    () => secrets.FEATURE_ENABLED.boolean()
  );
  
  await demonstrateValidation(
    'Boolean conversion (0)',
    () => secrets.MAINTENANCE_MODE.boolean()
  );
  
  // Boolean assertion
  await demonstrateValidation(
    'Assert true',
    () => secrets.DEBUG_MODE.boolean().true()
  );
  
  await demonstrateValidation(
    'Assert false',
    () => secrets.MAINTENANCE_MODE.boolean().false()
  );
  
  // Invalid boolean handling
  await demonstrateValidation(
    'Invalid boolean handling',
    () => secrets.INVALID_BOOLEAN.boolean()
  );

  // ====== SECTION 4: JSON VALIDATION ======
  console.log('\n📊 JSON VALIDATION');
  
  // Basic JSON parsing
  const config = await demonstrateValidation(
    'JSON parsing',
    () => secrets.CONFIG.json()
  );
  
  if (config) {
    console.log('  Parsed value:', config);
  }
  
  // Invalid JSON handling
  await demonstrateValidation(
    'Invalid JSON handling',
    () => secrets.INVALID_JSON.json()
  );

  // ====== SECTION 5: COMPLEX VALIDATION CHAINS ======
  console.log('\n🔗 COMPLEX VALIDATION CHAINS');
  
  // Combining multiple validations
  await demonstrateValidation(
    'Multiple validations (port)',
    () => secrets.PORT.number().min(1000).max(9999)
  );
  
  // Custom validators in chains
  await demonstrateValidation(
    'Custom validator in chain (color)',
    () => secrets.COLOR_HEX.isValidHexColor()
  );
  
  await demonstrateValidation(
    'Custom validator in chain (UUID)',
    () => secrets.UUID.isValidUUID()
  );
  
  // ====== SECTION 6: ERROR HANDLING STRATEGIES ======
  console.log('\n🛡️ ERROR HANDLING STRATEGIES');
  
  // Try-catch block
  console.log('\nTry-catch error handling:');
  try {
    const value = await secrets.NON_EXISTENT.required();
    console.log(`✅ Got value: ${value}`);
  } catch (error) {
    console.log(`❌ Caught error: ${error.message}`);
  }
  
  // Default value fallback
  await demonstrateValidation(
    'Default value fallback',
    () => secrets.NON_EXISTENT.default('fallback-value')
  );
  
  // Validation chain with default
  await demonstrateValidation(
    'Validation chain with default',
    () => secrets.INVALID_NUMBER.number().default(42)
  );
}

// Run the examples
runValidationExamples().then(() => {
  console.log('\n✅ Validation examples completed');
}); 