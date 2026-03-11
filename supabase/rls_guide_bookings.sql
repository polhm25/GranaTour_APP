-- ============================================================
-- Políticas RLS para el Panel de Guía (Fase 8)
-- Ejecutar en Supabase SQL Editor ANTES de usar el panel de guía
--
-- IDEMPOTENTE: usa DROP POLICY IF EXISTS antes de cada CREATE
-- para que el script pueda ejecutarse múltiples veces sin error.
-- ============================================================

-- ── Política SELECT: guías pueden leer reservas de sus excursiones ────────────

DROP POLICY IF EXISTS "Guias pueden ver reservas de sus excursiones" ON reservas;

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

-- ── Política UPDATE: guías pueden confirmar/cancelar reservas de sus excursiones

DROP POLICY IF EXISTS "Guias pueden actualizar estado de reservas de sus excursiones" ON reservas;

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
  -- El guía solo puede cambiar el estado a 'confirmada' o 'cancelada', nunca a 'pendiente'
  estado IN ('confirmada', 'cancelada')
);
