// Hook de geolocalización con expo-location (implementado en Fase 5)
import { useCallback, useState } from 'react';
import * as Location from 'expo-location';

import type { PuntoGPS } from '@/lib/types';

interface UseLocationReturn {
  currentLocation: PuntoGPS | null;
  permissionGranted: boolean;
  loading: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  getLocation: () => Promise<PuntoGPS | null>;
}

export function useLocation(): UseLocationReturn {
  const [currentLocation, setCurrentLocation] = useState<PuntoGPS | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Solicita permisos foreground (requerido) y background (opcional para tracking en 2º plano)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        setError('Se necesitan permisos de ubicación para el tracking GPS');
        setPermissionGranted(false);
        return false;
      }

      // Background es opcional: si se deniega, el tracking foreground sigue funcionando
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted' && __DEV__) {
        console.warn('[GranaTour] Permisos de ubicación en background denegados');
      }

      setPermissionGranted(true);
      return true;
    } catch {
      setError('Error al solicitar permisos de ubicación');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtiene la posición actual del dispositivo
  const getLocation = useCallback(async (): Promise<PuntoGPS | null> => {
    setLoading(true);
    setError(null);
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const punto: PuntoGPS = {
        latitud: location.coords.latitude,
        longitud: location.coords.longitude,
        altitud: location.coords.altitude ?? undefined,
        velocidad:
          location.coords.speed !== null && location.coords.speed >= 0
            ? location.coords.speed * 3.6
            : undefined,
        timestamp: location.timestamp,
      };
      setCurrentLocation(punto);
      return punto;
    } catch {
      setError('No se pudo obtener la ubicación actual');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    currentLocation,
    permissionGranted,
    loading,
    error,
    requestPermission,
    getLocation,
  };
}
