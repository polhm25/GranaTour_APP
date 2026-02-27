// Pantalla de recuperación de contraseña de GranaTour
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '@/stores/authStore';

// ─── Validación local ─────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return email.includes('@') && email.trim().length > 0;
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const { loading, error, resetPassword, clearError } = useAuthStore(
    useShallow((state) => ({
      loading: state.loading,
      error: state.error,
      resetPassword: state.resetPassword,
      clearError: state.clearError,
    }))
  );

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  // Indica que el enlace se envió correctamente
  const [sent, setSent] = useState(false);

  const handleEmailChange = useCallback(
    (text: string) => {
      setEmail(text);
      if (emailError) setEmailError(undefined);
      if (error) clearError();
    },
    [emailError, error, clearError]
  );

  function validate(): boolean {
    if (!email.trim()) {
      setEmailError('El email es obligatorio');
      return false;
    }
    if (!isValidEmail(email)) {
      setEmailError('Introduce un email válido');
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;

    clearError();
    try {
      await resetPassword(email.trim());
      // Solo mostramos confirmación si no hubo error
      setSent(true);
    } catch {
      // El error ya está en el store
    }
  }

  // ── Vista de confirmación enviada ─────────────────────────────────────────

  if (sent) {
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-neutral-50"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 items-center justify-center px-6">
          {/* Icono de email enviado */}
          <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-primary-100">
            <Text className="text-4xl">✉</Text>
          </View>

          <Text className="mb-3 text-center text-2xl font-bold text-neutral-800">
            Enlace enviado
          </Text>

          <View className="mb-8 rounded-xl bg-primary-50 px-5 py-4">
            <Text className="text-center text-sm leading-5 text-primary-700">
              Revisa tu email, te hemos enviado un enlace de recuperación. Si no lo ves, comprueba la carpeta de spam.
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.back()}
            className="w-full items-center rounded-xl bg-primary-500 py-4"
            accessibilityRole="button"
            accessibilityLabel="Volver al inicio de sesión"
          >
            <Text className="text-base font-semibold text-white">
              Volver al inicio de sesión
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── Formulario ────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-neutral-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-6">
        {/* Icono de candado */}
        <View className="mb-6 items-center">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-secondary-100">
            <Text className="text-4xl">🔒</Text>
          </View>
          <Text className="text-2xl font-bold text-neutral-800">
            Recuperar contraseña
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-neutral-500">
            Introduce tu email y te enviaremos un enlace para restablecer tu contraseña
          </Text>
        </View>

        {/* Campo email */}
        <View className="mb-4">
          <Text className="mb-1.5 text-sm font-medium text-neutral-700">Email</Text>
          <View
            className={`flex-row items-center rounded-xl border bg-white px-4 ${
              emailError ? 'border-red-400' : 'border-neutral-200'
            }`}
          >
            <TextInput
              className="flex-1 py-3.5 text-base text-neutral-800"
              value={email}
              onChangeText={handleEmailChange}
              placeholder="tu@email.com"
              placeholderTextColor="#A3A3A3"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>
          {emailError ? (
            <Text className="mt-1 text-xs text-red-500">{emailError}</Text>
          ) : null}
        </View>

        {/* Error del store */}
        {error ? (
          <View className="mb-4 rounded-lg bg-red-50 px-4 py-3">
            <Text className="text-sm text-red-600">{error}</Text>
          </View>
        ) : null}

        {/* Botón principal */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Enviar enlace de recuperación"
          className={`items-center rounded-xl py-4 ${
            loading ? 'bg-primary-300' : 'bg-primary-500'
          }`}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text className="text-base font-semibold text-white">Enviar enlace</Text>
          )}
        </TouchableOpacity>

        {/* Link para volver */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-5 items-center py-2"
        >
          <Text className="text-sm text-neutral-500">
            <Text className="font-semibold text-primary-600">Volver al inicio de sesión</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
