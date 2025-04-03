import { preloadAllSecrets } from 'dotsecrets';

// Server-side initialization of DotSecrets
// This runs only on the server, not in the browser
if (typeof window === 'undefined') {
  // Preload all secrets for synchronous access
  // This is a top-level await - Next.js handles this correctly
  preloadAllSecrets()
    .then(() => console.log('✅ DotSecrets: Secrets preloaded successfully'))
    .catch(err => console.error('❌ DotSecrets: Error preloading secrets:', err));
}

export const metadata = {
  title: 'DotSecrets Next.js Example',
  description: 'Example of using DotSecrets with Next.js',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header style={{ padding: '1rem', background: '#f0f0f0', marginBottom: '2rem' }}>
          <h1>DotSecrets Next.js Example</h1>
          <p>Demonstrating how to use DotSecrets in a Next.js application</p>
        </header>
        <main style={{ padding: '0 2rem' }}>{children}</main>
      </body>
    </html>
  );
} 