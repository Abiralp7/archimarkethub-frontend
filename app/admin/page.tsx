'use client';

import { ClipboardCheck, UserCheck, Flag, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  adminAnalyticsDaily,
  adminAnalyticsTop,
  adminCompanies,
  adminCompanyClaims,
  adminProducts,
} from '@/lib/adminApi';

type DayPoint = { day: string; value: number };
type TopRow = { name: string; views: number; trend: number };

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

function dayLabelFromDate(value: any): string | null {
  const s = String(value ?? '');
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;

  // JS: 0=Sun..6=Sat
  const map = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
  return map[d.getDay()];
}

function build7DaySeriesFromArray(arr: any[]): DayPoint[] {
  // Accept elements like:
  // { day: 'MON', value: 12 }
  // { label: 'MON', count: 12 }
  // { date: '2026-01-31', views: 12 } -> day label derived
  const points: DayPoint[] = [];

  for (const x of arr) {
    const rawDay = x?.day ?? x?.label ?? x?.name ?? x?.dow ?? x?.weekday ?? null;

    const day = rawDay
      ? String(rawDay).slice(0, 3).toUpperCase()
      : dayLabelFromDate(x?.date ?? x?.createdAt ?? x?.timestamp);

    const value = Number(x?.value ?? x?.count ?? x?.views ?? x?.total ?? 0);

    if (day && (DAYS as readonly string[]).includes(day) && Number.isFinite(value)) {
      points.push({ day, value });
    }
  }

  // Deduplicate: keep last occurrence per day
  const byDay = new Map<string, number>();
  for (const p of points) byDay.set(p.day, p.value);

  // Always return 7 days padded
  return DAYS.map((d) => ({ day: d, value: Number(byDay.get(d) ?? 0) }));
}

function to7DaySeries(input: any): DayPoint[] {
  // Supported shapes:
  // - array of points
  // - object keyed by day { MON: 1, ... }
  // - { labels: [...], series: [...] } / { days: [...], values: [...] }
  // - { data: [...] }

  if (Array.isArray(input)) {
    return build7DaySeriesFromArray(input);
  }

  if (input && typeof input === 'object') {
    // { MON: 10, TUE: 20, ... }
    const hasDayKeys = DAYS.some((d) => Object.prototype.hasOwnProperty.call(input, d));
    if (hasDayKeys) {
      return DAYS.map((d) => ({ day: d, value: Number(input[d] ?? 0) || 0 }));
    }

    // { labels: ['MON',...], values: [1,...] } or { labels, series }
    const labels = input.labels ?? input.days ?? input.x ?? null;
    const values = input.values ?? input.series ?? input.y ?? null;

    if (Array.isArray(labels) && Array.isArray(values)) {
      const arr = labels.map((lbl: any, i: number) => ({
        label: lbl,
        value: values[i],
      }));
      return build7DaySeriesFromArray(arr);
    }

    // nested: { data: [...] }
    if (Array.isArray(input.data)) {
      return build7DaySeriesFromArray(input.data);
    }
  }

  // If backend returned nothing/unexpected → real zeros (not demo)
  return DAYS.map((d) => ({ day: d, value: 0 }));
}

function computeTrendPct(current: number, previous: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0;
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

function toTopRows(input: any): TopRow[] {
  // Supported shapes:
  // - [{ name, views, trend }]
  // - [{ label, value, changePct }]
  // - [{ productName/companyName, viewCount }]
  // - { items: [...] } / { data: [...] } / { results: [...] }

  const arr = Array.isArray(input)
    ? input
    : Array.isArray(input?.items)
      ? input.items
      : Array.isArray(input?.data)
        ? input.data
        : Array.isArray(input?.results)
          ? input.results
          : null;

  if (!arr) return [];

  const mapped = arr
    .map((x: any, idx: number) => {
      const name = String(
        x?.name ??
          x?.label ??
          x?.title ??
          x?.productName ??
          x?.companyName ??
          ''
      ).trim();

      const views = Number(
        x?.views ?? x?.value ?? x?.count ?? x?.viewCount ?? x?.totalViews ?? 0
      );

      const explicitTrend = x?.trend ?? x?.trendPct ?? x?.changePct ?? null;

      let trend = 0;
      if (explicitTrend != null && explicitTrend !== '') {
        trend = Number(explicitTrend) || 0;
      } else {
        const prev = idx > 0 ? arr[idx - 1] : null;
        const prevViews = prev
          ? Number(
              prev?.views ??
                prev?.value ??
                prev?.count ??
                prev?.viewCount ??
                prev?.totalViews ??
                0
            )
          : 0;
        trend = computeTrendPct(views, prevViews);
      }

      return { name, views, trend };
    })
    .filter((x: TopRow) => x.name && Number.isFinite(x.views));

  return mapped.slice(0, 10);
}

function BarChart({
  data,
  variant,
}: {
  data: DayPoint[];
  variant: 'blue' | 'gray';
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <>
      <div className="h-[240px] relative">
        <div className="absolute inset-0 flex items-end justify-between px-2">
          {data.map((d, idx) => {
            const pct = (d.value / max) * 100;
            const isLast = idx === data.length - 1;

            let bgClass = '';
            if (variant === 'blue') {
              if (isLast) bgClass = 'bg-admin-primary';
              else if (pct > 80) bgClass = 'bg-admin-primary/40';
              else if (pct > 60) bgClass = 'bg-admin-primary/20';
              else bgClass = 'bg-admin-primary/10';
            } else {
              if (isLast) bgClass = 'bg-slate-400 dark:bg-slate-500';
              else if (pct > 60) bgClass = 'bg-slate-300 dark:bg-slate-600';
              else bgClass = 'bg-slate-200 dark:bg-slate-700';
            }

            return (
              <div
                key={d.day}
                className={`w-8 ${bgClass} rounded-t-sm`}
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
  if (value > 0) return <span className="text-emerald-600 font-bold">{`+${value}%`}</span>;
  return <span className="text-rose-600 font-bold">{`${value}%`}</span>;
}

export default function AdminDashboard() {
  // Counts (fast, minimal calls)
  const pendingCompaniesQ = useQuery({
    queryKey: ['admin', 'companies', 'pendingCount'],
    queryFn: () => adminCompanies({ status: 'PENDING', skip: 0, take: 1 }),
    retry: false,
  });

  const claimsQ = useQuery({
    queryKey: ['admin', 'company-claims', 'count'],
    queryFn: () => adminCompanyClaims({ skip: 0, take: 1 }),
    retry: false,
  });

  const productsCountQ = useQuery({
    queryKey: ['admin', 'products', 'count'],
    queryFn: () => adminProducts({ skip: 0, take: 1 }),
    retry: false,
  });

  // Fetch all products for name mapping
  const allProductsQ = useQuery({
    queryKey: ['admin', 'products', 'all'],
    queryFn: async () => {
      try {
        const result = await adminProducts({ skip: 0, take: 100 });
        console.log('Products API result:', result);
        return result;
      } catch (error) {
        console.error('Error fetching products:', error);
        throw error;
      }
    },
    retry: true,
  });

  // Fetch all companies for name mapping
  const allCompaniesQ = useQuery({
    queryKey: ['admin', 'companies', 'all'],
    queryFn: async () => {
      try {
        const result = await adminCompanies({ skip: 0, take: 100 });
        console.log('Companies API result:', result);
        return result;
      } catch (error) {
        console.error('Error fetching companies:', error);
        throw error;
      }
    },
    retry: true,
  });

  const dailyQ = useQuery({
    queryKey: ['admin', 'analytics', 'daily', { eventType: 'view' }],
    queryFn: () => {
      // Calculate last 7 days date range
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 6); // 7 days including today
      
      return adminAnalyticsDaily({
        eventType: 'view',
        entityType: 'product',
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
      });
    },
    retry: false,
  });

  // Fetch top products analytics
  const topProductsQ = useQuery({
    queryKey: ['admin', 'analytics', 'top', 'products', { eventType: 'view' }],
    queryFn: () => adminAnalyticsTop({ eventType: 'view', entityType: 'product' }),
    retry: false,
  });

  // Fetch top companies analytics
  const topCompaniesQ = useQuery({
    queryKey: ['admin', 'analytics', 'top', 'companies', { eventType: 'view' }],
    queryFn: () => adminAnalyticsTop({ eventType: 'view', entityType: 'company' }),
    retry: false,
  });

  const [showAllTopProducts, setShowAllTopProducts] = useState(false);
  const [showAllTopCompanies, setShowAllTopCompanies] = useState(false);

  const allProducts = useMemo(() => {
    const data: any = allProductsQ.data;
    if (Array.isArray(data)) return data;
    return data?.items ?? data?.data ?? [];
  }, [allProductsQ.data]);

  const allCompanies = useMemo(() => {
    const data: any = allCompaniesQ.data;
    if (Array.isArray(data)) return data;
    return data?.items ?? data?.data ?? [];
  }, [allCompaniesQ.data]);

  const pendingCount =
    pendingCompaniesQ.data?.total ?? pendingCompaniesQ.data?.items?.length ?? 0;

  const claimsCount =
    claimsQ.data?.total ?? claimsQ.data?.items?.length ?? 0;

  const productsCount =
    productsCountQ.data?.total ?? productsCountQ.data?.items?.length ?? 0;

  // Map analytics response safely - filter for product views
  const productSeries = useMemo(() => {
    const r: any = dailyQ.data;
    // The daily query should return filtered product:view analytics
    const raw =
      r?.daily ??
      r?.items ??
      r?.data ??
      [];
    return to7DaySeries(Array.isArray(raw) ? raw : []);
  }, [dailyQ.data]);

  const totalProductViews = useMemo(() => {
    return productSeries.reduce((sum, day) => sum + day.value, 0);
  }, [productSeries]);

  const companySeries = useMemo(() => {
    // Placeholder for company views - not tracking company views yet
    return DAYS.map((d) => ({ day: d, value: 0 }));
  }, []);

  const totalCompanyViews = useMemo(() => {
    return companySeries.reduce((sum, day) => sum + day.value, 0);
  }, [companySeries]);

  const topProducts = useMemo(() => {
    const r: any = topProductsQ.data;
    const raw =
      r?.items ??
      r?.data ??
      r ?? [];
    
    // Debug: Log what we're getting
    console.log('=== TOP PRODUCTS DEBUG ===');
    console.log('All products query state:', {
      isLoading: allProductsQ.isLoading,
      isError: allProductsQ.isError,
      data: allProductsQ.data,
    });
    
    // Try multiple paths to get products
    let products = allProductsQ.data?.items || [];
    console.log('Products from .items:', products);
    
    if (!products || products.length === 0) {
      products = allProductsQ.data?.data || [];
      console.log('Products from .data:', products);
    }
    
    if (!products || products.length === 0) {
      products = Array.isArray(allProductsQ.data) ? allProductsQ.data : [];
      console.log('Products as direct array:', products);
    }
    
    console.log('Final products array:', products);
    console.log('Raw analytics data:', raw);
    
    // Create map of product IDs to names from all products
    const productMap = new Map<string, string>();
    
    if (Array.isArray(products) && products.length > 0) {
      products.forEach((p: any) => {
        if (p && p.id && p.name) {
          productMap.set(p.id, p.name);
          console.log(`✓ Mapped: ${p.id} -> ${p.name}`);
        }
      });
    }
    
    console.log('Product map size:', productMap.size);
    
    // Convert API response { entityId, count } to { name, views, trend }
    const rows = (Array.isArray(raw) ? raw : []).map((item: any, idx: number) => {
      const entityId = item.entityId || item.id || '';
      const count = item.count || item.views || 0;
      
      // Try to get name from map, fallback to entityId
      let productName = productMap.get(entityId);
      if (!productName && entityId) {
        productName = entityId;
      }
      productName = productName || 'Unknown';
      
      console.log(`Found name for ${entityId}: ${productName}`);
      
      // Calculate trend: compare with previous item (next highest)
      let trend = 0;
      if (idx < (raw.length - 1)) {
        const prevCount = raw[idx + 1]?.count || 0;
        if (prevCount > 0) {
          trend = Math.round(((count - prevCount) / prevCount) * 100);
        } else {
          trend = count > 0 ? 100 : 0;
        }
      }
      
      return {
        name: productName,
        views: count,
        trend,
      };
    });
    
    console.log('Final rows:', rows);
    return rows.slice(0, 10);
  }, [topProductsQ.data, allProductsQ.data, allProductsQ.isLoading]);

  const topCompanies = useMemo(() => {
    const r: any = topCompaniesQ.data;
    const raw =
      r?.topCompanies ??
      r?.companies ??
      r?.company ??
      r?.data?.topCompanies ??
      r?.data?.companies ??
      r ?? [];
    
    // Debug: Log what we're getting
    console.log('=== TOP COMPANIES DEBUG ===');
    console.log('All companies query state:', {
      isLoading: allCompaniesQ.isLoading,
      isError: allCompaniesQ.isError,
      data: allCompaniesQ.data,
    });
    
    // Try multiple paths to get companies
    let companies = allCompaniesQ.data?.items || [];
    console.log('Companies from .items:', companies);
    
    if (!companies || companies.length === 0) {
      companies = allCompaniesQ.data?.data || [];
      console.log('Companies from .data:', companies);
    }
    
    if (!companies || companies.length === 0) {
      companies = Array.isArray(allCompaniesQ.data) ? allCompaniesQ.data : [];
      console.log('Companies as direct array:', companies);
    }
    
    console.log('Final companies array:', companies);
    console.log('Raw analytics data:', raw);
    
    // Create map of company IDs to names from all companies
    const companyMap = new Map<string, string>();
    
    if (Array.isArray(companies) && companies.length > 0) {
      companies.forEach((c: any) => {
        if (c && c.id && c.name) {
          companyMap.set(c.id, c.name);
          console.log(`✓ Mapped: ${c.id} -> ${c.name}`);
        }
      });
    }
    
    console.log('Company map size:', companyMap.size);
    
    // Convert API response { entityId, count } to { name, views, trend }
    const rows = (Array.isArray(raw) ? raw : []).map((item: any, idx: number) => {
      const entityId = item.entityId || item.id || '';
      const count = item.count || item.views || 0;
      
      // Try to get name from map, fallback to entityId
      let companyName = companyMap.get(entityId);
      if (!companyName && entityId) {
        companyName = entityId;
      }
      companyName = companyName || 'Unknown';
      
      console.log(`Found name for ${entityId}: ${companyName}`);
      
      // Calculate trend: compare with previous item (next highest)
      let trend = 0;
      if (idx < (raw.length - 1)) {
        const prevCount = raw[idx + 1]?.count || 0;
        if (prevCount > 0) {
          trend = Math.round(((count - prevCount) / prevCount) * 100);
        } else {
          trend = count > 0 ? 100 : 0;
        }
      }
      
      return {
        name: companyName,
        views: count,
        trend,
      };
    });
    
    console.log('Final rows:', rows);
    return rows.slice(0, 10);
  }, [topCompaniesQ.data, allCompaniesQ.data, allCompaniesQ.isLoading]);

  // Flagged reviews: Swagger doesn't show a flagged count endpoint → keep 0 for now
  const flaggedReviews = 0;

  return (
    <div className="flex flex-col min-h-screen">

      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark">
        {/* Page Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-5">
          <div className="flex flex-col gap-1 max-w-[1600px] mx-auto">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Admin Dashboard
            </h1>
            <p className="text-slate-500 text-sm">
              System performance and moderation overview for today.
            </p>
          </div>
        </div>

        <div className="p-8 max-w-[1600px] mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="flex flex-col gap-4 p-6 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 text-left">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 w-fit">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Verifications
                </p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                  {pendingCompaniesQ.isLoading ? '—' : pendingCount}
                </h3>
                <p className="text-xs text-amber-600 font-bold mt-2">
                  Pending Review
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-6 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 text-left">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 w-fit">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Claims
                </p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                  {claimsQ.isLoading ? '—' : claimsCount}
                </h3>
                <p className="text-xs text-blue-600 font-bold mt-2">
                  Awaiting Assignment
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-6 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 text-left">
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 w-fit">
                <Flag className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Flagged Reviews
                </p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                  {flaggedReviews}
                </h3>
                <p className="text-xs text-rose-600 font-bold mt-2">
                  +22 since yesterday
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-6 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 text-left">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 w-fit">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                  New Products
                </p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                  {productsCountQ.isLoading ? '—' : productsCount}
                </h3>
                <p className="text-xs text-emerald-600 font-bold mt-2">
                  Last 24 hours
                </p>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    Daily Product Views
                  </h4>
                  <p className="text-xs text-slate-500">
                    Last 7 days • <span className="font-bold text-slate-900 dark:text-white">{totalProductViews.toLocaleString()}</span> total
                  </p>
                </div>
                <select className="text-xs bg-slate-50 dark:bg-slate-800 border-none rounded-lg focus:ring-1 focus:ring-admin-primary py-1.5 px-3">
                  <option>Last 7 Days</option>
                </select>
              </div>
              <BarChart data={productSeries} variant="blue" />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    Daily Company Views
                  </h4>
                  <p className="text-xs text-slate-500">
                    Last 7 days • <span className="font-bold text-slate-900 dark:text-white">{totalCompanyViews.toLocaleString()}</span> total
                  </p>
                </div>
                <select className="text-xs bg-slate-50 dark:bg-slate-800 border-none rounded-lg focus:ring-1 focus:ring-admin-primary py-1.5 px-3">
                  <option>Last 7 Days</option>
                </select>
              </div>
              <BarChart data={companySeries} variant="gray" />
            </div>
          </div>

          {/* Tables */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 pb-12">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  Top Products by Views
                </h4>
                <button
                  onClick={() => setShowAllTopProducts(true)}
                  className="text-xs text-admin-primary font-bold hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                      <th className="px-6 py-3">Product Name</th>
                      <th className="px-6 py-3 text-right">Views</th>
                      <th className="px-6 py-3 text-right">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {topProducts.length === 0 ? (
                      <tr>
                        <td className="px-6 py-6 text-slate-400 text-sm" colSpan={3}>
                          No data
                        </td>
                      </tr>
                    ) : (
                      topProducts.slice(0, 5).map((p) => (
                        <tr
                          key={p.name}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                            {p.name}
                          </td>
                          <td className="px-6 py-4 text-right tabular-nums">
                            {p.views.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Trend value={p.trend} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {topProducts.length > 5 && (
                <div className="px-6 py-3 text-xs text-slate-500">
                  Showing 5 of {topProducts.length}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  Top Companies by Views
                </h4>
                <button
                  onClick={() => setShowAllTopCompanies(true)}
                  className="text-xs text-admin-primary font-bold hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                      <th className="px-6 py-3">Company</th>
                      <th className="px-6 py-3 text-right">Views</th>
                      <th className="px-6 py-3 text-right">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {topCompanies.length === 0 ? (
                      <tr>
                        <td className="px-6 py-6 text-slate-400 text-sm" colSpan={3}>
                          No data
                        </td>
                      </tr>
                    ) : (
                      topCompanies.slice(0, 5).map((c) => (
                        <tr
                          key={c.name}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                            {c.name}
                          </td>
                          <td className="px-6 py-4 text-right tabular-nums">
                            {c.views.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Trend value={c.trend} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {topCompanies.length > 5 && (
                <div className="px-6 py-3 text-xs text-slate-500">
                  Showing 5 of {topCompanies.length}
                </div>
              )}
            </div>
          </div>

          {showAllTopProducts && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
              <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
                  <div>
                    <h4 className="font-bold text-slate-900">All Products</h4>
                    <p className="text-sm text-slate-500">Same table design as Products management.</p>
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
                        <th className="px-6 py-3">Product</th>
                        <th className="px-6 py-3 text-right">Views</th>
                        <th className="px-6 py-3 text-right">Trend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {topProducts.length === 0 ? (
                        <tr>
                          <td className="px-6 py-6 text-slate-400 text-sm" colSpan={3}>
                            No ranked products available.
                          </td>
                        </tr>
                      ) : (
                        topProducts.map((product, idx) => (
                          <tr key={product.name || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-900">{idx + 1}. {product.name}</td>
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

          {showAllTopCompanies && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
              <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
                  <div>
                    <h4 className="font-bold text-slate-900">All Companies</h4>
                    <p className="text-sm text-slate-500">Same table design as Companies management.</p>
                  </div>
                  <button
                    onClick={() => setShowAllTopCompanies(false)}
                    className="text-sm font-semibold text-slate-500 hover:text-slate-900"
                  >
                    Close
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                        <th className="px-6 py-3">Company</th>
                        <th className="px-6 py-3 text-right">Views</th>
                        <th className="px-6 py-3 text-right">Trend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {topCompanies.length === 0 ? (
                        <tr>
                          <td className="px-6 py-6 text-slate-400 text-sm" colSpan={3}>
                            No ranked companies available.
                          </td>
                        </tr>
                      ) : (
                        topCompanies.map((company, idx) => (
                          <tr key={company.name || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-900">{idx + 1}. {company.name}</td>
                            <td className="px-6 py-4 text-right tabular-nums text-slate-700">{company.views.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right"><Trend value={company.trend} /></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Optional error hints (dev) */}
          {(pendingCompaniesQ.isError ||
            claimsQ.isError ||
            productsCountQ.isError ||
            dailyQ.isError ||
            topProductsQ.isError ||
            topCompaniesQ.isError) && (
            <div className="text-xs text-rose-600 font-bold">
              Some dashboard data failed to load. Check Network tab and response shapes.
            </div>
          )}
        </div>
      </main>

    </div>
  );
}
