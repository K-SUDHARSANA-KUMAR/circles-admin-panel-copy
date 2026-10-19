import { useSyncExternalStore } from 'react';
import { backend } from './backend';

/** Re-renders whenever the CRM snapshot changes. */
export function useBackend() {
  useSyncExternalStore(backend.subscribe, backend.getVersion, backend.getVersion);
  return backend;
}
