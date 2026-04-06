'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { X, Upload, FileText, ChevronDown, Mail, CheckCircle2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminCreateCompany, adminUploadFile } from '@/lib/adminApi';
import { COUNTRIES } from '@/lib/countries';

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type UiStatus = 'Pending Review' | 'Verified';

function normalizeWebsite(input: string) {
  const v = input.trim();
  if (!v) return undefined;
  if (!/^https?:\/\//i.test(v)) return `https://${v}`;
  return v;
}

function toAbsoluteUrl(url?: string) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url; // already absolute

  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:5000";

  // handle "/uploads/x.png" and "uploads/x.png"
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
}


function isValidEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email.trim());
}

function isAllowedLegalType(file: File) {
  const t = file.type;
  return t === 'application/pdf' || /^image\/(png|jpeg|jpg)$/i.test(t);
}

export default function AddCompanyModal({ isOpen, onClose }: AddCompanyModalProps) {
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [ownerEmail, setOwnerEmail] = useState(''); // UI-only (not in backend dto)
  const [status, setStatus] = useState<UiStatus>('Pending Review'); // UI-only (not in backend dto)
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  const [legalFiles, setLegalFiles] = useState<File[]>([]);
  const [legalDocUrls, setLegalDocUrls] = useState<string[]>([]); // ✅ uploaded legal docs public URLs
  const [legalUploadErrors, setLegalUploadErrors] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const legalInputRef = useRef<HTMLInputElement | null>(null);

  // logo preview cleanup
  useEffect(() => {
    if (!logoFile) return;
    const u = URL.createObjectURL(logoFile);
    setLogoPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [logoFile]);

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false;
    if (ownerEmail.trim() && !isValidEmail(ownerEmail)) return false;
    return true;
  }, [name, ownerEmail]);

  // ✅ Upload logo
  const uploadLogoM = useMutation({
    mutationFn: async (file: File) => {
      // Must be multipart with fields: file + purpose
      return adminUploadFile({ file, purpose: 'COMPANY_LOGO' });
    },
    onSuccess: (res) => {
      setLogoUrl(toAbsoluteUrl(res.url));
},

  });

  // ✅ Upload ONE legal doc
  const uploadOneLegalDocM = useMutation({
    mutationFn: async (file: File) => {
      return adminUploadFile({ file, purpose: 'COMPANY_DOCS' });
    },
    onSuccess: (res) => {
      const url = toAbsoluteUrl(res.url);
      if (url) {
        setLegalDocUrls((prev) => [...prev, url]);
      }
    },
  });

  // ✅ Create company (includes logoUrl + legalDocUrls if your backend supports it)
  const createCompanyM = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: name.trim(),
        description: description.trim() ? description.trim() : undefined,
        website: normalizeWebsite(website),
        logoUrl: logoUrl || undefined,
        // IMPORTANT: backend must have this field in CreateCompanyDto, otherwise remove it
        legalDocUrls: legalDocUrls.length ? legalDocUrls : undefined,
        phoneNumber: phoneNumber.trim() ? phoneNumber.trim() : undefined,
        countryCode: countryCode.trim() ? countryCode.trim() : undefined,
        businessAddress: businessAddress.trim() ? businessAddress.trim() : undefined,
      };

      return adminCreateCompany(payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'companies'] });
      await qc.invalidateQueries({ queryKey: ['admin', 'companies', 'pendingCount'] });

      handleClose(true);
    },
  });

  const uploadsPending =
    uploadLogoM.isPending || uploadOneLegalDocM.isPending;

  function resetAll() {
    setName('');
    setWebsite('');
    setDescription('');
    setOwnerEmail('');
    setStatus('Pending Review');
    setPhoneNumber('');
    setCountryCode('');
    setBusinessAddress('');

    setLogoFile(null);
    setLogoPreview(null);
    setLogoUrl(undefined);

    setLegalFiles([]);
    setLegalDocUrls([]);
    setLegalUploadErrors(null);

    uploadLogoM.reset();
    uploadOneLegalDocM.reset();
    createCompanyM.reset();
  }

  function handleClose(reset = false) {
    uploadLogoM.reset();
    uploadOneLegalDocM.reset();
    createCompanyM.reset();
    onClose();
    if (reset) resetAll();
  }

  function onPickLogo(files: FileList | null) {
    if (!files?.length) return;
    const f = files[0];

    if (!/^image\/(png|jpeg|jpg)$/i.test(f.type)) {
      alert('Logo must be PNG/JPG.');
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      alert('Logo must be <= 2MB.');
      return;
    }

    setLogoFile(f);
    setLogoUrl(undefined);
    uploadLogoM.mutate(f);
  }

  async function onPickLegalFiles(files: FileList | null) {
    if (!files) return;

    setLegalUploadErrors(null);

    const picked = Array.from(files);

    // client-side checks
    for (const f of picked) {
      if (!isAllowedLegalType(f)) {
        setLegalUploadErrors(`Invalid file type: ${f.name} (allowed: PDF, PNG, JPG)`);
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        setLegalUploadErrors(`File too large: ${f.name} (max 10MB)`);
        return;
      }
    }

    // add to UI list
    setLegalFiles((prev) => [...prev, ...picked]);

    // upload each file
    // (simple approach: fire mutations one-by-one)
    for (const f of picked) {
      uploadOneLegalDocM.mutate(f);
    }
  }

  function removeLegalFile(idx: number) {
    // Remove from UI list
    setLegalFiles((prev) => prev.filter((_, i) => i !== idx));

    // Best-effort: remove corresponding uploaded URL by index
    // NOTE: This assumes upload order matches selection order.
    // If you want 1:1 mapping reliably, store {fileName,url} pairs.
    setLegalDocUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative z-[10000] bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add New Company</h2>
            <p className="text-slate-500 text-sm mt-1">Fill in the profile and legal details for the new listing.</p>
          </div>
          <button
            onClick={() => !createCompanyM.isPending && handleClose(false)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Form Body */}
        <div className="px-8 py-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Logo */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
              Company Logo (Optional)
            </label>

            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="Logo preview" className="h-full w-full object-cover" />
                ) : (
                  <Upload className="h-6 w-6 text-slate-300" />
                )}
              </div>

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
                  disabled={uploadLogoM.isPending || createCompanyM.isPending}
                >
                  {uploadLogoM.isPending ? 'Uploading…' : 'Upload New Logo'}
                </button>

                <input
                  ref={logoInputRef}
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={(e) => onPickLogo(e.target.files)}
                />

                <p className="text-[11px] text-slate-400">PNG, JPG up to 2MB. Square ratio recommended.</p>

                {logoUrl && (
                  <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Logo uploaded
                  </div>
                )}

                {uploadLogoM.isError && (
                  <div className="text-[11px] font-semibold text-rose-600">
                    Logo upload failed. Ensure you POST to <b>/uploads/file</b> with purpose <b>COMPANY_LOGO</b>.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Name & Website */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Company Name</label>
              <input
                type="text"
                placeholder="e.g. Acme Corp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 outline-none focus:ring-2 focus:ring-admin-primary/20"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Website</label>
              <input
                type="text"
                placeholder="acme.com or https://acme.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 outline-none focus:ring-2 focus:ring-admin-primary/20"
              />
              {website.trim() && !/^https?:\/\//i.test(website.trim()) && (
                <p className="text-[11px] text-slate-400">
                  Will be saved as: <span className="font-semibold">{`https://${website.trim()}`}</span>
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Company Description</label>
            <textarea
              rows={3}
              placeholder="Describe the company's core business, vision, and services..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 outline-none focus:ring-2 focus:ring-admin-primary/20 resize-none"
            />
          </div>

          {/* Contact Information */}
          <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/50 dark:bg-slate-800/30">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Contact Information</label>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Country Code</label>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-admin-primary/20 text-slate-900 dark:text-white appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    paddingRight: '36px',
                  }}
                >
                  <option value="">Select country code</option>
                  {COUNTRIES.map((country, idx) => (
                    <option key={`${country.code}-${idx}`} value={country.code}>
                      {country.flag} {country.code} - {country.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 1-800-000-0000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-admin-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Business Address</label>
              <textarea
                rows={2}
                placeholder="Enter the full business address..."
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-admin-primary/20 resize-none"
              />
            </div>
          </div>

          {/* UI-only fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Owner Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="admin@company.com"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-400">Not saved yet (no backend field).</p>
              {ownerEmail.trim() && !isValidEmail(ownerEmail) && (
                <p className="text-[11px] font-semibold text-rose-600">Enter a valid email.</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Initial Status</label>
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as UiStatus)}
                  className="w-full appearance-none px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 outline-none"
                >
                  <option>Pending Review</option>
                  <option>Verified</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-400">Not saved yet (no backend field).</p>
            </div>
          </div>

          {/* Legal docs */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Company Legal Documents
            </label>

            <button
    type="button"
    onClick={() => legalInputRef.current?.click()}
    className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50/30 cursor-pointer"
    disabled={uploadsPending || createCompanyM.isPending}
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
    onChange={(e) => {
      onPickLegalFiles(e.target.files);
      // ✅ important: allow re-selecting the same file again later
      e.currentTarget.value = "";
    }}
  />

            {legalUploadErrors && (
              <div className="text-[11px] font-semibold text-rose-600">{legalUploadErrors}</div>
            )}

            {uploadOneLegalDocM.isError && (
              <div className="text-[11px] font-semibold text-rose-600">
                Legal doc upload failed. Ensure you POST to <b>/uploads/file</b> with purpose <b>COMPANY_DOCS</b>.
              </div>
            )}

            {legalFiles.length > 0 && (
              <div className="flex flex-col gap-2 mt-3">
                {legalFiles.map((f, idx) => (
                  <div
                    key={`${f.name}-${idx}`}
                    className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 w-fit px-3 py-1.5 rounded-lg"
                  >
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-400">{f.name}</span>

                    {legalDocUrls[idx] ? (
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 ml-2">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded
                      </span>
                    ) : uploadOneLegalDocM.isPending ? (
                      <span className="text-[11px] text-slate-400 ml-2">Uploading…</span>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => removeLegalFile(idx)}
                      className="ml-2 text-blue-400 hover:text-blue-600"
                      disabled={uploadsPending || createCompanyM.isPending}
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                <p className="text-[11px] text-slate-400">
                  Uploaded docs: <span className="font-semibold">{legalDocUrls.length}</span>
                  {legalFiles.length ? ` / selected: ${legalFiles.length}` : ''}
                </p>
              </div>
            )}
          </div>

          {createCompanyM.isError && (
            <div className="text-xs font-bold text-rose-600">
              Failed to create company. (Most common cause: website/logoUrl not valid URLs)
            </div>
          )}

          {/* Debug info (optional) */}
          {/* <pre className="text-xs text-slate-400">{JSON.stringify({ logoUrl, legalDocUrls }, null, 2)}</pre> */}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50">
          <button
            onClick={() => !createCompanyM.isPending && handleClose(false)}
            className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            disabled={createCompanyM.isPending}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => createCompanyM.mutate()}
            disabled={!canSubmit || createCompanyM.isPending || uploadsPending}
            className="px-6 py-2.5 text-sm font-bold bg-admin-primary text-white rounded-lg shadow-md hover:bg-admin-primary/90 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {createCompanyM.isPending ? 'Creating…' : uploadsPending ? 'Uploading…' : 'Create Company'}
          </button>
        </div>
      </div>
    </div>
  );
}
