import { Button } from '@/components/ui/button';

interface ActionButtonsProps {
  isEditMode: boolean;
  isLoading: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  isReadOnly?: boolean;
}

export const ActionButtons = ({
  isEditMode,
  isLoading,
  onCancel,
  onSubmit,
  isReadOnly = false,
}: ActionButtonsProps) => {
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={isLoading || isReadOnly}>
          {isLoading
            ? isEditMode
              ? 'Updating...'
              : 'Creating...'
            : isEditMode
              ? 'Update'
              : 'Create'}
        </Button>
      </div>
    </div>
  );
};
