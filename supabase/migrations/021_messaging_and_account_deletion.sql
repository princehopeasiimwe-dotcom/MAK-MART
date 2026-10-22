-- =========================================================
-- MIGRATION 021: in-app messaging + delete my account
--
-- MESSAGING (vendors, service providers and the admin team only;
-- customers are not part of it):
--   * support chat   a vendor/provider <-> the MAK MART admin team.
--                    Every admin can see and answer it.
--   * direct chat    one active vendor/provider <-> another.
--                    Private to the two people (admins can't read it).
--
-- DELETE MY ACCOUNT: delete_my_account('DELETE') removes the account and
-- its store/products/services/events. Buyers with open orders or requests
-- are notified first.
-- =========================================================

-- 1. Helpers --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_business_user(p_uid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = p_uid)
        OR EXISTS (SELECT 1 FROM public.vendors WHERE owner_id = p_uid)
        OR EXISTS (SELECT 1 FROM public.service_providers WHERE owner_id = p_uid);
$$;

CREATE OR REPLACE FUNCTION public.is_active_business_user(p_uid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = p_uid)
        OR EXISTS (SELECT 1 FROM public.vendors WHERE owner_id = p_uid AND is_active)
        OR EXISTS (SELECT 1 FROM public.service_providers WHERE owner_id = p_uid AND is_active);
$$;

CREATE OR REPLACE FUNCTION public.business_label(p_uid UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(
        (SELECT business_name FROM public.vendors WHERE owner_id = p_uid LIMIT 1),
        (SELECT business_name FROM public.service_providers WHERE owner_id = p_uid LIMIT 1),
        (SELECT full_name FROM public.profiles WHERE id = p_uid),
        'MAK MART user'
    );
$$;

-- 2. Tables -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind TEXT NOT NULL CHECK (kind IN ('support', 'direct')),
    user_a UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_b UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_preview TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (kind = 'support' AND user_b IS NULL)
        OR (kind = 'direct' AND user_b IS NOT NULL AND user_a < user_b)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS conversations_support_unique
    ON public.conversations(user_a) WHERE kind = 'support';
CREATE UNIQUE INDEX IF NOT EXISTS conversations_direct_unique
    ON public.conversations(user_a, user_b) WHERE kind = 'direct';
CREATE INDEX IF NOT EXISTS idx_conversations_b ON public.conversations(user_b);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sender_is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS public.conversation_reads (
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_reads ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_conversation_member(p_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = p_id
          AND (c.user_a = auth.uid() OR c.user_b = auth.uid()
               OR (c.kind = 'support' AND public.is_admin()))
    );
$$;

DROP POLICY IF EXISTS "Members read conversations" ON public.conversations;
CREATE POLICY "Members read conversations" ON public.conversations
FOR SELECT TO authenticated USING (public.is_conversation_member(id));

DROP POLICY IF EXISTS "Members read messages" ON public.messages;
CREATE POLICY "Members read messages" ON public.messages
FOR SELECT TO authenticated USING (public.is_conversation_member(conversation_id));

DROP POLICY IF EXISTS "Read own reads" ON public.conversation_reads;
CREATE POLICY "Read own reads" ON public.conversation_reads
FOR SELECT TO authenticated USING (user_id = auth.uid());

REVOKE ALL ON public.conversations, public.messages, public.conversation_reads FROM anon, authenticated;
GRANT SELECT ON public.conversations, public.messages, public.conversation_reads TO authenticated;

-- 3. Starting chats ---------------------------------------------------------------
-- Vendor/provider -> admin team (one shared thread per account).
CREATE OR REPLACE FUNCTION public.open_support_chat(p_user UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_target UUID;
    v_id UUID;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Please sign in.';
    END IF;

    IF public.is_admin() THEN
        -- Admin opens the support thread of a vendor/provider.
        v_target := p_user;
        IF v_target IS NULL OR NOT public.is_business_user(v_target) OR public.is_admin_user(v_target) THEN
            RAISE EXCEPTION 'Choose a vendor or service provider.';
        END IF;
    ELSE
        IF NOT public.is_business_user(v_uid) THEN
            RAISE EXCEPTION 'Messaging is for vendors and service providers.';
        END IF;
        v_target := v_uid;
    END IF;

    SELECT id INTO v_id FROM public.conversations WHERE kind = 'support' AND user_a = v_target;
    IF v_id IS NULL THEN
        INSERT INTO public.conversations (kind, user_a) VALUES ('support', v_target) RETURNING id INTO v_id;
    END IF;
    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user(p_uid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = p_uid);
$$;

-- One approved vendor/provider -> another.
CREATE OR REPLACE FUNCTION public.open_direct_chat(p_other UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_a UUID;
    v_b UUID;
    v_id UUID;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Please sign in.';
    END IF;

    IF p_other IS NULL OR p_other = v_uid THEN
        RAISE EXCEPTION 'Choose someone to message.';
    END IF;

    -- Chatting with an admin always goes through the shared support thread.
    IF public.is_admin_user(p_other) THEN
        RETURN public.open_support_chat();
    END IF;

    IF public.is_admin() THEN
        RETURN public.open_support_chat(p_other);
    END IF;

    IF NOT public.is_active_business_user(v_uid) THEN
        RAISE EXCEPTION 'You can message other vendors once your account is approved. You can still message the admin team.';
    END IF;

    IF NOT public.is_active_business_user(p_other) THEN
        RAISE EXCEPTION 'That account is not available for messages.';
    END IF;

    v_a := LEAST(v_uid, p_other);
    v_b := GREATEST(v_uid, p_other);

    SELECT id INTO v_id FROM public.conversations WHERE kind = 'direct' AND user_a = v_a AND user_b = v_b;
    IF v_id IS NULL THEN
        INSERT INTO public.conversations (kind, user_a, user_b) VALUES ('direct', v_a, v_b) RETURNING id INTO v_id;
    END IF;
    RETURN v_id;
END;
$$;

-- 4. Sending / reading ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_message(p_conversation UUID, p_body TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_conv public.conversations%ROWTYPE;
    v_body TEXT := btrim(COALESCE(p_body, ''));
    v_is_admin BOOLEAN := public.is_admin();
    v_id UUID;
    v_label TEXT;
    v_link TEXT;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Please sign in.';
    END IF;

    IF v_body = '' THEN
        RAISE EXCEPTION 'Type a message first.';
    END IF;

    IF char_length(v_body) > 2000 THEN
        RAISE EXCEPTION 'Messages can be up to 2000 characters.';
    END IF;

    SELECT * INTO v_conv FROM public.conversations WHERE id = p_conversation;
    IF NOT FOUND OR NOT public.is_conversation_member(p_conversation) THEN
        RAISE EXCEPTION 'Conversation not found.';
    END IF;

    -- Direct chats need both sides to still be approved business accounts.
    IF v_conv.kind = 'direct' AND NOT (
        public.is_active_business_user(v_conv.user_a) AND public.is_active_business_user(v_conv.user_b)
    ) THEN
        RAISE EXCEPTION 'This chat is no longer available.';
    END IF;

    IF (SELECT COUNT(*) FROM public.messages WHERE sender_id = v_uid AND created_at > NOW() - INTERVAL '1 minute') >= 20 THEN
        RAISE EXCEPTION 'You are sending messages too fast. Please wait a moment.';
    END IF;

    INSERT INTO public.messages (conversation_id, sender_id, sender_is_admin, body)
    VALUES (p_conversation, v_uid, v_is_admin AND v_conv.kind = 'support', v_body)
    RETURNING id INTO v_id;

    UPDATE public.conversations
    SET last_message_at = NOW(), last_message_preview = left(v_body, 120)
    WHERE id = p_conversation;

    INSERT INTO public.conversation_reads (conversation_id, user_id, last_read_at)
    VALUES (p_conversation, v_uid, NOW())
    ON CONFLICT (conversation_id, user_id) DO UPDATE SET last_read_at = NOW();

    v_link := '/messages?c=' || p_conversation::text;
    v_label := CASE WHEN v_is_admin AND v_conv.kind = 'support' THEN 'MAK MART Admin' ELSE public.business_label(v_uid) END;

    -- Notify the other side (skip if they already have an unread notice for this chat).
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT r.uid, 'New message from ' || v_label, left(v_body, 100), 'message', v_link
    FROM (
        SELECT CASE
                 WHEN v_conv.kind = 'direct' THEN (CASE WHEN v_conv.user_a = v_uid THEN v_conv.user_b ELSE v_conv.user_a END)
                 WHEN v_is_admin THEN v_conv.user_a
               END AS uid
        UNION ALL
        SELECT a.user_id FROM public.admins a
        WHERE v_conv.kind = 'support' AND NOT v_is_admin
    ) r
    WHERE r.uid IS NOT NULL AND r.uid <> v_uid
      AND NOT EXISTS (
          SELECT 1 FROM public.notifications n
          WHERE n.user_id = r.uid AND n.type = 'message' AND n.link = v_link AND n.is_read = FALSE
      );

    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_conversation_member(p_conversation) THEN
        RETURN;
    END IF;

    INSERT INTO public.conversation_reads (conversation_id, user_id, last_read_at)
    VALUES (p_conversation, auth.uid(), NOW())
    ON CONFLICT (conversation_id, user_id) DO UPDATE SET last_read_at = NOW();

    UPDATE public.notifications
    SET is_read = TRUE
    WHERE user_id = auth.uid() AND type = 'message' AND link = '/messages?c=' || p_conversation::text;
END;
$$;

-- The inbox list.
CREATE OR REPLACE FUNCTION public.my_conversations()
RETURNS TABLE (
    id UUID,
    kind TEXT,
    title TEXT,
    subtitle TEXT,
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    unread BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT c.id,
           c.kind,
           CASE
               WHEN c.kind = 'direct' THEN public.business_label(CASE WHEN c.user_a = auth.uid() THEN c.user_b ELSE c.user_a END)
               WHEN public.is_admin() THEN public.business_label(c.user_a)
               ELSE 'MAK MART Admin'
           END AS title,
           CASE
               WHEN c.kind = 'direct' THEN CASE
                   WHEN EXISTS (SELECT 1 FROM public.vendors v WHERE v.owner_id = (CASE WHEN c.user_a = auth.uid() THEN c.user_b ELSE c.user_a END)) THEN 'Vendor'
                   ELSE 'Service provider' END
               WHEN public.is_admin() THEN 'Support · ' || CASE
                   WHEN EXISTS (SELECT 1 FROM public.vendors v WHERE v.owner_id = c.user_a) THEN 'vendor'
                   ELSE 'service provider' END
               ELSE 'Support team'
           END AS subtitle,
           c.last_message_at,
           c.last_message_preview,
           EXISTS (
               SELECT 1 FROM public.messages m
               LEFT JOIN public.conversation_reads r ON r.conversation_id = c.id AND r.user_id = auth.uid()
               WHERE m.conversation_id = c.id
                 AND m.created_at > COALESCE(r.last_read_at, 'epoch'::timestamptz)
                 AND m.sender_id IS DISTINCT FROM auth.uid()
           ) AS unread
    FROM public.conversations c
    WHERE c.user_a = auth.uid() OR c.user_b = auth.uid()
       OR (c.kind = 'support' AND public.is_admin())
    ORDER BY c.last_message_at DESC
    LIMIT 100;
$$;

CREATE OR REPLACE FUNCTION public.unread_message_count()
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COUNT(*)::INTEGER FROM public.my_conversations() WHERE unread;
$$;

-- Who can I start a chat with?
CREATE OR REPLACE FUNCTION public.message_directory()
RETURNS TABLE (user_id UUID, name TEXT, kind TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_business_user(auth.uid()) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT v.owner_id, v.business_name, 'Vendor'::TEXT
    FROM public.vendors v
    WHERE v.is_active AND v.owner_id <> auth.uid()
    UNION ALL
    SELECT sp.owner_id, sp.business_name, 'Service provider'::TEXT
    FROM public.service_providers sp
    WHERE sp.is_active AND sp.owner_id <> auth.uid()
      AND NOT EXISTS (SELECT 1 FROM public.vendors v2 WHERE v2.owner_id = sp.owner_id AND v2.is_active)
    ORDER BY 2;
END;
$$;

GRANT EXECUTE ON FUNCTION public.open_support_chat(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_direct_chat(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_message(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_conversations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.unread_message_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.message_directory() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.open_support_chat(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.open_direct_chat(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.send_message(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_conversation_read(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_conversations() FROM anon;
REVOKE EXECUTE ON FUNCTION public.unread_message_count() FROM anon;
REVOKE EXECUTE ON FUNCTION public.message_directory() FROM anon;

-- Live updates in the chat window (messages are still protected by the policy above).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
       AND NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
       ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
END;
$$;

-- 5. Delete my account ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_my_account(p_confirm TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_name TEXT;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Please sign in.';
    END IF;

    IF p_confirm IS DISTINCT FROM 'DELETE' THEN
        RAISE EXCEPTION 'Type DELETE to confirm.';
    END IF;

    IF public.is_admin() THEN
        RAISE EXCEPTION 'Admin accounts can''t be deleted from the app. Remove admin access first.';
    END IF;

    v_name := public.business_label(v_uid);

    -- The order protection trigger would otherwise undo the automatic
    -- "vendor removed" link clean-up on orders.
    PERFORM set_config('app.bypass_order_guard', '1', true);

    -- Tell buyers whose orders / requests are still open.
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT DISTINCT o.buyer_id, 'Order update',
           v_name || ' has closed their store, so your open order can no longer be fulfilled.',
           'order_status', '/account'
    FROM public.orders o
    JOIN public.vendors v ON v.id = o.vendor_id
    WHERE v.owner_id = v_uid
      AND o.buyer_id <> v_uid
      AND o.delivery_confirmed_at IS NULL
      AND o.status NOT IN ('completed', 'cancelled');

    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT DISTINCT r.buyer_id, 'Service request update',
           v_name || ' has closed their services, so your open request can no longer be fulfilled.',
           'service_request_status', '/account'
    FROM public.service_requests r
    JOIN public.service_providers sp ON sp.id = r.provider_id
    WHERE sp.owner_id = v_uid
      AND r.buyer_id <> v_uid
      AND r.delivery_confirmed_at IS NULL
      AND r.status IN ('pending', 'accepted');

    -- Orders they placed as a buyer (the link to the buyer can't be left empty).
    DELETE FROM public.orders WHERE buyer_id = v_uid;

    -- Events they posted would otherwise stay online with no owner.
    DELETE FROM public.events WHERE created_by = v_uid;

    -- Removing the login cascades to the profile, store, products, services,
    -- reviews, notifications, saved items and chats.
    DELETE FROM auth.users WHERE id = v_uid;

    PERFORM set_config('app.bypass_order_guard', '0', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_my_account(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_my_account(TEXT) FROM anon;

SELECT 'Messaging and account deletion ready (021).' AS message;