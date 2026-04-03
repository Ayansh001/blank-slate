
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { DateRange } from 'react-day-picker';

export interface FilterOptions {
  dateRange?: DateRange;
  types: string[];
  statuses: string[];
  searchTerm: string;
}

interface HistoryFilterContextType {
  filters: FilterOptions;
  setFilters: (filters: FilterOptions) => void;
  clearFilters: () => void;
}

const defaultFilters: FilterOptions = {
  types: [],
  statuses: [],
  searchTerm: ''
};

const HistoryFilterContext = createContext<HistoryFilterContextType | undefined>(undefined);

export function HistoryFilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterOptions>(defaultFilters);

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  return (
    <HistoryFilterContext.Provider value={{ filters, setFilters, clearFilters }}>
      {children}
    </HistoryFilterContext.Provider>
  );
}

export function useHistoryFilters() {
  const context = useContext(HistoryFilterContext);
  if (context === undefined) {
    throw new Error('useHistoryFilters must be used within a HistoryFilterProvider');
  }
  return context;
}
