// Pantalla de detalle de una excursión (placeholder - implementar en Fase 2)
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function ExcursionDetailScreen() {
  // IM-05: useLocalSearchParams puede devolver string | string[]; tomamos el primero si es array.
  const params = useLocalSearchParams<{ id: string }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const excursionId = rawId ? parseInt(rawId, 10) : null;

  if (!excursionId || isNaN(excursionId)) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-lg text-red-500">Excursión no encontrada</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold text-gray-800">Detalle de excursión</Text>
      <Text className="mt-2 text-gray-500">ID: {excursionId}</Text>
      <Text className="mt-1 text-gray-400">Fase 2</Text>
    </View>
  );
}
