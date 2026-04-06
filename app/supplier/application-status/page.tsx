"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierGetApplicationStatus, supplierGetMe, supplierUpdateMe, adminUploadFile, UploadPurpose } from '@/lib/adminApi';
import { COUNTRIES } from '@/lib/countries';
import Link from 'next/link';
import CompanyLogoBadge from '@/components/supplier/CompanyLogoBadge';

function StatusCard({ status, message }: { status: string; message?: string }) {
  const color = status === 'VERIFIED' ? 'emerald' : status === 'REJECTED' ? 'rose' : 'amber';
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Application Status</h2>
          <p className={`text-${color}-600 mt-1`}>{status}</p>
        </div>
      </div>
      {message && <p className="text-sm text-slate-600 mt-3">{message}</p>}
    </div>
  );
}

export default function ApplicationStatusPage() {
  const router = useRouter();
  const search = useSearchParams();
  const qc = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: statusData, isLoading: statusLoading } = useQuery({ queryKey: ['supplier', 'application-status'], queryFn: () => supplierGetApplicationStatus() });
  const { data: me, isLoading: meLoading } = useQuery({ 
    queryKey: ['supplier', 'me'], 
    queryFn: () => supplierGetMe(),
    refetchInterval: 2000, // Poll every 2 seconds to check for status changes
    refetchIntervalInBackground: true, // Continue polling even if tab is in background
  });

  const showEdit = me?.status !== 'VERIFIED';

  useEffect(() => {
    if (search?.get('edit') === 'true') setIsEditOpen(true);
  }, [search]);

  // Redirect to dashboard when supplier is verified
  useEffect(() => {
    if (me?.status === 'VERIFIED') {
      router.push('/supplier/dashboard');
    }
  }, [me?.status, router]);

  const updateM = useMutation({
    mutationFn: async (payload: any) => supplierUpdateMe(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['supplier', 'me'] });
      await qc.invalidateQueries({ queryKey: ['supplier', 'application-status'] });
      setIsEditOpen(false);
    },
  });

  const uploadFile = async (file: File, purpose: UploadPurpose) => {
    const res = await adminUploadFile({ file, purpose });
    return res.url ?? res;
  };

  // local edit form state
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [legalFiles, setLegalFiles] = useState<File[]>([]);
  const [legalUrls, setLegalUrls] = useState<string[]>([]);
  const [ownerEmailLocal, setOwnerEmailLocal] = useState('');
  const [ownerEmailError, setOwnerEmailError] = useState('');

  useEffect(() => {
    if (me) {
      setName(me.name || '');
      setWebsite(me.website || '');
      setDescription(me.description || '');
      setCountryCode(me.countryCode || '+1');
      setPhoneNumber(me.phoneNumber || '');
      setAddress(me.businessAddress || '');
      setLogoUrl(me.logoUrl || '');
      setLegalUrls(me.legalDocUrls || []);
      setOwnerEmailLocal(me.owner?.email || '');
    }
  }, [me]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoFile(f);
    try {
      const url = await uploadFile(f, 'COMPANY_LOGO');
      setLogoUrl(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLegalChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const picked = Array.from(files);
    setLegalFiles((p) => [...p, ...picked]);
    for (const f of picked) {
      try {
        const url = await uploadFile(f, 'COMPANY_DOCS');
        setLegalUrls((p) => [...p, url]);
      } catch (err) {
        console.error('legal upload failed', err);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // validate owner email locally (not sent to backend)
    if (ownerEmailLocal && !/^\S+@\S+\.\S+$/.test(ownerEmailLocal)) {
      setOwnerEmailError('Enter a valid email.');
      return;
    }

    const payload: any = {
      name: name.trim() || undefined,
      website: website.trim() ? `${website.trim().startsWith('http') ? '' : 'https://'}${website.trim()}` : undefined,
      description: description.trim() || undefined,
      countryCode: countryCode || undefined,
      phoneNumber: phoneNumber || undefined,
      businessAddress: address || undefined,
      logoUrl: logoUrl || undefined,
      legalDocUrls: legalUrls.length ? legalUrls : undefined,
    };
    updateM.mutate(payload);
  };

  
  return (
    <div className="bg-surface min-h-screen text-on-surface antialiased">
      <header className="bg-surface-bright dark:bg-slate-900 shadow-sm border-b border-slate-100 dark:border-slate-800 sticky top-0 z-50">
        <div className="flex justify-between items-center px-8 py-4 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-8">
            <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span className="bg-primary text-white p-1 rounded-lg">
                <span className="material-symbols-outlined block">architecture</span>
              </span>
              MaterialHub
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-on-surface-variant font-medium hover:bg-surface-container-low transition-colors rounded-xl border border-outline-variant">
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Back to Home
            </Link>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold shadow-md hover:shadow-lg transition-all rounded-xl">
              <span className="material-symbols-outlined text-lg">support_agent</span>
              Contact Support
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-16">
        <section className="mb-10">
          <div className="bg-primary/5 border border-primary/20 p-5 rounded-xl flex items-center gap-4">
            <div className="bg-primary/10 p-2 rounded-full flex-shrink-0">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: `"FILL" 1` }}>info</span>
            </div>
            <div>
              <h2 className="font-bold text-on-surface">Account Under Review</h2>
              <p className="text-on-surface-variant text-sm">Our team is currently verifying your information. This typically takes 1-2 business days.</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <section className="md:col-span-12 lg:col-span-8">
            <div className="bg-surface-bright shadow-xl rounded-xl overflow-hidden border border-slate-100">
              <div className="px-10 py-8 flex justify-between items-center border-b border-slate-50">
                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">business</span>
                  Company Profile
                </h3>
                {showEdit && (
                  <button onClick={() => setIsEditOpen(true)} className="text-primary font-semibold text-sm hover:underline flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Edit
                  </button>
                )}
              </div>
              <div className="p-8">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <CompanyLogoBadge
                    logoUrl={me?.logoUrl}
                    name={me?.name}
                    hasBadge={me?.hasBadge}
                    size="md"
                  />
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                    <div>
                      <label className="block text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-1">Company Name</label>
                      <p className="text-on-surface font-medium">{me?.name || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-1">Email Address</label>
                      <p className="text-on-surface font-medium">{me?.owner?.email || me?.email || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-1">Contact Number</label>
                      <p className="text-on-surface font-medium">{(me?.countryCode || '') + (me?.phoneNumber ? ` ${me.phoneNumber}` : '')}</p>
                    </div>
                    {me?.website && (
                      <div>
                        <label className="block text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-1">Website URL</label>
                        <a href={me.website} target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline cursor-pointer break-words">{me.website.replace(/^https?:\/\//, '')}</a>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <label className="block text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-1">Physical Address</label>
                      <p className="text-on-surface font-medium">{me?.businessAddress || '—'}</p>
                    </div>
                    {me?.hasBadge && (
                      <div className="sm:col-span-2 flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <span className="material-symbols-outlined text-blue-600 text-xl" style={{ fontVariationSettings: `"FILL" 1` }}>verified</span>
                        <div>
                          <p className="text-sm font-semibold text-blue-900">Premium Badge</p>
                          <p className="text-xs text-blue-700">Your company has been awarded a premium badge</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Badge Section */}
          <section className="md:col-span-12">
            <div className="bg-blue-50 border border-blue-200 rounded-xl shadow p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-blue-600 text-3xl" style={{ fontVariationSettings: `"FILL" 1` }}>verified</span>
                  <div>
                    <h3 className="text-lg font-bold text-blue-900">Premium Badge Status</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      {me?.hasBadge
                        ? '✓ Your company has a premium badge. Users can see this badge on your company profile and products will appear at the top in search results.'
                        : 'Once the admin awards your company a premium badge, users will see it on your profile.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="md:col-span-12 lg:col-span-4">
            <div className="bg-surface-bright shadow-xl rounded-xl overflow-hidden border border-slate-100 flex flex-col h-full">
              <div className="px-8 py-8 flex justify-between items-center border-b border-slate-50">
                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">description</span>
                  Documents
                </h3>
                {showEdit && <button onClick={() => setIsEditOpen(true)} className="text-primary font-semibold text-sm hover:underline">Edit</button>}
              </div>
              <div className="p-8 flex-1 flex flex-col gap-4">
                <label className="block text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Legal Document (PAN/VAT)</label>
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant flex items-start gap-4">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    <span className="material-symbols-outlined text-red-500 text-3xl"></span>
                  </div>
                    <div className="overflow-hidden">
                      {(() => {
                        const url = me?.legalDocUrls?.[0] ?? legalUrls[0];
                        const name = url ? url.split('/').pop() ?? 'document' : (legalUrls[0] ? legalUrls[0].split('/').pop() : 'No document');
                        const ext = name.split('.').pop()?.toLowerCase() || '';
                        return (
                          <>
                            <div className="flex items-center gap-3">
                              {ext === 'pdf' ? (
                                <span className="material-symbols-outlined text-red-500 text-3xl"></span>
                              ) : (ext === 'png' || ext === 'jpg' || ext === 'jpeg') ? (
                                <img src={url ?? ''} alt={name} className="w-10 h-10 object-cover rounded" />
                              ) : (
                                <span className="material-symbols-outlined text-slate-500 text-3xl">insert_drive_file</span>
                              )}
                              <div>
                                <p className="text-sm font-bold text-on-surface truncate">{name}</p>
                                <p className="text-xs text-on-surface-variant mt-1">Uploaded: {url ? new Date().toLocaleDateString() : '—'}</p>
                              </div>
                            </div>
                            <div className="mt-3 flex gap-3">
                              {url && (
                                <>
                                  <a href={url} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary flex items-center gap-1"><span className="material-symbols-outlined text-sm">visibility</span> View</a>
                                  <a href={url} download className="text-xs font-bold text-primary flex items-center gap-1"><span className="material-symbols-outlined text-sm">download</span> Download</a>
                                </>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-12 flex justify-center border-t border-slate-100 pt-12">
          <Link href="/" className="flex items-center gap-3 px-8 py-4 bg-white border border-outline-variant text-on-surface font-bold rounded-xl shadow-sm hover:bg-surface transition-all group">
            <span className="material-symbols-outlined group-hover:translate-x-[-4px] transition-transform">home</span>
            Return to Home
          </Link>
        </div>
      </main>

      <footer className="mt-auto py-12 bg-surface text-center">
        <p className="text-on-surface-variant text-xs">© 2024 Azure Blueprint | Technical Architectural Solutions. All rights reserved.</p>
        <div className="flex justify-center gap-6 mt-4">
          <a className="text-xs text-on-surface-variant hover:text-primary" href="#">Privacy Policy</a>
          <a className="text-xs text-on-surface-variant hover:text-primary" href="#">Terms of Service</a>
          <a className="text-xs text-on-surface-variant hover:text-primary" href="#">Compliance</a>
        </div>
      </footer>

      {/* Edit modal - Registration page style */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto pt-8 pb-8">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between px-8 py-6 border-b border-slate-200 bg-white rounded-t-2xl">
              <h3 className="text-2xl font-bold text-slate-900">Edit Company</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-600 hover:text-slate-900 font-semibold">Close</button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="space-y-6">
                {/* Logo Upload Section */}
                <div>
                  <h4 className="text-lg font-semibold mb-4">Company Logo</h4>
                  <div className="border-2 border-dashed rounded-xl p-8 flex items-center justify-center bg-slate-50/50">
                    <div className="text-center w-full">
                      <div className="mb-2 text-slate-500">Click to upload or drag and drop</div>
                      <div className="text-xs text-slate-400">SVG, PNG, JPG (max. 2MB)</div>
                      <div className="mt-3 flex items-center justify-center gap-4">
                        <label className="inline-flex items-center gap-3 bg-white border px-4 py-2 rounded-lg cursor-pointer text-sm text-blue-600">
                          <span className="material-symbols-outlined"></span>
                          <span>Upload Logo</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                        </label>
                        {logoUrl && (
                          <div className="flex items-center gap-3">
                            <CompanyLogoBadge
                              logoUrl={logoUrl}
                              name={name}
                              hasBadge={me?.hasBadge}
                              size="sm"
                            />
                          </div>
                        )}
                      </div>
                      {logoUrl && (
                        <div className="mt-3 text-sm text-green-600 font-medium">Company logo added</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Company Info Section */}
                <div>
                  <h4 className="text-lg font-semibold mb-4">Company Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Company Name</label>
                      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter company name" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Website URL</label>
                      <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://www.example.com" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20" />
                    </div>
                  </div>
                </div>

                {/* Description Section */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Company Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Brief description of your company" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20" />
                </div>

                {/* Contact Information Section */}
                <div>
                  <h4 className="text-lg font-semibold mb-4">Contact Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Country Code</label>
                      <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20">
                        {COUNTRIES.map((c: any) => (
                          <option key={`${c.code}-${c.name}`} value={c.code}>{`${c.flag} ${c.name} ${c.code}`}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Phone Number</label>
                      <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="123 456 7890" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-semibold mb-2">Business Address</label>
                    <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} placeholder="Building, Street, City, ZIP Code" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20" />
                  </div>
                </div>

                {/* Owner Email Section */}
                <div>
                  <h4 className="text-lg font-semibold mb-4">Account Information</h4>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Owner Email</label>
                    <input value={ownerEmailLocal} readOnly disabled className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600" />
                    <div className="text-xs text-slate-500 mt-1">Read-only (managed by the account owner)</div>
                  </div>
                </div>

                {/* Legal Documents Section */}
                <div>
                  <h4 className="text-lg font-semibold mb-4">Legal Documents</h4>
                  <div className="border-2 border-dashed rounded-xl p-8 flex items-center justify-center bg-slate-50/50">
                    <div className="text-center w-full">
                      <div className="mb-2 text-slate-500">Click to upload multiple documents</div>
                      <div className="text-xs text-slate-400">Upload PAN Card, VAT Certificate, etc. (PDF, JPG, PNG)</div>
                      <label className="inline-flex items-center gap-3 bg-white border px-4 py-2 rounded-lg cursor-pointer text-sm text-blue-600 mt-3">
                        <span>Upload Documents</span>
                        <input type="file" accept=".pdf,.png,.jpg,.jpeg" multiple className="hidden" onChange={handleLegalChange} />
                      </label>
                    </div>
                  </div>
                  {legalUrls.length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm text-green-600 font-medium mb-3">Documents uploaded:</div>
                      <ul className="space-y-2">
                        {legalUrls.map((url, idx) => (
                          <li key={idx} className="text-green-700 flex items-center gap-3">
                            <span className="material-symbols-outlined text-red-500">picture_as_pdf</span>
                            <a href={url} target="_blank" rel="noreferrer" className="underline text-xs break-words flex-1">{url.split('/').pop()}</a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex items-center gap-3 justify-end">
                <button type="button" onClick={() => setIsEditOpen(false)} className="px-6 py-3 bg-white border border-slate-200 text-slate-900 font-semibold rounded-2xl hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={updateM.isPending} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-2xl hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50">
                  {updateM.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  if (statusLoading || meLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-3">Application Under Review</h2>
          <p className="text-sm text-slate-600 mb-6">Thank you for your interest in joining MaterialHub. Our team is currently verifying your company details and legal documents. This typically takes 1-2 business days.</p>

          <div className="bg-slate-50 border rounded-lg p-4 text-left mb-6">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">While you wait...</h4>
            <p className="text-sm text-slate-600 mt-2">Start preparing your product catalog in a CSV format. This will help you launch your storefront immediately once your application is approved. <a className="text-blue-600 underline" href="#">View Catalog Guidelines</a></p>
          </div>

          <div className="space-y-3">
            <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold">Contact Admin Support</button>
            <Link href="/" className="text-sm text-slate-600 inline-block">Return to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
