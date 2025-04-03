'use client';  // This is a Client Component

import { secrets } from 'dotsecrets';
import { useState } from 'react';

export default function ClientDemo() {
  const [error, setError] = useState(null);
  
  // In client components, we can only access PUBLIC_ prefixed secrets
  // These can be accessed synchronously (no await needed)
  const appName = secrets.PUBLIC_APP_NAME;
  const apiVersion = secrets.PUBLIC_API_VERSION;
  
  // Using .json() to parse the JSON string in the PUBLIC_THEME_CONFIG variable
  const themeConfig = secrets.PUBLIC_THEME_CONFIG.json();
  const features = secrets.PUBLIC_FEATURES.json();
  
  // This would fail in the browser! We keep it commented out to demonstrate what NOT to do
  const handleClickForbidden = () => {
    try {
      // ⚠️ This would cause an error in the browser because API_KEY is not PUBLIC_
      // const apiKey = secrets.API_KEY;
      setError("⚠️ You can't access non-PUBLIC_ secrets in client components!");
    } catch (err) {
      setError(err.message);
    }
  };
  
  return (
    <div style={{ 
      border: `2px solid ${themeConfig.primaryColor}`, 
      padding: '1rem',
      borderRadius: '5px',
      background: themeConfig.darkMode ? '#2a2a2a' : '#ffffff',
      color: themeConfig.darkMode ? '#ffffff' : '#000000'
    }}>
      <h3>Client Component</h3>
      <p>This component runs in the browser. It can only access PUBLIC_ secrets.</p>
      
      <div>
        <h4>Public Configuration:</h4>
        <ul>
          <li><strong>App Name:</strong> {appName}</li>
          <li><strong>API Version:</strong> {apiVersion}</li>
          <li><strong>Theme:</strong> {themeConfig.darkMode ? 'Dark' : 'Light'} mode with primary color {themeConfig.primaryColor}</li>
        </ul>
        
        <h4>Feature Flags:</h4>
        <ul>
          {Object.entries(features).map(([key, value]) => (
            <li key={key}>
              <strong>{key}:</strong> {value ? '✅ Enabled' : '❌ Disabled'}
            </li>
          ))}
        </ul>
      </div>
      
      <div style={{ marginTop: '1rem' }}>
        <button 
          onClick={handleClickForbidden}
          style={{ 
            background: themeConfig.primaryColor,
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Try to access API_KEY (will fail)
        </button>
        
        {error && (
          <div style={{ color: 'red', marginTop: '0.5rem' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
} 