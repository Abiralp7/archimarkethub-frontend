'use client';

import { useState } from 'react';
import { Search, Filter, RotateCcw, Trash2, Eye } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminCompanies, adminRestoreCompany, adminPermanentDeleteCompany } from '@/lib/adminApi';

function formatDate(input?: string): string {
  if (!input) return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
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

export default function DeletedCompaniesView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [restoreConfirm, setRestoreConfirm] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: companiesData, isLoading, isError } = useQuery({
    queryKey: ['admin', 'companies', 'deleted', searchQuery],
    queryFn: () =>
      adminCompanies({
        q: searchQuery || undefined,
        deleted: 'deleted',
        take: 100,
      }),
  });

  const restoreM = useMutation({
    mutationFn: (id: string) => adminRestoreCompany(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'companies'] });
      setRestoreConfirm(null);
    },
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => adminPermanentDeleteCompany(id),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['admin', 'companies', 'deleted', searchQuery] });
      await qc.invalidateQueries({ queryKey: ['admin', 'companies'] });
      setDeleteConfirm(null);
    },
  });

  const allCompanies = Array.isArray(companiesData)
    ? companiesData
    : (companiesData?.items || companiesData?.data || []);

  const filteredCompanies = allCompanies;
  const companyPendingDelete =
    deleteConfirm && filteredCompanies.find((c: any) => c.id === deleteConfirm);

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Deleted Companies
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Review and restore deleted company profiles. Restoring a company will also restore all its deleted products.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 rounded-lg text-sm font-semibold">
                {filteredCompanies.length} Deleted
              </span>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="mt-6 flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-admin-primary dark:text-white"
              />
            </div>
            <button className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <Filter className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Deleted Companies Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mt-6 mx-8 max-w-[1600px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                <th className="px-6 py-3">Company</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Owner Email</th>
                <th className="px-6 py-3">Deleted Date</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td className="px-6 py-6 text-slate-400" colSpan={5}>
                    Loading deleted companies…
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td className="px-6 py-6 text-rose-600" colSpan={5}>
                    Failed to load deleted companies.
                  </td>
                </tr>
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td className="px-6 py-6 text-slate-400" colSpan={5}>
                    No deleted companies found.
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company: any) => {
                  const logoColor = pickLogoColor(company.id || company.name);
                  const ownerEmail = company.owner?.email || company.ownerEmail || '—';

                  return (
                    <tr
                      key={company.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold text-sm ${logoColor}`}>
                            {company.name?.[0]?.toUpperCase() || 'C'}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 dark:text-white">
                              {company.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {company.domain || '—'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                            company.status === 'VERIFIED'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                          }`}
                        >
                          {company.status || 'PENDING'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                        {ownerEmail}
                      </td>

                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                        {formatDate(company.deletedAt)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setRestoreConfirm(company.id)}
                            className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors group"
                            disabled={restoreM.isPending || deleteM.isPending}
                            title="Restore company"
                          >
                            <RotateCcw className="h-4 w-4 text-emerald-500 group-hover:text-emerald-600" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(company.id)}
                            className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors group"
                            disabled={restoreM.isPending || deleteM.isPending}
                            title="Permanently delete company"
                          >
                            <Trash2 className="h-4 w-4 text-rose-500 group-hover=text-rose-600" />
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
      </div>

      {/* Restore Confirmation Dialog */}
      {restoreConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Restore Company?</h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">
              This will restore the company and all its deleted products.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRestoreConfirm(null)}
                disabled={restoreM.isPending}
                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => restoreM.mutate(restoreConfirm)}
                disabled={restoreM.isPending}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {restoreM.isPending ? 'Restoring…' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Permanently Delete Company?
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm mb-2">
              This action cannot be undone. The company and all its data will be
              permanently removed from the system.
            </p>
            {companyPendingDelete && (
              <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">
                It currently has{' '}
                <strong>{companyPendingDelete._count?.products ?? 0}</strong>{' '}
                product{(companyPendingDelete._count?.products ?? 0) === 1 ? '' : 's'}{' '}
                associated with it, which will also be deleted.
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleteM.isPending}
                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteM.mutate(deleteConfirm)}
                disabled={deleteM.isPending}
                className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {deleteM.isPending ? 'Deleting…' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
