-- Prueba de trigger de email
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar que el trigger existe
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%email%';

-- 2. Verificar que la función existe
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%email%';

-- 3. Verificar logs de emails recientes
SELECT * FROM public.email_log
ORDER BY created_at DESC
LIMIT 5;

-- 4. Prueba manual de trigger (insertar un contacto de prueba)
INSERT INTO public.contactos (nombre, email, telefono, ciudad, tipo, mensaje, privacy_accepted, marketing_consent)
VALUES ('Test Email Trigger', 'test@gula.com', '+34600000000', 'Madrid', 'contacto', 'Prueba de trigger de email', true, true);

-- 5. Verificar si se creó el log
SELECT * FROM public.email_log
WHERE email_to = 'test@gula.com'
ORDER BY created_at DESC
LIMIT 1;
