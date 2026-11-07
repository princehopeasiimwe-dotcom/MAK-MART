-- =========================================================
-- PATCH: fix vendor/service-provider approval gate
-- Problem: is_active defaulted to TRUE, so new vendors and
-- service providers were publicly visible immediately with
-- no admin approval step at all.
-- Fix: is_active now defaults to FALSE and acts as the
-- admin-approval switch. Existing rows are left untouched
-- (already-live vendors stay live) unless you want to reset
-- them - see the commented block at the bottom.
-- =========================================================

ALTER TABLE public.vendors
  ALTER COLUMN is_active SET DEFAULT false;

ALTER TABLE public.service_providers
  ALTER COLUMN is_active SET DEFAULT false;

-- Optional: if you want ALL existing vendors/providers to be
-- re-reviewed under the new rule, uncomment the two lines below.
-- update public.vendors set is_active = false where is_verified = false;
-- update public.service_providers set is_active = false where is_verified = false;

-- =========================================================
-- PATCH: owners couldn't see their own unavailable content
-- Problem: the SELECT policies on products, services, and
-- events only allowed rows where is_available/is_active was
-- true (or you were an admin) - so a vendor could never see
-- their own archived product, and a rejected event vanished
-- even from its own creator's dashboard.
-- Fix: add an owner-visibility clause to each.
-- =========================================================

DROP POLICY IF EXISTS "Users can view available products" ON public.products;
CREATE POLICY "Users can view available products" ON public.products
FOR SELECT TO authenticated
USING (
    is_available = true
    OR public.is_admin()
    OR EXISTS (
        SELECT 1 FROM public.vendors
        WHERE vendors.id = products.vendor_id
        AND vendors.owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can view available services" ON public.services;
CREATE POLICY "Users can view available services" ON public.services
FOR SELECT TO authenticated
USING (
    is_available = true
    OR public.is_admin()
    OR EXISTS (
        SELECT 1 FROM public.service_providers
        WHERE service_providers.id = services.provider_id
        AND service_providers.owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can view active events" ON public.events;
CREATE POLICY "Users can view active events" ON public.events
FOR SELECT TO authenticated
USING (
    is_active = true
    OR public.is_admin()
    OR created_by = auth.uid()
);

SELECT 'Approval gate patch applied successfully!' AS message;
