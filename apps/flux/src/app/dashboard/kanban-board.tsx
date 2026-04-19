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
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { TicketDto, TicketListResponse, TicketStatus } from '@triage/api-client';
import { browserTicketsClient } from '../../lib/tickets-browser-client';

const COLUMNS: TicketStatus[] = [
  'new',
  'triaged',
  'claimed',
  'in_progress',
  'resolved',
  'rejected',
];

function colId(status: TicketStatus) {
  return `col:${status}`;
}

function SortableCard({ ticket }: { ticket: TicketDto }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: ticket.id,
      data: { type: 'ticket', status: ticket.status },
    });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="card card-compact bg-base-100 border border-base-300 shadow-sm cursor-grab active:cursor-grabbing"
    >
      <div className="card-body p-3 gap-1">
        <Link
          href={`/dashboard/${ticket.id}`}
          className="link link-hover text-sm font-medium line-clamp-2"
          onClick={(e) => e.stopPropagation()}
        >
          {ticket.category ?? ticket.id.slice(0, 8)}
        </Link>
        <div className="flex flex-wrap gap-1">
          {ticket.priority && (
            <span className="badge badge-secondary badge-xs">{ticket.priority}</span>
          )}
          {ticket.isNoise && <span className="badge badge-warning badge-xs">noise</span>}
        </div>
        <p className="text-xs opacity-60 line-clamp-2">{ticket.submitterEmail}</p>
      </div>
    </div>
  );
}

function KanbanColumn({
  status,
  tickets,
}: {
  status: TicketStatus;
  tickets: TicketDto[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colId(status) });
  const ids = tickets.map((t) => t.id);
  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-64 rounded-xl bg-base-200/80 p-2 flex flex-col gap-2 min-h-[320px] border-2 ${
        isOver ? 'border-primary' : 'border-transparent'
      }`}
    >
      <div className="flex items-center justify-between px-1">
        <h3 className="font-semibold text-sm capitalize">{status.replace('_', ' ')}</h3>
        <span className="badge badge-ghost badge-sm">{tickets.length}</span>
      </div>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1">
          {tickets.map((t) => (
            <SortableCard key={t.id} ticket={t} />
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
  if (overId.startsWith('col:')) {
    return overId.slice(4) as TicketStatus;
  }
  const hit = tickets.find((t) => t.id === overId);
  return hit?.status ?? null;
}

export function KanbanBoard({
  tickets,
  listQueryKey,
}: {
  tickets: TicketDto[];
  listQueryKey: readonly unknown[];
}) {
  const queryClient = useQueryClient();
  const client = browserTicketsClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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
      if (ctx?.previous) {
        queryClient.setQueryData(listQueryKey, ctx.previous);
      }
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((status) => (
          <KanbanColumn key={status} status={status} tickets={byStatus(status)} />
        ))}
      </div>
      {patchMutation.isError && (
        <div className="alert alert-error alert-sm mt-2 text-sm">
          Could not update status. Reverted.
        </div>
      )}
    </DndContext>
  );
}
