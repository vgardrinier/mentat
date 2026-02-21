import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-2xl px-4">
        <h1 className="text-5xl font-bold mb-4 text-gray-900">Agent Marketplace v2</h1>
        <p className="text-xl text-gray-600 mb-8">
          Skills + Workers infrastructure for AI agents
        </p>

        <SignedOut>
          <div className="space-x-4">
            <SignInButton mode="modal">
              <button className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                Sign In
              </button>
            </SignInButton>
            <SignInButton mode="modal">
              <button className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Sign Up
              </button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-4 mb-6">
              <UserButton />
              <span className="text-sm text-gray-600">You're signed in!</span>
            </div>
            <div className="space-x-4">
              <Link href="/wallet" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                Go to Wallet
              </Link>
              <Link href="/workers" className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Browse Workers
              </Link>
            </div>
          </div>
        </SignedIn>
      </div>
    </div>
  )
}
