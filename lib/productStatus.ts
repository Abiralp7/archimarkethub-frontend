export function userVisibleProductStatus(status?: string | null) {
  if (!status) return 'Unknown';
  if (status === 'IN_STOCK') return 'In Stock';
  if (status === 'OUT_OF_STOCK') return 'Out of stock';
  if (status === 'ARCHIVED') return 'Archived';
  return status;
}

export function productStatusColor(status?: string | null) {
  if (status === 'IN_STOCK') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
  if (status === 'OUT_OF_STOCK') return 'bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300';
  if (status === 'ARCHIVED') return 'bg-slate-100 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300';
}
