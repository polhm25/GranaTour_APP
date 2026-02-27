-- ============================================================
-- GRANATOUR - ESQUEMA COMPLETO PARA SUPABASE (PostgreSQL)
-- Fecha: 25/02/2026
-- Descripción: Schema unificado para app móvil + desktop
-- ============================================================

-- ============================================================
-- PASO 1: TIPOS ENUMERADOS
-- ============================================================

CREATE TYPE rol_usuario AS ENUM ('cliente', 'guia', 'admin');
CREATE TYPE estado_reserva AS ENUM ('pendiente', 'confirmada', 'cancelada');
CREATE TYPE dificultad_excursion AS ENUM ('facil', 'moderada', 'dificil', 'muy_dificil');
CREATE TYPE estado_actividad AS ENUM ('en_curso', 'completada', 'descartada');
CREATE TYPE plataforma_push AS ENUM ('ios', 'android');


-- ============================================================
-- PASO 2: TABLA USUARIOS
-- ============================================================

CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,

    -- Vínculo con Supabase Auth
    supabase_auth_id UUID UNIQUE,

    -- Datos personales
    nombre VARCHAR(50) NOT NULL,
    ap1 VARCHAR(50) NOT NULL,
    ap2 VARCHAR(50),
    dni VARCHAR(9) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    telefono VARCHAR(15),

    -- Rol y autenticación
    rol rol_usuario NOT NULL DEFAULT 'cliente',
    password VARCHAR(255), -- Legacy para desktop

    -- Perfil extendido
    avatar_url TEXT,
    bio TEXT,

    -- Estadísticas
    valoracion DECIMAL(3,2) DEFAULT NULL,
    num_turnos INT DEFAULT 0,
    total_km DECIMAL(8,2) DEFAULT 0,
    total_excursiones INT DEFAULT 0,

    -- Timestamps
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ultimo_acceso TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_dni ON usuarios(dni);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_usuarios_auth_id ON usuarios(supabase_auth_id);


-- ============================================================
-- PASO 3: TABLA EXCURSIONES
-- ============================================================

CREATE TABLE excursiones (
    id_excursion SERIAL PRIMARY KEY,

    -- Datos básicos
    nombre_ruta VARCHAR(100) NOT NULL,
    zona VARCHAR(100) NOT NULL,
    descripcion TEXT,

    -- Parámetros de la ruta
    duracion_horas DECIMAL(4,2) NOT NULL CHECK (duracion_horas > 0),
    distancia_km DECIMAL(6,2),
    desnivel_positivo INT,
    dificultad dificultad_excursion DEFAULT 'moderada',

    -- Comercial
    precio_persona DECIMAL(6,2) NOT NULL CHECK (precio_persona >= 0),
    fecha_inicio DATE NOT NULL,
    plazas_disponibles INT NOT NULL DEFAULT 0 CHECK (plazas_disponibles >= 0),

    -- Guía asignado
    id_guia INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL ON UPDATE CASCADE,

    -- Geolocalización
    latitud DECIMAL(10,8),
    longitud DECIMAL(11,8),
    ruta_geojson TEXT,

    -- Imágenes
    imagen BYTEA,       -- Legacy para desktop
    imagen_url TEXT,     -- URL en Supabase Storage (preferido)

    -- Estado
    activa BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_excursiones_zona ON excursiones(zona);
CREATE INDEX idx_excursiones_fecha ON excursiones(fecha_inicio);
CREATE INDEX idx_excursiones_guia ON excursiones(id_guia);
CREATE INDEX idx_excursiones_dificultad ON excursiones(dificultad);
CREATE INDEX idx_excursiones_activa ON excursiones(activa);


-- ============================================================
-- PASO 4: TABLA RESERVAS
-- ============================================================

CREATE TABLE reservas (
    id_reserva SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
    id_excursion INT NOT NULL REFERENCES excursiones(id_excursion) ON DELETE CASCADE ON UPDATE CASCADE,
    fecha_reserva TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    num_personas INT NOT NULL DEFAULT 1 CHECK (num_personas > 0),
    estado estado_reserva NOT NULL DEFAULT 'pendiente',
    precio_total DECIMAL(8,2) NOT NULL CHECK (precio_total >= 0),
    notas TEXT
);

CREATE INDEX idx_reservas_usuario ON reservas(id_usuario);
CREATE INDEX idx_reservas_excursion ON reservas(id_excursion);
CREATE INDEX idx_reservas_estado ON reservas(estado);
CREATE INDEX idx_reservas_fecha ON reservas(fecha_reserva);


-- ============================================================
-- PASO 5: TABLA ACTIVIDADES (tracking GPS)
-- ============================================================

CREATE TABLE actividades (
    id_actividad SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_excursion INT REFERENCES excursiones(id_excursion) ON DELETE SET NULL,
    fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    fecha_fin TIMESTAMP WITH TIME ZONE,
    distancia_km DECIMAL(6,2),
    duracion_minutos INT,
    desnivel_positivo INT,
    velocidad_media DECIMAL(4,2),
    ruta_geojson TEXT,
    titulo TEXT,
    estado estado_actividad NOT NULL DEFAULT 'en_curso'
);

CREATE INDEX idx_actividades_usuario ON actividades(id_usuario);
CREATE INDEX idx_actividades_excursion ON actividades(id_excursion);
CREATE INDEX idx_actividades_estado ON actividades(estado);
CREATE INDEX idx_actividades_fecha ON actividades(fecha_inicio);


-- ============================================================
-- PASO 6: TABLA FOTOS (geolocalizadas)
-- ============================================================

CREATE TABLE fotos (
    id_foto SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_actividad INT REFERENCES actividades(id_actividad) ON DELETE SET NULL,
    id_excursion INT REFERENCES excursiones(id_excursion) ON DELETE SET NULL,
    url_storage TEXT NOT NULL,
    latitud DECIMAL(10,8),
    longitud DECIMAL(11,8),
    descripcion TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_fotos_usuario ON fotos(id_usuario);
CREATE INDEX idx_fotos_actividad ON fotos(id_actividad);
CREATE INDEX idx_fotos_excursion ON fotos(id_excursion);


-- ============================================================
-- PASO 7: TABLA REVIEWS (valoraciones)
-- ============================================================

CREATE TABLE reviews (
    id_review SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_excursion INT NOT NULL REFERENCES excursiones(id_excursion) ON DELETE CASCADE,
    puntuacion INT NOT NULL CHECK (puntuacion >= 1 AND puntuacion <= 5),
    comentario TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(id_usuario, id_excursion)
);

CREATE INDEX idx_reviews_usuario ON reviews(id_usuario);
CREATE INDEX idx_reviews_excursion ON reviews(id_excursion);
CREATE INDEX idx_reviews_puntuacion ON reviews(puntuacion);


-- ============================================================
-- PASO 8: TABLA PUSH_TOKENS (notificaciones)
-- ============================================================

CREATE TABLE push_tokens (
    id SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    plataforma plataforma_push NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_push_tokens_usuario ON push_tokens(id_usuario);
CREATE INDEX idx_push_tokens_activo ON push_tokens(activo);


-- ============================================================
-- PASO 9: DATOS DE PRUEBA
-- ============================================================

INSERT INTO usuarios (nombre, ap1, ap2, dni, email, telefono, rol, password, valoracion, num_turnos) VALUES
('Juan',   'García',    'López',     '12345678A', 'juan.garcia@email.com',    '600111222', 'guia',    'password123', 4.50, 15),
('María',  'Rodríguez', 'Martínez',  '23456789B', 'maria.rodriguez@email.com','600333444', 'cliente', 'password123', 4.80,  8),
('Carlos', 'López',     'Fernández', '34567890C', 'carlos.lopez@email.com',   '600555666', 'cliente', 'password123', 4.20,  5),
('Ana',    'Martínez',  'García',    '45678901D', 'ana.martinez@email.com',   '600777888', 'guia',    'password123', 4.90, 22),
('Pedro',  'Jiménez',   'Ruiz',      '56789012E', 'pedro.jimenez@email.com',  '600999000', 'admin',   'password123', 3.90,  3);

INSERT INTO excursiones (nombre_ruta, zona, duracion_horas, distancia_km, desnivel_positivo, dificultad, precio_persona, fecha_inicio, plazas_disponibles, id_guia, latitud, longitud, descripcion) VALUES
('Ruta de los Picos',            'Sierra Nevada',  6.50, 18.5, 950,  'dificil',      45.00, '2025-12-01', 15, 1, 37.0544, -3.3696, 'Una emocionante ruta por los picos más altos de Sierra Nevada con vistas panorámicas al Mediterráneo'),
('Senderismo en las Alpujarras', 'Las Alpujarras', 4.00, 12.0, 400,  'moderada',     30.00, '2025-12-05', 20, 4, 36.9607, -3.3579, 'Recorre los pueblos blancos de Las Alpujarras con vistas espectaculares al valle del Poqueira'),
('Trekking por el Mulhacén',     'Sierra Nevada',  8.00, 22.0, 1300, 'muy_dificil',  55.00, '2025-12-10', 10, 1, 37.0533, -3.3110, 'Ascensión al pico más alto de la Península Ibérica a 3.479 metros de altitud'),
('Paseo por la Costa Tropical',  'Costa Tropical', 3.50,  8.5, 150,  'facil',        25.00, '2025-11-30', 25, 4, 36.7260, -3.7753, 'Relajante paseo por las playas y calas de la costa tropical granadina');

INSERT INTO reservas (id_usuario, id_excursion, num_personas, estado, precio_total) VALUES
(2, 1, 2, 'confirmada', 90.00),
(3, 2, 1, 'pendiente',  30.00),
(3, 3, 3, 'confirmada', 165.00),
(2, 4, 2, 'confirmada', 50.00);

INSERT INTO reviews (id_usuario, id_excursion, puntuacion, comentario) VALUES
(2, 1, 5, 'Increíble experiencia. Juan es un guía excepcional, conoce cada rincón de Sierra Nevada.'),
(2, 4, 4, 'Muy bonito paseo, perfecto para ir con niños. La playa al final es espectacular.'),
(3, 2, 5, 'Las Alpujarras son mágicas. Ana nos explicó toda la historia de los pueblos.');


-- ============================================================
-- PASO 10: ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE excursiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE actividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- USUARIOS
CREATE POLICY "Perfiles visibles para autenticados"
ON usuarios FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios editan su propio perfil"
ON usuarios FOR UPDATE TO authenticated
USING (supabase_auth_id = auth.uid())
WITH CHECK (supabase_auth_id = auth.uid());

CREATE POLICY "Trigger puede registrar usuarios"
  ON usuarios FOR INSERT
  WITH CHECK (true);

-- EXCURSIONES
CREATE POLICY "Excursiones activas son públicas"
ON excursiones FOR SELECT USING (activa = true);

CREATE POLICY "Admins gestionan excursiones"
ON excursiones FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM usuarios WHERE supabase_auth_id = auth.uid() AND rol = 'admin')
);

CREATE POLICY "Guías ven sus excursiones asignadas"
ON excursiones FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM usuarios
        WHERE supabase_auth_id = auth.uid() AND rol = 'guia' AND id_usuario = excursiones.id_guia
    )
);

-- RESERVAS
CREATE POLICY "Usuarios ven sus reservas"
ON reservas FOR SELECT TO authenticated
USING (id_usuario = (SELECT id_usuario FROM usuarios WHERE supabase_auth_id = auth.uid()));

CREATE POLICY "Usuarios crean reservas"
ON reservas FOR INSERT TO authenticated
WITH CHECK (id_usuario = (SELECT id_usuario FROM usuarios WHERE supabase_auth_id = auth.uid()));

CREATE POLICY "Usuarios actualizan sus reservas"
ON reservas FOR UPDATE TO authenticated
USING (id_usuario = (SELECT id_usuario FROM usuarios WHERE supabase_auth_id = auth.uid()));

CREATE POLICY "Guías ven reservas de sus excursiones"
ON reservas FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM excursiones e JOIN usuarios u ON u.id_usuario = e.id_guia
        WHERE e.id_excursion = reservas.id_excursion AND u.supabase_auth_id = auth.uid()
    )
);

CREATE POLICY "Guías gestionan reservas de sus excursiones"
ON reservas FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM excursiones e JOIN usuarios u ON u.id_usuario = e.id_guia
        WHERE e.id_excursion = reservas.id_excursion AND u.supabase_auth_id = auth.uid()
    )
);

CREATE POLICY "Admins gestionan todas las reservas"
ON reservas FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM usuarios WHERE supabase_auth_id = auth.uid() AND rol = 'admin'));

-- ACTIVIDADES
CREATE POLICY "Usuarios ven sus actividades"
ON actividades FOR SELECT TO authenticated
USING (id_usuario = (SELECT id_usuario FROM usuarios WHERE supabase_auth_id = auth.uid()));

CREATE POLICY "Usuarios crean actividades"
ON actividades FOR INSERT TO authenticated
WITH CHECK (id_usuario = (SELECT id_usuario FROM usuarios WHERE supabase_auth_id = auth.uid()));

CREATE POLICY "Usuarios editan sus actividades"
ON actividades FOR UPDATE TO authenticated
USING (id_usuario = (SELECT id_usuario FROM usuarios WHERE supabase_auth_id = auth.uid()));

-- FOTOS
CREATE POLICY "Fotos visibles para autenticados"
ON fotos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios suben fotos"
ON fotos FOR INSERT TO authenticated
WITH CHECK (id_usuario = (SELECT id_usuario FROM usuarios WHERE supabase_auth_id = auth.uid()));

CREATE POLICY "Usuarios borran sus fotos"
ON fotos FOR DELETE TO authenticated
USING (id_usuario = (SELECT id_usuario FROM usuarios WHERE supabase_auth_id = auth.uid()));

-- REVIEWS
CREATE POLICY "Reviews visibles para autenticados"
ON reviews FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios crean reviews"
ON reviews FOR INSERT TO authenticated
WITH CHECK (id_usuario = (SELECT id_usuario FROM usuarios WHERE supabase_auth_id = auth.uid()));

CREATE POLICY "Usuarios editan sus reviews"
ON reviews FOR UPDATE TO authenticated
USING (id_usuario = (SELECT id_usuario FROM usuarios WHERE supabase_auth_id = auth.uid()));

CREATE POLICY "Usuarios borran sus reviews"
ON reviews FOR DELETE TO authenticated
USING (id_usuario = (SELECT id_usuario FROM usuarios WHERE supabase_auth_id = auth.uid()));

-- PUSH_TOKENS
CREATE POLICY "Usuarios gestionan sus push tokens"
ON push_tokens FOR ALL TO authenticated
USING (id_usuario = (SELECT id_usuario FROM usuarios WHERE supabase_auth_id = auth.uid()));


-- ============================================================
-- PASO 11: STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('excursion-photos', 'excursion-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('activity-photos', 'activity-photos', true);

-- Storage policies: avatars
CREATE POLICY "Avatars públicos" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Usuarios suben su avatar" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Usuarios actualizan su avatar" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies: excursion-photos
CREATE POLICY "Fotos excursiones públicas" ON storage.objects FOR SELECT USING (bucket_id = 'excursion-photos');
CREATE POLICY "Autenticados suben fotos excursiones" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'excursion-photos');

-- Storage policies: activity-photos
CREATE POLICY "Fotos actividades públicas" ON storage.objects FOR SELECT USING (bucket_id = 'activity-photos');
CREATE POLICY "Autenticados suben fotos actividades" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'activity-photos');


-- ============================================================
-- PASO 12: TRIGGER - Auto-crear perfil al registrarse
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.usuarios (
        supabase_auth_id,
        nombre,
        email,
        ap1,
        dni,
        rol
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nombre', 'Sin nombre'),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'ap1', ''),
        COALESCE(NEW.raw_user_meta_data->>'dni', ''),
        COALESCE((NEW.raw_user_meta_data->>'rol')::rol_usuario, 'cliente')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();