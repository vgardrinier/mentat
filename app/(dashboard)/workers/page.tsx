'use client';

import { useState } from 'react';

export default function WorkersPage() {
  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    pricing: '10',
    avgCompletionTime: '10',
    apiEndpoint: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          pricing: parseFloat(formData.pricing),
          avgCompletionTime: parseInt(formData.avgCompletionTime),
          p90CompletionTime: parseInt(formData.avgCompletionTime) * 1.5,
          capabilities: { list: [] },
          limitations: { list: [] },
          requiredInputs: {},
          requiredContext: [],
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setFormData({
          name: '',
          specialty: '',
          pricing: '10',
          avgCompletionTime: '10',
          apiEndpoint: '',
        });
      }
    } catch (error) {
      console.error('Failed to register worker:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Register Worker</h2>
        <p className="mt-1 text-sm text-gray-500">
          Register as a specialist worker to receive paid jobs
        </p>
      </div>

      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">
            Worker registered successfully! Pending admin approval.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow px-4 py-5 sm:p-6 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Worker Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="LandingPageWorker"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Specialty
          </label>
          <input
            type="text"
            value={formData.specialty}
            onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="landing-page-design"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Pricing (USD)
            </label>
            <input
              type="number"
              value={formData.pricing}
              onChange={(e) => setFormData({ ...formData, pricing: e.target.value })}
              required
              min="5"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Avg Completion Time (minutes)
            </label>
            <input
              type="number"
              value={formData.avgCompletionTime}
              onChange={(e) =>
                setFormData({ ...formData, avgCompletionTime: e.target.value })
              }
              required
              min="1"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            API Endpoint
          </label>
          <input
            type="url"
            value={formData.apiEndpoint}
            onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="https://your-worker.com/webhook"
          />
          <p className="mt-2 text-sm text-gray-500">
            Jobs will be sent to this endpoint via webhook
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {submitting ? 'Registering...' : 'Register Worker'}
          </button>
        </div>
      </form>
    </div>
  );
}
