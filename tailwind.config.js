/** @type {import('tailwindcss').Config} */
module.exports = {
  // SU-03: stores/ eliminado de content, no genera clases CSS.
  content: [
    './app/**/*.{js,ts,tsx}',
    './components/**/*.{js,ts,tsx}',
    './hooks/**/*.{js,ts,tsx}',
  ],

  presets: [require('nativewind/preset')],

  theme: {
    extend: {
      colors: {
        // IM-04: Paleta completa de COLORS en lib/constants.ts.
        // Antes solo estaban primary y secondary; los demás no funcionaban como clases NativeWind.

        // Primarios - Verde naturaleza
        primary: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
        // Secundarios - Granate corporativo
        secondary: {
          50: '#FDF2F8',
          100: '#FCE7F3',
          200: '#FBCFE8',
          300: '#F9A8D4',
          400: '#F472B6',
          500: '#8B1E3F',
          600: '#7A1B38',
          700: '#691731',
          800: '#58132A',
          900: '#470F23',
        },
        // Neutros
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        // Funcionales
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        // Fondos
        background: '#FAFAFA',
        surface: '#FFFFFF',
        // Dificultad de excursiones
        difficulty: {
          facil: '#10B981',
          moderada: '#F59E0B',
          dificil: '#F97316',
          muy_dificil: '#EF4444',
        },
      },
    },
  },

  plugins: [],
};
