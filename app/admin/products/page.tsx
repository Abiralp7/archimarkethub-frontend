'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Search, Edit2, Trash2, Eye } from 'lucide-react';
import AddProductModal from '@/components/admin/AddProductModal';
import EditProductModal from '@/components/admin/EditProductModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { adminProducts, adminDeleteProduct } from '@/lib/adminApi';
import { StarRating } from '@/components/StarRating';

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

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const companyId = searchParams?.get('companyId');
  const qc = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: productsData, isLoading, isError } = useQuery({
    queryKey: ['admin', 'products', { companyId, searchQuery, deleted: 'active' }],
    queryFn: () => adminProducts({ 
      q: searchQuery || undefined, 
      companyId: companyId || undefined,
      deleted: 'active',
      take: 100 
    }),
  });

  const deleteProductM = useMutation({
    mutationFn: async (productId: string) => {
      return adminDeleteProduct(productId);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      setDeleteConfirm(null);
    },
  });



  const allProducts = Array.isArray(productsData) 
    ? productsData 
    : (productsData?.items || productsData?.data || []);
  
  const filteredProducts = allProducts;

  return (
    <div className="flex flex-col min-h-screen">

      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark">
        {/* Page Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  {companyId ? 'Company Products' : 'Products Management'}
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  {companyId ? 'All products for this company.' : 'Manage and organize your product listings and documentation.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {companyId && (
                  <Link
                    href="/admin/companies"
                    className="px-4 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold transition-colors"
                  >
                    ← Back to Companies
                  </Link>
                )}
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-admin-primary text-white rounded-lg font-semibold hover:bg-admin-primary/90 transition-colors shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add New Product
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 max-w-[1600px] mx-auto">
          {/* Search Bar Row */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 p-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by product, company, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-admin-primary dark:text-white"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                    <th className="px-6 py-3">Product</th>
                    <th className="px-6 py-3">Company</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Rating</th>
                    <th className="px-6 py-3">Created Date</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoading ? (
                    <tr>
                      <td className="px-6 py-6 text-slate-400" colSpan={5}>
                        Loading products…
                      </td>
                    </tr>
                  ) : isError ? (
                    <tr>
                      <td className="px-6 py-6 text-rose-600" colSpan={5}>
                        Failed to load products.
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td className="px-6 py-6 text-slate-400" colSpan={5}>
                        No products found.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product: any) => {
                      const logoColor = pickLogoColor(product.id || product.name);
                      const companyName = product.company?.name || 'Unknown';

                      return (
                        <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold text-sm ${logoColor}`}>
                                {product.name?.[0]?.toUpperCase() || 'P'}
                              </div>
                              <span className="font-medium text-slate-900 dark:text-white">{product.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{companyName}</td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{product.status || '-'}</td>
                          <td className="px-6 py-4">
                            <StarRating rating={product.adminRating || 0} size="sm" />
                          </td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{formatDate(product.createdAt)}</td>
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
                                onClick={() => setDeleteConfirm(product.id)}
                                className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors group"
                                title="Delete product"
                              >
                                <Trash2 className="h-4 w-4 text-rose-400 group-hover:text-rose-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              {filteredProducts.length === 0 && (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                  No products found matching your search.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 max-w-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Product?</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
              This product will be moved to deleted items. You can restore it later.
            </p>
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleteProductM.isPending}
                className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteProductM.mutate(deleteConfirm)}
                disabled={deleteProductM.isPending}
                className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 rounded-lg transition-colors"
              >
                {deleteProductM.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AddProductModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        companyId={companyId || undefined}
      />

      {selectedProductId && (
        <EditProductModal 
          isOpen={!!selectedProductId} 
          onClose={() => setSelectedProductId(null)}
          productId={selectedProductId}
        />
      )}
    </div>
  );
}