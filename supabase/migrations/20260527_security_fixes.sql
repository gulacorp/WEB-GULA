-- Fix function search_path mutable
CREATE OR REPLACE FUNCTION public.actualizar_nivel(p_member_id uuid, p_puntos integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE crew_members
  SET puntos = puntos + p_puntos,
      nivel = CASE
        WHEN puntos + p_puntos >= 1000 THEN 'ORO'
        WHEN puntos + p_puntos >= 500 THEN 'PLATA'
        WHEN puntos + p_puntos >= 200 THEN 'BRONCE'
        ELSE 'INICIADO'
      END,
      updated_at = now()
  WHERE id = p_member_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_to_waitlist(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
  v_result jsonb;
BEGIN
  SELECT id INTO v_existing_id FROM waitlist WHERE email = p_email LIMIT 1;
  
  IF v_existing_id IS NOT NULL THEN
    v_result := jsonb_build_object('success', false, 'error', 'Email already in waitlist', 'id', v_existing_id);
  ELSE
    INSERT INTO waitlist (email, status)
    VALUES (p_email, 'pending')
    RETURNING id INTO v_existing_id;
    v_result := jsonb_build_object('success', true, 'id', v_existing_id);
  END IF;
  
  RETURN v_result;
END;
$$;

-- Move pg_net extension from public to extensions schema
DROP EXTENSION IF EXISTS pg_net CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Revoke EXECUTE on SECURITY DEFINER functions that should not be public
-- Keep add_to_waitlist public (needed for waitlist form)
-- Revoke others for anon/authenticated
REVOKE EXECUTE ON FUNCTION public.is_gula_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_email_via_edge(email_to text, email_type text, payload jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_email_pedido() FROM anon, authenticated;

-- For functions that need to be callable by Edge Functions but not public API,
-- we can grant execute to service_role only
GRANT EXECUTE ON FUNCTION public.send_email_via_edge(email_to text, email_type text, payload jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.trigger_email_pedido() TO service_role;
