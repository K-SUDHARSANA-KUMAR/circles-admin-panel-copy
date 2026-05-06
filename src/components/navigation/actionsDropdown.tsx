import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { useState } from 'react';
import { OutletLogDetailsModal } from '../modals/logs/outlet-log-details';

interface ActionItem {
  label: string;
  value: string; // like "verified", "invalid", etc.
}

interface VerificationActionsDropdownProps {
  index: number;
  outletId: string | null;
  actions: ActionItem[]; // passed dynamically
}

export const VerificationActionsDropdown: React.FC<
  VerificationActionsDropdownProps
> = ({ index, outletId, actions }) => {
  const form = useFormContext();
  const [showLogs, setShowLogs] = useState(false);

  const STATUS_ENDPOINT =
    process.env.NEXT_PUBLIC_PARTNER_SERVICE_URL + '/outlets/';

  const handleStatusUpdate = async (status: string) => {
    const doc = form.getValues(`verificationDocuments.${index}`);

    if (!doc?.documentType) {
      alert('Please select a document type first.');
      return;
    }

    try {
      const response = await fetch(
        `${STATUS_ENDPOINT}${outletId}/documents/status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentType: doc.documentType,
            verificationStatus: status,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to update status');

      form.setValue(
        `verificationDocuments.${index}.verificationStatus`,
        status
      );
    } catch (error) {
      console.error(`Error updating status to ${status}:`, error);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end">
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.value}
              onClick={() => handleStatusUpdate(action.value)}
            >
              {action.label}
            </DropdownMenuItem>
          ))}

          <DropdownMenuItem onClick={() => setShowLogs(true)}>
            Logs
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {showLogs && (
        <OutletLogDetailsModal
          open={showLogs}
          onClose={() => setShowLogs(false)}
          documentIndex={index}
          outletId={outletId}
        />
      )}
    </>
  );
};
