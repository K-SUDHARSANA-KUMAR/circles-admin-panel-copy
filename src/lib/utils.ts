
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatWithLeadingZero = (num: number): string => {
  return num.toString().padStart(2, '0');
};

export const getStatusColor = (value: string): string => {
  const status = value.toLowerCase();

  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'inactive':
      return 'bg-red-100 text-red-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'blocked':
      return 'bg-gray-300 text-muted-foreground';
    default:
      return 'bg-gray-100 text-foreground';
  }
};



