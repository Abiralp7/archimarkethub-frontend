'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Star, Eye, Edit2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

type Product = {
  id: string;
  productId: string;
  name: string;
  description: string;
  status: 'In Stock' | 'Out of Stock' | 'Low Stock';
  rating: number;
  reviewCount: number;
  icon: string;
};

type Company = {
  id: string;
  name: string;
  logo: string;
  domain: string;
};

// Mock products data - replace with actual API call
const mockProducts: Product[] = [
  {
    id: '1',
    productId: '101',
    name: 'UltraHub Pro',
    description: 'Universal Docking Station',
    status: 'In Stock',
    rating: 4.8,
    reviewCount: 1200,
    icon: '💻',
  },
  {
    id: '2',
    productId: '102',
    name: 'Quantum Display',
    description: '27" 4K HDR Monitor',
    status: 'Out of Stock',
    rating: 4.5,
    reviewCount: 856,
    icon: '🖥️',
  },
  {
    id: '3',
    productId: '103',
    name: 'FlowConnect S2',
    description: 'Mesh Wi-Fi 6 Router',
    status: 'In Stock',
    rating: 4.2,
    reviewCount: 432,
    icon: '📡',
  },
  {
    id: '4',
    productId: '104',
    name: 'SyncBox Mini',
    description: 'Smart Home Audio Hub',
    status: 'In Stock',
    rating: 4.9,
    reviewCount: 2400,
    icon: '🔊',
  },
  {
    id: '5',
    productId: '105',
    name: 'PowerLink Max',
    description: 'Heavy Duty 50k Power Bank',
    status: 'Low Stock',
    rating: 3.8,
    reviewCount: 215,
    icon: '🔋',
  },
];

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
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return classes[hash % classes.length];
}

export default function CompanyProductsPage() {
  const params = useParams();
  const companyId = params?.id as string;

  // Fetch company data - replace with your actual API call
  const [company, setCompany] = useState<Company>({
    id: companyId,
    name: 'Loading...',
    logo: 'L',
    domain: 'loading...',
  });

  useEffect(() => {
    // TODO: Replace with actual API call
    // Example: fetch(`/api/admin/companies/${companyId}`)
    //   .then(res => res.json())
    //   .then(data => {
    //     setCompany({
    //       id: data.id,
    //       name: data.name,
    //       logo: initials(data.name),
    //       domain: data.domain || data.website || data.slug,
    //     });
    //   });

    // Mock data for now
    setTimeout(() => {
      setCompany({
        id: companyId,
        name: 'TechFlow Solutions',
        logo: initials('TechFlow Solutions'),
        domain: 'techflow.io',
      });
    }, 100);
  }, [companyId]);

  // Calculate stats
  const totalProducts = mockProducts.length;
  const inStockCount = mockProducts.filter((p) => p.status === 'In Stock').length;
  const inventoryPercentage = Math.round((inStockCount / totalProducts) * 100);
  const averageRating = (
    mockProducts.reduce((sum, p) => sum + p.rating, 0) / totalProducts
  ).toFixed(2);
  const totalReviews = mockProducts.reduce((sum, p) => sum + p.reviewCount, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'In Stock':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'Out of Stock':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
      case 'Low Stock':
        return 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'In Stock':
        return 'bg-emerald-600 dark:bg-emerald-400';
      case 'Out of Stock':
        return 'bg-slate-400';
      case 'Low Stock':
        return 'bg-orange-600 dark:bg-orange-400';
      default:
        return 'bg-slate-400';
    }
  };

  const logoClass = pickLogoColor(company.id || company.name);

  return (
    <div className="flex flex-col min-h-screen">

      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark">
        {/* Breadcrumb */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-4">
          <div className="max-w-[1600px] mx-auto">
            <Link
              href="/admin/companies"
              className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-admin-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Companies
            </Link>
          </div>
        </div>

        {/* Page Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Company Logo */}
                <div className={`h-16 w-16 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-2xl relative ${logoClass}`}>
                  {company.logo}
                  {company.hasBadge && (
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md">
                      <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: `"FILL" 1` }}>check</span>
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-none mb-1">
                    Products for {company.name}
                  </h1>
                  <p className="text-slate-500 text-sm">
                    Manage catalog, inventory status, and customer ratings.
                  </p>
                </div>
              </div>
              <button className="flex items-center gap-2 px-6 py-2.5 bg-admin-primary text-white rounded-lg font-semibold hover:bg-admin-primary/90 transition-colors shadow-sm">
                <Plus className="h-5 w-5" />
                Add Product
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 max-w-[1600px] mx-auto">
          {/* Products Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="px-6 py-4 text-center w-20"># ID</th>
                    <th className="px-6 py-4">Product Name</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Rating</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {mockProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* ID */}
                      <td className="px-6 py-4 text-center text-slate-400 font-medium">
                        {product.productId}
                      </td>

                      {/* Product Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-2xl">
                            {product.icon}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                              {product.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {product.description}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getStatusBadge(
                            product.status
                          )}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full mr-1.5 ${getStatusDot(
                              product.status
                            )}`}
                          ></span>
                          {product.status}
                        </span>
                      </td>

                      {/* Rating */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {product.rating}
                          </span>
                          <span className="text-xs text-slate-400">
                            ({product.reviewCount.toLocaleString()})
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="p-2 text-admin-primary hover:bg-admin-primary/10 rounded-lg transition-colors"
                            title="View Reviews"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Showing <span className="font-bold text-slate-900 dark:text-white">1</span> to{' '}
                <span className="font-bold text-slate-900 dark:text-white">5</span> of{' '}
                <span className="font-bold text-slate-900 dark:text-white">48</span> products
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled
                  className="flex items-center justify-center h-9 w-9 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-slate-500 hover:border-admin-primary hover:text-admin-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ‹
                </button>
                <button className="flex items-center justify-center h-9 w-9 bg-admin-primary text-white rounded-lg font-bold">
                  1
                </button>
                <button className="flex items-center justify-center h-9 w-9 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-admin-primary hover:text-admin-primary transition-colors font-medium">
                  2
                </button>
                <button className="flex items-center justify-center h-9 w-9 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-admin-primary hover:text-admin-primary transition-colors font-medium">
                  ...
                </button>
                <button className="flex items-center justify-center h-9 w-9 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-admin-primary hover:text-admin-primary transition-colors font-medium">
                  10
                </button>
                <button className="flex items-center justify-center h-9 w-9 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-slate-500 hover:border-admin-primary hover:text-admin-primary transition-colors">
                  ›
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <svg
                    className="h-5 w-5 text-admin-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <span className="text-sm font-bold text-slate-500">
                  Inventory Status
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                  {inventoryPercentage}%
                </h4>
                <span className="text-xs text-emerald-600 font-bold">
                  +2.4% from last month
                </span>
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                </div>
                <span className="text-sm font-bold text-slate-500">
                  Average Rating
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                  {averageRating}
                </h4>
                <span className="text-xs text-slate-400 font-bold">
                  Based on {totalReviews.toLocaleString()} reviews
                </span>
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <Eye className="h-5 w-5 text-slate-400" />
                </div>
                <span className="text-sm font-bold text-slate-500">
                  Catalog Visibility
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                  High
                </h4>
                <span className="text-xs text-slate-400 font-bold">
                  Public Listing Enabled
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}