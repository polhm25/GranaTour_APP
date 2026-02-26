# SCHEMA.md - Referencia de Base de Datos GranaTour

## Tablas y sus campos

Este documento es la fuente de verdad para generar los tipos TypeScript en `lib/types.ts`.
Cada tabla aquí corresponde a una interface en TypeScript.

---

### USUARIOS → `Usuario`

| Campo | Tipo PostgreSQL | Tipo TypeScript | Nullable | Notas |
|-------|----------------|-----------------|----------|-------|
| id_usuario | SERIAL PK | number | No | Auto-generado |
| supabase_auth_id | UUID UNIQUE | string | Sí | Vínculo con Supabase Auth |
| nombre | VARCHAR(50) | string | No | |
| ap1 | VARCHAR(50) | string | No | Primer apellido |
| ap2 | VARCHAR(50) | string | Sí | Segundo apellido |
| dni | VARCHAR(9) UNIQUE | string | No | |
| email | VARCHAR(100) UNIQUE | string | No | |
| telefono | VARCHAR(15) | string | Sí | |
| rol | ENUM | 'cliente' \| 'guia' \| 'admin' | No | Default: 'cliente' |
| password | VARCHAR(255) | string | Sí | Legacy desktop |
| avatar_url | TEXT | string | Sí | URL en Storage |
| bio | TEXT | string | Sí | |
| valoracion | DECIMAL(3,2) | number | Sí | |
| num_turnos | INT | number | No | Default: 0 |
| total_km | DECIMAL(8,2) | number | No | Default: 0 |
| total_excursiones | INT | number | No | Default: 0 |
| fecha_registro | TIMESTAMPTZ | string | No | ISO string |
| ultimo_acceso | TIMESTAMPTZ | string | Sí | ISO string |

---

### EXCURSIONES → `Excursion`

| Campo | Tipo PostgreSQL | Tipo TypeScript | Nullable | Notas |
|-------|----------------|-----------------|----------|-------|
| id_excursion | SERIAL PK | number | No | Auto-generado |
| nombre_ruta | VARCHAR(100) | string | No | |
| zona | VARCHAR(100) | string | No | |
| descripcion | TEXT | string | Sí | |
| duracion_horas | DECIMAL(4,2) | number | No | CHECK > 0 |
| distancia_km | DECIMAL(6,2) | number | Sí | |
| desnivel_positivo | INT | number | Sí | Metros |
| dificultad | ENUM | 'facil' \| 'moderada' \| 'dificil' \| 'muy_dificil' | Sí | Default: 'moderada' |
| precio_persona | DECIMAL(6,2) | number | No | CHECK >= 0 |
| fecha_inicio | DATE | string | No | 'YYYY-MM-DD' |
| plazas_disponibles | INT | number | No | CHECK >= 0 |
| id_guia | INT FK→usuarios | number | Sí | ON DELETE SET NULL |
| latitud | DECIMAL(10,8) | number | Sí | |
| longitud | DECIMAL(11,8) | number | Sí | |
| ruta_geojson | TEXT | string | Sí | GeoJSON LineString |
| imagen | BYTEA | null | Sí | Legacy, no usar en móvil |
| imagen_url | TEXT | string | Sí | URL en Storage |
| activa | BOOLEAN | boolean | No | Default: true |

---

### RESERVAS → `Reserva`

| Campo | Tipo PostgreSQL | Tipo TypeScript | Nullable | Notas |
|-------|----------------|-----------------|----------|-------|
| id_reserva | SERIAL PK | number | No | |
| id_usuario | INT FK→usuarios | number | No | ON DELETE CASCADE |
| id_excursion | INT FK→excursiones | number | No | ON DELETE CASCADE |
| fecha_reserva | TIMESTAMPTZ | string | No | ISO string |
| num_personas | INT | number | No | CHECK > 0, Default: 1 |
| estado | ENUM | 'pendiente' \| 'confirmada' \| 'cancelada' | No | Default: 'pendiente' |
| precio_total | DECIMAL(8,2) | number | No | CHECK >= 0 |
| notas | TEXT | string | Sí | |

---

### ACTIVIDADES → `Actividad`

| Campo | Tipo PostgreSQL | Tipo TypeScript | Nullable | Notas |
|-------|----------------|-----------------|----------|-------|
| id_actividad | SERIAL PK | number | No | |
| id_usuario | INT FK→usuarios | number | No | |
| id_excursion | INT FK→excursiones | number | Sí | Nullable = tracking libre |
| fecha_inicio | TIMESTAMPTZ | string | No | |
| fecha_fin | TIMESTAMPTZ | string | Sí | NULL = en curso |
| distancia_km | DECIMAL(6,2) | number | Sí | |
| duracion_minutos | INT | number | Sí | |
| desnivel_positivo | INT | number | Sí | |
| velocidad_media | DECIMAL(4,2) | number | Sí | km/h |
| ruta_geojson | TEXT | string | Sí | Array de puntos GPS |
| titulo | TEXT | string | Sí | |
| estado | ENUM | 'en_curso' \| 'completada' \| 'descartada' | No | Default: 'en_curso' |

---

### FOTOS → `Foto`

| Campo | Tipo PostgreSQL | Tipo TypeScript | Nullable | Notas |
|-------|----------------|-----------------|----------|-------|
| id_foto | SERIAL PK | number | No | |
| id_usuario | INT FK→usuarios | number | No | |
| id_actividad | INT FK→actividades | number | Sí | |
| id_excursion | INT FK→excursiones | number | Sí | |
| url_storage | TEXT | string | No | URL en Supabase Storage |
| latitud | DECIMAL(10,8) | number | Sí | |
| longitud | DECIMAL(11,8) | number | Sí | |
| descripcion | TEXT | string | Sí | |
| fecha | TIMESTAMPTZ | string | No | |

---

### REVIEWS → `Review`

| Campo | Tipo PostgreSQL | Tipo TypeScript | Nullable | Notas |
|-------|----------------|-----------------|----------|-------|
| id_review | SERIAL PK | number | No | |
| id_usuario | INT FK→usuarios | number | No | |
| id_excursion | INT FK→excursiones | number | No | |
| puntuacion | INT | number | No | CHECK 1-5 |
| comentario | TEXT | string | Sí | |
| fecha | TIMESTAMPTZ | string | No | |

Constraint: UNIQUE(id_usuario, id_excursion)

---

### PUSH_TOKENS → `PushToken`

| Campo | Tipo PostgreSQL | Tipo TypeScript | Nullable | Notas |
|-------|----------------|-----------------|----------|-------|
| id | SERIAL PK | number | No | |
| id_usuario | INT FK→usuarios | number | No | |
| token | TEXT UNIQUE | string | No | Expo push token |
| plataforma | ENUM | 'ios' \| 'android' | No | |
| activo | BOOLEAN | boolean | No | Default: true |
| fecha_registro | TIMESTAMPTZ | string | No | |

---

## Tipos auxiliares para TypeScript

```typescript
// Enums compartidos
type RolUsuario = 'cliente' | 'guia' | 'admin';
type EstadoReserva = 'pendiente' | 'confirmada' | 'cancelada';
type DificultadExcursion = 'facil' | 'moderada' | 'dificil' | 'muy_dificil';
type EstadoActividad = 'en_curso' | 'completada' | 'descartada';
type PlataformaPush = 'ios' | 'android';

// Tipos para relaciones expandidas (cuando haces JOINs)
interface ExcursionConGuia extends Excursion {
  guia?: Pick<Usuario, 'id_usuario' | 'nombre' | 'ap1' | 'avatar_url' | 'valoracion'>;
}

interface ReservaConDetalles extends Reserva {
  excursion?: Pick<Excursion, 'id_excursion' | 'nombre_ruta' | 'zona' | 'fecha_inicio' | 'imagen_url'>;
  usuario?: Pick<Usuario, 'id_usuario' | 'nombre' | 'ap1'>;
}

interface ReviewConUsuario extends Review {
  usuario?: Pick<Usuario, 'id_usuario' | 'nombre' | 'ap1' | 'avatar_url'>;
}

// Tipo para punto GPS durante tracking
interface PuntoGPS {
  latitud: number;
  longitud: number;
  altitud?: number;
  velocidad?: number;
  timestamp: number; // Unix timestamp en ms
}
```

## Supabase Storage Buckets

| Bucket | Público | Uso |
|--------|---------|-----|
| avatars | Sí | Fotos de perfil. Estructura: `{auth_uid}/avatar.jpg` |
| excursion-photos | Sí | Fotos oficiales de excursiones |
| activity-photos | Sí | Fotos geolocalizadas subidas por usuarios |
