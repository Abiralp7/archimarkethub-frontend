'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowRight } from 'lucide-react';
import { getPublicCompanies, getPublicProducts } from '@/lib/adminApi';
import CompanyLogoBadge from '@/components/supplier/CompanyLogoBadge';

const categories = [
  {
    name: 'Construction',
    slug: 'construction',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBexMOp9zoASdkxlvgLXrMzlMuL9QoTSgF3CJSCpaVjdkq8FIL2ANFmKK6nuSZtS47iwPAabQkLA4jIBIPWb8RSnK2XV9aSbz-89FOIV4iPj9L-lj_SErZzWCX49YGtNfw52VUWKlIawuAlViFmIu-nmgmvATdF9GPaiDY9cok0i94ujt23lqIwLE68haQei91jpy66ilYfvIPI-d7yQCByzw-ThZS4rnCjUsuy_WQFyNObPUI93l63OnKVWiaoXOT3l-dxO9RpKkjc',
    subtitle: 'Concrete, Bricks, Steel',
    icon: 'foundation',
  },
  {
    name: 'Interior',
    slug: 'interior',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCDOKVgdOGACY3uwltmsySpntvliKvrL8Q1RVKxIDVYD2nCtYjwhrSHEAT-a54rVVVaBUBmZqbKgTfw9hiMfYP-fa5r9WfspgpKqP7YvjuBY7gQxBvSI7S5d6j19SNqVE64ps30KKkrmXUwidSL1qBnGWb2Znhnus8FhHnynM1j8LdbVNrH56VZwGIwQl7qCiHhAH-wJY5e3qk9D5aOsdRDQ3TQ9CPZOgSBqnaDzEMso5zoxiFPUmPAbQmEZwx8B00817VkPJdaYgwl',
    subtitle: 'Fabrics, Paint, Flooring',
    icon: 'chair',
  },
  {
    name: 'Sanitary',
    slug: 'sanitary',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCpyiciRXg5v-uzPBiqRaKULo7KvNR7Lf7trgIFTulq4htg3R5rfMRruoz5tLaeGHBUXynfNCSYf9q9k48hnzyK6EjofT5Q1NjPOnBR3KvRnMWibd-U4c0DnxKTFelLvgrXQ5mMyK5p35ps4VpO8PfE1rz6Z3Y7abd099Qei4gwByzvdZPk_rxlJsUgoCL77RfzBXXg6e0eZCa9wbP7WVoYEczLyOUym4YV4PKh9E8o5YHgoT4hANyT1S4bSZad35e1Htb9kxd6Q-sU',
    subtitle: 'Taps, Sinks, Ceramics',
    icon: 'water_drop',
  },
  {
    name: 'Lighting',
    slug: 'lighting',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBhh1bOfhnMa8QDAPkMtd-LKFayF7YmN7YwC6_i0otkxX0efXT42mCtJaVcU_q2q5xK090j2f1J6MXUSmtZbxc64JcNsljyNbsjTBQ1bhXmJnNKzi4EXpI2i-g79Mb0sCneKJqvbGtXhGdP7YtM4q7ObjF5upru4zJsmaDr7MIcA7WgwxHc-pYwZl4WXvrM1DXmJIQIBmMTyfeotBpX5hJuXCvFUQRRbY7ZKRG4EcS6vlsSGoNgPB2T83nWD0eGUVxLvrSL_jYjQ68N',
    subtitle: 'Lamps, LED, Fixtures',
    icon: 'lightbulb',
  },
];



const applications = [
  {
    name: 'Kitchen',
    slug: 'kitchen',
    desc: 'Countertops, Cabinets, Fixtures',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBhQNCND7arUXILcFlH40hIwTZxrM6UE8ADgm376suIJIs6U87qqBfxURNPSB1zVG77XuQExOGoSgK7-IEfeWe4K_jO3G6-Nhs5k-3JTkCFtYpm3fQufuvbNC4WLZwFLLSjYsEKjyBnEhFFl5J-0zFcwiaJ9YahPvcRVVS-pAJNnNdhdCYqTpXEh7Mgbvji1r5Kzou48zjfEeRSgulcrPqs6mJkqeQbe0idHH9aNVa1RTRxf7M1CrAXL5g5DnQlEGOzBl7Sy7oRmDea',
  },
  {
    name: 'Bathroom',
    slug: 'bathroom',
    desc: 'Tiles, Showers, Vanities',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAve-TJU6ax2FwuuP84vIYJOpO2QaCnO3vZjJLHGFsrv36kCHnw5sr6d1JTEcEmkOyMk1-uvqu964vc18tHlPTpRcFjyxI6dEQPhJILMcmlmUCKUHM0tQmnwvaUs3ObWBoUPhic7j_sXKOmh9VqAhEntmACU9tgfmMRUPUgLq3ctLfMAR_QIgcPMtlRXv76O6zE67tiLEbjzApO_8RjPufT4n4bWYkw3u2Z-4T_0hwfksOkOROKKRexoHAjQumg0cbBHxgQH4-KZtOx',
  },
  {
    name: 'Exterior',
    slug: 'exterior',
    desc: 'Cladding, Paving, Roofing',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAQVGkxEcpyBlNaext3qV6AYI6WC8Vk0nRE4GTJSXjMvb0sYVZjOn4uyV38-5vlOQrY31iEvKZt5S5JbSNeTAptPuWAXazn3Nj2PboG8Qh3xrcFbMJiNDZ293ji_y22mDoFgx_RTZCzC0UFriZ3CpiUnJalzNGkbV-qsljfdr8Bu8oSOB13ksHHe8gNMUN39C32y6frpEK2RPcErIqMc1mie_EWRaXTbDwdWoU_giKbJDZlVNve_swA4pfog8QEUWKRlBXiPUnlJAlM',
  },
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
  const [searchQuery, setSearchQuery] = useState('');

  const productsQ = useQuery({
    queryKey: ['publicProducts', 'homepage', searchQuery],
    queryFn: () => getPublicProducts({ q: searchQuery || undefined, take: 24 }),
    staleTime: 1000 * 60 * 5,
  });

  const companiesQ = useQuery({
    queryKey: ['publicCompanies', 'top'],
    queryFn: () => getPublicCompanies({ take: 20 }),
    staleTime: 1000 * 60 * 5,
  });

  const suppliers = Array.isArray(companiesQ.data) ? companiesQ.data : companiesQ.data?.items || [];
  const productItems = Array.isArray(productsQ.data) ? productsQ.data : productsQ.data?.items || [];
  const displaySuppliers = suppliers.length > 0 ? [...suppliers, ...suppliers] : [];
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101922] px-6 lg:px-10 py-3 shadow-sm">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">layers</span>
            </div>
            <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">MaterialHub</h2>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/supplier-login"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-text-sec-light dark:text-text-sec-dark hover:text-primary dark:hover:text-primary border border-slate-200 dark:border-slate-700 rounded-lg transition-colors bg-slate-50 dark:bg-slate-800/50"
            >
              <span className="material-symbols-outlined text-[20px]">storefront</span>
              Suppliers Login
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center w-full">
        <div className="w-full max-w-[1280px] px-4 md:px-8 lg:px-12 flex flex-col gap-10 py-8 md:py-12">
          <div className="flex flex-col items-center text-center gap-3 animate-fade-in-up">
            <h1 className="tracking-tight text-3xl md:text-5xl font-extrabold leading-tight max-w-3xl">
              Find the perfect materials for your next project.
            </h1>
            <p className="text-text-sec-light dark:text-text-sec-dark text-base md:text-lg font-normal max-w-2xl">
              Explore the world's largest library of architectural and interior design materials.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/products?categorySlug=${category.slug}`}
                className="group relative overflow-hidden rounded-xl aspect-[4/3] cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  style={{ backgroundImage: `url('${category.image}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-4 w-full">
                  <span className="text-white/80 mb-2 text-3xl">{category.icon === 'foundation' ? '🏠' : category.icon === 'chair' ? '🛋️' : category.icon === 'water_drop' ? '💧' : '💡'}</span>
                  <h3 className="text-white text-xl font-bold leading-tight">{category.name}</h3>
                  <p className="text-white/70 text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                    {category.subtitle}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <div className="w-full flex justify-center mt-2 mb-6">
            <div className="w-full max-w-4xl bg-white dark:bg-card-dark rounded-2xl shadow-lg p-3 md:p-4 border border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-3 w-full h-12 md:h-14">
                <Search className="text-slate-400 pl-2" />
                <input
                  className="flex-1 bg-transparent border-none text-text-main-light dark:text-white placeholder:text-slate-400 focus:ring-0 text-base md:text-lg outline-none"
                  placeholder="Search 50,000+ materials, brands, or products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  className="bg-primary hover:bg-blue-600 text-white font-bold rounded-lg px-6 h-full transition-colors flex items-center gap-2"
                  type="button"
                >
                  Search
                </button>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full mt-10">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-text-main-light dark:text-white text-2xl font-bold leading-tight tracking-tight">Latest Products</h2>
              <Link href="/products" className="text-primary text-sm font-semibold hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card-dark p-4">
              {productsQ.isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, index) => (
                    <div key={index} className="h-44 rounded-3xl bg-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : productItems.length === 0 ? (
                <div className="text-center py-16 text-sm text-text-sec-light dark:text-text-sec-dark">
                  No products found.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {productItems.map((product: any) => (
                    <Link key={product.id} href={`/products/${product.slug}`} className="group overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 transition hover:shadow-lg">
                      <div className="h-40 overflow-hidden bg-slate-200 dark:bg-slate-800">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={toAbsoluteUrl(product.images[0].url || product.images[0].imageUrl)}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-4xl">🧱</div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                          {product.category?.name || 'Material'}
                        </p>
                        <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-white line-clamp-2">{product.name}</h3>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 truncate">{product.company?.name || product.company || 'No supplier'}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6 w-full mt-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-text-main-light dark:text-white text-2xl font-bold leading-tight tracking-tight">Shop by Application</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {applications.map((item) => (
                <Link
                  key={item.slug}
                  href={`/products?categorySlug=${item.slug}`}
                  className="group relative rounded-2xl overflow-hidden h-64 md:h-72 cursor-pointer"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{ backgroundImage: `url('${item.image}')` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-6 left-6">
                    <h3 className="text-white text-2xl font-bold">{item.name}</h3>
                    <p className="text-white/80 text-sm mt-1">{item.desc}</p>
                  </div>
                  <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="h-4 w-4 text-white" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6 w-full mt-12">
            <div className="flex items-center justify-between px-2">
              <div>
                <h2 className="text-text-main-light dark:text-white text-2xl font-bold leading-tight tracking-tight">Top Suppliers</h2>
                <p className="text-sm text-text-sec-light dark:text-text-sec-dark mt-1">
                  Our Trusted All-in-one Suppliers.
                </p>
              </div>
              <span className="text-sm text-text-sec-light dark:text-text-sec-dark">{suppliers.length} suppliers</span>
            </div>
            <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card-dark py-6">
              <div className="marquee px-6">
                <div className="marquee-track flex items-center gap-6">
                  {companiesQ.isLoading ? (
                    <div className="flex min-w-full items-center justify-center py-10 text-sm text-text-sec-light dark:text-text-sec-dark">
                      Loading suppliers...
                    </div>
                  ) : displaySuppliers.length > 0 ? (
                    displaySuppliers.map((company: any, index: number) => (
                      <div key={`${company.id}-${index}`} className="group min-w-[160px] shrink-0 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 text-center transition duration-300 hover:-translate-y-1">
                        <div className="mx-auto mb-3 flex justify-center">
                          <div className="h-20 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 relative">
                            {company.logoUrl ? (
                              <div className="relative h-full w-full">
                                <img
                                  src={toAbsoluteUrl(company.logoUrl)}
                                  alt={company.name}
                                  className="h-full w-full object-cover transition duration-300 filter grayscale opacity-50 group-hover:filter-none group-hover:opacity-100"
                                />
                                {company.hasBadge && (
                                  <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-slate-200 dark:bg-slate-700 text-2xl text-slate-500 dark:text-slate-300">
                                {company.name?.charAt(0).toUpperCase() || '?'}
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{company.name}</p>
                      </div>
                    ))
                  ) : (
                    <div className="flex min-w-full items-center justify-center py-10 text-sm text-text-sec-light dark:text-text-sec-dark">
                      No verified suppliers found yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      <footer className="bg-white dark:bg-[#0c141c] border-t border-slate-200 dark:border-slate-800 py-12 px-6 lg:px-10">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-text-main-light dark:text-white">
              <div className="h-10 w-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">layers</span>
              </div>
              <h2 className="text-lg font-bold">MaterialHub</h2>
            </div>
            <p className="text-text-sec-light dark:text-text-sec-dark text-sm">
              Connecting architects and designers with the world's best material suppliers.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-text-main-light dark:text-white font-bold text-sm uppercase tracking-wider">Company</h3>
            <a className="text-text-sec-light dark:text-text-sec-dark hover:text-primary text-sm" href="#">About Us</a>
            <a className="text-text-sec-light dark:text-text-sec-dark hover:text-primary text-sm" href="#">Careers</a>
            <a className="text-text-sec-light dark:text-text-sec-dark hover:text-primary text-sm" href="#">Press</a>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-text-main-light dark:text-white font-bold text-sm uppercase tracking-wider">Resources</h3>
            <a className="text-text-sec-light dark:text-text-sec-dark hover:text-primary text-sm" href="#">Professionals</a>
            <a className="text-text-sec-light dark:text-text-sec-dark hover:text-primary text-sm" href="#">Vendor Portal</a>
            <a className="text-text-sec-light dark:text-text-sec-dark hover:text-primary text-sm" href="#">Help Center</a>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-text-main-light dark:text-white font-bold text-sm uppercase tracking-wider">Legal</h3>
            <a className="text-text-sec-light dark:text-text-sec-dark hover:text-primary text-sm" href="#">Terms</a>
            <a className="text-text-sec-light dark:text-text-sec-dark hover:text-primary text-sm" href="#">Privacy</a>
            <a className="text-text-sec-light dark:text-text-sec-dark hover:text-primary text-sm" href="#">Cookies</a>
          </div>
        </div>
        <div className="max-w-[1280px] mx-auto mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 text-center text-text-sec-light dark:text-text-sec-dark text-sm">
          © 2025 MaterialHub Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
