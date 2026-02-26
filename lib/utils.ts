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
