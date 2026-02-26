# ROADMAP.md - Plan de Desarrollo GranaTour Móvil

## Información del proyecto
- **Deadline:** 20-21 mayo 2026
- **Semanas disponibles:** ~12 semanas (desde 25 feb)
- **Plataformas:** Android (primario) + iOS
- **Stack:** Expo + TypeScript + Supabase + Zustand + NativeWind

---

## Fases de desarrollo

### FASE 0: Setup inicial ← EMPEZAR AQUÍ
**Duración:** 2-3 días

- Crear proyecto Expo (HECHO)
- Estructura de carpetas según ARCHITECTURE.md
- Configurar Supabase client (lib/supabase.ts)
- Types TypeScript (lib/types.ts) según SCHEMA.md
- Zustand stores estructura base (sin lógica)
- Layouts de Expo Router (root, auth, tabs)
- Pantallas placeholder
- Tema y colores (lib/constants.ts)
- .env.example

**Criterio de éxito:** `npx expo start` funciona, navegación entre placeholders OK.

---

### FASE 1: Autenticación (Semana 2)
**Objetivo:** Login, registro, recuperación de contraseña

- Pantalla login con email/password
- Pantalla registro: nombre, ap1, ap2, dni, email, telefono, password
- Registro usa Supabase Auth + metadata para el trigger `handle_new_user`
- Recuperar contraseña vía Supabase email
- Session listener en root layout → redirect según auth state
- Persistencia de sesión (AsyncStorage)
- Protección de rutas (middleware de auth)
- authStore completo: session, user, signIn, signUp, signOut, resetPassword

**Criterio de éxito:** Crear cuenta, login, cerrar sesión, reabrir app y seguir logueado.

---

### FASE 2: Explorar excursiones (Semana 3)
**Objetivo:** Catálogo de excursiones con filtros y detalle

- excursionsStore: fetchExcursiones, filtros, búsqueda
- Pantalla Explorar: lista de ExcursionCards
- Filtros: zona, dificultad, precio, fecha
- Búsqueda por texto (nombre_ruta, zona)
- Pantalla detalle excursión (excursion/[id]):
  - Info completa + foto + datos del guía
  - Mapa estático del punto de inicio (sin react-native-maps aún, usar imagen estática)
  - Lista de reviews existentes
  - Botón "Reservar"
- Pantalla Home/Feed: excursiones destacadas y próximas

**Criterio de éxito:** Listar, filtrar, buscar y ver detalle de excursiones desde Supabase.

---

### FASE 3: Sistema de reservas (Semana 4)
**Objetivo:** Reservar y gestionar reservas

- bookingsStore: crear, cancelar, fetch reservas
- Modal/Sheet de reserva (desde detalle excursión):
  - Selector num_personas
  - Cálculo precio_total en real-time
  - Botón confirmar
- Pantalla Mis Reservas: tabs Próximas / Historial / Canceladas
- Detalle de reserva (booking/[id])
- Actualizar plazas_disponibles al reservar
- Cancelar reservas pendientes

**Criterio de éxito:** Flujo completo reservar → ver en mis reservas → cancelar.

---

### FASE 4: Mapa interactivo (Semana 5)
**Objetivo:** Ver excursiones en mapa, visualizar rutas

- Instalar react-native-maps
- Componente MapView reutilizable
- Markers por excursión (latitud/longitud)
- Callout al tocar marker → info básica + navegar a detalle
- Dibujar polyline de ruta (si hay ruta_geojson)
- Integrar mapa en pantalla Explorar (toggle lista/mapa)
- Integrar mapa en detalle de excursión

**Criterio de éxito:** Mapa con markers, tap para ver info, polyline de ruta visible.

---

### FASE 5: GPS Tracking (Semanas 6-7)
**Objetivo:** Grabar ruta en tiempo real estilo Wikiloc

- activityStore completo: estado tracking, array de coordenadas, timer, distancia
- Permisos expo-location (foreground + background)
- Pantalla Activity:
  - Botón Iniciar/Pausar/Detener
  - Mapa con polyline en tiempo real
  - Stats live: distancia, tiempo, velocidad, desnivel
- Background tracking con expo-task-manager
- Al finalizar: guardar actividad en Supabase (tabla ACTIVIDADES)
- Historial de actividades en perfil

**Criterio de éxito:** Grabar ruta caminando, ver polyline en vivo, guardar y ver después.

---

### FASE 6: Fotos geolocalizadas (Semana 8)
**Objetivo:** Subir fotos durante tracking o asociadas a excursiones

- expo-image-picker: cámara + galería
- Subir fotos a Supabase Storage (bucket activity-photos)
- Guardar metadata en tabla FOTOS (lat, lon, excursion, actividad)
- Durante tracking: botón para foto rápida con geolocalización automática
- En detalle excursión: galería de fotos de usuarios
- En perfil: galería personal de fotos

**Criterio de éxito:** Tomar foto → se sube → aparece en excursión y en perfil.

---

### FASE 7: Reviews y valoraciones (Semana 8)
**Objetivo:** Puntuar y comentar excursiones

- reviewsStore: crear, editar, eliminar reviews
- Componente de estrellas (1-5)
- Formulario de review en detalle excursión (solo si has completado la excursión)
- Lista de reviews en detalle excursión
- Media de valoraciones mostrada en ExcursionCard
- Valoración calculada del guía (media de sus excursiones)

**Criterio de éxito:** Dejar review → se muestra → media actualizada.

---

### FASE 8: Panel guía (Semana 9)
**Objetivo:** Vista especial para usuarios con rol 'guia'

- Detectar rol del usuario y mostrar UI diferenciada
- Panel guía: mis excursiones asignadas
- Ver lista de reservas por excursión (nombres, num_personas, estado)
- Confirmar/cancelar reservas
- Iniciar excursión: activa tracking GPS vinculado a la excursión
- Vista de participantes en excursión activa

**Criterio de éxito:** Guía ve sus excursiones, gestiona reservas, inicia tracking grupal.

---

### FASE 9: Notificaciones push (Semana 10)
**Objetivo:** Notificaciones para reservas y recordatorios

- expo-notifications: registrar token + guardar en tabla PUSH_TOKENS
- Notificar al reservar (confirmación)
- Notificar cambio de estado de reserva
- Recordatorio antes de excursión (24h)
- Supabase Edge Functions o webhook para enviar notificaciones

**Criterio de éxito:** Recibir push al reservar y antes de la excursión.

---

### FASE 10: Modo offline (Semana 10)
**Objetivo:** Funcionalidad básica sin conexión

- Caché de excursiones con Zustand persist + AsyncStorage
- Caché de reservas del usuario
- Indicador visual de modo offline
- Cola de acciones pendientes (reservar offline → sincronizar al reconectar)
- Descargar ruta para usar mapa offline

**Criterio de éxito:** App usable sin internet con datos cacheados.

---

### FASE 11: Perfil y estadísticas (Semana 11)
**Objetivo:** Pantalla de perfil completa con estadísticas

- Editar perfil: nombre, bio, teléfono, avatar
- Subir/cambiar foto de perfil (bucket avatars)
- Estadísticas personales:
  - Total km recorridos
  - Total excursiones completadas
  - Total actividades de tracking
  - Gráfico de actividad (últimos 30 días)
- Historial de actividades con mapa mini
- Galería de fotos personal

**Criterio de éxito:** Perfil editable con stats actualizadas automáticamente.

---

### FASE 12: Polish final (Semana 12)
**Objetivo:** App pulida para la presentación

- **Onboarding:** 3-4 pantallas intro para primera vez (skip para recurrentes)
- **Dark mode:** useColorScheme + NativeWind dark: variants
- **Animaciones:** Transiciones entre pantallas, skeleton loaders, shimmer
- **Error handling:** Pantallas de error amigables, retry automático
- **Empty states:** Ilustraciones cuando no hay datos
- **Loading states:** Skeletons en todas las listas
- **Haptic feedback:** En acciones importantes (reservar, iniciar tracking)
- **Testing final:** Probar flujos completos en dispositivo real
- **Build APK/IPA:** Configurar EAS Build para generar binarios

**Criterio de éxito:** App sin crashes, UX profesional, APK generado.

---

## Notas importantes

1. **Las fases 6 y 7 pueden hacerse en paralelo** (misma semana).
2. **La fase 8 (panel guía) depende de tener auth + reservas + tracking** completados.
3. **Si vas corto de tiempo**, las fases recortables son: 10 (offline) y 9 (push). El resto es core.
4. **La app desktop necesita adaptarse** después de tener la móvil funcional. Mínimo: soporte para las nuevas tablas y campos.
5. **Cada fase debe terminar con commit limpio** en GitHub con mensaje descriptivo.
