'use client';
import React from 'react';
import { useDraggable } from '@dnd-kit/core';

const fields = [
  { id: 'textField', label: 'Text Field' },
  { id: 'checkBox', label: 'Checkbox' },
  { id: 'radioButton', label: 'Radio Button' },
];

const FieldPalette = () => {
  return (
    <div className="space-y-2">
      {fields.map((field) => (
        <DraggableField key={field.id} field={field} />
      ))}
    </div>
  );
};

const DraggableField = ({ field }: any) => {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: field.id,
    data: field,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="p-2 border rounded bg-gray-100 cursor-move"
    >
      {field.label}
    </div>
  );
};

export default FieldPalette;
