-- =========================================================
-- MIGRATION 022: let existing accounts become vendors / service
-- providers, and repair accounts that lost dashboard access.
--
-- Safe to run more than once. Run it in the Supabase SQL editor.
--
-- 1. become_seller(): any signed-in account (customer, vendor or
--    service provider) can open a store and/or offer services on the
--    SAME account. No delete + re-signup needed.
-- 2. Insert policies for vendors / service_providers are re-created
--    so a signed-in user can always create their own record.
-- 3. Repairs role labels that drifted out of sync with the
--    vendors / service_providers rows people actually own.
-- =========================================================

CREATE OR REPLACE FUNCTION public.become_seller(
    p_type          TEXT,
    p_business_name TEXT,
    p_phone         TEXT DEFAULT NULL,
    p_location      TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    uid          UUID := auth.uid();
    current_role TEXT;
    name_clean   TEXT := NULLIF(btrim(COALESCE(p_business_name, '')), '');
BEGIN
    IF uid IS NULL THEN
        RAISE EXCEPTION 'You need to be signed in.';
    END IF;

    IF p_type NOT IN ('vendor', 'service_provider') THEN
        RAISE EXCEPTION 'Unknown account type: %', p_type;
    END IF;

    IF name_clean IS NULL THEN
        RAISE EXCEPTION 'Please enter a business name.';
    END IF;

    -- Accounts created before profiles were auto-created still get one.
    INSERT INTO public.profiles (id, full_name)
    VALUES (uid, name_clean)
    ON CONFLICT (id) DO NOTHING;

    SELECT role INTO current_role FROM public.profiles WHERE id = uid;

    IF p_type = 'vendor' THEN
        IF NOT EXISTS (SELECT 1 FROM public.vendors WHERE owner_id = uid) THEN
            INSERT INTO public.vendors (owner_id, business_name, phone, location)
            VALUES (uid, name_clean, NULLIF(p_phone, ''), NULLIF(p_location, ''));
        END IF;

        -- vendor outranks customer / service_provider; never downgrade an admin
        IF current_role IS DISTINCT FROM 'admin' THEN
            UPDATE public.profiles SET role = 'vendor' WHERE id = uid;
        END IF;
    ELSE
        IF NOT EXISTS (SELECT 1 FROM public.service_providers WHERE owner_id = uid) THEN
            INSERT INTO public.service_providers (owner_id, business_name, phone, location)
            VALUES (uid, name_clean, NULLIF(p_phone, ''), NULLIF(p_location, ''));
        END IF;

        -- a vendor who also offers services stays a vendor
        IF current_role NOT IN ('admin', 'vendor') THEN
            UPDATE public.profiles SET role = 'service_provider' WHERE id = uid;
        END IF;
    END IF;

    RETURN p_type;
END;
$$;

REVOKE ALL ON FUNCTION public.become_seller(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.become_seller(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Signed-in users can always create their own records
DROP POLICY IF EXISTS "Users can create their own vendor" ON public.vendors;
CREATE POLICY "Users can create their own vendor" ON public.vendors
FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own service provider" ON public.service_providers;
CREATE POLICY "Users can create their own service provider" ON public.service_providers
FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

-- Repair role labels that no longer match what people own
UPDATE public.profiles p
SET role = 'vendor'
WHERE p.role IN ('customer', 'service_provider')
  AND EXISTS (SELECT 1 FROM public.vendors v WHERE v.owner_id = p.id);

UPDATE public.profiles p
SET role = 'service_provider'
WHERE p.role = 'customer'
  AND EXISTS (SELECT 1 FROM public.service_providers s WHERE s.owner_id = p.id);

-- Auth users that never got a profile row
INSERT INTO public.profiles (id, full_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', 'MAK MART User')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

SELECT 'Migration 022 applied: existing accounts can now become vendors/providers.' AS message;