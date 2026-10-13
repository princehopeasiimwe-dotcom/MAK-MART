-- =========================================================
-- MIGRATION: platform_settings
-- A simple key-value table for admin-editable configuration,
-- starting with the vendor WhatsApp community group link so
-- it can be changed without a code deploy.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.platform_settings (key, value)
VALUES ('vendor_whatsapp_group_link', '')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.platform_settings;
CREATE POLICY "Authenticated users can view settings"
ON public.platform_settings FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins manage settings" ON public.platform_settings;
CREATE POLICY "Admins manage settings"
ON public.platform_settings FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

SELECT 'platform_settings table created successfully!' AS message;