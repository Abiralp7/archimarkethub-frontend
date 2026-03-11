'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { me } from '@/lib/auth';
import { getPublicProducts, getPublicCompanies } from '@/lib/adminApi';
import { Search, ChevronRight } from 'lucide-react';

const categories = [
  { name: 'Construction', icon: '🏗️', slug: 'construction' },
  { name: 'Interior', icon: '🛋️', slug: 'interior' },
  { name: 'Sanitary', icon: '🚿', slug: 'sanitary' },
  { name: 'Lighting', icon: '💡', slug: 'lighting' },
];

const applications = [
  { name: 'Kitchen', desc: 'Countertops, Cabinets, Fixtures', image: '🍳' },
  { name: 'Bathroom', desc: 'Tiles, Showers, Vanities', image: '🚿' },
  { name: 'Exterior', desc: 'Cladding, Paving, Roofing', image: '🏠' },
];

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

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication
  useEffect(() => {
    me()
      .then((user) => {
        if (user.role === 'ADMIN') {
          router.replace('/admin');
        } else {
          setIsCheckingAuth(false);
        }
      })
      .catch(() => {
        setIsCheckingAuth(false);
      });
  }, [router]);

  // Fetch public products
  const productsQ = useQuery({
    queryKey: ['products', 'public', searchQuery],
    queryFn: async () => {
      const res = await getPublicProducts({
        q: searchQuery || undefined,
        take: 12,
      });
      return res;
    },
    enabled: !isCheckingAuth,
  });

  // Fetch companies
  const companiesQ = useQuery({
    queryKey: ['companies', 'public'],
    queryFn: async () => {
      const res = await getPublicCompanies({ take: 50 });
      return res;
    },
    enabled: !isCheckingAuth,
  });

  const products = Array.isArray(productsQ.data) ? productsQ.data : productsQ.data?.items || [];

  if (isCheckingAuth) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="size-8 text-blue-600">
              <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z" />
                <path d="M24 8.18819L33.4123 11.574L24 15.2071L14.5877 11.574L24 8.18819ZM9 15.8487L21 20.4805V37.6263L9 32.9945V15.8487ZM27 37.6263V20.4805L39 15.8487V32.9945L27 37.6263ZM25.354 2.29885C24.4788 1.98402 23.5212 1.98402 22.646 2.29885L4.98454 8.65208C3.7939 9.08038 3 10.2097 3 11.475V34.3663C3 36.0196 4.01719 37.5026 5.55962 38.098L22.9197 44.7987C23.6149 45.0671 24.3851 45.0671 25.0803 44.7987L42.4404 38.098C43.9828 37.5026 45 36.0196 45 34.3663V11.475C45 10.2097 44.2061 9.08038 43.0155 8.65208L25.354 2.29885Z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">MaterialHub</h1>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/products" className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold transition-colors">
              Products
            </Link>
            <Link href="/supplier-login" className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-semibold">
              Suppliers Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-slate-50 to-white px-6 py-12">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-900 mb-4">
            Find the perfect materials for<br />your next project.
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Explore the world's largest library of architectural and interior design materials.
          </p>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            {categories.map((cat) => (
              <button
                key={cat.slug}
                className="px-6 py-3 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="flex gap-2 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search 50,000+ materials, brands, or products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Featured Materials */}
      <section className="px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-slate-900">Featured Materials</h3>
            <Link href="/products" className="text-blue-600 font-semibold flex items-center gap-1 hover:underline">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {productsQ.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-slate-100 h-64 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No products found. Check back soon!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.slice(0, 4).map((product: any) => (
                <Link key={product.id} href={`/products/${product.slug}`} className="group cursor-pointer">
                  <div className="bg-gradient-to-br from-slate-200 to-slate-300 h-48 rounded-lg overflow-hidden mb-3 flex items-center justify-center text-4xl group-hover:scale-105 transition-transform">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={toAbsoluteUrl(product.images[0].url || product.images[0].imageUrl)}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      ['🪨', '🌳', '🧱', '⚙️'][Math.floor(Math.random() * 4)]
                    )}
                  </div>
                  <p className="text-xs font-semibold text-blue-600 mb-1">
                    {product.category?.name || 'MATERIAL'}
                  </p>
                  <h4 className="font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {product.name}
                  </h4>
                  {product.company && (
                    <p className="text-xs text-slate-600 truncate">
                      {product.company.name || product.company}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Shop by Application */}
      <section className="px-6 py-12 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-2xl font-bold text-slate-900 mb-8">Shop by Application</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {applications.map((app) => (
              <button
                key={app.name}
                className="group relative overflow-hidden rounded-lg h-44 text-white"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-6xl">
                  {app.image}
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-start p-6">
                  <div className="text-left">
                    <h4 className="text-xl font-bold mb-1">{app.name}</h4>
                    <p className="text-sm text-white/80">{app.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Suppliers */}
      <section className="px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-2xl font-bold text-slate-900 mb-8">Top Suppliers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {companiesQ.data?.items?.slice(0, 4).map((company: any) => (
              <div
                key={company.id}
                className="bg-white border border-slate-200 rounded-lg p-6 text-center hover:shadow-lg transition-shadow"
              >
                <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center mx-auto mb-4 text-lg">
                  {company.name?.charAt(0).toUpperCase()}
                </div>
                <h4 className="font-bold text-slate-900 mb-1">{company.name}</h4>
                <p className="text-xs text-slate-600">{company.domain}</p>
                <div className="h-8" />
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 font-semibold hover:underline"
                >
                  Visit Website →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white px-6 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold mb-4">Are you a supplier?</h3>
          <p className="text-lg text-blue-50 mb-8">
            Join MaterialHub and reach thousands of architects and designers.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/supplier-login"
              className="px-8 py-3 bg-white text-blue-600 rounded-lg font-bold hover:bg-blue-50 transition-colors"
            >
              Supplier Login
            </Link>
            <Link
              href="/supplier-register"
              className="px-8 py-3 border-2 border-white text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
            >
              Apply as Supplier
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 px-6 py-12">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h5 className="font-bold text-white mb-4">Company</h5>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Press</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-white mb-4">Resources</h5>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Professionals</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-white mb-4">Legal</h5>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Cookies</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-white mb-4">Connect</h5>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
              <li><a href="#" className="hover:text-white transition-colors">LinkedIn</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-700 pt-8 text-center text-sm">
          <p>© 2025 MaterialHub Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

