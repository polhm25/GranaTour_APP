// Hook para detectar el estado de conectividad de red
import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useOfflineStore } from '@/stores/offlineStore';

// Determina si el dispositivo tiene conexión real a internet.
// isInternetReachable puede ser null al inicio → lo tratamos como online (optimista)
function isConnected(isConn: boolean | null, isReachable: boolean | null): boolean {
  if (isConn === false) return false;
  if (isReachable === false) return false;
  return true;
}

export function useNetworkState(): { isOnline: boolean } {
  const isOnline = useOfflineStore((state) => state.isOnline);
  const setOnlineStatus = useOfflineStore((state) => state.setOnlineStatus);

  useEffect(() => {
    // Comprobar estado inicial de la red
    NetInfo.fetch().then((state) => {
      setOnlineStatus(isConnected(state.isConnected, state.isInternetReachable));
    });

    // Suscribirse a cambios de conectividad
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnlineStatus(isConnected(state.isConnected, state.isInternetReachable));
    });

    return unsubscribe;
  }, [setOnlineStatus]);

  return { isOnline };
}
