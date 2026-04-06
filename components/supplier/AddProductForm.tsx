'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  onCreated: (product: any) => void;
  onCancel: () => void;
  categories: any[];
  product?: any; // For edit mode
}

function isValidImageType(file: File) {
  return /^image\/(png|jpeg|jpg|webp|gif)$/i.test(file.type);
}

function isValidCatalogType(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

export default function SupplierAddProductForm({ onCreated, onCancel, categories }: Props) {
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<'OUT_OF_STOCK' | 'IN_STOCK'>('OUT_OF_STOCK');

  const [newImages, setNewImages] = useState<File[]>([]);
  const [newCatalogues, setNewCatalogues] = useState<File[]>([]);

  const [imageUploads, setImageUploads] = useState<Array<any>>([]);
  const [catalogUploads, setCatalogUploads] = useState<Array<any>>([]);

  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [catalogUploadError, setCatalogUploadError] = useState<string | null>(null);

  const createM = useMutation({
    mutationFn: async () => {
      return supplierCreateProduct({
        name: name.trim(),
        description: description.trim() || undefined,
        price: price ? parseFloat(price) : undefined,
        categoryId: categoryId || undefined,
        status,
      });
    },
    onSuccess: async (data) => {
      // attach any uploaded images/catalogues
      try {
        if (imageUploads.length > 0) {
          for (const u of imageUploads) {
            const payload: any = {};
            if (u.assetId) payload.assetId = u.assetId;
            else if (u.url) payload.url = u.url;
            await supplierAddProductImage(data.id, payload);
          }
        }

        if (catalogUploads.length > 0) {
          for (const c of catalogUploads) {
            const payload: any = { title: c.title || 'Catalogue' };
            if (c.assetId) payload.assetId = c.assetId;
            else if (c.url) payload.fileUrl = c.url;
            if (c.fileType) payload.fileType = c.fileType;
            if (typeof c.fileSize === 'number') payload.fileSize = c.fileSize;
            await supplierAddProductCatalogue(data.id, payload);
          }
        }
      } catch (err) {
        console.error('Attach uploads failed', err);
      }

      // refresh lists
      await qc.invalidateQueries({ queryKey: ['supplier', 'products'] });
      await qc.invalidateQueries({ queryKey: ['supplier', 'product', data.id] });
      onCreated(data);
    },
    onError: (err: any) => {
      alert('Failed to create product: ' + (err?.message || 'Unknown'));
    },
  });

  async function uploadImage(file: File) {
    setImageUploadError(null);
    if (!isValidImageType(file)) {
      setImageUploadError('Invalid image type');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageUploadError('Image too large (max 5MB)');
      return;
    }

    try {
      const res = await adminUploadFile({ file, purpose: 'PRODUCT_IMAGE' });
      setImageUploads((cur) => [...cur, { assetId: res.assetId, url: res.url }]);
    } catch (err: any) {
      setImageUploadError(err?.message || 'Upload failed');
    }
  }

  async function uploadCatalog(file: File) {
    setCatalogUploadError(null);
    if (!isValidCatalogType(file)) {
      setCatalogUploadError('Catalog must be a PDF');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setCatalogUploadError('Catalogue too large (max 20MB)');
      return;
    }

    try {
      const res = await adminUploadFile({ file, purpose: 'PRODUCT_CATALOG' });
      setCatalogUploads((cur) => [...cur, { assetId: res.assetId, url: res.url, fileType: res.fileType, fileSize: res.fileSize, title: file.name }]);
    } catch (err: any) {
      setCatalogUploadError(err?.message || 'Upload failed');
    }
  }

  const canSubmit = !!name.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        createM.mutate();
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-semibold text-slate-900 mb-2">Product Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Premium Marble Tile"
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-900 mb-2">Price (Optional)</label>
        <input
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select category (optional)</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="OUT_OF_STOCK">Out of stock</option>
            <option value="IN_STOCK">In Stock</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-900 mb-2">Description (Optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your product..."
          rows={4}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">Product Images</label>
          <label className="group block rounded-lg border-2 border-dashed border-slate-200 bg-white p-6 text-center cursor-pointer">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                for (const f of files) {
                  setNewImages((cur) => [...cur, f]);
                  uploadImage(f);
                }
                e.currentTarget.value = '';
              }}
              className="sr-only"
            />
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xl">+</div>
              <div className="text-sm text-slate-600">Click to upload or drag and drop</div>
              <div className="text-xs text-slate-400">PNG, JPG, WebP (max 5MB per file)</div>
            </div>
          </label>

          {imageUploadError && <div className="text-rose-600 text-xs mt-2">{imageUploadError}</div>}

          {newImages.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-3">
              {newImages.map((f, idx) => {
                const url = URL.createObjectURL(f);
                return (
                  <div key={idx} className="relative rounded overflow-hidden border border-slate-100">
                    <img src={url} alt={f.name} className="w-full h-24 object-cover" />
                    <button
                      onClick={() => setNewImages((cur) => cur.filter((_, i) => i !== idx))}
                      type="button"
                      className="absolute top-1 right-1 bg-white p-1 rounded text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">Product Catalogues</label>
          <label className="group block rounded-lg border-2 border-dashed border-slate-200 bg-white p-6 text-center cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                for (const f of files) {
                  setNewCatalogues((cur) => [...cur, f]);
                  uploadCatalog(f);
                }
                e.currentTarget.value = '';
              }}
              className="sr-only"
            />
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center text-slate-500">⬆</div>
              <div className="text-sm text-slate-600">Click to upload</div>
              <div className="text-xs text-slate-400">PDF (Max 20MB)</div>
            </div>
          </label>

          {catalogUploadError && <div className="text-rose-600 text-xs mt-2">{catalogUploadError}</div>}

          {newCatalogues.length > 0 && (
            <div className="mt-3 space-y-2">
              {newCatalogues.map((f, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-slate-100">
                  <span className="truncate text-sm text-slate-700">{f.name}</span>
                  <button
                    onClick={() => setNewCatalogues((cur) => cur.filter((_, i) => i !== idx))}
                    className="text-xs text-rose-600 hover:underline"
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-slate-200 text-slate-900 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit || createM.isPending}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          {createM.isPending ? 'Creating…' : 'Create Product'}
        </button>
      </div>
    </form>
  );
}
