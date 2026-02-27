// Pantalla de inicio de sesión de GranaTour
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '@/stores/authStore';

// ─── Validaciones locales ─────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

// ─── Componente InputField local ──────────────────────────────────────────────

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  returnKeyType?: 'done' | 'next' | 'go' | 'search' | 'send';
  onSubmitEditing?: () => void;
  secureTextEntry?: boolean;
  rightElement?: React.ReactNode;
  autoComplete?: 'email' | 'password' | 'off';
}

function InputField({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  returnKeyType,
  onSubmitEditing,
  secureTextEntry = false,
  rightElement,
  autoComplete,
}: InputFieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-neutral-700">{label}</Text>
      <View
        className={`flex-row items-center rounded-xl border bg-white px-4 ${
          error ? 'border-red-400' : 'border-neutral-200'
        }`}
      >
        <TextInput
          className="flex-1 py-3.5 text-base text-neutral-800"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A3A3A3"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          secureTextEntry={secureTextEntry}
          autoComplete={autoComplete}
        />
        {rightElement}
      </View>
      {error ? (
        <Text className="mt-1 text-xs text-red-500">{error}</Text>
      ) : null}
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function LoginScreen() {
  const router = useRouter();

  // Selección superficial para evitar re-renders innecesarios
  const { loading, error, signIn, clearError } = useAuthStore(
    useShallow((state) => ({
      loading: state.loading,
      error: state.error,
      signIn: state.signIn,
      clearError: state.clearError,
    }))
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localErrors, setLocalErrors] = useState<{ email?: string; password?: string }>({});

  // Limpia errores del store al escribir en cualquier campo
  const handleEmailChange = useCallback(
    (text: string) => {
      setEmail(text);
      if (localErrors.email) setLocalErrors((prev) => ({ ...prev, email: undefined }));
      if (error) clearError();
    },
    [localErrors.email, error, clearError]
  );

  const handlePasswordChange = useCallback(
    (text: string) => {
      setPassword(text);
      if (localErrors.password) setLocalErrors((prev) => ({ ...prev, password: undefined }));
      if (error) clearError();
    },
    [localErrors.password, error, clearError]
  );

  // Validación local antes de llamar al store
  function validateForm(): boolean {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = 'El email es obligatorio';
    } else if (!isValidEmail(email)) {
      errors.email = 'Introduce un email válido';
    }

    if (!password) {
      errors.password = 'La contraseña es obligatoria';
    } else if (!isValidPassword(password)) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) return;

    clearError();
    try {
      await signIn(email.trim(), password);
      // Navegación al éxito: reemplaza el historial para que no se pueda volver al login
      router.replace('/(tabs)');
    } catch {
      // El error ya está en el store; no hace falta manejarlo aquí
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-neutral-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera con branding */}
        <View className="mb-10 items-center">
          <Text className="text-5xl font-bold text-secondary-500">GranaTour</Text>
          <Text className="mt-2 text-base text-neutral-500">
            Inicia sesión para continuar
          </Text>
        </View>

        {/* Formulario */}
        <View className="w-full">
          <InputField
            label="Email"
            value={email}
            onChangeText={handleEmailChange}
            error={localErrors.email}
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            autoComplete="email"
          />

          <InputField
            label="Contraseña"
            value={password}
            onChangeText={handlePasswordChange}
            error={localErrors.password}
            placeholder="Mínimo 6 caracteres"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            secureTextEntry={!showPassword}
            autoComplete="password"
            rightElement={
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                className="p-1"
                accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <Text className="text-sm text-neutral-500">
                  {showPassword ? 'Ocultar' : 'Ver'}
                </Text>
              </Pressable>
            }
          />

          {/* Link a recuperar contraseña */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            className="mb-6 self-end"
          >
            <Text className="text-sm text-primary-600">¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          {/* Error del store (errores de Supabase) */}
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
            accessibilityLabel="Iniciar sesión"
            className={`items-center rounded-xl py-4 ${
              loading ? 'bg-primary-300' : 'bg-primary-500'
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className="text-base font-semibold text-white">Iniciar sesión</Text>
            )}
          </TouchableOpacity>

          {/* Separador */}
          <View className="my-6 flex-row items-center">
            <View className="h-px flex-1 bg-neutral-200" />
            <Text className="mx-4 text-sm text-neutral-400">¿No tienes cuenta?</Text>
            <View className="h-px flex-1 bg-neutral-200" />
          </View>

          {/* Botón secundario: registrarse */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/register')}
            className="items-center rounded-xl border border-secondary-500 py-4"
          >
            <Text className="text-base font-semibold text-secondary-500">Crear cuenta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
