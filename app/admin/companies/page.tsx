'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Filter, Edit2, Trash2 } from 'lucide-react';
import AddCompanyModal from '@/components/admin/AddCompanyModal';
import EditCompanyModal from '@/components/admin/EditCompanyModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { StarRating } from '@/components/StarRating';

import { adminCompanies, adminDeleteCompany, adminUpdateCompanyAdminRating, Company as ApiCompany, CompanyStatus } from '@/lib/adminApi';

type UiStatus = 'Verified' | 'Pending' | 'Other';

type UiCompany = {
  id: string;
  name: string;
  domain: string;
  logoUrl?: string;
  logo: string; // initials fallback
  status: UiStatus;
  ownerEmail: string;
  createdDate: string;
  rawStatus?: string;
  adminRating?: number;
};

const PAGE_SIZE = 100; // backend constraint: take must not be > 100

function formatDate(input?: string): string {
  if (!input) return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

function initials(name: string): string {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const a = parts[0]?.[0] ?? '';
  const b = parts.length > 1 ? parts[1]?.[0] ?? '' : parts[0]?.[1] ?? '';
  const out = (a + b).toUpperCase();
  return out || 'CO';
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

function toUiStatus(status?: CompanyStatus): UiStatus {
  const s = String(status ?? '').toUpperCase();
  if (s === 'VERIFIED') return 'Verified';
  if (s === 'PENDING') return 'Pending';
  return 'Other';
}

function badgeClass(status: UiStatus): string {
  if (status === 'Verified') {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
  }
  if (status === 'Pending') {
    return 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
  }
  return 'bg-slate-50 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300';
}

/**
 * Debounce hook (correctly uses useEffect)
 */
function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}

/**
 * Normalize API response shapes:
 * - { items, total }
 * - { data: { items, total } }
 * - { results, total }
 * - array of companies
 */
function normalizeCompaniesResponse(res: any): { items: ApiCompany[]; total?: number } {
  if (Array.isArray(res)) return { items: res, total: res.length };

  const items = res?.items ?? res?.data?.items ?? res?.results ?? res?.data?.results ?? [];
  const safeItems = Array.isArray(items) ? items : [];

  const total =
    res?.total ?? res?.data?.total ?? res?.count ?? res?.data?.count ?? safeItems.length;

  return { items: safeItems, total: typeof total === 'number' ? total : safeItems.length };
}

function getErrorText(err: unknown): string {
  if (!err) return 'Unknown error';
  const anyErr: any = err;

  // axios-style
  if (anyErr?.response?.status) {
    const status = anyErr.response.status;
    const data = anyErr.response.data;
    return `HTTP ${status}\n${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}`;
  }

  // fetch/standard error
  if (anyErr?.message) return String(anyErr.message);

  try {
    return JSON.stringify(anyErr, null, 2);
  } catch {
    return String(anyErr);
  }
}

export default function CompaniesPage() {
  const qc = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<'All' | 'Verified' | 'Pending'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleted, setShowDeleted] = useState(false);
  const debouncedSearch = useDebouncedValue(searchQuery, 350);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);

  // Map UI filter -> backend status param
  const statusParam: CompanyStatus | undefined =
    activeFilter === 'All' ? undefined : activeFilter === 'Verified' ? 'VERIFIED' : 'PENDING';

  // Main list query (server-side filter + search)
  const companiesQ = useQuery({
    queryKey: ['admin', 'companies', { status: statusParam ?? 'ALL', q: debouncedSearch, deleted: showDeleted ? 'deleted' : 'active' }],
    queryFn: async () => {
      const res = await adminCompanies({
        status: statusParam,
        deleted: showDeleted ? 'deleted' : 'active',
        q: debouncedSearch?.trim() ? debouncedSearch.trim() : undefined,
        skip: 0,
        take: PAGE_SIZE,
      });
      return normalizeCompaniesResponse(res);
    },
    retry: false,
  });

  // Counts (fast)
  const allCountQ = useQuery({
    queryKey: ['admin', 'companies', 'count', 'ALL', showDeleted ? 'deleted' : 'active'],
    queryFn: async () => normalizeCompaniesResponse(await adminCompanies({ deleted: showDeleted ? 'deleted' : 'active', skip: 0, take: 1 })),
    retry: false,
  });

  const verifiedCountQ = useQuery({
    queryKey: ['admin', 'companies', 'count', 'VERIFIED', showDeleted ? 'deleted' : 'active'],
    queryFn: async () =>
      normalizeCompaniesResponse(await adminCompanies({ status: 'VERIFIED', deleted: showDeleted ? 'deleted' : 'active', skip: 0, take: 1 })),
    retry: false,
  });

  const pendingCountQ = useQuery({
    queryKey: ['admin', 'companies', 'count', 'PENDING', showDeleted ? 'deleted' : 'active'],
    queryFn: async () =>
      normalizeCompaniesResponse(await adminCompanies({ status: 'PENDING', deleted: showDeleted ? 'deleted' : 'active', skip: 0, take: 1 })),
    retry: false,
  });

  // Delete mutation
  const deleteCompanyM = useMutation({
    mutationFn: async (id: string) => {
      return adminDeleteCompany(id);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'companies'] });
      await qc.invalidateQueries({ queryKey: ['admin', 'companies', 'count'] });
    },
  });



  const companies: UiCompany[] = useMemo(() => {
    const items = companiesQ.data?.items ?? [];

    return items.map((c: any) => {
      const name = String(c?.name ?? '—');
      const domain = String(c?.domain ?? c?.website ?? c?.slug ?? '—');
      const ownerEmail = String(c?.ownerEmail ?? c?.email ?? c?.owner?.email ?? '—');
      const logoUrl = c?.logoUrl;

      const uiStatus = toUiStatus(c?.status);

      return {
        id: String(c?.id ?? ''),
        name,
        domain,
        logoUrl,
        logo: initials(name),
        status: uiStatus,
        ownerEmail,
        createdDate: formatDate(c?.createdAt),
        rawStatus: String(c?.status ?? ''),
        adminRating: c?.adminRating,
      };
    });
  }, [companiesQ.data]);

  const counts = {
    All: allCountQ.data?.total ?? 0,
    Verified: verifiedCountQ.data?.total ?? 0,
    Pending: pendingCountQ.data?.total ?? 0,
  };

  return (
    <div className="flex flex-col min-h-screen">

      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark">
        {/* Page Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Companies Management
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  Review, verify and manage company directory profiles.
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-admin-primary text-white rounded-lg font-semibold hover:bg-admin-primary/90 transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Add New Company
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 max-w-[1600px] mx-auto">
          {/* Filters and Search */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  {(['All', 'Verified', 'Pending'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        activeFilter === filter
                          ? 'bg-admin-primary text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={
                        filter === 'All'
                          ? `Total: ${counts.All}`
                          : filter === 'Verified'
                          ? `Verified: ${counts.Verified}`
                          : `Pending: ${counts.Pending}`
                      }
                    >
                      {filter}
                    </button>
                  ))}
                  <div className="h-6 w-px bg-slate-300 dark:bg-slate-600 mx-2" />
                  <button
                    onClick={() => setShowDeleted(!showDeleted)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      showDeleted
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {showDeleted ? '🗑️ Deleted' : '📋 Active'}
                  </button>
                </div>

                <div className="flex items-center gap-3 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search companies..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-admin-primary focus:border-transparent"
                    />
                  </div>
                  <button
                    className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    title="Filters (coming soon)"
                  >
                    <Filter className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Companies Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                    <th className="px-6 py-3">Company</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Owner Email</th>
                    <th className="px-6 py-3">Rating</th>
                    <th className="px-6 py-3">Created Date</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {companiesQ.isLoading ? (
                    <tr>
                      <td className="px-6 py-6 text-slate-400" colSpan={5}>
                        Loading companies…
                      </td>
                    </tr>
                  ) : companiesQ.isError ? (
                    <tr>
                      <td className="px-6 py-6 text-rose-600" colSpan={5}>
                        Failed to load companies.
                      </td>
                    </tr>
                  ) : companies.length === 0 ? (
                    <tr>
                      <td className="px-6 py-6 text-slate-400" colSpan={5}>
                        No companies found.
                      </td>
                    </tr>
                  ) : (
                    companies.map((company) => {
                      const logoClass = pickLogoColor(company.id || company.name);

                      return (
                        <tr
                          key={company.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden ${company.logoUrl ? '' : logoClass}`}
                              >
                                {company.logoUrl ? (
                                  <img
                                    src={company.logoUrl}
                                    alt={company.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  company.logo
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-slate-900 dark:text-white">
                                  {company.name}
                                </div>
                                <div className="text-xs text-slate-500">{company.domain}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${badgeClass(
                                company.status
                              )}`}
                              title={company.rawStatus ? `Backend: ${company.rawStatus}` : undefined}
                            >
                              {company.status === 'Other'
                                ? company.rawStatus || 'Other'
                                : company.status}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                            {company.ownerEmail}
                          </td>

                          <td className="px-6 py-4">
                            <StarRating rating={company.adminRating || 0} size="sm" />
                          </td>

                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                            {company.createdDate}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/admin/products?companyId=${company.id}`}
                                className="px-3 py-1.5 text-xs font-medium text-admin-primary hover:bg-admin-primary/10 rounded-lg transition-colors"
                              >
                                View Products
                              </Link>

                              <button
                                onClick={() => setEditingCompanyId(company.id)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                title="Edit company details"
                              >
                                <Edit2 className="h-4 w-4 text-slate-600" />
                              </button>

                              <button
                                onClick={() => {
                                  if (confirm(`Delete "${company.name}"?`)) {
                                    deleteCompanyM.mutate(company.id);
                                  }
                                }}
                                disabled={deleteCompanyM.isPending}
                                className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors disabled:opacity-60"
                                title="Delete company"
                              >
                                <Trash2 className="h-4 w-4 text-slate-600 hover:text-rose-600" />
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

            {companiesQ.isError && (
              <div className="px-6 py-4 text-xs text-rose-600 font-bold space-y-2">
                <div>Failed to load companies. Check Network tab and response shape.</div>
                <pre className="whitespace-pre-wrap font-mono text-[11px] font-normal text-rose-700/90">
                  {getErrorText(companiesQ.error)}
                </pre>
              </div>
            )}

            {/* Pagination */}
            {!companiesQ.isLoading && companies.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{companies.length}</span> of{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{counts[activeFilter]}</span> companies
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button className="px-3 py-1.5 bg-admin-primary text-white rounded-lg text-sm font-medium">
                    {currentPage}
                  </button>
                  <button className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    {currentPage + 1}
                  </button>
                  <button className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    {currentPage + 2}
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <AddCompanyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <EditCompanyModal
        isOpen={!!editingCompanyId}
        onClose={() => setEditingCompanyId(null)}
        companyId={editingCompanyId || ''}
      />
    </div>
  );
}