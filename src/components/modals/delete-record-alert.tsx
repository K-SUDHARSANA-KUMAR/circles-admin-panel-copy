import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { IconTopologyStar3 } from '@tabler/icons-react';

interface RecordDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { groupName: string; displayName: string }) => void;
  isSubmitting: boolean;
}

export function RecordDeleteModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: RecordDeleteModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <div className="flex flex-col gap-1">
              <div className="bg-freshleaf/10 w-fit rounded-full p-2">
                <IconTopologyStar3 className="text-freshleaf h-5 w-5" />
              </div>
              <div className="text-lg font-medium">Are You Sure? You Want To Delete This Record</div>
            </div>
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="space-y-4 pt-4"
        >
          <div className="flex justify-end pt-4 gap-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete Record'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}