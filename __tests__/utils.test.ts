// Tests para lib/utils.ts — funciones helper de GranaTour
import {
  formatDate,
  formatPrice,
  getBookingStatusLabel,
  formatDuration,
  formatTimer,
  formatDistanceLabel,
  formatSpeedLabel,
  formatDateShort,
  getDifficultyColor,
} from '../lib/utils';

// ─── formatDate ───────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('formatea una fecha ISO válida en español largo', () => {
    const resultado = formatDate('2025-06-15');
    expect(resultado).toMatch(/2025/);
    expect(resultado).toMatch(/junio/i);
    expect(resultado).toMatch(/15/);
  });

  it('devuelve — para cadena vacía', () => {
    expect(formatDate('')).toBe('—');
  });

  it('devuelve — para cadena que no es fecha', () => {
    expect(formatDate('no-es-fecha')).toBe('—');
  });

  it('formatea correctamente una fecha de enero', () => {
    const resultado = formatDate('2025-01-01');
    expect(resultado).toMatch(/enero/i);
    expect(resultado).toMatch(/2025/);
  });

  it('formatea correctamente una fecha de diciembre', () => {
    const resultado = formatDate('2024-12-31');
    expect(resultado).toMatch(/diciembre/i);
    expect(resultado).toMatch(/2024/);
  });
});

// ─── formatPrice ──────────────────────────────────────────────────────────────

describe('formatPrice', () => {
  it('formatea 25 con símbolo de euro', () => {
    const resultado = formatPrice(25);
    expect(resultado).toMatch(/25/);
    expect(resultado).toMatch(/€/);
  });

  it('formatea 0 correctamente', () => {
    const resultado = formatPrice(0);
    expect(resultado).toMatch(/0/);
    expect(resultado).toMatch(/€/);
  });

  it('formatea un precio con decimales', () => {
    const resultado = formatPrice(12.5);
    expect(resultado).toMatch(/€/);
    expect(resultado).toMatch(/12/);
  });

  it('incluye separador de miles para precios grandes', () => {
    const resultado = formatPrice(1000);
    expect(resultado).toMatch(/€/);
  });
});

// ─── getBookingStatusLabel ────────────────────────────────────────────────────

describe('getBookingStatusLabel', () => {
  it('devuelve Pendiente para pendiente', () => {
    expect(getBookingStatusLabel('pendiente')).toBe('Pendiente');
  });

  it('devuelve Confirmada para confirmada', () => {
    expect(getBookingStatusLabel('confirmada')).toBe('Confirmada');
  });

  it('devuelve Cancelada para cancelada', () => {
    expect(getBookingStatusLabel('cancelada')).toBe('Cancelada');
  });

  it('cada estado tiene una etiqueta distinta', () => {
    const etiquetas = new Set([
      getBookingStatusLabel('pendiente'),
      getBookingStatusLabel('confirmada'),
      getBookingStatusLabel('cancelada'),
    ]);
    expect(etiquetas.size).toBe(3);
  });
});

// ─── formatDuration ───────────────────────────────────────────────────────────

describe('formatDuration', () => {
  it('formatea 2.5 horas como 2h 30min', () => {
    expect(formatDuration(2.5)).toBe('2h 30min');
  });

  it('formatea horas exactas sin mostrar minutos', () => {
    expect(formatDuration(3)).toBe('3h');
  });

  it('formatea 0 horas', () => {
    expect(formatDuration(0)).toBe('0h');
  });

  it('formatea 1.25 horas como 1h 15min', () => {
    expect(formatDuration(1.25)).toBe('1h 15min');
  });

  it('formatea 0.5 horas como 0h 30min', () => {
    expect(formatDuration(0.5)).toBe('0h 30min');
  });

  it('formatea 1 hora exacta como 1h', () => {
    expect(formatDuration(1)).toBe('1h');
  });
});

// ─── formatTimer ──────────────────────────────────────────────────────────────

describe('formatTimer', () => {
  it('formatea 3661 segundos como 01:01:01', () => {
    expect(formatTimer(3661)).toBe('01:01:01');
  });

  it('formatea 0 segundos como 00:00:00', () => {
    expect(formatTimer(0)).toBe('00:00:00');
  });

  it('formatea 3600 segundos como 01:00:00', () => {
    expect(formatTimer(3600)).toBe('01:00:00');
  });

  it('formatea 59 segundos como 00:00:59', () => {
    expect(formatTimer(59)).toBe('00:00:59');
  });

  it('formatea 90 segundos como 00:01:30', () => {
    expect(formatTimer(90)).toBe('00:01:30');
  });

  it('formatea valores con padding correcto', () => {
    expect(formatTimer(36000)).toBe('10:00:00');
  });

  it('formatea 61 segundos como 00:01:01', () => {
    expect(formatTimer(61)).toBe('00:01:01');
  });
});

// ─── formatDistanceLabel ─────────────────────────────────────────────────────

describe('formatDistanceLabel', () => {
  it('formatea 0.35 km como 350 m', () => {
    expect(formatDistanceLabel(0.35)).toBe('350 m');
  });

  it('formatea 1.5 km con dos decimales', () => {
    expect(formatDistanceLabel(1.5)).toBe('1.50 km');
  });

  it('formatea exactamente 1 km como km', () => {
    expect(formatDistanceLabel(1)).toBe('1.00 km');
  });

  it('formatea 0 km como 0 m', () => {
    expect(formatDistanceLabel(0)).toBe('0 m');
  });

  it('formatea 0.999 km como metros (justo por debajo del umbral)', () => {
    expect(formatDistanceLabel(0.999)).toBe('999 m');
  });

  it('formatea 10.5 km correctamente', () => {
    expect(formatDistanceLabel(10.5)).toBe('10.50 km');
  });
});

// ─── formatSpeedLabel ────────────────────────────────────────────────────────

describe('formatSpeedLabel', () => {
  it('formatea 5.25 km/h con un decimal', () => {
    expect(formatSpeedLabel(5.25)).toBe('5.3 km/h');
  });

  it('formatea 0 km/h', () => {
    expect(formatSpeedLabel(0)).toBe('0.0 km/h');
  });

  it('formatea velocidades exactas', () => {
    expect(formatSpeedLabel(10)).toBe('10.0 km/h');
  });

  it('redondea correctamente a 1 decimal', () => {
    expect(formatSpeedLabel(3.456)).toBe('3.5 km/h');
  });

  it('incluye la unidad km/h', () => {
    expect(formatSpeedLabel(5)).toMatch(/km\/h/);
  });
});

// ─── formatDateShort ─────────────────────────────────────────────────────────

describe('formatDateShort', () => {
  it('formatea una fecha ISO completa en formato corto', () => {
    const resultado = formatDateShort('2025-06-15T10:00:00Z');
    expect(resultado).toMatch(/2025/);
    expect(resultado).toMatch(/jun/i);
    expect(resultado).toMatch(/15/);
  });

  it('devuelve — para cadena vacía', () => {
    expect(formatDateShort('')).toBe('—');
  });

  it('devuelve — para cadena inválida', () => {
    expect(formatDateShort('no-es-fecha')).toBe('—');
  });

  it('formatea enero con mes abreviado', () => {
    const resultado = formatDateShort('2025-01-20T08:00:00Z');
    expect(resultado).toMatch(/ene/i);
    expect(resultado).toMatch(/2025/);
  });
});

// ─── getDifficultyColor ───────────────────────────────────────────────────────

describe('getDifficultyColor', () => {
  it('devuelve el color correcto para facil', () => {
    expect(getDifficultyColor('facil')).toBe('#10B981');
  });

  it('devuelve el color correcto para moderada', () => {
    expect(getDifficultyColor('moderada')).toBe('#F59E0B');
  });

  it('devuelve el color correcto para dificil', () => {
    expect(getDifficultyColor('dificil')).toBe('#F97316');
  });

  it('devuelve el color correcto para muy_dificil', () => {
    expect(getDifficultyColor('muy_dificil')).toBe('#EF4444');
  });

  it('cada nivel de dificultad tiene un color diferente', () => {
    const colores = new Set([
      getDifficultyColor('facil'),
      getDifficultyColor('moderada'),
      getDifficultyColor('dificil'),
      getDifficultyColor('muy_dificil'),
    ]);
    expect(colores.size).toBe(4);
  });
});
