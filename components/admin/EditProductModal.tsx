'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Download, FileText, Edit2, Trash2, Plus, Check, Image as ImageIcon, Save } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetProduct, adminUpdateProduct, adminDeleteProduct, adminUploadFile, adminUpdateProductAdminRating, getCategories } from '@/lib/adminApi';
import { StarRating } from '@/components/StarRating';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
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
  
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:5000';
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${base}${path}`;
}

function isValidImageType(file: File) {
  return /^image\/(png|jpeg|jpg|webp|gif)$/i.test(file.type);
}

function isValidCatalogType(file: File) {
  return file.type === 'application/pdf';
}

export default function EditProductModal({ isOpen, onClose, productId }: EditProductModalProps) {
  const qc = useQueryClient();
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState<'OUT_OF_STOCK' | 'IN_STOCK' | 'ARCHIVED'>('OUT_OF_STOCK');
  const [adminRating, setAdminRating] = useState(0);
  const [categoryId, setCategoryId] = useState('');

  // Images state
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);

  // Catalogs state
  const [catalogs, setCatalogs] = useState<Array<{ title?: string; fileUrl: string; fileType?: string }>>([]);
  const [uploadedCatalogUrl, setUploadedCatalogUrl] = useState<string | null>(null);
  const [catalogFileName, setCatalogFileName] = useState('');

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const catalogInputRef = useRef<HTMLInputElement | null>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ['admin', 'product', productId],
    queryFn: () => adminGetProduct(productId),
    enabled: isOpen && !!productId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => getCategories(),
    enabled: isOpen,
    refetchOnMount: 'always',
  });

  // Populate form when product loads
  useEffect(() => {
    if (product && isOpen) {
      setName(product.name || '');
      setDescription(product.description || '');
      setPrice(product.price ? String(product.price) : '');
      setStatus(product.status || 'OUT_OF_STOCK');
      const ratingVal = product.adminRating ? parseFloat(String(product.adminRating)) : 0;
      setAdminRating(isNaN(ratingVal) ? 0 : ratingVal);
      setImageUrls(product.images?.map((img: any) => img.url) || []);
      setCatalogs(product.catalogs || []);
      setCategoryId(product.category?.id || '');
      setIsEditMode(false);
      setNewImageFiles([]);
      setNewImagePreviews([]);
      setUploadedImageUrls([]);
      setUploadedCatalogUrl(null);
      setCatalogFileName('');
    }
  }, [product, isOpen]);

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

  const uploadImageM = useMutation({
    mutationFn: async (file: File) => {
      return adminUploadFile({ file, purpose: 'PRODUCT_IMAGE' });
    },
  });

  const uploadCatalogM = useMutation({
    mutationFn: async (file: File) => {
      return adminUploadFile({ file, purpose: 'PRODUCT_CATALOG' });
    },
  });

  const updateProductM = useMutation({
    mutationFn: async () => {
      // Combine existing and newly uploaded images
      const allImageUrls = [...imageUrls, ...uploadedImageUrls];
      // Combine existing and newly uploaded catalogs
      const allCatalogs = [
        ...catalogs,
        ...(uploadedCatalogUrl ? [{ title: catalogFileName, fileUrl: uploadedCatalogUrl, fileType: 'pdf' }] : [])
      ];

      const updatePayload: any = {
        name: name.trim(),
        description: description.trim() || undefined,
        price: price ? parseFloat(price) : null,
        status,
        imageUrls: allImageUrls,
        catalogs: allCatalogs,
        categoryId: categoryId,
      };
      return adminUpdateProduct(productId, updatePayload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'product', productId] });
      await qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      setIsEditMode(false);
    },
  });

  const deleteProductM = useMutation({
    mutationFn: async () => {
      return adminDeleteProduct(productId);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      onClose();
    },
  });

  const updateRatingM = useMutation({
    mutationFn: async () => {
      return adminUpdateProductAdminRating(productId, adminRating);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'product', productId] });
      await qc.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });

  const handleAddImages = async (files: FileList | null) => {
    if (!files) return;
    const picked = Array.from(files);

    for (const file of picked) {
      if (!isValidImageType(file)) {
        alert(`Invalid file type: ${file.name}`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`File too large: ${file.name}`);
        return;
      }
    }

    setNewImageFiles((prev) => [...prev, ...picked]);

    // Upload each
    for (const file of picked) {
      try {
        const res = await uploadImageM.mutateAsync(file);
        const url = toAbsoluteUrl(res.url);
        if (url) {
          setUploadedImageUrls((prev) => [...prev, url]);
        }
      } catch {
        alert(`Failed to upload ${file.name}`);
      }
    }
  };

  const handleAddCatalog = async (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];

    if (!isValidCatalogType(file)) {
      alert('Only PDF files allowed');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File too large (max 10MB)');
      return;
    }

    try {
      const res = await uploadCatalogM.mutateAsync(file);
      const url = toAbsoluteUrl(res.url);
      if (url) {
        setUploadedCatalogUrl(url);
        setCatalogFileName(file.name);
      }
    } catch {
      alert('Failed to upload catalog');
    }
  };

  const removeImage = (idx: number) => {
    if (idx < imageUrls.length) {
      setImageUrls((prev) => prev.filter((_, i) => i !== idx));
    } else {
      const newIdx = idx - imageUrls.length;
      setNewImageFiles((prev) => prev.filter((_, i) => i !== newIdx));
      setNewImagePreviews((prev) => prev.filter((_, i) => i !== newIdx));
      setUploadedImageUrls((prev) => {
        const updated = [...prev];
        updated.splice(newIdx, 1);
        return updated;
      });
    }
  };

  const removeCatalog = (idx: number) => {
    if (idx < catalogs.length) {
      setCatalogs((prev) => prev.filter((_, i) => i !== idx));
    } else {
      setUploadedCatalogUrl(null);
      setCatalogFileName('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Product Details</h2>
            <p className="text-slate-500 text-sm mt-1">
              {isEditMode ? 'Edit product information.' : 'View and manage product details.'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={updateProductM.isPending || deleteProductM.isPending}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading product details...</div>
          ) : !product ? (
            <div className="text-center py-8 text-slate-500">Product not found.</div>
          ) : (
            <>
              {/* Name */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Product Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditMode}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={!isEditMode}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">-- none --</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!isEditMode}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed resize-none"
                />
              </div>

              {/* Price & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    disabled={!isEditMode}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    disabled={!isEditMode}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                      <option value="OUT_OF_STOCK">Out of stock</option>
                    <option value="IN_STOCK">In Stock</option>
                    <option value="ARCHIVED">Archive</option>
                  </select>
                </div>
              </div>

              {/* Admin Rating */}
              <div className="space-y-2 rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/50 dark:bg-slate-800/30">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Admin Rating</label>
                {isEditMode ? (
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
                              adminUpdateProductAdminRating(productId, newRating)
                                .then(() => {
                                  qc.invalidateQueries({ queryKey: ['admin', 'product', productId] });
                                  qc.invalidateQueries({ queryKey: ['admin', 'products'] });
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
              </div>

              {/* Images */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Images</label>
                  {isEditMode && (
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-admin-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                      disabled={uploadImageM.isPending}
                    >
                      <Plus className="h-3 w-3" /> Add Image
                    </button>
                  )}
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleAddImages(e.target.files)}
                  className="hidden"
                  disabled={!isEditMode}
                />

                <div className="grid grid-cols-4 gap-3">
                  {[...imageUrls, ...uploadedImageUrls].map((url, idx) => {
                    const absoluteUrl = toAbsoluteUrl(url);
                    return (
                    <div key={idx} className="relative group">
                      <img src={absoluteUrl} alt={`Product ${idx}`} className="w-full h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
                      {isEditMode && (
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>

              {/* Catalogs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Catalogs (PDF)</label>
                  {isEditMode && !uploadedCatalogUrl && (
                    <button
                      onClick={() => catalogInputRef.current?.click()}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-admin-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                      disabled={uploadCatalogM.isPending}
                    >
                      <Plus className="h-3 w-3" /> Add Catalog
                    </button>
                  )}
                </div>
                <input
                  ref={catalogInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleAddCatalog(e.target.files)}
                  className="hidden"
                  disabled={!isEditMode}
                />

                <div className="space-y-2">
                  {[...catalogs, ...(uploadedCatalogUrl ? [{ title: catalogFileName, fileUrl: uploadedCatalogUrl, fileType: 'pdf' }] : [])].map((cat, idx) => {
                    const absoluteUrl = toAbsoluteUrl(cat.fileUrl);
                    return (
                    <a
                      key={idx}
                      href={absoluteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
                    >
                      <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-400 flex-1 break-all">
                        {cat.title || cat.fileUrl.split('/').pop() || `Catalog ${idx + 1}`}
                      </span>
                      <Download className="h-4 w-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      {isEditMode && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            removeCatalog(idx);
                          }}
                          className="ml-2 text-rose-600 hover:text-rose-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </a>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <div>
            {deleteConfirm && (
              <p className="text-sm text-rose-600 dark:text-rose-400">Are you sure? This action cannot be undone.</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {deleteConfirm ? (
              <>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  disabled={deleteProductM.isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteProductM.mutate()}
                  disabled={deleteProductM.isPending}
                  className="px-4 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 rounded-lg transition-colors"
                >
                  {deleteProductM.isPending ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </>
            ) : (
              <>
                {isEditMode && (
                  <button
                    onClick={() => setIsEditMode(false)}
                    className="px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                )}
                {isEditMode ? (
                  <button
                    onClick={() => updateProductM.mutate()}
                    disabled={updateProductM.isPending}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 rounded-lg transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    {updateProductM.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-admin-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit Product
                  </button>
                )}
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
