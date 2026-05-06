import { DateRange } from 'react-day-picker';
import { ExtendedOutletVisitRecord } from '../_types';
import { FORM_VALIDATION_MESSAGES } from '../_constants';

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export const validateForm = (
  selectedUser: string,
  pjpType: string,
  dateRange: DateRange | undefined,
  outletVisitRecords: ExtendedOutletVisitRecord[],
  isApprovedRecord?: boolean,
  reason?: string
): ValidationResult => {
  if (!selectedUser) {
    return { isValid: false, message: FORM_VALIDATION_MESSAGES.USER_REQUIRED };
  }

  if (!pjpType) {
    return { isValid: false, message: FORM_VALIDATION_MESSAGES.PJP_TYPE_REQUIRED };
  }

  if (!dateRange?.from || !dateRange?.to) {
    return { isValid: false, message: FORM_VALIDATION_MESSAGES.DATE_RANGE_REQUIRED };
  }

  // Validate reason for approved records
  if (isApprovedRecord && (!reason || reason.trim().length === 0)) {
    return { isValid: false, message: 'Reason is required for editing approved records' };
  }

  // Check if each record has either outlets OR applicableTo OR assigned activity
  const hasValidRecords = outletVisitRecords.some((record) => {
    const hasOutlets = record.selectedOutlets && record.selectedOutlets.length > 0;
    const hasApplicableTo = record.applicableTo && 
      Object.values(record.applicableTo).some(arr => arr.length > 0);
    const hasAssignedActivity = record.pjpVisitTypeId || 
      (record.assignedActivityBeatIds && record.assignedActivityBeatIds.length > 0);
    return hasOutlets || hasApplicableTo || hasAssignedActivity;
  });

  if (!hasValidRecords) {
    return { 
      isValid: false, 
      message: 'Please assign outlets, areas, or activity for at least one date' 
    };
  }

  // Check for incomplete rows - each row should have outlets OR applicableTo OR assigned activity
  const hasIncompleteRows = outletVisitRecords.some((record) => {
    const hasOutlets = record.selectedOutlets && record.selectedOutlets.length > 0;
    const hasApplicableTo = record.applicableTo && 
      Object.values(record.applicableTo).some(arr => arr.length > 0);
    const hasAssignedActivity = record.pjpVisitTypeId || 
      (record.assignedActivityBeatIds && record.assignedActivityBeatIds.length > 0);
    return !hasOutlets && !hasApplicableTo && !hasAssignedActivity;
  });

  if (hasIncompleteRows) {
    return { 
      isValid: false, 
      message: 'Each date must have either outlets, assigned areas, or assigned activity' 
    };
  }

  return { isValid: true };
};
