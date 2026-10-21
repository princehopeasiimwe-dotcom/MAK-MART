-- =========================================================
-- MIGRATION 017: delivery confirmation, ratings and ranking
--
-- Buying is agreed on WhatsApp, so the app asks the buyer to come
-- back, confirm the order arrived, and rate the vendor and products.
--
--  * confirm_delivery(order)    buyer says "I received it"
--  * submit_order_review(...)   stars for the vendor + each product,
--                               plus a comment that goes to ADMIN only
--  * moderate_review(...)       admin approves / rejects
--  * vendor_rating_stats / product_rating_stats
--                               public star averages (no comments) and
--                               a fair "rank_score" used to sort the
--                               marketplace so the best vendors come first
--
-- Reviews need admin approval by default. To publish instantly,
-- set platform_settings.reviews_require_approval to 'false'.
-- =========================================================

INSERT INTO public.platform_settings (key, value) VALUES
    ('reviews_require_approval', 'true')
ON CONFLICT (key) DO NOTHING;

-- 1. Orders: remember when the buyer confirmed delivery ----------------------
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS delivery_confirmed_at TIMESTAMPTZ;

-- The order guard now (a) lets our own functions through and
-- (b) stops anyone but the confirm_delivery() function from setting
-- delivery_confirmed_at.
CREATE OR REPLACE FUNCTION public.guard_order_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_is_vendor BOOLEAN;
BEGIN
    IF auth.uid() IS NULL OR public.is_admin()
       OR current_setting('app.bypass_order_guard', true) = '1' THEN
        RETURN NEW;
    END IF;

    NEW.buyer_id := OLD.buyer_id;
    NEW.vendor_id := OLD.vendor_id;
    NEW.total_amount := OLD.total_amount;
    NEW.delivery_location := OLD.delivery_location;
    NEW.delivery_notes := OLD.delivery_notes;
    NEW.delivery_confirmed_at := OLD.delivery_confirmed_at;

    v_is_vendor := EXISTS (
        SELECT 1 FROM public.vendors
        WHERE vendors.id = OLD.vendor_id AND vendors.owner_id = auth.uid()
    );

    IF v_is_vendor THEN
        RETURN NEW;
    END IF;

    NEW.payment_status := OLD.payment_status;
    NEW.payment_method := OLD.payment_method;
    IF NOT (OLD.status = 'pending' AND NEW.status = 'cancelled') THEN
        NEW.status := OLD.status;
    END IF;

    RETURN NEW;
END;
$$;

-- 2. Review tables --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    vendor_rating INTEGER NOT NULL CHECK (vendor_rating BETWEEN 1 AND 5),
    comment TEXT CHECK (comment IS NULL OR char_length(comment) <= 1000),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    admin_note TEXT,
    moderated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_product_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES public.order_reviews(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    UNIQUE (review_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_order_reviews_vendor ON public.order_reviews(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_order_reviews_status ON public.order_reviews(status, created_at);
CREATE INDEX IF NOT EXISTS idx_product_ratings_product ON public.order_product_ratings(product_id);

ALTER TABLE public.order_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_product_ratings ENABLE ROW LEVEL SECURITY;

-- Rows are written only by the functions below. Reading:
--   buyer  -> their own reviews
--   vendor -> approved reviews about them (to learn from feedback)
--   admin  -> everything
DROP POLICY IF EXISTS "Read order reviews" ON public.order_reviews;
CREATE POLICY "Read order reviews" ON public.order_reviews
FOR SELECT TO authenticated
USING (
    public.is_admin()
    OR buyer_id = auth.uid()
    OR (status = 'approved' AND EXISTS (
        SELECT 1 FROM public.vendors v WHERE v.id = order_reviews.vendor_id AND v.owner_id = auth.uid()
    ))
);

DROP POLICY IF EXISTS "Read product ratings" ON public.order_product_ratings;
CREATE POLICY "Read product ratings" ON public.order_product_ratings
FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.order_reviews r WHERE r.id = order_product_ratings.review_id)
);

REVOKE ALL ON public.order_reviews, public.order_product_ratings FROM anon, authenticated;
GRANT SELECT ON public.order_reviews, public.order_product_ratings TO authenticated;

-- 3. Buyer confirms delivery ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_delivery(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    v_owner UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Please sign in.';
    END IF;

    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;

    IF NOT FOUND OR v_order.buyer_id <> auth.uid() THEN
        RAISE EXCEPTION 'Order not found.';
    END IF;

    IF v_order.status = 'cancelled' THEN
        RAISE EXCEPTION 'This order was cancelled.';
    END IF;

    IF v_order.delivery_confirmed_at IS NOT NULL THEN
        RETURN; -- already confirmed
    END IF;

    PERFORM set_config('app.bypass_order_guard', '1', true);

    UPDATE public.orders
    SET status = 'completed',
        delivery_confirmed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;

    PERFORM set_config('app.bypass_order_guard', '0', true);

    SELECT owner_id INTO v_owner FROM public.vendors WHERE id = v_order.vendor_id;

    IF v_owner IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (v_owner, 'Delivery confirmed',
                'A buyer confirmed they received their order. Nice work!',
                'delivery_confirmed', '/vendor/orders');
    END IF;
END;
$$;

-- 4. Buyer rates the vendor and products --------------------------------------------------
-- p_product_ratings format: [{"product_id": "<uuid>", "rating": 5}, ...]
CREATE OR REPLACE FUNCTION public.submit_order_review(
    p_order_id UUID,
    p_vendor_rating INTEGER,
    p_comment TEXT DEFAULT NULL,
    p_product_ratings JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    v_review UUID;
    v_status TEXT := 'pending';
    v_require TEXT;
    v_item JSONB;
    v_pid UUID;
    v_rating INTEGER;
    v_name TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Please sign in.';
    END IF;

    IF p_vendor_rating IS NULL OR p_vendor_rating NOT BETWEEN 1 AND 5 THEN
        RAISE EXCEPTION 'Please give the vendor a rating from 1 to 5 stars.';
    END IF;

    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;

    IF NOT FOUND OR v_order.buyer_id <> auth.uid() THEN
        RAISE EXCEPTION 'Order not found.';
    END IF;

    IF v_order.delivery_confirmed_at IS NULL THEN
        RAISE EXCEPTION 'Confirm that you received the order before rating it.';
    END IF;

    IF v_order.vendor_id IS NULL THEN
        RAISE EXCEPTION 'This vendor no longer exists.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.order_reviews WHERE order_id = p_order_id) THEN
        RAISE EXCEPTION 'You have already reviewed this order.';
    END IF;

    SELECT value INTO v_require FROM public.platform_settings WHERE key = 'reviews_require_approval';
    IF lower(COALESCE(v_require, 'true')) = 'false' THEN
        v_status := 'approved';
    END IF;

    INSERT INTO public.order_reviews (order_id, buyer_id, vendor_id, vendor_rating, comment, status, moderated_at)
    VALUES (
        p_order_id, auth.uid(), v_order.vendor_id, p_vendor_rating,
        NULLIF(btrim(COALESCE(p_comment, '')), ''),
        v_status,
        CASE WHEN v_status = 'approved' THEN NOW() END
    )
    RETURNING id INTO v_review;

    IF p_product_ratings IS NOT NULL AND jsonb_typeof(p_product_ratings) = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_product_ratings)
        LOOP
            BEGIN
                v_pid := (v_item->>'product_id')::UUID;
                v_rating := (v_item->>'rating')::INTEGER;
            EXCEPTION WHEN OTHERS THEN
                CONTINUE;
            END;

            CONTINUE WHEN v_rating IS NULL OR v_rating NOT BETWEEN 1 AND 5;

            -- Only products that were actually in this order can be rated.
            CONTINUE WHEN NOT EXISTS (
                SELECT 1 FROM public.order_items oi
                WHERE oi.order_id = p_order_id AND oi.product_id = v_pid
            );

            INSERT INTO public.order_product_ratings (review_id, product_id, rating)
            VALUES (v_review, v_pid, v_rating)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    SELECT business_name INTO v_name FROM public.vendors WHERE id = v_order.vendor_id;

    -- Comments go to the administration.
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT a.user_id,
           'New buyer review',
           p_vendor_rating || '★ for ' || COALESCE(v_name, 'a vendor')
               || CASE WHEN v_status = 'pending' THEN ' — waiting for your approval.' ELSE '.' END,
           'admin_alert',
           '/admin/reviews'
    FROM public.admins a;

    IF v_status = 'approved' THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        SELECT v.owner_id, 'You got a new rating',
               'A buyer rated you ' || p_vendor_rating || '★.', 'new_review', '/vendor/insights'
        FROM public.vendors v WHERE v.id = v_order.vendor_id;
    END IF;

    RETURN v_review;
END;
$$;

-- 5. Admin moderation ----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.moderate_review(
    p_review_id UUID,
    p_status TEXT,
    p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_review public.order_reviews%ROWTYPE;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Admins only.';
    END IF;

    IF p_status NOT IN ('approved', 'rejected', 'pending') THEN
        RAISE EXCEPTION 'Invalid status.';
    END IF;

    SELECT * INTO v_review FROM public.order_reviews WHERE id = p_review_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Review not found.';
    END IF;

    UPDATE public.order_reviews
    SET status = p_status,
        admin_note = NULLIF(btrim(COALESCE(p_note, '')), ''),
        moderated_at = NOW()
    WHERE id = p_review_id;

    IF p_status = 'approved' AND v_review.status <> 'approved' THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        SELECT v.owner_id, 'You got a new rating',
               'A buyer rated you ' || v_review.vendor_rating || '★.', 'new_review', '/vendor/insights'
        FROM public.vendors v WHERE v.id = v_review.vendor_id;
    END IF;
END;
$$;

-- 6. Public star averages + ranking score --------------------------------------------------------
-- rank_score is a "Bayesian average": a vendor with a single 5★ doesn't
-- leapfrog a vendor with fifty 4.8★ ratings. Everyone starts as if they had
-- 3 ratings equal to the marketplace average, and real ratings move them
-- up or down from there.
-- Views run with the owner's rights on purpose; they expose only star
-- numbers, never comments or buyer names.
CREATE OR REPLACE VIEW public.vendor_rating_stats AS
WITH base AS (
    SELECT vendor_id, COUNT(*)::INTEGER AS rating_count, AVG(vendor_rating)::NUMERIC AS rating_avg
    FROM public.order_reviews
    WHERE status = 'approved'
    GROUP BY vendor_id
),
prior AS (
    SELECT COALESCE((SELECT AVG(vendor_rating)::NUMERIC FROM public.order_reviews WHERE status = 'approved'), 3.5) AS c
),
delivered AS (
    SELECT vendor_id, COUNT(*)::INTEGER AS delivered_orders
    FROM public.orders
    WHERE delivery_confirmed_at IS NOT NULL AND vendor_id IS NOT NULL
    GROUP BY vendor_id
)
SELECT v.id AS vendor_id,
       COALESCE(b.rating_count, 0) AS rating_count,
       ROUND(b.rating_avg, 2) AS rating_avg,
       COALESCE(d.delivered_orders, 0) AS delivered_orders,
       ROUND(((COALESCE(b.rating_count, 0) * COALESCE(b.rating_avg, 0)) + 3 * p.c)
             / (COALESCE(b.rating_count, 0) + 3), 3) AS rank_score
FROM public.vendors v
CROSS JOIN prior p
LEFT JOIN base b ON b.vendor_id = v.id
LEFT JOIN delivered d ON d.vendor_id = v.id;

CREATE OR REPLACE VIEW public.product_rating_stats AS
WITH base AS (
    SELECT r.product_id, COUNT(*)::INTEGER AS rating_count, AVG(r.rating)::NUMERIC AS rating_avg
    FROM public.order_product_ratings r
    JOIN public.order_reviews o ON o.id = r.review_id
    WHERE o.status = 'approved'
    GROUP BY r.product_id
),
prior AS (
    SELECT COALESCE((
        SELECT AVG(r.rating)::NUMERIC
        FROM public.order_product_ratings r
        JOIN public.order_reviews o ON o.id = r.review_id
        WHERE o.status = 'approved'
    ), 3.5) AS c
)
SELECT b.product_id,
       b.rating_count,
       ROUND(b.rating_avg, 2) AS rating_avg,
       ROUND(((b.rating_count * b.rating_avg) + 3 * p.c) / (b.rating_count + 3), 3) AS rank_score
FROM base b CROSS JOIN prior p;

GRANT SELECT ON public.vendor_rating_stats, public.product_rating_stats TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.confirm_delivery(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_order_review(UUID, INTEGER, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_review(UUID, TEXT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_delivery(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_order_review(UUID, INTEGER, TEXT, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.moderate_review(UUID, TEXT, TEXT) FROM anon;

SELECT 'Delivery confirmation and ratings ready (017).' AS message;