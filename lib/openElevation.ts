// Cliente para Open-Elevation API — datos DEM precisos sin API key
// Documentación: https://open-elevation.com
import type { PuntoGPS } from '@/lib/types';

const ENDPOINT = 'https://api.open-elevation.com/api/v1/lookup';
const MAX_SAMPLES = 60; // límite para mantener la petición liviana

// Reduce el array a un máximo de n elementos distribuidos uniformemente
function sample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const step = (arr.length - 1) / (n - 1);
  return Array.from({ length: n }, (_, i) => arr[Math.round(i * step)]);
}

interface ElevationPoint {
  latitude: number;
  longitude: number;
  elevation: number;
}

export interface ElevationProfile {
  elevations: number[]; // metros sobre el nivel del mar, uno por punto muestreado
  minElevation: number;
  maxElevation: number;
  totalGain: number; // desnivel positivo acumulado (m)
}

export async function fetchElevationProfile(points: PuntoGPS[]): Promise<ElevationProfile> {
  if (points.length < 2) throw new Error('Se necesitan al menos 2 puntos GPS');

  const sampled = sample(points, MAX_SAMPLES);

  const body = {
    locations: sampled.map((p) => ({ latitude: p.latitud, longitude: p.longitud })),
  };

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Open-Elevation: ${res.status}`);

  const data: { results: ElevationPoint[] } = await res.json();
  const elevations = data.results.map((r) => r.elevation);

  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);

  let totalGain = 0;
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) totalGain += diff;
  }

  return { elevations, minElevation, maxElevation, totalGain: Math.round(totalGain) };
}
