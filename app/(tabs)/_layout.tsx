// Layout del tab navigator. Muestra 5 tabs para todos los usuarios
// y un tab extra "Guía" solo cuando el usuario tiene rol 'guia'.
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, TAB_LABELS } from '@/lib/constants';
import { useAuthStore } from '@/stores/authStore';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  label: string;
  iconActive: IoniconName;
  iconInactive: IoniconName;
}

const TABS: TabConfig[] = [
  {
    name: 'index',
    label: TAB_LABELS.home,
    iconActive: 'home',
    iconInactive: 'home-outline',
  },
  {
    name: 'explore',
    label: TAB_LABELS.explore,
    iconActive: 'search',
    iconInactive: 'search-outline',
  },
  {
    name: 'activity',
    label: TAB_LABELS.activity,
    iconActive: 'location',
    iconInactive: 'location-outline',
  },
  {
    name: 'bookings',
    label: TAB_LABELS.bookings,
    iconActive: 'calendar',
    iconInactive: 'calendar-outline',
  },
  {
    name: 'profile',
    label: TAB_LABELS.profile,
    iconActive: 'person',
    iconInactive: 'person-outline',
  },
];

export default function TabsLayout() {
  // Leer rol directamente del store (sin useShallow porque solo es un campo)
  const userRole = useAuthStore((state) => state.user?.rol);
  const isGuide = userRole === 'guia';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary[500],
        tabBarInactiveTintColor: COLORS.neutral[400],
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.neutral[200],
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.iconActive : tab.iconInactive}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}

      {/* Tab de guía: visible solo para usuarios con rol 'guia'. */}
      {/* href: null oculta el tab completamente de la barra de navegación. */}
      <Tabs.Screen
        name="guide"
        options={{
          href: isGuide ? undefined : null,
          title: TAB_LABELS.guide,
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? 'briefcase' : 'briefcase-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
