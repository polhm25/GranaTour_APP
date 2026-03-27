// Banner visual que indica el estado de conectividad de red
import { useEffect, useRef, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import { useOfflineStore } from '@/stores/offlineStore';

export function OfflineBanner() {
  const isOnline = useOfflineStore((state) => state.isOnline);
  const pendingCount = useOfflineStore((state) => state.pendingActions.length);
  const syncing = useOfflineStore((state) => state.syncing);

  const shouldShow = !isOnline || syncing;

  // Animación de opacidad para entrada/salida suave del banner
  const opacity = useRef(new Animated.Value(0)).current;
  // visible controla el montaje del nodo: se desmonta DESPUÉS de que termina el fade-out
  const [visible, setVisible] = useState(shouldShow);

  useEffect(() => {
    if (shouldShow) {
      // Mostrar: montar primero, luego animar a opacidad 1
      setVisible(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Ocultar: animar a opacidad 0 y desmontar al terminar
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setVisible(false);
      });
    }
  }, [shouldShow, opacity]);

  if (!visible) return null;

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
