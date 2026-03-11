'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { supplierLogin } from '@/lib/adminApi';

export default function SupplierLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const loginM = useMutation({
    mutationFn: async () => {
      return supplierLogin(email, password);
    },
    onSuccess: (data) => {
      // Check if supplier is verified/approved
      if (data.company && (data.company.status === 'VERIFIED' || data.company.status === 'Verified')) {
        router.push('/supplier/dashboard');
      } else {
        router.push('/supplier/application-status');
      }
    },
    onError: (err: any) => {
      setError(err.message || 'Login failed. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    loginM.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-blue-600 hover:opacity-80 transition-opacity">
            <div className="size-6">
              <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z" />
                <path d="M24 8.18819L33.4123 11.574L24 15.2071L14.5877 11.574L24 8.18819ZM9 15.8487L21 20.4805V37.6263L9 32.9945V15.8487ZM27 37.6263V20.4805L39 15.8487V32.9945L27 37.6263ZM25.354 2.29885C24.4788 1.98402 23.5212 1.98402 22.646 2.29885L4.98454 8.65208C3.7939 9.08038 3 10.2097 3 11.475V34.3663C3 36.0196 4.01719 37.5026 5.55962 38.098L22.9197 44.7987C23.6149 45.0671 24.3851 45.0671 25.0803 44.7987L42.4404 38.098C43.9828 37.5026 45 36.0196 45 34.3663V11.475C45 10.2097 44.2061 9.08038 43.0155 8.65208L25.354 2.29885Z" />
              </svg>
            </div>
            <span className="font-bold text-slate-900">MaterialHub</span>
          </Link>
          <Link href="/supplier-register" className="text-sm text-blue-600 font-semibold hover:underline">
            Apply as Supplier
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-3xl">
              📦
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-center text-slate-900 mb-2">
            Supplier Portal Login
          </h1>
          <p className="text-center text-slate-600 text-sm mb-8">
            Welcome back to MaterialHub
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Work Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-900">Password</label>
                <Link href="#" className="text-xs text-blue-600 hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loginM.isPending}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-60 mt-6"
            >
              {loginM.isPending ? 'Logging in...' : 'Login to Dashboard'}
            </button>
          </form>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-slate-600 mt-6">
            Not a partner yet?{' '}
            <Link href="/supplier-register" className="text-blue-600 font-semibold hover:underline">
              Apply to Join as a Supplier →
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 px-6 py-6">
        <div className="max-w-md mx-auto flex items-center justify-center gap-6 text-xs text-slate-600">
          <a href="#" className="hover:text-slate-900">Help Center</a>
          <a href="#" className="hover:text-slate-900">Terms of Service</a>
          <a href="#" className="hover:text-slate-900">Privacy Policy</a>
        </div>
      </footer>
    </div>
  );
}
