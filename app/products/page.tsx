'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/apiClient';
import { getCategories } from '@/lib/adminApi';
import { Search, ChevronRight } from 'lucide-react';
import { userVisibleProductStatus } from '@/lib/productStatus';

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

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get('categorySlug') || '';
  const [searchQuery, setSearchQuery] = useState('');

  const categoryLookupQ = useQuery({
    queryKey: ['categories', 'lookup', categorySlug],
    queryFn: () => getCategories(),
    enabled: !!categorySlug,
    staleTime: 1000 * 60 * 5,
  });

  const selectedCategory = useMemo(() => {
    const normalized = categorySlug.trim().toLowerCase();
    if (!normalized || !categoryLookupQ.data) return null;

    return (categoryLookupQ.data || []).find((cat: any) =>
      cat.slug?.toLowerCase() === normalized ||
      cat.name?.trim().toLowerCase() === normalized,
    ) || null;
  }, [categoryLookupQ.data, categorySlug]);

  // Fetch products
  const productsQ = useQuery({
    queryKey: ['products', 'public', { q: searchQuery, categorySlug }],
    queryFn: async () => {
      const res = await api.get('/products', {
        params: {
          q: searchQuery || undefined,
          categorySlug: categorySlug || undefined,
          sort: 'newest',
          take: 50,
        },
      });
      return res.data;
    },
  });

  const products = Array.isArray(productsQ.data)
    ? productsQ.data
    : productsQ.data?.items || [];

function humanizeSlug(slug: string) {
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

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
        <span className="text-slate-600">Products</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {categorySlug ? (
          <section className="mb-8 rounded-3xl bg-gradient-to-r from-slate-900 to-blue-700 p-8 text-white">
            <p className="text-xs uppercase tracking-[0.3em] text-blue-200">Category</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">
              {selectedCategory?.name || humanizeSlug(categorySlug)}
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-200">
              {selectedCategory?.description || `Browse the best verified products for ${selectedCategory?.name || humanizeSlug(categorySlug)}.`}
            </p>
          </section>
        ) : null}

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <h1 className="text-3xl font-bold text-slate-900">Browse Products</h1>
          <p className="text-slate-600">
            Explore high-quality materials from verified suppliers
          </p>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Products Grid */}
        {productsQ.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-slate-500">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-slate-500">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product: any) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-all"
              >
                {/* Product Image */}
                <div className="relative h-48 bg-slate-100 overflow-hidden">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={toAbsoluteUrl(product.images[0].url || product.images[0].imageUrl)}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      No image
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <p className="text-xs font-semibold text-blue-600 uppercase mb-1">
                    {product.category?.name || 'Material'}
                  </p>
                  <p className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold mb-2 bg-slate-100 text-slate-700">
                    {userVisibleProductStatus(product.status)}
                  </p>
                  <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-600">
                    {product.name}
                  </h3>
                  <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                    {product.description || 'High-quality material'}
                  </p>

                  {/* Rating and Price */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {(product.adminRating && product.adminRating > 0) ||
                      (product.avgRating && product.avgRating > 0) ? (
                        <>
                          <span>⭐</span>
                          <span className="text-sm font-semibold text-slate-900">
                            {parseFloat(
                              (product.adminRating && product.adminRating > 0)
                                ? product.adminRating
                                : product.avgRating
                            ).toFixed(1)}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-slate-400">No rating</span>
                      )}
                    </div>
                    {product.price && (
                      <span className="font-bold text-slate-900">
                        ${parseFloat(product.price).toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Company with Logo */}
                  {product.company && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                      <div className="relative flex-shrink-0">
                        {product.company.logoUrl ? (
                          <img
                            src={product.company.logoUrl}
                            alt={product.company.name}
                            className="h-6 w-6 rounded object-cover"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                            {product.company.name.charAt(0)}
                          </div>
                        )}
                        {product.company.hasBadge && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-blue-500 rounded-full border border-white flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-[10px]" style={{ fontVariationSettings: `"FILL" 1` }}>check</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">
                          {product.company.name}
                        </p>
                        {product.company.adminRating && product.company.adminRating > 0 && (
                          <p className="text-xs text-amber-600 flex items-center gap-1">
                            ⭐ {parseFloat(product.company.adminRating).toFixed(1)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-16 py-8 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-sm text-slate-600">
          <p>© 2026 MaterialHub Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
