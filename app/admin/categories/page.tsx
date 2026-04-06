'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory } from '@/lib/adminApi';
import { useState } from 'react';

const keywordOptions = [
  'construction',
  'interior',
  'sanitary',
  'lighting',
  'kitchen',
  'bathroom',
  'exterior',
];

function toggleKeyword(value: string, selected: string[]) {
  if (selected.includes(value)) {
    return selected.filter((keyword) => keyword !== value);
  }
  return [...selected, value];
}

export default function AdminCategoriesPage() {
  const qc = useQueryClient();
  const { data: categories = [], isLoading } = useQuery({ queryKey: ['admin', 'categories'], queryFn: () => getCategories() });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  const createM = useMutation({
    mutationFn: (payload: any) => adminCreateCategory(payload),
    onSuccess: async () => {
      setName('');
      setDescription('');
      setKeywords([]);
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

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">

      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark">
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Categories</h1>
              <p className="text-slate-500 text-sm mt-1">Create and manage product categories used throughout the app.</p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-admin-primary text-white rounded-lg"
            >
              Create Category
            </button>
          </div>
        </div>

        <div className="p-8 max-w-[1200px] mx-auto space-y-6">

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            {isLoading ? (
              <div>Loading…</div>
            ) : categories.length === 0 ? (
              <div>No categories yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {categories.map((c: any) => (
                  <div key={c.id} className="p-4 border rounded-lg flex flex-col justify-between gap-4">
                    <div>
                      <div className="font-semibold">{c.name}</div>
                      {c.description && <div className="text-xs text-slate-500 mt-1">{c.description}</div>}
                      {c.keywords && c.keywords.length > 0 && (
                        <div className="text-xs text-slate-400 mt-2">Keywords: {c.keywords.join(', ')}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditing({ ...c, keywords: c.keywords || [] })}
                        className="px-2 py-1 text-sm border rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete category?')) deleteM.mutate(c.id);
                        }}
                        className="px-2 py-1 text-sm text-rose-600 border rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {editing && (
              <div className="mt-6 p-4 border rounded space-y-3">
                <h3 className="font-bold">Edit Category</h3>
                <input
                  className="w-full px-3 py-2 border rounded"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
                <input
                  className="w-full px-3 py-2 border rounded"
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Description (optional)"
                />
                <div className="grid grid-cols-2 gap-2">
                  {keywordOptions.map((keyword) => (
                    <label key={keyword} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Array.isArray(editing.keywords) && editing.keywords.includes(keyword)}
                        onChange={() => {
                          const nextKeywords = toggleKeyword(keyword, editing.keywords || []);
                          setEditing({ ...editing, keywords: nextKeywords });
                        }}
                        className="form-checkbox"
                      />
                      <span className="text-sm capitalize">{keyword}</span>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditing(null)} className="px-3 py-2 border rounded">Cancel</button>
                  <button
                    onClick={() => updateM.mutate({
                      id: editing.id,
                      payload: {
                        name: editing.name,
                        description: editing.description,
                        keywords: editing.keywords || [],
                      },
                    })}
                    className="px-3 py-2 bg-admin-primary text-white rounded"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Create Category</h2>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  aria-label="Close create category modal"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <input
                  className="w-full px-3 py-2 border rounded"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Category name"
                />
                <input
                  className="w-full px-3 py-2 border rounded"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description (optional)"
                />
                <div className="grid grid-cols-2 gap-2">
                  {keywordOptions.map((keyword) => (
                    <label key={keyword} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={keywords.includes(keyword)}
                        onChange={() => setKeywords(toggleKeyword(keyword, keywords))}
                        className="form-checkbox"
                      />
                      <span className="text-sm capitalize">{keyword}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    createM.mutate({ name, description, keywords }, {
                      onSuccess: () => {
                        setIsCreateModalOpen(false);
                      },
                    });
                  }}
                  className="px-3 py-2 bg-admin-primary text-white rounded"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
