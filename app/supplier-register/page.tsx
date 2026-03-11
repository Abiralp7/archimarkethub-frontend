'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { supplierRegister, adminUploadFile } from '@/lib/adminApi';
import { COUNTRIES } from '@/lib/countries';
import { Upload, ChevronRight, Eye, EyeOff } from 'lucide-react';

type Step = 'company-info' | 'review';

export default function SupplierRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('company-info');
  const [error, setError] = useState('');

  // Company Info
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countryCode, setCountryCode] = useState('+1');
  const [contactNumber, setContactNumber] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [legalDocFiles, setLegalDocFiles] = useState<File[]>([]);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);

  const registerM = useMutation({
    mutationFn: async () => {
      // normalize website to include protocol
      const normalizedWebsite = website.trim()
        ? `${website.trim().startsWith('http') ? '' : 'https://'}${website.trim()}`
        : undefined;
      const payload: any = {
        name: companyName,
        email,
        password,
        contactNumber: `${countryCode}${contactNumber}`,
        website: normalizedWebsite,
        description,
        address,
      };
      if (logoUrl) payload.logoUrl = logoUrl;
      return supplierRegister(payload);
    },
    onSuccess: (data: any) => {
      // Store the access token from registration response
      console.log('registration success, token=', data?.accessToken);
      if (data?.accessToken) {
        localStorage.setItem('access_token', data.accessToken);
      }
      router.push('/supplier/application-status');
    },
    onError: (err: any) => {
      setError(err.message || 'Registration failed. Please try again.');
    },
  });

  const uploadM = useMutation({
    mutationFn: async (file: File) => {
      const res = await adminUploadFile({ file, purpose: 'COMPANY_LOGO' });
      return res.url;
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoFile(file);
    setLogoUploading(true);
    try {
      const url = await uploadM.mutateAsync(file);
      setLogoUrl(url);
      setError('');
    } catch (err) {
      setError('Failed to upload logo. Please try again.');
      setLogoFile(null);
      setLogoUrl('');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLegalDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files) return;

    const newFiles = Array.from(files);
    setLegalDocFiles((prev) => [...prev, ...newFiles]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (step === 'company-info') {
      if (!companyName || !email || !password || !confirmPassword || !contactNumber) {
        setError('Please fill all required fields');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      setStep('review');
    } else {
      registerM.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-blue-600">
            <div className="size-6">
              <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z" />
                <path d="M24 8.18819L33.4123 11.574L24 15.2071L14.5877 11.574L24 8.18819ZM9 15.8487L21 20.4805V37.6263L9 32.9945V15.8487ZM27 37.6263V20.4805L39 15.8487V32.9945L27 37.6263ZM25.354 2.29885C24.4788 1.98402 23.5212 1.98402 22.646 2.29885L4.98454 8.65208C3.7939 9.08038 3 10.2097 3 11.475V34.3663C3 36.0196 4.01719 37.5026 5.55962 38.098L22.9197 44.7987C23.6149 45.0671 24.3851 45.0671 25.0803 44.7987L42.4404 38.098C43.9828 37.5026 45 36.0196 45 34.3663V11.475C45 10.2097 44.2061 9.08038 43.0155 8.65208L25.354 2.29885Z" />
              </svg>
            </div>
            <span className="font-bold text-slate-900">MaterialHub</span>
          </Link>
          <Link href="/supplier-login" className="text-sm text-slate-600 hover:text-slate-900 font-semibold">
            Already a partner? Login
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Supplier Registration</h1>
            <p className="text-slate-600">
              Join the leading platform for Architecture & Construction materials
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-8 mb-12">
            <div className="text-center">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold mb-2 ${step === 'company-info' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}>
                {step === 'company-info' ? '1' : '✓'}
              </div>
              <p className="text-xs font-semibold text-slate-600">Company Info</p>
            </div>

            <div className="h-0.5 w-12 bg-slate-300" />

            <div className="text-center">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold mb-2 ${step === 'review' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                2
              </div>
              <p className="text-xs font-semibold text-slate-600">Review</p>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 'company-info' && (
                <>
                  {/* Company Info Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-200">
                      <div className="h-6 w-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded font-bold text-sm">
                        📇
                      </div>
                      <h2 className="text-lg font-bold text-slate-900">Company Profile</h2>
                    </div>

                    {/* Logo Upload */}
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-slate-900 mb-3">
                        Company Logo
                      </label>
                      <label className="flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-8 cursor-pointer hover:bg-slate-50 transition-colors">
                        <div className="text-center">
                          <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-sm font-medium text-slate-900">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-slate-500">
                            SVG, PNG, JPG (max. 2MB)
                          </p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={logoUploading}
                          className="hidden"
                        />
                      </label>
                      {logoUploading && (
                        <p className="text-xs text-blue-600 mt-2">⏳ Uploading logo...</p>
                      )}
                      {logoFile && logoUrl && (
                        <p className="text-xs text-emerald-600 mt-2">✓ {logoFile.name} uploaded successfully</p>
                      )}
                      {logoFile && !logoUrl && !logoUploading && (
                        <p className="text-xs text-amber-600 mt-2">⚠️ Logo selected but upload incomplete</p>
                      )}
                    </div>

                    {/* Company Name */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Enter full legal name"
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                      />
                    </div>

                    {/* Contact Number with Country Code */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                        Contact Number *
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="w-24 px-3 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.code}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          value={contactNumber}
                          onChange={(e) => setContactNumber(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="555-000-0000"
                          className="flex-1 px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          required
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="sales@company.com"
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                      />
                    </div>

                    {/* Password */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                        Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">At least 8 characters required</p>
                    </div>

                    {/* Confirm Password */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Physical Address */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                        Physical Address
                      </label>
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Building, Street, City, ZIP Code"
                        rows={3}
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>

                    {/* Website URL */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                        Website URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://www.example.com"
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      {website.trim() && !/^https?:\/\//i.test(website.trim()) && (
                        <p className="text-xs text-slate-400">
                          Will be saved as: <span className="font-semibold">https://{website.trim()}</span>
                        </p>
                        )}
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                        Company Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tell us about your company, specialties, and product range..."
                        rows={4}
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* Legal Documentation Section */}
                  <div className="pt-6 border-t border-slate-200">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="h-6 w-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded font-bold text-sm">
                        📋
                      </div>
                      <h2 className="text-lg font-bold text-slate-900">Legal Documentation</h2>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-slate-900 mb-3">
                        Legal Documents
                      </label>
                      <label className="flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-8 cursor-pointer hover:bg-slate-50 transition-colors">
                        <div className="text-center">
                          <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-sm font-medium text-slate-900">
                            Click to upload multiple documents
                          </p>
                          <p className="text-xs text-slate-500">
                            Upload PAN Card, VAT Certificate, etc. PDF, JPG, PNG
                          </p>
                        </div>
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.png"
                          onChange={handleLegalDocUpload}
                          className="hidden"
                        />
                      </label>
                      {legalDocFiles.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {legalDocFiles.map((file, i) => (
                            <p key={i} className="text-xs text-emerald-600">
                              ✓ {file.name}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                      <p className="text-xs text-blue-700">
                        ℹ️ Please ensure all documents are clear and legible. You can select multiple files at once.
                      </p>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
                      {error}
                    </div>
                  )}
                </>
              )}

              {step === 'review' && (
                <>
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-xs font-semibold text-slate-600 mb-1">COMPANY NAME</p>
                      <p className="text-sm font-bold text-slate-900">{companyName}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-xs font-semibold text-slate-600 mb-1">CONTACT EMAIL</p>
                      <p className="text-sm font-bold text-slate-900">{email}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-xs font-semibold text-slate-600 mb-1">CONTACT NUMBER</p>
                          <p className="text-sm font-bold text-slate-900">
                            {countryCode} {contactNumber}
                          </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-xs font-semibold text-slate-600 mb-1">WEBSITE</p>
                      <p className="text-sm font-bold text-slate-900">
                        {website.trim()
                          ? website.trim().startsWith('http')
                            ? website.trim()
                            : `https://${website.trim()}`
                          : 'Not provided'}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-xs font-semibold text-slate-600 mb-1">ADDRESS</p>
                      <p className="text-sm font-bold text-slate-900">
                        {address || 'Not provided'}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-xs font-semibold text-slate-600 mb-1">DESCRIPTION</p>
                      <p className="text-sm font-bold text-slate-900">
                        {description || 'Not provided'}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-xs font-semibold text-slate-600 mb-1">COMPANY LOGO</p>
                      <p className="text-sm font-bold text-slate-900">{logoFile ? '✓ Uploaded' : 'Not provided'}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-xs font-semibold text-slate-600 mb-1">DOCUMENTS</p>
                      <p className="text-sm font-bold text-slate-900">{legalDocFiles.length} file(s) uploaded</p>
                    </div>
                  </div>

                  {error && (
                    <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
                      {error}
                    </div>
                  )}
                </>
              )}

              {/* Buttons */}
              <div className="flex gap-4 pt-6 border-t border-slate-200">
                {step === 'review' && (
                  <button
                    type="button"
                    onClick={() => setStep('company-info')}
                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-900 font-bold rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  disabled={registerM.isPending || logoUploading}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {step === 'company-info' ? (
                    <>
                      Continue to Review <ChevronRight className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      {registerM.isPending ? 'Submitting...' : 'Submit Application'}
                    </>
                  )}
                </button>
              </div>
            </form>

            <p className="text-xs text-slate-600 text-center mt-6">
              By submitting this form, you agree to our{' '}
              <Link href="#" className="text-blue-600 hover:underline">
                Supplier Terms and Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 px-6 py-6 mt-12">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <p>© 2025 MaterialHub Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-slate-900">Help Center</a>
            <a href="#" className="hover:text-slate-900">Partnership Perks</a>
            <a href="#" className="hover:text-slate-900">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
