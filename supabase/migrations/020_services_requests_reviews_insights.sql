-- =========================================================
-- MIGRATION 020: services get the same "smart" treatment as products
--
--  * service_requests     a signed-in buyer asks for a service (the chat
--                         itself still happens on WhatsApp)
--  * confirm_service_done the buyer comes back and confirms the job was done
--  * service_reviews      stars + comment (comment goes to admin), approved
--                         by admin, used to rank providers and services
--  * service_views        anonymous view tracking, daily provider reports,
--                         provider insights and a monthly service audit
--
-- Needs migrations 017 and 018 (it reuses their settings and helpers).
-- =========================================================

-- 1. Requests ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    provider_id UUID REFERENCES public.service_providers(id) ON DELETE SET NULL,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL,
    quoted_price NUMERIC(12,2),
    notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),
    location TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','accepted','completed','cancelled')),
    delivery_confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_requests_buyer ON public.service_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_provider ON public.service_requests(provider_id, created_at);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read service requests" ON public.service_requests;
CREATE POLICY "Read service requests" ON public.service_requests
FOR SELECT TO authenticated
USING (
    buyer_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = service_requests.provider_id AND sp.owner_id = auth.uid())
);

REVOKE ALL ON public.service_requests FROM anon, authenticated;
GRANT SELECT ON public.service_requests TO authenticated;

-- Buyer asks for a service.
CREATE OR REPLACE FUNCTION public.request_service(
    p_service_id UUID,
    p_notes TEXT DEFAULT NULL,
    p_location TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_service RECORD;
    v_owner UUID;
    v_active BOOLEAN;
    v_id UUID;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Please create an account or sign in to request a service.';
    END IF;

    SELECT s.id, s.name, s.price, s.is_available, s.provider_id INTO v_service
    FROM public.services s WHERE s.id = p_service_id;

    IF NOT FOUND OR NOT v_service.is_available THEN
        RAISE EXCEPTION 'This service is not available right now.';
    END IF;

    SELECT owner_id, is_active INTO v_owner, v_active
    FROM public.service_providers WHERE id = v_service.provider_id;

    IF NOT COALESCE(v_active, FALSE) THEN
        RAISE EXCEPTION 'This provider is not available right now.';
    END IF;

    IF v_owner = v_uid THEN
        RAISE EXCEPTION 'You cannot request your own service.';
    END IF;

    -- Don't create duplicates if they tap twice.
    SELECT id INTO v_id FROM public.service_requests
    WHERE buyer_id = v_uid AND service_id = p_service_id AND status IN ('pending', 'accepted')
    ORDER BY created_at DESC LIMIT 1;

    IF v_id IS NOT NULL THEN
        RETURN v_id;
    END IF;

    INSERT INTO public.service_requests (service_id, provider_id, buyer_id, service_name, quoted_price, notes, location)
    VALUES (
        p_service_id, v_service.provider_id, v_uid, v_service.name, v_service.price,
        NULLIF(btrim(COALESCE(p_notes, '')), ''),
        NULLIF(btrim(COALESCE(p_location, '')), '')
    )
    RETURNING id INTO v_id;

    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (v_owner, 'New service request',
            'Someone requested "' || v_service.name || '". They will message you on WhatsApp.',
            'new_service_request', '/provider/requests');

    RETURN v_id;
END;
$$;

-- Provider accepts / declines (or buyer cancels while pending).
CREATE OR REPLACE FUNCTION public.set_service_request_status(p_id UUID, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_req public.service_requests%ROWTYPE;
    v_owner UUID;
    v_is_provider BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Please sign in.';
    END IF;

    IF p_status NOT IN ('accepted', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status.';
    END IF;

    SELECT * INTO v_req FROM public.service_requests WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found.';
    END IF;

    SELECT owner_id INTO v_owner FROM public.service_providers WHERE id = v_req.provider_id;
    v_is_provider := (v_owner = auth.uid());

    IF NOT (v_is_provider OR v_req.buyer_id = auth.uid() OR public.is_admin()) THEN
        RAISE EXCEPTION 'Request not found.';
    END IF;

    IF v_req.status IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'This request is already %.', v_req.status;
    END IF;

    IF p_status = 'accepted' AND NOT (v_is_provider OR public.is_admin()) THEN
        RAISE EXCEPTION 'Only the provider can accept a request.';
    END IF;

    IF p_status = 'cancelled' AND NOT (v_is_provider OR public.is_admin()) AND v_req.status <> 'pending' THEN
        RAISE EXCEPTION 'You can only cancel a request that is still waiting.';
    END IF;

    UPDATE public.service_requests SET status = p_status, updated_at = NOW() WHERE id = p_id;

    IF v_is_provider OR public.is_admin() THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (v_req.buyer_id, 'Service request update',
                'Your request for "' || v_req.service_name || '" was ' ||
                CASE p_status WHEN 'accepted' THEN 'accepted.' ELSE 'declined.' END,
                'service_request_status', '/account');
    END IF;
END;
$$;

-- Buyer confirms the job was done.
CREATE OR REPLACE FUNCTION public.confirm_service_done(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_req public.service_requests%ROWTYPE;
    v_owner UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Please sign in.';
    END IF;

    SELECT * INTO v_req FROM public.service_requests WHERE id = p_id FOR UPDATE;
    IF NOT FOUND OR v_req.buyer_id <> auth.uid() THEN
        RAISE EXCEPTION 'Request not found.';
    END IF;

    IF v_req.status = 'cancelled' THEN
        RAISE EXCEPTION 'This request was cancelled.';
    END IF;

    IF v_req.delivery_confirmed_at IS NOT NULL THEN
        RETURN;
    END IF;

    UPDATE public.service_requests
    SET status = 'completed', delivery_confirmed_at = NOW(), updated_at = NOW()
    WHERE id = p_id;

    SELECT owner_id INTO v_owner FROM public.service_providers WHERE id = v_req.provider_id;
    IF v_owner IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (v_owner, 'Service confirmed',
                'A customer confirmed "' || v_req.service_name || '" was done. Nice work!',
                'service_confirmed', '/provider/requests');
    END IF;
END;
$$;

-- 2. Service reviews ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL UNIQUE REFERENCES public.service_requests(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT CHECK (comment IS NULL OR char_length(comment) <= 1000),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    admin_note TEXT,
    moderated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_reviews_provider ON public.service_reviews(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_service_reviews_service ON public.service_reviews(service_id, status);

ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read service reviews" ON public.service_reviews;
CREATE POLICY "Read service reviews" ON public.service_reviews
FOR SELECT TO authenticated
USING (
    public.is_admin()
    OR buyer_id = auth.uid()
    OR (status = 'approved' AND EXISTS (
        SELECT 1 FROM public.service_providers sp WHERE sp.id = service_reviews.provider_id AND sp.owner_id = auth.uid()
    ))
);

REVOKE ALL ON public.service_reviews FROM anon, authenticated;
GRANT SELECT ON public.service_reviews TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_service_review(
    p_request_id UUID,
    p_rating INTEGER,
    p_comment TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_req public.service_requests%ROWTYPE;
    v_id UUID;
    v_status TEXT := 'pending';
    v_require TEXT;
    v_name TEXT;
    v_owner UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Please sign in.';
    END IF;

    IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 THEN
        RAISE EXCEPTION 'Please give a rating from 1 to 5 stars.';
    END IF;

    SELECT * INTO v_req FROM public.service_requests WHERE id = p_request_id;
    IF NOT FOUND OR v_req.buyer_id <> auth.uid() THEN
        RAISE EXCEPTION 'Request not found.';
    END IF;

    IF v_req.delivery_confirmed_at IS NULL THEN
        RAISE EXCEPTION 'Confirm that the service was done before rating it.';
    END IF;

    IF v_req.provider_id IS NULL THEN
        RAISE EXCEPTION 'This provider no longer exists.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.service_reviews WHERE request_id = p_request_id) THEN
        RAISE EXCEPTION 'You have already reviewed this service.';
    END IF;

    SELECT value INTO v_require FROM public.platform_settings WHERE key = 'reviews_require_approval';
    IF lower(COALESCE(v_require, 'true')) = 'false' THEN
        v_status := 'approved';
    END IF;

    INSERT INTO public.service_reviews (request_id, buyer_id, provider_id, service_id, rating, comment, status, moderated_at)
    VALUES (p_request_id, auth.uid(), v_req.provider_id, v_req.service_id, p_rating,
            NULLIF(btrim(COALESCE(p_comment, '')), ''), v_status,
            CASE WHEN v_status = 'approved' THEN NOW() END)
    RETURNING id INTO v_id;

    SELECT business_name, owner_id INTO v_name, v_owner FROM public.service_providers WHERE id = v_req.provider_id;

    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT a.user_id, 'New service review',
           p_rating || '★ for ' || COALESCE(v_name, 'a provider')
               || CASE WHEN v_status = 'pending' THEN ' — waiting for your approval.' ELSE '.' END,
           'admin_alert', '/admin/reviews'
    FROM public.admins a;

    IF v_status = 'approved' AND v_owner IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (v_owner, 'You got a new rating', 'A customer rated you ' || p_rating || '★.', 'new_review', '/provider/insights');
    END IF;

    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.moderate_service_review(
    p_review_id UUID,
    p_status TEXT,
    p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_review public.service_reviews%ROWTYPE;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Admins only.';
    END IF;

    IF p_status NOT IN ('approved', 'rejected', 'pending') THEN
        RAISE EXCEPTION 'Invalid status.';
    END IF;

    SELECT * INTO v_review FROM public.service_reviews WHERE id = p_review_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Review not found.';
    END IF;

    UPDATE public.service_reviews
    SET status = p_status, admin_note = NULLIF(btrim(COALESCE(p_note, '')), ''), moderated_at = NOW()
    WHERE id = p_review_id;

    IF p_status = 'approved' AND v_review.status <> 'approved' THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        SELECT sp.owner_id, 'You got a new rating', 'A customer rated you ' || v_review.rating || '★.', 'new_review', '/provider/insights'
        FROM public.service_providers sp WHERE sp.id = v_review.provider_id;
    END IF;
END;
$$;

-- Public star averages (numbers only) + fair ranking score.
CREATE OR REPLACE VIEW public.provider_rating_stats AS
WITH base AS (
    SELECT provider_id, COUNT(*)::INTEGER AS rating_count, AVG(rating)::NUMERIC AS rating_avg
    FROM public.service_reviews WHERE status = 'approved' GROUP BY provider_id
),
prior AS (
    SELECT COALESCE((SELECT AVG(rating)::NUMERIC FROM public.service_reviews WHERE status = 'approved'), 3.5) AS c
),
done AS (
    SELECT provider_id, COUNT(*)::INTEGER AS completed_requests
    FROM public.service_requests
    WHERE delivery_confirmed_at IS NOT NULL AND provider_id IS NOT NULL GROUP BY provider_id
)
SELECT sp.id AS provider_id,
       COALESCE(b.rating_count, 0) AS rating_count,
       ROUND(b.rating_avg, 2) AS rating_avg,
       COALESCE(d.completed_requests, 0) AS completed_requests,
       ROUND(((COALESCE(b.rating_count, 0) * COALESCE(b.rating_avg, 0)) + 3 * p.c)
             / (COALESCE(b.rating_count, 0) + 3), 3) AS rank_score
FROM public.service_providers sp
CROSS JOIN prior p
LEFT JOIN base b ON b.provider_id = sp.id
LEFT JOIN done d ON d.provider_id = sp.id;

CREATE OR REPLACE VIEW public.service_rating_stats AS
WITH base AS (
    SELECT service_id, COUNT(*)::INTEGER AS rating_count, AVG(rating)::NUMERIC AS rating_avg
    FROM public.service_reviews WHERE status = 'approved' AND service_id IS NOT NULL GROUP BY service_id
),
prior AS (
    SELECT COALESCE((SELECT AVG(rating)::NUMERIC FROM public.service_reviews WHERE status = 'approved'), 3.5) AS c
)
SELECT b.service_id, b.rating_count, ROUND(b.rating_avg, 2) AS rating_avg,
       ROUND(((b.rating_count * b.rating_avg) + 3 * p.c) / (b.rating_count + 3), 3) AS rank_score
FROM base b CROSS JOIN prior p;

GRANT SELECT ON public.provider_rating_stats, public.service_rating_stats TO anon, authenticated;

-- 3. Service view tracking ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_views (
    day DATE NOT NULL,
    visitor_id TEXT NOT NULL,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.service_providers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (day, visitor_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_service_views_provider_day ON public.service_views(provider_id, day);

ALTER TABLE public.service_views ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_views FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.track_service_view(p_visitor TEXT, p_service UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_provider UUID;
BEGIN
    IF p_visitor IS NULL OR length(p_visitor) NOT BETWEEN 8 AND 64 OR p_service IS NULL THEN
        RETURN;
    END IF;

    SELECT provider_id INTO v_provider FROM public.services WHERE id = p_service;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    INSERT INTO public.site_visits (day, visitor_id)
    VALUES (public.kampala_day(), p_visitor) ON CONFLICT DO NOTHING;

    IF auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.service_providers WHERE id = v_provider AND owner_id = auth.uid()
    ) THEN
        RETURN;
    END IF;

    INSERT INTO public.service_views (day, visitor_id, service_id, provider_id)
    VALUES (public.kampala_day(), p_visitor, p_service, v_provider) ON CONFLICT DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_service_view(TEXT, UUID) TO anon, authenticated;

-- 4. Daily provider reports ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.provider_daily_reports (
    day DATE NOT NULL,
    provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
    unique_viewers INTEGER NOT NULL DEFAULT 0,
    total_views INTEGER NOT NULL DEFAULT 0,
    services_viewed INTEGER NOT NULL DEFAULT 0,
    top_service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    top_service_name TEXT,
    top_service_views INTEGER NOT NULL DEFAULT 0,
    notified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (day, provider_id)
);

ALTER TABLE public.provider_daily_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers read own daily reports" ON public.provider_daily_reports;
CREATE POLICY "Providers read own daily reports" ON public.provider_daily_reports
FOR SELECT TO authenticated
USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_daily_reports.provider_id AND sp.owner_id = auth.uid())
);

GRANT SELECT ON public.provider_daily_reports TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_daily_service_reports(p_day DATE DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_day DATE := COALESCE(p_day, public.kampala_day() - 1);
    v_min INTEGER;
    v_row RECORD;
    v_made INTEGER := 0;
    v_inserted INTEGER;
BEGIN
    IF v_day >= public.kampala_day() THEN
        RETURN 0;
    END IF;

    SELECT COALESCE(NULLIF(value, '')::INTEGER, 10) INTO v_min
    FROM public.platform_settings WHERE key = 'digest_min_views';
    v_min := COALESCE(v_min, 10);

    FOR v_row IN
        SELECT sv.provider_id,
               COUNT(DISTINCT sv.visitor_id)::INTEGER AS viewers,
               COUNT(*)::INTEGER AS views,
               COUNT(DISTINCT sv.service_id)::INTEGER AS services_viewed
        FROM public.service_views sv
        WHERE sv.day = v_day AND sv.provider_id IS NOT NULL
        GROUP BY sv.provider_id
    LOOP
        INSERT INTO public.provider_daily_reports (
            day, provider_id, unique_viewers, total_views, services_viewed,
            top_service_id, top_service_name, top_service_views
        )
        SELECT v_day, v_row.provider_id, v_row.viewers, v_row.views, v_row.services_viewed,
               t.service_id, t.name, t.cnt
        FROM (
            SELECT sv.service_id, s.name, COUNT(*)::INTEGER AS cnt
            FROM public.service_views sv
            JOIN public.services s ON s.id = sv.service_id
            WHERE sv.day = v_day AND sv.provider_id = v_row.provider_id
            GROUP BY sv.service_id, s.name
            ORDER BY cnt DESC, s.name
            LIMIT 1
        ) t
        ON CONFLICT (day, provider_id) DO NOTHING;

        GET DIAGNOSTICS v_inserted = ROW_COUNT;

        IF v_inserted = 1 THEN
            v_made := v_made + 1;

            IF v_row.views >= v_min THEN
                INSERT INTO public.notifications (user_id, title, message, type, link)
                SELECT sp.owner_id,
                       'Your services are getting seen',
                       v_row.viewers || ' ' || CASE WHEN v_row.viewers = 1 THEN 'person' ELSE 'people' END
                           || ' viewed your services on MAK MART on ' || to_char(v_day, 'FMDD Mon') || ' ('
                           || v_row.views || ' views). Open Insights to see which ones.',
                       'insights', '/provider/insights'
                FROM public.service_providers sp WHERE sp.id = v_row.provider_id;

                UPDATE public.provider_daily_reports SET notified = TRUE
                WHERE day = v_day AND provider_id = v_row.provider_id;
            END IF;
        END IF;
    END LOOP;

    RETURN v_made;
END;
$$;

-- One call that does products and services (used by the nightly job).
CREATE OR REPLACE FUNCTION public.generate_all_daily_reports(p_day DATE DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_total INTEGER;
BEGIN
    v_total := public.generate_daily_service_reports(p_day);
    v_total := v_total + public.generate_daily_reports(p_day);
    RETURN v_total;
END;
$$;

-- Replaces the 018 version so it also closes off service days.
CREATE OR REPLACE FUNCTION public.generate_missing_reports()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_day DATE;
    v_first DATE;
    v_total INTEGER := 0;
BEGIN
    SELECT MIN(day) INTO v_first FROM public.site_visits;
    IF v_first IS NULL THEN
        RETURN 0;
    END IF;

    v_first := GREATEST(v_first, public.kampala_day() - 45);

    FOR v_day IN
        SELECT d::date
        FROM generate_series(v_first, public.kampala_day() - 1, interval '1 day') d
        WHERE NOT EXISTS (SELECT 1 FROM public.daily_site_reports r WHERE r.day = d::date)
    LOOP
        v_total := v_total + public.generate_all_daily_reports(v_day);
    END LOOP;

    RETURN v_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_daily_service_reports(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_all_daily_reports(DATE) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_daily_service_reports(DATE) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_all_daily_reports(DATE) FROM anon;

-- Point the nightly job at the combined function (if pg_cron is on).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'makmart-daily-reports';
        PERFORM cron.schedule('makmart-daily-reports', '5 21 * * *', 'SELECT public.generate_all_daily_reports()');
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule nightly job: %', SQLERRM;
END;
$$;

-- 5. Provider insights ----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provider_insights(p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_provider UUID;
    v_from DATE;
    v_result JSONB;
BEGIN
    SELECT id INTO v_provider FROM public.service_providers WHERE owner_id = auth.uid() LIMIT 1;
    IF v_provider IS NULL THEN
        RETURN NULL;
    END IF;

    p_days := LEAST(GREATEST(COALESCE(p_days, 30), 1), 120);
    v_from := public.kampala_day() - (p_days - 1);

    SELECT jsonb_build_object(
        'today_viewers', (SELECT COUNT(DISTINCT visitor_id) FROM public.service_views
                          WHERE provider_id = v_provider AND day = public.kampala_day()),
        'today_views',   (SELECT COUNT(*) FROM public.service_views
                          WHERE provider_id = v_provider AND day = public.kampala_day()),
        'period_viewers',(SELECT COUNT(DISTINCT visitor_id) FROM public.service_views
                          WHERE provider_id = v_provider AND day >= v_from),
        'period_views',  (SELECT COUNT(*) FROM public.service_views
                          WHERE provider_id = v_provider AND day >= v_from),
        'period_orders', (SELECT COUNT(*) FROM public.service_requests
                          WHERE provider_id = v_provider AND public.kampala_day(created_at) >= v_from),
        'period_delivered', (SELECT COUNT(*) FROM public.service_requests
                          WHERE provider_id = v_provider AND delivery_confirmed_at IS NOT NULL
                            AND public.kampala_day(delivery_confirmed_at) >= v_from),
        'daily', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('day', d.day, 'viewers', d.viewers, 'views', d.views) ORDER BY d.day)
            FROM (
                SELECT g::date AS day, COALESCE(x.viewers, 0) AS viewers, COALESCE(x.views, 0) AS views
                FROM generate_series(v_from, public.kampala_day(), interval '1 day') g
                LEFT JOIN (
                    SELECT day, COUNT(DISTINCT visitor_id)::INTEGER AS viewers, COUNT(*)::INTEGER AS views
                    FROM public.service_views
                    WHERE provider_id = v_provider AND day >= v_from
                    GROUP BY day
                ) x ON x.day = g::date
            ) d
        ), '[]'::jsonb),
        'top_products', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('product_id', t.service_id, 'name', t.name, 'viewers', t.viewers)
                             ORDER BY t.viewers DESC, t.name)
            FROM (
                SELECT sv.service_id, s.name, COUNT(DISTINCT sv.visitor_id)::INTEGER AS viewers
                FROM public.service_views sv
                JOIN public.services s ON s.id = sv.service_id
                WHERE sv.provider_id = v_provider AND sv.day >= v_from
                GROUP BY sv.service_id, s.name
                ORDER BY viewers DESC, s.name
                LIMIT 10
            ) t
        ), '[]'::jsonb)
    ) INTO v_result;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.provider_insights(INTEGER) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.provider_insights(INTEGER) FROM anon;

-- 6. Admin monthly service audit ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_monthly_service_audit(p_month DATE DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_start DATE := date_trunc('month', COALESCE(p_month, public.kampala_day()))::date;
    v_end DATE := (date_trunc('month', COALESCE(p_month, public.kampala_day())) + interval '1 month')::date;
    v_result JSONB;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Admins only.';
    END IF;

    SELECT jsonb_build_object(
        'month_start', v_start,
        'service_viewers', (SELECT COUNT(DISTINCT visitor_id) FROM public.service_views WHERE day >= v_start AND day < v_end),
        'service_views', (SELECT COUNT(*) FROM public.service_views WHERE day >= v_start AND day < v_end),
        'requests_placed', (SELECT COUNT(*) FROM public.service_requests
                            WHERE public.kampala_day(created_at) >= v_start AND public.kampala_day(created_at) < v_end),
        'requests_cancelled', (SELECT COUNT(*) FROM public.service_requests
                            WHERE status = 'cancelled'
                              AND public.kampala_day(created_at) >= v_start AND public.kampala_day(created_at) < v_end),
        'requests_completed', (SELECT COUNT(*) FROM public.service_requests
                            WHERE delivery_confirmed_at IS NOT NULL
                              AND public.kampala_day(delivery_confirmed_at) >= v_start
                              AND public.kampala_day(delivery_confirmed_at) < v_end),
        'completed_value', (SELECT COALESCE(SUM(quoted_price), 0) FROM public.service_requests
                            WHERE delivery_confirmed_at IS NOT NULL
                              AND public.kampala_day(delivery_confirmed_at) >= v_start
                              AND public.kampala_day(delivery_confirmed_at) < v_end),
        'reviews', (SELECT COUNT(*) FROM public.service_reviews
                    WHERE public.kampala_day(created_at) >= v_start AND public.kampala_day(created_at) < v_end),
        'avg_rating', (SELECT ROUND(AVG(rating)::numeric, 2) FROM public.service_reviews
                    WHERE status = 'approved'
                      AND public.kampala_day(created_at) >= v_start AND public.kampala_day(created_at) < v_end),
        'daily', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('day', g::date,
                       'views', (SELECT COUNT(*) FROM public.service_views s WHERE s.day = g::date),
                       'requests', (SELECT COUNT(*) FROM public.service_requests r WHERE public.kampala_day(r.created_at) = g::date)
                   ) ORDER BY g)
            FROM generate_series(v_start, LEAST(v_end - 1, public.kampala_day()), interval '1 day') g
        ), '[]'::jsonb),
        'providers', COALESCE((
            SELECT jsonb_agg(row_to_json(x) ORDER BY x.viewers DESC, x.business_name)
            FROM (
                SELECT sp.id AS provider_id,
                       sp.business_name,
                       (SELECT COUNT(DISTINCT visitor_id) FROM public.service_views sv
                         WHERE sv.provider_id = sp.id AND sv.day >= v_start AND sv.day < v_end)::INTEGER AS viewers,
                       (SELECT COUNT(*) FROM public.service_views sv
                         WHERE sv.provider_id = sp.id AND sv.day >= v_start AND sv.day < v_end)::INTEGER AS views,
                       (SELECT COUNT(*) FROM public.service_requests r
                         WHERE r.provider_id = sp.id
                           AND public.kampala_day(r.created_at) >= v_start AND public.kampala_day(r.created_at) < v_end)::INTEGER AS requests,
                       (SELECT COUNT(*) FROM public.service_requests r
                         WHERE r.provider_id = sp.id AND r.delivery_confirmed_at IS NOT NULL
                           AND public.kampala_day(r.delivery_confirmed_at) >= v_start
                           AND public.kampala_day(r.delivery_confirmed_at) < v_end)::INTEGER AS completed
                FROM public.service_providers sp
            ) x
            WHERE x.viewers > 0 OR x.requests > 0 OR x.completed > 0
        ), '[]'::jsonb)
    ) INTO v_result;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_monthly_service_audit(DATE) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_monthly_service_audit(DATE) FROM anon;

GRANT EXECUTE ON FUNCTION public.request_service(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_service_request_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_service_done(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_service_review(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_service_review(UUID, TEXT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.request_service(UUID, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_service_request_status(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.confirm_service_done(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_service_review(UUID, INTEGER, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.moderate_service_review(UUID, TEXT, TEXT) FROM anon;

SELECT 'Services: requests, reviews, insights ready (020).' AS message;