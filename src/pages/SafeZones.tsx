import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPinned, Plus, Trash2, Home, ShieldAlert, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getCurrentPosition, watchPosition, clearWatch } from "@/lib/emergency";

interface SafeZone { id: string; name: string; lat: number; lng: number; radiusM: number; }

const KEY = "jr_safe_zones";

const distanceM = (a:{lat:number,lng:number}, b:{lat:number,lng:number}) => {
  const R = 6371000;
  const dLat = (b.lat-a.lat)*Math.PI/180;
  const dLng = (b.lng-a.lng)*Math.PI/180;
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
};

const SafeZones = () => {
  const navigate = useNavigate();
  const [zones, setZones] = useState<SafeZone[]>(() => {
    const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : [];
  });
  const [name, setName] = useState("");
  const [radius, setRadius] = useState(200);
  const [current, setCurrent] = useState<{lat:number,lng:number} | null>(null);
  const [insideId, setInsideId] = useState<string | null>(null);
  const wasInsideRef = useRef<string | null>(null);

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(zones)); }, [zones]);

  useEffect(() => {
    const id = watchPosition((p) => setCurrent({ lat: p.coords.latitude, lng: p.coords.longitude }));
    return () => clearWatch(id);
  }, []);

  useEffect(() => {
    if (!current) return;
    const hit = zones.find(z => distanceM(current, z) <= z.radiusM);
    const newId = hit?.id ?? null;
    if (newId !== insideId) {
      if (newId && newId !== wasInsideRef.current) toast.success(`Entered safe zone: ${hit!.name}`);
      if (!newId && wasInsideRef.current) toast.warning(`Left safe zone — stay alert`);
      wasInsideRef.current = newId;
      setInsideId(newId);
    }
  }, [current, zones, insideId]);

  const addHere = async () => {
    if (!name.trim()) return toast.error("Enter zone name");
    try {
      const p = await getCurrentPosition();
      const z: SafeZone = { id: crypto.randomUUID(), name: name.trim(), lat: p.coords.latitude, lng: p.coords.longitude, radiusM: radius };
      setZones([z, ...zones]);
      setName("");
      toast.success(`Saved ${z.name}`);
    } catch { toast.error("Couldn't get location"); }
  };

  const remove = (id: string) => setZones(zones.filter(z => z.id !== id));

  const insideZone = zones.find((z) => z.id === insideId) ?? null;
  const ranked = current
    ? [...zones].map((z) => ({ ...z, dist: distanceM(current, z) })).sort((a, b) => a.dist - b.dist)
    : zones.map((z) => ({ ...z, dist: null as number | null }));
  const fmt = (m: number) => (m < 1000 ? `${Math.round(m)} m away` : `${(m / 1000).toFixed(1)} km away`);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-5 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-lg bg-background/20 flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><MapPinned className="w-5 h-5" /> Safe Zones</h1>
            <p className="text-xs opacity-85">Home, office, college — meeru safe ga unnara ani check chestundi</p>
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
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold">Add current location as safe zone</p>
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
          {ranked.map(z => (
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
    </div>
  );
};


export default SafeZones;
