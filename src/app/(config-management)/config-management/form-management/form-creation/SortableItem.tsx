'use client';
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Pencil } from 'lucide-react';

const SortableItem = ({ id, children, onEdit }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: 'relative',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-4 bg-card border rounded-lg shadow relative"
    >
      <div className="absolute top-2 right-2 cursor-pointer" onClick={onEdit}>
        <Pencil size={16} />
      </div>
      {children}
    </div>
  );
};

export default SortableItem;
