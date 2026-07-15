import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPinned, Plus, Trash2, Home } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-5 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-lg bg-background/20 flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><MapPinned className="w-5 h-5" /> Safe Zones</h1>
            <p className="text-xs opacity-85">Geofence home, office, college</p>
          </div>
        </div>
      </header>

      <main className="container py-5 space-y-4">
        {insideId && (
          <div className="bg-secondary/10 border-2 border-secondary rounded-2xl p-4 text-center">
            <Home className="w-6 h-6 text-secondary mx-auto mb-1" />
            <p className="text-sm font-bold text-secondary">Inside a safe zone 💚</p>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold">Add current location as safe zone</p>
          <Input placeholder="Name (Home, Office…)" value={name} onChange={(e) => setName(e.target.value)} />
          <div>
            <label className="text-xs text-muted-foreground">Radius: {radius} m</label>
            <input type="range" min={50} max={1000} step={50} value={radius} onChange={(e) => setRadius(+e.target.value)} className="w-full" />
          </div>
          <Button onClick={addHere} className="w-full"><Plus className="w-4 h-4 mr-2" /> Save Here</Button>
        </div>

        <div className="space-y-2">
          {zones.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No safe zones yet</p>}
          {zones.map(z => (
            <div key={z.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{z.name}</p>
                <p className="text-xs text-muted-foreground">Radius {z.radiusM}m · {z.lat.toFixed(4)}, {z.lng.toFixed(4)}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(z.id)}><Trash2 className="w-4 h-4 text-primary" /></Button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default SafeZones;
