'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus } from 'lucide-react';
import {
  supplierCreateProduct,
  supplierUpdateProduct,
  supplierAddProductImage,
  supplierDeleteProductImage,
  supplierAddProductCatalogue,
  supplierDeleteProductCatalogue,
  adminUploadFile,
} from '@/lib/adminApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  productId?: string;
  categories: any[];
  existingProduct?: any;
}

function isValidImageType(file: File) {
  return /^image\/(png|jpeg|jpg|webp|gif)$/i.test(file.type);
}

function isValidCatalogType(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function toAbsoluteUrl(url?: string) {
  if (!url) return undefined;
  // If already a full URL, return as-is
  if (/^https?:\/\//i.test(url)) return url;
  
  // Extract just the relative path if it's an absolute Windows/Linux path
  let relativePath = url;
  // Match paths like C:\Users\... or /H:/Projects/... or /home/...
  const uploadsMatch = url.match(/[\\\/]uploads[\\\/]/i);
  if (uploadsMatch) {
    const index = url.toLowerCase().indexOf('uploads');
    if (index !== -1) {
      relativePath = url.substring(index);
    }
  }
  
  // Normalize backslashes to forward slashes
  relativePath = relativePath.replaceAll('\\', '/');
  
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";
  const path = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return `${base}${path}`;
}

export default function SupplierProductForm({
  isOpen,
  onClose,
  mode,
  productId,
  categories,
  existingProduct,
}: Props) {
  const qc = useQueryClient();

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<'OUT_OF_STOCK' | 'IN_STOCK' | 'ARCHIVED'>('OUT_OF_STOCK');

  // Image state
  const [existingImages, setExistingImages] = useState<any[]>([]); // Existing images with id+url
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]); // Newly selected
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]); // Preview URLs
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]); // Uploaded

  // Catalog state
  const [catalogs, setCatalogs] = useState<any[]>([]); // Existing catalogs (objects with id,fileUrl,title)
  const [uploadedCatalogs, setUploadedCatalogs] = useState<
    Array<{ title?: string; fileUrl?: string; assetId?: string; fileType?: string | null; fileSize?: number | null }>
  >([]);
  const [catalogFileName, setCatalogFileName] = useState('');

  // Error states
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [catalogUploadError, setCatalogUploadError] = useState<string | null>(null);

  // Refs
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const catalogInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize form for edit mode
  useEffect(() => {
    if (isOpen && mode === 'edit' && existingProduct) {
      setName(existingProduct.name || '');
      setPrice(existingProduct.price ? String(existingProduct.price) : '');
      setDescription(existingProduct.description || '');
      setCategoryId(existingProduct.category?.id || existingProduct.categoryId || '');
      setStatus(existingProduct.status || 'OUT_OF_STOCK');
      setExistingImages(existingProduct.images || []);
      setCatalogs(existingProduct.catalogs || []);
      setNewImageFiles([]);
      setNewImagePreviews([]);
      setUploadedImageUrls([]);
      setUploadedCatalogs([]);
      setCatalogFileName('');
    } else if (isOpen && mode === 'create') {
      setName('');
      setPrice('');
      setDescription('');
      setCategoryId('');
      setStatus('OUT_OF_STOCK');
      setExistingImages([]);
      setNewImageFiles([]);
      setNewImagePreviews([]);
      setUploadedImageUrls([]);
      setCatalogs([]);
      setUploadedCatalogs([]);
      setCatalogFileName('');
    }
  }, [isOpen, mode, existingProduct]);

  // clear catalog metadata when modal closes
  useEffect(() => {
    if (!isOpen) {
      setUploadedCatalogs([]);
    }
  }, [isOpen]);

  // Manage new image previews
  useEffect(() => {
    const previews: string[] = [];
    newImageFiles.forEach((file) => {
      const url = URL.createObjectURL(file);
      previews.push(url);
    });
    setNewImagePreviews(previews);
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newImageFiles]);

  // Upload image mutation
  const uploadImageM = useMutation({
    mutationFn: async (file: File) => {
      return adminUploadFile({ file, purpose: 'PRODUCT_IMAGE' });
    },
  });

  // Upload catalog mutation
  const uploadCatalogM = useMutation({
    mutationFn: async (file: File) => {
      return adminUploadFile({ file, purpose: 'PRODUCT_CATALOG' });
    },
    // onSuccess handled by caller to include original File metadata
    onSuccess: () => {},
  });

  // Create/update product mutation (and attach media)
  const submitM = useMutation({
    mutationFn: async () => {
      if (mode === 'create') {
        return supplierCreateProduct({
          name: name.trim(),
          description: description.trim() || undefined,
          price: price ? parseFloat(price) : undefined,
          categoryId: categoryId || undefined,
          status,
        });
      } else {
        return supplierUpdateProduct(productId!, {
          name: name.trim(),
          description: description.trim() || undefined,
          price: price ? parseFloat(price) : undefined,
          categoryId: categoryId,
          status,
        });
      }
    },
    onSuccess: async (data) => {
      // Now attach images and catalogs
      try {
        // Attach uploaded images
        for (const url of uploadedImageUrls) {
          await supplierAddProductImage(data.id, { url });
        }

        // Attach uploaded catalogs (support multiple uploaded catalogs)
        const catalogErrors: string[] = [];
        for (const cat of uploadedCatalogs) {
          // validate metadata presence; if missing, skip and record error
          if (!cat.fileType || typeof cat.fileSize !== 'number') {
            catalogErrors.push(`Catalog ${cat.title || cat.fileUrl || ''} missing metadata (type or size)`);
            continue;
          }

          try {
            await supplierAddProductCatalogue(data.id, {
              title: cat.title || 'Catalogue',
              fileUrl: cat.fileUrl || undefined,
              assetId: cat.assetId || undefined,
              fileType: cat.fileType,
              fileSize: cat.fileSize as number,
            });
          } catch (err: any) {
            console.error('catalog attach error', err);
            const msg = err?.message || err?.response?.data?.message || 'Unknown';
            catalogErrors.push(`Failed to attach ${cat.title || cat.fileUrl || ''}: ${msg}`);
          }
        }

        if (catalogErrors.length > 0) {
          // surface a single consolidated message instead of multiple alerts
          throw new Error('Catalog attach errors: ' + catalogErrors.join('; '));
        }

        // Refresh queries
        await qc.invalidateQueries({ queryKey: ['supplier', 'products'] });
        await qc.invalidateQueries({ queryKey: ['supplier', 'product', data.id] });
        
        onClose();
      } catch (err: any) {
        console.error('Failed to attach images/catalogs:', err);
        const msg = err?.message || err?.response?.data?.message || 'Unknown';
        alert('Product saved but failed to attach some media: ' + msg);
      }
    },
    onError: (err: any) => {
      alert('Failed to save product: ' + (err?.message || 'Unknown'));
    },
  });

  const handleAddImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setImageUploadError(null);
    const picked = Array.from(files);

    // Validate
    for (const file of picked) {
      if (!isValidImageType(file)) {
        setImageUploadError(`Invalid file type: ${file.name}`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setImageUploadError(`File too large: ${file.name} (max 5MB)`);
        return;
      }
    }

    // Add to files
    setNewImageFiles((prev) => [...prev, ...picked]);

    // Upload each sequentially; remove from newImageFiles when uploaded so previews update
    for (const file of picked) {
      try {
        const res = await uploadImageM.mutateAsync(file);
        const url = toAbsoluteUrl(res.url);
        if (url) {
          setUploadedImageUrls((prev) => [...prev, url]);
        }
        // remove this file from pending newImageFiles so its preview is removed
        setNewImageFiles((prev) => prev.filter((f) => f !== file));
      } catch (err) {
        setImageUploadError(`Failed to upload ${file.name}`);
        // remove failed file from pending list as well
        setNewImageFiles((prev) => prev.filter((f) => f !== file));
      }
    }
  };

  const handleAddCatalog = async (files: FileList | null) => {
    if (!files?.length) return;
    setCatalogUploadError(null);
    const file = files[0];

    if (!isValidCatalogType(file)) {
      setCatalogUploadError('Only PDF files are allowed');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setCatalogUploadError('File too large (max 20MB)');
      return;
    }

    try {
      const res = await uploadCatalogM.mutateAsync(file);
      const url = toAbsoluteUrl(res.url);
      const entry: any = { title: file.name };
      if (url) entry.fileUrl = url;
      if (res.assetId) entry.assetId = res.assetId;
      entry.fileType = file.type || res.fileType || null;
      entry.fileSize = file.size || res.fileSize || null;
      setUploadedCatalogs((prev) => [...prev, entry]);
      setCatalogFileName(file.name);
    } catch (err) {
      setCatalogUploadError(`Failed to upload ${file.name}`);
    }
  };

  const removeImage = async (idx: number) => {
    // If index is within existingImages, delete via API
    const E = existingImages.length;
    const U = uploadedImageUrls.length;
    if (idx < E) {
      const image = existingImages[idx];
      if (!productId) {
        // just remove locally if no productId available
        setExistingImages((prev) => prev.filter((_, i) => i !== idx));
        return;
      }
      try {
        await supplierDeleteProductImage(productId, image.id);
        setExistingImages((prev) => prev.filter((_, i) => i !== idx));
      } catch (err) {
        console.error('Failed to delete image', err);
        alert('Failed to delete image');
      }
    } else if (idx < E + U) {
      // Remove from uploaded images (not yet attached to product)
      const uploadedIdx = idx - E;
      setUploadedImageUrls((prev) => prev.filter((_, i) => i !== uploadedIdx));
    } else {
      // Remove pending local preview
      const newIdx = idx - E - U;
      setNewImageFiles((prev) => prev.filter((_, i) => i !== newIdx));
      setNewImagePreviews((prev) => prev.filter((_, i) => i !== newIdx));
    }
  };

  const removeCatalog = async (idx: number) => {
    const existingCount = catalogs.length;
    const uploadedCount = uploadedCatalogs.length;

    if (idx < existingCount) {
      // delete existing catalog on server
      const cat = catalogs[idx];
      if (!productId) {
        setCatalogs((prev) => prev.filter((_, i) => i !== idx));
        return;
      }
      try {
        await supplierDeleteProductCatalogue(productId, cat.id);
        setCatalogs((prev) => prev.filter((_, i) => i !== idx));
      } catch (err) {
        console.error('Failed to delete catalog', err);
        alert('Failed to delete catalog');
      }
    } else if (idx < existingCount + uploadedCount) {
      // remove one of the uploaded-but-not-attached catalogs
      const uploadedIdx = idx - existingCount;
      setUploadedCatalogs((prev) => prev.filter((_, i) => i !== uploadedIdx));
      // clear filename if it matched
      setCatalogFileName('');
    } else {
      // nothing
    }
  };

  if (!isOpen) return null;

  const allImageUrls = [...existingImages.map((i) => i.url), ...uploadedImageUrls, ...newImagePreviews];
  const allCatalogs = [
    ...catalogs,
    ...uploadedCatalogs.map((c) => ({ title: c.title || catalogFileName || 'Catalogue', fileUrl: c.fileUrl })),
  ];

  const canSubmit = name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {mode === 'create' ? 'Create Product' : 'Edit Product'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {mode === 'create'
                ? 'Set up your product profile, media, and technical documents.'
                : 'Update product information and media.'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitM.isPending}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors disabled:opacity-60"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Form Body */}
        <div className="px-8 py-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Name & Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Product Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Premium Marble Tile"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Price (Optional)
              </label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              >
                <option value="">Select category (optional)</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              >
                  <option value="OUT_OF_STOCK">Out of stock</option>
                  <option value="IN_STOCK">In Stock</option>
                  <option value="ARCHIVED">Archive</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your product..."
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
            />
          </div>

          {/* Images */}
          <div className="space-y-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Product Images
            </label>

            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50/30 dark:bg-slate-800/30 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="h-10 w-10 bg-white dark:bg-slate-800 rounded-lg shadow-sm flex items-center justify-center mb-3">
                <Plus className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG, WebP (max 5MB per file)</p>
            </button>

            <input
              ref={imageInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => {
                handleAddImages(e.target.files);
                e.currentTarget.value = '';
              }}
              className="hidden"
            />

            {imageUploadError && (
              <div className="text-xs font-semibold text-rose-600">{imageUploadError}</div>
            )}

            {allImageUrls.length > 0 && (
              <div className="grid grid-cols-4 gap-3">
                {allImageUrls.map((url, idx) => {
                  const absoluteUrl = toAbsoluteUrl(url);
                  return (
                  <div key={idx} className="relative aspect-square rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden group">
                    <img
                      src={absoluteUrl}
                      alt={`Image ${idx}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="text-rose-400 hover:text-rose-300 text-xs font-bold uppercase underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Catalogs */}
          <div className="space-y-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Product Catalog (PDF - Optional)
            </label>

            <button
              type="button"
              onClick={() => catalogInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50/30 dark:bg-slate-800/30 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="text-3xl mb-2">📄</div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Click to upload</p>
              <p className="text-xs text-slate-400 mt-1">PDF (Max 20MB)</p>
            </button>

            <input
              ref={catalogInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => {
                handleAddCatalog(e.target.files);
                e.currentTarget.value = '';
              }}
              className="hidden"
            />

            {catalogUploadError && (
              <div className="text-xs font-semibold text-rose-600">{catalogUploadError}</div>
            )}

            {allCatalogs.length > 0 && (
              <div className="space-y-2">
                {allCatalogs.map((cat: any, idx: number) => {
                  const absoluteUrl = toAbsoluteUrl(cat.fileUrl);
                  return (
                  <a
                    key={idx}
                    href={absoluteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-lg p-3 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">📋</span>
                      <div>
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                          {cat.title || 'Catalogue'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        removeCatalog(idx);
                      }}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <button
            onClick={onClose}
            disabled={submitM.isPending}
            className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => submitM.mutate()}
            disabled={!canSubmit || submitM.isPending}
            className="px-6 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitM.isPending ? (mode === 'create' ? 'Creating…' : 'Saving…') : mode === 'create' ? 'Create Product' : 'Save Product'}
          </button>
        </div>
      </div>
    </div>
  );
}
