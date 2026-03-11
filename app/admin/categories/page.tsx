'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory } from '@/lib/adminApi';
import { useState } from 'react';

export default function AdminCategoriesPage() {
  const qc = useQueryClient();
  const { data: categories = [], isLoading } = useQuery({ queryKey: ['admin', 'categories'], queryFn: () => getCategories() });

  const [name, setName] = useState('');
  const [editing, setEditing] = useState<any | null>(null);

  const createM = useMutation({
    mutationFn: (payload: any) => adminCreateCategory(payload),
    onSuccess: async () => {
      setName('');
      await qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      await qc.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });

  const updateM = useMutation({
    mutationFn: ({ id, payload }: any) => adminUpdateCategory(id, payload),
    onSuccess: async () => {
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      await qc.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => adminDeleteCategory(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      await qc.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });

  return (
    <div className="flex flex-col min-h-screen">

      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark">
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6">
          <div className="max-w-[1200px] mx-auto">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Categories</h1>
            <p className="text-slate-500 text-sm mt-1">Create and manage product categories used throughout the app.</p>
          </div>
        </div>

        <div className="p-8 max-w-[1200px] mx-auto space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex gap-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" className="flex-1 px-4 py-2 rounded-lg border" />
              <button onClick={() => createM.mutate({ name })} disabled={!name || createM.isPending} className="px-4 py-2 bg-admin-primary text-white rounded-lg">{createM.isPending ? 'Creating...' : 'Create'}</button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            {isLoading ? (
              <div>Loading…</div>
            ) : categories.length === 0 ? (
              <div>No categories yet.</div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {categories.map((c: any) => (
                  <div key={c.id} className="p-4 border rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{c.name}</div>
                      {c.description && <div className="text-xs text-slate-500">{c.description}</div>}
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditing(c)} className="px-2 py-1 text-sm border rounded">Edit</button>
                      <button onClick={() => { if (confirm('Delete category?')) deleteM.mutate(c.id); }} className="px-2 py-1 text-sm text-rose-600 border rounded">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {editing && (
              <div className="mt-4 p-4 border rounded">
                <h3 className="font-bold">Edit Category</h3>
                <input className="w-full px-3 py-2 border rounded mt-2" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                <div className="flex justify-end gap-2 mt-3">
                  <button onClick={() => setEditing(null)} className="px-3 py-2 border rounded">Cancel</button>
                  <button onClick={() => updateM.mutate({ id: editing.id, payload: { name: editing.name } })} className="px-3 py-2 bg-admin-primary text-white rounded">Save</button>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
