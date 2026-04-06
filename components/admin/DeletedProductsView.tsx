'use client';

import { useState } from 'react';
import { Search, Filter, RotateCcw, Trash2, Eye } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import EditProductModal from '@/components/admin/EditProductModal';
import { adminProducts, adminRestoreProduct, adminDeleteProduct, adminPermanentDeleteProduct } from '@/lib/adminApi';
import { userVisibleProductStatus, productStatusColor } from '@/lib/productStatus';

function formatDate(input?: string): string {
  if (!input) return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

function pickLogoColor(seed: string): string {
  const classes = [
    'bg-blue-100 text-blue-700',
    'bg-amber-100 text-amber-700',
    'bg-purple-100 text-purple-700',
    'bg-emerald-100 text-emerald-700',
    'bg-rose-100 text-rose-700',
    'bg-orange-100 text-orange-700',
    'bg-slate-100 text-slate-700',
    'bg-indigo-100 text-indigo-700',
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return classes[hash % classes.length];
}

export default function DeletedProductsView() {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: productsData, isLoading, isError } = useQuery({
    queryKey: ['admin', 'products', 'deleted', searchQuery],
    queryFn: () =>
      adminProducts({
        q: searchQuery || undefined,
        deleted: 'deleted',
        take: 100,
      }),
  });

  const restoreProductM = useMutation({
    mutationFn: async (productId: string) => {
      return adminRestoreProduct(productId);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      setRestoreConfirm(null);
    },
  });

  const deleteProductM = useMutation({
    mutationFn: async (productId: string) => {
      // use permanent endpoint instead of soft-delete to truly remove
      return adminPermanentDeleteProduct(productId);
    },
    onSuccess: async (res, productId: string) => {
      // refetch list and invalidate active products cache
      await qc.refetchQueries({ queryKey: ['admin', 'products', 'deleted', searchQuery] });
      await qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      setDeleteConfirm(null);
      // locally remove the deleted id if present
      qc.setQueryData(['admin', 'products', 'deleted', searchQuery], (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) return old.filter((p) => p.id !== productId);
        const items = old.items || old.data?.items || [];
        const filtered = items.filter((p: any) => p.id !== productId);
        if (old.items) return { ...old, items: filtered };
        if (old.data && old.data.items) return { ...old, data: { ...old.data, items: filtered } };
        return old;
      });
    },
  });

  const allProducts = Array.isArray(productsData)
    ? productsData
    : (productsData?.items || productsData?.data || []);

  const filteredProducts = allProducts;

  const productPendingRestore =
    restoreConfirm ? filteredProducts.find((p: any) => p.id === restoreConfirm) : null;
  const productCompanyDeleted = !!productPendingRestore?.company?.deletedAt;

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Deleted Products
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Review and restore deleted product listings.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 rounded-lg text-sm font-semibold">
                {filteredProducts.length} Deleted
              </span>
            </div>
          </div>

          {/* Search & Filter same style as deleted companies */}
          <div className="mt-6 flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search deleted products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-admin-primary dark:text-white"
              />
            </div>
            <button className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <Filter className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Deleted Products Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mt-6 mx-8 max-w-[1600px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Company</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Deleted Date</th>
                  <th className="px-6 py-3">Deleted By</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td className="px-6 py-6 text-slate-400" colSpan={7}>
                      Loading deleted products…
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td className="px-6 py-6 text-rose-600" colSpan={7}>
                      Failed to load deleted products.
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-slate-400" colSpan={7}>
                      No deleted products found.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product: any) => {
                    const logoColor = pickLogoColor(product.id || product.name);
                    const companyName = product.company?.name || 'Unknown';

                    return (
                      <tr
                        key={product.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold text-sm ${logoColor}`}>
                              {product.name?.[0]?.toUpperCase() || 'P'}
                            </div>
                            <div className="font-medium text-slate-900 dark:text-white">
                              {product.name}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                          {companyName}
                        </td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${productStatusColor(product.status)}`}>
                            {userVisibleProductStatus(product.status)}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                          {product.category || '-'}
                        </td>

                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                          {formatDate(product.deletedAt)}
                        </td>

                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                          {product.deletedBy || '-'}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setSelectedProductId(product.id)}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors group"
                              title="View details"
                            >
                              <Eye className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                            </button>
                            <button 
                              onClick={() => setRestoreConfirm(product.id)}
                              className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors group"
                              disabled={restoreProductM.isPending || deleteProductM.isPending}
                              title="Restore product"
                            >
                              <RotateCcw className="h-4 w-4 text-emerald-500 group-hover:text-emerald-600" />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirm(product.id)}
                              className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors group"
                              disabled={restoreProductM.isPending || deleteProductM.isPending}
                              title="Permanently delete product"
                            >
                              <Trash2 className="h-4 w-4 text-rose-500 group-hover:text-rose-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      {/* Restore Confirmation Dialog */}
      {restoreConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 max-w-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Restore Product?</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
              This product will be restored and visible again in active products.
            </p>

            {/* Frontend pre-validation: product's company is deleted */}
            {productCompanyDeleted && (
              <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-sm text-rose-700 dark:text-rose-400">
                <p className="font-semibold">Cannot restore product</p>
                <p className="mt-1 text-xs">The company associated with this product is deleted. Please restore the company first.</p>
              </div>
            )}

            {/* Server-side error (falls back to backend message if present) */}
            {restoreProductM.isError && (
              <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-sm text-rose-700 dark:text-rose-400">
                <p className="font-semibold">Cannot restore product</p>
                <p className="mt-1 text-xs">
                  {((restoreProductM.error as any)?.response?.data?.message || (restoreProductM.error as any)?.message || '').includes('company is deleted')
                    ? 'The company associated with this product is deleted. Please restore the company first.'
                    : (restoreProductM.error as any)?.response?.data?.message || (restoreProductM.error as any)?.message || 'An error occurred.'}
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => setRestoreConfirm(null)}
                disabled={restoreProductM.isPending}
                className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => restoreProductM.mutate(restoreConfirm)}
                disabled={restoreProductM.isPending || restoreProductM.isError || productCompanyDeleted}
                className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 rounded-lg transition-colors"
              >
                {restoreProductM.isPending ? 'Restoring...' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 max-w-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Permanently Delete Product?</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
              This action cannot be undone. The product will be permanently removed from the system.
            </p>

            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleteProductM.isPending}
                className="px-4 py-2 text-sm font-bold text-slate-600 dark=text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteProductM.mutate(deleteConfirm)}
                disabled={deleteProductM.isPending}
                className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 rounded-lg transition-colors"
              >
                {deleteProductM.isPending ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedProductId && (
        <EditProductModal 
          isOpen={!!selectedProductId} 
          onClose={() => setSelectedProductId(null)}
          productId={selectedProductId}
        />
      )}
    </main>
  );
}
