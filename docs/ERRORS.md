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

> (pendiente de registrar)

---

## Patrones de error recurrentes

| Patrón | Descripción | Prevención |
|--------|-------------|------------|
| **Doble cliente** | Tener dos instancias del mismo cliente (Supabase, etc.) | Revisar imports al inicio de cada fase |
| **Re-renders Zustand** | Selectores múltiples sin `useShallow` | Template de hook con `useShallow` siempre |
| **Auth race condition** | Redirect antes de comprobar sesión | Flag `initializing` obligatorio |
| **Idioma mezclado** | Funciones en español | Revisar nombres antes de commitear |
| **Params sin validar** | Crash en rutas dinámicas | `parseInt` + `isNaN` obligatorio en [id] |
