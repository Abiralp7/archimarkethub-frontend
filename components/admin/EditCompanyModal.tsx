'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Download, FileText, CheckCircle2, Check, ChevronDown, Save, Upload } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetCompany, adminUpdateCompanyStatus, adminUpdateCompany, adminUpdateCompanyAdminRating, adminUploadFile } from '@/lib/adminApi';
import { StarRating } from '@/components/StarRating';
import { COUNTRIES } from '@/lib/countries';

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
}

export default function EditCompanyModal({ isOpen, onClose, companyId }: EditCompanyModalProps) {
  const qc = useQueryClient();
  const [statusError, setStatusError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Editable fields
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [adminRating, setAdminRating] = useState(0);

  // logo & legal docs handling
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');

  const [legalFiles, setLegalFiles] = useState<File[]>([]);
  const [legalDocUrls, setLegalDocUrls] = useState<string[]>([]);
  const [legalUploadErrors, setLegalUploadErrors] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const legalInputRef = useRef<HTMLInputElement | null>(null);

  const { data: company, isLoading, isError } = useQuery({
    queryKey: ['admin', 'company', companyId],
    queryFn: () => adminGetCompany(companyId),
    enabled: isOpen && !!companyId,
  });

  // Populate edit fields when company data loads
  useEffect(() => {
    if (company) {
      setCompanyName(company.name || '');
      setWebsite(company.website || '');
      setDescription(company.description || '');
      setPhoneNumber(company.phoneNumber || '');
      setCountryCode(company.countryCode || '');
      setBusinessAddress(company.businessAddress || '');
      const ratingVal = company.adminRating ? parseFloat(String(company.adminRating)) : 0;
      setAdminRating(isNaN(ratingVal) ? 0 : ratingVal);

      setLogoUrl(company.logoUrl || '');
      setLegalDocUrls(company.legalDocUrls || []);
    }
  }, [company]);

  const updateStatusM = useMutation({
    mutationFn: async (newStatus: string) => {
      setStatusError(null);
      return adminUpdateCompanyStatus(companyId, newStatus);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'company', companyId] });
      await qc.invalidateQueries({ queryKey: ['admin', 'companies'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to update company status';
      setStatusError(msg);
    },
  });

  const updateDetailsM = useMutation({
    mutationFn: async () => {
      setUpdateError(null);
      return adminUpdateCompany(companyId, {
        name: companyName.trim() || null,
        website: website.trim() ? `${!website.startsWith('http') ? 'https://' : ''}${website.trim()}` : null,
        description: description.trim() || null,
        logoUrl: logoUrl || null,
        legalDocUrls: legalDocUrls.length ? legalDocUrls : null,
        phoneNumber: phoneNumber.trim() || null,
        countryCode: countryCode.trim() || null,
        businessAddress: businessAddress.trim() || null,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'company', companyId] });
      await qc.invalidateQueries({ queryKey: ['admin', 'companies'] });
      setIsEditing(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to update company details';
      setUpdateError(msg);
    },
  });

  const updateRatingM = useMutation({
    mutationFn: async () => {
      setRatingError(null);
      return adminUpdateCompanyAdminRating(companyId, adminRating);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'company', companyId] });
      await qc.invalidateQueries({ queryKey: ['admin', 'companies'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to update company rating';
      setRatingError(msg);
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Company Details</h2>
            <p className="text-slate-500 text-sm mt-1">View and manage company information.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading company details...</div>
          ) : isError ? (
            <div className="text-center py-8 text-rose-600">Failed to load company details.</div>
          ) : !company ? (
            <div className="text-center py-8 text-slate-500">Company not found.</div>
          ) : (
            <>
              {/* Editable Form */}
              <div className="space-y-6">
                {/* Logo */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Company Logo</label>
                  {isEditing ? (
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                        {logoPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logoPreview} alt="Logo preview" className="h-full w-full object-cover" />
                        ) : logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                        ) : (
                          <Upload className="h-6 w-6 text-slate-300" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
                          disabled={logoUploading || updateDetailsM.isPending}
                        >
                          {logoUploading ? 'Uploading…' : 'Change Logo'}
                        </button>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setLogoFile(file);
                            setLogoUploading(true);
                            try {
                              const res = await adminUploadFile({ file, purpose: 'COMPANY_LOGO' });
                              let url = res.url;
                              if (url && !/^https?:\/\//i.test(url) && typeof window !== 'undefined') {
                                url = window.location.origin + url;
                              }
                              setLogoUrl(url);
                              setLogoPreview(URL.createObjectURL(file));
                            } catch (err) {
                              console.error('Logo upload failed', err);
                            } finally {
                              setLogoUploading(false);
                            }
                          }}
                        />
                      </div>
                    </div>
                  ) : company.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={company.logoUrl} alt="Logo" className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <p className="text-slate-400">No logo</p>
                  )}
                </div>

                {/* Company Name */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Company Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-admin-primary/20"
                    />
                  ) : (
                    <p className="text-slate-700 dark:text-slate-300 font-semibold text-lg">{company.name}</p>
                  )}
                </div>

                {/* Website */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Website</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="example.com"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-admin-primary/20"
                    />
                  ) : company.website ? (
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-admin-primary hover:underline">
                      {company.website}
                    </a>
                  ) : (
                    <p className="text-slate-400">No website provided</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Description</label>
                  {isEditing ? (
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Company description..."
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-admin-primary/20 resize-none"
                    />
                  ) : company.description ? (
                    <p className="text-slate-700 dark:text-slate-300 break-words">{company.description}</p>
                  ) : (
                    <p className="text-slate-400">No description provided</p>
                  )}
                </div>

                {/* Owner Email */}
                {company.owner?.email && (
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Owner Email</label>
                    <p className="text-slate-700 dark:text-slate-300">{company.owner.email}</p>
                  </div>
                )}

                {/* Contact Information */}
                {isEditing && (
                  <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/50 dark:bg-slate-800/30">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Contact Information</label>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Country Code</label>
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="w-24 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-admin-primary/20 text-slate-900 dark:text-white appearance-none cursor-pointer"
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
                )}

                {!isEditing && (countryCode || phoneNumber || businessAddress) && (
                  <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/50 dark:bg-slate-800/30">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Contact Information</label>
                    {(countryCode || phoneNumber) && (
                      <div className="space-y-1">
                        <p className="text-slate-700 dark:text-slate-300">
                          <span className="font-semibold">Phone: </span>
                          {countryCode && <span>{countryCode} </span>}
                          {phoneNumber || '—'}
                        </p>
                      </div>
                    )}
                    {businessAddress && (
                      <div className="space-y-1">
                        <p className="text-slate-700 dark:text-slate-300">
                          <span className="font-semibold">Address:</span>
                        </p>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line text-sm">{businessAddress}</p>
                      </div>
                    )}
                  </div>
                )}

                {!isEditing && !countryCode && !phoneNumber && !businessAddress && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/50 dark:bg-slate-800/30">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">Contact Information</label>
                    <p className="text-slate-400 text-sm">No contact information provided</p>
                  </div>
                )}

                {/* Legal Documents */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Legal Documents
                  </label>

                  {isEditing && (
                    <>
                      <button
                        type="button"
                        onClick={() => legalInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50/30 cursor-pointer"
                        disabled={legalUploadErrors !== null || updateDetailsM.isPending}
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
                              const res = await adminUploadFile({ file: f, purpose: 'COMPANY_DOCS' });
                              let url = res.url;
                              if (url && !/^https?:\/\//i.test(url) && typeof window !== 'undefined') {
                                url = window.location.origin + url;
                              }
                              if (url) setLegalDocUrls((prev) => [...prev, url]);
                            } catch (err) {
                              console.error('Legal doc upload error', err);
                            }
                          }
                          // clear value so same file can be picked again
                          e.currentTarget.value = '';
                        }}
                      />

                      {legalUploadErrors && (
                        <div className="text-sm text-rose-600">{legalUploadErrors}</div>
                      )}

                      {/* existing documents (prior to editing) */}
                      {company.legalDocUrls && company.legalDocUrls.length > 0 && (
                        <div className="flex flex-col gap-2 mt-3">
                          {company.legalDocUrls.map((url: string, idx: number) => {
                            const fname = url.split('/').pop() || `Document ${idx + 1}`;
                            return (
                              <div
                                key={`existing-${idx}`}
                                className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 w-fit px-3 py-1.5 rounded-lg"
                              >
                                <a
                                  href={url}
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-sm font-medium text-blue-700 dark:text-blue-400"
                                >
                                  <FileText className="h-4 w-4" /> {fname}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLegalDocUrls((prev) => prev.filter((_, i) => i !== idx));
                                  }}
                                  className="ml-2 text-blue-400 hover:text-blue-600"
                                  disabled={updateDetailsM.isPending}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
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
                                disabled={updateDetailsM.isPending}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {!isEditing && company.legalDocUrls && company.legalDocUrls.length > 0 && (
                    <div className="space-y-2">
                      {company.legalDocUrls.map((url: string, idx: number) => {
                        const fileName = url.split('/').pop() || `Document ${idx + 1}`;
                        return (
                          <a
                            key={idx}
                            href={url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
                          >
                            <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-400 flex-1 break-all">
                              {fileName}
                            </span>
                            <Download className="h-4 w-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Admin Rating */}
                <div className="space-y-2 rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/50 dark:bg-slate-800/30">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Admin Rating</label>
                  {isEditing ? (
                    <div className="flex items-center gap-4">
                      <div className="flex gap-1.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              const newRating = i + 1;
                              setAdminRating(newRating);
                              // Trigger mutation after state is updated
                              setTimeout(() => {
                                adminUpdateCompanyAdminRating(companyId, newRating)
                                  .then(() => {
                                    qc.invalidateQueries({ queryKey: ['admin', 'company', companyId] });
                                    qc.invalidateQueries({ queryKey: ['admin', 'companies'] });
                                  })
                                  .catch((err: any) => {
                                    console.error('Failed to update rating:', err);
                                  });
                              }, 0);
                            }}
                            disabled={updateRatingM.isPending}
                            className="transition-all hover:scale-110 disabled:opacity-50"
                            title={`Rate ${i + 1} star${i + 1 !== 1 ? 's' : ''}`}
                          >
                            {i < adminRating ? (
                              <span className="text-2xl">⭐</span>
                            ) : (
                              <span className="text-2xl opacity-30">☆</span>
                            )}
                          </button>
                        ))}
                      </div>
                      <span className="text-sm text-slate-600 dark:text-slate-400 font-semibold min-w-12">{adminRating.toFixed(1)}/5</span>
                    </div>
                  ) : (
                    <StarRating rating={adminRating} size="md" />
                  )}
                  {ratingError && <p className="text-sm text-rose-600 dark:text-rose-400 mt-2">{ratingError}</p>}
                </div>

                {/* Created Date */}
                {company.createdAt && (
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Created Date</label>
                    <p className="text-slate-700 dark:text-slate-300">
                      {new Date(company.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                )}

                {/* Error Messages */}
                {updateError && <p className="text-sm text-rose-600 dark:text-rose-400">{updateError}</p>}

                {/* Edit/Save/Cancel Buttons */}
                {isEditing ? (
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setUpdateError(null);
                        // Reset to company values
                        if (company) {
                          setCompanyName(company.name || '');
                          setWebsite(company.website || '');
                          setDescription(company.description || '');
                          setPhoneNumber(company.phoneNumber || '');
                          setCountryCode(company.countryCode || '');
                          setBusinessAddress(company.businessAddress || '');
                          const ratingVal = company.adminRating ? parseFloat(String(company.adminRating)) : 0;
                          setAdminRating(isNaN(ratingVal) ? 0 : ratingVal);
                        }
                      }}
                      className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => updateDetailsM.mutate()}
                      disabled={updateDetailsM.isPending}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-admin-primary hover:bg-admin-primary/90 disabled:bg-slate-400 rounded-lg transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      {updateDetailsM.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full px-4 py-2.5 text-sm font-semibold text-admin-primary hover:bg-admin-primary/10 rounded-lg transition-colors"
                  >
                    Edit Company Info
                  </button>
                )}
              </div>

              {/* Legal Documents */}
              {company.legalDocUrls && company.legalDocUrls.length > 0 && (
                <div className="space-y-3">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Legal Documents
                  </label>
                  <div className="space-y-2">
                    {company.legalDocUrls.map((docUrl: string, idx: number) => {
                      const fileName = docUrl.split('/').pop() || `Document ${idx + 1}`;
                      return (
                        <a
                          key={idx}
                          href={docUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
                        >
                          <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-400 flex-1 break-all">
                            {fileName}
                          </span>
                          <Download className="h-4 w-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <div className="flex-1">
            {statusError && <p className="text-sm text-rose-600 dark:text-rose-400">{statusError}</p>}
          </div>
          <div className="flex items-center gap-3">
            {company?.status === 'PENDING' && (
              <button
                onClick={() => updateStatusM.mutate('VERIFIED')}
                disabled={updateStatusM.isPending}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 rounded-lg transition-colors"
              >
                <Check className="h-4 w-4" />
                {updateStatusM.isPending ? 'Updating...' : 'Verify Company'}
              </button>
            )}
            {company?.status === 'VERIFIED' && (
              <button
                onClick={() => updateStatusM.mutate('PENDING')}
                disabled={updateStatusM.isPending}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:bg-slate-400 rounded-lg transition-colors"
              >
                <ChevronDown className="h-4 w-4" />
                {updateStatusM.isPending ? 'Updating...' : 'Revert to Pending'}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
