// Pantalla de detalle de una reserva (placeholder - implementar en Fase 3)
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function BookingDetailScreen() {
  // IM-05: useLocalSearchParams puede devolver string | string[]; tomamos el primero si es array.
  const params = useLocalSearchParams<{ id: string }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const bookingId = rawId ? parseInt(rawId, 10) : null;

  if (!bookingId || isNaN(bookingId)) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-lg text-red-500">Reserva no encontrada</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold text-gray-800">Detalle de reserva</Text>
      <Text className="mt-2 text-gray-500">ID: {bookingId}</Text>
      <Text className="mt-1 text-gray-400">Fase 3</Text>
    </View>
  );
}
