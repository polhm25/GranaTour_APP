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

> (pendiente de registrar)

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
