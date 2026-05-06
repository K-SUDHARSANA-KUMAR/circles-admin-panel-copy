/**
 * Converts a camelCase string to a readable format
 * Example: "helloWorld" -> "Hello World"
 */
export function camelCaseToReadable(camelCase: string): string {
  if (!camelCase) return '';
  
  // Add space before capital letters and capitalize first letter
  return camelCase
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Converts a readable string to camelCase
 * Example: "Hello World" -> "helloWorld"
 */
export function readableToCamelCase(readable: string): string {
  return readable
    .toLowerCase()
    .replace(/\s+(.)/g, (match, group) => group.toUpperCase());
} 

/**
 * Capitalize the given string
 * Example: "hello" -> "Hello"
 */
export function capitalize(word: string) : string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export const toCamelCase = (str: string) => {
  return str
    .split(' ')
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
};

export const capitalizeDisplayName = (str: string) => {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};



/**
 * Converts snake_case string to readable format
 * @param str - The snake_case string to convert
 * @returns The readable string with spaces and proper capitalization
 * 
 * @example
 * snakeCaseToReadable('user_name') // returns 'User Name'
 * snakeCaseToReadable('first_name') // returns 'First Name'
 */
export const snakeCaseToReadable = (str: string): string => {
  if (!str) return '';
  
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Converts kebab-case string to readable format
 * @param str - The kebab-case string to convert
 * @returns The readable string with spaces and proper capitalization
 * 
 * @example
 * kebabCaseToReadable('user-name') // returns 'User Name'
 * kebabCaseToReadable('first-name') // returns 'First Name'
 */
export const kebabCaseToReadable = (str: string): string => {
  if (!str) return '';
  
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Converts any case string to readable format (auto-detects case type)
 * @param str - The string to convert
 * @returns The readable string with spaces and proper capitalization
 * 
 * @example
 * toReadable('userName') // returns 'User Name'
 * toReadable('user_name') // returns 'User Name'
 * toReadable('user-name') // returns 'User Name'
 */
export const toReadable = (str: string): string => {
  if (!str) return '';
  
  // Check if it's snake_case
  if (str.includes('_')) {
    return snakeCaseToReadable(str);
  }
  
  // Check if it's kebab-case
  if (str.includes('-')) {
    return kebabCaseToReadable(str);
  }
  
  // Default to camelCase
  return camelCaseToReadable(str);
};