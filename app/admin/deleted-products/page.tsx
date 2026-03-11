'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeletedProductsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/deleted?tab=products');
  }, [router]);
  return null;
}
