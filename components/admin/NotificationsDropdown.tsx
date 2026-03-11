'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminGetNotifications,
  adminGetUnreadNotificationCount,
  adminMarkAllNotificationsAsRead,
  adminMarkNotificationAsRead,
  AdminNotification,
} from '@/lib/adminApi';

// notification dropdown for admin header; no longer needs hideCount prop
export default function NotificationsDropdown() {
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count
  const countQ = useQuery({
    queryKey: ['admin', 'notifications', 'unread-count'],
    queryFn: async () => {
      const res = await adminGetUnreadNotificationCount();
      return res.count ?? 0;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch notifications
  const notificationsQ = useQuery({
    queryKey: ['admin', 'notifications'],
    queryFn: async () => {
      const res = await adminGetNotifications({ take: 10, skip: 0 });
      // API returns { total, unread, skip, take, items }
      return (res?.items || res?.data || []) as AdminNotification[];
    },
    enabled: isOpen, // Only fetch when dropdown is open
    refetchInterval: isOpen ? 10000 : false, // Refetch every 10 seconds when open
  });

  // Mark all as read mutation
  const markAllReadM = useMutation({
    mutationFn: async () => {
      return adminMarkAllNotificationsAsRead();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
      await qc.invalidateQueries({ queryKey: ['admin', 'notifications', 'unread-count'] });
    },
  });

  // Mark single notification as read mutation
  const markReadM = useMutation({
    mutationFn: async (id: string) => {
      return adminMarkNotificationAsRead(id);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
      await qc.invalidateQueries({ queryKey: ['admin', 'notifications', 'unread-count'] });
    },
  });

  // Close dropdown when clicking outside
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
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'warning':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'error':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-rose-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadM.mutate()}
                disabled={markAllReadM.isPending}
                className="text-xs font-semibold text-admin-primary hover:underline disabled:opacity-60"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notificationsQ.isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-l-4 ${
                      notification.read
                        ? 'bg-white dark:bg-slate-900 border-l-slate-200 dark:border-l-slate-700'
                        : 'bg-blue-50 dark:bg-blue-900/10 border-l-admin-primary'
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
                      <div
                        className={`text-lg font-bold mt-0.5 flex-shrink-0 h-6 w-6 rounded flex items-center justify-center text-xs ${getNotificationColor(
                          notification.type
                        )}`}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {notification.title}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(notification.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="flex-shrink-0 h-2 w-2 rounded-full bg-admin-primary mt-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 border-t border-slate-200 dark:border-slate-800 text-center">
              <a
                href="/admin/notifications"
                className="text-xs font-semibold text-admin-primary hover:underline"
              >
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
