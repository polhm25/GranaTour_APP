// Modal bottom-sheet de filtros para la pantalla Explorar.
// Permite filtrar excursiones por dificultad, precio máximo y zona.
// Mantiene una copia local del estado que solo se aplica al pulsar "Aplicar".

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { ExcursionFilters } from '@/stores/excursionsStore';
import type { DificultadExcursion } from '@/lib/types';
import { getDifficultyColor } from '@/lib/utils';
import { COLORS } from '@/lib/constants';

// Opciones de dificultad con etiquetas en español
const DIFFICULTY_OPTIONS: { value: DificultadExcursion; label: string }[] = [
  { value: 'facil', label: 'Fácil' },
  { value: 'moderada', label: 'Moderada' },
  { value: 'dificil', label: 'Difícil' },
  { value: 'muy_dificil', label: 'Muy difícil' },
];

interface FilterSheetProps {
  visible: boolean;
  currentFilters: ExcursionFilters;
  onApply: (filters: ExcursionFilters) => void;
  onClose: () => void;
}

export function FilterSheet({ visible, currentFilters, onApply, onClose }: FilterSheetProps) {
  // ── Estado local (copia de los filtros) ─────────────────────────────────────
  // Se sincroniza con currentFilters cada vez que el sheet se abre.
  const [selectedDifficulty, setSelectedDifficulty] = useState<DificultadExcursion | undefined>(
    currentFilters.dificultad,
  );
  const [maxPriceText, setMaxPriceText] = useState<string>(
    currentFilters.maxPrice !== undefined ? String(currentFilters.maxPrice) : '',
  );
  const [zonaText, setZonaText] = useState<string>(currentFilters.zona ?? '');

  // Sincroniza el estado local cuando el modal se vuelve visible
  useEffect(() => {
    if (visible) {
      setSelectedDifficulty(currentFilters.dificultad);
      setMaxPriceText(
        currentFilters.maxPrice !== undefined ? String(currentFilters.maxPrice) : '',
      );
      setZonaText(currentFilters.zona ?? '');
    }
  }, [visible, currentFilters]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  // Selecciona una dificultad o la deselecciona si ya estaba activa
  function handleDifficultyPress(value: DificultadExcursion) {
    setSelectedDifficulty((prev) => (prev === value ? undefined : value));
  }

  // Resetea todos los filtros locales al estado vacío
  function handleClear() {
    setSelectedDifficulty(undefined);
    setMaxPriceText('');
    setZonaText('');
  }

  // Construye el objeto ExcursionFilters y llama a onApply, luego cierra
  function handleApply() {
    const parsedMaxPrice = maxPriceText.trim() ? parseFloat(maxPriceText) : undefined;

    const newFilters: ExcursionFilters = {
      dificultad: selectedDifficulty,
      maxPrice:
        parsedMaxPrice !== undefined && !isNaN(parsedMaxPrice)
          ? parsedMaxPrice
          : undefined,
      zona: zonaText.trim() || undefined,
    };

    onApply(newFilters);
    onClose();
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      {/* Fondo semitransparente: toca fuera para cerrar */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Contenido del sheet — ocupa la mitad inferior */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'position' : undefined}
        style={styles.sheetWrapper}
      >
        <View className="bg-white rounded-t-2xl" style={styles.sheet}>
          {/* ── Header ─────────────────────────────────────────────────── */}
          <View className="flex-row items-center justify-between px-5 pt-5 pb-4">
            <Text className="text-neutral-800 font-bold" style={styles.headerTitle}>
              Filtros
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={styles.hitSlop}>
              <Text className="text-neutral-500" style={styles.closeIcon}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          {/* Separador */}
          <View className="bg-neutral-200" style={styles.separator} />

          {/* ── Sección Dificultad ──────────────────────────────────────── */}
          <View className="px-5 pt-4 pb-2">
            <Text className="text-neutral-700 font-semibold mb-3" style={styles.sectionTitle}>
              Dificultad
            </Text>
            <View className="flex-row flex-wrap" style={styles.pillsRow}>
              {DIFFICULTY_OPTIONS.map(({ value, label }) => {
                const isActive = selectedDifficulty === value;
                // Color del badge activo según la dificultad
                const activeColor = getDifficultyColor(value);

                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() => handleDifficultyPress(value)}
                    style={[
                      styles.pill,
                      isActive
                        ? { backgroundColor: activeColor, borderColor: activeColor }
                        : styles.pillInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        { color: isActive ? COLORS.surface : COLORS.neutral[600] },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Sección Precio máximo ───────────────────────────────────── */}
          <View className="px-5 pt-3 pb-2">
            <Text className="text-neutral-700 font-semibold mb-2" style={styles.sectionTitle}>
              Precio máximo
            </Text>
            <TextInput
              value={maxPriceText}
              onChangeText={setMaxPriceText}
              keyboardType="numeric"
              placeholder="Sin límite"
              placeholderTextColor={COLORS.neutral[400]}
              style={styles.textInput}
              returnKeyType="done"
            />
          </View>

          {/* ── Sección Zona ─────────────────────────────────────────────── */}
          <View className="px-5 pt-3 pb-5">
            <Text className="text-neutral-700 font-semibold mb-2" style={styles.sectionTitle}>
              Zona
            </Text>
            <TextInput
              value={zonaText}
              onChangeText={setZonaText}
              placeholder="Todas las zonas"
              placeholderTextColor={COLORS.neutral[400]}
              autoCapitalize="words"
              style={styles.textInput}
              returnKeyType="done"
            />
          </View>

          {/* Separador */}
          <View className="bg-neutral-200" style={styles.separator} />

          {/* ── Footer: botones Limpiar y Aplicar ──────────────────────── */}
          <View className="flex-row px-5 py-4" style={styles.footer}>
            {/* Botón Limpiar — outlined neutral */}
            <TouchableOpacity
              onPress={handleClear}
              style={styles.clearButton}
            >
              <Text className="text-neutral-600 font-semibold" style={styles.buttonText}>
                Limpiar
              </Text>
            </TouchableOpacity>

            {/* Botón Aplicar — filled primary */}
            <TouchableOpacity
              onPress={handleApply}
              className="bg-primary-500"
              style={styles.applyButton}
            >
              <Text className="text-white font-semibold" style={styles.buttonText}>
                Aplicar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// StyleSheet para los valores que NativeWind no puede expresar (colores dinámicos,
// dimensiones calculadas en tiempo de ejecución, etc.)
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    // La sombra superior le da profundidad al sheet
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 12,
  },
  headerTitle: {
    fontSize: 18,
  },
  closeIcon: {
    fontSize: 18,
  },
  hitSlop: {
    top: 12,
    right: 12,
    bottom: 12,
    left: 12,
  },
  separator: {
    height: 1,
  },
  sectionTitle: {
    fontSize: 14,
  },
  pillsRow: {
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 4,
  },
  pillInactive: {
    backgroundColor: COLORS.neutral[100],
    borderColor: COLORS.neutral[300],
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.neutral[300],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.neutral[800],
    backgroundColor: COLORS.neutral[50],
  },
  footer: {
    gap: 12,
  },
  clearButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.neutral[300],
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
  },
});
