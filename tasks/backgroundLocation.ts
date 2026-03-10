// Definición de la tarea de tracking GPS en background con expo-task-manager.
// DEBE importarse en app/_layout.tsx para que la tarea quede registrada al arrancar la app.

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import type { PuntoGPS } from '@/lib/types';

// Nombre único de la tarea: compartido con activityStore para startLocationUpdatesAsync
export const BACKGROUND_LOCATION_TASK = 'background-location-task';

// La tarea se define al nivel del módulo (requisito de expo-task-manager).
// Usamos require() dinámico para el store y evitar dependencia circular en la importación estática.
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[GranaTour] Background GPS error:', error.message);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };

    // Acceso directo al store sin hooks (válido fuera de componentes React)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useActivityStore } = require('@/stores/activityStore') as {
      useActivityStore: { getState: () => { trackingActive: boolean; trackingPaused: boolean; addGPSPoint: (p: PuntoGPS) => void } };
    };
    const state = useActivityStore.getState();

    if (!state.trackingActive || state.trackingPaused) return;

    for (const loc of locations) {
      const punto: PuntoGPS = {
        latitud: loc.coords.latitude,
        longitud: loc.coords.longitude,
        altitud: loc.coords.altitude ?? undefined,
        // expo-location devuelve velocidad en m/s → convertir a km/h
        velocidad:
          loc.coords.speed !== null && loc.coords.speed >= 0
            ? loc.coords.speed * 3.6
            : undefined,
        timestamp: loc.timestamp,
      };
      state.addGPSPoint(punto);
    }
  }
});
