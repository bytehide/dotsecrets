import { secrets } from 'dotsecrets';
import ClientDemo from './client-demo';

// This is a Server Component
export default async function Home() {
  // In server components, we can use await directly with secrets
  const apiKey = await secrets.API_KEY.required();
  const apiUrl = await secrets.API_BASE_URL;
  const databaseUrl = await secrets.DATABASE_URL.required();
  const sessionExpiryDays = await secrets.SESSION_EXPIRY_DAYS.number().default(14);
  
  // Masking API key for display purposes only
  const maskedApiKey = apiKey ? `${apiKey.substring(0, 8)}...` : 'undefined';
  
  return (
    <div>
      <h2>Server Component Example</h2>
      <p>This component runs on the server. It can access all secrets.</p>
      
      <div style={{ 
        background: '#f9f9f9', 
        padding: '1rem', 
        borderRadius: '5px',
        marginBottom: '2rem' 
      }}>
        <h3>Server-side Secrets:</h3>
        <ul>
          <li><strong>API Key:</strong> {maskedApiKey}</li>
          <li><strong>API URL:</strong> {apiUrl}</li>
          <li><strong>Database URL:</strong> {databaseUrl.replace(/:.+@/, ':****@')}</li>
          <li><strong>Session Expiry:</strong> {sessionExpiryDays} days</li>
        </ul>
      </div>
      
      <div style={{ marginTop: '3rem' }}>
        <h2>Client Component Example</h2>
        <p>Below is a client component that can only access PUBLIC_ secrets:</p>
        <ClientDemo />
      </div>
    </div>
  );
} 