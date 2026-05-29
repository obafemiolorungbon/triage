'use client';

import Link from 'next/link';
import { Drawer } from 'vaul';
import { TicketDetailView } from './[id]/ticket-detail-view';

export function TicketPreviewDrawer({
  ticketId,
  onClose,
}: {
  ticketId: string;
  onClose: () => void;
}) {
  return (
    <Drawer.Root
      direction="right"
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-y-0 left-0 right-0 z-40 bg-ink-950/68 backdrop-blur-[2px] lg:left-[280px]" />
        <Drawer.Content className="fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col overflow-hidden border-l border-paper-100/10 bg-ink-900 shadow-2xl outline-none lg:w-[min(880px,calc(100vw-280px))]">
          <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-paper-100/10 px-4 md:px-5">
            <div className="min-w-0">
              <Drawer.Title className="truncate text-sm font-medium text-paper-50">
                Ticket preview
              </Drawer.Title>
              <Drawer.Description className="text-xs text-paper-500">
                Review and act without leaving the queue.
              </Drawer.Description>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/${ticketId}`} className="btn-secondary btn-sm">
                Full view
              </Link>
              <Drawer.Close className="grid h-8 w-8 place-items-center rounded-full text-paper-400 transition-colors hover:bg-paper-100/[0.06] hover:text-paper-50">
                <span className="sr-only">Close ticket preview</span>
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                  <path
                    d="M6 6l12 12M18 6 6 18"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </Drawer.Close>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 scrollbar-thin md:px-6">
            <TicketDetailView id={ticketId} mode="drawer" />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
