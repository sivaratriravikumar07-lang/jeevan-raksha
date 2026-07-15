import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, MapPin, Shield } from "lucide-react";
import { getCurrentPosition } from "@/lib/emergency";
import { toast } from "sonner";

interface Zone { name: string; lat: number; lng: number; radiusKm: number; risk: "high" | "medium" | "low"; reason: string; }

// Sample crime-hotspot / risk demo data for Vijayawada + nearby
const ZONES: Zone[] = [
  { name: "Benz Circle (late night)", lat: 16.5062, lng: 80.6480, radiusKm: 1.0, risk: "medium", reason: "Late-night eve-teasing reports" },
  { name: "Kanaka Durga Flyover underpass", lat: 16.5193, lng: 80.6094, radiusKm: 0.5, risk: "medium", reason: "Poor lighting after 10 PM" },
  { name: "Railway Station backside", lat: 16.5171, lng: 80.6183, radiusKm: 0.8, risk: "high", reason: "Theft & harassment complaints" },
  { name: "Bhavanipuram lanes", lat: 16.5028, lng: 80.6023, radiusKm: 0.6, risk: "high", reason: "Multiple SOS reports" },
  { name: "Auto Nagar bypass", lat: 16.4880, lng: 80.7050, radiusKm: 1.2, risk: "medium", reason: "Isolated road at night" },
  { name: "Gollapudi bypass", lat: 16.5432, lng: 80.5776, radiusKm: 1.0, risk: "low", reason: "Occasional incidents" },
];

const distanceKm = (a: {lat:number,lng:number}, b: {lat:number,lng:number}) => {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

const DangerZones = () => {
  const navigate = useNavigate();
  const [pos, setPos] = useState<{lat:number,lng:number} | null>(null);

  useEffect(() => {
    getCurrentPosition()
      .then((p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }))
      .catch(() => toast.error("Location needed to check nearby zones"));
  }, []);

  const riskColor = (r: string) => r === "high" ? "bg-primary text-primary-foreground" : r === "medium" ? "bg-orange-500 text-white" : "bg-yellow-500 text-black";

  const enriched = pos
    ? ZONES.map(z => ({ ...z, distance: distanceKm(pos, z) })).sort((a,b) => a.distance - b.distance)
    : ZONES.map(z => ({ ...z, distance: null as number | null }));

  const inside = pos ? enriched.filter(z => (z.distance ?? 99) <= z.radiusKm) : [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-emergency text-primary-foreground">
        <div className="container py-5 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-lg bg-background/20 flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Danger Zones</h1>
            <p className="text-xs opacity-90">Community-reported risk areas near you</p>
          </div>
        </div>
      </header>

      <main className="container py-5 space-y-4">
        {inside.length > 0 && (
          <div className="bg-primary/10 border-2 border-primary rounded-2xl p-4">
            <p className="text-sm font-bold text-primary flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> You're near {inside.length} risk zone{inside.length>1?"s":""}</p>
            <p className="text-xs text-muted-foreground mt-1">Stay alert · share live location · keep SOS ready</p>
          </div>
        )}
        {!pos && <p className="text-sm text-muted-foreground">Detecting location…</p>}

        {enriched.map((z, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-semibold text-sm flex items-center gap-1"><MapPin className="w-3 h-3" /> {z.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{z.reason}</p>
                {z.distance !== null && (
                  <p className="text-xs mt-1">📍 {z.distance.toFixed(1)} km away · radius {z.radiusKm} km</p>
                )}
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${riskColor(z.risk)}`}>{z.risk}</span>
            </div>
            <a
              href={`https://maps.google.com/?q=${z.lat},${z.lng}`}
              target="_blank" rel="noreferrer"
              className="text-xs text-secondary font-semibold mt-2 inline-block"
            >View on map →</a>
          </div>
        ))}

        <div className="text-xs text-muted-foreground p-3 flex items-start gap-2">
          <Shield className="w-3 h-3 mt-0.5 shrink-0" />
          <span>Data is community-curated. Report new incidents from History → Add Incident.</span>
        </div>
      </main>
    </div>
  );
};

export default DangerZones;
