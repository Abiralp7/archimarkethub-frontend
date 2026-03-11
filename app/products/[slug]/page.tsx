'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/apiClient';
import { useProductViewTracking } from '@/lib/useProductViewTracking';
import { ChevronRight, Download, MapPin, Phone, Mail, ExternalLink, X, Send } from 'lucide-react';
import { getProductReviews, createProductReview, createAnonymousProductReview, createCompanyReview } from '@/lib/adminApi';
import { isLoggedIn, getMe } from '@/lib/auth';

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

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const qc = useQueryClient();
  const [selectedImage, setSelectedImage] = useState(0);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewerName, setReviewerName] = useState(''); // anonymous reviewer name
  const [userRole, setUserRole] = useState<string | null>(null);

  // Company review state (inline supplier review UI)
  const [showCompanyReview, setShowCompanyReview] = useState(false);
  const [companyReviewRating, setCompanyReviewRating] = useState(0);
  const [companyReviewComment, setCompanyReviewComment] = useState('');

  const router = useRouter();
  const loggedIn = isLoggedIn();

  // Track product view after 30 seconds
  useProductViewTracking(productQ.data?.id);

  // fetch role for logged-in users so we can prevent COMPANY-role (supplier) from submitting reviews
  useEffect(() => {
    let mounted = true;
    if (!loggedIn) {
      setUserRole(null);
      return;
    }
    getMe()
      .then((u) => {
        if (mounted) setUserRole(u.role || null);
      })
      .catch(() => {
        if (mounted) setUserRole(null);
      });
    return () => { mounted = false; };
  }, [loggedIn]);

  // Fetch product
  const productQ = useQuery({
    queryKey: ['products', 'public', slug],
    queryFn: async () => {
      const res = await api.get(`/products/${slug}`);
      return res.data;
    },
    enabled: !!slug,
  });

  // Fetch reviews
  const reviewsQ = useQuery({
    queryKey: ['product', slug, 'reviews'],
    queryFn: async () => {
      const product = productQ.data;
      if (!product?.id) return { items: [], total: 0 };
      return await getProductReviews(product.id, { take: 50 });
    },
    enabled: !!productQ.data?.id,
  });

  // Create review mutation
  const createReviewM = useMutation({
    mutationFn: async () => {
      const product = productQ.data;
      if (!product?.id) throw new Error('Product not found');
      return createProductReview(product.id, {
        rating: reviewRating,
        comment: reviewComment || undefined,
      });
    },
    onSuccess: () => {
      setReviewComment('');
      setReviewRating(0);
      qc.invalidateQueries({ queryKey: ['product', slug, 'reviews'] });
      alert('Review submitted successfully!');
    },
    onError: (err: any) => {
      alert('Failed to submit review: ' + (err?.response?.data?.message || err.message || 'Unknown error'));
    },
  });

  // Anonymous (public) review mutation
  const createAnonymousReviewM = useMutation({
    mutationFn: async () => {
      const product = productQ.data;
      if (!product?.id) throw new Error('Product not found');
      return createAnonymousProductReview(product.id, {
        rating: reviewRating,
        comment: reviewComment || undefined,
        authorName: reviewerName,
      });
    },
    onSuccess: () => {
      setReviewerName('');
      setReviewComment('');
      setReviewRating(0);
      qc.invalidateQueries({ queryKey: ['product', slug, 'reviews'] });
      alert('Review submitted successfully!');
    },
    onError: (err: any) => {
      alert('Failed to submit review: ' + (err?.response?.data?.message || err.message || 'Unknown error'));
    },
  });

  const product = productQ.data;

  // Mutation for company (supplier) reviews
  const createCompanyReviewM = useMutation({
    mutationFn: async () => {
      const productCompany = product?.company;
      if (!productCompany?.id) throw new Error('Company not found');
      return createCompanyReview(productCompany.id, {
        rating: companyReviewRating,
        comment: companyReviewComment || undefined,
      });
    },
    onSuccess: () => {
      setCompanyReviewComment('');
      setCompanyReviewRating(0);
      setShowCompanyReview(false);
      qc.invalidateQueries({ queryKey: ['company', product?.company?.id, 'reviews'] });
      qc.invalidateQueries({ queryKey: ['products', 'public', slug] });
      alert('Supplier review submitted successfully!');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Unknown error';
      alert('Failed to submit supplier review: ' + msg);
    },
  });

  if (productQ.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-slate-500">Loading product...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-slate-900 font-bold mb-4">Product not found</p>
          <Link href="/products" className="text-blue-600 hover:underline">
            Back to products
          </Link>
        </div>
      </div>
    );
  }

  const images = product.images || [];
  const catalogues = product.catalogs || [];
  const company = product.company || {};
  const reviews = Array.isArray(reviewsQ.data) ? reviewsQ.data : (reviewsQ.data?.items || []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              M
            </div>
            <span className="font-bold text-slate-900">MaterialHub</span>
          </Link>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex gap-2 text-sm">
        <Link href="/" className="text-blue-600 hover:underline">
          Home
        </Link>
        <ChevronRight className="h-4 w-4 text-slate-400" />
        <Link href="/products" className="text-blue-600 hover:underline">
          Products
        </Link>
        <ChevronRight className="h-4 w-4 text-slate-400" />
        <span className="text-slate-600 truncate">{product.name}</span>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Images */}
          <div className="lg:col-span-2 space-y-4">
            {/* Main Image */}
            <div className="relative bg-slate-100 rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
              {images.length > 0 ? (
                <img
                  src={toAbsoluteUrl(images[selectedImage]?.url || images[selectedImage]?.imageUrl)}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  No image available
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`h-20 w-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
                      selectedImage === idx
                        ? 'border-blue-600'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <img
                      src={toAbsoluteUrl(img.url || img.imageUrl)}
                      alt={`Product ${idx}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}


          </div>

          {/* Right: Product Info */}
          <div className="space-y-6">
            {/* Category */}
            {product.category && (
              <p className="text-xs font-semibold text-blue-600 uppercase">
                {product.category.name}
              </p>
            )}

            {/* Title */}
            <h1 className="text-3xl font-bold text-slate-900">{product.name}</h1>

            {/* Rating & Price */}
            <div className="flex items-center gap-4">
              {(product.adminRating && product.adminRating > 0) ||
              (product.avgRating && product.avgRating > 0) ? (
                <div className="flex items-center gap-1">
                  <span className="text-2xl">⭐</span>
                  <span className="text-xl font-bold text-slate-900">
                    {parseFloat(
                      (product.adminRating && product.adminRating > 0)
                        ? product.adminRating
                        : product.avgRating
                    ).toFixed(1)}
                  </span>
                  {product.ratingCount && (
                    <span className="text-sm text-slate-500 ml-2">
                      ({product.ratingCount} {product.ratingCount === 1 ? 'review' : 'reviews'})
                    </span>
                  )}
                </div>
              ) : null}
              {product.price && (
                <div className="text-3xl font-bold text-slate-900">
                  ${parseFloat(product.price).toFixed(2)}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Description</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {product.description || 'High-quality material product'}
              </p>
            </div>

            {/* Downloads Button */}
            {catalogues.length > 0 && (
              <a
                href={toAbsoluteUrl(catalogues[0].fileUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
              >
                <Download className="h-5 w-5" />
                Download Catalogue
              </a>
            )}

            {/* Company Card */}
            {company.name && (
              <div className="border border-slate-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-600 uppercase mb-3">
                  Supplier
                </p>
                <div className="flex items-start gap-3">
                  {company.logoUrl ? (
                    <img
                      src={toAbsoluteUrl(company.logoUrl)}
                      alt={company.name}
                      className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold flex-shrink-0">
                      {company.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 truncate">{company.name}</h4>
                    {company.status && (
                      <p className="text-xs text-green-600 font-semibold">
                        ✓ Verified Supplier
                      </p>
                    )}
                    {company.adminRating && company.adminRating > 0 && (
                      <p className="text-xs text-amber-600 mt-1">⭐ {parseFloat(company.adminRating).toFixed(1)}</p>
                    )}
                  </div>
                </div>

                {/* Company Details */}
                <div className="mt-4 space-y-2 text-sm">
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{company.website}</span>
                    </a>
                  )}
                  {company.phoneNumber && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{company.phoneNumber}</span>
                    </div>
                  )}
                  {company.email && (
                    <a
                      href={`mailto:${company.email}`}
                      className="flex items-center gap-2 text-slate-600 hover:text-blue-600"
                    >
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{company.email}</span>
                    </a>
                  )}
                </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {company.slug && (
                      <Link
                        href={`/suppliers/${company.slug}`}
                        className="block w-full text-center px-3 py-2 border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors text-sm font-semibold"
                      >
                        View all products
                      </Link>
                    )}

                    {/* Review Supplier CTA (inline toggle) */}
                    <button
                      onClick={() => setShowCompanyReview((s) => !s)}
                      className="block w-full text-center px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-sm font-semibold"
                    >
                      Review Supplier
                    </button>
                  </div>

                  {showCompanyReview && (
                    <div className="mt-4 bg-slate-50 rounded-lg p-4">
                      <h4 className="font-semibold text-slate-900 mb-2">Review Supplier</h4>
                      <div className="mb-3">
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((r) => (
                            <button
                              key={r}
                              onClick={() => setCompanyReviewRating(r)}
                              className={`text-2xl transition-transform hover:scale-125 ${r <= companyReviewRating ? 'text-amber-400' : 'text-slate-300'}`}
                            >
                              ⭐
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        value={companyReviewComment}
                        onChange={(e) => setCompanyReviewComment(e.target.value)}
                        placeholder="Share your experience with this supplier..."
                        maxLength={500}
                        rows={3}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                      />
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => {
                            if (!loggedIn) return router.push('/login');
                            createCompanyReviewM.mutate();
                          }}
                          disabled={!loggedIn || createCompanyReviewM.isPending || companyReviewRating === 0}
                          className="px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 disabled:opacity-60"
                        >
                          {createCompanyReviewM.isPending ? 'Submitting...' : (!loggedIn ? 'Login to submit' : (companyReviewRating === 0 ? 'Select rating' : 'Submit Review'))}
                        </button>
                        <button
                          onClick={() => setShowCompanyReview(false)}
                          className="px-4 py-2 border border-slate-200 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Meta Info */}
            <div className="border-t border-slate-200 pt-4 text-xs text-slate-500 space-y-1">
              {product.createdAt && (
                <p>
                  Added on{' '}
                  {new Date(product.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
              {product.viewCount && (
                <p>{product.viewCount.toLocaleString()} views</p>
              )}
            </div>
          </div>
        </div>



        {/* Reviews Section */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Reviews</h2>

          {/* Add Review Form */}
          <div className="bg-slate-50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-slate-900 mb-4">Add Your Review</h3>
            <div className="space-y-4">
              {/* Rating Selector */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button
                      key={r}
                      onClick={() => setReviewRating(r)}
                      className={`text-3xl transition-transform hover:scale-125 ${
                        r <= reviewRating ? 'text-amber-400' : 'text-slate-300'
                      }`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>

              {/* Name (for anonymous users) */}
              {!loggedIn && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Your name (will be shown with the review)</label>
                  <input
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="Your name"
                    maxLength={80}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              )}

              {/* Comment */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Your Comment (Optional)</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience with this product..."
                  maxLength={500}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-xs text-slate-500 mt-1">{reviewComment.length}/500</p>
              </div>

              {/* Submit Button */}
              <button
                onClick={() => {
                  if (userRole === 'COMPANY') return alert('Suppliers cannot submit reviews.');
                  if (loggedIn) {
                    createReviewM.mutate();
                  } else {
                    createAnonymousReviewM.mutate();
                  }
                }}
                disabled={
                  (loggedIn ? createReviewM.isPending : createAnonymousReviewM.isPending) ||
                  reviewRating === 0 ||
                  (!loggedIn && reviewerName.trim().length === 0) ||
                  userRole === 'COMPANY'
                }
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {(loggedIn ? createReviewM.isPending : createAnonymousReviewM.isPending) ? 'Submitting...' : (reviewRating === 0 ? 'Select rating' : (userRole === 'COMPANY' ? 'Suppliers may only view' : 'Submit Review'))}
              </button>
            </div>
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            {reviewsQ.isLoading ? (
              <p className="text-slate-500">Loading reviews...</p>
            ) : reviews.length === 0 ? (
              <p className="text-slate-500">No reviews yet. Be the first to review!</p>
            ) : (
              reviews.map((review: any) => (
                <div key={review.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Rating */}
                      <div className="flex items-center gap-2 mb-2">
                        {[1, 2, 3, 4, 5].map((r) => (
                          <span key={r} className={r <= review.rating ? 'text-amber-400' : 'text-slate-300'}>
                            ⭐
                          </span>
                        ))}
                      </div>

                      {/* Comment */}
                      {review.comment && <p className="text-slate-700 mb-2">{review.comment}</p>}

                      {/* Meta */}
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{review.authorName ?? review.user?.email?.split('@')[0] ?? 'Anonymous'}</span>
                        {review.createdAt && (
                          <span>
                            {new Date(review.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-16 py-8 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-slate-900 mb-3 text-sm">COMPANY</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <Link href="/" className="hover:text-slate-900">
                    Home
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 mb-3 text-sm">LEGAL</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <Link href="/" className="hover:text-slate-900">
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-8 text-center text-sm text-slate-600">
            <p>© 2026 MaterialHub Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
