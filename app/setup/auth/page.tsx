'use client';

import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';

export default function SetupAuthPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'generating' | 'redirecting'>('loading');

  const callbackUrl = searchParams.get('callback');

  useEffect(() => {
    if (!isLoaded) return;

    if (!callbackUrl) {
      setError('Missing callback URL');
      return;
    }

    if (!isSignedIn) {
      // Redirect to sign in
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`;
      return;
    }

    // User is signed in, generate token and redirect
    generateTokenAndRedirect();
  }, [isLoaded, isSignedIn, callbackUrl]);

  async function generateTokenAndRedirect() {
    try {
      setStatus('generating');

      // Generate API token
      const response = await fetch('/api/setup/generate-token', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate token');
      }

      const { token } = await response.json();

      setStatus('redirecting');

      // Redirect back to CLI with token
      window.location.href = `${callbackUrl}?token=${token}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="max-w-md w-full border border-red-800 bg-gray-950 rounded p-8 font-mono">
          <pre className="text-red-400 text-sm mb-6">
{`╔════════════════════════════════════════╗
║           SETUP FAILED                 ║
╚════════════════════════════════════════╝`}
          </pre>
          <p className="text-red-400 mb-2">ERROR:</p>
          <p className="text-gray-400 mb-6 font-mono text-sm">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-2 bg-red-600 text-black rounded hover:bg-red-500 font-medium"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-md w-full border border-green-800 bg-gray-950 rounded p-8 font-mono">
        <pre className="text-green-400 text-sm mb-6">
{`╔════════════════════════════════════════╗
║      AGENT MARKETPLACE SETUP           ║
╚════════════════════════════════════════╝`}
        </pre>

        {status === 'loading' && (
          <div className="text-green-400">
            <p className="mb-2">$ Loading...</p>
            <div className="flex space-x-1">
              <span className="animate-pulse">.</span>
              <span className="animate-pulse delay-100">.</span>
              <span className="animate-pulse delay-200">.</span>
            </div>
          </div>
        )}

        {status === 'generating' && (
          <div className="text-green-400">
            <p className="mb-4">$ Generating authentication token...</p>
            <div className="bg-black border border-gray-800 rounded p-3 mb-4">
              <p className="text-gray-500 text-sm">user:</p>
              <p className="text-green-400 text-sm">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
            <div className="flex space-x-1">
              <span className="animate-pulse">.</span>
              <span className="animate-pulse delay-100">.</span>
              <span className="animate-pulse delay-200">.</span>
            </div>
          </div>
        )}

        {status === 'redirecting' && (
          <div className="text-green-400">
            <p className="mb-2 flex items-center">
              <span className="text-green-400 mr-2">✓</span>
              <span>Authentication Complete</span>
            </p>
            <p className="text-gray-400 text-sm mb-4">$ Redirecting back to terminal...</p>
            <div className="bg-black border border-gray-800 rounded p-3">
              <p className="text-gray-500 text-xs">// This window will close automatically</p>
              <p className="text-gray-500 text-xs">// Return to your terminal to continue</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
