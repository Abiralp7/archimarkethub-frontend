'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  supplierGetMe,
  supplierGetProducts,
  supplierDeleteProduct,
  getCategories,
  companyAnalyticsTop,
  companyAnalyticsDaily,
} from '@/lib/adminApi';
import SupplierNotificationsDropdown from '@/components/supplier/SupplierNotificationsDropdown';
import SupplierProductForm from '@/components/supplier/SupplierProductForm';
import { logout } from '@/lib/auth';
import { Plus, LogOut, Trash2, Edit2, FileText, X, Settings } from 'lucide-react';
import { userVisibleProductStatus, productStatusColor } from '@/lib/productStatus';

type Tab = 'overview' | 'products' | 'reviews' | 'analytics';

type DayPoint = { day: string; value: number };
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

function dayLabelFromDate(value: any): string | null {
  const s = String(value ?? '');
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const map = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
  return map[d.getDay()];
}

function build7DaySeriesFromArray(arr: any[]): DayPoint[] {
  const points: DayPoint[] = [];
  const seen = new Set<string>();

  for (const item of arr) {
    const rawDay = item?.day ?? item?.label ?? item?.date ?? item?.createdAt ?? item?.timestamp ?? null;
    const day = rawDay ? String(rawDay).slice(0, 3).toUpperCase() : dayLabelFromDate(item?.date ?? item?.createdAt ?? item?.timestamp);
    const value = Number(item?.value ?? item?.count ?? item?.views ?? 0);
    if (!day || !DAYS.includes(day as any) || Number.isNaN(value)) continue;
    if (!seen.has(day)) {
      points.push({ day, value });
      seen.add(day);
    }
  }

  return DAYS.map((day) => {
    const point = points.find((p) => p.day === day);
    return { day, value: point?.value ?? 0 };
  });
}

function BarChart({ data, variant }: { data: DayPoint[]; variant: 'blue' | 'gray' }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <>
      <div className="h-[220px] relative">
        <div className="absolute inset-0 flex items-end justify-between px-2">
          {data.map((d, idx) => {
            const pct = (d.value / max) * 100;
            const isLast = idx === data.length - 1;
            let bgClass = '';
            if (variant === 'blue') {
              if (isLast) bgClass = 'bg-blue-600';
              else if (pct > 80) bgClass = 'bg-blue-400';
              else if (pct > 60) bgClass = 'bg-blue-300';
              else bgClass = 'bg-blue-200';
            } else {
              if (isLast) bgClass = 'bg-slate-500';
              else if (pct > 60) bgClass = 'bg-slate-400';
              else bgClass = 'bg-slate-300';
            }
            return (
              <div
                key={d.day}
                className={`${bgClass} w-8 rounded-t-sm`}
                style={{ height: `${Math.max(30, pct)}%` }}
                title={`${d.day}: ${d.value}`}
              />
            );
          })}
        </div>
      </div>
      <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
        {data.map((d) => (
          <span key={d.day}>{d.day}</span>
        ))}
      </div>
    </>
  );
}

function Trend({ value }: { value: number }) {
  if (value === 0) return <span className="text-slate-400 font-bold">0%</span>;
  if (value > 0) return <span className="text-emerald-600 font-bold">+{value}%</span>;
  return <span className="text-rose-600 font-bold">{value}%</span>;
}

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
  const [showAllTopProducts, setShowAllTopProducts] = useState(false);

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

  // Supplier analytics: daily views for supplier's products
  const dailyQ = useQuery({
    queryKey: ['supplier', 'analytics', 'daily', supplier?.id],
    queryFn: () => companyAnalyticsDaily({ entityType: 'product', from: new Date(Date.now() - 6 * 86400000).toISOString(), to: new Date().toISOString() }),
    enabled: !!supplier?.id,
    retry: false,
  });

  const topQ = useQuery({
    queryKey: ['supplier', 'analytics', 'top', supplier?.id],
    queryFn: () => companyAnalyticsTop({ eventType: 'view', entityType: 'product', take: 10 }),
    enabled: !!supplier?.id,
    retry: false,
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

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const products = Array.isArray(productsQ.data)
    ? productsQ.data
    : productsQ.data?.items || [];
  const totalViews = products.reduce((sum: number, p: any) => sum + (p.viewCount || 0), 0);
  const avgRating =
    products.length > 0
      ? (
          products.reduce((sum: number, p: any) => {
            const rating = (p.adminRating && p.adminRating > 0) ? p.adminRating : p.avgRating;
            return sum + (rating || 0);
          }, 0) / products.length
        ).toFixed(1)
      : '0';

  const productSeries = useMemo(() => {
    const raw = dailyQ.data?.daily ?? [];
    return build7DaySeriesFromArray(raw);
  }, [dailyQ.data]);

  const totalProductViews = dailyQ.data?.total ?? productSeries.reduce((sum, point) => sum + point.value, 0);

  const topProducts = useMemo(() => {
    const raw = Array.isArray(topQ.data)
      ? topQ.data
      : topQ.data?.items ?? topQ.data?.data ?? topQ.data ?? [];
    const map = new Map(products.map((p: any) => [p.id, p.name]));
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 10).map((item: any, idx: number) => {
      const entityId = item.entityId ?? item.id ?? '';
      const count = item.count ?? item.views ?? 0;
      const nextCount = raw[idx + 1]?.count ?? raw[idx + 1]?.views ?? 0;
      const trend = nextCount > 0 ? Math.round(((count - nextCount) / nextCount) * 100) : 0;
      return {
        name: map.get(entityId) ?? entityId ?? 'Unknown',
        views: count,
        trend,
      };
    });
  }, [topQ.data, products]);

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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/supplier/dashboard" className="flex items-center gap-2 text-blue-600 hover:opacity-80 transition-opacity">
            <div className="relative">
              {supplier?.logoUrl ? (
                <img src={supplier.logoUrl} alt={supplier.name} className="h-8 w-8 rounded" />
              ) : (
                <div className="h-8 w-8 bg-blue-100 text-blue-600 font-bold flex items-center justify-center rounded">
                  {supplier?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              {supplier?.hasBadge && (
                <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border border-white">
                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
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
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                  <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-[10000]">
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
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-2xl p-6 relative z-[10000] shadow-2xl">
              <button
                onClick={() => setProfileOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
                aria-label="Close profile"
              >
                ✖
              </button>

              <h2 className="text-2xl font-bold mb-4">Your Profile</h2>

              <div className="grid grid-cols-2 gap-4 text-sm text-slate-700 items-start">
                <div className="text-xs text-slate-500 uppercase font-semibold">Name</div>
                <div className="font-semibold truncate">{supplier.name || '—'}</div>

                <div className="text-xs text-slate-500 uppercase font-semibold">Email</div>
                <div className="truncate text-slate-700">{(supplier.email || supplier.owner?.email || supplier.ownerEmail || supplier.user?.email) ?? 'Not provided'}</div>

                <div className="text-xs text-slate-500 uppercase font-semibold">Phone</div>
                <div className="truncate text-slate-700">
                  {(() => {
                    const cc = supplier.countryCode ?? '';
                    let pn = supplier.phoneNumber ?? '';
                    if (!pn && cc && supplier.phoneNumber && supplier.phoneNumber.startsWith(cc)) {
                      pn = supplier.phoneNumber.slice(cc.length);
                    }
                    if (!cc && pn && pn.startsWith('+')) {
                      const m = pn.match(/^(\+\d{1,4})(.*)$/);
                      if (m) return `${m[1]} ${m[2]}`.trim();
                    }
                    return cc ? `${cc} ${pn}`.trim() : (pn || 'Not provided');
                  })()}
                </div>

                <div className="text-xs text-slate-500 uppercase font-semibold">Address</div>
                <div className="truncate text-slate-700">{supplier.businessAddress ?? '—'}</div>

                <div className="text-xs text-slate-500 uppercase font-semibold">Website</div>
                <div className="truncate">
                  {supplier.website ? (
                    <a href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {supplier.website.replace(/^https?:\/\//, '')}
                    </a>
                  ) : '—'}
                </div>

                <div className="text-xs text-slate-500 uppercase font-semibold">Description</div>
                <div>
                  <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 max-w-[60%]">
                    {supplier.description ?? '—'}
                  </div>
                </div>

                {supplier.legalDocUrls && supplier.legalDocUrls.length > 0 && (
                  <div className="flex flex-col col-span-2">
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

                <div className="col-span-2 mt-4 text-xs text-slate-500">
                  Note: Once your account is verified you cannot edit your profile. To request changes, please contact <a href="mailto:support@materialhub.com" className="text-blue-600 underline">support@materialhub.com</a>.
                </div>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
                          Avg. Rating
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

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">Weekly Product Views</h2>
                        <p className="text-sm text-slate-500 mt-1">
                          Total over the last 7 days.
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">Last 7 days</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {totalProductViews.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {dailyQ.isLoading ? (
                      <div className="h-[220px] flex items-center justify-center text-slate-400">Loading chart…</div>
                    ) : dailyQ.error ? (
                      <div className="h-[220px] flex items-center justify-center text-rose-600">Unable to load analytics</div>
                    ) : (
                      <BarChart data={productSeries} variant="blue" />
                    )}
                  </div>

                  <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <div className="flex items-start justify-between mb-4 gap-4">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">Top Products</h2>
                        <p className="text-sm text-slate-500 mt-1">
                          Most viewed products this week.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowAllTopProducts(true)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        View All
                      </button>
                    </div>
                    {topQ.isLoading ? (
                      <div className="h-[220px] flex items-center justify-center text-slate-400">Loading top products…</div>
                    ) : topQ.error ? (
                      <div className="h-[220px] flex items-center justify-center text-rose-600">Unable to load top products</div>
                    ) : topProducts.length === 0 ? (
                      <div className="h-[220px] flex items-center justify-center text-slate-500">No top product data available yet.</div>
                    ) : (
                      <div className="overflow-hidden rounded-3xl border border-slate-200">
                        <div className="grid grid-cols-[1.8fr_0.8fr_0.8fr] gap-4 px-5 py-4 bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
                          <span>Product</span>
                          <span className="text-right">Views</span>
                          <span className="text-right">Trend</span>
                        </div>
                        <div className="divide-y divide-slate-200">
                          {topProducts.slice(0, 5).map((product) => (
                            <div key={product.name} className="grid grid-cols-[1.8fr_0.8fr_0.8fr] gap-4 px-5 py-4 items-center text-sm text-slate-900">
                              <span className="font-semibold">{product.name}</span>
                              <span className="text-right text-slate-700">{product.views.toLocaleString()}</span>
                              <span className="text-right"><Trend value={product.trend} /></span>
                            </div>
                          ))}
                        </div>
                        {topProducts.length > 5 && (
                          <div className="px-5 py-3 text-xs text-slate-500">
                            Showing 5 of {topProducts.length} products
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {showAllTopProducts && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
                      <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">Top Products</h3>
                            <p className="text-sm text-slate-500">Showing all products in the same table style.</p>
                          </div>
                          <button
                            onClick={() => setShowAllTopProducts(false)}
                            className="text-sm font-semibold text-slate-500 hover:text-slate-900"
                          >
                            Close
                          </button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                                <th className="px-6 py-3">Product Name</th>
                                <th className="px-6 py-3 text-right">Views</th>
                                <th className="px-6 py-3 text-right">Trend</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {topProducts.length === 0 ? (
                                <tr>
                                  <td className="px-6 py-6 text-slate-400 text-sm" colSpan={3}>
                                    No data
                                  </td>
                                </tr>
                              ) : (
                                topProducts.map((product) => (
                                  <tr key={product.name} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900">{product.name}</td>
                                    <td className="px-6 py-4 text-right tabular-nums text-slate-700">{product.views.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right"><Trend value={product.trend} /></td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
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
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${productStatusColor(product.status)}`}
                              >
                                {userVisibleProductStatus(product.status)}
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
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-bold text-slate-900">Daily Views</h2>
                      <p className="text-sm text-slate-500 mt-1">
                        Total product views over the last seven days.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total</p>
                      <p className="text-xl font-bold text-slate-900">{totalProductViews.toLocaleString()}</p>
                    </div>
                  </div>
                  {dailyQ.isLoading ? (
                    <div className="h-[220px] flex items-center justify-center text-slate-400">Loading chart…</div>
                  ) : dailyQ.error ? (
                    <div className="h-[220px] flex items-center justify-center text-rose-600">Unable to load analytics</div>
                  ) : (
                    <BarChart data={productSeries} variant="blue" />
                  )}
                </div>

                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-bold text-slate-900">Top Products (7d)</h2>
                      <p className="text-sm text-slate-500 mt-1">
                        Your most-viewed products this week.
                      </p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Top 10</span>
                  </div>
                  {topQ.isLoading ? (
                    <div className="h-[220px] flex items-center justify-center text-slate-400">Loading top products…</div>
                  ) : topQ.error ? (
                    <div className="h-[220px] flex items-center justify-center text-rose-600">Unable to load top products</div>
                  ) : topProducts.length === 0 ? (
                    <div className="h-[220px] flex items-center justify-center text-slate-500">No top products found.</div>
                  ) : (
                    <div className="overflow-hidden rounded-3xl border border-slate-200">
                      <div className="flex items-center justify-between gap-4 px-6 py-5 bg-slate-50">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">Top 10 Products by Views</h3>
                          <p className="text-xs text-slate-500">Your most-viewed products this week.</p>
                        </div>
                        <Link href="/supplier/products" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                          View All
                        </Link>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-[11px] uppercase tracking-[0.3em] text-slate-500">Product Name</th>
                              <th className="px-6 py-3 text-right text-[11px] uppercase tracking-[0.3em] text-slate-500">Views</th>
                              <th className="px-6 py-3 text-right text-[11px] uppercase tracking-[0.3em] text-slate-500">Trend</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {topProducts.slice(0, 10).map((product) => (
                              <tr key={product.name} className="hover:bg-slate-50">
                                <td className="px-6 py-4 text-slate-900">{product.name}</td>
                                <td className="px-6 py-4 text-right font-semibold text-slate-900">{product.views.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right"><Trend value={product.trend} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
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
