-- ============================================================
-- GULA — Email Triggers Setup (Resend Integration)
-- DESACTIVADO: El frontend ya envía emails directamente
-- Este archivo se mantiene como referencia pero no se ejecuta
-- ============================================================

-- NOTA: Los triggers están desactivados porque el frontend
-- (contacto.html, franquiciado.html, club.html) ya llama
-- a la Edge Function send-email directamente. Activar estos
-- triggers causaría duplicación de emails.

-- Si necesitas reactivarlos, descomenta el código abajo y
-- asegúrate de eliminar las llamadas a send-email del frontend.
