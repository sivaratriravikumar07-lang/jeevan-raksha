import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Navigation, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Loc { lat: number; lng: number; acc: number; ts: number; name: string; expiresAt: number }

const TrackLocation = () => {
  const { token } = useParams<{ token: string }>();
  const [loc, setLoc] = useState<Loc | null>(null);
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    if (!token) return;
    const ch = supabase.channel(`share-${token}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "loc" }, (msg) => {
      setLoc(msg.payload as Loc);
      setWaiting(false);
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [token]);

  const mapsUrl = loc ? `https://www.google.com/maps?q=${loc.lat},${loc.lng}` : "";
  const directionsUrl = loc ? `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}` : "";
  const embedUrl = loc
    ? `https://maps.google.com/maps?q=${loc.lat},${loc.lng}&z=16&output=embed`
    : "";

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-5">
          <h1 className="font-bold text-lg">Live tracking</h1>
          <p className="text-xs opacity-80">Real-time GPS · auto-updates</p>
        </div>
      </header>

      <main className="container py-4 space-y-4">
        {waiting && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-secondary/10 flex items-center justify-center animate-pulse mb-3">
              <MapPin className="w-6 h-6 text-secondary" />
            </div>
            <p className="text-sm font-semibold">Waiting for first location…</p>
            <p className="text-xs text-muted-foreground mt-1">The sharer's phone must be online with GPS on.</p>
          </div>
        )}

        {loc && (
          <>
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs text-muted-foreground">Tracking</p>
              <p className="font-bold text-lg">{loc.name}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Clock className="w-3 h-3" /> Last update: {new Date(loc.ts).toLocaleTimeString()} · ±{Math.round(loc.acc)}m
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden border border-border aspect-[4/5]">
              <iframe src={embedUrl} className="w-full h-full" loading="lazy" title="Live map" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 p-3 bg-card border border-border rounded-xl text-sm font-semibold">
                <MapPin className="w-4 h-4" /> Open Map
              </a>
              <a href={directionsUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 p-3 bg-gradient-trust text-secondary-foreground rounded-xl text-sm font-semibold">
                <Navigation className="w-4 h-4" /> Directions
              </a>
            </div>
            <p className="text-[11px] text-center text-muted-foreground">
              Sharing expires {new Date(loc.expiresAt).toLocaleTimeString()}
            </p>
          </>
        )}
      </main>
    </div>
  );
};

export default TrackLocation;
