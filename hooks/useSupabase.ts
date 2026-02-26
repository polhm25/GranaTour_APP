// Hook genérico para queries a Supabase con manejo de estado
// IM-01: TArgs tipado con extends unknown[] preserva la seguridad de tipos en los argumentos.
import { useState, useCallback } from 'react';

interface UseSupabaseReturn<T, TArgs extends unknown[]> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: TArgs) => Promise<void>;
}

/**
 * Hook genérico que envuelve una query de Supabase con estado de carga y error.
 * @param queryFn - Función async que recibe argumentos tipados y devuelve el dato
 */
export function useSupabase<T, TArgs extends unknown[]>(
  queryFn: (...args: TArgs) => Promise<T>
): UseSupabaseReturn<T, TArgs> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (...args: TArgs) => {
      setLoading(true);
      setError(null);
      try {
        const result = await queryFn(...args);
        setData(result);
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : 'Error desconocido';
        setError(mensaje);
      } finally {
        setLoading(false);
      }
    },
    [queryFn]
  );

  return { data, loading, error, execute };
}
