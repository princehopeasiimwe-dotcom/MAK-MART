-- =========================================================
-- MIGRATION 025: private live debug feed (Realtime Broadcast)
-- Run after 024. Safe to run more than once.
--
-- Only admins may LISTEN to the "debug-logs" channel; any signed-in user may
-- SEND to it. Nothing is stored in any table.
-- =========================================================
DO $$
BEGIN
    DROP POLICY IF EXISTS "admins listen to debug logs" ON realtime.messages;
    CREATE POLICY "admins listen to debug logs" ON realtime.messages
    FOR SELECT TO authenticated
    USING (realtime.topic() = 'debug-logs' AND public.is_admin());

    DROP POLICY IF EXISTS "signed in users send debug logs" ON realtime.messages;
    CREATE POLICY "signed in users send debug logs" ON realtime.messages
    FOR INSERT TO authenticated
    WITH CHECK (realtime.topic() = 'debug-logs');
EXCEPTION WHEN undefined_table OR invalid_schema_name OR undefined_function THEN
    RAISE NOTICE 'Realtime authorization is not available on this project; the debug feed needs it.';
END $$;

SELECT 'Migration 025 applied: private debug feed.' AS message;
