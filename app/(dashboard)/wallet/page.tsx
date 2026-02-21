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
      const data = await response.json();
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
        <div className="text-gray-500">Loading wallet...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Wallet
          </h2>
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Available Balance</p>
              <p className="mt-1 text-3xl font-semibold text-gray-900">
                ${wallet?.balance.toFixed(2)}
              </p>
              {wallet?.needsTopUp && (
                <p className="mt-2 text-sm text-yellow-600">
                  ⚠️ Balance low - consider adding funds
                </p>
              )}
            </div>
            <div>
              <button
                onClick={() => setAdding(!adding)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Add Funds
              </button>
            </div>
          </div>

          {adding && (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <label className="block text-sm font-medium text-gray-700">
                Amount (USD)
              </label>
              <div className="mt-2 flex space-x-3">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="5"
                  max="1000"
                  className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                <button
                  onClick={handleAddFunds}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                >
                  Continue to Checkout
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Minimum: $5, Maximum: $1000
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Transactions
          </h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {wallet?.transactions.map((tx) => (
            <li key={tx.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {tx.type}
                    </p>
                    {tx.reference && (
                      <p className="ml-2 text-sm text-gray-500">
                        ({tx.reference.substring(0, 8)}...)
                      </p>
                    )}
                  </div>
                  <div className="flex items-center">
                    <p
                      className={`text-sm font-medium ${
                        tx.type === 'deposit' || tx.type === 'refund'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {tx.type === 'deposit' || tx.type === 'refund' ? '+' : '-'}$
                      {tx.amount}
                    </p>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="text-sm text-gray-500">
                      Balance after: ${tx.balanceAfter}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <p>{new Date(tx.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
