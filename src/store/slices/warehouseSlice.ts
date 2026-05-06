import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// ---------- Warehouse Slice ----------
interface Warehouse {
  _id: string;
  warehouseId: string;
  warehouseName: string;
  divisionId?: string;
  divisionName?: string;
  channelId?: string;
  channelName?: string;
  zoneId?: string;
  zoneName?: string;
  subZoneId?: string;
  subZoneName?: string;
  warehouseTypeId?: string;
  warehouseTypeName?: string;
  address: {
    streetAddress: string;
    location: {
      type: string;
      coordinates: [number, number];
    };
  };
  isDeleted: boolean;
  __v: number;
}

interface WarehouseState {
  warehouses: Warehouse[];
  warehouseMap: Record<string, Warehouse>;
  isLoading: boolean;
  error: string | null;
}

const initialWarehouseState: WarehouseState = {
  warehouses: [],
  warehouseMap: {},
  isLoading: false,
  error: null,
};

const warehouseSlice = createSlice({
  name: 'warehouse',
  initialState: initialWarehouseState,
  reducers: {
    setWarehouses: (state, action: PayloadAction<Warehouse[]>) => {
      state.warehouses = action.payload;
      state.warehouseMap = action.payload.reduce((acc, warehouse) => {
        acc[warehouse.warehouseId] = warehouse;
        return acc;
      }, {} as Record<string, Warehouse>);
      state.isLoading = false;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
  },
});

// ---------- Pincode Slice ----------
interface Pincode {
  _id: string;
  pincodeId: string;
  pincodeName: string;
  address: {
    streetAddress: string;
    location: {
      type: string;
      coordinates: [number, number];
    };
  };
  isDeleted: boolean;
  __v: number;
}

interface PincodeState {
  pincodes: Pincode[];
  pincodeMap: Record<string, Pincode>;
  isLoading: boolean;
  error: string | null;
}

const initialPincodeState: PincodeState = {
  pincodes: [],
  pincodeMap: {},
  isLoading: false,
  error: null,
};

const pincodeSlice = createSlice({
  name: 'pincode',
  initialState: initialPincodeState,
  reducers: {
    setPincodes: (state, action: PayloadAction<Pincode[]>) => {
      state.pincodes = action.payload;
      state.pincodeMap = action.payload.reduce((acc, pincode) => {
        acc[pincode.pincodeId] = pincode;
        return acc;
      }, {} as Record<string, Pincode>);
      state.isLoading = false;
      state.error = null;
    },
    setPincodeLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setPincodeError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
  },
});

// ---------- Exports ----------
export const {
  setWarehouses,
  setLoading,
  setError,
} = warehouseSlice.actions;

export const {
  setPincodes,
  setPincodeLoading,
  setPincodeError,
} = pincodeSlice.actions;

export const warehouseReducer = warehouseSlice.reducer;
export const pincodeReducer = pincodeSlice.reducer;
