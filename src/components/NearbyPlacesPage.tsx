import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, MapPin, Navigation, Phone, RefreshCw, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import { SafetyMap, MapMarker } from "@/components/SafetyMap";
import { Button } from "@/components/ui/button";

export interface NearbyPlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  userRatingCount: number | null;
  openNow: boolean | null;
  phone: string | null;
  distanceKm: number;
  durationMin: number | null;
}

const RADII = [1000, 3000, 5000, 10000];

interface Props {
  kind: "hospital" | "police";
  title: string;
  subtitle: string;
  accent: string; // hex marker color
  showOpenStatus?: boolean;
}

export const NearbyPlacesPage = ({ kind, title, subtitle, accent, showOpenStatus }: Props) => {
  const navigate = useNavigate();
  const { coords, anchor, error: gpsError } = useLiveLocation(300);
  const [radius, setRadius] = useState(5000);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (lat: number, lng: number, r: number) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("nearby-places", {
        body: { lat, lng, kind, radius: r },
      });
      if (fnError) throw fnError;
      setPlaces(Array.isArray(data?.places) ? data.places : []);
    } catch (e) {
      console.error(e);
      setError("Couldn't load nearby places. Check your internet and retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!anchor) return;
    load(anchor.lat, anchor.lng, radius);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor?.lat, anchor?.lng, radius, kind]);

  const markers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = places.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      title: p.name,
      color: accent,
      info: `<div style="font:13px system-ui;max-width:220px"><b>${p.name}</b><br/>${p.distanceKm.toFixed(1)} km${p.durationMin ? ` · ${p.durationMin} min` : ""}<br/>${p.address}</div>`,
    }));
    if (coords) list.push({ lat: coords.lat, lng: coords.lng, title: "You", color: "#2563eb", info: "<b>You are here</b>" });
    return list;
  }, [places, coords?.lat, coords?.lng, accent]);

  const navTo = (p: NearbyPlace) =>
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=driving`,
      "_blank",
    );

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container flex items-center gap-3 py-5">
          <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/20">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-xs opacity-90">{subtitle}</p>
          </div>
          <button
            onClick={() => anchor && load(anchor.lat, anchor.lng, radius)}
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

        <div className="flex gap-2">
          {RADII.map((r) => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={`flex-1 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                radius === r ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
              }`}
            >
              {r / 1000} km
            </button>
          ))}
        </div>

        <SafetyMap center={coords} markers={markers} className="h-64" zoom={14} />

        {loading && <p className="text-sm text-muted-foreground">Finding nearby places…</p>}
        {error && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button size="sm" className="mt-2" onClick={() => anchor && load(anchor.lat, anchor.lng, radius)}>
              Retry
            </Button>
          </div>
        )}
        {!loading && !error && places.length === 0 && anchor && (
          <p className="text-sm text-muted-foreground">Nothing found within {radius / 1000} km. Try a wider radius.</p>
        )}

        {places.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{p.address}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {p.distanceKm.toFixed(1)} km
                  </span>
                  {p.durationMin && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {p.durationMin} min
                    </span>
                  )}
                  {p.rating && (
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3" /> {p.rating} ({p.userRatingCount ?? 0})
                    </span>
                  )}
                  {showOpenStatus && p.openNow !== null && (
                    <span className={p.openNow ? "font-semibold text-success" : "font-semibold text-destructive"}>
                      {p.openNow ? "Open now" : "Closed"}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => navTo(p)}>
                <Navigation className="mr-1 h-3 w-3" /> Navigate
              </Button>
              {p.phone && (
                <Button size="sm" variant="secondary" asChild>
                  <a href={`tel:${p.phone}`}>
                    <Phone className="mr-1 h-3 w-3" /> Call
                  </a>
                </Button>
              )}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};
