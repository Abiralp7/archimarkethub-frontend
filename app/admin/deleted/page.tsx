'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DeletedCompaniesView from '@/components/admin/DeletedCompaniesView';
import DeletedProductsView from '@/components/admin/DeletedProductsView';

export default function DeletedWrapperPage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams?.get('tab') === 'products' ? 'products' : 'companies';
  const [activeTab, setActiveTab] = useState<'companies' | 'products'>(defaultTab);

  return (
    <div className="flex flex-col min-h-screen">

      {/* tab selector */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-4">
        <div className="max-w-[1600px] mx-auto flex gap-4">
          <button
            onClick={() => setActiveTab('companies')}
            className={`px-3 py-2 rounded-lg font-semibold text-sm ${
              activeTab === 'companies'
                ? 'bg-admin-primary/10 text-admin-primary'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Companies
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-2 rounded-lg font-semibold text-sm ${
              activeTab === 'products'
                ? 'bg-admin-primary/10 text-admin-primary'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Products
          </button>
        </div>
      </div>

      {/* content area */}
      {activeTab === 'companies' ? <DeletedCompaniesView /> : <DeletedProductsView />}
    </div>
  );
}
