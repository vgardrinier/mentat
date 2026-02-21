'use client';

import { useEffect, useState } from 'react';

interface Transaction {
  id: string;
  type: string;
  amount: string;
  balanceAfter: string;
  reference: string | null;
  createdAt: string;
}

interface WalletData {
  balance: number;
  transactions: Transaction[];
  needsTopUp: boolean;
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState('50');

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const response = await fetch('/api/wallet');
      if (!response.ok) {
        throw new Error(`Failed to fetch wallet: ${response.status}`);
      }
      const data = await response.json();

      // Convert balance from string to number
      if (data.balance) {
        data.balance = parseFloat(data.balance);
      }

      setWallet(data);
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFunds = async () => {
    try {
      setAdding(true);
      const response = await fetch('/api/wallet/add-funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });

      const { checkoutUrl } = await response.json();
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Failed to add funds:', error);
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-green-400 font-mono">$ loading wallet...</div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400 font-mono">✗ Failed to load wallet</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono">
      {/* Balance Card */}
      <div className="border border-green-800 bg-gray-950 rounded p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500">$ wallet --balance</p>
            <p className="mt-2 text-4xl font-bold text-green-400">
              ${(wallet.balance || 0).toFixed(2)}
            </p>
            {wallet?.needsTopUp && (
              <p className="mt-2 text-sm text-yellow-500">
                // Low balance - consider adding funds
              </p>
            )}
          </div>
          <div>
            <button
              onClick={() => setAdding(!adding)}
              className="px-4 py-2 bg-green-600 text-black rounded hover:bg-green-500 font-medium"
            >
              + add funds
            </button>
          </div>
        </div>

        {adding && (
          <div className="mt-6 pt-6 border-t border-gray-800">
            <label className="block text-sm text-gray-400 mb-2">
              Amount (USD)
            </label>
            <div className="flex space-x-3">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="5"
                max="1000"
                className="w-32 bg-black border border-gray-700 rounded px-3 py-2 text-green-400 focus:border-green-500 focus:outline-none"
              />
              <button
                onClick={handleAddFunds}
                className="px-4 py-2 border border-green-600 text-green-400 rounded hover:bg-gray-800"
              >
                → checkout
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              // Min: $5, Max: $1000
            </p>
          </div>
        )}
      </div>

      {/* Transactions */}
      <div className="border border-gray-800 bg-gray-950 rounded">
        <div className="px-6 py-4 border-b border-gray-800">
          <h3 className="text-lg text-green-400">
            $ wallet --transactions
          </h3>
        </div>
        <div className="divide-y divide-gray-800">
          {wallet?.transactions.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-600">
              // No transactions yet
            </div>
          ) : (
            wallet?.transactions.map((tx) => (
              <div key={tx.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-500 uppercase text-xs">
                      {tx.type}
                    </span>
                    {tx.reference && (
                      <span className="text-gray-600 text-xs">
                        {tx.reference.substring(0, 8)}
                      </span>
                    )}
                  </div>
                  <span
                    className={`font-medium ${
                      tx.type === 'deposit' || tx.type === 'refund'
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}
                  >
                    {tx.type === 'deposit' || tx.type === 'refund' ? '+' : '-'}$
                    {tx.amount}
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-xs text-gray-600">
                  <span>Balance: ${tx.balanceAfter}</span>
                  <span>{new Date(tx.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
