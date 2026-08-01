import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Hospital, MapPin, Navigation, RefreshCw, Shield, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import { SafetyMap, MapCircle, MapMarker } from "@/components/SafetyMap";
import { distanceKm } from "@/lib/maps";
import { vibrate } from "@/lib/emergency";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Level = "low" | "medium" | "high" | "critical";

interface Zone {
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
  level: Level;
  type: string;
  reason: string;
  advice: string;
}

const LEVEL_COLOR: Record<Level, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#f97316",
  critical: "#dc2626",
};

const TYPE_LABEL: Record<string, string> = {
  high_crime: "High Crime Area",
  crime_hotspot: "Crime Hotspot",
  accident_prone: "Accident-Prone Zone",
  women_safety: "Women Safety Risk",
  poor_lighting: "Poorly Lit Area",
  flood_prone: "Flood-Prone Area",
  disaster_alert: "Disaster Alert Area",
};

const TIPS = [
  "Stay on well-lit main roads and avoid shortcuts.",
  "Share your live location with a trusted contact now.",
  "Keep your phone unlocked with SOS one tap away.",
  "Walk confidently, avoid headphones, stay aware.",
];

const DangerZones = () => {
  const navigate = useNavigate();
  const { coords, anchor, error: gpsError } = useLiveLocation(500);
  const [zones, setZones] = useState<Zone[]>([]);
  const [areaLabel, setAreaLabel] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [police, setPolice] = useState<{ name: string; lat: number; lng: number; distanceKm: number }[]>([]);
  const [hospitals, setHospitals] = useState<{ name: string; lat: number; lng: number; distanceKm: number }[]>([]);
  const alertedRef = useRef<Set<string>>(new Set());

  const fetchZones = async (lat: number, lng: number) => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase.functions.invoke("danger-zones", { body: { lat, lng } });
      if (error) throw error;
      setZones(Array.isArray(data?.zones) ? data.zones : []);
      setAreaLabel(data?.areaLabel ?? "");
      setUpdatedAt(data?.updatedAt ?? new Date().toISOString());
    } catch (e) {
      console.error(e);
      setLoadError("Couldn't load risk data. Check your internet and retry.");
    } finally {
      setLoading(false);
    }
  };

  const fetchResponders = async (lat: number, lng: number) => {
    const pull = async (kind: "police" | "hospital") => {
      const { data } = await supabase.functions.invoke("nearby-places", {
        body: { lat, lng, kind, radius: 8000 },
      });
      return Array.isArray(data?.places) ? data.places.slice(0, 3) : [];
    };
    try {
      const [p, h] = await Promise.all([pull("police"), pull("hospital")]);
      setPolice(p);
      setHospitals(h);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!anchor) return;
    fetchZones(anchor.lat, anchor.lng);
    fetchResponders(anchor.lat, anchor.lng);
  }, [anchor?.lat, anchor?.lng]);

  const enriched = useMemo(() => {
    if (!coords) return zones.map((z) => ({ ...z, distance: null as number | null }));
    return zones
      .map((z) => ({ ...z, distance: distanceKm(coords, z) }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [zones, coords?.lat, coords?.lng]);

  const inside = enriched.filter((z) => z.distance !== null && z.distance <= z.radiusKm);
  const nearest = enriched[0];

  // Voice + vibration alert on entering a high/critical zone
  useEffect(() => {
    const risky = inside.find((z) => z.level === "high" || z.level === "critical");
    if (!risky || alertedRef.current.has(risky.name)) return;
    alertedRef.current.add(risky.name);
    vibrate([300, 150, 300, 150, 600]);
    toast.error(`Entering ${TYPE_LABEL[risky.type] ?? "risk area"}: ${risky.name}`);
    try {
      const u = new SpeechSynthesisUtterance("Warning! You are entering a high-risk area.");
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.error(e);
    }
  }, [inside.map((z) => z.name).join("|")]);

  const markers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = enriched.map((z) => ({
      lat: z.lat,
      lng: z.lng,
      title: z.name,
      color: LEVEL_COLOR[z.level],
      info: `<div style="font:13px system-ui;max-width:220px"><b>${z.name}</b><br/>${TYPE_LABEL[z.type] ?? z.type} · ${z.level.toUpperCase()}<br/>${z.distance !== null ? `${z.distance.toFixed(1)} km away<br/>` : ""}${z.advice}</div>`,
    }));
    if (coords) list.push({ lat: coords.lat, lng: coords.lng, title: "You", color: "#2563eb", info: "<b>You are here</b>" });
    police.forEach((p) => list.push({ lat: p.lat, lng: p.lng, title: p.name, color: "#1d4ed8" }));
    hospitals.forEach((h) => list.push({ lat: h.lat, lng: h.lng, title: h.name, color: "#0ea5e9" }));
    return list;
  }, [enriched, coords?.lat, coords?.lng, police, hospitals]);

  const circles: MapCircle[] = enriched.map((z) => ({
    lat: z.lat,
    lng: z.lng,
    radiusKm: z.radiusKm,
    color: LEVEL_COLOR[z.level],
  }));

  const safestRoute = () => {
    if (!coords || !nearest) return;
    // Route to the nearest safe haven (police station) avoiding highways-free walking directions
    const target = police[0] ?? hospitals[0];
    if (!target) return toast.error("No safe destination found nearby yet.");
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${coords.lat},${coords.lng}&destination=${target.lat},${target.lng}&travelmode=driving`,
      "_blank",
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-emergency text-primary-foreground">
        <div className="container flex items-center gap-3 py-5">
          <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/20">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <AlertTriangle className="h-5 w-5" /> Danger Zones
            </h1>
            <p className="truncate text-xs opacity-90">{areaLabel || "Detecting your area…"}</p>
          </div>
          <button
            onClick={() => anchor && (fetchZones(anchor.lat, anchor.lng), fetchResponders(anchor.lat, anchor.lng))}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/20"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="container space-y-4 py-5">
        {gpsError && (
          <div className="rounded-2xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">{gpsError}</div>
        )}

        {inside.length > 0 && (
          <div className="animate-pulse rounded-2xl border-2 border-primary bg-primary/10 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-primary">
              <Volume2 className="h-4 w-4" /> Warning — you are inside {inside.length} risk zone
              {inside.length > 1 ? "s" : ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{inside[0].advice}</p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {TIPS.map((t) => (
                <li key={t}>• {t}</li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              {police[0] && (
                <Button size="sm" variant="secondary" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${police[0].lat},${police[0].lng}`, "_blank")}>
                  <Shield className="mr-1 h-3 w-3" /> Police
                </Button>
              )}
              {hospitals[0] && (
                <Button size="sm" variant="secondary" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${hospitals[0].lat},${hospitals[0].lng}`, "_blank")}>
                  <Hospital className="mr-1 h-3 w-3" /> Hospital
                </Button>
              )}
              <Button size="sm" onClick={safestRoute}>
                <Navigation className="mr-1 h-3 w-3" /> Safest route
              </Button>
            </div>
          </div>
        )}

        <SafetyMap center={coords} markers={markers} circles={circles} className="h-72" zoom={13} />

        <div className="grid grid-cols-4 gap-2 text-[10px]">
          {(["low", "medium", "high", "critical"] as Level[]).map((l) => (
            <div key={l} className="flex items-center gap-1 rounded-lg border border-border bg-card p-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: LEVEL_COLOR[l] }} />
              <span className="capitalize">{l}</span>
            </div>
          ))}
        </div>

        {nearest?.distance !== null && nearest && (
          <p className="text-xs text-muted-foreground">
            Nearest risk zone: <span className="font-semibold text-foreground">{nearest.name}</span> ·{" "}
            {nearest.distance!.toFixed(2)} km away
          </p>
        )}

        {loading && <p className="text-sm text-muted-foreground">Analysing risk areas around you…</p>}
        {loadError && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button size="sm" className="mt-2" onClick={() => anchor && fetchZones(anchor.lat, anchor.lng)}>
              Retry
            </Button>
          </div>
        )}

        {enriched.map((z, i) => (
          <div key={`${z.name}-${i}`} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="flex items-center gap-1 text-sm font-semibold">
                  <MapPin className="h-3 w-3" /> {z.name}
                </p>
                <p className="mt-1 text-xs font-medium" style={{ color: LEVEL_COLOR[z.level] }}>
                  {TYPE_LABEL[z.type] ?? z.type}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{z.reason}</p>
                <p className="mt-1 text-xs text-muted-foreground">🛡 {z.advice}</p>
                <p className="mt-1 text-xs">
                  {z.distance !== null ? `📍 ${z.distance.toFixed(2)} km away · ` : ""}radius {z.radiusKm} km
                </p>
                {updatedAt && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Updated {new Date(updatedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <span
                className="rounded-full px-2 py-1 text-[10px] font-bold uppercase text-white"
                style={{ background: LEVEL_COLOR[z.level] }}
              >
                {z.level}
              </span>
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${z.lat},${z.lng}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs font-semibold text-secondary"
            >
              View on map →
            </a>
          </div>
        ))}

        {!loading && zones.length === 0 && !loadError && (
          <p className="text-sm text-muted-foreground">Waiting for your GPS location…</p>
        )}
      </main>
    </div>
  );
};

export default DangerZones;
