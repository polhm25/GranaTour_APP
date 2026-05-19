// Tab 2: Pantalla de exploración del catálogo de excursiones.
// Incluye toggle Lista/Mapa, barra de búsqueda con debounce, filtros y FlatList de resultados.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { ExcursionCard } from '@/components/ExcursionCard';
import { ExcursionMapView } from '@/components/MapView';
import { FilterSheet } from '@/components/ui/FilterSheet';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { COLORS } from '@/lib/constants';
import type { ExcursionConGuia } from '@/lib/types';
import { useExcursionsStore, type ExcursionFilters } from '@/stores/excursionsStore';

// Tiempo de debounce en ms para la búsqueda de texto
const SEARCH_DEBOUNCE_MS = 300;

type ViewMode = 'list' | 'map';

export default function ExploreScreen() {
  const router = useRouter();

  // ── Selector del store con useShallow para evitar re-renders innecesarios ──
  const { excursions, filters, loading, error, fetchExcursions, setFilters, setSearch, clearFilters, getFilteredExcursions } =
    useExcursionsStore(
      useShallow((state) => ({
        excursions: state.excursions,
        filters: state.filters,
        loading: state.loading,
        error: state.error,
        fetchExcursions: state.fetchExcursions,
        setFilters: state.setFilters,
        setSearch: state.setSearch,
        clearFilters: state.clearFilters,
        getFilteredExcursions: state.getFilteredExcursions,
      }))
    );

  // ── Estado local ─────────────────────────────────────────────────────────
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [searchInputValue, setSearchInputValue] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  // Excursión seleccionada en el mapa (muestra la card overlay)
  const [selectedExcursion, setSelectedExcursion] = useState<ExcursionConGuia | null>(null);

  // Ref para el timer de debounce
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Carga inicial: siempre refresca desde Supabase; la caché persiste como fallback visual ──
  useEffect(() => {
    fetchExcursions();
  }, []);

  // ── Limpieza del timer de debounce al desmontar ───────────────────────────
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // ── Búsqueda con debounce ─────────────────────────────────────────────────
  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchInputValue(text);

      // Cancela el timer anterior antes de crear uno nuevo
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        setSearch(text);
      }, SEARCH_DEBOUNCE_MS);
    },
    [setSearch]
  );

  // ── Filtros ───────────────────────────────────────────────────────────────

  // Cuenta cuántos filtros están activos para mostrar el badge
  function countActiveFilters(f: ExcursionFilters): number {
    let count = 0;
    if (f.dificultad) count += 1;
    if (f.maxPrice !== undefined) count += 1;
    if (f.zona) count += 1;
    if (f.fromDate) count += 1;
    return count;
  }

  const activeFilterCount = countActiveFilters(filters);

  function handleApplyFilters(newFilters: ExcursionFilters) {
    setFilters(newFilters);
    setFilterSheetVisible(false);
  }

  // ── Lista filtrada ────────────────────────────────────────────────────────
  // Memoizada para evitar recalcular en cada render ajeno a excursions/filtros/búsqueda
  const filteredExcursions = useMemo(
    () => getFilteredExcursions(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [excursions, filters, getFilteredExcursions]
  );

  // ── Selección en mapa: muestra la card overlay ────────────────────────────
  const handleMarkerPress = useCallback(
    (id: number) => {
      const excursion = filteredExcursions.find((e) => e.id_excursion === id) ?? null;
      setSelectedExcursion(excursion);
    },
    [filteredExcursions]
  );

  // ── Render de cada ítem ───────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: ExcursionConGuia }) => (
      <ExcursionCard
        excursion={item}
        onPress={() => router.push(`/excursion/${item.id_excursion}`)}
      />
    ),
    [router]
  );

  const keyExtractor = useCallback(
    (item: ExcursionConGuia) => String(item.id_excursion),
    []
  );

  // ── Elemento de cabecera de la lista (buscador + contador) ──────────────
  // Memoizado para evitar recrear el JSX en renders que no afectan al header
  const listHeader = useMemo(
    () => (
      <View className="pb-2 pt-3">
        {/* Barra de búsqueda */}
        <TextInput
          value={searchInputValue}
          onChangeText={handleSearchChange}
          placeholder="Buscar excursiones..."
          placeholderTextColor={COLORS.neutral[400]}
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={styles.searchInput}
        />

        {/* Contador de resultados */}
        <Text className="text-neutral-500 mt-2" style={styles.resultCount}>
          {filteredExcursions.length}{' '}
          {filteredExcursions.length === 1 ? 'excursión encontrada' : 'excursiones encontradas'}
        </Text>
      </View>
    ),
    [searchInputValue, filteredExcursions.length, handleSearchChange]
  );

  // ── Elemento de estado vacío ──────────────────────────────────────────────
  const emptyState = useMemo(
    () => (
      <View className="flex-1 items-center justify-center py-20 px-8">
        <View className="mb-2">
          <Ionicons name="search-outline" size={48} color={COLORS.neutral[400]} />
        </View>
        <Text className="text-neutral-700 font-semibold text-center mb-1" style={styles.emptyTitle}>
          No se encontraron excursiones
        </Text>
        <Text className="text-neutral-400 text-center mb-6" style={styles.emptySubtitle}>
          Prueba a cambiar los filtros o el término de búsqueda
        </Text>
        {(activeFilterCount > 0 || searchInputValue.trim().length > 0) && (
          <TouchableOpacity
            onPress={() => {
              clearFilters();
              setSearchInputValue('');
            }}
            className="bg-primary-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold" style={styles.clearButtonText}>
              Limpiar filtros
            </Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    [activeFilterCount, searchInputValue, clearFilters]
  );

  // ── Estado de error ───────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50">
        <View style={styles.headerRow} className="px-4 py-3 flex-row items-center justify-between bg-white border-b border-neutral-200">
          <Text className="text-neutral-800 font-bold" style={styles.screenTitle}>
            Explorar
          </Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-error text-center mb-4" style={styles.errorText}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={fetchExcursions}
            className="bg-primary-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold" style={styles.retryText}>
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render principal ──────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <OfflineBanner />
      {/* ── Header fijo ────────────────────────────────────────────────── */}
      <View
        className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-neutral-200"
        style={styles.headerRow}
      >
        <Text className="text-neutral-800 font-bold" style={styles.screenTitle}>
          Explorar
        </Text>

        {/* Acciones del header: toggle vista + filtros */}
        <View className="flex-row items-center">
          {/* Botón de alternancia Lista / Mapa */}
          <TouchableOpacity
            onPress={() => {
              setSelectedExcursion(null);
              setViewMode((m) => (m === 'list' ? 'map' : 'list'));
            }}
            style={styles.viewToggleButton}
            className="flex-row items-center"
          >
            <Ionicons
              name={viewMode === 'list' ? 'map-outline' : 'list-outline'}
              size={16}
              color={COLORS.primary[600]}
            />
            <Text className="text-primary-600 font-semibold ml-1" style={styles.viewToggleText}>
              {viewMode === 'list' ? 'Mapa' : 'Lista'}
            </Text>
          </TouchableOpacity>

          {/* Botón de filtros con badge de count activo */}
          <TouchableOpacity
            onPress={() => setFilterSheetVisible(true)}
            style={styles.filterButton}
            className="flex-row items-center"
          >
            <Ionicons name="options-outline" size={16} color={COLORS.primary[600]} />
            <Text className="text-primary-600 font-semibold ml-1" style={styles.filterButtonText}>
              Filtros
            </Text>

            {/* Badge numérico sobre el botón */}
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Loading centrado ───────────────────────────────────────────── */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
          <Text className="text-neutral-500 mt-3" style={styles.loadingText}>
            Cargando excursiones...
          </Text>
        </View>
      ) : viewMode === 'map' ? (
        /* ── Vista de mapa con overlay de card seleccionada ──────── */
        <View style={styles.mapContainer}>
          <ExcursionMapView
            excursions={filteredExcursions}
            onMarkerPress={handleMarkerPress}
            selectedId={selectedExcursion?.id_excursion}
            style={styles.fullMap}
          />

          {selectedExcursion && (
            <View style={styles.mapCardOverlay}>
              <TouchableOpacity
                style={styles.mapCardClose}
                onPress={() => setSelectedExcursion(null)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={18} color={COLORS.neutral[600]} />
              </TouchableOpacity>
              <ExcursionCard
                excursion={selectedExcursion}
                onPress={() => router.push(`/excursion/${selectedExcursion.id_excursion}`)}
              />
            </View>
          )}
        </View>
      ) : (
        /* ── FlatList principal ──────────────────────────────────────── */
        <FlatList
          data={filteredExcursions}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={emptyState}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}

      {/* ── Bottom sheet de filtros ────────────────────────────────────── */}
      <FilterSheet
        visible={filterSheetVisible}
        currentFilters={filters}
        onApply={handleApplyFilters}
        onClose={() => setFilterSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

// StyleSheet para los valores que NativeWind no puede expresar (tamaños numéricos exactos,
// posiciones absolutas del badge, etc.)
const styles = StyleSheet.create({
  headerRow: {
    minHeight: 52,
  },
  screenTitle: {
    fontSize: 22,
  },
  viewToggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginRight: 4,
  },
  viewToggleText: {
    fontSize: 14,
  },
  filterButton: {
    position: 'relative',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  filterButtonText: {
    fontSize: 15,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: COLORS.secondary[500],
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    color: COLORS.surface,
    fontSize: 10,
    fontWeight: '700',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: COLORS.neutral[300],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.neutral[800],
    backgroundColor: COLORS.surface,
  },
  resultCount: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  // Mapa a pantalla completa (ocupa todo el espacio bajo el header)
  fullMap: {
    flex: 1,
  },
  mapCardOverlay: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 12,
    right: 12,
  },
  mapCardClose: {
    alignSelf: 'flex-end',
    backgroundColor: '#fff',
    borderRadius: 20,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 16,
  },
  emptySubtitle: {
    fontSize: 14,
  },
  clearButtonText: {
    fontSize: 15,
  },
  errorText: {
    fontSize: 15,
  },
  retryText: {
    fontSize: 15,
  },
  loadingText: {
    fontSize: 14,
  },
});
