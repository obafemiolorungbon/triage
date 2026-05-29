'use client';

import {
  closestCorners,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  TicketDto,
  TicketListResponse,
  TicketStatus,
} from '@triage/api-client';
import { browserTicketsClient } from '../../lib/tickets-browser-client';
import { EmptyState } from '../../components/ui/empty-state';
import { EscalationPill, StatusDot } from '../../components/ui/status';

const COLUMNS: TicketStatus[] = [
  'new',
  'triaged',
  'claimed',
  'in_progress',
  'resolved',
  'rejected',
];

const COLUMN_LABEL: Record<TicketStatus, string> = {
  new: 'New',
  triaged: 'Triaged',
  claimed: 'Claimed',
  in_progress: 'In progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

function colId(status: TicketStatus) {
  return `col:${status}`;
}

function SortableCard({
  ticket,
  onOpenTicket,
}: {
  ticket: TicketDto;
  onOpenTicket?: (ticketId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: ticket.id,
      data: { type: 'ticket', status: ticket.status },
    });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative rounded-lg bg-ink-800 hairline p-3 cursor-grab active:cursor-grabbing hover:bg-ink-750 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link
          href={`/dashboard/${ticket.id}`}
          className="text-[13px] font-medium text-paper-100 leading-snug line-clamp-2 hover:text-lime transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenTicket) {
              e.preventDefault();
              onOpenTicket(ticket.id);
            }
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {ticket.category ?? 'Untitled'}
        </Link>
        <EscalationPill tier={ticket.escalationTier} />
      </div>
      <div className="flex items-center gap-2 text-2xs font-mono text-paper-500">
        <span className="truncate max-w-[10rem]">{ticket.submitterEmail}</span>
        {ticket.isNoise && (
          <span
            className="pill !h-4 !text-[10px] !px-1.5 shrink-0"
            style={{
              color: '#FFA94D',
              background: 'rgba(255,169,77,0.08)',
              boxShadow: 'inset 0 0 0 1px rgba(255,169,77,0.2)',
            }}
          >
            noise
          </span>
        )}
        {ticket.knowledgeGap && (
          <span className="pill pill-accent !h-4 !text-[10px] !px-1.5 shrink-0">
            gap
          </span>
        )}
      </div>
      <div className="mt-2 pt-2 border-t border-paper-100/[0.04] flex items-center justify-between text-2xs text-paper-500 font-mono">
        <span className="truncate">{ticket.id.slice(0, 8)}</span>
        <span>
          {new Date(ticket.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>
    </div>
  );
}

function KanbanColumn({
  status,
  tickets,
  onOpenTicket,
}: {
  status: TicketStatus;
  tickets: TicketDto[];
  onOpenTicket?: (ticketId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colId(status) });
  const ids = tickets.map((t) => t.id);
  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[18rem] rounded-xl flex flex-col gap-2 min-h-[420px] transition-all ${
        isOver ? 'ring-2 ring-lime/60 ring-offset-2 ring-offset-ink-900' : ''
      }`}
      style={{ background: 'rgba(255,255,255,0.015)' }}
    >
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <StatusDot status={status} size={6} />
          <h3 className="text-xs font-mono uppercase tracking-wider text-paper-300">
            {COLUMN_LABEL[status]}
          </h3>
        </div>
        <span className="text-2xs font-mono font-semibold text-paper-500 tabular-nums px-1.5 h-5 rounded-full bg-paper-100/5">
          {tickets.length}
        </span>
      </div>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 px-2 pb-2">
          {tickets.length === 0 && (
            <EmptyState
              variant="kanban"
              tone="compact"
              title="Nothing here"
              description="Drop a ticket into this lane when the status changes."
              className="mx-2 mt-4"
            />
          )}
          {tickets.map((t) => (
            <SortableCard key={t.id} ticket={t} onOpenTicket={onOpenTicket} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function resolveDropStatus(
  overId: string,
  tickets: TicketDto[],
): TicketStatus | null {
  if (overId.startsWith('col:')) return overId.slice(4) as TicketStatus;
  const hit = tickets.find((t) => t.id === overId);
  return hit?.status ?? null;
}

export function KanbanBoard({
  tickets,
  listQueryKey,
  onOpenTicket,
}: {
  tickets: TicketDto[];
  listQueryKey: readonly unknown[];
  onOpenTicket?: (ticketId: string) => void;
}) {
  const queryClient = useQueryClient();
  const client = browserTicketsClient();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const patchMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketStatus }) =>
      client.patchTicketStatus(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: listQueryKey });
      const previous = queryClient.getQueryData<TicketListResponse>(listQueryKey);
      if (previous) {
        queryClient.setQueryData<TicketListResponse>(listQueryKey, {
          ...previous,
          items: previous.items.map((t) => (t.id === id ? { ...t, status } : t)),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(listQueryKey, ctx.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listQueryKey });
      void queryClient.invalidateQueries({ queryKey: ['ticket'] });
    },
  });

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const dragged = tickets.find((t) => t.id === String(active.id));
    if (!dragged) return;
    const target = resolveDropStatus(String(over.id), tickets);
    if (!target || target === dragged.status) return;
    patchMutation.mutate({ id: dragged.id, status: target });
  }

  const byStatus = (s: TicketStatus) => tickets.filter((t) => t.status === s);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-4 -mx-4 md:-mx-6 px-4 md:px-6">
          {COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tickets={byStatus(status)}
              onOpenTicket={onOpenTicket}
            />
          ))}
        </div>
      </DndContext>
      {patchMutation.isError && (
        <div
          className="rounded-lg px-4 py-3 text-sm text-[#FF9999]"
          style={{
            background: 'rgba(255, 94, 94, 0.08)',
            boxShadow: 'inset 0 0 0 1px rgba(255, 94, 94, 0.25)',
          }}
        >
          Could not update status - reverted.
        </div>
      )}
    </>
  );
}
