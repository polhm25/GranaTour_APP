// Hook de geolocalización (implementar en Fase 5 con expo-location)
import { useState } from 'react';
import type { PuntoGPS } from '@/lib/types';

interface UseLocationReturn {
  currentLocation: PuntoGPS | null;
  permissionGranted: boolean;
  loading: boolean;
  error: string | null;
  requestPermission: () => Promise<void>;
  getLocation: () => Promise<PuntoGPS | null>;
}

export function useLocation(): UseLocationReturn {
  const [currentLocation, setCurrentLocation] = useState<PuntoGPS | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermission = async (): Promise<void> => {
    // Implementar en Fase 5 con expo-location
  };

  const getLocation = async (): Promise<PuntoGPS | null> => {
    // Implementar en Fase 5 con expo-location
    return null;
  };

  return {
    currentLocation,
    permissionGranted,
    loading,
    error,
    requestPermission,
    getLocation,
  };
}
