-- ============================================================
-- Migration 004: Fix loyalty level thresholds
-- NEOPHYTE: 0-249 pts
-- CREW:     250-699 pts
-- HIGH CREW: 700-1199 pts
-- FOUNDERS:  1200+ pts
-- ============================================================

-- 1. Update the trigger function with correct thresholds
create or replace function public.actualizar_nivel()
returns trigger language plpgsql as $$
begin
  if new.puntos >= 1200 then
    new.nivel := 'FOUNDERS';
  elsif new.puntos >= 700 then
    new.nivel := 'HIGH CREW';
  elsif new.puntos >= 250 then
    new.nivel := 'CREW';
  else
    new.nivel := 'NEOPHYTE';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- 2. Re-calculate nivel for all existing members to match new thresholds
UPDATE public.crew_members
SET nivel = CASE
  WHEN puntos >= 1200 THEN 'FOUNDERS'
  WHEN puntos >= 700  THEN 'HIGH CREW'
  WHEN puntos >= 250  THEN 'CREW'
  ELSE 'NEOPHYTE'
END,
updated_at = now()
WHERE puntos IS NOT NULL;
