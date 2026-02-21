'use client';

import { useEffect, useState } from 'react';

export default function AdminPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWorkers: 0,
    totalJobs: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    // Mock stats for now
    setStats({
      totalUsers: 12,
      totalWorkers: 5,
      totalJobs: 48,
      totalRevenue: 245.50,
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
        <p className="mt-1 text-sm text-gray-500">
          Platform overview and metrics
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Total Users
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {stats.totalUsers}
            </dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Active Workers
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {stats.totalWorkers}
            </dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Total Jobs
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {stats.totalJobs}
            </dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Platform Revenue
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              ${stats.totalRevenue.toFixed(2)}
            </dd>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Pending Worker Approvals
          </h3>
          <p className="text-sm text-gray-500">
            No pending approvals
          </p>
        </div>
      </div>
    </div>
  );
}
