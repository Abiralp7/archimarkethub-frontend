'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyNotifications,
  getMyUnreadNotificationCount,
  markMyNotificationAsRead,
  markAllMyNotificationsAsRead,
  Notification,
} from '@/lib/adminApi';

export default function SupplierNotificationsDropdown() {
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const countQ = useQuery({
    queryKey: ['supplier', 'notifications', 'unread-count'],
    queryFn: async () => {
      const res = await getMyUnreadNotificationCount();
      return res.count ?? 0;
    },
    refetchInterval: 30000,
  });

  const notificationsQ = useQuery({
    queryKey: ['supplier', 'notifications'],
    queryFn: async () => {
      const res = await getMyNotifications({ limit: 10 });
      return (res.items || res.data || []) as Notification[];
    },
    enabled: isOpen,
    refetchInterval: isOpen ? 10000 : false,
  });

  const markAllReadM = useMutation({
    mutationFn: async () => {
      return markAllMyNotificationsAsRead();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['supplier', 'notifications'] });
      await qc.invalidateQueries({ queryKey: ['supplier', 'notifications', 'unread-count'] });
    },
  });

  const markReadM = useMutation({
    mutationFn: async (id: string) => {
      return markMyNotificationAsRead(id);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['supplier', 'notifications'] });
      await qc.invalidateQueries({ queryKey: ['supplier', 'notifications', 'unread-count'] });
    },
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = notificationsQ.data || [];
  const unreadCount = countQ.data || 0;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'warning':
        return '⚠';
      case 'error':
        return '✕';
      default:
        return 'ℹ';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'error':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-rose-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center -translate-y-1/4 translate-x-1/4">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadM.mutate()}
                disabled={markAllReadM.isPending}
                className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-60"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notificationsQ.isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 transition-colors hover:bg-slate-50 cursor-pointer border-l-4 ${
                      notification.read
                        ? 'bg-white border-l-slate-200'
                        : 'bg-blue-50 border-l-blue-600'
                    }`}
                    onClick={() => {
                      if (!notification.read) {
                        markReadM.mutate(notification.id);
                      }
                      if (notification.link) {
                        window.location.href = notification.link;
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`text-lg font-bold mt-0.5 flex-shrink-0 h-6 w-6 rounded flex items-center justify-center text-xs ${getNotificationColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{notification.message}</p>
                        <p className="text-xs text-slate-500 mt-1">{new Date(notification.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      {!notification.read && <div className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-600 mt-2"></div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 text-center">
              <a href="/supplier/notifications" className="text-xs font-semibold text-blue-600 hover:underline">View all notifications</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
