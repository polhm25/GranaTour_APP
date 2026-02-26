// Pantalla raíz: redirige según el estado de autenticación
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const session = useAuthStore((state) => state.session);
  // CR-01: Esperar a que getSession() resuelva antes de redirigir.
  // Sin esto, session es null en el primer render aunque el usuario esté autenticado.
  const initializing = useAuthStore((state) => state.initializing);

  if (initializing) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
