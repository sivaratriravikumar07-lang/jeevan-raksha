import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Navigation, Play, StopCircle, AlertTriangle, MapPin, Gauge, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { SafetyMap, type MapMarker } from "@/components/SafetyMap";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import { buildEmergencyMessage, openSmsToAll, type ContactLite } from "@/lib/sms";

// Haversine (metres)
const distM = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

// Perpendicular distance from point P to line A→B (planar approximation)
const perpDistance = (a: { lat: number; lng: number }, b: { lat: number; lng: number }, p: { lat: number; lng: number }) => {
  const toM = (lat: number, lng: number) => ({ x: lng * 111320 * Math.cos((a.lat * Math.PI) / 180), y: lat * 110540 });
  const A = toM(a.lat, a.lng), B = toM(b.lat, b.lng), P = toM(p.lat, p.lng);
  const dx = B.x - A.x, dy = B.y - A.y;
  const len2 = dx * dx + dy * dy;
  if (!len2) return Math.hypot(P.x - A.x, P.y - A.y);
  const t = Math.max(0, Math.min(1, ((P.x - A.x) * dx + (P.y - A.y) * dy) / len2));
  return Math.hypot(P.x - (A.x + t * dx), P.y - (A.y + t * dy));
};

const fmtDur = (s: number) => {
  if (s <= 0) return "0:00";
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};

const Journey = () => {
  const { user } = useAuth();
  const [destination, setDestination] = useState("");
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [eta, setEta] = useState<number>(30); // minutes
  const [active, setActive] = useState(false);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [speedKmh, setSpeedKmh] = useState(0);
  const [alerted, setAlerted] = useState(false);
  const [arrived, setArrived] = useState(false);

  const { coords, error } = useLiveLocation(0); // real-time, every fix
  const here = coords ? { lat: coords.lat, lng: coords.lng } : null;

  const alertedRef = useRef(false);
  const arrivedRef = useRef(false);
  const lateRef = useRef(false);
  const lastLogRef = useRef(0);
  const prevRef = useRef<{ lat: number; lng: number; t: number } | null>(null);

  // 1s ticker for live countdown
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  const geocode = async () => {
    if (!destination.trim()) return;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(destination)}`);
      const d = await r.json();
      if (!d?.[0]) return toast.error("Place not found");
      setDestCoords({ lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) });
      toast.success("Destination set");
    } catch { toast.error("Geocoding failed"); }
  };

  const sendContacts = async (c: { lat: number; lng: number }, prefix: string) => {
    if (!user) return;
    const [profileR, contactsR] = await Promise.all([
      supabase.from("profiles").select("full_name, phone, blood_group, emergency_message").eq("id", user.id).maybeSingle(),
      supabase.from("emergency_contacts").select("name, phone").eq("user_id", user.id),
    ]);
    const contacts: ContactLite[] = (contactsR.data ?? []) as ContactLite[];
    if (!contacts.length) return;
    const msg = prefix + "\n\n" + buildEmergencyMessage({
      name: profileR.data?.full_name ?? "Friend",
      phone: profileR.data?.phone,
      bloodGroup: profileR.data?.blood_group,
      note: profileR.data?.emergency_message,
    }, c);
    openSmsToAll(contacts, msg);
  };

  const start = async () => {
    if (!destCoords) return toast.error("Set destination first");
    if (!here) return toast.error("Waiting for GPS — try again in a moment");
    setOrigin(here);
    setStartedAt(Date.now());
    setActive(true);
    setArrived(false); setAlerted(false);
    alertedRef.current = false; arrivedRef.current = false; lateRef.current = false;
    toast.success("Live journey tracking started");
    await sendContacts(here, "🛡️ Journey started — track me to " + destination);
  };

  const stop = () => {
    setActive(false);
    setStartedAt(null);
    prevRef.current = null;
  };

  // Real-time evaluation on every GPS fix
  useEffect(() => {
    if (!active || !here || !destCoords || !origin) return;

    // live speed
    const prev = prevRef.current;
    const t = Date.now();
    if (prev) {
      const dt = (t - prev.t) / 1000;
      if (dt > 1) {
        const v = (distM(prev, here) / dt) * 3.6;
        setSpeedKmh((s) => Math.round((s * 0.5 + v * 0.5) * 10) / 10);
        prevRef.current = { ...here, t };
      }
    } else prevRef.current = { ...here, t };

    // live trail logged to backend for responders / family tracking
    if (user && t - lastLogRef.current > 15000) {
      lastLogRef.current = t;
      void supabase.from("location_logs").insert({
        user_id: user.id,
        latitude: here.lat,
        longitude: here.lng,
        accuracy: coords?.accuracy ?? null,
      });
    }

    const dDest = distM(here, destCoords);

    if (dDest < 80 && !arrivedRef.current) {
      arrivedRef.current = true;
      setArrived(true);
      toast.success("Arrived safely 🎉");
      navigator.vibrate?.(200);
      void sendContacts(here, "✅ I arrived safely at " + destination);
      stop();
      return;
    }

    if (!alertedRef.current && perpDistance(origin, destCoords, here) > 500) {
      alertedRef.current = true;
      setAlerted(true);
      toast.error("Route deviation detected — contacts alerted");
      navigator.vibrate?.([200, 100, 200]);
      void sendContacts(here, "⚠️ Route deviation detected");
    }
  }, [active, coords?.lat, coords?.lng]);

  // Live overdue check
  useEffect(() => {
    if (!active || !startedAt || !here || lateRef.current) return;
    if (now - startedAt > (eta + 10) * 60 * 1000) {
      lateRef.current = true;
      toast.error("Not arrived on time — alerting contacts");
      void sendContacts(here, "⚠️ Not arrived within expected time");
    }
  }, [now, active, startedAt, eta]);

  const distToDest = here && destCoords ? distM(here, destCoords) : null;
  const totalDist = origin && destCoords ? distM(origin, destCoords) : null;
  const progress = totalDist && distToDest != null ? Math.min(100, Math.max(0, ((totalDist - distToDest) / totalDist) * 100)) : 0;
  const remainingSec = startedAt ? (eta * 60 * 1000 - (now - startedAt)) / 1000 : 0;
  const liveEtaMin = distToDest != null && speedKmh > 1 ? Math.round(distToDest / 1000 / speedKmh * 60) : null;

  const markers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = [];
    if (here) list.push({ lat: here.lat, lng: here.lng, title: "You", color: "#dc2626" });
    if (destCoords) list.push({ lat: destCoords.lat, lng: destCoords.lng, title: "Destination", color: "#2563eb" });
    return list;
  }, [here?.lat, here?.lng, destCoords]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-5 flex items-center gap-3">
          <Link to="/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="font-bold text-lg">Safe Journey Tracker</h1>
            <p className="text-xs opacity-85">Live GPS · deviation & delay alerts</p>
          </div>
        </div>
      </header>

      <main className="container -mt-4 space-y-4 pt-4">
        <SafetyMap center={here ?? destCoords} markers={markers} zoom={15} className="h-56" />

        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${coords ? "bg-secondary animate-pulse" : "bg-muted-foreground"}`} />
          {error ? error : coords ? `Live GPS · ±${Math.round(coords.accuracy)}m` : "Getting live location…"}
        </p>

        <div className="bg-card border border-border rounded-3xl p-5 shadow-card space-y-3">
          <div>
            <Label htmlFor="dest">Destination</Label>
            <div className="flex gap-2 mt-1">
              <Input id="dest" placeholder="e.g. Vijayawada Railway Station" value={destination}
                onChange={(e) => setDestination(e.target.value)} disabled={active} />
              <Button onClick={geocode} disabled={active} variant="outline">Set</Button>
            </div>
            {destCoords && <p className="text-[11px] text-muted-foreground mt-1">📍 {destCoords.lat.toFixed(4)}, {destCoords.lng.toFixed(4)}</p>}
          </div>
          <div>
            <Label htmlFor="eta">Expected travel time (minutes)</Label>
            <Input id="eta" type="number" min={1} value={eta} onChange={(e) => setEta(parseInt(e.target.value) || 30)} disabled={active} />
          </div>
          {!active ? (
            <Button onClick={start} size="lg" className="w-full bg-gradient-trust">
              <Play className="w-4 h-4 mr-2" /> Start Journey
            </Button>
          ) : (
            <Button onClick={stop} size="lg" variant="destructive" className="w-full">
              <StopCircle className="w-4 h-4 mr-2" /> End Journey
            </Button>
          )}
        </div>

        {active && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold"><Navigation className="w-4 h-4 text-secondary animate-pulse" /> Tracking active</div>

            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-gradient-trust transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground">{Math.round(progress)}% of the way there</p>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-muted/40 p-2">
                <p className="text-[10px] text-muted-foreground">Distance left</p>
                <p className="text-sm font-bold">{distToDest != null ? `${(distToDest / 1000).toFixed(2)} km` : "—"}</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-2">
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Gauge className="w-3 h-3" /> Speed</p>
                <p className="text-sm font-bold">{speedKmh.toFixed(1)} km/h</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-2">
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Timer className="w-3 h-3" /> Time left</p>
                <p className={`text-sm font-bold ${remainingSec < 0 ? "text-destructive" : ""}`}>{remainingSec < 0 ? "Overdue" : fmtDur(remainingSec)}</p>
              </div>
            </div>

            {liveEtaMin != null && <p className="text-xs text-muted-foreground">Live ETA at current speed: <b>{liveEtaMin} min</b></p>}
            {here && <p className="text-xs text-muted-foreground"><MapPin className="w-3 h-3 inline" /> {here.lat.toFixed(5)}, {here.lng.toFixed(5)}</p>}

            {alerted && (
              <div className="flex items-center gap-2 text-xs text-destructive font-semibold pt-2 border-t border-border">
                <AlertTriangle className="w-4 h-4" /> Deviation alert sent to contacts
              </div>
            )}
          </div>
        )}

        {arrived && !active && (
          <div className="rounded-2xl border-2 border-secondary bg-secondary/10 p-4 text-center text-sm font-semibold text-secondary">
            ✅ Arrived safely — contacts notified
          </div>
        )}

        <div className="text-[11px] text-muted-foreground p-3 bg-muted/40 rounded-xl">
          ⓘ Contacts get an SMS when you start, if you deviate &gt;500m from the straight path, if you don't arrive on time, and when you arrive safely. Your live trail is saved every 15s.
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Journey;
