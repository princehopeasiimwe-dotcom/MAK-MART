-- =========================================================
-- MIGRATION 018: visitor + product-view analytics
--
--  * Anonymous visitors are counted by a random id the browser
--    makes for itself (no names, no phone numbers, no IPs).
--  * One row per visitor / product / day, so refreshing a page
--    does not inflate the numbers.
--  * Every night a daily report is stored for each vendor whose
--    products were seen. Vendors who pass the threshold get a
--    notification ("5 people viewed your products").
--  * Admins get a monthly audit: visitors, viewers, orders placed,
--    orders the buyer confirmed as delivered.
--
-- "Today" means the Africa/Kampala calendar day.
-- =========================================================

-- 0. Settings ----------------------------------------------------------
INSERT INTO public.platform_settings (key, value) VALUES
    ('digest_min_views', '10')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.kampala_day(p_ts TIMESTAMPTZ DEFAULT NOW())
RETURNS DATE LANGUAGE sql STABLE AS $$
    SELECT (p_ts AT TIME ZONE 'Africa/Kampala')::date;
$$;

-- 1. Raw tracking tables ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_visits (
    day DATE NOT NULL,
    visitor_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (day, visitor_id)
);

CREATE TABLE IF NOT EXISTS public.product_views (
    day DATE NOT NULL,
    visitor_id TEXT NOT NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (day, visitor_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_views_vendor_day ON public.product_views(vendor_id, day);
CREATE INDEX IF NOT EXISTS idx_product_views_product ON public.product_views(product_id);

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: nobody reads or writes these directly.
-- Everything goes through the functions below.
REVOKE ALL ON public.site_visits, public.product_views FROM anon, authenticated;

-- 2. Stored daily reports ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_daily_reports (
    day DATE NOT NULL,
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    unique_viewers INTEGER NOT NULL DEFAULT 0,
    total_views INTEGER NOT NULL DEFAULT 0,
    products_viewed INTEGER NOT NULL DEFAULT 0,
    top_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    top_product_name TEXT,
    top_product_views INTEGER NOT NULL DEFAULT 0,
    notified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (day, vendor_id)
);

ALTER TABLE public.vendor_daily_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendors read own daily reports" ON public.vendor_daily_reports;
CREATE POLICY "Vendors read own daily reports" ON public.vendor_daily_reports
FOR SELECT TO authenticated
USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_daily_reports.vendor_id AND v.owner_id = auth.uid())
);

GRANT SELECT ON public.vendor_daily_reports TO authenticated;

CREATE TABLE IF NOT EXISTS public.daily_site_reports (
    day DATE PRIMARY KEY,
    visitors INTEGER NOT NULL DEFAULT 0,
    product_viewers INTEGER NOT NULL DEFAULT 0,
    product_views INTEGER NOT NULL DEFAULT 0,
    orders_placed INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.daily_site_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read daily site reports" ON public.daily_site_reports;
CREATE POLICY "Admins read daily site reports" ON public.daily_site_reports
FOR SELECT TO authenticated USING (public.is_admin());

GRANT SELECT ON public.daily_site_reports TO authenticated;

-- 3. Tracking functions (callable by anyone, including signed-out visitors) --
CREATE OR REPLACE FUNCTION public.track_visit(p_visitor TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF p_visitor IS NULL OR length(p_visitor) NOT BETWEEN 8 AND 64 THEN
        RETURN;
    END IF;

    INSERT INTO public.site_visits (day, visitor_id)
    VALUES (public.kampala_day(), p_visitor)
    ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_product_view(p_visitor TEXT, p_product UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_vendor UUID;
BEGIN
    IF p_visitor IS NULL OR length(p_visitor) NOT BETWEEN 8 AND 64 OR p_product IS NULL THEN
        RETURN;
    END IF;

    SELECT vendor_id INTO v_vendor FROM public.products WHERE id = p_product;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    INSERT INTO public.site_visits (day, visitor_id)
    VALUES (public.kampala_day(), p_visitor)
    ON CONFLICT DO NOTHING;

    -- A vendor looking at their own products doesn't count as interest.
    IF auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.vendors WHERE id = v_vendor AND owner_id = auth.uid()
    ) THEN
        RETURN;
    END IF;

    INSERT INTO public.product_views (day, visitor_id, product_id, vendor_id)
    VALUES (public.kampala_day(), p_visitor, p_product, v_vendor)
    ON CONFLICT DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_visit(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_product_view(TEXT, UUID) TO anon, authenticated;

-- 4. Daily report generator ------------------------------------------------------
-- Safe to run any number of times for the same day: a report that
-- already exists is left alone, so nobody is notified twice.
-- Run by pg_cron every morning (section 7) and also whenever an admin
-- or vendor opens their reports page, so it works even without cron.
CREATE OR REPLACE FUNCTION public.generate_daily_reports(p_day DATE DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_day DATE := COALESCE(p_day, public.kampala_day() - 1);
    v_min INTEGER;
    v_row RECORD;
    v_made INTEGER := 0;
    v_inserted INTEGER;
BEGIN
    -- Never report on a day that isn't over yet.
    IF v_day >= public.kampala_day() THEN
        RETURN 0;
    END IF;

    SELECT COALESCE(NULLIF(value, '')::INTEGER, 10) INTO v_min
    FROM public.platform_settings WHERE key = 'digest_min_views';
    v_min := COALESCE(v_min, 10);

    FOR v_row IN
        SELECT pv.vendor_id,
               COUNT(DISTINCT pv.visitor_id)::INTEGER AS viewers,
               COUNT(*)::INTEGER AS views,
               COUNT(DISTINCT pv.product_id)::INTEGER AS products_viewed
        FROM public.product_views pv
        WHERE pv.day = v_day AND pv.vendor_id IS NOT NULL
        GROUP BY pv.vendor_id
    LOOP
        INSERT INTO public.vendor_daily_reports (
            day, vendor_id, unique_viewers, total_views, products_viewed,
            top_product_id, top_product_name, top_product_views
        )
        SELECT v_day, v_row.vendor_id, v_row.viewers, v_row.views, v_row.products_viewed,
               t.product_id, t.name, t.cnt
        FROM (
            SELECT pv.product_id, p.name, COUNT(*)::INTEGER AS cnt
            FROM public.product_views pv
            JOIN public.products p ON p.id = pv.product_id
            WHERE pv.day = v_day AND pv.vendor_id = v_row.vendor_id
            GROUP BY pv.product_id, p.name
            ORDER BY cnt DESC, p.name
            LIMIT 1
        ) t
        ON CONFLICT (day, vendor_id) DO NOTHING;

        GET DIAGNOSTICS v_inserted = ROW_COUNT;

        IF v_inserted = 1 THEN
            v_made := v_made + 1;

            IF v_row.views >= v_min THEN
                INSERT INTO public.notifications (user_id, title, message, type, link)
                SELECT v.owner_id,
                       'Your products are getting seen',
                       v_row.viewers || ' ' || CASE WHEN v_row.viewers = 1 THEN 'person' ELSE 'people' END
                           || ' viewed your products on MAK MART on ' || to_char(v_day, 'FMDD Mon') || ' ('
                           || v_row.views || ' product views). Open Insights to see which ones.',
                       'insights',
                       '/vendor/insights'
                FROM public.vendors v WHERE v.id = v_row.vendor_id;

                UPDATE public.vendor_daily_reports
                SET notified = TRUE
                WHERE day = v_day AND vendor_id = v_row.vendor_id;
            END IF;
        END IF;
    END LOOP;

    INSERT INTO public.daily_site_reports (day, visitors, product_viewers, product_views, orders_placed)
    VALUES (
        v_day,
        (SELECT COUNT(*) FROM public.site_visits WHERE day = v_day),
        (SELECT COUNT(DISTINCT visitor_id) FROM public.product_views WHERE day = v_day),
        (SELECT COUNT(*) FROM public.product_views WHERE day = v_day),
        (SELECT COUNT(*) FROM public.orders WHERE public.kampala_day(created_at) = v_day)
    )
    ON CONFLICT (day) DO NOTHING;

    RETURN v_made;
END;
$$;

-- Fills in every finished day from the first recorded visit up to
-- yesterday (cheap when there is nothing to do).
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

    -- At most the last 45 days, to keep any single call quick.
    v_first := GREATEST(v_first, public.kampala_day() - 45);

    FOR v_day IN
        SELECT d::date
        FROM generate_series(v_first, public.kampala_day() - 1, interval '1 day') d
        WHERE NOT EXISTS (SELECT 1 FROM public.daily_site_reports r WHERE r.day = d::date)
    LOOP
        v_total := v_total + public.generate_daily_reports(v_day);
    END LOOP;

    RETURN v_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_daily_reports(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_missing_reports() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_daily_reports(DATE) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_missing_reports() FROM anon;

-- 5. Vendor insights (what a vendor sees on their Insights page) ------------------
CREATE OR REPLACE FUNCTION public.vendor_insights(p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_vendor UUID;
    v_from DATE;
    v_result JSONB;
BEGIN
    SELECT id INTO v_vendor FROM public.vendors WHERE owner_id = auth.uid() LIMIT 1;
    IF v_vendor IS NULL THEN
        RETURN NULL;
    END IF;

    p_days := LEAST(GREATEST(COALESCE(p_days, 30), 1), 120);
    v_from := public.kampala_day() - (p_days - 1);

    SELECT jsonb_build_object(
        'today_viewers', (SELECT COUNT(DISTINCT visitor_id) FROM public.product_views
                          WHERE vendor_id = v_vendor AND day = public.kampala_day()),
        'today_views',   (SELECT COUNT(*) FROM public.product_views
                          WHERE vendor_id = v_vendor AND day = public.kampala_day()),
        'period_viewers',(SELECT COUNT(DISTINCT visitor_id) FROM public.product_views
                          WHERE vendor_id = v_vendor AND day >= v_from),
        'period_views',  (SELECT COUNT(*) FROM public.product_views
                          WHERE vendor_id = v_vendor AND day >= v_from),
        'period_orders', (SELECT COUNT(*) FROM public.orders
                          WHERE vendor_id = v_vendor AND public.kampala_day(created_at) >= v_from),
        'period_delivered', (SELECT COUNT(*) FROM public.orders
                          WHERE vendor_id = v_vendor AND delivery_confirmed_at IS NOT NULL
                            AND public.kampala_day(delivery_confirmed_at) >= v_from),
        'daily', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('day', d.day, 'viewers', d.viewers, 'views', d.views) ORDER BY d.day)
            FROM (
                SELECT g::date AS day,
                       COALESCE(x.viewers, 0) AS viewers,
                       COALESCE(x.views, 0) AS views
                FROM generate_series(v_from, public.kampala_day(), interval '1 day') g
                LEFT JOIN (
                    SELECT day, COUNT(DISTINCT visitor_id)::INTEGER AS viewers, COUNT(*)::INTEGER AS views
                    FROM public.product_views
                    WHERE vendor_id = v_vendor AND day >= v_from
                    GROUP BY day
                ) x ON x.day = g::date
            ) d
        ), '[]'::jsonb),
        'top_products', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('product_id', t.product_id, 'name', t.name,
                                                'viewers', t.viewers) ORDER BY t.viewers DESC, t.name)
            FROM (
                SELECT pv.product_id, p.name, COUNT(DISTINCT pv.visitor_id)::INTEGER AS viewers
                FROM public.product_views pv
                JOIN public.products p ON p.id = pv.product_id
                WHERE pv.vendor_id = v_vendor AND pv.day >= v_from
                GROUP BY pv.product_id, p.name
                ORDER BY viewers DESC, p.name
                LIMIT 10
            ) t
        ), '[]'::jsonb)
    ) INTO v_result;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.vendor_insights(INTEGER) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.vendor_insights(INTEGER) FROM anon;

-- 6. Admin monthly audit ------------------------------------------------------------
-- p_month: any date inside the month wanted (defaults to this month).
CREATE OR REPLACE FUNCTION public.admin_monthly_audit(p_month DATE DEFAULT NULL)
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
        'visitors', (SELECT COUNT(DISTINCT visitor_id) FROM public.site_visits WHERE day >= v_start AND day < v_end),
        'visit_days', (SELECT COUNT(*) FROM public.site_visits WHERE day >= v_start AND day < v_end),
        'product_viewers', (SELECT COUNT(DISTINCT visitor_id) FROM public.product_views WHERE day >= v_start AND day < v_end),
        'product_views', (SELECT COUNT(*) FROM public.product_views WHERE day >= v_start AND day < v_end),
        'orders_placed', (SELECT COUNT(*) FROM public.orders
                          WHERE public.kampala_day(created_at) >= v_start AND public.kampala_day(created_at) < v_end),
        'orders_cancelled', (SELECT COUNT(*) FROM public.orders
                          WHERE status = 'cancelled'
                            AND public.kampala_day(created_at) >= v_start AND public.kampala_day(created_at) < v_end),
        'orders_delivered', (SELECT COUNT(*) FROM public.orders
                          WHERE delivery_confirmed_at IS NOT NULL
                            AND public.kampala_day(delivery_confirmed_at) >= v_start
                            AND public.kampala_day(delivery_confirmed_at) < v_end),
        'delivered_value', (SELECT COALESCE(SUM(total_amount), 0) FROM public.orders
                          WHERE delivery_confirmed_at IS NOT NULL
                            AND public.kampala_day(delivery_confirmed_at) >= v_start
                            AND public.kampala_day(delivery_confirmed_at) < v_end),
        'reviews', (SELECT COUNT(*) FROM public.order_reviews
                    WHERE public.kampala_day(created_at) >= v_start AND public.kampala_day(created_at) < v_end),
        'avg_vendor_rating', (SELECT ROUND(AVG(vendor_rating)::numeric, 2) FROM public.order_reviews
                    WHERE status = 'approved'
                      AND public.kampala_day(created_at) >= v_start AND public.kampala_day(created_at) < v_end),
        'daily', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('day', g::date,
                       'visitors', (SELECT COUNT(*) FROM public.site_visits s WHERE s.day = g::date),
                       'views', (SELECT COUNT(*) FROM public.product_views p WHERE p.day = g::date),
                       'orders', (SELECT COUNT(*) FROM public.orders o WHERE public.kampala_day(o.created_at) = g::date)
                   ) ORDER BY g)
            FROM generate_series(v_start, LEAST(v_end - 1, public.kampala_day()), interval '1 day') g
        ), '[]'::jsonb),
        'vendors', COALESCE((
            SELECT jsonb_agg(row_to_json(x) ORDER BY x.viewers DESC, x.business_name)
            FROM (
                SELECT v.id AS vendor_id,
                       v.business_name,
                       (SELECT COUNT(DISTINCT visitor_id) FROM public.product_views pv
                         WHERE pv.vendor_id = v.id AND pv.day >= v_start AND pv.day < v_end)::INTEGER AS viewers,
                       (SELECT COUNT(*) FROM public.product_views pv
                         WHERE pv.vendor_id = v.id AND pv.day >= v_start AND pv.day < v_end)::INTEGER AS views,
                       (SELECT COUNT(*) FROM public.orders o
                         WHERE o.vendor_id = v.id
                           AND public.kampala_day(o.created_at) >= v_start AND public.kampala_day(o.created_at) < v_end)::INTEGER AS orders,
                       (SELECT COUNT(*) FROM public.orders o
                         WHERE o.vendor_id = v.id AND o.delivery_confirmed_at IS NOT NULL
                           AND public.kampala_day(o.delivery_confirmed_at) >= v_start
                           AND public.kampala_day(o.delivery_confirmed_at) < v_end)::INTEGER AS delivered
                FROM public.vendors v
            ) x
            WHERE x.viewers > 0 OR x.orders > 0 OR x.delivered > 0
        ), '[]'::jsonb)
    ) INTO v_result;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_monthly_audit(DATE) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_monthly_audit(DATE) FROM anon;

-- 7. Nightly schedule (optional) ------------------------------------------------------
-- Needs the pg_cron extension (Supabase: Database > Extensions > pg_cron).
-- If it isn't enabled this block does nothing; reports are still created
-- the next time an admin or vendor opens their reports page.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'makmart-daily-reports';
        -- 21:05 UTC = 00:05 in Kampala.
        PERFORM cron.schedule('makmart-daily-reports', '5 21 * * *', 'SELECT public.generate_daily_reports()');
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule nightly job: %', SQLERRM;
END;
$$;

SELECT 'Analytics ready (018).' AS message;