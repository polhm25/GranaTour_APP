-- RPC: recalcular_valoracion_guia
-- Recalcula la valoración media del guía asociado a una excursión
-- a partir de todas las reviews de sus excursiones.
--
-- SECURITY DEFINER: se ejecuta con los permisos del owner (postgres),
-- permitiendo UPDATE en la tabla usuarios sin restricciones RLS.
--
-- Ejecutar en Supabase SQL Editor antes de usar la Fase 7 de la app móvil.

CREATE OR REPLACE FUNCTION recalcular_valoracion_guia(p_id_excursion INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_guia     INTEGER;
  v_media       NUMERIC;
  v_excursion_ids INTEGER[];
BEGIN
  -- Obtener el guía de la excursión indicada
  SELECT id_guia INTO v_id_guia
  FROM excursiones
  WHERE id_excursion = p_id_excursion;

  IF v_id_guia IS NULL THEN
    RETURN;
  END IF;

  -- Obtener todos los ids de excursiones del guía
  SELECT ARRAY_AGG(id_excursion) INTO v_excursion_ids
  FROM excursiones
  WHERE id_guia = v_id_guia;

  IF v_excursion_ids IS NULL THEN
    RETURN;
  END IF;

  -- Calcular la media de puntuaciones de todas las reviews de esas excursiones
  SELECT ROUND(AVG(puntuacion)::NUMERIC, 2) INTO v_media
  FROM reviews
  WHERE id_excursion = ANY(v_excursion_ids);

  -- Actualizar el campo valoracion del guía
  UPDATE usuarios
  SET valoracion = v_media
  WHERE id_usuario = v_id_guia;
END;
$$;

-- Permitir que usuarios anónimos y autenticados llamen a esta función
GRANT EXECUTE ON FUNCTION recalcular_valoracion_guia(INTEGER) TO anon, authenticated;
