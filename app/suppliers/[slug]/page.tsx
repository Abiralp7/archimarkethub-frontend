'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import {
  getPublicCompany,
  getPublicProducts,
  getCompanyReviews,
  createCompanyReview,
  createAnonymousCompanyReview,
} from '@/lib/adminApi';
import { isLoggedIn, getMe } from '@/lib/auth';
import { ChevronRight, Phone, Mail, ExternalLink, Send } from 'lucide-react';

function toAbsoluteUrl(url?: string) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  let relativePath = url;
  const uploadsMatch = url.match(/[\\\/]uploads[\\\/]/i);
  if (uploadsMatch) {
    const index = url.toLowerCase().indexOf('uploads');
    if (index !== -1) {
      relativePath = url.substring(index);
    }
  }
  relativePath = relativePath.replaceAll('\\', '/');
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:5000';
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${base}${path}`;
}

export default function SupplierPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const qc = useQueryClient();
  const loggedIn = isLoggedIn();

  useEffect(() => {
    let mounted = true;
    if (!loggedIn) {
      setUserRole(null);
      return;
    }

    getMe().then((u) => {
      if (mounted) setUserRole(u.role || null);
    }).catch(() => { if (mounted) setUserRole(null); });

    return () => { mounted = false; };
  }, [loggedIn]);

  const [showCompanyReview, setShowCompanyReview] = useState(false);
  const [companyReviewRating, setCompanyReviewRating] = useState(0);
  const [companyReviewComment, setCompanyReviewComment] = useState('');
  const [companyReviewerName, setCompanyReviewerName] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);

  const companyQ = useQuery({
    queryKey: ['company', 'public', slug],
    queryFn: async () => getPublicCompany(slug),
    enabled: !!slug,
  });

  const productsQ = useQuery({
    queryKey: ['products', 'public', { companyId: companyQ.data?.id }],
    queryFn: async () => getPublicProducts({ companyId: companyQ.data?.id, take: 50 }),
    enabled: !!companyQ.data?.id,
  });

  // Fetch combined company + product reviews for this supplier
  const companyReviewsQ = useQuery({
    queryKey: ['company', companyQ.data?.id, 'reviews'],
    queryFn: async () => {
      const comp = companyQ.data;
      if (!comp?.id) return { items: [], total: 0 };
      return await getCompanyReviews(comp.id, { take: 50 });
    },
    enabled: !!companyQ.data?.id,
  });

  const createCompanyReviewM = useMutation({
    mutationFn: async () => {
      const company = companyQ.data;
      if (!company?.id) throw new Error('Company not found');
      return createCompanyReview(company.id, {
        rating: companyReviewRating,
        comment: companyReviewComment || undefined,
      });
    },
    onSuccess: () => {
      setCompanyReviewComment('');
      setCompanyReviewRating(0);
      setShowCompanyReview(false);
      qc.invalidateQueries({ queryKey: ['company', 'public', slug] });
      qc.invalidateQueries({ queryKey: ['company', companyQ.data?.id, 'reviews'] });
      alert('Supplier review submitted');
    },
    onError: (err: any) => {
      alert('Failed to submit review: ' + (err?.response?.data?.message || err.message || 'Unknown error'));
    },
  });

  const createAnonymousCompanyReviewM = useMutation({
    mutationFn: async () => {
      const company = companyQ.data;
      if (!company?.id) throw new Error('Company not found');
      return createAnonymousCompanyReview(company.id, {
        rating: companyReviewRating,
        comment: companyReviewComment || undefined,
        authorName: companyReviewerName,
      });
    },
    onSuccess: () => {
      setCompanyReviewComment('');
      setCompanyReviewRating(0);
      setCompanyReviewerName('');
      setShowCompanyReview(false);
      qc.invalidateQueries({ queryKey: ['company', 'public', slug] });
      qc.invalidateQueries({ queryKey: ['company', companyQ.data?.id, 'reviews'] });
      alert('Supplier review submitted');
    },
    onError: (err: any) => {
      alert('Failed to submit review: ' + (err?.response?.data?.message || err.message || 'Unknown error'));
    },
  });

  const company = companyQ.data;
  const products = Array.isArray(productsQ.data) ? productsQ.data : productsQ.data?.items || [];
  const companyReviews = Array.isArray(companyReviewsQ.data) ? companyReviewsQ.data : companyReviewsQ.data?.items || [];

  if (companyQ.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-slate-500">Loading supplier...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-slate-900 font-bold mb-4">Supplier not found</p>
          <Link href="/products" className="text-blue-600 hover:underline">
            Back to products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">M</div>
            <span className="font-bold text-slate-900">MaterialHub</span>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-start gap-6">
          <div className="relative">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt={company.name} className="h-20 w-20 rounded-lg object-cover" />
            ) : (
              <div className="h-20 w-20 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xl">{company.name?.charAt(0)}</div>
            )}
            {company.hasBadge && (
              <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>

            <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
              {(company.adminRating && company.adminRating > 0) || (company.avgRating && Number(company.avgRating) > 0) ? (
                <div className="flex items-center gap-2">
                  <span className="text-amber-400">⭐</span>
                  <span className="text-sm font-semibold text-slate-900">{parseFloat((company.adminRating && Number(company.adminRating) > 0) ? String(company.adminRating) : String(company.avgRating)).toFixed(1)}</span>
                  <span className="text-slate-500 text-xs">({company.ratingCount ?? 0})</span>
                </div>
              ) : (
                <span className="text-sm text-slate-400">No rating</span>
              )}
            </div>

            {company.website && (
              <a href={company.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-2 mt-2">
                <ExternalLink className="h-4 w-4" />
                <span className="truncate max-w-[40ch]">{company.website}</span>
              </a>
            )}

            <div className="mt-3 flex items-center gap-3 text-sm text-slate-600">
              {company.phoneNumber && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{company.phoneNumber}</span>
                </div>
              )}
              {company.email && (
                <a className="flex items-center gap-2" href={`mailto:${company.email}`}>
                  <Mail className="h-4 w-4" />
                  <span>{company.email}</span>
                </a>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowCompanyReview((s) => !s)} className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm font-semibold">
                Review Supplier
              </button>
              <button onClick={() => router.push('/products')} className="px-4 py-2 border border-slate-200 rounded-lg text-sm">
                Browse products
              </button>
            </div>

            {showCompanyReview && (
              <div className="mt-4 bg-slate-50 rounded-lg p-4 max-w-2xl">
                <h4 className="font-semibold text-slate-900 mb-2">Write a review</h4>
                <div className="mb-3 flex gap-2">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button key={r} onClick={() => setCompanyReviewRating(r)} className={`text-2xl ${r <= companyReviewRating ? 'text-amber-400' : 'text-slate-300'}`}>⭐</button>
                  ))}
                </div>

                {!loggedIn && (
                  <div className="mb-3">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Your name</label>
                    <input value={companyReviewerName} onChange={(e) => setCompanyReviewerName(e.target.value)} placeholder="Your name" maxLength={80} className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                  </div>
                )}

                <textarea value={companyReviewComment} onChange={(e) => setCompanyReviewComment(e.target.value)} rows={3} maxLength={500} className="w-full px-4 py-2 border border-slate-200 rounded-lg resize-none" placeholder="Share your experience with this supplier..." />
                <div className="mt-3 flex gap-2">
                  <button onClick={() => {
                    if (userRole === 'COMPANY') return alert('Suppliers cannot submit reviews.');
                    if (loggedIn) {
                      createCompanyReviewM.mutate();
                    } else {
                      createAnonymousCompanyReviewM.mutate();
                    }
                  }} disabled={(loggedIn ? createCompanyReviewM.isPending : createAnonymousCompanyReviewM.isPending) || companyReviewRating === 0 || (!loggedIn && companyReviewerName.trim().length === 0) || userRole === 'COMPANY'} className="px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold disabled:opacity-60">
                    <Send className="h-4 w-4 inline-block mr-2" />
                    {(loggedIn ? createCompanyReviewM.isPending : createAnonymousCompanyReviewM.isPending) ? 'Submitting...' : (companyReviewRating === 0 ? 'Select rating' : (userRole === 'COMPANY' ? 'Suppliers may only view' : 'Submit review'))}
                  </button>
                  <button onClick={() => setShowCompanyReview(false)} className="px-4 py-2 border border-slate-200 rounded-lg">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Products from {company.name}</h2>
          {productsQ.isLoading ? (
            <p className="text-slate-500">Loading products...</p>
          ) : products.length === 0 ? (
            <p className="text-slate-500">No products found for this supplier.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product: any) => (
                <Link key={product.id} href={`/products/${product.slug}`} className="group border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-all">
                  <div className="relative h-44 bg-slate-100 overflow-hidden">
                    {product.images && product.images.length > 0 ? (
                      <img src={toAbsoluteUrl(product.images[0].url || product.images[0].imageUrl)} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">No image</div>
                    )}
                  </div>

                  <div className="p-4">
                    <p className="text-xs font-semibold text-blue-600 uppercase mb-1">{product.category?.name || 'Material'}</p>
                    <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-600">{product.name}</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {(product.adminRating && product.adminRating > 0) || (product.avgRating && product.avgRating > 0) ? (
                          <>
                            <span>⭐</span>
                            <span className="text-sm font-semibold text-slate-900">{parseFloat((product.adminRating && product.adminRating > 0) ? product.adminRating : product.avgRating).toFixed(1)}</span>
                          </>
                        ) : (
                          <span className="text-sm text-slate-400">No rating</span>
                        )}
                      </div>
                      {product.price && (<span className="font-bold text-slate-900">${parseFloat(product.price).toFixed(2)}</span>)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Reviews for {company.name}</h2>

          {companyReviewsQ.isLoading ? (
            <p className="text-slate-500">Loading reviews...</p>
          ) : companyReviews.length === 0 ? (
            <p className="text-slate-500">No reviews yet.</p>
          ) : (
            <div className="space-y-4">
              {companyReviews.map((review: any) => (
                <div key={review.id} className="p-4 border border-slate-200 rounded-lg bg-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                        <div className="flex items-center gap-1 text-amber-400 font-semibold">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className={`${i < (review.rating || 0) ? 'text-amber-400' : 'text-slate-200'}`}>⭐</span>
                          ))}
                          <span className="ml-2 text-slate-500 text-xs">· {new Date(review.createdAt).toLocaleDateString()}</span>
                        </div>
                        {review.product?.name && <span className="ml-3 text-sm text-slate-500">Product: {review.product.name}</span>}
                      </div>
                      <p className="text-slate-800">{review.comment || <span className="text-slate-400">No comment</span>}</p>
                      <div className="text-xs text-slate-500 mt-2">{review.authorName || review.user?.email || 'Anonymous'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-slate-200 mt-16 py-8 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-sm text-slate-600">
          <p>© 2026 MaterialHub Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
