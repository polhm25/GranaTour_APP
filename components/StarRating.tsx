// Componente de valoración por estrellas — usado en reviews y listados de excursiones
import { COLORS } from '@/lib/constants';
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

interface StarRatingProps {
  /** Valor actual de la valoración (1-5, acepta decimales en modo display) */
  value: number;
  /** Si se proporciona, el componente se vuelve interactivo */
  onChange?: (value: number) => void;
  /** Tamaño en px de cada estrella. Default: 24 */
  size?: number;
  /** Color de las estrellas activas. Default: amber (#F59E0B) */
  color?: string;
  /** Color de las estrellas vacías. Default: neutral-300 */
  emptyColor?: string;
  /** Mostrar el valor numérico junto a las estrellas. Default: false */
  showValue?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Carácter de estrella llena y vacía
const STAR_FILLED = '★';
const STAR_EMPTY = '☆';

export function StarRating({
  value,
  onChange,
  size = 24,
  color = COLORS.warning,
  emptyColor = COLORS.neutral[300],
  showValue = false,
  style,
}: StarRatingProps) {
  // Truncar (no redondear) para determinar cuántas estrellas se muestran llenas
  const filledCount = Math.floor(value);
  const isInteractive = typeof onChange === 'function';

  return (
    <View style={[styles.container, style]}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= filledCount;
        const starChar = isFilled ? STAR_FILLED : STAR_EMPTY;
        const starColor = isFilled ? color : emptyColor;

        if (isInteractive) {
          return (
            <TouchableOpacity
              key={star}
              onPress={() => onChange?.(star)}
              activeOpacity={0.7}
              // Área táctil explícita para facilitar la pulsación
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text style={{ fontSize: size, color: starColor, lineHeight: size + 4 }}>
                {starChar}
              </Text>
            </TouchableOpacity>
          );
        }

        // Modo solo lectura: sin envoltura interactiva
        return (
          <Text
            key={star}
            style={{ fontSize: size, color: starColor, lineHeight: size + 4 }}
          >
            {starChar}
          </Text>
        );
      })}

      {/* Valor numérico opcional junto a las estrellas */}
      {showValue && (
        <Text style={styles.valueText}>{value.toFixed(1)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  valueText: {
    fontSize: 13,
    color: COLORS.neutral[500],
    marginLeft: 4,
    fontWeight: '600',
  },
});
