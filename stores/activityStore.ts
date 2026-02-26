// Store de actividades: tracking GPS e historial de actividades
import { create } from 'zustand';
import type { Actividad, PuntoGPS } from '@/lib/types';

interface ActivityState {
  // Estado del tracking activo
  trackingActive: boolean;
  // SU-02: trackingPaused distingue pausa de detención, necesario para el timer y la UI.
  trackingPaused: boolean;
  // Actividad que se está grabando en este momento
  currentActivity: Actividad | null;
  gpsPoints: PuntoGPS[];
  currentDistance: number; // km
  durationSeconds: number;
  currentSpeed: number; // km/h

  // Historial de actividades
  activities: Actividad[];
  // Actividad que se está visualizando en detalle
  selectedActivity: Actividad | null;
  loading: boolean;
  error: string | null;

  // Acciones de tracking (implementar en Fase 5)
  startTracking: (excursionId?: number) => Promise<void>;
  pauseTracking: () => void;
  resumeTracking: () => void;
  stopTracking: () => Promise<void>;
  addGPSPoint: (point: PuntoGPS) => void;

  // Acciones de historial (implementar en Fase 5)
  fetchActivities: () => Promise<void>;
  getActivityById: (id: number) => Promise<Actividad | null>;
  clearError: () => void;
}

// IM-02: solo `set` como parámetro, `get` no se usa en esta fase.
export const useActivityStore = create<ActivityState>((set) => ({
  trackingActive: false,
  trackingPaused: false,
  currentActivity: null,
  gpsPoints: [],
  currentDistance: 0,
  durationSeconds: 0,
  currentSpeed: 0,

  activities: [],
  selectedActivity: null,
  loading: false,
  error: null,

  startTracking: async (_excursionId?: number) => {
    // Implementar en Fase 5
  },

  pauseTracking: () => {
    // Implementar en Fase 5
  },

  resumeTracking: () => {
    // Implementar en Fase 5
  },

  stopTracking: async () => {
    // Implementar en Fase 5
  },

  addGPSPoint: (_point: PuntoGPS) => {
    // Implementar en Fase 5
  },

  fetchActivities: async () => {
    // Implementar en Fase 5
  },

  getActivityById: async (_id: number) => {
    // Implementar en Fase 5
    return null;
  },

  clearError: () => set({ error: null }),
}));
