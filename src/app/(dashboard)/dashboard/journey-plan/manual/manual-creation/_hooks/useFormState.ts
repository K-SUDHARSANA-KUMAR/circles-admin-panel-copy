import { useState, useCallback } from 'react';
import { FormState } from '../_types';

const initialFormState: FormState = {
  salesPerson: '',
  pjpType: '',
  selectedWarehouseId: '',
  selectedDivision: '',
  selectedChannel: '',
  selectedZone: '',
  selectedSubZone: '',
  selectedWarehouse: '',
  selectedUser: '',
  editModeUserName: '',
};

export const useFormState = (isEditMode: boolean) => {
  const [formState, setFormState] = useState<FormState>(initialFormState);

  const updateFormField = useCallback((field: keyof FormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleDivisionChange = useCallback((division: string) => {
    if (division !== formState.selectedDivision) {
      setFormState(prev => ({
        ...prev,
        selectedDivision: division,
        selectedChannel: '',
        selectedZone: '',
        selectedSubZone: '',
        selectedWarehouse: '',
        selectedUser: '',
      }));
    }
  }, [formState.selectedDivision]);

  const handleChannelChange = useCallback((channel: string) => {
    if (channel !== formState.selectedChannel) {
      setFormState(prev => ({
        ...prev,
        selectedChannel: channel,
        selectedZone: '',
        selectedSubZone: '',
        selectedWarehouse: '',
        selectedUser: '',
      }));
    }
  }, [formState.selectedChannel]);

  const handleZoneChange = useCallback((zone: string) => {
    if (zone !== formState.selectedZone) {
      setFormState(prev => ({
        ...prev,
        selectedZone: zone,
        selectedSubZone: '',
        selectedWarehouse: '',
        selectedUser: '',
      }));
    }
  }, [formState.selectedZone]);

  const handleSubZoneChange = useCallback((subZone: string) => {
    if (subZone !== formState.selectedSubZone) {
      setFormState(prev => ({
        ...prev,
        selectedSubZone: subZone,
        selectedWarehouse: '',
        selectedUser: '',
      }));
    }
  }, [formState.selectedSubZone]);

  const handleWarehouseChange = useCallback((warehouse: string) => {
    if (warehouse !== formState.selectedWarehouse) {
      setFormState(prev => ({
        ...prev,
        selectedWarehouse: warehouse,
        selectedUser: !isEditMode ? '' : prev.selectedUser,
      }));
    }
  }, [formState.selectedWarehouse, isEditMode]);

  const handleUserChange = useCallback((userId: string) => {
    setFormState(prev => ({ ...prev, selectedUser: userId }));
  }, []);

  const resetForm = useCallback(() => {
    setFormState(initialFormState);
  }, []);

  return {
    formState,
    updateFormField,
    handleDivisionChange,
    handleChannelChange,
    handleZoneChange,
    handleSubZoneChange,
    handleWarehouseChange,
    handleUserChange,
    resetForm,
    setFormState,
  };
};
