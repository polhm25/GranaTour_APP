# ERRORS.md - Registro de errores y aprendizajes

> Cada error encontrado durante el desarrollo se registra aquí con su causa, solución y aprendizaje.
> Actualizar este archivo cada vez que aparezca un error relevante.

---

## Formato de entrada

```
### [FASE-X] Título del error
- **Fecha:** YYYY-MM-DD
- **Archivo(s):** ruta/al/archivo.ts
- **Error:** Descripción exacta del error o mensaje
- **Causa:** Por qué ocurrió
- **Solución:** Cómo se resolvió
- **Aprendizaje:** Qué evitar en el futuro
```

---

## Errores Fase 4 - Mapa interactivo

### [FASE-4] ruta_geojson no incluido en EXCURSION_FIELDS
- **Fecha:** 2026-03-10
- **Archivo(s):** `stores/excursionsStore.ts`
- **Error:** Las polylines nunca se dibujaban (bug silencioso, sin crash)
- **Causa:** Al crear MapView.tsx que consume `ruta_geojson`, se olvidó añadir el campo a la constante `EXCURSION_FIELDS` que construye el SELECT de Supabase
- **Solución:** Añadir `'ruta_geojson'` al array `EXCURSION_FIELDS`
- **Aprendizaje:** Al añadir un campo nuevo a la UI, SIEMPRE verificar que esté en la query/SELECT de Supabase. Revisar `EXCURSION_FIELDS` al inicio de cada fase que amplíe los datos usados

### [FASE-4] TypeScript no narrowea dentro de .map() tras .filter()
- **Fecha:** 2026-03-10
- **Archivo(s):** `components/MapView.tsx`
- **Error:** TypeScript requería casteo `as number` para `latitud`/`longitud` tras filtrar con `!== null`
- **Causa:** TypeScript no propaga el narrowing de un `.filter()` al `.map()` posterior sin type predicate
- **Solución:** Usar type predicate explícito `(e): e is Type & { latitud: number; longitud: number } => ...`
- **Aprendizaje:** Para filtros que narrowean tipos nullable, usar type predicates en lugar de casteos `as`

---

## Errores Fase 0 - Setup inicial

### [FASE-0] utils/supabase.ts duplicado con lib/supabase.ts
- **Fecha:** 2026-02-27
- **Archivo(s):** `utils/supabase.ts`, `lib/supabase.ts`
- **Error:** Existían dos clientes Supabase en el proyecto, generando ambigüedad
- **Causa:** El template creó `utils/supabase.ts` y se añadió `lib/supabase.ts` como fuente de verdad
- **Solución:** Eliminar `utils/supabase.ts`. Fuente única: `lib/supabase.ts`
- **Aprendizaje:** Siempre importar desde `@/lib/supabase`, nunca desde `@/utils/supabase`

### [FASE-0] Selector Zustand sin useShallow causa re-renders
- **Fecha:** 2026-02-27
- **Archivo(s):** `hooks/useAuth.ts`
- **Error:** Re-renders innecesarios al seleccionar múltiples valores del store
- **Causa:** Seleccionar múltiples propiedades sin `useShallow` crea un nuevo objeto en cada render
- **Solución:** Importar `useShallow` desde `zustand/react/shallow` y envolver el selector
- **Aprendizaje:** Siempre usar `useShallow` cuando se seleccionan ≥2 valores de un store Zustand

### [FASE-0] authStore sin flag `initializing`
- **Fecha:** 2026-02-27
- **Archivo(s):** `stores/authStore.ts`, `app/index.tsx`
- **Error:** Redirect prematuro antes de que Supabase compruebe la sesión existente
- **Causa:** `app/index.tsx` redirigía antes de que el listener de auth completara
- **Solución:** Añadir `initializing: boolean` al store; `index.tsx` espera a que sea `false`
- **Aprendizaje:** SIEMPRE tener un flag `initializing` en authStore antes de redirigir

### [FASE-0] Nombres de funciones en español en utils.ts
- **Fecha:** 2026-02-27
- **Archivo(s):** `lib/utils.ts`
- **Error:** Code reviewer detectó `formatearFecha`, `formatearPrecio`, `colorDificultad`
- **Causa:** Mezcla de idiomas, CLAUDE.md indica nombres en inglés
- **Solución:** Renombrar a `formatDate`, `formatPrice`, `getDifficultyColor`
- **Aprendizaje:** Variables, funciones y tipos SIEMPRE en inglés. Solo UI en español

### [FASE-0] useSupabase sin tipado correcto para argumentos genéricos
- **Fecha:** 2026-02-27
- **Archivo(s):** `hooks/useSupabase.ts`
- **Error:** TypeScript error en generics del hook
- **Causa:** Signatura `<T, TArgs>` sin restricción `extends unknown[]`
- **Solución:** Cambiar a `<T, TArgs extends unknown[]>`
- **Aprendizaje:** Los genéricos para arrays de argumentos deben extender `unknown[]`

### [FASE-0] Params [id] no validados
- **Fecha:** 2026-02-27
- **Archivo(s):** `app/excursion/[id].tsx`, `app/booking/[id].tsx`
- **Error:** Potencial crash si el param no es un número válido
- **Causa:** Usar el param directamente sin parsear
- **Solución:** `parseInt(id)` + validar con `isNaN()` antes de usar
- **Aprendizaje:** Siempre parsear y validar params de ruta dinámica

---

## Errores Fase 1 - Autenticación

### [FASE-1] Error genérico al registrarse: "Ha ocurrido un error. Inténtalo de nuevo"
- **Fecha:** 2026-02-27
- **Archivo(s):** `stores/authStore.ts`, `app/_layout.tsx`, `app/(auth)/register.tsx`
- **Error:** El usuario recibe el mensaje genérico al intentar crear una cuenta
- **Causa (BUG-01/02):** No había `console.error` en el catch de `signUp`. El mensaje real de Supabase se perdía al no coincidir con ningún patrón de `translateAuthError`
- **Solución:** Añadir `console.error` en el catch + ampliar `translateAuthError` con patrones de `database error`, `duplicate`, `signup is disabled`, `rate limit`, `weak password`
- **Aprendizaje:** SIEMPRE loguear el error original antes de traducirlo. Nunca swallow errores en autenticación sin logging

### [FASE-1] "Database error saving new user" — trigger handle_new_user falla
- **Fecha:** 2026-02-27
- **Archivo(s):** Supabase DB (trigger + RLS)
- **Error:** `AuthApiError: Database error saving new user` al registrarse desde la app
- **Causa raíz (en orden de diagnóstico):**
  1. Trigger referenciaba `public."USUARIOS"` (mayúsculas) → tabla real es `public.usuarios`
  2. RLS habilitado en `usuarios` sin política de INSERT → Supabase Cloud no garantiza que `SECURITY DEFINER` + `postgres` bypasee RLS aunque se añada `SET row_security = off`
- **Solución definitiva:** Añadir política RLS de INSERT permisiva para el trigger:
  ```sql
  CREATE POLICY "Trigger puede registrar usuarios"
  ON usuarios FOR INSERT WITH CHECK (true);
  ```
- **Aprendizaje:**
  - En Supabase Cloud, `SECURITY DEFINER` NO garantiza bypass de RLS aunque el owner sea `postgres`
  - Si RLS está activo en una tabla donde un trigger necesita INSERT → añadir política `FOR INSERT WITH CHECK (true)` explícita
  - `SET row_security = off` en la función no es suficiente en Supabase Cloud
  - El nombre de tablas en PostgreSQL es **case-sensitive** con comillas. Sin comillas todo va a minúsculas

### [FASE-1] Supabase devuelve éxito silencioso en email ya registrado
- **Fecha:** 2026-02-27
- **Archivo(s):** `stores/authStore.ts` línea ~157
- **Error:** Con email confirmation activo, si el email ya existe Supabase retorna `{ user: { identities: [] }, error: null }` — sin error explícito
- **Causa:** El código solo verificaba `if (error)` ignorando el caso de `identities.length === 0`
- **Solución:** Verificar `authData.user?.identities?.length === 0` tras el signUp y tratarlo como error
- **Aprendizaje:** Con Supabase Auth + email confirmation activo, siempre verificar `identities` array además del campo `error`

### [FASE-1] _layout.tsx no cargaba perfil de usuario tras auth state change
- **Fecha:** 2026-02-27
- **Archivo(s):** `app/_layout.tsx`
- **Error:** `user` quedaba `null` en el store después del registro/login via listener
- **Causa:** `onAuthStateChange` solo llamaba `setSession()` pero nunca buscaba el perfil en tabla `USUARIOS`
- **Solución:** Extraer `fetchUserProfile(authId)` y llamarla tanto en `getSession()` inicial como en cada evento del listener. `signOut` limpia el user con `setUser(null)`
- **Aprendizaje:** El listener `onAuthStateChange` es la fuente de verdad de la sesión — debe mantener también el perfil sincronizado

### [FASE-1] useCallback con stale closures en register.tsx
- **Fecha:** 2026-02-27
- **Archivo(s):** `app/(auth)/register.tsx` líneas 154-161
- **Error:** `clearFieldError` (función interna) capturada como dependencia estale en los handlers
- **Causa:** Los handlers usaban `[error]` como dependencia pero `clearFieldError` no era estable
- **Solución:** Envolver `clearFieldError` en `useCallback([clearError])` y usarla como dependencia de los handlers
- **Aprendizaje:** Funciones usadas dentro de `useCallback` deben ser ellas mismas estables (refs o memoizadas)

### [FASE-1] isValidEmail demasiado permisivo
- **Fecha:** 2026-02-27
- **Archivo(s):** `app/(auth)/login.tsx`, `app/(auth)/register.tsx`
- **Error:** `email.includes('@')` acepta `@`, `user@`, `@domain` como válidos
- **Causa:** Validación mínima que enviaba emails inválidos a Supabase generando errores no mapeados
- **Solución:** Usar regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- **Aprendizaje:** Validar email con regex antes de llamar a cualquier API de auth

---

## Errores Fase 2 - Excursiones

### [FASE-2] Tabla 'USUARIOS' en mayúsculas en _layout.tsx
- **Fecha:** 2026-03-04
- **Archivo(s):** `app/_layout.tsx` línea 16
- **Error:** El perfil del usuario quedaba `null` tras el login aunque la sesión fuera válida
- **Causa:** `from('USUARIOS')` → PostgREST intenta acceder a `/rest/v1/USUARIOS`, que no existe (la tabla real es `usuarios`)
- **Solución:** Cambiar a `from('usuarios')`
- **Aprendizaje:** Este error ya estaba documentado en Fase 1. Revisar SIEMPRE todos los `from('...')` al inicio de cada fase. Nunca usar mayúsculas en nombres de tabla sin comillas.

### [FASE-2] loading compartido entre fetchFeaturedExcursions y fetchUpcomingExcursions
- **Fecha:** 2026-03-04
- **Archivo(s):** `stores/excursionsStore.ts`, `app/(tabs)/index.tsx`
- **Error:** El spinner del Home desaparecía antes de tiempo al lanzar ambos fetches en paralelo
- **Causa:** Ambas funciones escribían al mismo flag `loading: boolean`. La primera en terminar ponía `loading: false` aunque la otra siguiera en curso
- **Solución:** Flags separados `loadingFeatured` y `loadingUpcoming`
- **Aprendizaje:** Cuando múltiples operaciones async comparten un flag de loading y se lanzan en paralelo, siempre usar flags independientes o un contador de operaciones pendientes

### [FASE-2] currentExcursion no se limpiaba al navegar entre detalles
- **Fecha:** 2026-03-04
- **Archivo(s):** `stores/excursionsStore.ts`, `app/excursion/[id].tsx`
- **Error:** Al navegar de excursion/1 a excursion/2 se veían brevemente los datos de la excursión anterior
- **Causa:** `getExcursionById` no reseteaba `currentExcursion` a `null` antes de iniciar la carga
- **Solución:** `set({ currentExcursion: null, loading: true, error: null })` al inicio de la acción
- **Aprendizaje:** Siempre limpiar el estado previo antes de iniciar cualquier fetch de detalle

### [FASE-2] Mensajes de error internos de Supabase/PostgreSQL expuestos al usuario
- **Fecha:** 2026-03-04
- **Archivo(s):** `stores/excursionsStore.ts`
- **Error:** El usuario podía ver mensajes técnicos con nombres de tablas, columnas o políticas RLS
- **Causa:** `set({ error: (error as Error).message })` guardaba el mensaje raw de Supabase
- **Solución:** Función `getExcursionErrorMessage(error, context)` que loguea el error real y devuelve un mensaje genérico en español
- **Aprendizaje:** En todos los stores, los mensajes de error del catch deben ser siempre genéricos y en español. El error real solo va a `console.error`

### [FASE-2] JSBigFileString::fromPath - Could not open file (Android)
- **Fecha:** 2026-03-04
- **Archivo(s):** N/A (problema de entorno, no de código)
- **Error:** Pantalla roja en Android con `JSBigFileString::fromPath - Could not open file`
- **Causa:** El dispositivo Android no puede alcanzar el servidor Metro de Expo (redes distintas, aislamiento de clientes WiFi, etc.)
- **Solución:** `npx expo start --tunnel` para enrutar a través de los servidores de Expo, o `adb reverse tcp:8081 tcp:8081` por USB
- **Aprendizaje:** Este error no es de código. Siempre verificar que dispositivo y ordenador están en la misma red, o usar `--tunnel`

### [FASE-2] TypeError: Network request failed (iOS Simulator)
- **Fecha:** 2026-03-04
- **Archivo(s):** N/A (problema de entorno/conectividad)
- **Error:** `TypeError: Network request failed` al intentar hacer login desde el simulador iOS
- **Causa:** El simulador iOS perdió acceso a red (común tras sleep/reinicio del Mac), o variables `.env` incorrectas
- **Solución:** Verificar red del simulador en Safari, `npx expo start --clear`, verificar `.env`
- **Aprendizaje:** Antes de diagnosticar código, verificar siempre conectividad básica del simulador

---

## Errores Fase 3 - Sistema de reservas

### [FASE-3] Race condition en createBooking: overbooking posible
- **Fecha:** 2026-03-10
- **Archivo(s):** `stores/bookingsStore.ts`
- **Error:** Dos usuarios podían reservar la última plaza simultáneamente: INSERT primero, RPC después. Si el RPC fallaba la reserva quedaba creada sin decrementar plazas.
- **Causa:** Flujo en dos pasos no atómico. Además el error del RPC solo se logueaba en `__DEV__`.
- **Solución:** RPC `crear_reserva_atomica` en PostgreSQL que hace SELECT FOR UPDATE + decremento + INSERT en una sola transacción. Error siempre logueado (no solo __DEV__).
- **Aprendizaje:** Cualquier operación que modifique varias tablas en Supabase debe hacerse con una función RPC de PostgreSQL para garantizar atomicidad.

### [FASE-3] getBookingById y cancelBooking sin filtro id_usuario
- **Fecha:** 2026-03-10
- **Archivo(s):** `stores/bookingsStore.ts`
- **Error:** Las queries solo filtraban por id_reserva, dependiendo 100% de RLS. Si RLS falla, cualquier usuario puede ver o cancelar reservas de otros.
- **Causa:** Falta de defensa en profundidad en el cliente.
- **Solución:** Añadir `.eq('id_usuario', user.id_usuario)` a ambas queries cuando el usuario está disponible.
- **Aprendizaje:** Nunca depender solo de RLS para el ownership. Filtrar siempre por id_usuario en el cliente también.

### [FASE-3] Tab "Historial" mostraba las mismas reservas que "Próximas"
- **Fecha:** 2026-03-10
- **Archivo(s):** `app/(tabs)/bookings.tsx`
- **Error:** Historial filtraba solo por `estado === 'confirmada'`, igual que una parte de Próximas. Reservas futuras confirmadas aparecían en los dos tabs.
- **Causa:** Falta de filtro por fecha de excursión.
- **Solución:** Filtro combinado: Próximas = `(pendiente|confirmada) AND fecha >= hoy`; Historial = `NOT cancelada AND fecha < hoy`; Canceladas = `cancelada`.
- **Aprendizaje:** Los tabs temporales siempre necesitan filtrar por fecha además de estado.

### [FASE-3] Modal de cancelación se cerraba al tocar dentro del contenido
- **Fecha:** 2026-03-10
- **Archivo(s):** `app/booking/[id].tsx`
- **Error:** El `Pressable` del overlay envolvía el box del modal. Un toque en cualquier botón del box propagaba al overlay y cerraba el modal.
- **Causa:** Anidamiento incorrecto: box dentro del Pressable del overlay.
- **Solución:** Separar overlay (Pressable absoluto) y box (View hermana) dentro de un View contenedor. El box absorbe los toques sin propagarlos.
- **Aprendizaje:** En React Native, para un modal con overlay clicable, usar `StyleSheet.absoluteFill` en el Pressable del overlay y el box como hermano, no hijo.

### [FASE-3] Error silencioso cuando createBooking se llama sin usuario autenticado
- **Fecha:** 2026-03-10
- **Archivo(s):** `stores/bookingsStore.ts`, `app/excursion/[id].tsx`
- **Error:** Con Dev Bypass (sin usuario real en el store), pulsar "Confirmar reserva" no hacía nada visible.
- **Causa:** `createBooking` retornaba `null` sin setear `error` cuando `user === null`. Además el `error` del store no se mostraba en el sheet.
- **Solución:** Set de error explícito en el store cuando no hay usuario. Añadir `bookingError` al selector del sheet y banner rojo en la UI.
- **Aprendizaje:** Todo `return null` prematuro en un store debe ir acompañado de `set({ error: '...' })`. Los estados de error deben estar siempre visibles en la UI que los dispara.

---

## Errores Fase 7 - Reviews y valoraciones

### [FASE-7] updateGuideRating hacía UPDATE directo en tabla usuarios desde el cliente
- **Fecha:** 2026-03-11
- **Archivo(s):** `stores/reviewsStore.ts`
- **Error:** UPDATE en `usuarios.valoracion` fallaba silenciosamente o representaba vulnerabilidad de seguridad (cualquier usuario podría actualizar la valoración de otro)
- **Causa:** La función `updateGuideRating` hacía un UPDATE directo en `usuarios` desde el cliente. En Supabase Cloud, RLS bloquea esto silenciosamente.
- **Solución:** Crear RPC `recalcular_valoracion_guia(p_id_excursion INTEGER)` con SECURITY DEFINER en PostgreSQL. El cliente llama a `supabase.rpc(...)` en lugar de hacer UPDATE directo.
- **Aprendizaje:** Nunca hacer UPDATE de datos de otros usuarios desde el cliente. Usar RPCs con SECURITY DEFINER para operaciones que requieren bypasear RLS de forma controlada.

### [FASE-7] Supabase infiere campo de JOIN como array en TypeScript aunque sea relación many-to-one
- **Fecha:** 2026-03-11
- **Archivo(s):** `stores/reviewsStore.ts`
- **Error:** TypeScript error al intentar castear `data` a `RawReviewRow[]`: `usuario` era inferido como array aunque la relación `!id_usuario` es many-to-one
- **Causa:** El sistema de tipos de Supabase infiere los campos de JOIN como arrays en algunos casos, independientemente de la cardinalidad real
- **Solución:** Definir `RawReviewRow.usuario` como `Pick<Usuario,...> | Pick<Usuario,...>[] | null` + función `mapToReviewConUsuario` que normaliza con `Array.isArray` check
- **Aprendizaje:** Para JOINs de Supabase, definir siempre el tipo local con la unión array/objeto y normalizar en una función de mapeo explícita

### [FASE-7] Flash visual al crear/editar review por limpieza del store durante el refetch
- **Fecha:** 2026-03-11
- **Archivo(s):** `stores/reviewsStore.ts`
- **Error:** Al crear/editar una review, la lista de valoraciones parpadeaba brevemente (vacía o en loading) mientras se refrescaba
- **Causa:** `fetchReviewsByExcursion` siempre limpiaba `reviews: []` al inicio, incluso cuando era llamada internamente desde create/edit
- **Solución:** Añadir parámetro `keepExisting?: boolean` a `fetchReviewsByExcursion`. Llamadas internas desde create/edit usan `keepExisting=true` para no limpiar la lista existente
- **Aprendizaje:** Cuando un fetch se usa tanto para carga inicial (debe limpiar) como para refresh interno (no debe limpiar), parametrizar el comportamiento en lugar de duplicar la función

## Errores Fase 8 - Panel guía

### [FASE-8] Flag de loading compartido bloquea todas las tarjetas de reserva
- **Fecha:** 2026-03-11
- **Archivo(s):** `stores/guideStore.ts`, `app/guide-excursion/[id].tsx`
- **Error:** `loadingUpdate: boolean` bloqueaba visualmente TODAS las tarjetas de reserva cuando se actualizaba UNA sola
- **Causa:** Usar un único booleano de loading para múltiples operaciones independientes (patrón ya documentado como error recurrente)
- **Solución:** Usar `updatingBookingId: number | null` — identifica exactamente qué reserva está actualizando. `BookingCard` recibe `isUpdating={updatingBookingId === item.id_reserva}`
- **Aprendizaje:** Confirmación del patrón: un flag de loading por operación independiente. Para listas de items con acciones individuales, usar el ID del item como referencia en lugar de un booleano global

### [FASE-8] setStartingLocal(false) no se ejecuta si startTracking lanza excepción
- **Fecha:** 2026-03-11
- **Archivo(s):** `app/guide-excursion/[id].tsx`
- **Error:** Botón "Iniciar excursión" quedaba permanentemente en estado "Iniciando…" si `startTracking` fallaba
- **Causa:** `startTracking().then(...).catch(...)` sin `.finally()` — si la promesa rechazaba, `setStartingLocal(false)` nunca se ejecutaba
- **Solución:** Añadir `.finally(() => setStartingLocal(false))` para garantizar el reset del estado local independientemente del resultado
- **Aprendizaje:** Para cualquier flag de loading local que se activa antes de una promesa, SIEMPRE usar `finally` para garantizar su reset

### [FASE-8] Expo Router router.d.ts no incluye rutas nuevas hasta que se regenera
- **Fecha:** 2026-03-11
- **Archivo(s):** `.expo/types/router.d.ts`
- **Error:** TypeScript error al usar `router.push('/guide-excursion/${id}')` — la ruta no estaba en el tipo generado
- **Causa:** `.expo/types/router.d.ts` es generado por Expo Router al arrancar `npx expo start`. Si se añaden nuevas rutas sin arrancar el servidor, el archivo de tipos queda desactualizado.
- **Solución:** Actualizar manualmente `.expo/types/router.d.ts` añadiendo las nuevas rutas en los tres lugares: `hrefInputParams`, `hrefOutputParams`, `href`
- **Aprendizaje:** Tras añadir nuevas rutas a `app/`, el archivo `.expo/types/router.d.ts` se regenera automáticamente en el próximo `npx expo start`. Para verificar TypeScript sin arrancar el servidor, actualizar el archivo manualmente o usar `router.push({ pathname: '/ruta/[id]', params: { id } })` con el tipo correcto

## Errores Fase 9 - Notificaciones push

### [FASE-9] fetchUpcomingBookings filtraba por fecha_reserva en lugar de fecha_inicio
- **Fecha:** 2026-03-11
- **Archivo(s):** `app/_layout.tsx`
- **Error:** Los recordatorios nunca se programaban porque el filtro de rango de fechas usaba `fecha_reserva` (fecha en que se hizo la reserva) en vez de `excursion.fecha_inicio` (fecha de la excursión)
- **Causa:** PostgREST no soporta filtros directos en tablas embebidas en la misma query (sin RPC). El filtro de fecha debía aplicarse en el cliente
- **Solución:** Eliminar el filtro de fecha de la query Supabase. Obtener todas las reservas confirmadas y filtrar en JavaScript comparando `booking.excursion?.fecha_inicio` con el rango [now, now+48h]
- **Aprendizaje:** Para filtrar por columnas de tablas relacionadas en Supabase, hacer el filtro en el cliente o usar una RPC. No asumir que `.gte('tabla_relacionada.campo', ...)` funciona en queries con JOIN embebido

### [FASE-9] Edge Function Deno excluida del tsconfig para evitar errores de módulos
- **Fecha:** 2026-03-11
- **Archivo(s):** `tsconfig.json`, `supabase/functions/`
- **Error:** `npx tsc --noEmit` fallaba con "Cannot find module 'https://deno.land/...'" y "Cannot find name 'Deno'"
- **Causa:** Las Edge Functions de Supabase usan runtime Deno con imports de URL. El tsconfig del proyecto apunta a `**/*.ts` que incluía los archivos de la Edge Function
- **Solución:** Añadir `"exclude": ["node_modules", "supabase/functions"]` al tsconfig.json
- **Aprendizaje:** Al añadir Edge Functions (Deno) a un proyecto Node/React Native, siempre excluirlas del tsconfig principal. Cada Edge Function debería tener su propio `tsconfig.json` de Deno si se necesita validación de tipos

## Patrones de error recurrentes

| Patrón | Descripción | Prevención |
|--------|-------------|------------|
| **Doble cliente** | Tener dos instancias del mismo cliente (Supabase, etc.) | Revisar imports al inicio de cada fase |
| **Re-renders Zustand** | Selectores múltiples sin `useShallow` | Template de hook con `useShallow` siempre |
| **Auth race condition** | Redirect antes de comprobar sesión | Flag `initializing` obligatorio |
| **Idioma mezclado** | Funciones en español | Revisar nombres antes de commitear |
| **Params sin validar** | Crash en rutas dinámicas | `parseInt` + `isNaN` obligatorio en [id] |
| **Tabla en mayúsculas** | `from('USUARIOS')` en vez de `from('usuarios')` | Revisar todos los `from()` al inicio de cada fase |
| **Loading compartido** | Un flag para múltiples fetches paralelos | Un flag de loading por operación independiente |
| **Estado stale en detalle** | currentExcursion/currentBooking con datos viejos | Limpiar a `null` al inicio de cada `getById` |
| **Error message raw** | Exponer mensajes de Supabase/PostgreSQL al usuario | Función de mapeo con mensaje genérico + `console.error` |
| **Store array compartido** | Un único `photos[]` para todas las pantallas causa race conditions | Usar arrays separados por contexto (`myPhotos`, `excursionPhotos`) con flags de loading independientes |
| **Acciones en useShallow** | Incluir acciones Zustand en useShallow crea referencias inestables | Acciones siempre fuera de useShallow, como selectores individuales |
| **Fotos tracking huérfanas** | Foto subida durante tracking sin `id_actividad` porque la actividad aún no existe en DB | Registrar `id_foto` en `pendingTrackingPhotoIds` y hacer UPDATE tras guardar la actividad |
| **.map() en ScrollView** | Cientos de fotos renderizadas a la vez sin virtualización | Usar `FlatList` con `scrollEnabled={false}` para embeberse en ScrollView padre |
| **Colisión timestamp Storage** | `Date.now()` puede repetirse en subidas rápidas, `upsert: false` causa error | Añadir sufijo aleatorio: `${Date.now()}_${Math.random().toString(36).slice(2,8)}` |
