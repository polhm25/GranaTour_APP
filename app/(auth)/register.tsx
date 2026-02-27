// Pantalla de registro de nueva cuenta en GranaTour
import { useState, useCallback, useRef } from 'react';
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
import type { SignUpData } from '@/stores/authStore';

// ─── Validaciones locales ─────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return email.includes('@') && email.trim().length > 0;
}

// Acepta DNI (8 dígitos + letra) o NIE (X/Y/Z + 7 dígitos + letra)
const DNI_REGEX = /^[0-9]{8}[A-Za-z]$/;
const NIE_REGEX = /^[XYZxyz][0-9]{7}[A-Za-z]$/;

function isValidDni(value: string): boolean {
  return DNI_REGEX.test(value) || NIE_REGEX.test(value);
}

// ─── Tipos locales de errores de validación ───────────────────────────────────

interface FormErrors {
  nombre?: string;
  ap1?: string;
  ap2?: string;
  dni?: string;
  email?: string;
  telefono?: string;
  password?: string;
  confirmPassword?: string;
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
  autoComplete?: 'email' | 'password' | 'off' | 'name' | 'tel';
  inputRef?: React.RefObject<TextInput | null>;
}

function InputField({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  returnKeyType = 'next',
  onSubmitEditing,
  secureTextEntry = false,
  rightElement,
  autoComplete,
  inputRef,
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
          ref={inputRef}
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

export default function RegisterScreen() {
  const router = useRouter();

  const { loading, error, signUp, clearError } = useAuthStore(
    useShallow((state) => ({
      loading: state.loading,
      error: state.error,
      signUp: state.signUp,
      clearError: state.clearError,
    }))
  );

  // Estado del formulario
  const [nombre, setNombre] = useState('');
  const [ap1, setAp1] = useState('');
  const [ap2, setAp2] = useState('');
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  // Muestra el mensaje de éxito en lugar del formulario
  const [submitted, setSubmitted] = useState(false);

  // Refs para saltar entre campos con el teclado
  const ap1Ref = useRef<TextInput>(null);
  const ap2Ref = useRef<TextInput>(null);
  const dniRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const telefonoRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Limpia el error inline del campo y el error del store al modificar cualquier campo
  function clearFieldError(field: keyof FormErrors) {
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    if (error) clearError();
  }

  const handleNombreChange = useCallback((text: string) => { setNombre(text); clearFieldError('nombre'); }, [error]);
  const handleAp1Change = useCallback((text: string) => { setAp1(text); clearFieldError('ap1'); }, [error]);
  const handleAp2Change = useCallback((text: string) => { setAp2(text); clearFieldError('ap2'); }, [error]);
  const handleDniChange = useCallback((text: string) => { setDni(text); clearFieldError('dni'); }, [error]);
  const handleEmailChange = useCallback((text: string) => { setEmail(text); clearFieldError('email'); }, [error]);
  const handleTelefonoChange = useCallback((text: string) => { setTelefono(text); clearFieldError('telefono'); }, [error]);
  const handlePasswordChange = useCallback((text: string) => { setPassword(text); clearFieldError('password'); }, [error]);
  const handleConfirmPasswordChange = useCallback((text: string) => { setConfirmPassword(text); clearFieldError('confirmPassword'); }, [error]);

  // Validación completa antes de enviar
  function validateForm(): boolean {
    const errors: FormErrors = {};

    if (!nombre.trim()) {
      errors.nombre = 'El nombre es obligatorio';
    }
    if (!ap1.trim()) {
      errors.ap1 = 'El primer apellido es obligatorio';
    }
    if (!dni.trim()) {
      errors.dni = 'El DNI/NIE es obligatorio';
    } else if (!isValidDni(dni.trim())) {
      errors.dni = 'El DNI/NIE no tiene un formato válido (ej: 12345678A o X1234567A)';
    }
    if (!email.trim()) {
      errors.email = 'El email es obligatorio';
    } else if (!isValidEmail(email)) {
      errors.email = 'Introduce un email válido';
    }
    if (!password) {
      errors.password = 'La contraseña es obligatoria';
    } else if (password.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Confirma tu contraseña';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) return;

    clearError();

    const signUpData: SignUpData = {
      email: email.trim(),
      password,
      nombre: nombre.trim(),
      ap1: ap1.trim(),
      ap2: ap2.trim() || undefined,
      dni: dni.trim().toUpperCase(),
      telefono: telefono.trim() || undefined,
    };

    try {
      await signUp(signUpData);
      // Registro exitoso: Supabase requiere confirmación de email
      setSubmitted(true);
    } catch {
      // El error ya está en el store
    }
  }

  // ── Vista de éxito ────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 px-6">
        <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-primary-100">
          <Text className="text-4xl">✓</Text>
        </View>
        <Text className="mb-3 text-center text-2xl font-bold text-neutral-800">
          ¡Cuenta creada!
        </Text>
        <Text className="mb-8 text-center text-base text-neutral-500">
          Revisa tu email para confirmar tu cuenta antes de iniciar sesión.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          className="w-full items-center rounded-xl bg-primary-500 py-4"
          accessibilityRole="button"
        >
          <Text className="text-base font-semibold text-white">Ir a iniciar sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Formulario ────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-neutral-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerClassName="px-6 py-10"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera */}
        <View className="mb-8">
          <Text className="text-3xl font-bold text-neutral-800">Crear cuenta</Text>
          <Text className="mt-1 text-base text-neutral-500">Únete a GranaTour</Text>
        </View>

        {/* Campos del formulario */}
        <InputField
          label="Nombre"
          value={nombre}
          onChangeText={handleNombreChange}
          error={formErrors.nombre}
          placeholder="Tu nombre"
          autoCapitalize="words"
          autoComplete="name"
          onSubmitEditing={() => ap1Ref.current?.focus()}
        />

        <InputField
          label="Primer apellido"
          value={ap1}
          onChangeText={handleAp1Change}
          error={formErrors.ap1}
          placeholder="Tu primer apellido"
          autoCapitalize="words"
          onSubmitEditing={() => ap2Ref.current?.focus()}
          inputRef={ap1Ref}
        />

        <InputField
          label="Segundo apellido (opcional)"
          value={ap2}
          onChangeText={handleAp2Change}
          error={formErrors.ap2}
          placeholder="Tu segundo apellido"
          autoCapitalize="words"
          onSubmitEditing={() => dniRef.current?.focus()}
          inputRef={ap2Ref}
        />

        <InputField
          label="DNI / NIE"
          value={dni}
          onChangeText={handleDniChange}
          error={formErrors.dni}
          placeholder="12345678A"
          autoCapitalize="characters"
          onSubmitEditing={() => emailRef.current?.focus()}
          inputRef={dniRef}
        />

        <InputField
          label="Email"
          value={email}
          onChangeText={handleEmailChange}
          error={formErrors.email}
          placeholder="tu@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          onSubmitEditing={() => telefonoRef.current?.focus()}
          inputRef={emailRef}
        />

        <InputField
          label="Teléfono (opcional)"
          value={telefono}
          onChangeText={handleTelefonoChange}
          error={formErrors.telefono}
          placeholder="+34 600 000 000"
          keyboardType="phone-pad"
          autoComplete="tel"
          onSubmitEditing={() => passwordRef.current?.focus()}
          inputRef={telefonoRef}
        />

        <InputField
          label="Contraseña"
          value={password}
          onChangeText={handlePasswordChange}
          error={formErrors.password}
          placeholder="Mínimo 6 caracteres"
          returnKeyType="next"
          onSubmitEditing={() => confirmPasswordRef.current?.focus()}
          secureTextEntry={!showPassword}
          autoComplete="password"
          inputRef={passwordRef}
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

        <InputField
          label="Confirmar contraseña"
          value={confirmPassword}
          onChangeText={handleConfirmPasswordChange}
          error={formErrors.confirmPassword}
          placeholder="Repite tu contraseña"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          secureTextEntry={!showConfirmPassword}
          inputRef={confirmPasswordRef}
          rightElement={
            <Pressable
              onPress={() => setShowConfirmPassword((prev) => !prev)}
              className="p-1"
              accessibilityLabel={
                showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
              }
            >
              <Text className="text-sm text-neutral-500">
                {showConfirmPassword ? 'Ocultar' : 'Ver'}
              </Text>
            </Pressable>
          }
        />

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
          accessibilityLabel="Crear cuenta"
          className={`mt-2 items-center rounded-xl py-4 ${
            loading ? 'bg-primary-300' : 'bg-primary-500'
          }`}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text className="text-base font-semibold text-white">Crear cuenta</Text>
          )}
        </TouchableOpacity>

        {/* Link a login */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-5 items-center py-2"
        >
          <Text className="text-sm text-neutral-500">
            ¿Ya tienes cuenta?{' '}
            <Text className="font-semibold text-primary-600">Inicia sesión</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
