'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { X, Upload, FileText, ChevronDown, Check, Image as ImageIcon, Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminCreateProduct, adminUploadFile, adminCompanies, getCategories } from '@/lib/adminApi';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId?: string | null;
}

function toAbsoluteUrl(url?: string) {
  if (!url) return undefined;
  
  // If already a full URL, return as-is
  if (/^https?:\/\//i.test(url)) return url;
  
  // Extract just the relative path if it's an absolute Windows/Linux path
  let relativePath = url;
  // Match paths like C:\\Users\\... or /H:/Projects/... or /home/...
  const uploadsMatch = url.match(/[\\\/]uploads[\\\/]/i);
  if (uploadsMatch) {
    const index = url.toLowerCase().indexOf('uploads');
    if (index !== -1) {
      relativePath = url.substring(index);
    }
  }
  
  // Normalize backslashes to forward slashes
  relativePath = relativePath.replaceAll('\\', '/');

  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:5000";

  const path = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return `${base}${path}`;
}

function isValidImageType(file: File) {
  return /^image\/(png|jpeg|jpg|webp|gif)$/i.test(file.type);
}

function isValidCatalogType(file: File) {
  return file.type === 'application/pdf';
}

export default function AddProductModal({ isOpen, onClose, companyId: initialCompanyId }: AddProductModalProps) {
  const qc = useQueryClient();

  // Form state
  const [companyId, setCompanyId] = useState(initialCompanyId || '');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'OUT_OF_STOCK' | 'IN_STOCK' | 'ARCHIVED'>('OUT_OF_STOCK');
   // category
   const [categoryId, setCategoryId] = useState('');
  const [defaultImageIdx, setDefaultImageIdx] = useState<number>(0);

  // Image state
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // Catalog state
  const [catalogFile, setCatalogFile] = useState<File | null>(null);
  const [catalogUrl, setCatalogUrl] = useState<string | undefined>(undefined);

  // Error states
  const [imageUploadErrors, setImageUploadErrors] = useState<string | null>(null);
  const [catalogUploadErrors, setCatalogUploadErrors] = useState<string | null>(null);

  // Refs
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const catalogInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch companies for dropdown (only active, not deleted)
  const { data: companiesData } = useQuery({
    queryKey: ['admin', 'companies', 'all'],
    queryFn: () => adminCompanies({ take: 100, deleted: 'active' }),
    enabled: isOpen,
  });
  // Fetch categories for dropdown
  const { data: categoriesData } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => getCategories(),
    enabled: isOpen,
    refetchOnMount: 'always',
  });

  const companies = Array.isArray(companiesData)
    ? companiesData
    : companiesData?.items || companiesData?.data || [];
  const categories = categoriesData || [];

  // Set company ID when modal opens with initialCompanyId
  useEffect(() => {
    if (isOpen && initialCompanyId) {
      setCompanyId(initialCompanyId);
    }
  }, [isOpen, initialCompanyId]);

  // Manage image previews
  useEffect(() => {
    const newPreviews: string[] = [];
    imageFiles.forEach((file) => {
      const url = URL.createObjectURL(file);
      newPreviews.push(url);
    });
    setImagePreviews(newPreviews);

    return () => {
      newPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageFiles]);

  // Upload single image
  const uploadImageM = useMutation({
    mutationFn: async (file: File) => {
      return adminUploadFile({ file, purpose: 'PRODUCT_IMAGE' });
    },
    onSuccess: (res) => {
      const url = toAbsoluteUrl(res.url);
      if (url) {
        setImageUrls((prev) => [...prev, url]);
      }
    },
  });

  // Upload single catalog
  const uploadCatalogM = useMutation({
    mutationFn: async (file: File) => {
      return adminUploadFile({ file, purpose: 'PRODUCT_CATALOG' });
    },
    onSuccess: (res) => {
      setCatalogUrl(toAbsoluteUrl(res.url));
    },
  });

  // Create product
  const createProductM = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: name.trim(),
        description: description.trim() ? description.trim() : undefined,
        price: price ? parseFloat(price) : undefined,
        status,
        companyId,
        categoryId: categoryId || undefined,
      };

      return adminCreateProduct(payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      handleClose(true);
    },
  });

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false;
    if (!companyId) return false;
    return true;
  }, [name, companyId]);

  const isUploading =
    uploadImageM.isPending || uploadCatalogM.isPending;

  function resetAll() {
    setCompanyId('');
    setName('');
    setPrice('');
    setDescription('');
    setStatus('OUT_OF_STOCK');

    setImageFiles([]);
    setImagePreviews([]);
    setImageUrls([]);
    setDefaultImageIdx(0);

    setCatalogFile(null);
    setCatalogUrl(undefined);

    setImageUploadErrors(null);
    setCatalogUploadErrors(null);

    uploadImageM.reset();
    uploadCatalogM.reset();
    createProductM.reset();
  }

  function handleClose(reset = false) {
    uploadImageM.reset();
    uploadCatalogM.reset();
    createProductM.reset();
    onClose();
    if (reset) resetAll();
  }

  function onPickImages(files: FileList | null) {
    if (!files?.length) return;

    setImageUploadErrors(null);
    const picked = Array.from(files);

    // Validate each file
    for (const f of picked) {
      if (!isValidImageType(f)) {
        setImageUploadErrors(`Invalid file type: ${f.name} (allowed: PNG, JPG, WebP, GIF)`);
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        setImageUploadErrors(`File too large: ${f.name} (max 5MB)`);
        return;
      }
    }

    // Add files and upload
    setImageFiles((prev) => [...prev, ...picked]);
    for (const f of picked) {
      uploadImageM.mutate(f);
    }
  }

  function removeImage(idx: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
    if (defaultImageIdx === idx) {
      setDefaultImageIdx(0);
    } else if (defaultImageIdx > idx) {
      setDefaultImageIdx(defaultImageIdx - 1);
    }
  }

  function onPickCatalog(files: FileList | null) {
    if (!files?.length) return;
    const f = files[0];

    if (!isValidCatalogType(f)) {
      setCatalogUploadErrors('Catalog must be PDF.');
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setCatalogUploadErrors('Catalog must be <= 20MB.');
      return;
    }

    setCatalogFile(f);
    setCatalogUrl(undefined);
    uploadCatalogM.mutate(f);
  }

  function removeCatalog() {
    setCatalogFile(null);
    setCatalogUrl(undefined);
    catalogUploadErrors && setCatalogUploadErrors(null);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create New Product</h2>
            <p className="text-slate-500 text-sm mt-1">Set up the product profile, media, and technical documents.</p>
          </div>
          <button
            onClick={() => !createProductM.isPending && handleClose(false)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Form Body */}
        <div className="px-8 py-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Select Company & Name */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Parent Company *</label>
              <div className="relative">
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full appearance-none px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 outline-none focus:ring-2 focus:ring-admin-primary/20 dark:text-white"
                  disabled={createProductM.isPending || isUploading || !!initialCompanyId}
                >
                  <option value="">Select a company...</option>
                  {companies.map((company: any) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Category (optional)</label>
              <div className="relative">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full appearance-none px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 outline-none focus:ring-2 focus:ring-admin-primary/20 dark:text-white"
                  disabled={createProductM.isPending}
                >
                  <option value="">Select a category...</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Product Name *</label>
              <input
                type="text"
                placeholder="e.g. CloudFlow Pro"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 outline-none focus:ring-2 focus:ring-admin-primary/20 dark:text-white"
                disabled={createProductM.isPending}
              />
            </div>
          </div>

          {/* Price & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Price (Optional)</label>
              <input
                type="number"
                placeholder="e.g. 99.99"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                step="0.01"
                min="0"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 outline-none focus:ring-2 focus:ring-admin-primary/20 dark:text-white"
                disabled={createProductM.isPending}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</label>
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full appearance-none px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 outline-none focus:ring-2 focus:ring-admin-primary/20 dark:text-white"
                  disabled={createProductM.isPending}
                >
                  <option value="OUT_OF_STOCK">Out of stock</option>
                  <option value="IN_STOCK">In Stock</option>
                  <option value="ARCHIVED">Archive</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Product Description (Optional)</label>
            <textarea
              rows={3}
              placeholder="Describe the product's key features and value proposition..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 outline-none focus:ring-2 focus:ring-admin-primary/20 dark:text-white resize-none"
              disabled={createProductM.isPending}
            />
          </div>

          {/* Product Gallery */}
          <div className="space-y-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Product Gallery (Images)</label>

            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50/30 cursor-pointer hover:bg-slate-100/50 transition-colors disabled:opacity-60"
              disabled={isUploading || createProductM.isPending}
            >
              <div className="h-10 w-10 bg-white dark:bg-slate-800 rounded-lg shadow-sm flex items-center justify-center mb-3">
                <Plus className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Click to upload or drag and drop</p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG, WebP (max. 5MB per file)</p>
            </button>

            <input
              ref={imageInputRef}
              type="file"
              multiple
              className="hidden"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              onChange={(e) => {
                onPickImages(e.target.files);
                e.currentTarget.value = "";
              }}
              disabled={isUploading || createProductM.isPending}
            />

            {imageUploadErrors && (
              <div className="text-[11px] font-semibold text-rose-600">{imageUploadErrors}</div>
            )}

            {uploadImageM.isError && (
              <div className="text-[11px] font-semibold text-rose-600">
                Image upload failed. Ensure you POST to <b>/uploads/file</b> with purpose <b>PRODUCT_IMAGE</b>.
              </div>
            )}

            {imageFiles.length > 0 && (
              <div className="grid grid-cols-4 gap-3">
                {imageFiles.map((f, idx) => (
                  <div
                    key={`${f.name}-${idx}`}
                    className={`relative aspect-square rounded-xl border-2 overflow-hidden group cursor-pointer transition-all ${
                      defaultImageIdx === idx
                        ? 'border-admin-primary ring-2 ring-admin-primary/20'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                    onClick={() => setDefaultImageIdx(idx)}
                  >
                    {imagePreviews[idx] && (
                      <img
                        src={imagePreviews[idx]}
                        alt={f.name}
                        className="w-full h-full object-cover"
                      />
                    )}

                    {defaultImageIdx === idx && (
                      <div className="absolute top-1 right-1 bg-admin-primary text-white rounded-full p-0.5 z-10">
                        <Check className="h-3 w-3" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                      {imageUrls[idx] && (
                        <span className="text-white text-[10px] font-bold uppercase">Uploaded</span>
                      )}
                      {uploadImageM.isPending && (
                        <span className="text-white text-[10px] font-bold uppercase">Uploading…</span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(idx);
                        }}
                        className="text-rose-400 hover:text-rose-300 text-[10px] font-bold uppercase underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {imageUrls.length > 0 && (
              <p className="text-[11px] text-slate-400">
                Uploaded: <span className="font-semibold">{imageUrls.length}</span>
              </p>
            )}
          </div>

          {/* Product Catalog */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Product Catalog (PDF - Optional)</label>

            {!catalogFile ? (
              <button
                type="button"
                onClick={() => catalogInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50/30 cursor-pointer hover:bg-slate-100/50 transition-colors disabled:opacity-60"
                disabled={isUploading || createProductM.isPending}
              >
                <Upload className="h-5 w-5 text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Click to upload</p>
                <p className="text-[11px] text-slate-400 mt-1">PDF (Max 20MB)</p>
              </button>
            ) : (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-lg p-3 flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">{catalogFile.name}</p>
                  {catalogUrl && (
                    <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1">
                      <Check className="h-3 w-3" /> Uploaded
                    </p>
                  )}
                  {uploadCatalogM.isPending && (
                    <p className="text-[11px] text-slate-400 mt-1">Uploading…</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={removeCatalog}
                  className="text-slate-400 hover:text-slate-600 p-1"
                  disabled={isUploading || createProductM.isPending}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <input
              ref={catalogInputRef}
              type="file"
              className="hidden"
              accept=".pdf,application/pdf"
              onChange={(e) => {
                onPickCatalog(e.target.files);
                e.currentTarget.value = "";
              }}
              disabled={isUploading || createProductM.isPending}
            />

            {catalogUploadErrors && (
              <div className="text-[11px] font-semibold text-rose-600">{catalogUploadErrors}</div>
            )}

            {uploadCatalogM.isError && (
              <div className="text-[11px] font-semibold text-rose-600">
                Catalog upload failed. Ensure you POST to <b>/uploads/file</b> with purpose <b>PRODUCT_CATALOG</b>.
              </div>
            )}
          </div>

          {createProductM.isError && (
            <div className="text-xs font-bold text-rose-600">
              Failed to create product. Please check all required fields are filled.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <button
            onClick={() => !createProductM.isPending && handleClose(false)}
            className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-60"
            disabled={createProductM.isPending}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => createProductM.mutate()}
            disabled={!canSubmit || createProductM.isPending || isUploading}
            className="px-6 py-2.5 text-sm font-bold bg-admin-primary text-white rounded-lg shadow-md hover:bg-admin-primary/90 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {createProductM.isPending ? 'Creating…' : isUploading ? 'Uploading…' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  );
}
