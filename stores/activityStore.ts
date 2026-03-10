// Store de actividades: tracking GPS en tiempo real e historial de actividades guardadas
import { create } from 'zustand';
import * as Location from 'expo-location';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { BACKGROUND_LOCATION_TASK } from '@/tasks/backgroundLocation';
import type { Actividad, PuntoGPS } from '@/lib/types';

// ─── Timer del tracking (fuera del store para no serializar refs) ──────────────

let timerInterval: ReturnType<typeof setInterval> | null = null;

// Suscripción de watchPositionAsync usada como fallback si el background task falla
let locationSubscription: Location.LocationSubscription | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Fórmula de Haversine: distancia en km entre dos puntos GPS
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Serializa el array de puntos GPS a GeoJSON LineString para guardar en Supabase
function pointsToGeoJson(points: PuntoGPS[]): string {
  return JSON.stringify({
    type: 'LineString',
    // GeoJSON usa [longitud, latitud] (orden inverso al de PuntoGPS)
    coordinates: points.map((p) =>
      p.altitud !== undefined
        ? [p.longitud, p.latitud, p.altitud]
        : [p.longitud, p.latitud]
    ),
  });
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

// Resumen generado al detener el tracking, mostrado antes de guardar o descartar
interface ActivitySummary {
  distanceKm: number;
  durationMinutes: number;
  averageSpeed: number; // km/h
  elevationGain: number; // metros de desnivel positivo acumulado
  points: PuntoGPS[];
  startTime: number; // Unix ms
  endTime: number; // Unix ms
  excursionId?: number;
}

interface ActivityState {
  // ── Tracking activo ────────────────────────────────────────────────────────
  trackingActive: boolean;
  trackingPaused: boolean;
  // Flag que previene doble pulsación del botón inicio mientras se solicitan permisos
  startingTracking: boolean;
  currentExcursionId: number | undefined;
  startTime: number | null; // Unix ms
  gpsPoints: PuntoGPS[];
  currentDistance: number; // km acumulados
  durationSeconds: number; // segundos transcurridos (excluye pausas)
  currentSpeed: number; // km/h del último punto
  elevationGain: number; // metros de desnivel positivo acumulado

  // Resumen pendiente de guardar o descartar (visible tras stopTracking)
  pendingSummary: ActivitySummary | null;

  // ── Historial ──────────────────────────────────────────────────────────────
  activities: Actividad[];
  selectedActivity: Actividad | null;
  loading: boolean;
  loadingSave: boolean;
  error: string | null;

  // ── Acciones de tracking ───────────────────────────────────────────────────
  startTracking: (excursionId?: number) => Promise<void>;
  pauseTracking: () => void;
  resumeTracking: () => void;
  stopTracking: () => void;
  addGPSPoint: (point: PuntoGPS) => void;

  // ── Acciones post-tracking ─────────────────────────────────────────────────
  saveActivity: (titulo?: string) => Promise<void>;
  discardActivity: () => void;

  // ── Acciones de historial ─────────────────────────────────────────────────
  fetchActivities: () => Promise<void>;
  getActivityById: (id: number) => Promise<Actividad | null>;
  clearError: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useActivityStore = create<ActivityState>((set, get) => ({
  trackingActive: false,
  trackingPaused: false,
  startingTracking: false,
  currentExcursionId: undefined,
  startTime: null,
  gpsPoints: [],
  currentDistance: 0,
  durationSeconds: 0,
  currentSpeed: 0,
  elevationGain: 0,
  pendingSummary: null,

  activities: [],
  selectedActivity: null,
  loading: false,
  loadingSave: false,
  error: null,

  // ── startTracking ──────────────────────────────────────────────────────────
  startTracking: async (excursionId?: number) => {
    // Prevenir doble ejecución si ya está en proceso de inicio (C-02)
    if (get().startingTracking || get().trackingActive) return;

    set({ error: null, startingTracking: true });

    // Verificar permisos foreground (obligatorio)
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      set({ error: 'Se necesitan permisos de ubicación para el tracking GPS', startingTracking: false });
      return;
    }

    // Permisos background (opcional — fallback a foreground si se deniegan)
    await Location.requestBackgroundPermissionsAsync().catch(() => {
      if (__DEV__) console.warn('[GranaTour] Sin permisos de ubicación en background');
    });

    set({
      trackingActive: true,
      trackingPaused: false,
      startingTracking: false,
      currentExcursionId: excursionId,
      startTime: Date.now(),
      gpsPoints: [],
      currentDistance: 0,
      durationSeconds: 0,
      currentSpeed: 0,
      elevationGain: 0,
      pendingSummary: null,
      error: null,
    });

    // Arrancar timer: incrementa durationSeconds cada segundo mientras no está pausado
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      const state = get();
      if (state.trackingActive && !state.trackingPaused) {
        set({ durationSeconds: state.durationSeconds + 1 });
      }
    }, 1000);

    // Intentar tracking en background con TaskManager
    let usingBackgroundTask = false;
    try {
      const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (!isRunning) {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.BestForNavigation,
          // Solo actualizar si se mueve >= 5 metros o pasan >= 3 segundos (ahorro de batería)
          distanceInterval: 5,
          timeInterval: 3000,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'GranaTour — Tracking activo',
            notificationBody: 'Grabando tu ruta GPS en segundo plano',
          },
        });
      }
      usingBackgroundTask = true;
    } catch (err) {
      if (__DEV__) console.warn('[GranaTour] Background tracking no disponible, usando foreground:', err);
    }

    // Fallback foreground con watchPositionAsync si el background task no arrancó
    if (!usingBackgroundTask) {
      try {
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 5,
            timeInterval: 3000,
          },
          (loc) => {
            const state = get();
            if (!state.trackingActive || state.trackingPaused) return;
            const punto: PuntoGPS = {
              latitud: loc.coords.latitude,
              longitud: loc.coords.longitude,
              altitud: loc.coords.altitude ?? undefined,
              velocidad:
                loc.coords.speed !== null && loc.coords.speed >= 0
                  ? loc.coords.speed * 3.6
                  : undefined,
              timestamp: loc.timestamp,
            };
            get().addGPSPoint(punto);
          }
        );
      } catch (err) {
        console.error('[GranaTour] Error iniciando watchPositionAsync:', err);
        set({ error: 'No se pudo iniciar el tracking de ubicación' });
      }
    }
  },

  // ── pauseTracking ──────────────────────────────────────────────────────────
  pauseTracking: () => {
    // El timer sigue corriendo pero comprueba trackingPaused antes de incrementar
    set({ trackingPaused: true });
  },

  // ── resumeTracking ─────────────────────────────────────────────────────────
  resumeTracking: () => {
    set({ trackingPaused: false });
  },

  // ── stopTracking ───────────────────────────────────────────────────────────
  stopTracking: () => {
    // Detener timer
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    // Detener suscripción foreground si existe
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }

    const state = get();
    const endTime = Date.now();
    const durationMinutes = Math.round(state.durationSeconds / 60);
    const averageSpeed = durationMinutes > 0 ? (state.currentDistance / durationMinutes) * 60 : 0;

    // Construir resumen para el modal de confirmación
    const summary: ActivitySummary = {
      distanceKm: state.currentDistance,
      durationMinutes,
      averageSpeed,
      elevationGain: state.elevationGain,
      points: state.gpsPoints,
      startTime: state.startTime ?? endTime,
      endTime,
      excursionId: state.currentExcursionId,
    };

    set({
      trackingActive: false,
      trackingPaused: false,
      pendingSummary: summary,
    });

    // Detener background task de forma asíncrona (no bloquea la UI)
    Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
      .then((isRunning) => {
        if (isRunning) {
          return Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        }
      })
      .catch((err) => {
        if (__DEV__) console.warn('[GranaTour] Error deteniendo background task:', err);
      });
  },

  // ── addGPSPoint ────────────────────────────────────────────────────────────
  addGPSPoint: (point: PuntoGPS) => {
    const state = get();
    if (!state.trackingActive || state.trackingPaused) return;

    const newPoints = [...state.gpsPoints, point];
    let newDistance = state.currentDistance;
    let newElevationGain = state.elevationGain;

    // Calcular distancia incremental y desnivel positivo respecto al punto anterior
    if (newPoints.length >= 2) {
      const prev = newPoints[newPoints.length - 2];

      // Distancia Haversine; ignorar saltos > 200 m (lecturas GPS erróneas)
      const dist = haversineKm(prev.latitud, prev.longitud, point.latitud, point.longitud);
      if (dist < 0.2) {
        newDistance += dist;
      }

      // Desnivel positivo: solo sumar diferencias de altitud positivas (C-01)
      if (point.altitud !== undefined && prev.altitud !== undefined) {
        const altDiff = point.altitud - prev.altitud;
        if (altDiff > 0) {
          newElevationGain += altDiff;
        }
      }
    }

    set({
      gpsPoints: newPoints,
      currentDistance: newDistance,
      elevationGain: newElevationGain,
      currentSpeed: point.velocidad ?? state.currentSpeed,
    });
  },

  // ── saveActivity ───────────────────────────────────────────────────────────
  saveActivity: async (titulo?: string) => {
    const summary = get().pendingSummary;
    if (!summary) {
      set({ error: 'No hay actividad para guardar' });
      return;
    }

    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: 'Debes iniciar sesión para guardar actividades' });
      return;
    }

    // Validar longitud del título en el store (I-04) — la UI también tiene maxLength={80}
    const tituloTrimmed = titulo?.trim() ?? '';
    if (tituloTrimmed.length > 80) {
      set({ error: 'El título no puede superar 80 caracteres' });
      return;
    }

    set({ loadingSave: true, error: null });

    try {
      const rutaGeojson = summary.points.length >= 2 ? pointsToGeoJson(summary.points) : null;
      const tituloFinal =
        tituloTrimmed ||
        `Actividad ${new Date(summary.startTime).toLocaleDateString('es-ES')}`;

      const { error } = await supabase.from('actividades').insert({
        id_usuario: user.id_usuario,
        id_excursion: summary.excursionId ?? null,
        fecha_inicio: new Date(summary.startTime).toISOString(),
        fecha_fin: new Date(summary.endTime).toISOString(),
        distancia_km: Math.round(summary.distanceKm * 100) / 100,
        duracion_minutos: summary.durationMinutes,
        desnivel_positivo: Math.round(summary.elevationGain), // C-01: guardar desnivel
        velocidad_media: Math.round(summary.averageSpeed * 100) / 100,
        ruta_geojson: rutaGeojson,
        titulo: tituloFinal,
        estado: 'completada' as const,
      });

      if (error) {
        console.error('[GranaTour] Error guardando actividad:', error);
        set({ error: 'No se pudo guardar la actividad. Inténtalo de nuevo', loadingSave: false });
        return;
      }

      // Limpiar estado tras guardar con éxito
      set({
        pendingSummary: null,
        gpsPoints: [],
        currentDistance: 0,
        durationSeconds: 0,
        currentSpeed: 0,
        elevationGain: 0,
        startTime: null,
        currentExcursionId: undefined,
        loadingSave: false,
      });

      // Refrescar historial en segundo plano
      get().fetchActivities();
    } catch (err) {
      console.error('[GranaTour] saveActivity catch:', err);
      set({ error: 'Error de conexión al guardar la actividad', loadingSave: false });
    }
  },

  // ── discardActivity ────────────────────────────────────────────────────────
  discardActivity: () => {
    set({
      pendingSummary: null,
      gpsPoints: [],
      currentDistance: 0,
      durationSeconds: 0,
      currentSpeed: 0,
      elevationGain: 0,
      startTime: null,
      currentExcursionId: undefined,
    });
  },

  // ── fetchActivities ────────────────────────────────────────────────────────
  fetchActivities: async () => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: 'Usuario no autenticado', activities: [] });
      return;
    }

    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('actividades')
        .select('*')
        .eq('id_usuario', user.id_usuario)
        .neq('estado', 'descartada') // I-08: no mostrar actividades descartadas
        .order('fecha_inicio', { ascending: false });

      if (error) {
        console.error('[GranaTour] fetchActivities error:', error);
        set({ error: 'No se pudieron cargar las actividades', loading: false });
        return;
      }

      set({ activities: (data ?? []) as Actividad[], loading: false });
    } catch (err) {
      console.error('[GranaTour] fetchActivities catch:', err);
      set({ error: 'Error de conexión al cargar actividades', loading: false });
    }
  },

  // ── getActivityById ────────────────────────────────────────────────────────
  getActivityById: async (id: number) => {
    set({ selectedActivity: null, error: null });

    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: 'Usuario no autenticado' });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('actividades')
        .select('*')
        .eq('id_actividad', id)
        .eq('id_usuario', user.id_usuario)
        .single();

      if (error) {
        set({ error: 'No se encontró la actividad' });
        return null;
      }

      const activity = data as Actividad;
      set({ selectedActivity: activity });
      return activity;
    } catch {
      set({ error: 'Error de conexión' });
      return null;
    }
  },

  // ── clearError ─────────────────────────────────────────────────────────────
  clearError: () => set({ error: null }),
}));
