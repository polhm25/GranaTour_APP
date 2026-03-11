// Pantalla de detalle de excursión para guías:
// - Lista de reservas (pendiente/confirmada) con acciones de confirmar/cancelar
// - Botón "Iniciar excursión" que arranca el tracking GPS vinculado
// - Vista de participantes confirmados cuando el tracking está activo
import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  ListRenderItemInfo,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useShallow } from 'zustand/react/shallow';

import { useGuideStore } from '@/stores/guideStore';
import { useActivityStore } from '@/stores/activityStore';
import { COLORS } from '@/lib/constants';
import { formatDate, formatPrice } from '@/lib/utils';
import type { ReservaConCliente } from '@/stores/guideStore';
import type { EstadoReserva } from '@/lib/types';

// ─── Colores de badge por estado de reserva ───────────────────────────────────

const ESTADO_COLORS: Record<EstadoReserva, { bg: string; text: string; label: string }> = {
  pendiente: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pendiente' },
  confirmada: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Confirmada' },
  cancelada: { bg: 'bg-neutral-100', text: 'text-neutral-500', label: 'Cancelada' },
};

// ─── Tarjeta de reserva ───────────────────────────────────────────────────────

interface BookingCardProps {
  booking: ReservaConCliente;
  loadingUpdate: boolean;
  onConfirm: (booking: ReservaConCliente) => void;
  onCancel: (booking: ReservaConCliente) => void;
}

function BookingCard({ booking, loadingUpdate, onConfirm, onCancel }: BookingCardProps) {
  const colorConfig = ESTADO_COLORS[booking.estado];
  const clientName = booking.usuario
    ? `${booking.usuario.nombre} ${booking.usuario.ap1}`
    : 'Cliente';

  return (
    <View
      className="bg-white rounded-xl p-4 mb-3"
      style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }}
    >
      {/* Cabecera con nombre y badge de estado */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2 flex-1">
          <View className="w-8 h-8 rounded-full bg-primary-100 items-center justify-center">
            <Ionicons name="person" size={16} color={COLORS.primary[600]} />
          </View>
          <Text className="font-semibold text-neutral-900 text-sm flex-1" numberOfLines={1}>
            {clientName}
          </Text>
        </View>
        <View className={`rounded-full px-2.5 py-0.5 ${colorConfig.bg}`}>
          <Text className={`text-xs font-medium ${colorConfig.text}`}>{colorConfig.label}</Text>
        </View>
      </View>

      {/* Detalles de la reserva */}
      <View className="flex-row gap-4 mb-3">
        <View className="flex-row items-center gap-1">
          <Ionicons name="people-outline" size={13} color={COLORS.neutral[500]} />
          <Text className="text-xs text-neutral-600">
            {booking.num_personas} persona{booking.num_personas !== 1 ? 's' : ''}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Ionicons name="cash-outline" size={13} color={COLORS.neutral[500]} />
          <Text className="text-xs text-neutral-600">{formatPrice(booking.precio_total)}</Text>
        </View>
        {booking.notas ? (
          <View className="flex-row items-center gap-1 flex-1">
            <Ionicons name="document-text-outline" size={13} color={COLORS.neutral[500]} />
            <Text className="text-xs text-neutral-500 flex-1" numberOfLines={1}>
              {booking.notas}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Botones de acción (solo si la reserva no está ya cancelada) */}
      {booking.estado !== 'cancelada' && (
        <View className="flex-row gap-2">
          {booking.estado === 'pendiente' && (
            <Pressable
              onPress={() => onConfirm(booking)}
              disabled={loadingUpdate}
              className="flex-1 bg-primary-500 rounded-lg py-2 items-center"
              style={{ opacity: loadingUpdate ? 0.5 : 1 }}
            >
              <Text className="text-white text-xs font-semibold">
                {loadingUpdate ? 'Guardando…' : 'Confirmar'}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => onCancel(booking)}
            disabled={loadingUpdate}
            className="flex-1 bg-neutral-100 rounded-lg py-2 items-center"
            style={{ opacity: loadingUpdate ? 0.5 : 1 }}
          >
            <Text className="text-neutral-700 text-xs font-semibold">
              {loadingUpdate ? 'Guardando…' : 'Cancelar'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Tarjeta de participante (durante tracking activo) ────────────────────────

function ParticipantCard({ booking }: { booking: ReservaConCliente }) {
  const clientName = booking.usuario
    ? `${booking.usuario.nombre} ${booking.usuario.ap1}`
    : 'Participante';

  return (
    <View className="flex-row items-center bg-white rounded-xl p-3 mb-2"
      style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2 }}
    >
      <View className="w-9 h-9 rounded-full bg-emerald-100 items-center justify-center mr-3">
        <Ionicons name="person" size={18} color={COLORS.success} />
      </View>
      <View className="flex-1">
        <Text className="font-medium text-neutral-900 text-sm">{clientName}</Text>
        <Text className="text-xs text-neutral-500">
          {booking.num_personas} persona{booking.num_personas !== 1 ? 's' : ''}
        </Text>
      </View>
      <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function GuideExcursionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const excursionId = parseInt(id ?? '', 10);
  const isValidId = !isNaN(excursionId);

  // ── Datos del store de guía ───────────────────────────────────────────────
  const { excursionBookings, loadingBookings, loadingUpdate, error } = useGuideStore(
    useShallow((s) => ({
      excursionBookings: s.excursionBookings,
      loadingBookings: s.loadingBookings,
      loadingUpdate: s.loadingUpdate,
      error: s.error,
    }))
  );
  const fetchExcursionBookings = useGuideStore((s) => s.fetchExcursionBookings);
  const updateBookingStatus = useGuideStore((s) => s.updateBookingStatus);
  const clearError = useGuideStore((s) => s.clearError);
  // Excursión seleccionada del panel del guía (para mostrar nombre)
  const guideExcursion = useGuideStore((s) =>
    s.guideExcursions.find((e) => e.id_excursion === excursionId)
  );

  // ── Datos del store de actividad para tracking ────────────────────────────
  const { trackingActive, currentExcursionId, startingTracking } = useActivityStore(
    useShallow((s) => ({
      trackingActive: s.trackingActive,
      currentExcursionId: s.currentExcursionId,
      startingTracking: s.startingTracking,
    }))
  );
  const startTracking = useActivityStore((s) => s.startTracking);

  // Estado local de carga del botón iniciar
  const [startingLocal, setStartingLocal] = useState(false);

  // Tracking activo vinculado específicamente a esta excursión
  const isTrackingThisExcursion = trackingActive && currentExcursionId === excursionId;

  // Participantes confirmados (para mostrar durante el tracking)
  const participants = excursionBookings.filter((b) => b.estado === 'confirmada');
  // Reservas pendientes de confirmar
  const pendingBookings = excursionBookings.filter((b) => b.estado === 'pendiente');

  // ── Efectos ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isValidId) {
      fetchExcursionBookings(excursionId);
    }
  }, [excursionId, isValidId, fetchExcursionBookings]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      clearError();
    }
  }, [error, clearError]);

  // ── Manejadores ───────────────────────────────────────────────────────────

  // Confirmar una reserva pendiente
  const handleConfirm = useCallback(
    async (booking: ReservaConCliente) => {
      const clientName = booking.usuario
        ? `${booking.usuario.nombre} ${booking.usuario.ap1}`
        : 'este cliente';

      Alert.alert(
        'Confirmar reserva',
        `¿Confirmar la reserva de ${clientName}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Confirmar',
            onPress: async () => {
              await updateBookingStatus(
                booking.id_reserva,
                'confirmada',
                booking.num_personas,
                excursionId
              );
            },
          },
        ]
      );
    },
    [updateBookingStatus, excursionId]
  );

  // Cancelar una reserva
  const handleCancel = useCallback(
    (booking: ReservaConCliente) => {
      const clientName = booking.usuario
        ? `${booking.usuario.nombre} ${booking.usuario.ap1}`
        : 'este cliente';

      Alert.alert(
        'Cancelar reserva',
        `¿Cancelar la reserva de ${clientName}? Se devolverán las plazas a la excursión.`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Cancelar reserva',
            style: 'destructive',
            onPress: async () => {
              await updateBookingStatus(
                booking.id_reserva,
                'cancelada',
                booking.num_personas,
                excursionId
              );
            },
          },
        ]
      );
    },
    [updateBookingStatus, excursionId]
  );

  // Iniciar tracking GPS vinculado a esta excursión
  const handleStartTracking = useCallback(async () => {
    const excursionName = guideExcursion?.nombre_ruta ?? 'esta excursión';

    Alert.alert(
      'Iniciar excursión',
      `¿Iniciar el tracking GPS para "${excursionName}"?\n\nPodrás ver la ruta en tiempo real en la tab Actividad.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Iniciar',
          onPress: async () => {
            setStartingLocal(true);
            await startTracking(excursionId);
            setStartingLocal(false);
            // Navegar a la tab de actividad para ver el tracking en tiempo real
            router.replace('/(tabs)/activity');
          },
        },
      ]
    );
  }, [excursionId, guideExcursion, startTracking, router]);

  // Render de cada booking en la lista
  const renderBooking = useCallback(
    ({ item }: ListRenderItemInfo<ReservaConCliente>) => (
      <BookingCard
        booking={item}
        loadingUpdate={loadingUpdate}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    ),
    [loadingUpdate, handleConfirm, handleCancel]
  );

  const keyExtractor = useCallback((item: ReservaConCliente) => String(item.id_reserva), []);

  // ── Guardia de ID inválido ────────────────────────────────────────────────

  if (!isValidId) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 items-center justify-center p-6">
        <Text className="text-neutral-500">ID de excursión inválido</Text>
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isStarting = startingLocal || startingTracking;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      {/* Cabecera con botón volver */}
      <View className="px-4 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-neutral-100 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.neutral[700]} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-lg font-bold text-neutral-900" numberOfLines={1}>
            {guideExcursion?.nombre_ruta ?? 'Excursión'}
          </Text>
          {guideExcursion && (
            <Text className="text-xs text-neutral-500">
              {formatDate(guideExcursion.fecha_inicio)} · {guideExcursion.zona}
            </Text>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Banner de tracking activo */}
        {isTrackingThisExcursion && (
          <View className="mx-4 mb-4 bg-primary-500 rounded-2xl p-4 flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
              <Ionicons name="navigate" size={20} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-sm">Excursión en curso</Text>
              <Text className="text-white/80 text-xs">Tracking GPS activo</Text>
            </View>
            <Pressable
              onPress={() => router.replace('/(tabs)/activity')}
              className="bg-white/20 rounded-xl px-3 py-1.5"
            >
              <Text className="text-white text-xs font-medium">Ver mapa</Text>
            </Pressable>
          </View>
        )}

        {/* Botón iniciar excursión (solo si no hay tracking activo) */}
        {!trackingActive && (
          <Pressable
            onPress={handleStartTracking}
            disabled={isStarting}
            className="mx-4 mb-5 bg-primary-500 rounded-2xl py-4 flex-row items-center justify-center gap-2"
            style={{ opacity: isStarting ? 0.7 : 1 }}
          >
            {isStarting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="play-circle" size={22} color="white" />
            )}
            <Text className="text-white font-bold text-base">
              {isStarting ? 'Iniciando…' : 'Iniciar excursión'}
            </Text>
          </Pressable>
        )}

        {/* Sección: participantes confirmados (visible siempre, prominente durante tracking) */}
        <View className="px-4 mb-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-neutral-900">
              Participantes confirmados
            </Text>
            <View className="bg-emerald-100 rounded-full px-2.5 py-0.5">
              <Text className="text-xs font-semibold text-emerald-700">
                {participants.length}
              </Text>
            </View>
          </View>

          {loadingBookings ? (
            <ActivityIndicator size="small" color={COLORS.primary[500]} />
          ) : participants.length === 0 ? (
            <View className="items-center py-4">
              <Ionicons name="people-outline" size={32} color={COLORS.neutral[300]} />
              <Text className="text-sm text-neutral-400 mt-2">Ningún participante confirmado</Text>
            </View>
          ) : (
            participants.map((booking) => (
              <ParticipantCard key={booking.id_reserva} booking={booking} />
            ))
          )}
        </View>

        {/* Sección: reservas pendientes de confirmar */}
        {pendingBookings.length > 0 && (
          <View className="px-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-bold text-neutral-900">
                Reservas pendientes
              </Text>
              <View className="bg-amber-100 rounded-full px-2.5 py-0.5">
                <Text className="text-xs font-semibold text-amber-700">
                  {pendingBookings.length}
                </Text>
              </View>
            </View>

            {loadingBookings ? (
              <ActivityIndicator size="small" color={COLORS.primary[500]} />
            ) : (
              <FlatList
                data={pendingBookings}
                keyExtractor={keyExtractor}
                renderItem={renderBooking}
                scrollEnabled={false}
              />
            )}
          </View>
        )}

        {/* Estado vacío general */}
        {!loadingBookings && excursionBookings.length === 0 && (
          <View className="items-center py-8 px-4">
            <Ionicons name="calendar-outline" size={48} color={COLORS.neutral[300]} />
            <Text className="text-base font-semibold text-neutral-600 mt-3">
              Sin reservas
            </Text>
            <Text className="text-sm text-neutral-400 mt-1 text-center">
              Esta excursión aún no tiene reservas activas.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
