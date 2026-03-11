'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Building2,
  Package2,
  Trash2,
  Settings,
  LogOut,
  KeyRound,
  ChevronDown,
  Menu,
  MessageCircle,
} from 'lucide-react';
import NotificationsDropdown from './NotificationsDropdown';
import { logout } from '@/lib/auth';

// navigation configuration; allows nested children for modules like "Deleted"
const navItems: Array<{
  href?: string;
  label: string;
  icon: typeof LayoutGrid;
  children?: Array<{ href: string; label: string }>;
}> = [
  { href: '/admin', label: 'Overview', icon: LayoutGrid },
  { href: '/admin/companies', label: 'Companies', icon: Building2 },
  { href: '/admin/products', label: 'Products', icon: Package2 },
  { href: '/admin/categories', label: 'Categories', icon: Building2 },
  { href: '/admin/reviews', label: 'Reviews', icon: Building2 },
  {
    href: '/admin/deleted',
    label: 'Deleted',
    icon: Trash2,
  },
];

// top navigation bar used across admin pages. previously supported passing
// chat state/props for a toggle button, but the chat icon now floats
// independently, so we no longer take those props.
export default function AdminTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleChangePassword = () => {
    // Add your change password logic here
    console.log('Opening change password...');
    // For example: router.push('/admin/change-password'), openModal(), etc.
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deletedOpen, setDeletedOpen] = useState(false); // desktop dropdown

  return (
    <header className="relative h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-50">
      {/* left: logo + hamburger */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          className="lg:hidden p-2"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <Menu className="h-6 w-6 text-slate-600 dark:text-slate-300" />
        </button>
        <div className="flex items-center gap-1 text-admin-primary">
          <div className="size-8">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path
                clipRule="evenodd"
                d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z"
                fill="currentColor"
                fillRule="evenodd"
              />
              <path
                clipRule="evenodd"
                d="M24 8.18819L33.4123 11.574L24 15.2071L14.5877 11.574L24 8.18819ZM9 15.8487L21 20.4805V37.6263L9 32.9945V15.8487ZM27 37.6263V20.4805L39 15.8487V32.9945L27 37.6263ZM25.354 2.29885C24.4788 1.98402 23.5212 1.98402 22.646 2.29885L4.98454 8.65208C3.7939 9.08038 3 10.2097 3 11.475V34.3663C3 36.0196 4.01719 37.5026 5.55962 38.098L22.9197 44.7987C23.6149 45.0671 24.3851 45.0671 25.0803 44.7987L42.4404 38.098C43.9828 37.5026 45 36.0196 45 34.3663V11.475C45 10.2097 44.2061 9.08038 43.0155 8.65208L25.354 2.29885Z"
                fill="currentColor"
                fillRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-[#111318] dark:text-white text-xl font-bold leading-tight tracking-tight">
            AdminPanel
          </h2>
        </div>
      </div>

      {/* center navigation - absolutely centered so it's independent of left/right widths */}
      <nav className="hidden lg:flex absolute left-1/2 transform -translate-x-1/2 items-center gap-4\">
          {navItems.map((item) => {
            const hasChildren = Array.isArray(item.children);
            const isActive = item.href
              ? item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href)
              : false;
            const Icon = item.icon;

            if (hasChildren) {
              return (
                <div key={item.label} className="relative group">
                  <Link
                    href={item.href!}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-admin-primary/10 text-admin-primary font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {item.label}
                    <ChevronDown className="h-3 w-3" />
                  </Link>
                  {/* dropdown shown on hover */}
                  <div className="absolute left-0 mt-1 w-40 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-800 py-1 hidden group-hover:block">
                    {item.children!.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.href || item.label}
                href={item.href!}
                className={`flex items-center gap-2 px-2 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-admin-primary/10 text-admin-primary font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

      {/* Right Side - Notifications & Settings (profile removed) */}
      <div className="flex items-center gap-4">
        {/* Notifications Dropdown */}
        <NotificationsDropdown />
        {/* previously there was a chat toggle here; icon is now rendered separately */}

        {/* Settings Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Settings className="h-5 w-5" />
          </button>

          {/* Dropdown Menu */}
          {isSettingsOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-800 py-1 z-50">
              {/* Change Password */}
              <button
                onClick={() => {
                  handleChangePassword();
                  setIsSettingsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <KeyRound className="h-4 w-4" />
                <span className="font-medium">Change Password</span>
              </button>

              {/* Divider */}
              <div className="my-1 border-t border-slate-200 dark:border-slate-800"></div>

              {/* Logout */}
              <button
                onClick={() => {
                  handleLogout();
                  setIsSettingsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* mobile menu panel */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-40">
          <nav className="flex flex-col py-2">
            {navItems.map((item) => {
              if (item.children) {
                // we removed Dropdowns from nav items; this branch is no longer
                // expected to execute, but keep it defensively in case other
                // modules introduce children in the future.
                return (
                  <div key={item.label} className="px-4 py-2">
                    <Link
                      href={item.href || '#'}
                      className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium"
                    >
                      {item.label}
                      <ChevronDown className="h-4 w-4" />
                    </Link>
                    <div className="pl-4 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block text-slate-600 dark:text-slate-400 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              }
              return (
                <Link
                  key={item.href || item.label}
                  href={item.href!}
                  className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded"
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}