
import { format, isValid } from 'date-fns';

export interface SafeDateOptions {
  fallback?: string;
  formatString?: string;
}

export const safeFormatDate = (
  date: string | Date | null | undefined,
  formatString: string = 'MMM d, yyyy HH:mm',
  fallback: string = 'Unknown date'
): string => {
  // Handle null/undefined dates
  if (!date) {
    return fallback;
  }

  try {
    const parsedDate = typeof date === 'string' ? new Date(date) : date;
    
    // Check if the parsed date is valid
    if (!isValid(parsedDate)) {
      console.warn('Invalid date encountered:', date);
      return fallback;
    }

    return format(parsedDate, formatString);
  } catch (error) {
    console.warn('Date formatting error:', date, error);
    return fallback;
  }
};

export const safeFormatDateShort = (date: string | Date | null | undefined): string => {
  return safeFormatDate(date, 'MMM d, yyyy', 'Unknown date');
};

export const safeFormatDateTime = (date: string | Date | null | undefined): string => {
  return safeFormatDate(date, 'MMM d, yyyy HH:mm', 'Unknown date');
};

export const safeFormatTime = (date: string | Date | null | undefined): string => {
  return safeFormatDate(date, 'HH:mm', 'Unknown time');
};
