// Tipos TypeScript que mapean exactamente las tablas de la base de datos GranaTour.
// Este archivo es la fuente de verdad para los tipos de datos de la app móvil.
// Basado en SCHEMA.md.

// ─── Enums compartidos ────────────────────────────────────────────────────────

export type RolUsuario = 'cliente' | 'guia' | 'admin';
export type EstadoReserva = 'pendiente' | 'confirmada' | 'cancelada';
export type DificultadExcursion = 'facil' | 'moderada' | 'dificil' | 'muy_dificil';
export type EstadoActividad = 'en_curso' | 'completada' | 'descartada';
export type PlataformaPush = 'ios' | 'android';

// ─── Tabla: USUARIOS ──────────────────────────────────────────────────────────

export interface Usuario {
  id_usuario: number;
  supabase_auth_id: string | null;
  nombre: string;
  ap1: string;
  ap2: string | null;
  dni: string;
  email: string;
  telefono: string | null;
  rol: RolUsuario;
  password: string | null; // Legacy desktop, no usar en móvil
  avatar_url: string | null;
  bio: string | null;
  valoracion: number | null;
  num_turnos: number;
  total_km: number;
  total_excursiones: number;
  fecha_registro: string; // ISO string
  ultimo_acceso: string | null; // ISO string
}

// ─── Tabla: EXCURSIONES ───────────────────────────────────────────────────────

export interface Excursion {
  id_excursion: number;
  nombre_ruta: string;
  zona: string;
  descripcion: string | null;
  duracion_horas: number;
  distancia_km: number | null;
  desnivel_positivo: number | null;
  dificultad: DificultadExcursion | null;
  precio_persona: number;
  fecha_inicio: string; // 'YYYY-MM-DD'
  plazas_disponibles: number;
  id_guia: number | null;
  latitud: number | null;
  longitud: number | null;
  ruta_geojson: string | null; // GeoJSON LineString serializado
  imagen: null; // Campo legacy, no usar en móvil
  imagen_url: string | null;
  activa: boolean;
}

// ─── Tabla: RESERVAS ──────────────────────────────────────────────────────────

export interface Reserva {
  id_reserva: number;
  id_usuario: number;
  id_excursion: number;
  fecha_reserva: string; // ISO string
  num_personas: number;
  estado: EstadoReserva;
  precio_total: number;
  notas: string | null;
}

// ─── Tabla: ACTIVIDADES ───────────────────────────────────────────────────────

export interface Actividad {
  id_actividad: number;
  id_usuario: number;
  id_excursion: number | null; // Null = tracking libre, sin excursión
  fecha_inicio: string; // ISO string
  fecha_fin: string | null; // Null = en curso
  distancia_km: number | null;
  duracion_minutos: number | null;
  desnivel_positivo: number | null;
  velocidad_media: number | null; // km/h
  ruta_geojson: string | null; // Array de puntos GPS serializado
  titulo: string | null;
  estado: EstadoActividad;
}

// ─── Tabla: FOTOS ─────────────────────────────────────────────────────────────

export interface Foto {
  id_foto: number;
  id_usuario: number;
  id_actividad: number | null;
  id_excursion: number | null;
  url_storage: string;
  latitud: number | null;
  longitud: number | null;
  descripcion: string | null;
  fecha: string; // ISO string
}

// ─── Tabla: REVIEWS ───────────────────────────────────────────────────────────

export interface Review {
  id_review: number;
  id_usuario: number;
  id_excursion: number;
  puntuacion: number; // CHECK 1-5
  comentario: string | null;
  fecha: string; // ISO string
}

// ─── Tabla: PUSH_TOKENS ───────────────────────────────────────────────────────

export interface PushToken {
  id: number;
  id_usuario: number;
  token: string;
  plataforma: PlataformaPush;
  activo: boolean;
  fecha_registro: string; // ISO string
}

// ─── Tipos para relaciones expandidas (JOINs) ─────────────────────────────────

export interface ExcursionConGuia extends Excursion {
  guia?: Pick<Usuario, 'id_usuario' | 'nombre' | 'ap1' | 'avatar_url' | 'valoracion'>;
}

export interface ReservaConDetalles extends Reserva {
  excursion?: Pick<
    Excursion,
    'id_excursion' | 'nombre_ruta' | 'zona' | 'fecha_inicio' | 'imagen_url'
  >;
  usuario?: Pick<Usuario, 'id_usuario' | 'nombre' | 'ap1'>;
}

export interface ReviewConUsuario extends Review {
  usuario?: Pick<Usuario, 'id_usuario' | 'nombre' | 'ap1' | 'avatar_url'>;
}

// ─── Tipo para punto GPS durante tracking ─────────────────────────────────────

export interface PuntoGPS {
  latitud: number;
  longitud: number;
  altitud?: number;
  velocidad?: number;
  timestamp: number; // Unix timestamp en ms
}
