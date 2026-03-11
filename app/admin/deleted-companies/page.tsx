'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeletedCompaniesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/deleted?tab=companies');
  }, [router]);
  return null;
}
