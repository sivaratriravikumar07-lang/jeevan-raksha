CREATE TABLE public.danger_zone_cache (
  cell_key TEXT PRIMARY KEY,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  area_label TEXT,
  zones JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.danger_zone_cache TO authenticated;
GRANT ALL ON public.danger_zone_cache TO service_role;
ALTER TABLE public.danger_zone_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read cached danger zones" ON public.danger_zone_cache FOR SELECT TO authenticated USING (true);