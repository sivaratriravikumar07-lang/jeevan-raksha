
-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'police', 'hospital');
CREATE TYPE public.incident_status AS ENUM ('active', 'responded', 'resolved', 'false_alarm');
CREATE TYPE public.incident_type AS ENUM ('sos', 'voice', 'manual', 'auto_detected');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  blood_group TEXT,
  emergency_message TEXT DEFAULT 'I need help! This is an emergency.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Emergency contacts
CREATE TABLE public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  relationship TEXT,
  priority INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_contacts TO authenticated;
GRANT ALL ON public.emergency_contacts TO service_role;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Incidents
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.incident_type NOT NULL DEFAULT 'sos',
  status public.incident_status NOT NULL DEFAULT 'active',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  notes TEXT,
  responder_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidents TO authenticated;
GRANT ALL ON public.incidents TO service_role;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Location logs
CREATE TABLE public.location_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.location_logs TO authenticated;
GRANT ALL ON public.location_logs TO service_role;
ALTER TABLE public.location_logs ENABLE ROW LEVEL SECURITY;

-- Alerts
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Police stations
CREATE TABLE public.police_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.police_stations TO anon, authenticated;
GRANT ALL ON public.police_stations TO service_role;
ALTER TABLE public.police_stations ENABLE ROW LEVEL SECURITY;

-- Hospitals
CREATE TABLE public.hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  city TEXT,
  emergency_24x7 BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hospitals TO anon, authenticated;
GRANT ALL ON public.hospitals TO service_role;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

-- Policies: profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'police') OR public.has_role(auth.uid(), 'hospital'));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policies: user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Policies: emergency_contacts
CREATE POLICY "Users manage own contacts" ON public.emergency_contacts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Policies: incidents
CREATE POLICY "Users view own incidents" ON public.incidents FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'police') OR public.has_role(auth.uid(), 'hospital'));
CREATE POLICY "Users create own incidents" ON public.incidents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own incidents" ON public.incidents FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'police') OR public.has_role(auth.uid(), 'hospital'));

-- Policies: location_logs
CREATE POLICY "Users view own logs" ON public.location_logs FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'police'));
CREATE POLICY "Users insert own logs" ON public.location_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies: alerts
CREATE POLICY "Users view own alerts" ON public.alerts FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own alerts" ON public.alerts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies: public directories
CREATE POLICY "Anyone reads stations" ON public.police_stations FOR SELECT USING (true);
CREATE POLICY "Anyone reads hospitals" ON public.hospitals FOR SELECT USING (true);

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_logs;

-- Seed sample data
INSERT INTO public.police_stations (name, address, phone, latitude, longitude, city) VALUES
  ('Connaught Place Police Station', 'CP, New Delhi', '+911123341111', 28.6315, 77.2167, 'New Delhi'),
  ('Bandra Police Station', 'Bandra West, Mumbai', '+912226422222', 19.0596, 72.8295, 'Mumbai'),
  ('Koramangala Police Station', 'Koramangala, Bengaluru', '+918025534444', 12.9352, 77.6245, 'Bengaluru');

INSERT INTO public.hospitals (name, address, phone, latitude, longitude, city, emergency_24x7) VALUES
  ('AIIMS Delhi', 'Ansari Nagar, New Delhi', '+911126588500', 28.5672, 77.2100, 'New Delhi', true),
  ('Lilavati Hospital', 'Bandra West, Mumbai', '+912226751000', 19.0509, 72.8294, 'Mumbai', true),
  ('Manipal Hospital', 'HAL Old Airport Rd, Bengaluru', '+918025023344', 12.9583, 77.6493, 'Bengaluru', true);
