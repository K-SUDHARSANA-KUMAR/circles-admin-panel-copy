import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SystemState {
  theme: 'light' | 'dark';
  language: string;
  isSidebarOpen: boolean;
}

const initialState: SystemState = {
  theme: 'light',
  language: 'en',
  isSidebarOpen: true,
};

const systemSlice = createSlice({
  name: 'system',
  initialState,
  reducers: {
    toggleTheme(state) {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    },
    setLanguage(state, action: PayloadAction<string>) {
      state.language = action.payload;
    },
    toggleSidebar(state) {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
  },
});

export const { toggleTheme, setLanguage, toggleSidebar } = systemSlice.actions;
export default systemSlice.reducer; 