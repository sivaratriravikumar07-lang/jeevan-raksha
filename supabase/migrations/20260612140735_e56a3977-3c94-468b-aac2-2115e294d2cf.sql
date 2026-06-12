-- Storage policies for recordings bucket
CREATE POLICY "Users can upload own recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'recordings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'recordings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Service role full access recordings"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'recordings')
WITH CHECK (bucket_id = 'recordings');