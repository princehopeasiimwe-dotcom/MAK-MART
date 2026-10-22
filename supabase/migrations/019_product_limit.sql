-- =========================================================
-- MIGRATION 019: limit how many products a vendor can list
--
-- Default is 4. Admin can change it in Admin > Settings
-- (platform_settings.max_products_per_vendor). 0 means no limit.
-- Vendors who already have more than the limit keep what they
-- have; they just can't add more until they're under it.
-- =========================================================

INSERT INTO public.platform_settings (key, value)
VALUES ('max_products_per_vendor', '4')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.enforce_product_limit()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_limit INTEGER;
    v_count INTEGER;
BEGIN
    -- SQL editor / service role / admins are not limited.
    IF auth.uid() IS NULL OR public.is_admin() THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(NULLIF(btrim(value), '')::INTEGER, 4) INTO v_limit
    FROM public.platform_settings WHERE key = 'max_products_per_vendor';
    v_limit := COALESCE(v_limit, 4);

    IF v_limit <= 0 THEN
        RETURN NEW;
    END IF;

    SELECT COUNT(*) INTO v_count FROM public.products WHERE vendor_id = NEW.vendor_id;

    IF v_count >= v_limit THEN
        RAISE EXCEPTION 'You can list up to % products. Remove one to add another, or contact MAK MART to raise your limit.', v_limit
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_enforce_limit ON public.products;
CREATE TRIGGER products_enforce_limit
BEFORE INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.enforce_product_limit();

SELECT 'Product limit active (019).' AS message;