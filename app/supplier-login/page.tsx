'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { supplierLogin } from '@/lib/adminApi';
import { Eye, EyeOff } from 'lucide-react';

export default function SupplierLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">layers</span>
            </div>
            <span className="font-bold text-slate-900">MaterialHub</span>
          </Link>
          <Link href="/supplier-register" className="text-sm text-slate-600 hover:text-slate-900 font-semibold">Register as Supplier</Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Supplier Portal Login</h1>
            <p className="text-slate-500 mt-2">Welcome back to MaterialHub</p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <form onSubmit={handleSubmit} className="p-8">
              {error && (
                <div className="text-rose-600 text-sm mb-4 p-4 bg-rose-50 rounded-lg border border-rose-200">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Email Address <span className="text-rose-600">*</span></label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sales@company.com"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    required
                    aria-required="true"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Password <span className="text-rose-600">*</span></label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                      required
                      aria-required="true"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password Link */}
                <div className="flex justify-end">
                  <Link href="#" className="text-sm text-primary hover:underline font-semibold">
                    Forgot Password?
                  </Link>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loginM.isPending}
                  className="w-full mt-6 px-4 py-3 bg-primary text-white rounded-2xl font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-60"
                >
                  {loginM.isPending ? 'Logging in...' : 'Login to Dashboard'}
                </button>
              </div>

              {/* Sign Up Link */}
              <p className="text-center text-sm text-slate-600 mt-6">
                Not a supplier yet?{' '}
                <Link href="/supplier-register" className="text-primary font-semibold hover:underline">
                  Apply to Join as a Supplier
                </Link>
              </p>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 bg-slate-50 text-center">
        <p className="text-slate-600 text-xs">© 2024 MaterialHub. All rights reserved.</p>
        <div className="flex justify-center gap-6 mt-4">
          <a className="text-xs text-slate-600 hover:text-primary" href="#">Privacy Policy</a>
          <a className="text-xs text-slate-600 hover:text-primary" href="#">Terms of Service</a>
          <a className="text-xs text-slate-600 hover:text-primary" href="#">Contact</a>
        </div>
      </footer>
    </div>
  );
}
