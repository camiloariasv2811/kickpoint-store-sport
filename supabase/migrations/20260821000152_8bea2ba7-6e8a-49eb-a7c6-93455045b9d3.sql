-- 1) Lock down SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- has_role / is_staff must stay callable by authenticated because RLS policies use them,
-- but they must only answer about the caller (no role enumeration of other users).
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
      AND (auth.uid() IS NULL OR _user_id = auth.uid())
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','staff')
      AND (auth.uid() IS NULL OR _user_id = auth.uid())
  );
$function$;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;

-- 2) Storage policies for the private "comprobantes" bucket: staff only.
DROP POLICY IF EXISTS "comprobantes staff read" ON storage.objects;
DROP POLICY IF EXISTS "comprobantes staff insert" ON storage.objects;
DROP POLICY IF EXISTS "comprobantes staff update" ON storage.objects;
DROP POLICY IF EXISTS "comprobantes staff delete" ON storage.objects;

CREATE POLICY "comprobantes staff read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'comprobantes' AND public.is_staff(auth.uid()));

CREATE POLICY "comprobantes staff insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comprobantes' AND public.is_staff(auth.uid()));

CREATE POLICY "comprobantes staff update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'comprobantes' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'comprobantes' AND public.is_staff(auth.uid()));

CREATE POLICY "comprobantes staff delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'comprobantes' AND public.is_staff(auth.uid()));

-- 3) Remove redundant staff read policy on products (public read already covers active rows,
-- and staff write policy (ALL) already grants staff full read of all rows).
DROP POLICY IF EXISTS "products staff read" ON public.products;