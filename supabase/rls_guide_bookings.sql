-- ============================================================
-- Políticas RLS para el Panel de Guía (Fase 8)
-- Ejecutar en Supabase SQL Editor ANTES de usar el panel de guía
-- ============================================================

-- Política para que guías puedan leer reservas de sus excursiones asignadas
CREATE POLICY "Guias pueden ver reservas de sus excursiones"
ON reservas FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM excursiones e
    JOIN usuarios u ON u.id_usuario = e.id_guia
    WHERE e.id_excursion = reservas.id_excursion
      AND u.supabase_auth_id = auth.uid()
  )
);

-- Política para que guías puedan actualizar el estado de reservas de sus excursiones
-- Solo permite cambiar a 'confirmada' o 'cancelada' (no a 'pendiente')
CREATE POLICY "Guias pueden actualizar estado de reservas de sus excursiones"
ON reservas FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM excursiones e
    JOIN usuarios u ON u.id_usuario = e.id_guia
    WHERE e.id_excursion = reservas.id_excursion
      AND u.supabase_auth_id = auth.uid()
  )
)
WITH CHECK (
  estado IN ('confirmada', 'cancelada')
);
