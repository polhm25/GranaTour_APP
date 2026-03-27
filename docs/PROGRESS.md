# PROGRESS.md - Estado del desarrollo GranaTour

> Registro del progreso real por fases. Actualizar al completar cada tarea o fase.
> Última actualización: 2026-03-10

---

## Estado global

| Fase | Nombre | Estado | Fecha fin |
|------|--------|--------|-----------|
| 0 | Setup inicial | ✅ COMPLETADA | 2026-02-27 |
| 1 | Autenticación | ✅ COMPLETADA | 2026-02-27 |
| 2 | Explorar excursiones | ✅ COMPLETADA | 2026-03-03 |
| 3 | Sistema de reservas | ✅ COMPLETADA | 2026-03-09 |
| 4 | Mapa interactivo | ✅ COMPLETADA | 2026-03-10 |
| 5 | GPS Tracking | ✅ COMPLETADA | 2026-03-10 |
| 6 | Fotos geolocalizadas | ✅ COMPLETADA | 2026-03-10 |
| 7 | Reviews y valoraciones | ✅ COMPLETADA | 2026-03-11 |
| 8 | Panel guía | ✅ COMPLETADA | 2026-03-11 |
| 9 | Notificaciones push | ✅ COMPLETADA | 2026-03-11 |
| 10 | Modo offline | ✅ COMPLETADA | 2026-03-27 |
| 11 | Perfil y estadísticas | ⏳ Pendiente | - |
| 12 | Polish final | ⏳ Pendiente | - |

---

## FASE 0 - Setup inicial ✅ COMPLETADA

### Tareas completadas
- [x] Proyecto Expo creado con template TypeScript
- [x] Estructura de carpetas según ARCHITECTURE.md
- [x] `lib/supabase.ts` → Cliente Supabase con `react-native-url-polyfill`
- [x] `lib/types.ts` → Tipos completos de todas las tablas DB
- [x] `lib/constants.ts` → COLORS, APP_CONFIG, TAB_LABELS, DIFFICULTY_COLORS
- [x] `lib/utils.ts` → formatDate, formatPrice, getDifficultyColor, etc.
- [x] `stores/authStore.ts` → Zustand con persist (solo `user`), flag `initializing`
- [x] `stores/excursionsStore.ts` → Estructura base sin lógica
- [x] `stores/bookingsStore.ts` → Estructura base sin lógica
- [x] `stores/activityStore.ts` → Estructura base sin lógica
- [x] `stores/reviewsStore.ts` → Estructura base sin lógica
- [x] `hooks/useAuth.ts` → Wrapper con useShallow
- [x] `hooks/useLocation.ts` → Placeholder para Fase 5
- [x] `hooks/useSupabase.ts` → Hook genérico con tipado correcto
- [x] `app/_layout.tsx` → Root layout con listener de Supabase auth
- [x] `app/index.tsx` → Redirect según sesión (respeta `initializing`)
- [x] `app/(auth)/_layout.tsx` → Stack sin header
- [x] `app/(auth)/login.tsx` → Placeholder
- [x] `app/(auth)/register.tsx` → Placeholder
- [x] `app/(auth)/forgot-password.tsx` → Placeholder
- [x] `app/(tabs)/_layout.tsx` → 5 tabs con iconos
- [x] `app/(tabs)/index.tsx` → Home placeholder
- [x] `app/(tabs)/explore.tsx` → Explorar placeholder
- [x] `app/(tabs)/activity.tsx` → Actividad placeholder
- [x] `app/(tabs)/bookings.tsx` → Reservas placeholder
- [x] `app/(tabs)/profile.tsx` → Perfil placeholder
- [x] `app/excursion/[id].tsx` → Detalle excursión placeholder
- [x] `app/booking/[id].tsx` → Detalle reserva placeholder
- [x] `.env.example` con variables de entorno
- [x] `tailwind.config.js` con paleta extendida completa
- [x] Revisión code-reviewer aplicada (nombres en inglés, useShallow, initializing, etc.)

### Criterio de éxito
- [x] `npx expo start` funciona sin errores
- [x] Navegación entre placeholders operativa

---

## FASE 1 - Autenticación ✅ COMPLETADA

### Objetivo
Login, registro y recuperación de contraseña con Supabase Auth.

### Tareas completadas
- [x] `authStore.ts` → signIn, signUp, signOut, resetPassword + translateAuthError (errores en español)
- [x] Pantalla `login.tsx` → formulario email/password, validación local, toggle password, loading, errores
- [x] Pantalla `register.tsx` → 8 campos (nombre, ap1, ap2, dni, email, tel, pass, confirm), validación DNI/NIE, refs entre campos
- [x] Pantalla `forgot-password.tsx` → email, loading, vista de confirmación sin redirigir
- [x] Registro con metadata para trigger `handle_new_user`
- [x] Session listener activo en root layout (ya estaba en Fase 0)
- [x] Persistencia de sesión con AsyncStorage (ya estaba en Fase 0)
- [x] Protección de rutas (redirect si no autenticado, ya estaba en Fase 0)
- [x] Feedback visual: loading states, mensajes de error en español, banners rojo/verde

### Criterio de éxito
- [x] Crear cuenta nueva exitosamente
- [x] Login con cuenta existente
- [x] Cerrar sesión
- [x] Reabrir app y seguir logueado (persistencia)
- [x] Recuperación de contraseña por email

### Fix crítico de DB (fuera del código móvil)
- Trigger `handle_new_user` corregido: tabla `usuarios` en minúsculas
- Política RLS añadida: `CREATE POLICY "Trigger puede registrar usuarios" ON usuarios FOR INSERT WITH CHECK (true)`
- En Supabase Cloud, `SECURITY DEFINER` no bypasea RLS → siempre añadir política INSERT explícita para triggers

---

## FASE 2 - Explorar excursiones ✅ COMPLETADA

### Tareas completadas
- [x] `excursionsStore.ts` → fetchExcursions, getExcursionById, fetchFeaturedExcursions, fetchUpcomingExcursions, getFilteredExcursions
- [x] `components/ExcursionCard.tsx` → tarjeta reutilizable con imagen, dificultad, stats, precio, plazas
- [x] `components/ui/FilterSheet.tsx` → modal bottom sheet con filtros de zona, dificultad y precio
- [x] `app/(tabs)/explore.tsx` → FlatList con búsqueda (debounce 300ms), filtros con badge de activos, estados loading/error/vacío
- [x] `app/(tabs)/index.tsx` → Home con saludo, sección horizontal destacadas, sección vertical próximas, skeletons
- [x] `app/excursion/[id].tsx` → detalle completo con hero image, stats, guía, coordenadas, botón Reservar sticky
- [x] Fix: flags `loadingFeatured`/`loadingUpcoming` separados para fetches paralelos
- [x] Fix: `currentExcursion` se limpia al iniciar `getExcursionById`
- [x] Fix: mensajes de error genéricos en español (no se exponen errores de Supabase/PostgreSQL)
- [x] Code review completado y bugs corregidos

### Criterio de éxito
- [x] Listar excursiones desde Supabase
- [x] Filtrar por zona, dificultad, precio
- [x] Buscar por texto (nombre_ruta, zona)
- [x] Ver detalle completo de excursión
- [x] Home con excursiones destacadas y próximas

---

## FASE 3 - Sistema de reservas ✅ COMPLETADA

### Tareas completadas
- [x] `stores/bookingsStore.ts` → lógica completa con flags separados (loadingList, loadingDetail, loadingCreate, loadingCancel)
- [x] `app/excursion/[id].tsx` → booking sheet (Modal) con selector de personas, cálculo de precio en real-time y confirmación
- [x] `app/(tabs)/bookings.tsx` → lista con 3 tabs (Próximas / Historial / Canceladas), recarga en useFocusEffect
- [x] `app/booking/[id].tsx` → detalle de reserva con badge de estado y botón cancelar con confirmación
- [x] RPCs en Supabase: `decrementar_plazas`, `incrementar_plazas` y `crear_reserva_atomica`
- [x] Fix post-review: race condition createBooking → RPC atómico (C-01)
- [x] Fix post-review: filtro id_usuario en getBookingById y cancelBooking (C-02, C-03)
- [x] Fix post-review: tab Historial filtra por fecha_inicio < hoy (I-01)
- [x] Fix post-review: modal cancelación no cierra al tocar el box (I-09)
- [x] Fix post-review: useCallback + useEffect deps en screens (I-05, I-06)
- [x] Fix post-review: logs de RPC en todos los entornos, no solo __DEV__ (I-08)

### Criterio de éxito
- [x] Flujo completo reservar → ver en mis reservas → cancelar

---

## Archivos clave por fase

### Fase 0 (creados)
```
lib/
  supabase.ts, types.ts, constants.ts, utils.ts
stores/
  authStore.ts, excursionsStore.ts, bookingsStore.ts, activityStore.ts, reviewsStore.ts
hooks/
  useAuth.ts, useLocation.ts, useSupabase.ts
app/
  _layout.tsx, index.tsx
  (auth)/: _layout.tsx, login.tsx, register.tsx, forgot-password.tsx
  (tabs)/: _layout.tsx, index.tsx, explore.tsx, activity.tsx, bookings.tsx, profile.tsx
  excursion/[id].tsx, booking/[id].tsx
```

### Fase 1 (completada)
```
app/(auth)/login.tsx         ← UI completa
app/(auth)/register.tsx      ← UI completa
app/(auth)/forgot-password.tsx ← UI completa
stores/authStore.ts          ← lógica completa
```

### Fase 2 (completada)
```
stores/excursionsStore.ts    ← lógica completa con flags loadingFeatured/loadingUpcoming
components/ExcursionCard.tsx ← tarjeta reutilizable
components/ui/FilterSheet.tsx ← modal de filtros
app/(tabs)/explore.tsx       ← lista + búsqueda + filtros
app/(tabs)/index.tsx         ← Home con destacadas y próximas
app/excursion/[id].tsx       ← detalle completo
app/_layout.tsx              ← fix tabla 'usuarios' (minúsculas)
```

### Fase 3 (completada)
```
stores/bookingsStore.ts      ← lógica completa, RPC atómico, flags separados
app/(tabs)/bookings.tsx      ← 3 tabs filtrados por estado+fecha, useFocusEffect
app/booking/[id].tsx         ← detalle + cancelación con modal
app/excursion/[id].tsx       ← booking sheet integrado, error display
```
RPCs Supabase requeridos: `crear_reserva_atomica`, `decrementar_plazas`, `incrementar_plazas`

---

## FASE 4 - Mapa interactivo ✅ COMPLETADA

### Tareas completadas
- [x] `npx expo install react-native-maps` instalado
- [x] `components/MapView.tsx` → componente `ExcursionMapView` reutilizable:
  - Markers por excursión (solo las que tienen latitud/longitud)
  - Callout al tocar marker: nombre_ruta, zona, precio, hint de navegación
  - Polyline si la excursión tiene ruta_geojson (parseo robusto de GeoJSON LineString)
  - Props: `excursions[]`, `onMarkerPress(id)`, `selectedId?`, `interactive?`, `style?`
  - Type predicate en filter para evitar casteos `as number`
  - Validación de coordenadas en parseGeoJsonLineString (filtra NaN y fuera de rango)
- [x] `stores/excursionsStore.ts` → añadido `ruta_geojson` a EXCURSION_FIELDS (fix C-01)
- [x] `app/(tabs)/explore.tsx` → Toggle Lista/Mapa en header, modo mapa con ExcursionMapView:
  - useMemo para filteredExcursions, listHeader y emptyState
  - useCallback para handleSearchChange (antes función simple)
  - useEffect cleanup para el timer de debounce
- [x] `app/excursion/[id].tsx` → mapa mini no interactivo (200px) reemplaza bloque coords estático

### Fix post-review
- [x] C-01: `ruta_geojson` añadido a EXCURSION_FIELDS en excursionsStore
- [x] I-01: useMemo para filteredExcursions en explore.tsx
- [x] I-02: useEffect cleanup para debounce timer
- [x] I-03: parseGeoJsonLineString valida coordenadas (isNaN, rango lat/lon)
- [x] I-04: Type predicate en filter reemplaza casteo `as number`
- [x] I-05: handleSearchChange memoizado con useCallback
- [x] I-06: listHeader y emptyState memoizados con useMemo

### Criterio de éxito
- [x] Mapa con markers de excursiones en pantalla Explorar
- [x] Toggle Lista/Mapa funcional con filtros activos en ambos modos
- [x] Tap en marker abre detalle de excursión (Callout con onPress)
- [x] Polyline de ruta dibujada si ruta_geojson presente
- [x] Mapa mini (200px) en detalle de excursión, no interactivo

---

### Fase 4 (completada)
```
components/MapView.tsx       ← ExcursionMapView reutilizable
stores/excursionsStore.ts    ← ruta_geojson añadido a EXCURSION_FIELDS
app/(tabs)/explore.tsx       ← toggle lista/mapa + optimizaciones useMemo/useCallback
app/excursion/[id].tsx       ← mapa mini reemplaza bloque coordenadas estático
```

---

## FASE 5 - GPS Tracking ✅ COMPLETADA

### Tareas completadas
- [x] `npx expo install expo-location expo-task-manager` instalado
- [x] `tasks/backgroundLocation.ts` → tarea TaskManager con require() dinámico para evitar circular deps
- [x] `hooks/useLocation.ts` → permisos foreground + background, getCurrentPositionAsync, useCallback
- [x] `stores/activityStore.ts` → tracking completo:
  - `startTracking`: permisos, timer, background task + fallback watchPositionAsync, flag `startingTracking` (C-02)
  - `pauseTracking` / `resumeTracking`: pausa el timer sin detenerlo
  - `stopTracking`: genera `pendingSummary` con stats finales
  - `addGPSPoint`: Haversine incremental + desnivel positivo acumulado + filtro saltos > 200m
  - `saveActivity`: INSERT en `actividades` con desnivel, validación título (I-04)
  - `discardActivity`: limpia estado
  - `fetchActivities`: filtra `estado != 'descartada'` (I-08)
  - `getActivityById`: con filtro `id_usuario`
- [x] `components/ActivityCard.tsx` → tarjeta de historial extraída (I-03)
- [x] `lib/utils.ts` → helpers: formatTimer, formatDistanceLabel, formatSpeedLabel, formatDateShort (I-05)
- [x] `app/(tabs)/activity.tsx` → UI completa:
  - Estado idle: botón iniciar + historial de actividades
  - Estado tracking: mapa en tiempo real con Polyline + stats (tiempo, distancia, velocidad, desnivel)
  - Botones Pausar/Reanudar y Detener con confirmación Alert
  - Modal de resumen: título editable, stats, Guardar / Descartar
  - Selectores separados para datos frecuentes vs estables (C-03, I-01)
- [x] `app/_layout.tsx` → import `tasks/backgroundLocation` para registro temprano
- [x] Code review completado y todos los CRÍTICOS e IMPORTANTES corregidos

### Fix post-review
- [x] C-01: cálculo de desnivel positivo acumulado en `addGPSPoint` + guardado en Supabase
- [x] C-02: flag `startingTracking` previene doble inicio + spinner en botón
- [x] C-03: `useEffect` del mapa reacciona a `gpsPoints.length` no al array completo
- [x] I-01: selectores Zustand separados (tracking frecuente vs historial estable vs acciones)
- [x] I-03: `ActivityCard` extraída a `components/ActivityCard.tsx`
- [x] I-04: validación de longitud del título en el store
- [x] I-05: helpers de formato movidos a `lib/utils.ts`
- [x] I-07: `useCallback` en `useLocation` para `requestPermission` y `getLocation`
- [x] I-08: `fetchActivities` filtra `.neq('estado', 'descartada')`
- [x] S-05: import `ScrollView` eliminado

### Criterio de éxito
- [x] Iniciar tracking → ver polyline en vivo con stats (tiempo, distancia, velocidad, desnivel)
- [x] Pausar / Reanudar sin perder datos
- [x] Detener → modal de resumen → guardar en Supabase tabla `actividades`
- [x] Actividad visible en historial de la tab Actividad

### Fase 5 (completada)
```
tasks/backgroundLocation.ts  ← tarea background GPS con expo-task-manager
hooks/useLocation.ts         ← permisos y getLocation con expo-location
stores/activityStore.ts      ← tracking completo, Haversine, desnivel, save/discard
components/ActivityCard.tsx  ← tarjeta historial reutilizable
lib/utils.ts                 ← helpers formatTimer, formatDistanceLabel, etc.
app/(tabs)/activity.tsx      ← UI completa tracking + historial
app/_layout.tsx              ← import task para registro temprano
```

---

---

## FASE 6 - Fotos geolocalizadas ✅ COMPLETADA

### Tareas completadas
- [x] `npx expo install expo-image-picker expo-media-library` instalado
- [x] `app.json` → permisos iOS (NSCameraUsageDescription, NSPhotoLibraryUsageDescription, etc.) y Android (CAMERA, READ_MEDIA_IMAGES)
- [x] `lib/storage.ts` → helper `uploadPhoto(uri, userId)`: fetch blob → Supabase Storage → URL pública. Path con sufijo aleatorio para evitar colisiones
- [x] `stores/photosStore.ts` → arrays separados por contexto (`excursionPhotos`, `myPhotos`), flags de loading independientes, límite PHOTOS_LIMIT=50 en queries
- [x] `components/PhotoCapture.tsx` → botón reutilizable cámara/galería con Alert + permisos + compresión (quality:0.8) + callback onPhotoUploaded
- [x] `stores/activityStore.ts` → `pendingTrackingPhotoIds`, `addTrackingPhoto`, UPDATE de fotos en `saveActivity`, INSERT devuelve `id_actividad`
- [x] `app/(tabs)/activity.tsx` → botón PhotoCapture flotante durante tracking, geolocalización automática del último gpsPoint, feedback visual con Alert
- [x] `app/excursion/[id].tsx` → sección "Fotos de la comunidad" con FlatList (scrollEnabled=false), lightbox Modal, PhotoCapture inline
- [x] `app/(tabs)/profile.tsx` → galería "Mis fotos" en cuadrícula 3 columnas, lightbox con fecha y botón eliminar, PhotoCapture

### Fix post-review
- [x] C-01: `pendingTrackingPhotoIds` + UPDATE en saveActivity vincula fotos de tracking a la actividad
- [x] C-02: arrays separados `excursionPhotos`/`myPhotos` eliminan race condition del store compartido
- [x] C-03: FlatList con `scrollEnabled={false}` reemplaza `.map()` en ScrollView en excursion/[id].tsx
- [x] I-01: `style?: StyleProp<ViewStyle>` en PhotoCapture (antes `object`)
- [x] I-02: Acciones Zustand fuera de useShallow en profile.tsx y excursion/[id].tsx
- [x] I-03: `.limit(PHOTOS_LIMIT)` en todas las queries de fotos
- [x] I-04: sufijo aleatorio en nombre de archivo Storage: `${Date.now()}_${suffix}.jpg`
- [x] I-05: Alert de confirmación tras subir foto durante tracking

### Criterio de éxito
- [x] Tomar foto durante tracking → geolocalizada → vinculada a actividad al guardar
- [x] Foto aparece en galería de excursión (Fotos de la comunidad)
- [x] Foto aparece en galería personal del perfil
- [x] Eliminar foto desde el perfil (lightbox)
- [x] Lightbox modal en excursion/[id].tsx para ver foto a pantalla completa

### Fase 6 (completada)
```
lib/storage.ts               ← helper uploadPhoto con path único y URL pública
stores/photosStore.ts        ← arrays separados por contexto, límites, delete con RLS
stores/activityStore.ts      ← pendingTrackingPhotoIds, addTrackingPhoto, UPDATE al guardar
components/PhotoCapture.tsx  ← botón cámara/galería reutilizable
app/(tabs)/activity.tsx      ← botón flotante durante tracking con geolocalización
app/(tabs)/profile.tsx       ← galería personal 3 columnas con lightbox
app/excursion/[id].tsx       ← galería comunidad 2 columnas con FlatList + lightbox
app.json                     ← permisos iOS/Android para cámara y galería
```

---

## FASE 7 - Reviews y valoraciones ✅ COMPLETADA

### Tareas completadas
- [x] `stores/reviewsStore.ts` → estado completo (reviews, userReview, averageRating, userCanReview), acciones fetch/create/edit/delete, flags de loading independientes
- [x] `components/StarRating.tsx` → componente interactivo + display, props: value, onChange, size, color, showValue, style
- [x] `components/ReviewCard.tsx` → tarjeta con avatar/placeholder, estrellas, comentario, badge "Mi valoración", botones editar/eliminar (prop loadingDelete para deshabilitar durante borrado)
- [x] `components/ExcursionCard.tsx` → mostrar `valoracion_media` con ⭐ y texto "valoración"
- [x] `stores/excursionsStore.ts` → `reviews(puntuacion)` en SELECT_CON_GUIA, helper `computeValoracionMedia` aplicado en todos los fetches
- [x] `lib/types.ts` → `valoracion_media?: number | null` añadido a `ExcursionConGuia`
- [x] `app/excursion/[id].tsx` → sección "Valoraciones" completa: media, formulario condicional (nueva/edición), lista con ReviewCard, errores via Alert
- [x] `supabase/recalcular_valoracion_guia.sql` → RPC SECURITY DEFINER que recalcula la valoración del guía (ejecutar en Supabase SQL Editor)

### Fix post-review
- [x] C-01: Validación `isValidPuntuacion()` en `createReview` y `editReview` (entero 1-5)
- [x] C-02: `updateGuideRating` usa `supabase.rpc('recalcular_valoracion_guia', { p_id_excursion })` en lugar de UPDATE directo en `usuarios` (RLS bypass vía SECURITY DEFINER)
- [x] C-03: Tipo local `RawReviewRow` + función `mapToReviewConUsuario` reemplaza el casteo `as unknown as ReviewConUsuario[]`
- [x] I-01: `fetchReviewsByExcursion` acepta `keepExisting?: boolean` — llamadas internas desde create/edit usan `true` para evitar flash visual
- [x] I-02: `id_excursion` guardado al inicio de `editReview` antes de operaciones async (previene race condition con userReview)
- [x] I-03: `loadingDelete` pasado como prop a `ReviewCard` → deshabilita botón y muestra "Eliminando…"
- [x] I-07: `updatePayload` tipado con `EditReviewPayload` (antes `Record<string, unknown>`)

### Criterio de éxito
- [x] Ver media de valoraciones en ExcursionCard y en detalle de excursión
- [x] Crear review solo si tiene reserva confirmada
- [x] Editar review propia
- [x] Eliminar review propia con confirmación
- [x] valoracion del guía se actualiza automáticamente vía RPC

### Fase 7 (completada)
```
stores/reviewsStore.ts         ← CRUD completo, validación, RPC para guía, keepExisting
components/StarRating.tsx      ← componente reutilizable interactivo + display
components/ReviewCard.tsx      ← tarjeta con acciones, prop loadingDelete
components/ExcursionCard.tsx   ← muestra valoracion_media
stores/excursionsStore.ts      ← valoracion_media calculada de reviews JOIN
lib/types.ts                   ← valoracion_media en ExcursionConGuia
app/excursion/[id].tsx         ← sección Valoraciones integrada
supabase/recalcular_valoracion_guia.sql ← RPC a ejecutar en Supabase SQL Editor
```

---

## FASE 8 - Panel guía ✅ COMPLETADA

### Tareas completadas
- [x] `stores/guideStore.ts` → store completo con fetchGuideExcursions, fetchExcursionBookings, updateBookingStatus
- [x] `app/(tabs)/_layout.tsx` → Tab "Guía" añadida con `href: null` para no guías (condicional por rol)
- [x] `app/(tabs)/guide.tsx` → Panel guía: lista de excursiones asignadas con conteos (pendiente/confirmada), useFocusEffect para recarga
- [x] `app/guide-excursion/[id].tsx` → Detalle de excursión para guía: reservas con confirmar/cancelar, botón "Iniciar excursión" vinculado a activityStore, vista de participantes durante tracking
- [x] `supabase/rls_guide_bookings.sql` → Políticas RLS para guías (SELECT y UPDATE de reservas de sus excursiones)

### Criterio de éxito
- [x] Guía ve sus excursiones asignadas en tab dedicado
- [x] Puede gestionar reservas (pendiente → confirmada / cancelada con devolución de plazas)
- [x] Puede iniciar tracking GPS vinculado a una excursión específica
- [x] Vista de participantes confirmados durante tracking activo

### Fase 8 (completada)
```
stores/guideStore.ts             ← fetchGuideExcursions, fetchExcursionBookings, updateBookingStatus
app/(tabs)/_layout.tsx           ← tab Guía condicional (href: null para no guías)
app/(tabs)/guide.tsx             ← panel guía con lista de excursiones y conteos
app/guide-excursion/[id].tsx     ← reservas + confirmar/cancelar + iniciar tracking + participantes
supabase/rls_guide_bookings.sql  ← ejecutar en Supabase SQL Editor
```
RLS Supabase requerido: `rls_guide_bookings.sql` (guías pueden leer y actualizar reservas de sus excursiones)

---

## FASE 9 - Notificaciones push ✅ COMPLETADA

### Tareas completadas
- [x] `npx expo install expo-notifications expo-device` instalado
- [x] `app.json` → plugin expo-notifications con icono y color, permisos Android (RECEIVE_BOOT_COMPLETED, VIBRATE, POST_NOTIFICATIONS)
- [x] `tsconfig.json` → excluye `supabase/functions/` de la compilación TypeScript (código Deno)
- [x] `stores/pushStore.ts` → store sin persist: solicita permiso, obtiene ExpoPushToken, upsert en `push_tokens` por token, deactivateToken() al cerrar sesión
- [x] `stores/bookingsStore.ts` → notificación local inmediata tras `createBooking` exitoso
- [x] `stores/guideStore.ts` → envío de push a Edge Function al confirmar/cancelar reserva en `updateBookingStatus`
- [x] `app/_layout.tsx` → registerPushToken + fetchUpcomingBookings + scheduleBookingReminders al autenticarse; deactivateToken + cancelAllScheduledNotifications al cerrar sesión; listener de notificaciones recibidas con cleanup
- [x] `supabase/functions/send-push-notification/index.ts` → Edge Function Deno: lee tokens activos del cliente vía service role, llama a Expo Push API, retorna `{ sent, expo_response }`
- [x] Fix: `fetchUpcomingBookings` filtra por `excursion.fecha_inicio` en el cliente (no por `fecha_reserva`)

### Criterio de éxito
- [x] Recibir notificación local al crear una reserva (simulador + dispositivo)
- [x] Enviar notificación push al cliente al confirmar/cancelar reserva (dispositivo físico)
- [x] Programar recordatorio 24h antes de excursión confirmada

### Notas técnicas
- Push tokens solo en dispositivos físicos (Device.isDevice); la lógica se salta silenciosamente en simuladores
- Edge Function requiere despliegue: `supabase functions deploy send-push-notification`
- Variables de entorno en Supabase Edge Function Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- La tabla `push_tokens` en Supabase debe existir (ver SCHEMA.md). Upsert por campo `token` (único)

### Fase 9 (completada)
```
stores/pushStore.ts                                    ← registro de token, permisos, deactivate
stores/bookingsStore.ts                               ← notificación local en createBooking
stores/guideStore.ts                                  ← push a Edge Function en updateBookingStatus
app/_layout.tsx                                       ← orquestación: token, recordatorios, listener
supabase/functions/send-push-notification/index.ts    ← Edge Function Deno (despliegue manual)
app.json                                              ← plugin expo-notifications + permisos Android
tsconfig.json                                         ← excluye supabase/functions de tsc
```

---

## FASE 10 - Modo offline ✅ COMPLETADA

### Tareas completadas
- [x] `npx expo install @react-native-community/netinfo` instalado (v11.4.1)
- [x] `hooks/useNetworkState.ts` → detección de conectividad en tiempo real con NetInfo; actualiza offlineStore
- [x] `stores/offlineStore.ts` → store con persist (AsyncStorage); cola de `PendingAction` con tipo discriminado; `setSyncing` para UI
- [x] `stores/excursionsStore.ts` → persist parcial: `excursions`, `featuredExcursions`, `upcomingExcursions`; fallback en `getExcursionById` desde caché local
- [x] `stores/bookingsStore.ts` → persist parcial: `bookings`; fallback en `getBookingById` desde caché; modo offline en `createBooking` (encola en lugar de fallar)
- [x] `components/ui/OfflineBanner.tsx` → banner animado (Animated.timing opacity); controla montaje/desmontaje para fade-out correcto; muestra pendingCount
- [x] `app/_layout.tsx` → `useNetworkState()` activa el listener; `subscribe` a `offlineStore` para procesar cola al reconectar; `clearPendingActions()` al logout
- [x] Pantallas `index.tsx`, `explore.tsx`, `bookings.tsx` → `<OfflineBanner />` integrado
- [x] Fix I-01: `OfflineBanner` controla desmontaje tras animación
- [x] Fix I-02: verificar usuario autenticado antes de procesar cola; limpiar cola al cerrar sesión

### Criterio de éxito
- [x] App funciona sin internet mostrando datos cacheados (excursiones, reservas)
- [x] Reserva offline se encola y se sincroniza automáticamente al reconectar
- [x] Banner visual informa del estado offline y del número de pendientes
- [x] Desconectar → reconectar → las reservas pendientes se envían automáticamente

### Notas técnicas
- `partialize` en persist evita persistir estado transitorio (loading, error, currentX)
- `isOnline: true` por defecto y NO persistido (se recalcula al arrancar con NetInfo.fetch)
- El subscribe en `_layout.tsx` detecta la transición offline→online en el mismo ciclo de evento
- Acciones huérfanas prevenidas: se borran al logout y se comprueban antes de procesar

### Fase 10 (completada)
```
hooks/useNetworkState.ts         ← detección NetInfo, actualiza offlineStore
stores/offlineStore.ts           ← cola persist, setSyncing, clearPendingActions
stores/excursionsStore.ts        ← persist parcial + fallback offline en getById
stores/bookingsStore.ts          ← persist parcial + flujo offline en createBooking
components/ui/OfflineBanner.tsx  ← banner animado con fade-out correcto
app/_layout.tsx                  ← listener red + procesado cola al reconectar
app/(tabs)/index.tsx             ← OfflineBanner integrado
app/(tabs)/explore.tsx           ← OfflineBanner integrado
app/(tabs)/bookings.tsx          ← OfflineBanner integrado
```

---

## Notas de desarrollo

- **Deadline:** 20-21 mayo 2026
- **Semanas disponibles:** ~12 semanas
- **Phases 6 y 7** pueden hacerse en paralelo
- **Phases recortables si falta tiempo:** 9 (push) y 10 (offline) ← ya completadas
- Cada fase termina con commit limpio en GitHub
