"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/auth";
import ChatWidget from '@/components/ChatWidget';
import AdminTopNav from '@/components/admin/AdminTopNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const meQ = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: false,
  });

  useEffect(() => {
    if (meQ.isError) router.replace("/login"); // or "/auth/login" if you have it
    if (meQ.data && meQ.data.role !== "ADMIN") router.replace("/login");
  }, [meQ.isError, meQ.data, router, pathname]);

  // initialize chat state before any early returns to satisfy hook rules
  const [chatOpen, setChatOpen] = useState(false);

  if (meQ.isLoading) return <div className="p-6">Loading admin…</div>;
  if (!meQ.data || meQ.data.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* header at the top */}
      <AdminTopNav />
      <main className="flex-1 mt-16 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
      {/* global chat widget overlay */}
      <ChatWidget open={chatOpen} setOpen={setChatOpen} />
    </div>
  );
}
