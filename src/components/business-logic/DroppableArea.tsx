'use client';
import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';

import SortableItem from '../app/(config-management)/config-management/form-management/form-creation/SortableItem';
import FieldEditorModal from '../app/(config-management)/config-management/form-management/form-creation/FieldEditorModal';

const DroppableArea = () => {
  const [fields, setFields] = useState<any[]>([]);
  const [editingField, setEditingField] = useState<any>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const { setNodeRef } = useDroppable({ id: 'dropzone' });

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: any) => {
    const { over, active } = event;

    if (!over) return;

    const activeIndex = fields.findIndex((f) => f.id === active.id);
    const overIndex = fields.findIndex((f) => f.id === over.id);

    if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
      setFields((prev) => arrayMove(prev, activeIndex, overIndex));
    } else if (activeIndex === -1) {
      // dragged from palette
      const newField = {
        id: Date.now().toString(),
        type: active.data.current?.id,
        label: '',
        placeholder: '',
        hint: '',
      };
      setFields([...fields, newField]);
    }
  };

  const renderField = (field: any, index: number) => {
    switch (field.type) {
      case 'textField':
        return (
          <input
            type="text"
            placeholder={field.placeholder}
            className="w-full p-2 border rounded"
          />
        );
      case 'checkBox':
        return (
          <label className="flex gap-2">
            <input type="checkbox" />
            {field.label || 'Checkbox'}
          </label>
        );
      case 'radioButton':
        return (
          <label className="flex gap-2">
            <input type="radio" name={`radio-${index}`} />
            {field.label || 'Radio'}
          </label>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div
          ref={setNodeRef}
          className="min-h-[400px] border-2 border-dashed rounded-lg p-4 bg-gray-50"
        >
          <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-2 gap-4">
              {fields.map((field, index) => (
                <SortableItem
                  key={field.id}
                  id={field.id}
                  onEdit={() => {
                    setEditingField(field);
                    setEditingIndex(index);
                  }}
                >
                  {renderField(field, index)}
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </div>
      </DndContext>

      <FieldEditorModal
        isOpen={!!editingField}
        fieldProps={editingField}
        onClose={() => setEditingField(null)}
        onSave={(updated) => {
          if (editingIndex !== null) {
            const updatedFields = [...fields];
            updatedFields[editingIndex] = {
              ...updatedFields[editingIndex],
              ...updated,
            };
            setFields(updatedFields);
          }
        }}
      />
    </>
  );
};

export default DroppableArea;
