// Layout del tab navigator con 5 tabs principales
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, TAB_LABELS } from '@/lib/constants';

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
    </Tabs>
  );
}
