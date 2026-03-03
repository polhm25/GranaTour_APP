// Store de excursiones: catálogo, filtros y búsqueda
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { ExcursionConGuia, DificultadExcursion } from '@/lib/types';

export interface ExcursionFilters {
  zona?: string;
  dificultad?: DificultadExcursion;
  maxPrice?: number;
  fromDate?: string;
}

// Campos de excursión que se seleccionan en todas las queries
const EXCURSION_FIELDS = [
  'id_excursion',
  'nombre_ruta',
  'zona',
  'descripcion',
  'duracion_horas',
  'distancia_km',
  'desnivel_positivo',
  'dificultad',
  'precio_persona',
  'fecha_inicio',
  'plazas_disponibles',
  'id_guia',
  'latitud',
  'longitud',
  'imagen_url',
  'activa',
].join(', ');

// Campos del guía que se incluyen en el JOIN
const GUIA_FIELDS = 'id_usuario, nombre, ap1, avatar_url, valoracion';

// Select completo con JOIN al guía usando alias para coincidir con ExcursionConGuia
const SELECT_CON_GUIA = `${EXCURSION_FIELDS}, guia:usuarios!id_guia(${GUIA_FIELDS})`;

interface ExcursionsState {
  // Estado
  excursions: ExcursionConGuia[];
  currentExcursion: ExcursionConGuia | null;
  featuredExcursions: ExcursionConGuia[];
  upcomingExcursions: ExcursionConGuia[];
  filters: ExcursionFilters;
  searchText: string;
  loading: boolean;
  error: string | null;

  // Acciones de fetch
  fetchExcursions: () => Promise<void>;
  getExcursionById: (id: number) => Promise<ExcursionConGuia | null>;
  fetchFeaturedExcursions: () => Promise<ExcursionConGuia[]>;
  fetchUpcomingExcursions: () => Promise<ExcursionConGuia[]>;

  // Getter computado: aplica filtros y búsqueda sobre excursions en memoria
  getFilteredExcursions: () => ExcursionConGuia[];

  // Acciones de filtro
  setFilters: (filters: ExcursionFilters) => void;
  setSearch: (text: string) => void;
  clearFilters: () => void;
  clearError: () => void;
}

export const useExcursionsStore = create<ExcursionsState>((set, get) => ({
  excursions: [],
  currentExcursion: null,
  featuredExcursions: [],
  upcomingExcursions: [],
  filters: {},
  searchText: '',
  loading: false,
  error: null,

  // ─── fetchExcursions ────────────────────────────────────────────────────────
  // Trae todas las excursiones activas con JOIN al guía, ordenadas por fecha_inicio ASC
  fetchExcursions: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('excursiones')
        .select(SELECT_CON_GUIA)
        .eq('activa', true)
        .order('fecha_inicio', { ascending: true });

      if (error) throw error;

      set({ excursions: (data as unknown as ExcursionConGuia[]) ?? [] });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  // ─── getExcursionById ───────────────────────────────────────────────────────
  // Trae una excursión específica con JOIN al guía y la guarda en currentExcursion
  getExcursionById: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('excursiones')
        .select(SELECT_CON_GUIA)
        .eq('id_excursion', id)
        .single();

      if (error) throw error;

      const excursion = data as unknown as ExcursionConGuia;
      set({ currentExcursion: excursion });
      return excursion;
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  // ─── fetchFeaturedExcursions ────────────────────────────────────────────────
  // Excursiones activas con plazas disponibles, límite 5.
  // Ordenadas por valoración del guía DESC (campo en tabla usuarios).
  // Supabase no permite order() sobre campos de relaciones embebidas, por lo que
  // se ordena en cliente: primero las que tienen guía con valoración, luego por fecha.
  fetchFeaturedExcursions: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('excursiones')
        .select(SELECT_CON_GUIA)
        .eq('activa', true)
        .gt('plazas_disponibles', 0)
        .order('fecha_inicio', { ascending: true })
        .limit(20); // Se trae un conjunto amplio para ordenar en cliente

      if (error) throw error;

      const excursions = (data as unknown as ExcursionConGuia[]) ?? [];

      // Ordenar en cliente: guías con mayor valoración primero, sin valoración al final
      const sorted = [...excursions].sort((a, b) => {
        const valA = a.guia?.valoracion ?? -1;
        const valB = b.guia?.valoracion ?? -1;
        return valB - valA;
      });

      const featured = sorted.slice(0, 5);
      set({ featuredExcursions: featured });
      return featured;
    } catch (error) {
      set({ error: (error as Error).message });
      return [];
    } finally {
      set({ loading: false });
    }
  },

  // ─── fetchUpcomingExcursions ────────────────────────────────────────────────
  // Excursiones activas con fecha_inicio >= hoy, límite 10, ordenadas por fecha ASC
  fetchUpcomingExcursions: async () => {
    set({ loading: true, error: null });
    try {
      // Fecha de hoy en formato 'YYYY-MM-DD' para comparar con el campo DATE de PostgreSQL
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('excursiones')
        .select(SELECT_CON_GUIA)
        .eq('activa', true)
        .gte('fecha_inicio', today)
        .order('fecha_inicio', { ascending: true })
        .limit(10);

      if (error) throw error;

      const upcoming = (data as unknown as ExcursionConGuia[]) ?? [];
      set({ upcomingExcursions: upcoming });
      return upcoming;
    } catch (error) {
      set({ error: (error as Error).message });
      return [];
    } finally {
      set({ loading: false });
    }
  },

  // ─── getFilteredExcursions ──────────────────────────────────────────────────
  // Getter computado: aplica filtros y búsqueda sobre excursions en memoria.
  // No lanza queries adicionales a la DB.
  getFilteredExcursions: () => {
    const { excursions, filters, searchText } = get();

    return excursions.filter((excursion) => {
      // Filtro por zona (case-insensitive contains)
      if (filters.zona) {
        const zonaLower = filters.zona.toLowerCase();
        const coincideZona = excursion.zona.toLowerCase().includes(zonaLower);
        if (!coincideZona) return false;
      }

      // Filtro por dificultad (coincidencia exacta)
      if (filters.dificultad) {
        if (excursion.dificultad !== filters.dificultad) return false;
      }

      // Filtro por precio máximo
      if (filters.maxPrice !== undefined) {
        if (excursion.precio_persona > filters.maxPrice) return false;
      }

      // Filtro por fecha desde (fecha_inicio >= fromDate)
      if (filters.fromDate) {
        if (excursion.fecha_inicio < filters.fromDate) return false;
      }

      // Búsqueda de texto: nombre_ruta y zona (case-insensitive)
      if (searchText.trim()) {
        const textLower = searchText.toLowerCase();
        const enNombre = excursion.nombre_ruta.toLowerCase().includes(textLower);
        const enZona = excursion.zona.toLowerCase().includes(textLower);
        if (!enNombre && !enZona) return false;
      }

      return true;
    });
  },

  // ─── Acciones de filtro ─────────────────────────────────────────────────────

  setFilters: (filters: ExcursionFilters) => set({ filters }),

  setSearch: (text: string) => set({ searchText: text }),

  clearFilters: () => set({ filters: {}, searchText: '' }),

  clearError: () => set({ error: null }),
}));
