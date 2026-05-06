import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import RoleDropdown from './role-dropdown';

interface ClaimHierarchyCardAddProps {
  open: boolean;
  onClose: () => void;
  onSave: (approver: any) => void;
  level: string;
  roles: { id: string; name: string }[];
  editApprover?: { roleId: string; mandatory: boolean } | null;
}

const ClaimHierarchyCardAdd: React.FC<ClaimHierarchyCardAddProps> = ({ open, onClose, onSave, level, roles, editApprover }) => {
  const [selectedRole, setSelectedRole] = useState('');
  const [mandatory, setMandatory] = useState(false);

  useEffect(() => {
    if (editApprover) {
      setSelectedRole(editApprover.roleId);
      setMandatory(editApprover.mandatory);
    } else {
      // Only reset when opening a new modal, not when editing
      if (open && !editApprover) {
        setSelectedRole('');
        setMandatory(false);
      }
    }
  }, [editApprover, open]);

  // Don't reset state when modal closes - preserve values
  // This allows users to cancel and reopen with their previous selections

  if (!open) return null;

  // Handler for clicking the background to close modal
  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if the user clicked directly on the background, not the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      key={`claim-hierarchy-modal-${level}-${editApprover ? 'edit' : 'add'}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm"
      onClick={handleBackgroundClick}
    >
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">
          {editApprover ? `Edit Approver - ${level}` : `Add Approver - ${level}`}
        </h2>
        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium">Role</label>
          <RoleDropdown
            value={selectedRole}
            onChange={setSelectedRole}
            placeholder="Select Role"
            roles={roles}
          />
        </div>
        <div className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="mandatory"
            checked={mandatory}
            onChange={e => setMandatory(e.target.checked)}
          />
          <label htmlFor="mandatory" className="text-sm">Mandatory</label>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (selectedRole) {
                onSave({ roleId: selectedRole, mandatory });
                // Only reset after successful save
                setSelectedRole('');
                setMandatory(false);
              }
            }}
            disabled={!selectedRole}
          >
            {editApprover ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClaimHierarchyCardAdd;
export { ClaimHierarchyCardAdd };
