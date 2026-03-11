'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminAnalyticsDaily, adminAnalyticsTop } from '@/lib/adminApi';

export default function AdminAnalyticsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [entityType, setEntityType] = useState('product');
  const [eventType, setEventType] = useState('view');

  const dailyQ = useQuery({
    queryKey: ['admin', 'analytics', 'daily', from, to, entityType, eventType],
    queryFn: () =>
      adminAnalyticsDaily({ from, to, entityType, eventType, skip: 0, take: 100 }),
    enabled: !!from && !!to,
  });

  const topQ = useQuery({
    queryKey: ['admin', 'analytics', 'top', entityType, eventType],
    queryFn: () => adminAnalyticsTop({ entityType, eventType, days: 7, take: 20 }),
    enabled: true,
  });

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark">
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Analytics</h1>
        </div>
        <div className="p-8 max-w-[1200px] mx-auto space-y-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="font-bold mb-4">Daily Trends</h2>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs">From</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border px-2 py-1 rounded" />
              </div>
              <div>
                <label className="block text-xs">To</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border px-2 py-1 rounded" />
              </div>
              <div>
                <label className="block text-xs">Entity</label>
                <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="border px-2 py-1 rounded">
                  <option value="product">Product</option>
                  <option value="company">Company</option>
                </select>
              </div>
              <div>
                <label className="block text-xs">Event</label>
                <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="border px-2 py-1 rounded">
                  <option value="view">view</option>
                  <option value="click">click</option>
                  <option value="download">download</option>
                </select>
              </div>
              <button
                onClick={() => dailyQ.refetch()}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Refresh
              </button>
            </div>
            {dailyQ.isLoading ? (
              <p className="mt-4">Loading...</p>
            ) : dailyQ.error ? (
              <p className="mt-4 text-rose-600">Failed to load</p>
            ) : (
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {(dailyQ.data?.daily || []).map((row: any) => (
                    <tr key={row.date}>
                      <td className="p-2">{new Date(row.date).toLocaleDateString()}</td>
                      <td className="p-2">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="font-bold mb-4">Top Entities (last 7 days)</h2>
            {topQ.isLoading ? (
              <p>Loading...</p>
            ) : topQ.error ? (
              <p className="text-rose-600">Failed to load</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="p-2">Entity ID</th>
                    <th className="p-2">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {(topQ.data || []).map((row: any) => (
                    <tr key={row.entityId}>
                      <td className="p-2 break-all">{row.entityId}</td>
                      <td className="p-2">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
