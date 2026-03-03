# PROGRESS.md - Estado del desarrollo GranaTour

> Registro del progreso real por fases. Actualizar al completar cada tarea o fase.
> Última actualización: 2026-03-03

---

## Estado global

| Fase | Nombre | Estado | Fecha fin |
|------|--------|--------|-----------|
| 0 | Setup inicial | ✅ COMPLETADA | 2026-02-27 |
| 1 | Autenticación | ✅ COMPLETADA | 2026-02-27 |
| 2 | Explorar excursiones | ✅ COMPLETADA | 2026-03-03 |
| 3 | Sistema de reservas | ⏳ Pendiente | - |
| 4 | Mapa interactivo | ⏳ Pendiente | - |
| 5 | GPS Tracking | ⏳ Pendiente | - |
| 6 | Fotos geolocalizadas | ⏳ Pendiente | - |
| 7 | Reviews y valoraciones | ⏳ Pendiente | - |
| 8 | Panel guía | ⏳ Pendiente | - |
| 9 | Notificaciones push | ⏳ Pendiente | - |
| 10 | Modo offline | ⏳ Pendiente | - |
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

## FASE 1 - Autenticación 🔄 EN CURSO

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

### Fase 1 (en proceso)
```
app/(auth)/login.tsx         ← UI completa
app/(auth)/register.tsx      ← UI completa
app/(auth)/forgot-password.tsx ← UI completa
stores/authStore.ts          ← lógica completa
```

---

## Notas de desarrollo

- **Deadline:** 20-21 mayo 2026
- **Semanas disponibles:** ~12 semanas
- **Phases 6 y 7** pueden hacerse en paralelo
- **Phases recortables si falta tiempo:** 9 (push) y 10 (offline)
- Cada fase termina con commit limpio en GitHub
