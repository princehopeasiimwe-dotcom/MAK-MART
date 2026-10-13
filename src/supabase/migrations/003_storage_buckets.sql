-- =========================================================
-- MIGRATION: Storage buckets for product/event/vendor images
-- Enables real file uploads instead of pasted external URLs.
-- =========================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('product-images', 'product-images', true),
  ('event-images', 'event-images', true),
  ('vendor-images', 'vendor-images', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view (buckets are public - needed to display images)
DROP POLICY IF EXISTS "Public can view product images bucket" ON storage.objects;
CREATE POLICY "Public can view product images bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Public can view event images bucket" ON storage.objects;
CREATE POLICY "Public can view event images bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Public can view vendor images bucket" ON storage.objects;
CREATE POLICY "Public can view vendor images bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'vendor-images');

-- Authenticated users can upload into a folder named after their
-- own auth.uid() - e.g. product-images/<user_id>/photo.jpg
DROP POLICY IF EXISTS "Users can upload their own product images" ON storage.objects;
CREATE POLICY "Users can upload their own product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can upload their own event images" ON storage.objects;
CREATE POLICY "Users can upload their own event images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can upload their own vendor images" ON storage.objects;
CREATE POLICY "Users can upload their own vendor images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vendor-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can replace/delete only their own uploaded files
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
TO authenticated
USING ((storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK ((storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING ((storage.foldername(name))[1] = auth.uid()::text);

SELECT 'Storage buckets and policies created successfully!' AS message;