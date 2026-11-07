-- =========================================================
-- MIGRATION 023: one dashboard for every signed-in account,
-- and switching a listing between product <-> service without
-- a second sign-up or a second admin approval.
--
-- Safe to run more than once. Run it in the Supabase SQL editor.
-- It includes (and supersedes) the become_seller() function from
-- migration 022, so you can run just this one.
--
-- 1. become_seller(): any signed-in account can open a store and/or
--    offer services on the SAME account. If the account already has
--    the other kind of record, its approval (is_active / is_verified)
--    is carried over, so no second admin approval is needed.
-- 2. convert_product_to_service() / convert_service_to_product():
--    move one listing across, keeping its name, description, price,
--    location and photo. Done in one step on the server.
-- 3. Insert policies so a signed-in user can always create their
--    own vendor / service provider record.
-- 4. Repairs role labels that drifted away from the records people
--    actually own, and profiles that were never created.
-- =========================================================

-- ---------------------------------------------------------
-- Internal helper: make sure the account has a vendor record.
-- Copies approval from an existing service provider record.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public._ensure_vendor(p_uid UUID, p_name TEXT, p_phone TEXT, p_location TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
    sp   RECORD;
BEGIN
    SELECT id INTO v_id FROM public.vendors WHERE owner_id = p_uid LIMIT 1;
    IF v_id IS NOT NULL THEN
        RETURN v_id;
    END IF;

    SELECT * INTO sp FROM public.service_providers WHERE owner_id = p_uid LIMIT 1;

    INSERT INTO public.vendors (owner_id, business_name, phone, location, is_active, is_verified)
    VALUES (
        p_uid,
        COALESCE(NULLIF(btrim(COALESCE(p_name, '')), ''), sp.business_name, 'My store'),
        COALESCE(NULLIF(p_phone, ''), sp.phone),
        COALESCE(NULLIF(p_location, ''), sp.location),
        COALESCE(sp.is_active, FALSE),
        COALESCE(sp.is_verified, FALSE)
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

-- ---------------------------------------------------------
-- Internal helper: make sure the account has a provider record.
-- Copies approval from an existing vendor record.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public._ensure_provider(p_uid UUID, p_name TEXT, p_phone TEXT, p_location TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
    vd   RECORD;
BEGIN
    SELECT id INTO v_id FROM public.service_providers WHERE owner_id = p_uid LIMIT 1;
    IF v_id IS NOT NULL THEN
        RETURN v_id;
    END IF;

    SELECT * INTO vd FROM public.vendors WHERE owner_id = p_uid LIMIT 1;

    INSERT INTO public.service_providers (owner_id, business_name, phone, location, is_active, is_verified)
    VALUES (
        p_uid,
        COALESCE(NULLIF(btrim(COALESCE(p_name, '')), ''), vd.business_name, 'My services'),
        COALESCE(NULLIF(p_phone, ''), vd.phone),
        COALESCE(NULLIF(p_location, ''), vd.location),
        COALESCE(vd.is_active, FALSE),
        COALESCE(vd.is_verified, FALSE)
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public._ensure_vendor(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._ensure_provider(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;

-- ---------------------------------------------------------
-- become_seller(): customer / vendor / service provider -> add the other side
-- ---------------------------------------------------------
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
        PERFORM public._ensure_vendor(uid, name_clean, p_phone, p_location);

        -- vendor outranks customer / service_provider; never downgrade an admin
        IF current_role IS DISTINCT FROM 'admin' THEN
            UPDATE public.profiles SET role = 'vendor' WHERE id = uid;
        END IF;
    ELSE
        PERFORM public._ensure_provider(uid, name_clean, p_phone, p_location);

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

-- ---------------------------------------------------------
-- Product -> service
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.convert_product_to_service(
    p_product_id  UUID,
    p_category_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    uid         UUID := auth.uid();
    prod        RECORD;
    vd          RECORD;
    v_provider  UUID;
    v_service   UUID;
    v_image     TEXT;
    has_img_col BOOLEAN;
BEGIN
    IF uid IS NULL THEN
        RAISE EXCEPTION 'You need to be signed in.';
    END IF;

    SELECT p.* INTO prod
    FROM public.products p
    JOIN public.vendors v ON v.id = p.vendor_id
    WHERE p.id = p_product_id AND v.owner_id = uid;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'That product was not found in your store.';
    END IF;

    SELECT * INTO vd FROM public.vendors WHERE id = prod.vendor_id;

    v_provider := public._ensure_provider(uid, vd.business_name, vd.phone, vd.location);

    INSERT INTO public.services (provider_id, category_id, name, description, price, location, is_available)
    VALUES (
        v_provider,
        p_category_id,
        prod.name,
        prod.description,
        prod.price,
        COALESCE(prod.location, vd.location),
        prod.is_available
    )
    RETURNING id INTO v_service;

    -- carry the photo across (services keep it on the row itself)
    SELECT image_url INTO v_image
    FROM public.product_images
    WHERE product_id = prod.id
    ORDER BY is_primary DESC, display_order ASC
    LIMIT 1;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'image_url'
    ) INTO has_img_col;

    IF v_image IS NOT NULL AND has_img_col THEN
        EXECUTE 'UPDATE public.services SET image_url = $1 WHERE id = $2' USING v_image, v_service;
    END IF;

    DELETE FROM public.products WHERE id = prod.id;

    -- an account that now offers services is at least a service provider
    UPDATE public.profiles SET role = 'service_provider'
    WHERE id = uid AND role = 'customer';

    RETURN v_service;
END;
$$;

-- ---------------------------------------------------------
-- Service -> product
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.convert_service_to_product(
    p_service_id  UUID,
    p_category_id UUID,
    p_price       NUMERIC DEFAULT NULL,
    p_stock       INTEGER DEFAULT 1
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    uid         UUID := auth.uid();
    svc         RECORD;
    sp          RECORD;
    v_vendor    UUID;
    v_product   UUID;
    v_price     NUMERIC;
    v_image     TEXT;
    has_img_col BOOLEAN;
BEGIN
    IF uid IS NULL THEN
        RAISE EXCEPTION 'You need to be signed in.';
    END IF;

    IF p_category_id IS NULL THEN
        RAISE EXCEPTION 'Please choose a product category.';
    END IF;

    SELECT s.* INTO svc
    FROM public.services s
    JOIN public.service_providers sp2 ON sp2.id = s.provider_id
    WHERE s.id = p_service_id AND sp2.owner_id = uid;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'That service was not found in your account.';
    END IF;

    SELECT * INTO sp FROM public.service_providers WHERE id = svc.provider_id;

    v_price := COALESCE(p_price, svc.price);

    -- services with packages have no single price: use the cheapest package
    IF v_price IS NULL AND to_regclass('public.service_packages') IS NOT NULL THEN
        EXECUTE 'SELECT MIN(price) FROM public.service_packages WHERE service_id = $1'
        INTO v_price USING svc.id;
    END IF;

    IF v_price IS NULL OR v_price < 0 THEN
        RAISE EXCEPTION 'Please enter the price for this product.';
    END IF;

    v_vendor := public._ensure_vendor(uid, sp.business_name, sp.phone, sp.location);

    INSERT INTO public.products (vendor_id, category_id, name, description, price, stock_quantity, condition, location, is_available)
    VALUES (
        v_vendor,
        p_category_id,
        svc.name,
        svc.description,
        v_price,
        GREATEST(COALESCE(p_stock, 1), 0),
        'new',
        COALESCE(svc.location, sp.location),
        svc.is_available
    )
    RETURNING id INTO v_product;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'image_url'
    ) INTO has_img_col;

    IF has_img_col THEN
        EXECUTE 'SELECT image_url FROM public.services WHERE id = $1' INTO v_image USING svc.id;
        IF v_image IS NOT NULL THEN
            INSERT INTO public.product_images (product_id, image_url, is_primary, display_order)
            VALUES (v_product, v_image, TRUE, 0);
        END IF;
    END IF;

    DELETE FROM public.services WHERE id = svc.id;

    -- an account that now has a store is a vendor
    UPDATE public.profiles SET role = 'vendor'
    WHERE id = uid AND role IN ('customer', 'service_provider');

    RETURN v_product;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_product_to_service(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.convert_service_to_product(UUID, UUID, NUMERIC, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_product_to_service(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_service_to_product(UUID, UUID, NUMERIC, INTEGER) TO authenticated;

-- ---------------------------------------------------------
-- Signed-in users can always create their own records
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Users can create their own vendor" ON public.vendors;
CREATE POLICY "Users can create their own vendor" ON public.vendors
FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own service provider" ON public.service_providers;
CREATE POLICY "Users can create their own service provider" ON public.service_providers
FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

-- ---------------------------------------------------------
-- Repairs
-- ---------------------------------------------------------
UPDATE public.profiles p
SET role = 'vendor'
WHERE p.role IN ('customer', 'service_provider')
  AND EXISTS (SELECT 1 FROM public.vendors v WHERE v.owner_id = p.id);

UPDATE public.profiles p
SET role = 'service_provider'
WHERE p.role = 'customer'
  AND EXISTS (SELECT 1 FROM public.service_providers s WHERE s.owner_id = p.id);

INSERT INTO public.profiles (id, full_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', 'MAK MART User')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

SELECT 'Migration 023 applied: unified dashboard + product/service switching.' AS message;
