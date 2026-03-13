import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface DateRange {
  from: string | null;
  to: string | null;
}

interface FilterState {
  dateRange: DateRange;
  selectedAccounts: string[];
  selectedCategories: string[];
  amountRange: { min: number | null; max: number | null };
  searchQuery: string;
  setDateRange: (range: DateRange) => void;
  setSelectedAccounts: (ids: string[]) => void;
  setSelectedCategories: (ids: string[]) => void;
  setAmountRange: (range: { min: number | null; max: number | null }) => void;
  setSearchQuery: (q: string) => void;
  resetFilters: () => void;
}

const DEFAULT: Pick<FilterState, 'dateRange' | 'selectedAccounts' | 'selectedCategories' | 'amountRange' | 'searchQuery'> = {
  dateRange: { from: null, to: null },
  selectedAccounts: [],
  selectedCategories: [],
  amountRange: { min: null, max: null },
  searchQuery: '',
};

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      ...DEFAULT,
      setDateRange: (dateRange) => set({ dateRange }),
      setSelectedAccounts: (selectedAccounts) => set({ selectedAccounts }),
      setSelectedCategories: (selectedCategories) => set({ selectedCategories }),
      setAmountRange: (amountRange) => set({ amountRange }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      resetFilters: () => set(DEFAULT),
    }),
    {
      name: 'finella-filters',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
