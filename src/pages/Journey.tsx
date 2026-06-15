import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Navigation, Play, StopCircle, AlertTriangle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { buildEmergencyMessage, openSmsToAll, type ContactLite } from "@/lib/sms";

// Haversine
const distM = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

const Journey = () => {
  const { user } = useAuth();
  const [destination, setDestination] = useState("");
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [eta, setEta] = useState<number>(30); // minutes
  const [active, setActive] = useState(false);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
  const [distToDest, setDistToDest] = useState<number | null>(null);
  const [alerted, setAlerted] = useState(false);
  const watchRef = useRef<number | null>(null);
  const arrivalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const start = async () => {
    if (!destCoords) return toast.error("Set destination first");
    if (!navigator.geolocation) return toast.error("GPS unavailable");
    const pos = await new Promise<GeolocationPosition>((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true })
    ).catch(() => null);
    if (!pos) return toast.error("Could not get location");
    const o = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    setOrigin(o); setHere(o);

    watchRef.current = navigator.geolocation.watchPosition(async (p) => {
      const cur = { lat: p.coords.latitude, lng: p.coords.longitude };
      setHere(cur);
      const dDest = distM(cur, destCoords);
      setDistToDest(dDest);
      // Deviation: distance from straight line origin→dest > 500m
      const dev = perpDistance(o, destCoords, cur);
      if (dev > 500 && !alerted) {
        setAlerted(true);
        await alertContacts(cur, "⚠️ Route deviation detected");
      }
      // Arrived
      if (dDest < 80) {
        await notifyArrived(cur);
        stop();
      }
    }, () => {}, { enableHighAccuracy: true, maximumAge: 4000 });

    // Arrival timeout: if ETA + 10 min passes and not arrived → alert
    arrivalRef.current = setTimeout(() => {
      if (here) alertContacts(here, "⚠️ Not arrived within expected time");
    }, (eta + 10) * 60 * 1000);

    setActive(true);
    toast.success("Journey tracking started");
    await sendContacts(o, "🛡️ Journey started — track me to " + destination);
  };

  const stop = () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    if (arrivalRef.current) clearTimeout(arrivalRef.current);
    watchRef.current = null; arrivalRef.current = null;
    setActive(false); setAlerted(false);
  };
  useEffect(() => () => stop(), []);

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
  const alertContacts = (c: { lat: number; lng: number }, prefix: string) => sendContacts(c, prefix);
  const notifyArrived = (c: { lat: number; lng: number }) => sendContacts(c, "✅ I arrived safely at " + destination);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-5 flex items-center gap-3">
          <Link to="/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-bold text-lg">Safe Journey Tracker</h1>
        </div>
      </header>

      <main className="container -mt-4 space-y-4">
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
          <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold"><Navigation className="w-4 h-4 text-secondary" /> Tracking active</div>
            {here && <p className="text-xs text-muted-foreground"><MapPin className="w-3 h-3 inline" /> {here.lat.toFixed(5)}, {here.lng.toFixed(5)}</p>}
            {distToDest != null && <p className="text-xs">Distance to destination: <b>{(distToDest / 1000).toFixed(2)} km</b></p>}
            {alerted && (
              <div className="flex items-center gap-2 text-xs text-destructive font-semibold pt-2 border-t border-border">
                <AlertTriangle className="w-4 h-4" /> Deviation alert sent to contacts
              </div>
            )}
          </div>
        )}

        <div className="text-[11px] text-muted-foreground p-3 bg-muted/40 rounded-xl">
          ⓘ Contacts get an SMS when you start, if you deviate &gt;500m from the straight path, if you don't arrive on time, and when you arrive safely.
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

// Perpendicular distance from point P to line A→B (approximate, planar)
const perpDistance = (a: { lat: number; lng: number }, b: { lat: number; lng: number }, p: { lat: number; lng: number }) => {
  const toM = (lat: number, lng: number) => ({ x: lng * 111320 * Math.cos((a.lat * Math.PI) / 180), y: lat * 110540 });
  const A = toM(a.lat, a.lng), B = toM(b.lat, b.lng), P = toM(p.lat, p.lng);
  const dx = B.x - A.x, dy = B.y - A.y;
  const len2 = dx * dx + dy * dy;
  if (!len2) return Math.hypot(P.x - A.x, P.y - A.y);
  const t = Math.max(0, Math.min(1, ((P.x - A.x) * dx + (P.y - A.y) * dy) / len2));
  const projX = A.x + t * dx, projY = A.y + t * dy;
  return Math.hypot(P.x - projX, P.y - projY);
};

export default Journey;
