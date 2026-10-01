CREATE TABLE public.volunteers (
  user_id uuid PRIMARY KEY,
  display_name text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  available boolean NOT NULL DEFAULT false,
  latitude double precision,
  longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteers TO authenticated;
GRANT ALL ON public.volunteers TO service_role;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Volunteers manage own row" ON public.volunteers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND verified = false OR auth.uid() = user_id AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage volunteers" ON public.volunteers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- prevent self-verification on update
CREATE OR REPLACE FUNCTION public.volunteers_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.verified IS DISTINCT FROM OLD.verified AND NOT public.has_role(auth.uid(),'admin') THEN
    NEW.verified := OLD.verified;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER volunteers_guard BEFORE UPDATE ON public.volunteers FOR EACH ROW EXECUTE FUNCTION public.volunteers_guard();

CREATE TABLE public.volunteer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES public.incidents(id) ON DELETE SET NULL,
  requester_id uuid NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  radius_m integer NOT NULL DEFAULT 3000,
  status text NOT NULL DEFAULT 'searching',
  accepted_volunteer_id uuid,
  volunteer_latitude double precision,
  volunteer_longitude double precision,
  timeout_at timestamptz NOT NULL DEFAULT now() + interval '90 seconds',
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.volunteer_requests TO authenticated;
GRANT ALL ON public.volunteer_requests TO service_role;
ALTER TABLE public.volunteer_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Requester or accepted volunteer view" ON public.volunteer_requests FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = accepted_volunteer_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Requester can cancel" ON public.volunteer_requests FOR UPDATE TO authenticated
  USING (auth.uid() = requester_id) WITH CHECK (auth.uid() = requester_id AND status IN ('cancelled'));

CREATE TABLE public.volunteer_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.volunteer_requests(id) ON DELETE CASCADE,
  volunteer_id uuid NOT NULL,
  response text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, volunteer_id)
);
GRANT SELECT ON public.volunteer_responses TO authenticated;
GRANT ALL ON public.volunteer_responses TO service_role;
ALTER TABLE public.volunteer_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own responses" ON public.volunteer_responses FOR SELECT TO authenticated USING (auth.uid() = volunteer_id);

CREATE OR REPLACE FUNCTION public.km_between(lat1 float8, lng1 float8, lat2 float8, lng2 float8)
RETURNS float8 LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT 6371 * 2 * asin(sqrt(power(sin(radians(lat2-lat1)/2),2) + cos(radians(lat1))*cos(radians(lat2))*power(sin(radians(lng2-lng1)/2),2)))
$$;

CREATE OR REPLACE FUNCTION public.create_volunteer_request(_incident_id uuid, _lat float8, _lng float8, _radius_m int DEFAULT 3000, _timeout_s int DEFAULT 90)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO volunteer_requests(incident_id, requester_id, latitude, longitude, radius_m, timeout_at)
  VALUES (_incident_id, auth.uid(), _lat, _lng, LEAST(GREATEST(_radius_m,500),5000), now() + make_interval(secs => LEAST(GREATEST(_timeout_s,30),600)))
  RETURNING id INTO rid;
  RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION public.count_nearby_volunteers(_request_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM volunteers v, volunteer_requests r
  WHERE r.id = _request_id AND r.requester_id = auth.uid() AND v.available AND v.user_id <> r.requester_id
    AND v.latitude IS NOT NULL AND v.updated_at > now() - interval '30 minutes'
    AND km_between(r.latitude, r.longitude, v.latitude, v.longitude) * 1000 <= r.radius_m
$$;

-- Open requests near the calling volunteer: only distance, never exact location
CREATE OR REPLACE FUNCTION public.open_requests_near_me()
RETURNS TABLE(id uuid, distance_km float8, created_at timestamptz, timeout_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, round(km_between(r.latitude, r.longitude, v.latitude, v.longitude)::numeric, 1)::float8, r.created_at, r.timeout_at
  FROM volunteers v JOIN volunteer_requests r ON true
  WHERE v.user_id = auth.uid() AND v.available AND v.latitude IS NOT NULL
    AND r.status = 'searching' AND r.timeout_at > now() AND r.requester_id <> v.user_id
    AND km_between(r.latitude, r.longitude, v.latitude, v.longitude) * 1000 <= r.radius_m
    AND NOT EXISTS (SELECT 1 FROM volunteer_responses x WHERE x.request_id = r.id AND x.volunteer_id = v.user_id)
  ORDER BY r.created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.respond_volunteer_request(_request_id uuid, _accept boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ok boolean := false; v volunteers;
BEGIN
  SELECT * INTO v FROM volunteers WHERE user_id = auth.uid() AND available;
  IF NOT FOUND THEN RAISE EXCEPTION 'not an available volunteer'; END IF;
  INSERT INTO volunteer_responses(request_id, volunteer_id, response)
  VALUES (_request_id, auth.uid(), CASE WHEN _accept THEN 'accept' ELSE 'reject' END)
  ON CONFLICT (request_id, volunteer_id) DO NOTHING;
  IF NOT _accept THEN RETURN false; END IF;
  UPDATE volunteer_requests SET status = 'accepted', accepted_volunteer_id = auth.uid(), accepted_at = now(),
    volunteer_latitude = v.latitude, volunteer_longitude = v.longitude, updated_at = now()
  WHERE id = _request_id AND status = 'searching' AND timeout_at > now() AND requester_id <> auth.uid()
    AND km_between(latitude, longitude, v.latitude, v.longitude) * 1000 <= radius_m
  RETURNING true INTO ok;
  RETURN COALESCE(ok, false);
END $$;

CREATE OR REPLACE FUNCTION public.update_volunteer_progress(_request_id uuid, _status text, _lat float8 DEFAULT NULL, _lng float8 DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _status NOT IN ('accepted','on_the_way','arrived','completed') THEN RAISE EXCEPTION 'bad status'; END IF;
  UPDATE volunteer_requests SET status = _status,
    volunteer_latitude = COALESCE(_lat, volunteer_latitude), volunteer_longitude = COALESCE(_lng, volunteer_longitude),
    completed_at = CASE WHEN _status = 'completed' THEN now() ELSE completed_at END, updated_at = now()
  WHERE id = _request_id AND accepted_volunteer_id = auth.uid() AND status NOT IN ('cancelled','completed','expired');
END $$;

CREATE OR REPLACE FUNCTION public.volunteer_info_for_request(_request_id uuid)
RETURNS TABLE(display_name text, verified boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.display_name, v.verified FROM volunteer_requests r JOIN volunteers v ON v.user_id = r.accepted_volunteer_id
  WHERE r.id = _request_id AND r.requester_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.requester_info_for_request(_request_id uuid)
RETURNS TABLE(first_name text, phone text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT split_part(p.full_name,' ',1), p.phone FROM volunteer_requests r JOIN profiles p ON p.id = r.requester_id
  WHERE r.id = _request_id AND r.accepted_volunteer_id = auth.uid() AND r.status NOT IN ('completed','cancelled','expired')
$$;

REVOKE EXECUTE ON FUNCTION public.create_volunteer_request, public.count_nearby_volunteers, public.open_requests_near_me, public.respond_volunteer_request, public.update_volunteer_progress, public.volunteer_info_for_request, public.requester_info_for_request FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_volunteer_request, public.count_nearby_volunteers, public.open_requests_near_me, public.respond_volunteer_request, public.update_volunteer_progress, public.volunteer_info_for_request, public.requester_info_for_request TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.volunteer_requests;