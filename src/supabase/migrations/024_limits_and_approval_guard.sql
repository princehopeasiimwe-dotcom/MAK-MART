-- =========================================================
-- MIGRATION 024: limits + approval guard + upload counter
-- Run AFTER 023. Safe to run more than once.
--
-- 1. Services limit  (admin setting max_services_per_provider, default 5)
-- 2. Events limit    (admin setting max_events_per_account,    default 1)
--    Both work like the products limit: 0 = no limit, admins are never
--    limited, and people already over the limit keep what they have.
-- 3. Approval guard: only an admin can change is_active / is_verified on
--    vendors and service_providers, and new records always start unapproved
--    (except when the database itself copies an existing approval).
-- 4. One store and one services profile per account.
-- 5. Upload counter (register_upload) so nobody can flood your photo storage.
-- =========================================================

-- ---------- settings ----------
INSERT INTO public.platform_settings (key, value)
VALUES ('max_services_per_provider', '5'), ('max_events_per_account', '1')
ON CONFLICT (key) DO NOTHING;

-- ---------- 1. services limit ----------
CREATE OR REPLACE FUNCTION public.enforce_service_limit()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_limit INTEGER;
    v_count INTEGER;
BEGIN
    IF auth.uid() IS NULL OR public.is_admin() THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(NULLIF(btrim(value), '')::INTEGER, 5) INTO v_limit
    FROM public.platform_settings WHERE key = 'max_services_per_provider';
    v_limit := COALESCE(v_limit, 5);

    IF v_limit <= 0 THEN
        RETURN NEW;
    END IF;

    SELECT COUNT(*) INTO v_count FROM public.services WHERE provider_id = NEW.provider_id;

    IF v_count >= v_limit THEN
        RAISE EXCEPTION 'You can offer up to % services. Remove one to add another, or contact MAK MART to raise your limit.', v_limit
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS services_enforce_limit ON public.services;
CREATE TRIGGER services_enforce_limit
BEFORE INSERT ON public.services
FOR EACH ROW EXECUTE FUNCTION public.enforce_service_limit();

-- ---------- 2. events limit (events that have not ended yet) ----------
CREATE OR REPLACE FUNCTION public.enforce_event_limit()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_limit INTEGER;
    v_count INTEGER;
BEGIN
    IF auth.uid() IS NULL OR public.is_admin() OR NEW.created_by IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(NULLIF(btrim(value), '')::INTEGER, 1) INTO v_limit
    FROM public.platform_settings WHERE key = 'max_events_per_account';
    v_limit := COALESCE(v_limit, 1);

    IF v_limit <= 0 THEN
        RETURN NEW;
    END IF;

    -- same meaning of "ended" as the app: past its end time, or 24h after the
    -- start when no end time was set
    SELECT COUNT(*) INTO v_count
    FROM public.events
    WHERE created_by = NEW.created_by
      AND COALESCE(end_time, start_time + INTERVAL '24 hours') >= NOW();

    IF v_count >= v_limit THEN
        RAISE EXCEPTION 'You can have % upcoming event(s) at a time. Delete it or wait for it to end before adding another.', v_limit
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_enforce_limit ON public.events;
CREATE TRIGGER events_enforce_limit
BEFORE INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public.enforce_event_limit();

-- ---------- 3. approval guard ----------
CREATE OR REPLACE FUNCTION public.guard_seller_approval()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    -- admins, the SQL editor / service role, and our own functions are trusted
    IF auth.uid() IS NULL OR public.is_admin()
       OR current_setting('app.bypass_seller_guard', true) = '1' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.is_active   := FALSE;
        NEW.is_verified := FALSE;
    ELSE
        NEW.is_active   := OLD.is_active;
        NEW.is_verified := OLD.is_verified;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vendors_guard_approval ON public.vendors;
CREATE TRIGGER vendors_guard_approval
BEFORE INSERT OR UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.guard_seller_approval();

DROP TRIGGER IF EXISTS service_providers_guard_approval ON public.service_providers;
CREATE TRIGGER service_providers_guard_approval
BEFORE INSERT OR UPDATE ON public.service_providers
FOR EACH ROW EXECUTE FUNCTION public.guard_seller_approval();

-- The two helpers from 023 copy an approval the account ALREADY has (which can
-- only have come from an admin now), so they are allowed through the guard.
CREATE OR REPLACE FUNCTION public._ensure_vendor(p_uid UUID, p_name TEXT, p_phone TEXT, p_location TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_id UUID;
    sp   RECORD;
BEGIN
    SELECT id INTO v_id FROM public.vendors WHERE owner_id = p_uid LIMIT 1;
    IF v_id IS NOT NULL THEN
        RETURN v_id;
    END IF;

    SELECT * INTO sp FROM public.service_providers WHERE owner_id = p_uid LIMIT 1;

    PERFORM set_config('app.bypass_seller_guard', '1', true);
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
    PERFORM set_config('app.bypass_seller_guard', '0', true);

    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public._ensure_provider(p_uid UUID, p_name TEXT, p_phone TEXT, p_location TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_id UUID;
    vd   RECORD;
BEGIN
    SELECT id INTO v_id FROM public.service_providers WHERE owner_id = p_uid LIMIT 1;
    IF v_id IS NOT NULL THEN
        RETURN v_id;
    END IF;

    SELECT * INTO vd FROM public.vendors WHERE owner_id = p_uid LIMIT 1;

    PERFORM set_config('app.bypass_seller_guard', '1', true);
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
    PERFORM set_config('app.bypass_seller_guard', '0', true);

    RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public._ensure_vendor(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._ensure_provider(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;

-- ---------- 4. one store / one services profile per account ----------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.vendors GROUP BY owner_id HAVING COUNT(*) > 1) THEN
        RAISE NOTICE 'Some accounts own more than one vendor record. Merge or delete the extras, then run this migration again to enforce one store per account.';
    ELSE
        CREATE UNIQUE INDEX IF NOT EXISTS vendors_one_per_owner ON public.vendors(owner_id);
    END IF;

    IF EXISTS (SELECT 1 FROM public.service_providers GROUP BY owner_id HAVING COUNT(*) > 1) THEN
        RAISE NOTICE 'Some accounts own more than one service provider record. Merge or delete the extras, then run this migration again.';
    ELSE
        CREATE UNIQUE INDEX IF NOT EXISTS service_providers_one_per_owner ON public.service_providers(owner_id);
    END IF;
END $$;

-- ---------- 5. upload counter ----------
-- 40 pictures an hour and 200 a day per person.
CREATE TABLE IF NOT EXISTS public.upload_quota_log (
    id         BIGSERIAL PRIMARY KEY,
    user_id    UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_upload_quota_log_user ON public.upload_quota_log(user_id, created_at);
ALTER TABLE public.upload_quota_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.upload_quota_log FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.register_upload()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    uid     UUID := auth.uid();
    v_hour  INTEGER;
    v_day   INTEGER;
BEGIN
    IF uid IS NULL THEN
        RETURN FALSE;
    END IF;

    DELETE FROM public.upload_quota_log WHERE created_at < NOW() - INTERVAL '2 days';

    SELECT COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour'),
           COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day')
    INTO v_hour, v_day
    FROM public.upload_quota_log WHERE user_id = uid;

    IF v_hour >= 40 OR v_day >= 200 THEN
        RETURN FALSE;
    END IF;

    INSERT INTO public.upload_quota_log (user_id) VALUES (uid);
    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.register_upload() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_upload() TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT 'Migration 024 applied: limits, approval guard, upload counter.' AS message;
