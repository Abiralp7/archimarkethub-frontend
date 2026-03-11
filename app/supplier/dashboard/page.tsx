'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  supplierGetMe,
  supplierGetProducts,
  supplierDeleteProduct,
  getCategories,
  companyAnalyticsTop,
} from '@/lib/adminApi';
import SupplierNotificationsDropdown from '@/components/supplier/SupplierNotificationsDropdown';
import SupplierProductForm from '@/components/supplier/SupplierProductForm';
import { logout } from '@/lib/auth';
import { Plus, LogOut, Trash2, Edit2, FileText, X, Settings } from 'lucide-react';

type Tab = 'overview' | 'products' | 'reviews' | 'analytics';

export default function SupplierDashboardPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [supplier, setSupplier] = useState<any>(null);
  const [docsOpen, setDocsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  
  // Product form modal state
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productFormMode, setProductFormMode] = useState<'create' | 'edit'>('create');
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<any>(null);

  // fetch supplier profile; poll every 5 seconds so that status changes propagate in near-real time
  const supplierQ = useQuery(
    ['supplier', 'me'],
    supplierGetMe,
    {
      retry: false,
      refetchInterval: 5000,
      onError: () => {
        // if we cannot load the profile, treat as unauthenticated
        router.push('/supplier-login');
      },
      onSuccess: (data) => {
        const status = data?.status?.toUpperCase();
        if (status === 'VERIFIED' || status === 'APPROVED') {
          setSupplier(data);
        } else {
          // any other status should send user to the application status screen
          // include query flag so the application-status page opens the edit modal immediately
          router.push('/supplier/application-status?edit=true');
        }
      },
    }
  );

  // Track loading state for initial auth check
  useEffect(() => {
    if (!supplierQ.isLoading) {
      setIsCheckingAuth(false);
    }
  }, [supplierQ.isLoading]);

  // keep local supplier state in sync with query
  useEffect(() => {
    if (supplierQ.data) {
      setSupplier(supplierQ.data);
    }
  }, [supplierQ.data]);


  // Fetch products list
  const productsQ = useQuery({
    queryKey: ['supplier', 'products'],
    queryFn: async () => {
      const res = await supplierGetProducts({
        deleted: 'active',
        take: 100,
      });
      return res;
    },
    enabled: !!supplier?.id,
  });

  // Categories (for product form)
  const categoriesQ = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      return await getCategories();
    },
    // make sure we always have fresh list when component mounts
    refetchOnMount: 'always',
  });

  // Delete product mutation (for dashboard table)
  const deleteProductM = useMutation({
    mutationFn: async (productId: string) => {
      return supplierDeleteProduct(productId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier', 'products'] });
    },
    onError: (err: any) => {
      alert('Error deleting product: ' + (err.message || 'Unknown error'));
    },
  });

  // supplier analytics: top products in last week
  const topQ = useQuery({
    queryKey: ['supplier', 'analytics', 'top'],
    queryFn: () => companyAnalyticsTop({ entityType: 'product', eventType: 'view', days: 7, take: 10 }),
    enabled: !!supplier?.id,
  });

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const openProductModal = (product: any, mode: 'create' | 'edit') => {
    setProductFormMode(mode);
    if (mode === 'edit') {
      setSelectedProductForEdit(product);
    } else {
      setSelectedProductForEdit(null);
    }
    setIsProductFormOpen(true);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!supplier) {
    return null;
  }

  // if status changed mid-session, show a temporary banner (redirection handled in query)
  const normalizedStatus = supplier.status?.toUpperCase();
  const isUnapproved = normalizedStatus && normalizedStatus !== 'VERIFIED' && normalizedStatus !== 'APPROVED';

  const products = Array.isArray(productsQ.data)
    ? productsQ.data
    : productsQ.data?.items || [];
  const totalViews = products.reduce((sum: number, p: any) => sum + (p.viewCount || 0), 0);
  const avgRating =
    products.length > 0
      ? (
          products.reduce((sum: number, p: any) => {
            // Prefer adminRating if set, otherwise use avgRating
            const rating = (p.adminRating && p.adminRating > 0) ? p.adminRating : p.avgRating;
            return sum + (rating || 0);
          }, 0) / products.length
        ).toFixed(1)
      : '0';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/supplier/dashboard" className="flex items-center gap-2 text-blue-600 hover:opacity-80 transition-opacity">
            {supplier?.logoUrl ? (
              <img src={supplier.logoUrl} alt={supplier.name} className="h-8 w-8 rounded" />
            ) : (
              <div className="h-8 w-8 bg-blue-100 text-blue-600 font-bold flex items-center justify-center rounded">
                {supplier?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-bold text-slate-900 truncate max-w-[10rem]">
              {supplier?.name || 'Supplier'}
            </span>
          </Link>

          {/* main horizontal nav */}
          <nav className="hidden sm:flex space-x-4">
            {(['overview', 'products', 'reviews', 'analytics'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 rounded font-semibold text-sm transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => openProductModal({}, 'create')}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </button>

            <SupplierNotificationsDropdown />

            <div className="relative">
              <button
                onClick={() => setSettingsOpen((s) => !s)}
                className="flex items-center justify-center p-2 rounded hover:bg-slate-100"
              >
                <Settings className="h-5 w-5 text-slate-700" />
              </button>
              {settingsOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                  <button
                    onClick={() => {
                      setSettingsOpen(false);
                      setProfileOpen(true);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50"
                  >
                    Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-rose-600"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {isUnapproved && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 p-4 max-w-7xl mx-auto mt-2">
          Your account has been reverted to pending by the administrator. You will be redirected to the application status page where you can update your company information. 
          <Link href="/supplier/application-status" className="underline font-semibold">
            Click here to edit now
          </Link>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
              {/* docs modal */}
              {docsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                  <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                      <h3 className="text-lg font-bold">Legal Documents</h3>
                      <button onClick={() => setDocsOpen(false)} className="text-slate-500 hover:text-slate-700">✖</button>
                    </div>
                    <div className="px-6 py-4 overflow-y-auto space-y-3">
                      {supplier?.legalDocUrls?.map((url: string, idx: number) => {
                        const name = url.split('/').pop() || `Document ${idx+1}`;
                        return (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                            <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-400 break-all">{name}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
        {/* Main Layout: Sidebar + Content */}

        {/* profile modal triggered from settings */}
        {profileOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black bg-opacity-30">
            <div className="bg-white w-full max-w-md rounded-lg p-6 relative">
              <button
                onClick={() => setProfileOpen(false)}
                className="absolute top-3 right-3 text-slate-500 hover:text-slate-700"
              >
                ✖
              </button>
              <h2 className="text-xl font-bold mb-4">Your Profile</h2>
              <div className="grid grid-cols-1 gap-3 text-sm text-slate-700">
                <div className="flex justify-between">
                  <span className="font-medium">Name:</span>
                  <span>{supplier.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Email:</span>
                  <span>{supplier.email}</span>
                </div>
                {supplier.phoneNumber && (
                  <div className="flex justify-between">
                    <span className="font-medium">Phone:</span>
                    <span>{supplier.phoneNumber}</span>
                  </div>
                )}
                {supplier.countryCode && (
                  <div className="flex justify-between">
                    <span className="font-medium">Country code:</span>
                    <span>{supplier.countryCode}</span>
                  </div>
                )}
                {supplier.businessAddress && (
                  <div className="flex justify-between">
                    <span className="font-medium">Address:</span>
                    <span>{supplier.businessAddress}</span>
                  </div>
                )}
                {supplier.website && (
                  <div className="flex justify-between">
                    <span className="font-medium">Website:</span>
                    <span>
                      <a href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {supplier.website}
                      </a>
                    </span>
                  </div>
                )}
                {supplier.description && (
                  <div className="flex justify-between">
                    <span className="font-medium">Description:</span>
                    <span className="break-words max-w-[60%]">{supplier.description}</span>
                  </div>
                )}
                {supplier.legalDocUrls && supplier.legalDocUrls.length > 0 && (
                  <div className="flex flex-col">
                    <span className="font-medium">Legal Documents:</span>
                    <ul className="list-disc list-inside ml-4">
                      {supplier.legalDocUrls.map((url: string, idx: number) => (
                        <li key={idx}>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {url.split('/').pop() || `Document ${idx + 1}`}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* main content area (sidebar removed per request) */}
          <main className="lg:col-span-4 space-y-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
                    Supplier Dashboard
                  </h1>
                  <p className="text-sm sm:text-base text-slate-600">
                    Manage your products and track performance.
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase mb-1">
                          Products
                        </p>
                        <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                          {products.length}
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-lg">
                        📦
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase mb-1">
                          Views
                        </p>
                        <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                          {totalViews.toLocaleString()}
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-lg">
                        👁️
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase mb-1">
                          Rating
                        </p>
                        <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                          {avgRating}
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center text-lg">
                        ⭐
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase mb-1">
                          Supplier Rating
                        </p>
                        <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                          {supplier.adminRating ? parseFloat(supplier.adminRating).toFixed(1) : '—'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {supplier.adminRating ? 'Admin-verified' : 'Pending'}
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-lg">
                        🏆
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Products Tab */}
            {activeTab === 'products' && (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">Products</h2>
                </div>

                {productsQ.isLoading ? (
                  <div className="px-4 sm:px-6 py-8 text-center text-slate-500">
                    Loading products...
                  </div>
                ) : products.length === 0 ? (
                  <div className="px-4 sm:px-6 py-12 text-center">
                    <p className="text-slate-600 mb-4">No products yet.</p>
                    <button
                      onClick={() => openProductModal({}, 'create')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      Create First Product
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-4 sm:px-6 py-3 text-left font-semibold text-slate-600 text-xs sm:text-sm">
                            PRODUCT
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left font-semibold text-slate-600 text-xs sm:text-sm">
                            CREATED
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left font-semibold text-slate-600 text-xs sm:text-sm">
                            RATING
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left font-semibold text-slate-600 text-xs sm:text-sm">
                            STATUS
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left font-semibold text-slate-600 text-xs sm:text-sm">
                            PRICE
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-right font-semibold text-slate-600 text-xs sm:text-sm">
                            ACTIONS
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {products.map((product: any) => (
                          <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 sm:px-6 py-4">
                              <p className="font-medium text-slate-900 text-sm truncate">
                                {product.name}
                              </p>
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-slate-700 text-sm">
                              {product.createdAt
                                ? new Date(product.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : '—'}
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-slate-700 text-sm">
                              <div className="flex items-center gap-1">
                                {product.adminRating && product.adminRating > 0 ? (
                                  <>
                                    <span>⭐</span>
                                    <span className="font-semibold">
                                      {parseFloat(product.adminRating).toFixed(1)}
                                    </span>
                                  </>
                                ) : product.avgRating && product.avgRating > 0 ? (
                                  <>
                                    <span>⭐</span>
                                    <span className="font-semibold">
                                      {parseFloat(product.avgRating).toFixed(1)}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  product.status === 'PUBLISHED'
                                    ? 'bg-green-100 text-green-800'
                                    : product.status === 'DRAFT'
                                    ? 'bg-slate-100 text-slate-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {product.status || 'DRAFT'}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-slate-900 font-medium text-sm">
                              {product.price
                                ? `$${parseFloat(product.price).toFixed(2)}`
                                : '—'}
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openProductModal(product, 'edit')}
                                  className="p-2 hover:bg-blue-100 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4 text-blue-600" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (
                                      confirm(
                                        'Are you sure you want to delete this product?'
                                      )
                                    ) {
                                      deleteProductM.mutate(product.id);
                                    }
                                  }}
                                  className="p-2 hover:bg-rose-100 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4 text-rose-600" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="text-center text-slate-500">
                  <p>Customer reviews will appear here.</p>
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h2 className="font-bold mb-4">Daily Views</h2>
                  <p className="text-sm text-slate-500 mb-2">
                    Total product views over time (last 30 days).
                  </p>
                  <ul className="list-disc list-inside">
                    {products
                      .sort((a: any, b: any) => (b.viewCount || 0) - (a.viewCount || 0))
                      .slice(0, 10)
                      .map((p: any) => (
                        <li key={p.id} className="text-slate-700">
                          {p.name} – {p.viewCount || 0} views
                        </li>
                      ))}
                  </ul>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h2 className="font-bold mb-4">Top Products (7d)</h2>
                  {topQ.isLoading ? (
                    <p>Loading...</p>
                  ) : topQ.error ? (
                    <p className="text-rose-600">Failed to load analytics</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="p-2">Product ID</th>
                          <th className="p-2">Views</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(topQ.data || []).map((r: any) => (
                          <tr key={r.entityId}>
                            <td className="p-2 break-all">{r.entityId}</td>
                            <td className="p-2">{r.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </main>
      </div>

      {/* Product Form Modal - Create & Edit */}
      <SupplierProductForm
        isOpen={isProductFormOpen}
        onClose={() => setIsProductFormOpen(false)}
        mode={productFormMode}
        productId={selectedProductForEdit?.id}
        categories={categoriesQ.data || []}
        existingProduct={selectedProductForEdit}
      />

    </div>
  );
}
