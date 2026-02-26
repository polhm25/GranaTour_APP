// Store de excursiones: catálogo, filtros y búsqueda
import { create } from 'zustand';
import type { ExcursionConGuia, DificultadExcursion } from '@/lib/types';

export interface ExcursionFilters {
  zona?: string;
  dificultad?: DificultadExcursion;
  maxPrice?: number;
  fromDate?: string;
}

interface ExcursionsState {
  // Estado
  excursions: ExcursionConGuia[];
  currentExcursion: ExcursionConGuia | null;
  filters: ExcursionFilters;
  searchText: string;
  loading: boolean;
  error: string | null;

  // Acciones
  fetchExcursions: () => Promise<void>;
  getExcursionById: (id: number) => Promise<ExcursionConGuia | null>;
  setFilters: (filters: ExcursionFilters) => void;
  setSearch: (text: string) => void;
  clearFilters: () => void;
  clearError: () => void;
}

export const useExcursionsStore = create<ExcursionsState>((set) => ({
  excursions: [],
  currentExcursion: null,
  filters: {},
  searchText: '',
  loading: false,
  error: null,

  fetchExcursions: async () => {
    // Implementar en Fase 2
  },

  getExcursionById: async (_id: number) => {
    // Implementar en Fase 2
    return null;
  },

  setFilters: (filters: ExcursionFilters) => set({ filters }),

  setSearch: (text: string) => set({ searchText: text }),

  clearFilters: () => set({ filters: {}, searchText: '' }),

  clearError: () => set({ error: null }),
}));
