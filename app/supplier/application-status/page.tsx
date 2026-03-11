'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  supplierGetApplicationStatus,
  supplierGetMe,
  supplierUpdateMe,
  adminUploadFile,
} from '@/lib/adminApi';
import { COUNTRIES } from '@/lib/countries';
import { CheckCircle2, Clock, XCircle, Upload, Edit2, FileText, X } from 'lucide-react';

export default function ApplicationStatusPage() {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  const statusQ = useQuery(
    ['supplier', 'application-status'],
    async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      console.log('application-status fetch token', token);
      return supplierGetApplicationStatus();
    },
    {
      staleTime: 0,
      cacheTime: 1000 * 60 * 5,
      refetchInterval: 5000, // poll so we act quickly when admin updates status
      enabled: isMounted && typeof window !== 'undefined' && !!localStorage.getItem('access_token'),
    }
  );

  // fetch current company/supplier profile (used for editing)
  const meQ = useQuery(
    ['supplier', 'me'],
    supplierGetMe,
    { enabled: isMounted && !!localStorage.getItem('access_token'), staleTime: 0, cacheTime: 1000 * 60 * 5, refetchInterval: 5000 }
  );

  // editing state
  const [isEditing, setIsEditing] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [legalFiles, setLegalFiles] = useState<File[]>([]);
  const [legalDocUrls, setLegalDocUrls] = useState<string[]>([]);
  const [legalUploadErrors, setLegalUploadErrors] = useState<string | null>(null);
  const [legalUploadingCount, setLegalUploadingCount] = useState(0);
  const legalInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const updateMeM = useMutation({
    mutationFn: supplierUpdateMe,
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['supplier', 'me'] });
      setIsEditing(false);
      setError('');
      setSuccessMsg('Profile updated successfully.');
    },
    onError: (err: any) => {
      console.error('supplierUpdateMe error', err);
      const serverMsg = err?.response?.data?.message || err?.message;
      setError(serverMsg || 'Update failed.');
    },
  });

  // when profile data loads populate form
  useEffect(() => {
    if (meQ.data) {
      setCompanyName(meQ.data.name || '');
      // split phone into code+number if possible
      if (meQ.data.phoneNumber) {
        const m = meQ.data.phoneNumber.match(/^(\+\d{1,4})(.*)$/);
        if (m) {
          setCountryCode(m[1]);
          setContactNumber(m[2]);
        } else {
          setContactNumber(meQ.data.phoneNumber);
        }
      }
      setAddress(meQ.data.businessAddress || '');
      setWebsite(meQ.data.website || '');
      setDescription(meQ.data.description || '');
      setLogoUrl(meQ.data.logoUrl || '');
      setLegalDocUrls(meQ.data.legalDocUrls || []);
    }
  }, [meQ.data]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // open edit modal automatically if we were linked here with ?edit=true
  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      setIsEditing(true);
      // clear the flag from the url so refreshing won't reopen the modal
      router.replace('/supplier/application-status', { scroll: false });
    }
  }, [searchParams, router]);

  const status = statusQ.data?.status?.toUpperCase() || 'PENDING';
  const message = statusQ.data?.message || '';

  // if application has been approved while we're on this page, send user to dashboard automatically
  useEffect(() => {
    if (status === 'VERIFIED' || status === 'APPROVED') {
      router.push('/supplier/dashboard');
    }
  }, [status, router]);

  if (!isMounted) return null;

  const getStatusDisplay = () => {
    switch (status) {
      case 'VERIFIED':
      case 'verified':
        return {
          icon: CheckCircle2,
          color: 'emerald',
          title: 'Application Approved',
          description: 'Congratulations! Your company has been verified and approved by our team. You can now access your supplier dashboard to upload products.',
          subtext: 'You can now add your products to the MaterialHub platform.',
          buttonText: 'Go to Supplier Dashboard',
          buttonLink: '/supplier/dashboard',
          showWaitingMessage: false,
          showActionButton: true,
        };
      case 'REJECTED':
      case 'rejected':
        return {
          icon: XCircle,
          color: 'rose',
          title: 'Application Rejected',
          description: message ||
            'Unfortunately, your application could not be approved at this time. Please review the feedback below and contact our support team for more information.',
          subtext: 'You can reapply after addressing the issues mentioned.',
          buttonText: 'Contact Support',
          buttonLink: '#',
          showWaitingMessage: false,
          showActionButton: true,
        };
      default:
        return {
          icon: Clock,
          color: 'blue',
          title: 'Application Under Review',
          description: 'Thank you for your interest in joining MaterialHub. Our team is currently verifying your company details and legal documents. This typically takes 1-2 business days.',
          subtext: 'Start preparing your product catalog in CSV format. This will help you launch your storefront immediately once your application is approved.',
          buttonText: 'View Catalog Guidelines',
          buttonLink: '#',
          showWaitingMessage: true,
          showActionButton: false,
        };
    }
  };

  const display = getStatusDisplay();
  const Icon = display.icon;
  const colorClasses = {
    emerald: 'bg-emerald-100 text-emerald-600',
    rose: 'bg-rose-100 text-rose-600',
    blue: 'bg-blue-100 text-blue-600',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-blue-600 hover:opacity-80 transition-opacity">
            <div className="size-6">
              <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z" />
                <path d="M24 8.18819L33.4123 11.574L24 15.2071L14.5877 11.574L24 8.18819ZM9 15.8487L21 20.4805V37.6263L9 32.9945V15.8487ZM27 37.6263V20.4805L39 15.8487V32.9945L27 37.6263ZM25.354 2.29885C24.4788 1.98402 23.5212 1.98402 22.646 2.29885L4.98454 8.65208C3.7939 9.08038 3 10.2097 3 11.475V34.3663C3 36.0196 4.01719 37.5026 5.55962 38.098L22.9197 44.7987C23.6149 45.0671 24.3851 45.0671 25.0803 44.7987L42.4404 38.098C43.9828 37.5026 45 36.0196 45 34.3663V11.475C45 10.2097 44.2061 9.08038 43.0155 8.65208L25.354 2.29885Z" />
              </svg>
            </div>
            <span className="font-bold text-slate-900">MaterialHub</span>
          </Link>
          <Link href="/supplier-login" className="text-sm text-slate-600 hover:text-slate-900 font-semibold">
            Back to Login
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {successMsg && (
            <div className="mb-4 text-sm text-emerald-600 text-center">
              {successMsg}
            </div>
          )}
          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className={`h-20 w-20 rounded-full flex items-center justify-center mb-4 ${colorClasses[display.color as keyof typeof colorClasses]}`}>
              <Icon className="h-10 w-10" />
            </div>
          </div>

          {/* Title & Description */}
          <h1 className="text-3xl font-bold text-center text-slate-900 mb-4">
            {display.title}
          </h1>

          <p className="text-center text-slate-600 text-sm mb-8">
            {display.description}
          </p>

          {/* Waiting Message */}
          {display.showWaitingMessage && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <p className="text-sm font-bold text-blue-900 mb-2">⏱️ While you wait…</p>
              <p className="text-sm text-blue-800 mb-4">
                Start preparing your product catalog in a CSV format. This will help you launch your storefront immediately once your application is approved.
              </p>
              <div>
                <button
                  onClick={async () => {
                    try {
                      const result = await statusQ.refetch();
                      // Check the result from refetch
                      if (result?.data) {
                        const updatedStatus = (result.data.status || '').toUpperCase();
                        if (updatedStatus === 'VERIFIED') {
                          router.push('/supplier/dashboard');
                        }
                      }
                    } catch (err: any) {
                      // If unauthorized, user session might be expired
                      if (err?.response?.status === 401) {
                        // Refresh the page to force re-login prompt
                        window.location.reload();
                      }
                    }
                  }}
                  className="text-sm text-blue-600 font-semibold hover:underline bg-white px-3 py-1 rounded"
                >
                  Refresh Status
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {display.showActionButton && (
              <a
                href={display.buttonLink}
                className="block w-full px-6 py-3 bg-blue-600 text-white text-center rounded-lg font-bold hover:bg-blue-700 transition-colors"
              >
                {display.buttonText}
              </a>
            )}
            {/* show current profile details so supplier can verify what has been submitted */}
            {meQ.data && (
              <div className="mt-6 bg-white rounded-lg border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Your Profile</h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-slate-500 hover:text-slate-700"
                  title="Edit company information"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
                <p className="text-xs text-slate-600">Name: <span className="font-medium">{meQ.data.name}</span></p>
                <p className="text-xs text-slate-600">Phone: <span className="font-medium">{meQ.data.phoneNumber}</span></p>
                {meQ.data.website && (
                  <p className="text-xs text-slate-600">
                    Website: <span className="font-medium">{meQ.data.website}</span>
                  </p>
                )}
                {meQ.data.businessAddress && (
                  <p className="text-xs text-slate-600">
                    Address: <span className="font-medium">{meQ.data.businessAddress}</span>
                  </p>
                )}
                {meQ.data.description && (
                  <p className="text-xs text-slate-600">
                    Description: <span className="font-medium break-words">{meQ.data.description}</span>
                  </p>
                )}

              </div>
            )}

            <Link
              href="/"
              className="block w-full px-6 py-3 border border-slate-200 text-slate-900 text-center rounded-lg font-bold hover:bg-slate-50 transition-colors"
            >
              🏠 Return to Home
            </Link>
          </div>

          {/* Help Text */}
          <p className="text-center text-slate-600 text-xs mt-8">
            Need help? Visit our{' '}
            <a href="#" className="text-blue-600 hover:underline font-semibold">
              Help Center
            </a>
            {' '}or email us at{' '}
            <a href="mailto:support@materialhub.com" className="text-blue-600 hover:underline font-semibold">
              support@materialhub.com
            </a>
          </p>

          {/* Edit form modal/section */}
          {isEditing && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg max-w-xl w-full p-6 relative">
                <button
                  onClick={() => setIsEditing(false)}
                  className="absolute top-3 right-3 text-slate-500 hover:text-slate-700"
                >
                  ✖
                </button>
                <h2 className="text-xl font-bold mb-4">Edit Company Information</h2>
                {error && <p className="text-sm text-rose-600 mb-2">{error}</p>}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    // normalize website and phone
                    const normalizedWebsite = website.trim()
                      ? `${website.trim().startsWith('http') ? '' : 'https://'}${website.trim()}`
                      : undefined;
                    const fullPhone = contactNumber
                      ? `${countryCode}${contactNumber}`
                      : undefined;
                    updateMeM.mutate({
                      name: companyName || undefined,
                      description: description || undefined,
                      website: normalizedWebsite || undefined,
                      logoUrl: logoUrl || undefined,
                      phoneNumber: fullPhone || undefined,
                      countryCode: countryCode || undefined,
                      legalDocUrls: legalDocUrls.length ? legalDocUrls : undefined,
                      businessAddress: address || undefined,
                    });
                  }}
                  className="space-y-4 overflow-y-auto max-h-[80vh]"
                >
                  {/* Logo */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Company Logo
                    </label>
                    <div className="flex items-center gap-4">
                      {logoUrl ? (
                        <img src={logoUrl} className="h-12 w-12 rounded" />
                      ) : (
                        <div className="h-12 w-12 bg-slate-100 rounded flex items-center justify-center">
                          <Upload className="h-6 w-6 text-slate-400" />
                        </div>
                      )}
                      <label className="cursor-pointer text-blue-600 hover:underline">
                        Change
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setLogoFile(file);
                            setLogoUploading(true);
                            try {
                              const url = await adminUploadFile({ file, purpose: 'COMPANY_LOGO' });
                              let finalUrl = url.url;
                              if (finalUrl && !/^https?:\/\//i.test(finalUrl) && typeof window !== 'undefined') {
                                finalUrl = window.location.origin + finalUrl;
                              }
                              setLogoUrl(finalUrl);
                            } catch (err) {
                              setError('Failed to upload logo');
                            } finally {
                              setLogoUploading(false);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* legal docs */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Legal Documents
                    </label>
                    <button
                      type="button"
                      onClick={() => legalInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50/30 cursor-pointer"
                      disabled={legalUploadErrors !== null}
                    >
                      <div className="h-10 w-10 bg-white dark:bg-slate-800 rounded-lg shadow-sm flex items-center justify-center mb-3">
                        <Upload className="h-5 w-5 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Click to upload or drag and drop</p>
                      <p className="text-xs text-slate-400 mt-1">PDF, PNG, or JPG (max. 10MB per file)</p>
                    </button>
                    <input
                      ref={legalInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files) return;
                        setLegalUploadErrors(null);
                        const picked = Array.from(files);
                        for (const f of picked) {
                          if (!/^application\/pdf$/.test(f.type) && !/^image\//.test(f.type)) {
                            setLegalUploadErrors(`Invalid file type: ${f.name}`);
                            return;
                          }
                          if (f.size > 10 * 1024 * 1024) {
                            setLegalUploadErrors(`File too large: ${f.name}`);
                            return;
                          }
                        }
                        setLegalFiles((prev) => [...prev, ...picked]);
                        for (const f of picked) {
                          try {
                            setLegalUploadingCount((c) => c + 1);
                            const res = await adminUploadFile({ file: f, purpose: 'COMPANY_DOCS' });
                            let url = res.url;
                            if (url && !/^https?:\/\//i.test(url) && typeof window !== 'undefined') {
                              url = window.location.origin + url;
                            }
                            if (url) setLegalDocUrls((prev) => [...prev, url]);
                          } catch (err) {
                            console.error('Legal doc upload error', err);
                            setLegalUploadErrors('Upload failed');
                          } finally {
                            setLegalUploadingCount((c) => c - 1);
                          }
                        }
                        e.currentTarget.value = '';
                      }}
                    />

                    {legalUploadErrors && (
                      <div className="text-sm text-rose-600">{legalUploadErrors}</div>
                    )}

                    {legalFiles.length > 0 && (
                      <div className="flex flex-col gap-2 mt-3">
                        {legalFiles.map((f, idx) => (
                          <div key={`${f.name}-${idx}`} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 w-fit px-3 py-1.5 rounded-lg">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <span className="text-xs font-medium text-blue-700 dark:text-blue-400">{f.name}</span>
                            {legalDocUrls[idx] ? (
                              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 ml-2">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => {
                                setLegalFiles((prev) => prev.filter((_, i) => i !== idx));
                                setLegalDocUrls((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              className="ml-2 text-blue-400 hover:text-blue-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Contact Number
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="w-24 px-3 py-2 border border-slate-200 rounded"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded"
                      />
                    </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                          Address
                        </label>
                        <textarea
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-slate-200 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-2">
                          Website
                        </label>
                        <input
                          type="url"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded"
                        />
                        {website.trim() && !/^https?:\/\//i.test(website.trim()) && (
                          <p className="text-xs text-slate-400">
                            Will be saved as: <span className="font-semibold">https://{website.trim()}</span>
                          </p>
                        )}
                      </div>
<div>
                          <label className="block text-sm font-semibold text-slate-900 mb-2">
                            Description
                          </label>
                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-slate-200 rounded"
                          />
                        </div>

                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border rounded text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        updateMeM.isLoading ||
                        logoUploading ||
                        legalUploadingCount > 0
                      }
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {logoUploading || legalUploadingCount > 0
                        ? 'Uploading...'
                        : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 px-6 py-6">
        <div className="max-w-md mx-auto flex items-center justify-center gap-6 text-xs text-slate-600">
          <a href="#" className="hover:text-slate-900">Help Center</a>
          <a href="#" className="hover:text-slate-900">Partnership Perks</a>
          <a href="#" className="hover:text-slate-900">Support</a>
        </div>
      </footer>
    </div>
  );
}
