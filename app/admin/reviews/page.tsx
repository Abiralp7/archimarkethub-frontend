'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Filter, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminListReviews, adminListCompanyReviews, adminDeleteReview, adminDeleteCompanyReview, AdminReviewsParams, ProductReview, CompanyReview } from '@/lib/adminApi';
import { StarRating } from '@/components/StarRating';

const PAGE_SIZE = 100;

function formatDate(input?: string): string {
  if (!input) return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

/**
 * Debounce hook
 */
function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}

function getErrorText(err: unknown): string {
  if (!err) return 'Unknown error';
  const anyErr: any = err;

  if (anyErr?.response?.status) {
    const status = anyErr.response.status;
    const data = anyErr.response.data;
    return `HTTP ${status}\n${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}`;
  }

  if (anyErr?.message) return String(anyErr.message);

  try {
    return JSON.stringify(anyErr, null, 2);
  } catch {
    return String(anyErr);
  }
}

export default function ReviewsAdminPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'product' | 'company'>('product');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleted, setShowDeleted] = useState(false);
  const debouncedSearch = useDebouncedValue(searchQuery, 350);

  // Main reviews query (product tab uses product reviews; company tab merges product + company reviews)
  const reviewsQ = useQuery({
    queryKey: ['admin', 'reviews', { tab: activeTab, q: debouncedSearch, deleted: showDeleted ? 'deleted' : 'active' }],
    queryFn: async () => {
      const commonParams = {
        q: debouncedSearch?.trim() ? debouncedSearch.trim() : undefined,
        deleted: showDeleted ? 'deleted' : 'active',
        skip: 0,
        take: PAGE_SIZE,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      } as any;

      if (activeTab === 'product') {
        return await adminListReviews(commonParams);
      }

      // activeTab === 'company' -> fetch both product reviews (grouped by company) and company reviews, then merge
      const [prodRes, compRes] = await Promise.all([
        adminListReviews(commonParams),
        adminListCompanyReviews(commonParams),
      ]);

      // Normalize shape: prodRes.items are ProductReview, compRes.items are CompanyReview
      const mergedItems = [
        ...(Array.isArray(prodRes?.items) ? prodRes.items : []),
        ...(Array.isArray(compRes?.items) ? compRes.items : []),
      ];

      return { total: (prodRes.total || 0) + (compRes.total || 0), skip: 0, take: PAGE_SIZE, items: mergedItems };
    },
    retry: false,
  });

  // Count queries
  const allCountQ = useQuery({
    queryKey: ['admin', 'reviews', 'count', 'all', showDeleted ? 'deleted' : 'active'],
    queryFn: async () => {
      const res = await adminListReviews({
        deleted: showDeleted ? 'deleted' : 'active',
        skip: 0,
        take: 1,
      });
      return res;
    },
    retry: false,
  });

  const activeCountQ = useQuery({
    queryKey: ['admin', 'reviews', 'count', 'active'],
    queryFn: async () => {
      const res = await adminListReviews({
        deleted: 'active',
        skip: 0,
        take: 1,
      });
      return res;
    },
    retry: false,
  });

  const deletedCountQ = useQuery({
    queryKey: ['admin', 'reviews', 'count', 'deleted'],
    queryFn: async () => {
      const res = await adminListReviews({
        deleted: 'deleted',
        skip: 0,
        take: 1,
      });
      return res;
    },
    retry: false,
  });

  // Delete mutation
  const deleteReviewM = useMutation({
    mutationFn: async (id: string) => {
      return adminDeleteReview(id);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
  });

  const reviews = useMemo(() => {
    // support either { items, total } or legacy .data array shape
    const items = Array.isArray(reviewsQ.data)
      ? reviewsQ.data
      : (reviewsQ.data?.items ?? reviewsQ.data?.data ?? []);
    return Array.isArray(items) ? items : [];
  }, [reviewsQ.data]) as Array<ProductReview | CompanyReview>;

  // Group reviews by product or company based on tab
  const groupedReviews = useMemo(() => {
    if (activeTab === 'product') {
      const map = new Map<string, any>();
      reviews.forEach((review) => {
        if (!('product' in review)) return; // ignore company reviews in product tab
        const key = review.product.id;
        if (!map.has(key)) {
          map.set(key, {
            id: key,
            name: review.product.name,
            company: review.product.company.name,
            reviews: [],
          });
        }
        map.get(key).reviews.push(review);
      });
      return Array.from(map.values());
    } else {
      const map = new Map<string, any>();
      reviews.forEach((review) => {
        // for company tab, accept both ProductReview and CompanyReview
        let key: string;
        let name: string;
        if ('product' in review) {
          key = review.product.company.id;
          name = review.product.company.name;
        } else {
          key = review.company.id;
          name = review.company.name;
        }

        if (!map.has(key)) {
          map.set(key, { id: key, name, reviews: [] });
        }
        map.get(key).reviews.push(review);
      });
      return Array.from(map.values());
    }
  }, [reviews, activeTab]);

  const counts = {
    All: allCountQ.data?.data?.length ?? allCountQ.data?.total ?? 0,
    Active: activeCountQ.data?.data?.length ?? activeCountQ.data?.total ?? 0,
    Deleted: deletedCountQ.data?.data?.length ?? deletedCountQ.data?.total ?? 0,
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
                  Reviews Management
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  View and manage all product and company reviews.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 max-w-[1600px] mx-auto">
          {/* Tab Navigation and Filters */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Tab Buttons */}
                <div className="flex items-center gap-2">
                  {(['product', 'company'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        activeTab === tab
                          ? 'bg-admin-primary text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {tab === 'product' ? 'Product Reviews' : 'Company Reviews'}
                    </button>
                  ))}
                  <div className="h-6 w-px bg-slate-300 dark:bg-slate-600 mx-2" />
                  {(['All', 'Active', 'Deleted'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => {
                        if (filter === 'All') setShowDeleted(false);
                        if (filter === 'Active') setShowDeleted(false);
                        if (filter === 'Deleted') setShowDeleted(true);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        (filter === 'All' && !showDeleted) ||
                        (filter === 'Active' && !showDeleted) ||
                        (filter === 'Deleted' && showDeleted)
                          ? 'bg-admin-primary text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={
                        filter === 'All'
                          ? `Total: ${counts.All}`
                          : filter === 'Active'
                          ? `Active: ${counts.Active}`
                          : `Deleted: ${counts.Deleted}`
                      }
                    >
                      {filter === 'Deleted' ? '🗑️ Deleted' : filter}
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="flex items-center gap-3 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder={activeTab === 'product' ? 'Search products or reviews...' : 'Search companies or reviews...'}
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
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

          {/* Reviews Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                    <th className="px-6 py-3">{activeTab === 'product' ? 'Product' : 'Company'}</th>
                    {activeTab === 'product' && <th className="px-6 py-3">Company</th>}
                    <th className="px-6 py-3">Rating</th>
                    <th className="px-6 py-3">Comment</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reviewsQ.isLoading ? (
                    <tr>
                      <td className="px-6 py-6 text-slate-400" colSpan={activeTab === 'product' ? 6 : 5}>
                        Loading reviews…
                      </td>
                    </tr>
                  ) : reviewsQ.isError ? (
                    <tr>
                      <td className="px-6 py-6 text-rose-600" colSpan={activeTab === 'product' ? 6 : 5}>
                        Failed to load reviews.
                      </td>
                    </tr>
                  ) : reviews.length === 0 ? (
                    <tr>
                      <td className="px-6 py-6 text-slate-400" colSpan={activeTab === 'product' ? 6 : 5}>
                        No reviews found.
                      </td>
                    </tr>
                  ) : (
                    reviews.map((review) => (
                      <tr
                        key={review.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-slate-900 dark:text-white">
                              {activeTab === 'product' ? (
                                // product tab -> show product name
                                'product' in review ? review.product.name : (review as any).company?.name || '—'
                              ) : (
                                // company tab -> show company name for both product- and company-reviews
                                'product' in review ? review.product.company.name : (review as any).company?.name || '—'
                              )}
                            </div>
                            {'product' in review ? (
                              activeTab === 'company' ? (
                                <div className="text-xs text-slate-500 mt-1">Product: {review.product.name}</div>
                              ) : null
                            ) : null}
                          </div>
                        </td>

                        {activeTab === 'product' && (
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                            {'product' in review ? review.product.company.name : (review as any).company?.name || '—'}
                          </td>
                        )}

                        <td className="px-6 py-4">
                          <StarRating rating={('rating' in review ? review.rating : 0) as number} size="sm" />
                        </td>

                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                          {('comment' in review ? review.comment : (review as any).comment) || '—'}
                        </td>

                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                          {formatDate(('createdAt' in review ? review.createdAt : (review as any).createdAt))}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                if (confirm('Delete this review?')) {
                                  // choose correct admin delete API based on review type
                                  if ('product' in review) {
                                    deleteReviewM.mutate(review.id);
                                  } else {
                                    // company-level review
                                    // call adminDeleteCompanyReview directly
                                    (async () => {
                                      try {
                                        await adminDeleteCompanyReview(review.id);
                                        await qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
                                      } catch (err) {
                                        alert('Failed to delete company review');
                                      }
                                    })();
                                  }
                                }
                              }}
                              disabled={deleteReviewM.isPending}
                              className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors disabled:opacity-60"
                              title="Delete review"
                            >
                              <Trash2 className="h-4 w-4 text-slate-600 hover:text-rose-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {reviewsQ.isError && (
              <div className="px-6 py-4 text-xs text-rose-600 font-bold space-y-2">
                <div>Failed to load reviews. Check Network tab and response shape.</div>
                <pre className="whitespace-pre-wrap font-mono text-[11px] font-normal text-rose-700/90">
                  {getErrorText(reviewsQ.error)}
                </pre>
              </div>
            )}

            {/* Pagination */}
            {!reviewsQ.isLoading && reviews.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{reviews.length}</span> of{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{showDeleted ? counts.Deleted : counts.Active}</span> reviews
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
    </div>
  );
}
