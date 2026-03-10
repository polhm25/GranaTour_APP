// Funciones helper genéricas de la aplicación

import { DificultadExcursion, EstadoReserva } from './types';
import { COLORS } from './constants';

/**
 * Devuelve el color correspondiente a la dificultad de una excursión.
 */
export function getDifficultyColor(dificultad: DificultadExcursion): string {
  return COLORS.difficulty[dificultad];
}

/**
 * Formatea una fecha ISO a formato legible en español.
 * Ejemplo: '2025-06-15' → '15 de junio de 2025'
 * Devuelve '—' si la fecha es inválida (SU-01).
 */
export function formatDate(fechaIso: string): string {
  const fecha = new Date(fechaIso);
  if (isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formatea un precio en euros con dos decimales.
 * Ejemplo: 25 → '25,00 €'
 */
export function formatPrice(precio: number): string {
  return precio.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });
}

/**
 * Devuelve la etiqueta en español del estado de una reserva.
 */
export function getBookingStatusLabel(estado: EstadoReserva): string {
  const etiquetas: Record<EstadoReserva, string> = {
    pendiente: 'Pendiente',
    confirmada: 'Confirmada',
    cancelada: 'Cancelada',
  };
  return etiquetas[estado];
}

/**
 * Formatea la duración en horas a un string legible.
 * Ejemplo: 2.5 → '2h 30min'
 */
export function formatDuration(horas: number): string {
  const horasEnteras = Math.floor(horas);
  const minutos = Math.round((horas - horasEnteras) * 60);
  if (minutos === 0) return `${horasEnteras}h`;
  return `${horasEnteras}h ${minutos}min`;
}

/**
 * Formatea segundos a HH:MM:SS para el timer de tracking.
 * Ejemplo: 3661 → '01:01:01'
 */
export function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Formatea una distancia en km a string legible.
 * Menor a 1 km → metros. Ejemplo: 0.35 → '350 m', 1.5 → '1.50 km'
 */
export function formatDistanceLabel(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(2)} km`;
}

/**
 * Formatea una velocidad en km/h a string legible.
 * Ejemplo: 5.25 → '5.3 km/h'
 */
export function formatSpeedLabel(kmh: number): string {
  return `${kmh.toFixed(1)} km/h`;
}

/**
 * Formatea una fecha ISO a formato corto en español.
 * Ejemplo: '2025-06-15T10:00:00Z' → '15 jun 2025'
 * Devuelve '—' si la fecha es inválida.
 */
export function formatDateShort(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}
