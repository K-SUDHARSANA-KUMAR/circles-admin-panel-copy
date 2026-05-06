/**
 * Utility functions for generating stable IDs that prevent hydration mismatches
 */

let idCounter = 0;

/**
 * Generates a stable, unique ID that's consistent between server and client renders
 * Uses an incrementing counter instead of Date.now() or Math.random()
 */
export const generateStableId = (prefix: string = 'id'): string => {
  return `${prefix}_${++idCounter}`;
};

/**
 * Generates a stable ID for criteria objects
 */
export const generateCriteriaId = (): string => {
  return generateStableId('criteria');
};

/**
 * Generates a stable ID for form fields
 */
export const generateFieldId = (): string => {
  return generateStableId('field');
};

/**
 * Generates a stable ID for conditions
 */
export const generateConditionId = (): string => {
  return generateStableId('condition');
};

/**
 * Reset the counter (useful for testing)
 */
export const resetIdCounter = (): void => {
  idCounter = 0;
};
