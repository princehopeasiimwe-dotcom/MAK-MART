-- =========================================================
-- MIGRATION: automatic vendor/provider status notifications
-- Fires a notification the moment a vendor/provider signs up
-- (pending review), and again the moment an admin approves
-- them (is_active flips false -> true), including the vendor
-- WhatsApp community group link from platform_settings.
--
-- Implemented as triggers (not frontend code) so this can
-- never be silently skipped, regardless of which client
-- performs the insert/update.
-- =========================================================

CREATE OR REPLACE FUNCTION public.notify_new_vendor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
        NEW.owner_id,
        'Vendor account pending review',
        'Thanks for signing up, ' || NEW.business_name || '! Your store is awaiting admin approval. We''ll notify you as soon as it''s live.',
        'vendor_pending'
    );

    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT
        admins.user_id,
        'New vendor awaiting approval',
        NEW.business_name || ' just signed up and is waiting for review.',
        'admin_alert'
    FROM public.admins;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_vendor_created ON public.vendors;
CREATE TRIGGER on_vendor_created
AFTER INSERT ON public.vendors
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_vendor();


CREATE OR REPLACE FUNCTION public.notify_vendor_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    group_link TEXT;
BEGIN
    IF NEW.is_active = true AND OLD.is_active = false THEN
        SELECT value INTO group_link
        FROM public.platform_settings
        WHERE key = 'vendor_whatsapp_group_link';

        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.owner_id,
            'Your store is live!',
            'Congratulations, ' || NEW.business_name || ' has been approved and is now visible on KU Market.' ||
            CASE
                WHEN group_link IS NOT NULL AND group_link != ''
                THEN ' Join the vendor community group here: ' || group_link
                ELSE ''
            END,
            'vendor_approved'
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_vendor_approved ON public.vendors;
CREATE TRIGGER on_vendor_approved
AFTER UPDATE ON public.vendors
FOR EACH ROW
EXECUTE FUNCTION public.notify_vendor_approved();


-- Same two triggers for service_providers

CREATE OR REPLACE FUNCTION public.notify_new_provider()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
        NEW.owner_id,
        'Service account pending review',
        'Thanks for signing up, ' || NEW.business_name || '! Your service is awaiting admin approval. We''ll notify you as soon as it''s live.',
        'provider_pending'
    );

    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT
        admins.user_id,
        'New service provider awaiting approval',
        NEW.business_name || ' just signed up and is waiting for review.',
        'admin_alert'
    FROM public.admins;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_provider_created ON public.service_providers;
CREATE TRIGGER on_provider_created
AFTER INSERT ON public.service_providers
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_provider();


CREATE OR REPLACE FUNCTION public.notify_provider_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    group_link TEXT;
BEGIN
    IF NEW.is_active = true AND OLD.is_active = false THEN
        SELECT value INTO group_link
        FROM public.platform_settings
        WHERE key = 'vendor_whatsapp_group_link';

        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.owner_id,
            'Your service is live!',
            'Congratulations, ' || NEW.business_name || ' has been approved and is now visible on KU Market.' ||
            CASE
                WHEN group_link IS NOT NULL AND group_link != ''
                THEN ' Join the vendor community group here: ' || group_link
                ELSE ''
            END,
            'provider_approved'
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_provider_approved ON public.service_providers;
CREATE TRIGGER on_provider_approved
AFTER UPDATE ON public.service_providers
FOR EACH ROW
EXECUTE FUNCTION public.notify_provider_approved();

SELECT 'Vendor/provider notification triggers created successfully!' AS message;