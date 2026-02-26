# ARCHITECTURE.md - Arquitectura de GranaTour Móvil

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | React Native + Expo SDK 54 |
| Lenguaje | TypeScript (strict) |
| Navegación | Expo Router (file-based routing) |
| Styling | NativeWind (Tailwind CSS para RN) |
| Estado global | Zustand |
| Backend/Auth | Supabase (PostgreSQL + Auth + Storage) |
| Mapas | react-native-maps (implementar en Fase 4) |
| GPS Tracking | expo-location + expo-task-manager (implementar en Fase 5) |
| Cámara | expo-image-picker (implementar en Fase 5) |
| Notificaciones | expo-notifications (implementar en Fase 9) |
| Animaciones | react-native-reanimated (ya incluido por template) |

## Estructura de Carpetas

```
granatour-movil/
├── app/                          # Expo Router - File-based routing
│   ├── _layout.tsx               # Root layout (providers, session listener)
│   ├── index.tsx                 # Redirect: si auth → tabs, si no → auth
│   ├── +not-found.tsx            # Pantalla 404
│   │
│   ├── (auth)/                   # Grupo: pantallas de autenticación
│   │   ├── _layout.tsx           # Layout auth (sin tabs, stack simple)
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   │
│   ├── (tabs)/                   # Grupo: navegación principal con tabs
│   │   ├── _layout.tsx           # Tab navigator (5 tabs)
│   │   ├── index.tsx             # Tab 1: Home/Feed
│   │   ├── explore.tsx           # Tab 2: Explorar excursiones
│   │   ├── activity.tsx          # Tab 3: Tracking GPS
│   │   ├── bookings.tsx          # Tab 4: Mis reservas
│   │   └── profile.tsx           # Tab 5: Perfil usuario
│   │
│   ├── excursion/                # Stack screens para excursiones
│   │   └── [id].tsx              # Detalle de excursión
│   │
│   └── booking/                  # Stack screens para reservas
│       └── [id].tsx              # Detalle de reserva
│
├── components/                   # Componentes reutilizables
│   ├── ui/                       # Componentes UI genéricos
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── LoadingSpinner.tsx
│   ├── ExcursionCard.tsx         # Tarjeta de excursión para listas
│   ├── BookingCard.tsx           # Tarjeta de reserva
│   ├── ReviewCard.tsx            # Tarjeta de review
│   ├── MapView.tsx               # Componente mapa (Fase 4)
│   └── ActivityTracker.tsx       # Widget tracking GPS (Fase 5)
│
├── stores/                       # Zustand stores
│   ├── authStore.ts              # Estado de autenticación y usuario
│   ├── excursionsStore.ts        # Excursiones, filtros, búsqueda
│   ├── bookingsStore.ts          # Reservas del usuario
│   ├── activityStore.ts          # Tracking GPS, actividades
│   └── reviewsStore.ts           # Valoraciones y reviews
│
├── lib/                          # Utilidades y configuración
│   ├── supabase.ts               # Cliente Supabase configurado
│   ├── types.ts                  # Interfaces TypeScript (mapean tablas DB)
│   ├── constants.ts              # Colores, theme, configuración
│   └── utils.ts                  # Funciones helper genéricas
│
├── hooks/                        # Custom hooks
│   ├── useAuth.ts                # Hook de autenticación
│   ├── useLocation.ts            # Hook de geolocalización
│   └── useSupabase.ts            # Hook genérico para queries
│
├── assets/                       # Imágenes, fuentes, etc.
│   ├── images/
│   └── fonts/
│
├── .env.example                  # Variables de entorno ejemplo
├── app.json                      # Configuración Expo
├── tailwind.config.js            # Configuración NativeWind/Tailwind
├── tsconfig.json                 # Configuración TypeScript
└── package.json
```

## Navegación

### Flujo de autenticación
```
App abierta
  └── ¿Hay sesión activa?
        ├── NO  → (auth)/login
        │         ├── Registrarse → (auth)/register
        │         └── Olvidé contraseña → (auth)/forgot-password
        │
        └── SÍ  → (tabs)/index (Home)
```

### Tab Navigator (5 tabs)
```
┌─────────┬───────────┬───────────┬──────────┬─────────┐
│  Inicio │  Explorar │ Actividad │ Reservas │  Perfil │
│  (home) │ (explore) │ (activity)│(bookings)│(profile)│
│   🏠    │    🔍     │    📍     │    📋    │   👤    │
└─────────┴───────────┴───────────┴──────────┴─────────┘
```

### Stack Screens (se abren sobre los tabs)
- `excursion/[id]` → Detalle de excursión (desde Explorar o Home)
- `booking/[id]` → Detalle de reserva (desde Reservas)

## Paleta de Colores

```typescript
// Colores principales de GranaTour
const COLORS = {
  // Primarios - Verde naturaleza
  primary: {
    50:  '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981', // Principal
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },

  // Secundarios - Granate (identidad corporativa GranaTour)
  secondary: {
    50:  '#FDF2F8',
    100: '#FCE7F3',
    200: '#FBCFE8',
    300: '#F9A8D4',
    400: '#F472B6',
    500: '#8B1E3F', // Principal (granate corporativo)
    600: '#7A1B38',
    700: '#691731',
    800: '#58132A',
    900: '#470F23',
  },

  // Neutros
  neutral: {
    50:  '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },

  // Funcionales
  success: '#10B981',
  warning: '#F59E0B',
  error:   '#EF4444',
  info:    '#3B82F6',

  // Background
  background: '#FAFAFA',
  surface:    '#FFFFFF',
  
  // Dificultad de excursiones
  difficulty: {
    facil:        '#10B981',
    moderada:     '#F59E0B',
    dificil:      '#F97316',
    muy_dificil:  '#EF4444',
  },
};
```

## Configuración Supabase

### Variables de entorno necesarias
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Cliente Supabase (lib/supabase.ts)
```typescript
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

## Patrones de Zustand

### Estructura base de un store
```typescript
import { create } from 'zustand';

interface ExcursionsState {
  // Estado
  excursiones: Excursion[];
  loading: boolean;
  error: string | null;
  
  // Acciones
  fetchExcursiones: () => Promise<void>;
  getExcursionById: (id: number) => Promise<Excursion | null>;
  clearError: () => void;
}

export const useExcursionsStore = create<ExcursionsState>((set, get) => ({
  excursiones: [],
  loading: false,
  error: null,
  
  fetchExcursiones: async () => {
    // Implementar en fases posteriores
  },
  getExcursionById: async (id) => {
    // Implementar en fases posteriores
    return null;
  },
  clearError: () => set({ error: null }),
}));
```

## Convenciones de Código

- **Idioma del código**: TypeScript en inglés (nombres de variables, funciones)
- **Idioma de UI**: Español (textos visibles al usuario)
- **Idioma de comentarios**: Español
- **Nombres de archivos**: kebab-case para carpetas, camelCase/PascalCase para componentes
- **Componentes**: Functional components con hooks, NUNCA class components
- **Exports**: Named exports para utilidades, default exports para componentes de página
- **Estilos**: NativeWind (className) como primera opción, StyleSheet solo si NativeWind no puede
