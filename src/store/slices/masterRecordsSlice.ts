import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MasterRecord } from '@/features/master-managment/types/master.types';

interface MasterRecordsState {
  records: Record<string, MasterRecord[]>;
  recordMaps: Record<string, Record<string, MasterRecord>>;
  selectedValues: Record<string, string>;
  isLoading: Record<string, boolean>;
  error: Record<string, string | null>;
}

const initialState: MasterRecordsState = {
  records: {},
  recordMaps: {},
  selectedValues: {},
  isLoading: {},
  error: {},
};

const masterRecordsSlice = createSlice({
  name: 'masterRecords',
  initialState,
  reducers: {
    setMasterRecords: (state, action: PayloadAction<{ masterName: string; records: MasterRecord[] }>) => {
      const { masterName, records } = action.payload;
      state.records[masterName] = records;

      // Create a map for quick lookups
      state.recordMaps[masterName] = records.reduce((acc, record) => {
        const camelCaseIdKey = `${masterName}Id`;
        const lowercaseIdKey = `${masterName}id`;

        // Special handling for subZone - API returns 'subzoneId' (lowercase 'z')
        let recordId: string | undefined;
        if (masterName === 'subZone') {
          recordId =
            (record as any)['subZoneId'] ||
            (record as any)['subzoneId'] ||
            (record as any)['subzoneid'] ||
            '';
        } else if (masterName === 'transportmode' || masterName === 'transportMode') {
          recordId =
            (record as any)['transportModeId'] ||
            (record as any)['transportmodeId'] ||
            (record as any)['transportmodeid'] ||
            '';
        } else {
          // For other masters, try camelCase first, then lowercase
          recordId = (record as any)[camelCaseIdKey] || (record as any)[lowercaseIdKey] || '';
        }

        if (recordId) {
          acc[String(recordId)] = record;
        }
        return acc;
      }, {} as Record<string, MasterRecord>);

      state.isLoading[masterName] = false;
      state.error[masterName] = null;
    },
    setSelectedValue: (state, action: PayloadAction<{ masterName: string; value: string }>) => {
      const { masterName, value } = action.payload;
      state.selectedValues[masterName] = value;
    },
    setLoading: (state, action: PayloadAction<{ masterName: string; isLoading: boolean }>) => {
      const { masterName, isLoading } = action.payload;
      state.isLoading[masterName] = isLoading;
    },
    setError: (state, action: PayloadAction<{ masterName: string; error: string | null }>) => {
      const { masterName, error } = action.payload;
      state.error[masterName] = error;
      state.isLoading[masterName] = false;
    },
    clearMasterRecords: (state, action: PayloadAction<string>) => {
      const masterName = action.payload;
      delete state.records[masterName];
      delete state.recordMaps[masterName];
      delete state.selectedValues[masterName];
      delete state.isLoading[masterName];
      delete state.error[masterName];
    },
  },
});

export const {
  setMasterRecords,
  setSelectedValue,
  setLoading,
  setError,
  clearMasterRecords
} = masterRecordsSlice.actions;

export default masterRecordsSlice.reducer; 