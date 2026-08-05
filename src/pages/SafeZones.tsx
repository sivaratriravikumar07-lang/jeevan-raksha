import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPinned, Plus, Trash2, Home, ShieldAlert, Navigation, Satellite, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getCurrentPosition } from "@/lib/emergency";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import { SafetyMap, type MapMarker, type MapCircle } from "@/components/SafetyMap";
import { BottomNav } from "@/components/BottomNav";
import { sendZoneExitAlert } from "@/lib/zoneAlert";

interface SafeZone { id: string; name: string; lat: number; lng: number; radiusM: number; }

const KEY = "jr_safe_zones";
const ALERT_KEY = "jr_safe_zone_exit_alert";


const distanceM = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

const speak = (text: string) => {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1; u.lang = "en-IN";
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
};

const SafeZones = () => {
  const navigate = useNavigate();
  const [zones, setZones] = useState<SafeZone[]>(() => {
    const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : [];
  });
  const [name, setName] = useState("");
  const [radius, setRadius] = useState(200);
  const [insideId, setInsideId] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [exitAlert, setExitAlert] = useState<boolean>(() => localStorage.getItem(ALERT_KEY) !== "0");
  const [alerting, setAlerting] = useState(false);
  const [lastAlert, setLastAlert] = useState<string | null>(null);
  const wasInsideRef = useRef<string | null>(null);
  const firstFixRef = useRef(true);
  const exitAlertRef = useRef(exitAlert);
  useEffect(() => { exitAlertRef.current = exitAlert; localStorage.setItem(ALERT_KEY, exitAlert ? "1" : "0"); }, [exitAlert]);

  // Real-time GPS — every fix, no throttle
  const { coords, error } = useLiveLocation(0);
  const current = coords ? { lat: coords.lat, lng: coords.lng } : null;

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(zones)); }, [zones]);
  useEffect(() => { if (coords) setLastUpdate(new Date()); }, [coords]);

  const fireExitAlert = useCallback(async (zoneName: string, at: { lat: number; lng: number } | null) => {
    setAlerting(true);
    try {
      const res = await sendZoneExitAlert(zoneName, at);
      if (!res.contacts) {
        toast.error("No emergency contacts saved — add contacts to get exit alerts.");
      } else if (res.autoSent) {
        toast.success(`Alert SMS sent to ${res.autoSent} contact${res.autoSent > 1 ? "s" : ""} with live location.`);
        setLastAlert(`${zoneName} · ${new Date().toLocaleTimeString()}`);
      } else {
        toast.info(`SMS app opened for ${res.contacts} contact${res.contacts > 1 ? "s" : ""} — press send.`);
        setLastAlert(`${zoneName} · ${new Date().toLocaleTimeString()}`);
      }
    } catch (e: any) {
      toast.error("Alert failed: " + (e?.message ?? "unknown error"));
    } finally {
      setAlerting(false);
    }
  }, []);

  // Live geofence evaluation on every position update
  useEffect(() => {
    if (!current) return;
    const hit = zones.find((z) => distanceM(current, z) <= z.radiusM);
    const newId = hit?.id ?? null;
    if (newId === wasInsideRef.current) return;

    const wasFirst = firstFixRef.current;
    firstFixRef.current = false;

    if (newId && hit) {
      setInsideId(newId);
      wasInsideRef.current = newId;
      if (!wasFirst) {
        toast.success(`Entered safe zone: ${hit.name}`);
        navigator.vibrate?.(120);
        speak(`You have entered ${hit.name}. You are safe.`);
      }
      return;
    }

    setInsideId(null);
    const prevZone = zones.find((z) => z.id === wasInsideRef.current);
    wasInsideRef.current = null;
    if (prevZone && !wasFirst) {
      toast.warning(`Left ${prevZone.name} — stay alert`);
      navigator.vibrate?.([100, 60, 100]);
      speak(`You have left ${prevZone.name}. Alerting your emergency contacts.`);
      if (exitAlertRef.current) fireExitAlert(prevZone.name, current);
    }
  }, [current?.lat, current?.lng, zones, fireExitAlert]);


  const addHere = async () => {
    if (!name.trim()) return toast.error("Enter zone name");
    try {
      const p = current ?? (await getCurrentPosition().then((r) => ({ lat: r.coords.latitude, lng: r.coords.longitude })));
      const z: SafeZone = { id: crypto.randomUUID(), name: name.trim(), lat: p.lat, lng: p.lng, radiusM: radius };
      setZones([z, ...zones]);
      setName("");
      firstFixRef.current = true;
      toast.success(`Saved ${z.name}`);
    } catch { toast.error("Couldn't get location"); }
  };

  const remove = useCallback((id: string) => setZones((z) => z.filter((x) => x.id !== id)), []);

  const insideZone = zones.find((z) => z.id === insideId) ?? null;
  const ranked = current
    ? [...zones].map((z) => ({ ...z, dist: distanceM(current, z) })).sort((a, b) => a.dist - b.dist)
    : zones.map((z) => ({ ...z, dist: null as number | null }));
  const fmt = (m: number) => (m < 1000 ? `${Math.round(m)} m away` : `${(m / 1000).toFixed(1)} km away`);

  const circles: MapCircle[] = useMemo(
    () => zones.map((z) => ({ lat: z.lat, lng: z.lng, radiusKm: z.radiusM / 1000, color: z.id === insideId ? "#16a34a" : "#2563eb" })),
    [zones, insideId],
  );
  const markers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = zones.map((z) => ({ lat: z.lat, lng: z.lng, title: z.name, color: "#2563eb" }));
    if (current) list.push({ lat: current.lat, lng: current.lng, title: "You are here", color: "#dc2626" });
    return list;
  }, [zones, current?.lat, current?.lng]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-5 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-lg bg-background/20 flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><MapPinned className="w-5 h-5" /> Safe Zones</h1>
            <p className="text-xs opacity-85">Live geofencing — real-time entry & exit alerts</p>
          </div>
        </div>
      </header>

      <main className="container py-5 space-y-4">
        {/* Live status */}
        <div className={`rounded-2xl p-4 text-center border-2 ${insideZone ? "bg-secondary/10 border-secondary" : "bg-muted/40 border-border"}`}>
          {insideZone ? (
            <>
              <Home className="w-6 h-6 text-secondary mx-auto mb-1" />
              <p className="text-sm font-bold text-secondary">Inside “{insideZone.name}” — you are safe 💚</p>
            </>
          ) : (
            <>
              <ShieldAlert className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
              <p className="text-sm font-bold">Outside all safe zones</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {ranked[0]?.dist != null ? `Nearest: ${ranked[0].name} · ${fmt(ranked[0].dist)}` : "Stay alert. Add a zone below."}
              </p>
            </>
          )}
          <p className="text-[11px] text-muted-foreground mt-2 flex items-center justify-center gap-1">
            <span className={`w-2 h-2 rounded-full ${coords ? "bg-secondary animate-pulse" : "bg-muted-foreground"}`} />
            {error
              ? error
              : coords
                ? `Live GPS · ±${Math.round(coords.accuracy)}m${lastUpdate ? ` · updated ${lastUpdate.toLocaleTimeString()}` : ""}`
                : "Getting live location…"}
          </p>
        </div>

        <SafetyMap center={current} markers={markers} circles={circles} zoom={15} className="h-64" />

        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold flex items-center gap-2"><Satellite className="w-4 h-4 text-secondary" /> Add current location as safe zone</p>
          <div className="flex flex-wrap gap-2">
            {["Home", "Office", "College", "Hostel"].map((p) => (
              <button
                key={p}
                onClick={() => setName(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${name === p ? "bg-secondary text-secondary-foreground border-secondary" : "bg-muted/50 border-border"}`}
              >{p}</button>
            ))}
          </div>
          <Input placeholder="Name (Home, Office…)" value={name} onChange={(e) => setName(e.target.value)} />
          <div>
            <label className="text-xs text-muted-foreground">Radius: {radius} m</label>
            <input type="range" min={50} max={1000} step={50} value={radius} onChange={(e) => setRadius(+e.target.value)} className="w-full" />
          </div>
          <Button onClick={addHere} className="w-full"><Plus className="w-4 h-4 mr-2" /> Save Here</Button>
        </div>

        <div className="space-y-2">
          {zones.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No safe zones yet</p>}
          {ranked.map((z) => (
            <div key={z.id} className={`bg-card border rounded-2xl p-4 flex items-center justify-between ${z.id === insideId ? "border-secondary" : "border-border"}`}>
              <div className="min-w-0">
                <p className="font-semibold text-sm flex items-center gap-2">
                  {z.name}
                  {z.id === insideId && <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-bold uppercase">Inside</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  Radius {z.radiusM}m{z.dist != null ? ` · ${fmt(z.dist)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${z.lat},${z.lng}`} target="_blank" rel="noreferrer">
                  <Button size="icon" variant="ghost"><Navigation className="w-4 h-4 text-secondary" /></Button>
                </a>
                <Button size="icon" variant="ghost" onClick={() => remove(z.id)}><Trash2 className="w-4 h-4 text-primary" /></Button>
              </div>
            </div>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default SafeZones;
