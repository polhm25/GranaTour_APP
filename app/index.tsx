// Pantalla raíz: muestra siempre el onboarding y redirige según autenticación
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const initializing = useAuthStore((state) => state.initializing);

  if (initializing) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return <Redirect href={'/onboarding' as never} />;
}
