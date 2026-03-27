// Pantalla raíz: comprueba onboarding y redirige según el estado de autenticación
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/authStore';
import { ONBOARDING_KEY } from '@/app/onboarding';

export default function Index() {
  const session = useAuthStore((state) => state.session);
  // CR-01: Esperar a que getSession() resuelva antes de redirigir.
  const initializing = useAuthStore((state) => state.initializing);

  // Estado de comprobación del onboarding
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  // Comprobar si el usuario ya ha visto el onboarding
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setOnboardingDone(val === 'true');
      setOnboardingChecked(true);
    });
  }, []);

  // Mostrar spinner mientras se resuelven los estados asíncronos
  if (initializing || !onboardingChecked) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  // Primera vez: mostrar onboarding
  // Nota: el tipo de href se regenera al ejecutar npx expo start; cast necesario hasta entonces
  if (!onboardingDone) {
    return <Redirect href={'/onboarding' as never} />;
  }

  // Usuario autenticado: ir a las tabs
  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  // Sin sesión: ir a login
  return <Redirect href="/(auth)/login" />;
}
