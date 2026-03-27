// Banner visual que indica el estado de conectividad de red
import { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { useOfflineStore } from '@/stores/offlineStore';

export function OfflineBanner() {
  const isOnline = useOfflineStore((state) => state.isOnline);
  const pendingCount = useOfflineStore((state) => state.pendingActions.length);
  const syncing = useOfflineStore((state) => state.syncing);

  // Animación de opacidad para entrada/salida suave del banner
  const opacity = useRef(new Animated.Value(0)).current;
  // Controla si el banner debe mostrarse (offline o sincronizando)
  const shouldShow = !isOnline || syncing;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: shouldShow ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [shouldShow, opacity]);

  if (isOnline && !syncing) return null;

  // Mensaje según el estado actual
  let mensaje = 'Sin conexión · Mostrando datos en caché';
  if (syncing) {
    mensaje = 'Sincronizando reservas pendientes…';
  } else if (pendingCount > 0) {
    mensaje = `Sin conexión · ${pendingCount} reserva${pendingCount > 1 ? 's' : ''} pendiente${pendingCount > 1 ? 's' : ''}`;
  }

  return (
    <Animated.View style={{ opacity }}>
      <View className="bg-warning px-4 py-2 flex-row items-center justify-center">
        <Text className="text-white text-xs font-semibold text-center">
          {mensaje}
        </Text>
      </View>
    </Animated.View>
  );
}
