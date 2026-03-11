"use client";

import { useState } from 'react';
import ChatWidget from '@/components/ChatWidget';

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  // manage chat open state locally for suppliers
  const [chatOpen, setChatOpen] = useState(false);

  // This layout wraps all /supplier routes, ensuring the chat widget
  // is always available in the bottom-right corner (like Facebook Messenger).
  // We intentionally keep this layout light so that pages such as
  // application-status can render their own headers without duplication.
  return (
    <>
      {children}
      <ChatWidget open={chatOpen} setOpen={setChatOpen} />
    </>
  );
}
