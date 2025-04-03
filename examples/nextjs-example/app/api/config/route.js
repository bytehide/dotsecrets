import { secrets } from 'dotsecrets';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Access and validate secrets using the DotSecrets library
    const apiVersion = await secrets.PUBLIC_API_VERSION;
    const features = secrets.PUBLIC_FEATURES.json();
    
    // We also have access to private secrets on the server
    const databaseUrl = await secrets.DATABASE_URL.required();
    
    // Generate safer response data (remove sensitive info)
    const config = {
      version: apiVersion,
      features,
      database: {
        connected: true,
        type: databaseUrl.includes('postgres') ? 'PostgreSQL' : 'Other',
      },
      serverTime: new Date().toISOString(),
    };
    
    // Return the public configuration
    return NextResponse.json(config);
  } catch (error) {
    // Handle validation errors or missing secrets
    return NextResponse.json(
      { error: `Configuration error: ${error.message}` },
      { status: 500 }
    );
  }
} 