// Tarjeta que muestra una review individual con avatar, estrellas, comentario y acciones
import { StarRating } from '@/components/StarRating';
import { COLORS } from '@/lib/constants';
import { ReviewConUsuario } from '@/lib/types';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface ReviewCardProps {
  review: ReviewConUsuario;
  /** true si es la review del usuario autenticado */
  isOwn?: boolean;
  /** Callback para editar la review (solo disponible si isOwn=true) */
  onEdit?: () => void;
  /** Callback para eliminar la review (solo disponible si isOwn=true) */
  onDelete?: () => void;
}

export function ReviewCard({ review, isOwn = false, onEdit, onDelete }: ReviewCardProps) {
  // Formatear la fecha en español: "12 de marzo de 2025"
  const formattedDate = new Date(review.fecha).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Obtener la inicial del nombre para el avatar placeholder
  const nameInitial = (review.usuario?.nombre ?? 'U')[0].toUpperCase();

  // Construir el nombre completo del autor
  const authorName =
    review.usuario
      ? `${review.usuario.nombre} ${review.usuario.ap1}`
      : 'Usuario';

  return (
    <View className="bg-white rounded-xl p-4 mb-3 border border-neutral-100">
      {/* Cabecera: avatar + nombre + fecha + badge propio */}
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-row items-center flex-1">
          {/* Avatar circular o placeholder con inicial */}
          <View style={styles.avatarContainer}>
            {review.usuario?.avatar_url ? (
              <Image
                source={{ uri: review.usuario.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>{nameInitial}</Text>
              </View>
            )}
          </View>

          {/* Nombre del autor y fecha */}
          <View className="ml-3 flex-1">
            <Text
              className="text-neutral-800 font-semibold"
              style={styles.userName}
              numberOfLines={1}
            >
              {authorName}
            </Text>
            <Text className="text-neutral-400" style={styles.dateText}>
              {formattedDate}
            </Text>
          </View>
        </View>

        {/* Badge "Mi valoración" solo si la review es del usuario autenticado */}
        {isOwn && (
          <View className="bg-primary-50 rounded-full px-2 py-0.5">
            <Text className="text-primary-700" style={styles.ownBadge}>
              Mi valoración
            </Text>
          </View>
        )}
      </View>

      {/* Estrellas de la puntuación */}
      <StarRating value={review.puntuacion} size={18} />

      {/* Comentario (opcional) */}
      {review.comentario ? (
        <Text className="text-neutral-600 mt-2" style={styles.comment}>
          {review.comentario}
        </Text>
      ) : null}

      {/* Botones de acción: editar y/o eliminar (solo para review propia) */}
      {isOwn && (onEdit || onDelete) && (
        <View className="flex-row justify-end mt-3 gap-3">
          {onEdit && (
            <TouchableOpacity onPress={onEdit} activeOpacity={0.7}>
              <Text className="text-primary-600 font-medium" style={styles.actionBtn}>
                Editar
              </Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={onDelete} activeOpacity={0.7}>
              <Text className="text-error font-medium" style={styles.actionBtn}>
                Eliminar
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    width: 40,
    height: 40,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary[600],
  },
  userName: {
    fontSize: 14,
  },
  dateText: {
    fontSize: 12,
    marginTop: 1,
  },
  ownBadge: {
    fontSize: 11,
  },
  comment: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionBtn: {
    fontSize: 13,
  },
});
