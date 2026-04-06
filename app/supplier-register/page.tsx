'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { supplierRegister, adminUploadFile } from '@/lib/adminApi';
import { COUNTRIES } from '@/lib/countries';
import { Eye, EyeOff } from 'lucide-react';

type Step = 'company-info' | 'review';

export default function SupplierRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('company-info');
  const [error, setError] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countryCode, setCountryCode] = useState('+1');
  const [contactNumber, setContactNumber] = useState('');
  const [website, setWebsite] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState('');
  const [legalFiles, setLegalFiles] = useState<File[]>([]);
  const [legalDocUrls, setLegalDocUrls] = useState<string[]>([]);
  const [legalUploadingCount, setLegalUploadingCount] = useState(0);
  const [legalPreviews, setLegalPreviews] = useState<string[]>([]);
  const [address, setAddress] = useState('');

  const registerM = useMutation({
    mutationFn: async (payload: any) => supplierRegister(payload),
    onSuccess: (data: any) => {
      if (data?.accessToken) localStorage.setItem('access_token', data.accessToken);
      router.push('/supplier/application-status');
    },
    onError: (err: any) => setError(err?.message || 'Registration failed'),
  });

  const uploadLogoM = useMutation({
    mutationFn: async (file: File) => {
      const res = await adminUploadFile({ file, purpose: 'COMPANY_LOGO' });
      return res.url ?? res;
    },
  });

  const uploadLegalM = useMutation({
    mutationFn: async (file: File) => {
      const res = await adminUploadFile({ file, purpose: 'COMPANY_DOCS' });
      return res.url ?? res;
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoFile(f);
    const preview = URL.createObjectURL(f);
    setLogoPreview(preview);
    setLogoUploading(true);
    try {
      const url = await uploadLogoM.mutateAsync(f);
      setLogoUrl(url);
    } catch (err) {
      setError('Logo upload failed');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLegalDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files) return;
    const picked = Array.from(files);
    const previews = picked.map((f) => URL.createObjectURL(f));
    setLegalFiles((prev) => [...prev, ...picked]);
    setLegalPreviews((prev) => [...prev, ...previews]);
    for (const f of picked) {
      try {
        setLegalUploadingCount((c) => c + 1);
        const url = await uploadLegalM.mutateAsync(f);
        if (url) setLegalDocUrls((prev) => [...prev, url]);
      } catch (err) {
        console.error('legal upload error', err);
        setError('One or more document uploads failed');
      } finally {
        setLegalUploadingCount((c) => c - 1);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      legalPreviews.forEach((p) => URL.revokeObjectURL(p));
    };
  }, [logoPreview, legalPreviews]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!companyName || !email || !password || !confirmPassword || !contactNumber) {
      setError('Please fill required fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (step === 'company-info') {
      setStep('review');
      return;
    }

    const normalizedWebsite = website.trim() ? `${website.trim().startsWith('http') ? '' : 'https://'}${website.trim()}` : undefined;

    const payload = {
      name: companyName,
      email,
      password,
      countryCode,
      contactNumber,
      combinedContactNumber: `${countryCode}${contactNumber}`,
      website: normalizedWebsite,
      logoUrl: logoUrl || undefined,
      legalDocUrls: legalDocUrls.length ? legalDocUrls : undefined,
      address: address || undefined,
    };

    registerM.mutate(payload);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">layers</span>
            </div>
            <span className="font-bold text-slate-900">MaterialHub</span>
          </Link>
          <Link href="/supplier-login" className="text-sm text-slate-600 hover:text-slate-900 font-semibold">Login</Link>
        </div>
      </header>

      <main className="py-12">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Supplier Registration</h1>
            <p className="text-slate-500">Join the leading platform for Architecture & Construction materials</p>
            <div className="mt-6 flex items-center justify-center gap-12">
              <div className="flex flex-col items-center gap-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-semibold text-white ${step === 'company-info' ? 'bg-blue-600' : 'bg-green-500'}`}>
                  {step === 'review' ? '✓' : '1'}
                </div>
                <div className="text-sm text-slate-600">Company Info</div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-semibold ${step === 'review' ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                  2
                </div>
                <div className="text-sm text-slate-600">Review</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <form onSubmit={handleSubmit} className="p-8">
              {error && <div className="text-rose-600 text-sm mb-4">{error}</div>}

              {step === 'company-info' && (
                <section className="bg-white rounded-2xl p-8">
                <h3 className="text-lg font-semibold mb-4">Company Profile</h3>

                <div className="border-2 border-dashed rounded-xl p-8 flex items-center justify-center mb-6 bg-slate-50/50">
                  <div className="text-center w-full">
                    <div className="mb-2 text-slate-500">Click to upload or drag and drop</div>
                    <div className="text-xs text-slate-400">SVG, PNG, JPG (max. 2MB)</div>
                    <div className="mt-3 flex items-center justify-center gap-4">
                      <label className="inline-flex items-center gap-3 bg-white border px-4 py-2 rounded-lg cursor-pointer text-sm text-blue-600">
                        <span className="material-symbols-outlined"></span>
                        <span>Upload Logo</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </label>
                      {(logoPreview || logoUrl) && (
                        <div className="flex items-center gap-3">
                          <img src={logoUrl || logoPreview} alt="logo preview" className="w-16 h-16 rounded-full object-cover shadow-sm" />
                        </div>
                      )}
                    </div>
                    {logoFile && (
                      <div className="mt-3 text-sm text-green-600 font-medium">Company logo added — <span className="text-green-700">{logoFile.name}</span></div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Company Name <span className="text-rose-600">*</span></label>
                    <input aria-required="true" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Enter full legal name" className="w-full px-3 py-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Contact Number <span className="text-rose-600">*</span></label>
                    <div className="flex gap-3">
                      <select aria-required="true" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-text-main-light focus:border-primary focus:ring-2 focus:ring-primary/20 w-44">
                        {COUNTRIES.map((c: any) => (
                          <option key={`${c.code}-${c.name}`} value={c.code}>{`${c.flag} ${c.name} ${c.code}`}</option>
                        ))}
                      </select>
                      <input aria-required="true" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="+1 (555) 000-0000" className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-text-main-light focus:border-primary focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold mb-1">Email Address <span className="text-rose-600">*</span></label>
                  <input aria-required="true" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sales@company.com" className="w-full px-3 py-2 border rounded" />
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Password <span className="text-rose-600">*</span></label>
                    <div className="relative">
                      <input aria-required="true" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" className="w-full px-4 py-2.5 rounded-lg border" />
                      <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Confirm Password <span className="text-rose-600">*</span></label>
                    <div className="relative">
                      <input aria-required="true" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" className="w-full px-4 py-2.5 rounded-lg border" />
                      <button type="button" onClick={() => setShowConfirmPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-semibold mb-1">Physical Address</label>
                    <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} placeholder="Building, Street, City, ZIP Code" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-text-main-light focus:border-primary focus:ring-2 focus:ring-primary/20" />
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-semibold mb-1">Website URL (Optional)</label>
                    <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://www.example.com" className="w-full px-3 py-2 border rounded" />
                  </div>

                </section>

              )}

              {step === 'review' && (
                <section className="bg-white rounded-2xl p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">Review Your Application</h3>
                    <button type="button" onClick={() => setStep('company-info')} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-xl hover:bg-slate-50">
                      <span className="material-symbols-outlined">arrow_back</span> Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                      <div className="bg-white rounded-2xl shadow p-8 border border-slate-100">
                        <div className="flex items-center gap-6">
                          <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center flex-shrink-0">
                            <img src={logoUrl || logoPreview || '/placeholder-logo.png'} alt="logo" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-bold truncate">{companyName || '—'}</h4>
                            <p className="text-sm text-slate-500 truncate">{email}</p>
                          </div>
                        </div>
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-slate-500 uppercase font-semibold">Contact Number</div>
                            <div className="font-medium">{countryCode} {contactNumber}</div>
                          </div>
                          {website && (
                            <div>
                              <div className="text-xs text-slate-500 uppercase font-semibold">Website</div>
                              <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="font-medium break-words text-blue-600 hover:underline cursor-pointer">{website}</a>
                            </div>
                          )}
                          <div className="sm:col-span-2">
                            <div className="text-xs text-slate-500 uppercase font-semibold">Physical Address</div>
                            <div className="font-medium">{address || '—'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="bg-white rounded-2xl shadow p-6 border border-slate-100">
                        <h5 className="text-sm font-semibold mb-4">Documents</h5>
                        {legalFiles.length ? (
                          <div className="space-y-3">
                            {legalFiles.map((f, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <div className="flex-shrink-0">
                                  <span className="material-symbols-outlined text-xl text-red-500 block">picture_as_pdf</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium break-words">{f.name}</div>
                                  {(legalDocUrls[idx] || legalPreviews[idx]) ? (
                                    <a href={legalDocUrls[idx] ?? legalPreviews[idx]} target="_blank" rel="noreferrer" className="text-primary font-semibold text-xs hover:underline" >View</a>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500">No documents uploaded</div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              )}}

                

              <section className="p-6">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Legal Documentation</h4>
                <label className="block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer relative bg-slate-50/50">
                  <div className="text-slate-500">Click to upload multiple documents</div>
                  <div className="text-xs text-slate-400 mt-2">Upload PAN Card, VAT Certificate, etc. (PDF, JPG, PNG)</div>
                  <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleLegalDocUpload} />
                </label>
                {legalFiles.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm text-green-600 font-medium">Legal docs added:</div>
                    <ul className="mt-2">
                      {legalFiles.map((f, idx) => {
                        const uploaded = legalDocUrls[idx];
                        const preview = legalPreviews[idx];
                        const href = uploaded ?? preview;
                        const ext = f.name.split('.').pop()?.toLowerCase() || '';
                        return (
                          <li key={idx} className="text-green-700 flex items-center gap-3 py-1">
                            {/* icon/preview */}
                            {ext === 'pdf' ? (
                              <span className="material-symbols-outlined text-red-500">picture_as_pdf</span>
                            ) : ext === 'png' || ext === 'jpg' || ext === 'jpeg' ? (
                              <img src={preview} alt={f.name} className="w-8 h-8 object-cover rounded" />
                            ) : (
                              <span className="material-symbols-outlined text-slate-500">insert_drive_file</span>
                            )}

                            <div className="flex-1">
                              {href ? (
                                <a href={href} target="_blank" rel="noreferrer" className="underline">{f.name}</a>
                              ) : (
                                <span>{f.name}</span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </section>

              <div className="p-6">
                <button type="submit" className="w-full bg-primary text-white py-3 rounded-2xl font-semibold shadow-md">{step === 'company-info' ? 'Continue to Review' : (registerM.isPending ? 'Submitting...' : 'Confirm & Submit')}</button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
