
'use client';

import { DeleteConfirmationModal } from '@/components/modals/delete-confirmation-modal';

import BreadcrumbHeader from '@/components/breadcrumb/breadcrumb';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getBreadcrumbData } from '@/constants/breadcrumb-config';
import { generateFieldId } from '@/utils/id-utils';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { IconAlignLeft, IconCalendar, IconCheckbox, IconHeading, IconPencil, IconPhoto, IconRadio, IconSelector, IconTextCaption, IconUpload, IconList } from '@tabler/icons-react';
import { Trash2, Plus } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFormById, useUpdateForm, useCreateForm } from '@/features/config-management/form-management/hooks/useForms';
import * as React from 'react';
import NavKeys from '@/constants/navkeys';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';
import { RequirePermission } from '@/components/auth/require-permission';
import { readableToCamelCase, toCamelCase } from '@/utils/string-utils';


const FormCreationPage = () => {
  return (
    <RequirePermission module={PERMISSIONS.FORM_MANAGEMENT} action={MENU_RIGHTS.CREATE}>
      <FormBuilder />
    </RequirePermission>
  );
};

const SortableField = ({
  id,
  field,
  index,
  openEditModal,
  deleteField,
  renderFieldPreview,
}: {
  id: string;
  field: any;
  index: number;
  openEditModal: (field: any) => void;
  deleteField: (id: string) => void;
  renderFieldPreview: (field: any) => React.ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <FieldCard 
        field={field}
        index={index}
        openEditModal={openEditModal}
        deleteField={deleteField}
        renderFieldPreview={renderFieldPreview}
        dragListeners={listeners}
      />
    </div>
  );
};

const FieldCard = ({ 
  field, 
  index, 
  openEditModal, 
  deleteField,
  renderFieldPreview,
  dragListeners 
}: {
  field: any;
  index: number;
  openEditModal: (field: any) => void;
  deleteField: (id: string) => void;
  renderFieldPreview: (field: any) => React.ReactNode;
  dragListeners?: any;
}) => (
  <div 
    className="flex flex-row justify-center items-center p-3 gap-2 bg-white rounded-lg shadow border border-gray-200 my-2 w-[440px] min-h-[104px]"
    data-field-index={index}
  >
    {/* Drag Handle */}
    <div 
      className="flex items-center justify-center w-6 h-full cursor-move text-gray-400 hover:text-gray-600 flex-shrink-0"
      {...dragListeners}
      title="Drag to reorder"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col gap-0.5">
        <div className="w-1 h-1 bg-current rounded-full"></div>
        <div className="w-1 h-1 bg-current rounded-full"></div>
        <div className="w-1 h-1 bg-current rounded-full"></div>
        <div className="w-1 h-1 bg-current rounded-full"></div>
        <div className="w-1 h-1 bg-current rounded-full"></div>
        <div className="w-1 h-1 bg-current rounded-full"></div>
      </div>
    </div>
    {/* Input with label */}
    <div className="flex flex-col items-start gap-1 w-[400px] min-h-[80px]">
      {/* Label row */}
      <div className="flex flex-row justify-between items-center gap-1 w-full h-6">
        {field.formFieldType === 'header' ? (
          // For header fields, show the label or displayName as the header text
          <h3 className="font-bold text-lg text-gray-900">
            {field.displayName || field.label}
          </h3>
        ) : (
          <label className="font-poppins font-normal text-base text-gray-900">
            {field.displayName || field.label}
            {field.required && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>
        )}
        {/* Edit/Delete icons row */}
        <div className="flex flex-row justify-end items-center gap-4">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Edit clicked for field:', field.id);
              openEditModal(field);
            }}
            className="h-8 w-8 text-gray-500 hover:text-blue-600 flex items-center justify-center rounded cursor-pointer"
            title="Edit"
            type="button"
          >
            <IconPencil size={16} />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Delete clicked for field:', field.id);
              deleteField(field.id);
            }}
            className="h-8 w-8 text-gray-500 hover:text-red-600 flex items-center justify-center rounded cursor-pointer"
            title="Delete"
            type="button"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      {/* Input field - render different input for each type */}
      {field.formFieldType === 'header' ? null : (
        <div className="flex flex-row items-center gap-2 bg-white border border-gray-300 shadow rounded-lg mt-1 w-full min-h-[50px] px-4 py-2">
          {renderFieldPreview(field)}
        </div>
      )}
    </div>
  </div>
);

// Sidebar field types array (for left panel)
const sidebarFieldTypes = [
  { id: 'text', label: 'Text Field', icon: () => <IconTextCaption size={18} /> },
  { id: 'checkbox', label: 'Check Box', icon: () => <IconCheckbox size={18} /> },
  { id: 'radio', label: 'Radio Button', icon: () => <IconRadio size={18} /> },
  { id: 'dropdown', label: 'Drop Down', icon: () => <IconSelector size={18} /> },
  { id: 'date', label: 'Date Picker', icon: () => <IconCalendar size={18} /> },
  { id: 'file', label: 'File Uploader', icon: () => <IconUpload size={18} /> },
  { id: 'image', label: 'Image', icon: () => <IconPhoto size={18} /> },
  { id: 'header', label: 'Header', icon: () => <IconHeading size={18} /> },
  { id: 'paragraph', label: 'Paragraph', icon: () => <IconAlignLeft size={18} /> },
  { id: 'array', label: 'Grouped Field', icon: () => <IconList size={18} /> },
];


const FormBuilder = () => {
  // Get breadcrumb data for form management create
  const breadcrumb = getBreadcrumbData('formManagement', 'create');

  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get('mode');
  const formId = searchParams.get('formId');

  // State
  const [fields, setFields] = useState<any[]>([]);
  const [editField, setEditField] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; displayName?: string; values?: string; groupedFields?: string }>({});
  const [pendingField, setPendingField] = useState<any | null>(null);
  // Delete confirmation modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<any | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [formType, setFormType] = useState('');
  const [outletType, setOutletType] = useState('');
  const [formTopErrors, setFormTopErrors] = useState<{ formName?: string; displayName?: string }>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  // For modal left pane auto-scroll
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const [shouldScrollLeftPane, setShouldScrollLeftPane] = useState(false);
  const [selectedGroupedFieldType, setSelectedGroupedFieldType] = useState<string>('');

  // API hooks
  const { data, isLoading: isFormLoading } = useFormById(formId || '', mode === 'edit' && !!formId);
  const formData = data?.data;
  const updateFormMutation = useUpdateForm();
  const createFormMutation = useCreateForm();

  // Populate state when editing
  useEffect(() => {
    if (mode === 'edit' && formData) {
      setFormName(formData.formName ?? '');
      setDisplayName(formData.displayName ?? '');
      setFormType(formData.formType ?? '');
      setOutletType(formData.outletType ?? '');
      setFields(Array.isArray(formData.fields) ? formData.fields : []);
    }
  }, [mode, formData?.formName, formData?.displayName, formData?.formType, formData?.outletType, formData?.fields]);

  // Scroll to bottom of left pane when triggered
  useEffect(() => {
    if (shouldScrollLeftPane && leftPaneRef.current) {
      leftPaneRef.current.scrollTop = leftPaneRef.current.scrollHeight;
      setShouldScrollLeftPane(false);
    }
  }, [shouldScrollLeftPane]);

  const sensors = useSensors(useSensor(PointerSensor));

  const DraggableItem = ({ id, label, icon }: { id: string; label: string; icon: React.ReactNode }) => (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('field-type', id)}
      onClick={() => handleSidebarClick(id)}
      className="flex flex-row items-center gap-3 cursor-move hover:bg-gray-200 rounded-lg bg-gray-100 select-none w-full py-3 pl-4 pr-3 min-h-[48px] max-h-[48px] transition-colors"
    >
      <span className="flex items-center justify-center text-gray-700 w-[18px] h-[18px]">{icon}</span>
      <span className="text-base font-poppins text-gray-800">{label}</span>
    </div>
  );

  const DropIndicator = ({ index }: { index: number }) => (
    <div
      id={`drop-indicator-${index}`}
      className="h-1 bg-blue-500 mx-auto w-[440px] rounded transition-opacity duration-200"
      style={{ 
        opacity: dragOverIndex === index ? 1 : 0,
      }}
    />
  );

  // Handle clicking on sidebar field types
  const handleSidebarClick = (fieldType: string) => {
    addField(fieldType, fields.length);
  };

  // Add field at specific position
  const addField = (fieldType: string, position: number) => {
    // Generate a unique name for the field
    const baseName = fieldType + 'Field';
    let name = baseName;
    let idx = 1;
    while (fields.some(f => f.name === name)) {
      name = baseName + (++idx);
    }
    const newField: any = {
      id: generateFieldId(),
      name,
      displayName: '',
      type: fieldType === 'checkbox' ? 'array' : (fieldType === 'date' ? 'date' : 'string'),
      formFieldType: fieldType,
      required: false,
      nameManuallyEdited: false,
    };
    // Set up default values for each type
    switch (fieldType) {
      case 'text':
        newField.value = '';
        break;
      case 'checkbox':
        newField.values = ['Option 1', 'Option 2'];
        newField.value = [];
        break;
      case 'radio':
        newField.values = ['Option 1', 'Option 2'];
        newField.value = '';
        break;
      case 'dropdown':
        newField.values = ['Option 1', 'Option 2'];
        newField.value = '';
        break;
      case 'date':
        newField.value = '';
        newField.dateFormat = 'YYYY-MM-DD';
        break;
      case 'file':
        newField.value = null;
        newField.fileUrl = [];
        break;
      case 'image':
        newField.value = null;
        newField.imageUrl = [];
        break;
      case 'header':
        newField.value = 'Header';
        break;
      case 'paragraph':
        newField.value = 'Paragraph text';
        break;
      case 'array':
        newField.type = 'array';
        newField.repeatable = true;
        newField.groupedFields = [];
        break;
      default:
        break;
    }
    setPendingField({ field: newField, position });
    setEditField({ ...newField });
    setIsModalOpen(true);
    setFieldErrors({});
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fieldType = e.dataTransfer.getData('field-type');
    if (fieldType && dragOverIndex !== null) {
      addField(fieldType, dragOverIndex);
    }
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (scrollRef.current) {
      const rect = scrollRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const scrollHeight = scrollRef.current.scrollHeight;
      const clientHeight = scrollRef.current.clientHeight;
      
      // Auto scroll
      const scrollThreshold = 100;
      if (y < scrollThreshold) {
        scrollRef.current.scrollTop = Math.max(0, scrollRef.current.scrollTop - 10);
      } else if (y > clientHeight - scrollThreshold) {
        scrollRef.current.scrollTop = Math.min(scrollHeight - clientHeight, scrollRef.current.scrollTop + 10);
      }
      
      // Calculate drop position
      const fieldElements = scrollRef.current.querySelectorAll('[data-field-index]');
      let dropIndex = fields.length;
      
      for (let i = 0; i < fieldElements.length; i++) {
        const element = fieldElements[i] as HTMLElement;
        const elementRect = element.getBoundingClientRect();
        const elementY = elementRect.top + elementRect.height / 2;
        
        if (e.clientY < elementY) {
          dropIndex = i;
          break;
        }
      }
      
      setDragOverIndex(dropIndex);
    }
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDragOverIndex(null);
    
    if (active.id !== over?.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over?.id);
      setFields((items) => arrayMove(items, oldIndex, newIndex));
    }
  };

  const openEditModal = (field: any) => {
    console.log('openEditModal called with:', field);
    setEditField({ ...field }); // create a copy for editing
    setIsModalOpen(true);
    console.log('Modal should be open now, isModalOpen:', true);
  };

  // Generic change handler for any field property
  const handleEditChange = (key: string, value: any) => {
    if (!editField) return;
    setEditField({ ...editField, [key]: value });
  };

  // Display name change: auto-generate key if not manually edited
  const handleEditDisplayNameChange = (value: string) => {
    if (!editField) return;
    const next: any = { ...editField, displayName: value };
    // Reset to follow label again whenever label changes
    next.name = readableToCamelCase(value || '');
    next.nameManuallyEdited = false;
    setEditField(next);
  };

  const normalizeManualKey = (value: string) => {
    const noSpaces = (value || '').replace(/\s+/g, '');
    const onlyAlnum = noSpaces.replace(/[^a-zA-Z0-9]/g, '');
    if (!onlyAlnum) return '';
    return onlyAlnum[0].toLowerCase() + onlyAlnum.slice(1);
  };

  // Field key change: enforce camelCase and mark as manually edited
  const handleEditNameChange = (value: string) => {
    if (!editField) return;
    setEditField({ ...editField, name: normalizeManualKey(value), nameManuallyEdited: true });
  };

  // Helper functions for managing grouped fields in array fields
  const addGroupedField = (fieldType: string) => {
    if (!editField || editField.formFieldType !== 'array') return;
    
    const baseName = fieldType + 'Field';
    let name = baseName;
    let idx = 1;
    const currentGroupedFields = Array.isArray(editField.groupedFields) ? editField.groupedFields : [];
    while (currentGroupedFields.some((f: any) => f.name === name)) {
      name = baseName + (++idx);
    }

    const newGroupedField: any = {
      id: generateFieldId(),
      name,
      displayName: '',
      type: fieldType === 'checkbox' ? 'array' : (fieldType === 'date' ? 'date' : 'string'),
      formFieldType: fieldType,
      required: false,
      nameManuallyEdited: false,
    };

    // Set up default values for each type
    switch (fieldType) {
      case 'text':
        newGroupedField.value = '';
        break;
      case 'checkbox':
        newGroupedField.values = ['Option 1', 'Option 2'];
        newGroupedField.value = [];
        break;
      case 'radio':
        newGroupedField.values = ['Option 1', 'Option 2'];
        newGroupedField.value = '';
        break;
      case 'dropdown':
        newGroupedField.values = ['Option 1', 'Option 2'];
        newGroupedField.value = '';
        break;
      case 'date':
        newGroupedField.value = '';
        newGroupedField.dateFormat = 'YYYY-MM-DD';
        break;
      case 'file':
        newGroupedField.value = null;
        newGroupedField.fileUrl = [];
        break;
      case 'image':
        newGroupedField.value = null;
        newGroupedField.imageUrl = [];
        break;
      default:
        break;
    }

    const updatedGroupedFields = [...currentGroupedFields, newGroupedField];
    handleEditChange('groupedFields', updatedGroupedFields);
  };

  const updateGroupedField = (index: number, key: string, value: any) => {
    if (!editField || editField.formFieldType !== 'array') return;
    
    const currentGroupedFields = Array.isArray(editField.groupedFields) ? editField.groupedFields : [];
    const updatedGroupedFields = currentGroupedFields.map((field: any, idx: number) => {
      if (idx !== index) return field;
      if (key === 'displayName') {
        const next: any = { ...field, displayName: value };
        // Reset to follow label again whenever label changes
        next.name = readableToCamelCase(value || '');
        next.nameManuallyEdited = false;
        return next;
      }
      if (key === 'name') {
        return { ...field, name: normalizeManualKey(value), nameManuallyEdited: true };
      }
      return { ...field, [key]: value };
    });
    handleEditChange('groupedFields', updatedGroupedFields);
  };

  const removeGroupedField = (index: number) => {
    if (!editField || editField.formFieldType !== 'array') return;
    
    const currentGroupedFields = Array.isArray(editField.groupedFields) ? editField.groupedFields : [];
    const updatedGroupedFields = currentGroupedFields.filter((_: any, idx: number) => idx !== index);
    handleEditChange('groupedFields', updatedGroupedFields);
  };

  const moveGroupedField = (fromIndex: number, toIndex: number) => {
    if (!editField || editField.formFieldType !== 'array') return;
    
    const currentGroupedFields = Array.isArray(editField.groupedFields) ? editField.groupedFields : [];
    const updatedGroupedFields = [...currentGroupedFields];
    const [movedField] = updatedGroupedFields.splice(fromIndex, 1);
    updatedGroupedFields.splice(toIndex, 0, movedField);
    handleEditChange('groupedFields', updatedGroupedFields);
  };

  // Save changes dynamically
  const saveFieldChanges = () => {
    if (!editField) return;
    const errors: { name?: string; displayName?: string; groupedFields?: string } = {};
    
    if (!editField.name || editField.name.trim() === '') {
      errors.name = 'Field Key is required';
    }
    if (!editField.displayName || editField.displayName.trim() === '') {
      errors.displayName = 'Label is required';
    }
    
    // Validate grouped fields for array fields
    if (editField.formFieldType === 'array' && Array.isArray(editField.groupedFields)) {
      for (const groupedField of editField.groupedFields) {
        if (!groupedField.name || groupedField.name.trim() === '') {
          errors.groupedFields = 'All grouped fields must have a field key';
          break;
        }
        if (!groupedField.displayName || groupedField.displayName.trim() === '') {
          errors.groupedFields = 'All grouped fields must have a label';
          break;
        }
      }
    }
    
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // If this is a new field (pendingField), add it to the fields array
    if (pendingField && pendingField.field.id === editField.id) {
      const newFields = [...fields];
      newFields.splice(pendingField.position, 0, editField);
      setFields(newFields);
      setPendingField(null);
    } else {
      // Editing an existing field
      setFields((prev) => prev.map((f) => (f.id === editField.id ? editField : f)));
    }
    setIsModalOpen(false);
  };

  // Delete field (open confirmation modal)
  const deleteField = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    setFieldToDelete(field);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete
  const handleConfirmDelete = () => {
    if (fieldToDelete) {
      setFields(prev => prev.filter(f => f.id !== fieldToDelete.id));
    }
    setIsDeleteModalOpen(false);
    setFieldToDelete(null);
  };

  // Cancel delete
  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setFieldToDelete(null);
  };

  // When modal closes (cancel/close), clear pendingField and editField
  const handleModalOpenChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setEditField(null);
      setFieldErrors({});
      setPendingField(null);
      setSelectedGroupedFieldType(''); // Reset selected field type
    }
  };

  // Render field preview
  const renderFieldPreview = (field: any) => {
    switch (field.formFieldType) {
      case 'text':
        return (
          <Input
            className="flex-1"
            type="text"
            placeholder={field.displayName}
            value=""
            disabled={true}
          />
        );
      case 'checkbox':
        return (
          <div className="flex flex-col gap-3 w-full">
            {Array.isArray(field.values) && field.values.map((val: string, idx: number) => (
              <div key={idx} className="flex items-center space-x-2">
                <Checkbox id={`preview-checkbox-${field.id}-${idx}`} />
                <label 
                  htmlFor={`preview-checkbox-${field.id}-${idx}`}
                  className="text-sm cursor-pointer"
                >
                  {val}
                </label>
              </div>
            ))}
          </div>
        );
      case 'radio':
        return (
          <div className="flex flex-col gap-3 w-full">
            {Array.isArray(field.values) && field.values.map((val: string, idx: number) => (
              <div key={idx} className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  name={`preview-radio-${field.id}`} 
                  id={`preview-radio-${field.id}-${idx}`}
                  className="h-4 w-4 cursor-pointer" 
                />
                <label 
                  htmlFor={`preview-radio-${field.id}-${idx}`}
                  className="text-sm cursor-pointer"
                >
                  {val}
                </label>
              </div>
            ))}
          </div>
        );
      case 'dropdown':
        return (
          <Select>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(field.values) && field.values.filter((val: string) => val !== '').map((val: string, idx: number) => (
                <SelectItem key={idx} value={val}>{val}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'date':
        return (
          <Input
            type="date"
            className="flex-1"
            disabled
          />
        );
      case 'file':
        return (
          <Input type="file" className="flex-1" disabled />
        );
      case 'image':
        return (
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400">
              <IconPhoto size={20} />
            </div>
            <span className="ml-2 text-sm text-gray-500">Image upload</span>
          </div>
        );
      case 'header':
        return (
          <h3 className="font-bold text-lg w-full">{field.value || field.displayName}</h3>
        );
      case 'paragraph':
        return (
          <Textarea
            className="flex-1"
            placeholder={field.displayName}
            disabled
            value=""
          />
        );
      case 'array':
        return (
          <div className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Array Field</span>
              <span className="text-xs text-gray-500">
                {Array.isArray(field.groupedFields) ? field.groupedFields.length : 0} fields
              </span>
            </div>
            {Array.isArray(field.groupedFields) && field.groupedFields.length > 0 ? (
              <div className="space-y-1">
                {field.groupedFields.slice(0, 2).map((groupedField: any, idx: number) => (
                  <div key={idx} className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                    {groupedField.displayName} ({groupedField.formFieldType})
                  </div>
                ))}
                {field.groupedFields.length > 2 && (
                  <div className="text-xs text-gray-500 px-2">
                    +{field.groupedFields.length - 2} more fields
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-500 text-center py-2">
                No fields added yet
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Generate API payload
  const generateFormData = () => {
    return {
      formName,
      displayName,
      formType,
      outletType,
      fields: fields.map(field => {
        const baseField: any = {
          name: field.name,
          displayName: field.displayName,
          type: field.type,
          required: field.required,
        };

        // Add formFieldType for non-array fields only
        if (field.formFieldType !== 'array') {
          baseField.formFieldType = field.formFieldType;
        }

        // Add field-specific properties
        if (field.values) baseField.values = field.values;
        if (field.dateFormat) baseField.dateFormat = field.dateFormat;
        if (field.fileUrl) baseField.fileUrl = field.fileUrl;
        if (field.imageUrl) baseField.imageUrl = field.imageUrl;
        
        // Add array-specific properties
        if (field.formFieldType === 'array') {
          baseField.repeatable = field.repeatable;
          if (Array.isArray(field.groupedFields)) {
            baseField.groupedFields = field.groupedFields.map((groupedField: any) => ({
              name: groupedField.name,
              displayName: groupedField.displayName,
              type: groupedField.type,
              formFieldType: groupedField.formFieldType,
              required: groupedField.required,
              ...(groupedField.values && { values: groupedField.values }),
              ...(groupedField.dateFormat && { dateFormat: groupedField.dateFormat }),
              ...(groupedField.fileUrl && { fileUrl: groupedField.fileUrl }),
              ...(groupedField.imageUrl && { imageUrl: groupedField.imageUrl }),
            }));
          }
        }

        return baseField;
      })
    };
  };

  return (
    <DndContext 
      sensors={sensors} 
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      collisionDetection={closestCenter}
    >
      {/* Breadcrumb Header */}
      <div className="mb-6">
        <BreadcrumbHeader {...breadcrumb} />
      </div>
      {/* Main Content */}
      <div className="flex flex-row gap-4 w-full">
        {/* Sidebar */}
        <div className="flex-shrink-0 w-[248px] h-full">
          <div className="flex flex-col gap-4 bg-white h-full w-[248px] rounded-xl p-4">
            <div className="flex flex-col gap-2">
              <h3 className="font-poppins font-medium text-lg">Field types</h3>
              <div className="font-poppins font-normal text-base text-gray-700">Click or drag fields to build your form</div>
            </div>
            <div className="flex flex-col gap-2 w-full mt-2">
              {sidebarFieldTypes.map((field) => (
                <DraggableItem key={field.id} id={field.id} label={field.label} icon={field.icon()} />
              ))}
            </div>
          </div>
        </div>
        {/* Main Form Area */}
        <div className="flex-1 min-w-0">
          <div
            className="flex flex-col items-start relative bg-white rounded-xl"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {/* Top section with three fields */}
            <div className="flex flex-col items-start p-4 gap-2 bg-white border-b border-[#E0E0E0] w-full rounded-t-xl">
              <div className="grid grid-cols-3 gap-3 w-full">
                {/* Field 1: Form Name (1/3) */}
                <div className="flex flex-col gap-1">
                  <label className="font-poppins text-[16px] text-[#333] mb-1">
                    Form Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    className={`w-full h-[44px] ${formTopErrors.formName ? 'border-red-500' : ''}`}
                    placeholder="Enter form name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                  {formTopErrors.formName && (
                    <span className="text-red-500 text-xs mt-1">{formTopErrors.formName}</span>
                  )}
                </div>
                {/* Field 2: Display Name (1/3) */}
                <div className="flex flex-col gap-1">
                  <label className="font-poppins text-[16px] text-[#333] mb-1">
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    className={`w-full h-[44px] ${formTopErrors.displayName ? 'border-red-500' : ''}`}
                    placeholder="Enter display name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                  {formTopErrors.displayName && (
                    <span className="text-red-500 text-xs mt-1">{formTopErrors.displayName}</span>
                  )}
                </div>
                {/* Field 3: Form Type (1/3) */}
                <div className="flex flex-col gap-1">
                  <label className="font-poppins text-[16px] text-[#333] mb-1">Form Type</label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger className="w-full h-[44px]">
                      <SelectValue placeholder="Select form type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outletForm">Outlet Form</SelectItem>
                      <SelectItem value="warehouseForm">Warehouse Form</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {/* Main form area */}
            <div 
              ref={scrollRef}
              className={`flex flex-col items-center gap-2 w-full bg-white rounded-b-xl py-6 ${fields.length > 3 ? 'overflow-y-auto' : ''}`}
              style={{ minHeight: fields.length === 0 ? '120px' : undefined }}
            >
              <SortableContext
                items={fields.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <DropIndicator index={0} />
                {fields.map((field, index) => (
                  <div key={field.id || field.name || index}>
                    <SortableField
                      id={field.id || field.name || String(index)}
                      field={field}
                      index={index}
                      openEditModal={openEditModal}
                      deleteField={deleteField}
                      renderFieldPreview={renderFieldPreview}
                    />
                    <DropIndicator index={index + 1} />
                  </div>
                ))}
              </SortableContext>
            </div>
          </div>
        </div>
      </div>
      
      {/* Drag Overlay */}
      <DragOverlay>
        {activeId ? (
          <div className="flex flex-row justify-center items-center p-3 gap-2 bg-white rounded-lg shadow border border-gray-200 my-2 w-[440px] min-h-[104px] opacity-50">
            {/* Simplified preview */}
          </div>
        ) : null}
      </DragOverlay>

  {/* Modal - always rendered, controlled via open prop */}
  <Dialog open={isModalOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent className="w-[1106px] h-[90vh] flex flex-col bg-white rounded-[12px] shadow-xl top-1/2 left-1/2 fixed -translate-x-1/2 -translate-y-1/2 p-0 overflow-hidden">
          {/* Fixed Header */}
          <DialogHeader className="flex flex-col gap-4 w-full p-6 border-b border-gray-200 flex-shrink-0">
            <DialogTitle className="sr-only">Edit Field</DialogTitle>
            <div className="flex flex-row items-center gap-4 w-full">
              <div className="flex items-center justify-center w-12 h-12 bg-[#C2FFE9] border-8 border-[#EAFFF7] rounded-[28px]">
                {/* Icon for field type */}
                {editField && (() => {
                  const iconObj = sidebarFieldTypes.find(f => f.id === editField.formFieldType);
                  return iconObj ? iconObj.icon() : null;
                })()}
              </div>
              {/* Text and supporting text */}
              <div className="flex flex-col gap-2 w-full">
                <h2 className="font-poppins font-medium text-[20px] leading-[30px] text-[#0E1829]">
                  Preview of your field
                </h2>
                <p className="font-poppins font-normal text-[16px] leading-[24px] text-[#647187]">
                  Configure the field properties and see live preview
                </p>
              </div>
            </div>
          </DialogHeader>
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-hidden">
            <div className="flex flex-row gap-8 w-full h-full p-6">
              {/* Left: Field Properties - Scrollable */}
              <div ref={leftPaneRef} className="flex flex-col gap-4 w-[513px] h-full overflow-y-auto pr-2">
                {/* Display Name (API: displayName) */}
                <div className="flex flex-col gap-1">
                  <label className="font-poppins text-[16px] text-[#333]">
                    Label <span className="text-red-500">*</span>
                  </label>
                  <Input
                    className={`w-full h-[44px] ${fieldErrors.displayName ? 'border-red-500' : ''}`}
                    placeholder="Field label (e.g. Outlet Name)"
                    value={editField?.displayName || editField?.label || ''}
                    onChange={(e) => handleEditDisplayNameChange(e.target.value)}
                  />
                  {fieldErrors.displayName && (
                    <span className="text-red-500 text-xs mt-1">{fieldErrors.displayName}</span>
                  )}
                </div>
                {/* Field Name (API: name) */}
                <div className="flex flex-col gap-1">
                  <label className="font-poppins text-[16px] text-[#333]">
                    Field Key <span className="text-red-500">*</span>
                  </label>
                  <Input
                    className={`w-full h-[44px] ${fieldErrors.name ? 'border-red-500' : ''}`}
                    placeholder="Unique field key (e.g. outletName)"
                    value={editField?.name || ''}
                    onChange={(e) => handleEditNameChange(e.target.value)}
                  />
                  {fieldErrors.name && (
                    <span className="text-red-500 text-xs mt-1">{fieldErrors.name}</span>
                  )}
                </div>
                
                {/* Field Type (API: formFieldType) */}
                <div className="flex flex-col gap-1">
                  <label className="font-poppins text-[16px] text-[#333]">Field Type</label>
                  <Select 
                    value={editField?.formFieldType || ''}
                    onValueChange={(value) => handleEditChange('formFieldType', value)}
                  >
                    <SelectTrigger className="w-full h-[44px]">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="checkbox">Checkbox</SelectItem>
                      <SelectItem value="radio">Radio</SelectItem>
                      <SelectItem value="dropdown">Dropdown</SelectItem>
                      <SelectItem value="paragraph">Paragraph</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="file">File</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="header">Header</SelectItem>
                      <SelectItem value="array">Grouped Field</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Required toggle */}
                <div className="flex flex-row items-center gap-2 mt-2">
                  <Checkbox
                    checked={!!editField?.required}
                    onCheckedChange={(checked) => handleEditChange('required', checked)}
                    id="required-toggle"
                  />
                  <label htmlFor="required-toggle" className="font-poppins text-[16px] text-[#333]">Required</label>
                </div>
                {/* Repeatable toggle for array fields */}
                {editField?.formFieldType === 'array' && (
                  <div className="flex flex-row items-center gap-2 mt-2">
                    <Checkbox
                      checked={!!editField?.repeatable}
                      onCheckedChange={(checked) => handleEditChange('repeatable', checked)}
                      id="repeatable-toggle"
                    />
                    <label htmlFor="repeatable-toggle" className="font-poppins text-[16px] text-[#333]">Repeatable</label>
                  </div>
                )}
                {/* Grouped Fields Management for array fields */}
                {editField?.formFieldType === 'array' && (
                  <div className="flex flex-col gap-3 mt-4">
                    <label className="font-poppins text-[16px] text-[#333]">Add Grouped Fields</label>
                    <div className="flex flex-col gap-3 ">
                      {Array.isArray(editField?.groupedFields) && editField.groupedFields.map((groupedField: any, index: number) => (
                        <div key={index} className="flex flex-col gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                          <div className="flex flex-row items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                              {groupedField.formFieldType} Field
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeGroupedField(index)}
                              className="h-[32px] w-[32px] p-0 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-gray-600">Field Key</label>
                              <Input
                                className="h-[36px] text-sm"
                                placeholder="Field key"
                                value={groupedField.name || ''}
                                onChange={(e) => updateGroupedField(index, 'name', e.target.value)}
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-gray-600">Label</label>
                              <Input
                                className="h-[36px] text-sm"
                                placeholder="Field label"
                                value={groupedField.displayName || ''}
                                onChange={(e) => updateGroupedField(index, 'displayName', e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="flex flex-row items-center gap-2">
                            <Checkbox
                              checked={!!groupedField.required}
                              onCheckedChange={(checked) => updateGroupedField(index, 'required', checked)}
                              id={`grouped-required-${index}`}
                            />
                            <label htmlFor={`grouped-required-${index}`} className="text-sm text-gray-600">Required</label>
                          </div>
                          {/* Values for checkbox, radio, dropdown */}
                          {(groupedField.formFieldType === 'checkbox' || groupedField.formFieldType === 'radio' || groupedField.formFieldType === 'dropdown') && (
                            <div className="flex flex-col gap-2">
                              <label className="text-xs text-gray-600">Options</label>
                              <div className="flex flex-col gap-1">
                                {Array.isArray(groupedField.values) && groupedField.values.map((value: string, valueIndex: number) => (
                                  <div key={valueIndex} className="flex flex-row items-center gap-2">
                                    <Input
                                      className="flex-1 h-[32px] text-sm"
                                      placeholder={`Option ${valueIndex + 1}`}
                                      value={value}
                                      onChange={(e) => {
                                        const newValues = [...groupedField.values];
                                        newValues[valueIndex] = e.target.value;
                                        updateGroupedField(index, 'values', newValues);
                                      }}
                                    />
                                    {groupedField.values.length > 1 && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const newValues = groupedField.values.filter((_: string, i: number) => i !== valueIndex);
                                          updateGroupedField(index, 'values', newValues);
                                        }}
                                        className="h-[32px] w-[32px] p-0 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 size={12} />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const currentValues = Array.isArray(groupedField.values) ? groupedField.values : [];
                                    updateGroupedField(index, 'values', [...currentValues, '']);
                                  }}
                                  className="w-fit h-[32px] px-3 text-sm"
                                >
                                  + Add Option
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Add field section */}
                    <div className="flex flex-row items-end gap-2 mt-2">
                      <div className="flex-1">
                        <label className="text-sm text-gray-600 mb-1 block">Select Field Type</label>
                        <Select 
                          value={selectedGroupedFieldType} 
                          onValueChange={setSelectedGroupedFieldType}
                        >
                          <SelectTrigger className="w-full h-[36px]">
                            <SelectValue placeholder="Choose field type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="checkbox">Checkbox</SelectItem>
                            <SelectItem value="radio">Radio</SelectItem>
                            <SelectItem value="dropdown">Dropdown</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="file">File</SelectItem>
                            <SelectItem value="image">Image</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          if (selectedGroupedFieldType) {
                            addGroupedField(selectedGroupedFieldType);
                            setSelectedGroupedFieldType(''); // Reset selection after adding
                          }
                        }}
                        disabled={!selectedGroupedFieldType}
                        className="h-[36px] px-4 text-sm"
                      >
                        Add Field
                      </Button>
                    </div>
                    {Array.isArray(editField?.groupedFields) && editField.groupedFields.length === 0 && (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        No fields added yet. Select a field type and click "Add Field" to add to this array.
                      </div>
                    )}
                    {fieldErrors.groupedFields && (
                      <span className="text-red-500 text-xs mt-1">{fieldErrors.groupedFields}</span>
                    )}
                    {Array.isArray(editField?.groupedFields) && editField.groupedFields.length > 0 && (
                      <div className="text-xs text-gray-500 mt-3">
                       
                      </div>
                    )}
                  </div>
                )}
                {/* Values (for checkbox, radio, dropdown) */}
                {(editField?.formFieldType === 'checkbox' || editField?.formFieldType === 'radio' || editField?.formFieldType === 'dropdown') && (
                  <div className="flex flex-col gap-3 mt-2">
                    <label className="font-poppins text-[16px] text-[#333]">Options</label>
                    <div className="flex flex-col gap-2">
                      {Array.isArray(editField?.values) && editField.values.map((value: string, index: number, arr: string[]) => {
                        const isDuplicate = value && arr.indexOf(value) !== index;
                        return (
                          <div key={index} className="flex flex-row items-center gap-2">
                            <Input
                              className={`flex-1 h-[44px]${isDuplicate ? ' border-2 border-red-500 ring-2 ring-red-400' : ''}`}
                              placeholder={`Option ${index + 1}`}
                              value={value}
                              onChange={(e) => {
                                const newValues = [...editField.values];
                                newValues[index] = e.target.value;
                                handleEditChange('values', newValues);
                                // Clear duplicate error if no more duplicates
                                const hasDuplicates = newValues.some((val: string, idx: number) => val && newValues.indexOf(val) !== idx);
                                if (!hasDuplicates) {
                                  setFieldErrors((prev) => ({ ...prev, values: undefined }));
                                }
                              }}
                            />
                            {editField.values.length > 1 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newValues = editField.values.filter((_: string, i: number) => i !== index);
                                  handleEditChange('values', newValues);
                                  // Clear duplicate error if no more duplicates
                                  const hasDuplicates = newValues.some((val: string, idx: number) => val && newValues.indexOf(val) !== idx);
                                  if (!hasDuplicates) {
                                    setFieldErrors((prev) => ({ ...prev, values: undefined }));
                                  }
                                }}
                                className="h-[44px] w-[44px] p-0 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 size={16} />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                      {fieldErrors.values && (
                        <span className="text-red-500 text-xs mt-1">{fieldErrors.values}</span>
                      )}
                      <Button
                        variant="default"
                        onClick={() => {
                          const currentValues = Array.isArray(editField?.values) ? editField.values : [];
                          // Check for duplicates before adding
                          const hasDuplicates = currentValues.some((val: string, idx: number) => val && currentValues.indexOf(val) !== idx);
                          if (hasDuplicates) {
                            setFieldErrors((prev) => ({ ...prev, values: 'Duplicate options are not allowed.' }));
                            return;
                          }
                          setFieldErrors((prev) => ({ ...prev, values: undefined }));
                          handleEditChange('values', [...currentValues, '']);
                          setShouldScrollLeftPane(true);
                        }}
                        className="w-fit h-[44px] px-4 flex items-center gap-2"
                      >
                        + Add More Option
                      </Button>
                    </div>
                  </div>
                )}
                {/* Date Format (for date) */}
                {editField?.formFieldType === 'date' && (
                  <div className="flex flex-col gap-1 mt-2">
                    <label className="font-poppins text-[16px] text-[#333]">Date Format</label>
                    <Input
                      className="w-full h-[44px]"
                      placeholder="YYYY-MM-DD"
                      value={editField?.dateFormat || ''}
                      onChange={(e) => handleEditChange('dateFormat', e.target.value)}
                    />
                  </div>
                )}
                {/* Default Value for header and paragraph */}
                {(editField?.formFieldType === 'header' || editField?.formFieldType === 'paragraph') && (
                  <div className="flex flex-col gap-1 mt-2">
                    <label className="font-poppins text-[16px] text-[#333]">
                      {editField?.formFieldType === 'header' ? 'Header Text' : 'Default Text'}
                    </label>
                    {editField?.formFieldType === 'paragraph' ? (
                      <Textarea
                        className="w-full min-h-[80px]"
                        placeholder="Enter default text"
                        value={editField?.value || ''}
                        onChange={(e) => handleEditChange('value', e.target.value)}
                      />
                    ) : (
                      <Input
                        className="w-full h-[44px]"
                        placeholder="Enter header text"
                        value={editField?.value || ''}
                        onChange={(e) => handleEditChange('value', e.target.value)}
                      />
                    )}
                  </div>
                )}
              </div>
              
              {/* Right: Preview - Fixed, but scrollable if content overflows */}
              <div className="flex flex-col gap-3 w-[513px] h-full">
                {/* Preview header with green background */}
                <div className="flex flex-row justify-center items-center py-2 px-0 w-full h-[47px] bg-[#D4FDE5] rounded-[12px] flex-shrink-0">
                  <span className="font-poppins font-medium text-[18px] leading-[27px] text-[#00A846]">
                    Preview of your field
                  </span>
                </div>
                {/* Preview content area - scrollable if content overflows */}
                <div className="flex-1 w-full bg-[#F9F9F9] rounded-[12px] p-6 relative overflow-y-auto max-h-[420px]">
                  <div className="flex flex-col gap-2 w-[400px] mx-auto">
                    {/* Label row with field name */}
                    <div className="flex flex-row items-center gap-1">
                      {editField?.formFieldType === 'header' ? (
                        // For header fields, show the label or displayName as the header text
                        <h3 className="font-regular text-lg text-gray-500">
                          {editField?.displayName || editField?.label}
                        </h3>
                      ) : (
                        <>
                          <label className="font-poppins font-normal text-[16px] leading-[24px] text-gray-900">
                            {editField?.displayName || 'Field Label'}
                            {editField?.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </label>
                          <span className="font-poppins font-normal text-[16px] leading-[24px] text-[#7E7E7E]">
                            {editField?.displayName ? '' : 'Text'}
                          </span>
                        </>
                      )}
                    </div>
                    {/* Input field */}
                    {editField && editField.formFieldType === 'header' ? null : editField && editField.formFieldType === 'array' ? (
                      /* Array field preview */
                      <div className="flex flex-col gap-3 w-full bg-white border border-[#CED5DE] shadow-sm rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Grouped Field</span>
                          <span className="text-xs text-gray-500">
                            {editField.repeatable ? 'Repeatable' : 'Single'}
                          </span>
                        </div>
                        {Array.isArray(editField.groupedFields) && editField.groupedFields.length > 0 ? (
                          <div className="space-y-2">
                            {editField.groupedFields.map((groupedField: any, idx: number) => (
                              <div key={idx} className="bg-gray-50 border border-gray-200 rounded p-3">
                                <div className="flex flex-col gap-2">
                                  <label className="text-sm font-medium text-gray-700">
                                    {groupedField.displayName || groupedField.name}
                                    {groupedField.required && <span className="text-red-500 ml-1">*</span>}
                                  </label>
                                  <div className="text-xs text-gray-500">
                                    Type: {groupedField.formFieldType}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            No fields added yet
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-row items-center py-2 px-4 gap-2 w-full bg-white border border-[#CED5DE] shadow-sm rounded-lg">
                        <div className="flex flex-col gap-2 flex-1">
                          {editField && renderFieldPreview(editField)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Fixed Footer */}
          <DialogFooter className="flex flex-row justify-end gap-3 w-full p-6 border-t border-gray-200 flex-shrink-0">
            <DialogClose asChild>
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={() => {
                // Check for duplicate options before saving
                if (editField && (editField.formFieldType === 'checkbox' || editField.formFieldType === 'radio' || editField.formFieldType === 'dropdown')) {
                  const values = Array.isArray(editField.values) ? editField.values : [];
                  const hasDuplicates = values.some((val: string, idx: number) => val && values.indexOf(val) !== idx);
                  if (hasDuplicates) {
                    setFieldErrors((prev) => ({ ...prev, values: 'Duplicate options are not allowed.' }));
                    return;
                  }
                }
                // Check for duplicate options in grouped fields
                if (editField && editField.formFieldType === 'array' && Array.isArray(editField.groupedFields)) {
                  for (const groupedField of editField.groupedFields) {
                    if ((groupedField.formFieldType === 'checkbox' || groupedField.formFieldType === 'radio' || groupedField.formFieldType === 'dropdown') && Array.isArray(groupedField.values)) {
                      const hasDuplicates = groupedField.values.some((val: string, idx: number) => val && groupedField.values.indexOf(val) !== idx);
                      if (hasDuplicates) {
                        setFieldErrors((prev) => ({ ...prev, groupedFields: 'Duplicate options are not allowed in grouped fields.' }));
                        return;
                      }
                    }
                  }
                }
                setFieldErrors((prev) => ({ ...prev, values: undefined, groupedFields: undefined }));
                saveFieldChanges();
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={isDeleteModalOpen}
        onOpenChange={(open: boolean) => {
          if (!open) handleCancelDelete();
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Field"
        description={`Are you sure you want to delete the field "${fieldToDelete?.displayName || fieldToDelete?.label || fieldToDelete?.name || ''}"? This action cannot be undone.`}
        isLoading={false}
      />

      {/* Save/Cancel buttons at bottom of page */}
      <div className="flex flex-row justify-end gap-3 w-full mt-8">
        <Button
          variant="outline"
          onClick={() => {
            setFormName('');
            setDisplayName('');
            setFormType('');
            setOutletType('');
            setFormTopErrors({});
            setFields([]);
            if (mode === 'edit') {
              router.push(NavKeys.ConfigForm);
            }
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={async () => {
            const errors: { formName?: string; displayName?: string } = {};
            if (!formName.trim()) errors.formName = 'Form Name is required';
            if (!displayName.trim()) errors.displayName = 'Display Name is required';
            setFormTopErrors(errors);
            if (Object.keys(errors).length === 0) {
              const payload = generateFormData();
              try {
                if (mode === 'edit' && formId) {
                  await updateFormMutation.mutateAsync({ id: formId, data: payload });
                } else {
                  await createFormMutation.mutateAsync(payload);
                }
                router.push(NavKeys.ConfigForm);
              } catch (err) {
                // handle error (show toast, etc)
              }
            }
          }}
          disabled={updateFormMutation.isPending || createFormMutation.isPending}
        >
          {mode === 'edit' ? (updateFormMutation.isPending ? 'Saving...' : 'Save') : (createFormMutation.isPending ? 'Saving...' : 'Save')}
        </Button>
      </div>
    </DndContext>
  );
};

export default FormCreationPage;
