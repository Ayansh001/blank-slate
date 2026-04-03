
import { useMemo } from 'react';
import { FilterOptions } from '../contexts/HistoryFilterContext';
import { isWithinInterval, parseISO, isValid } from 'date-fns';

export function useFilteredData<T extends Record<string, any>>(
  data: T[],
  filters: FilterOptions,
  getItemType: (item: T) => string,
  getItemStatus: (item: T) => string,
  getItemDate: (item: T) => string | null,
  getSearchableText: (item: T) => string
): T[] {
  return useMemo(() => {
    if (!data) return [];

    return data.filter((item) => {
      // Type filter
      if (filters.types.length > 0) {
        const itemType = getItemType(item);
        if (!filters.types.includes(itemType)) {
          return false;
        }
      }

      // Status filter
      if (filters.statuses.length > 0) {
        const itemStatus = getItemStatus(item);
        if (!filters.statuses.includes(itemStatus)) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange?.from || filters.dateRange?.to) {
        const itemDateStr = getItemDate(item);
        if (!itemDateStr) return false;

        try {
          const itemDate = parseISO(itemDateStr);
          if (!isValid(itemDate)) return false;

          if (filters.dateRange.from && filters.dateRange.to) {
            if (!isWithinInterval(itemDate, {
              start: filters.dateRange.from,
              end: filters.dateRange.to
            })) {
              return false;
            }
          } else if (filters.dateRange.from) {
            if (itemDate < filters.dateRange.from) {
              return false;
            }
          } else if (filters.dateRange.to) {
            if (itemDate > filters.dateRange.to) {
              return false;
            }
          }
        } catch {
          return false;
        }
      }

      // Search term filter
      if (filters.searchTerm) {
        const searchableText = getSearchableText(item).toLowerCase();
        if (!searchableText.includes(filters.searchTerm.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [data, filters, getItemType, getItemStatus, getItemDate, getSearchableText]);
}
