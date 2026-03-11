'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyNotifications,
  getMyUnreadNotificationCount,
  markMyNotificationAsRead,
  markAllMyNotificationsAsRead,
} from '@/lib/adminApi';

const PAGE_SIZE = 20;

export default function SupplierNotificationsPage() {
  const qc = useQueryClient();
  const [offset, setOffset] = useState(0);

  const unreadQ = useQuery({
    queryKey: ['supplier', 'notifications', 'unread-count', 'page'],
    queryFn: async () => {
      const res = await getMyUnreadNotificationCount();
      return res.count ?? 0;
    },
    refetchInterval: 30000,
  });

  const listQ = useQuery({
    queryKey: ['supplier', 'notifications', 'list', offset],
    queryFn: async () => {
      const res = await getMyNotifications({ limit: PAGE_SIZE, offset });
      return { items: res.items || res.data || [] };
    },
    keepPreviousData: true,
  });

  const markAllM = useMutation({
    mutationFn: async () => markAllMyNotificationsAsRead(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['supplier', 'notifications'] });
    },
  });

  const markReadM = useMutation({
    mutationFn: async (id: string) => markMyNotificationAsRead(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['supplier', 'notifications'] });
      await qc.invalidateQueries({ queryKey: ['supplier', 'notifications', 'unread-count', 'page'] });
    },
  });

  const items = listQ.data?.items || [];
  const unreadCount = unreadQ.data ?? 0;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-600">Unread: {unreadCount}</div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllM.mutate()}
              disabled={markAllM.isPending}
              className="text-sm font-semibold text-blue-600 hover:underline disabled:opacity-60"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="divide-y divide-slate-100">
          {listQ.isLoading ? (
            <div className="p-6 text-center text-sm text-slate-500">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">No notifications</div>
          ) : (
            items.map((n: any) => (
              <div key={n.id} className={`px-4 py-3 ${n.read ? 'bg-white' : 'bg-blue-50'}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-slate-500 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => markReadM.mutate(n.id)}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-3 flex items-center justify-between border-t border-slate-100">
          <div className="text-sm text-slate-600">Showing {items.length} notifications</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setOffset(offset + PAGE_SIZE)}
              className="px-3 py-1 border rounded"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
