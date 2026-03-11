'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import {
  supplierGetMe,
  getChatUnreadCount,
  // supplier version
  markChatRead,
  // admin-specific helper
  adminMarkSupplierRead,
  getChatMessages,
  adminGetChatUnreadSuppliers,
  sendChatMessage,
  setChatTyping,
  getChatTyping,
} from '@/lib/adminApi';

interface ChatWidgetProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function ChatWidget({ open, setOpen }: ChatWidgetProps) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  // fetch supplier profile when not admin
  const meQ = useQuery(['supplier', 'me'], supplierGetMe, {
    enabled: !isAdmin,
    retry: false,
  });



    // unread count query
    const unreadQ = useQuery(
      ['chat', 'unread', isAdmin ? 'admin' : meQ.data?.id],
      async () => {
        if (isAdmin) {
          const arr = await adminGetChatUnreadSuppliers();
          return arr.reduce((sum, x) => sum + (x.unread || 0), 0);
        }
        if (meQ.data?.id) {
          const r = await getChatUnreadCount(meQ.data.id);
          return r.count;
        }
        return 0;
      },
      {
        enabled: isAdmin || !!meQ.data,
        staleTime: 1000 * 5,
        refetchInterval: 1000 * 15,
        select: (data) => {
          // if admin panel is open, treat unread as 0 locally so badge hides
          if (isAdmin && open) return 0;
          return data;
        },
      }
    );

    const unreadCount = unreadQ.data ?? 0;

  // simple beep using Web Audio API; no asset required
  const playNotificationSound = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      osc.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 440;
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // audio context might be blocked; ignore
    }
  };

  // notify when unread count increases (new message arrives)
  const prevUnread = useRef<number>(unreadCount);
  useEffect(() => {
    if (unreadCount > prevUnread.current) {
      playNotificationSound();
    }
    prevUnread.current = unreadCount;
  }, [unreadCount]);

  // for suppliers, load their conversation; for admins load selected supplier messages
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const adminListQ = useQuery(['chat','adminList'], adminGetChatUnreadSuppliers, {
    enabled: isAdmin && open,
  });


  // determine name of currently selected supplier for header
  const currentSupplier =
    adminListQ.data?.find((s) => s.supplierId === selectedSupplier);

  const messagesQ = useQuery(
    ['chat', 'messages', isAdmin ? selectedSupplier : meQ.data?.id],
    () =>
      isAdmin && selectedSupplier
        ? getChatMessages(selectedSupplier)
        : meQ.data
        ? getChatMessages(meQ.data.id)
        : Promise.resolve([] as any[]),
    {
      enabled: open && ((isAdmin && !!selectedSupplier) || (!!meQ.data && !isAdmin)),
      refetchInterval: open ? 1000 * 10 : false,
    }
  );

  // reset selection when panel closes so list shows on next open
  useEffect(() => {
    if (!open) {
      setSelectedSupplier(null);
    }
  }, [open]);

  // message input
  const [input, setInput] = useState('');
  const [typingStatus, setTypingStatus] = useState<{
    adminTyping: boolean;
    supplierTyping: boolean;
  }>({ adminTyping: false, supplierTyping: false });
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  const qc = useQueryClient();

  // maintain a list of every supplier the admin has ever opened/seen
  // stored in React Query cache so it survives ChatWidget unmounts
  const addSeenSupplier = (s: {supplierId:string;name?:string}) => {
    qc.setQueryData<{supplierId:string;name?:string}[]>(
      ['chat','seenSuppliers'],
      (old = []) => {
        if (old.find((x) => x.supplierId === s.supplierId)) return old;
        return [...old, s];
      }
    );
  };
  const seenSuppliers: {supplierId:string;name?:string}[] =
    qc.getQueryData(['chat','seenSuppliers']) || [];

  const sendM = useMutation({
    mutationFn: async ({ supplierId, sender, content }: any) => {
      return sendChatMessage({ supplierId, sender, content });
    },
    onSuccess: () => {
      // refetch messages and unread counts
      qc.invalidateQueries(['chat', 'messages']);
      qc.invalidateQueries(['chat', 'unread']);
      if (isAdmin) {
        qc.invalidateQueries(['chat', 'unread', 'admin']);
      }
    },
  });
  const typingM = useMutation({
    mutationFn: async ({ supplierId, sender, typing }: any) => {
      return setChatTyping(supplierId, sender, typing);
    },
  });

  // earlier logic cleared & invalidated on open; no longer needed because
  // unreadQ.select now returns 0 while panel is open. We can remove this effect.

  // when opening supplier chat, mark admin messages read
  useEffect(() => {
    if (open && !isAdmin && meQ.data?.id) {
      // mark supplier messages read on server
      markChatRead(meQ.data.id).then(() => {
        // clear unread count in cache immediately, then refetch
        qc.setQueryData(['chat', 'unread', meQ.data?.id], 0);
        qc.invalidateQueries(['chat', 'unread', meQ.data?.id]);
      });
    }
  }, [open, isAdmin, meQ.data, qc]);

  // whenever admin picks a supplier, record it in the seen list
  useEffect(() => {
    if (isAdmin && selectedSupplier) {
      const existing = adminListQ.data?.find((s) => s.supplierId === selectedSupplier);
      addSeenSupplier({
        supplierId: selectedSupplier,
        name: existing?.name || currentSupplier?.name || '',
      });
    }
  }, [isAdmin, selectedSupplier, adminListQ.data, currentSupplier]);

  // admin marks supplier messages read when selecting them
  useEffect(() => {
    if (isAdmin && selectedSupplier) {
      // figure out how many unread this supplier had locally
      const list = qc.getQueryData<Array<{supplierId:string;unread?:number}>>(['chat','adminList']);
      const thisUnread = list?.find((s) => s.supplierId === selectedSupplier)?.unread || 0;

      // call shared API helper instead of hardcoded path; backend expects /chat/read/:id
      // call admin-specific endpoint so server actually clears the count
      adminMarkSupplierRead(selectedSupplier)
        .then(() => {
          qc.setQueryData<number>(['chat','unread','admin'], (old = 0) => Math.max(0, old - thisUnread));
          qc.setQueryData(['chat','adminList'], (old: any) => {
            if (!old) return old;
            return old.map((s: any) =>
              s.supplierId === selectedSupplier ? { ...s, unread: 0 } : s
            );
          });
          qc.invalidateQueries(['chat','adminList']);
          qc.invalidateQueries(['chat','unread','admin']);
          qc.invalidateQueries(['chat','unread']);
        })
        .catch(() => {
          // ignore failures for now; we'll refresh on next open
        });
    }
  }, [isAdmin, selectedSupplier, qc]);

  // scroll container ref so we can auto-scroll when messages arrive
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messagesQ.data]);

  // polling for typing status when conversation is open
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const id = isAdmin ? selectedSupplier : meQ.data?.id;
    if (open && id) {
      interval = setInterval(async () => {
        try {
          const status = await getChatTyping(id);
          setTypingStatus(status);
        } catch {
          // ignore
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [open, selectedSupplier, meQ.data, isAdmin]);

  // determine if supplier is logged in (for admins, always true)
  const isLoggedIn = isAdmin || !meQ.isError;

  return (
    <>
      {isLoggedIn && open && (
          <div className="fixed right-5 bottom-20 w-80 h-96 bg-white shadow-xl rounded-lg flex flex-col z-50">
          <div className="flex items-center justify-between p-3 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              {isAdmin && selectedSupplier ? (
                <button
                  onClick={() => setSelectedSupplier(null)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  ←
                </button>
              ) : null}
              <span className="font-semibold">
                {isAdmin
                  ? currentSupplier
                    ? currentSupplier.name || currentSupplier.supplierId
                    : 'Support Chat'
                  : 'Support Chat'}
              </span>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div ref={containerRef} className="flex-1 p-3 overflow-y-auto text-sm text-slate-700">
            {isAdmin ? (
              // always show the supplier list; conversation appears below when selected
              adminListQ.isLoading ? (
                <p className="text-xs text-slate-400">Loading suppliers…</p>
              ) : adminListQ.isError ? (
                <p className="text-xs text-red-500">Unable to load suppliers.</p>
              ) : (
                (() => {
                  // start with unread supplier list from server
                  const base = (adminListQ.data ?? []).slice();
                  // add any seen suppliers that aren't already in base
                  seenSuppliers.forEach((seen) => {
                    if (!base.some((b) => b.supplierId === seen.supplierId)) {
                      base.push({
                        supplierId: seen.supplierId,
                        unread: 0,
                        name: seen.name,
                      });
                    }
                  });
                  // highlight selected
                  if (base.length === 0) {
                    return <p className="text-xs text-slate-400">No unread messages.</p>;
                  }
                  return base.map((s) => (
                    <button
                      key={s.supplierId}
                      className={
                        `w-full text-left py-2 flex justify-between hover:bg-slate-50` +
                        (s.supplierId === selectedSupplier ? ' bg-slate-100' : '')
                      }
                      onClick={() => setSelectedSupplier(s.supplierId)}
                    >
                      <span>{s.name || s.supplierId}</span>
                      {s.unread ? (
                        <span className="text-xs bg-red-600 text-white px-2 rounded">
                          {s.unread}
                        </span>
                      ) : null}
                    </button>
                  ));
                })()
              )
            ) : messagesQ.isLoading ? (
              <p className="text-xs text-slate-400">Loading messages...</p>
            ) : messagesQ.isError ? (
              <p className="text-xs text-red-500">Failed to load chat.</p>
            ) : (
              messagesQ.data?.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.sender === 'ADMIN'
                      ? 'text-left mb-2'
                      : 'text-right mb-2'
                  }
                >
                  <div
                    className={
                      m.sender === 'ADMIN'
                        ? 'inline-block bg-slate-100 rounded p-2'
                        : 'inline-block bg-blue-100 rounded p-2'
                    }
                  >
                    {m.content}
                  </div>

                  {/* show a tiny "seen" indicator for messages that the current user sent and the recipient has read */}
                  {((isAdmin && m.sender === 'ADMIN') || (!isAdmin && m.sender === 'SUPPLIER')) &&
                    m.read && (
                      <div className="text-xs text-slate-400 mt-1">
                        seen
                      </div>
                    )}

                </div>
              )) || (
                <p className="text-xs text-slate-400">No messages yet.</p>
              )
            )}
            {/* supplier sees when admin is typing */}
            {!isAdmin && typingStatus.adminTyping && (
              <p className="text-xs italic text-slate-400">Admin is typing…</p>
            )}

            {/* conversation area, shown when a supplier is selected */}
            {isAdmin && selectedSupplier && (
              <>
                {messagesQ.isLoading ? (
                  <p className="text-xs text-slate-400">Loading messages...</p>
                ) : messagesQ.isError ? (
                  <p className="text-xs text-red-500">Failed to load chat.</p>
                ) : (
                  <>
                    {messagesQ.data?.map((m) => (
                      <div
                        key={m.id}
                        className={
                          m.sender === 'ADMIN'
                            ? 'text-right mb-2'
                            : 'text-left mb-2'
                        }
                      >
                        <div
                          className={
                            m.sender === 'ADMIN'
                              ? 'inline-block bg-blue-100 rounded p-2'
                              : 'inline-block bg-slate-100 rounded p-2'
                          }
                        >
                          {m.content}
                        </div>
                        {((isAdmin && m.sender === 'ADMIN') ||
                          (!isAdmin && m.sender === 'SUPPLIER')) &&
                          m.read && (
                            <div className="text-xs text-slate-400 mt-1">
                              seen
                            </div>
                          )}
                      </div>
                    ))}
                    {!messagesQ.data?.length && (
                      <p className="text-xs text-slate-400">No messages yet.</p>
                    )}
                  </>
                )}
                {typingStatus.supplierTyping && selectedSupplier && (
                  <p className="text-xs italic text-slate-400">Supplier is typing…</p>
                )}
              </>
            )}
          </div>
          {(isAdmin && selectedSupplier) || !isAdmin ? (
            <div className="p-3 border-t border-slate-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!input.trim()) return;
                  const supplierId = isAdmin ? selectedSupplier : meQ.data?.id;
                  if (supplierId) {
                    sendM.mutate({
                      supplierId,
                      sender: isAdmin ? 'ADMIN' : 'SUPPLIER',
                      content: input.trim(),
                    });
                    setInput('');
                  }
                }}
              >
                <div className="relative">
                <input
                  type="text"
                  placeholder={
                    isAdmin
                      ? 'Reply as admin...'
                      : 'Type a message...'
                  }
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    const supplierId = isAdmin ? selectedSupplier : meQ.data?.id;
                    if (supplierId) {
                      typingM.mutate({
                        supplierId,
                        sender: isAdmin ? 'ADMIN' : 'SUPPLIER',
                        typing: true,
                      });
                      if (typingTimeout.current) clearTimeout(typingTimeout.current);
                      typingTimeout.current = setTimeout(() => {
                        typingM.mutate({
                          supplierId,
                          sender: isAdmin ? 'ADMIN' : 'SUPPLIER',
                          typing: false,
                        });
                      }, 2000);
                    }
                  }}
                  className="w-full pr-8 px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {/* paper plane icon */}
                  <Send className="h-4 w-4" />
                </button>
              </div>
              </form>
            </div>
          ) : null}
        </div>
      )}

      {/* chat toggle button floats always; admins and suppliers both see it */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Chat"
        aria-label="Chat"
        className="fixed bottom-6 right-6 bg-blue-600 text-white w-14 h-14 flex items-center justify-center rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50 pointer-events-auto"
      >
        {/* slightly smaller icon to fit reduced button */}
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full transition-opacity duration-200 opacity-100">
            {unreadCount}
          </span>
        )}
      </button>
    </>
  );
}
