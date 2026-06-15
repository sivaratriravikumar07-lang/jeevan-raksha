import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MapPin, Share2, Copy, StopCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";

const genToken = () => Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);

const ShareLocation = () => {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const watchRef = useRef<number | null>(null);

  const shareUrl = token ? `${window.location.origin}/track/${token}` : "";

  const start = async () => {
    const t = genToken();
    setToken(t);
    const exp = Date.now() + 60 * 60 * 1000; // 1 hour
    setExpiresAt(exp);
    const ch = supabase.channel(`share-${t}`, { config: { broadcast: { self: false } } });
    await ch.subscribe();
    channelRef.current = ch;

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy };
        setCoords(c);
        ch.send({
          type: "broadcast",
          event: "loc",
          payload: { ...c, ts: Date.now(), name: user?.email?.split("@")[0] ?? "User", expiresAt: exp },
        });
      },
      (err) => toast.error("GPS error: " + err.message),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    setSharing(true);
    toast.success("Live sharing started · 1 hour");
  };

  const stop = () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    watchRef.current = null;
    channelRef.current = null;
    setSharing(false);
    setToken(null);
    setCoords(null);
    toast.info("Sharing stopped");
  };

  useEffect(() => () => { stop(); /* eslint-disable-next-line */ }, []);

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied");
  };
  const sysShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: "My live location", text: "Track me live for the next hour:", url: shareUrl });
    } else copyLink();
  };
  const whatsapp = () => window.open(`https://wa.me/?text=${encodeURIComponent(`Track me live: ${shareUrl}`)}`, "_blank");

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-5 flex items-center gap-3">
          <Link to="/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-bold text-lg">Live Location Share</h1>
        </div>
      </header>

      <main className="container -mt-4 space-y-4">
        <div className="bg-card border border-border rounded-3xl p-6 shadow-card text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-secondary/10 flex items-center justify-center mb-3">
            <MapPin className={`w-10 h-10 text-secondary ${sharing ? "animate-pulse" : ""}`} />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Generate a shareable link — anyone with it can see your live GPS for 1 hour.
          </p>
          {!sharing ? (
            <Button onClick={start} size="lg" className="w-full bg-gradient-trust">
              <Play className="w-4 h-4 mr-2" /> Start Sharing
            </Button>
          ) : (
            <Button onClick={stop} size="lg" variant="destructive" className="w-full">
              <StopCircle className="w-4 h-4 mr-2" /> Stop Sharing
            </Button>
          )}
        </div>

        {sharing && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="text-xs text-muted-foreground">Share link · expires {expiresAt ? new Date(expiresAt).toLocaleTimeString() : ""}</div>
            <div className="p-3 rounded-xl bg-muted text-xs font-mono break-all">{shareUrl}</div>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={copyLink}><Copy className="w-3 h-3 mr-1" />Copy</Button>
              <Button variant="outline" size="sm" onClick={sysShare}><Share2 className="w-3 h-3 mr-1" />Share</Button>
              <Button variant="outline" size="sm" onClick={whatsapp}>WhatsApp</Button>
            </div>
            {coords && (
              <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                Live: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} · ±{Math.round(coords.acc)}m
              </div>
            )}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default ShareLocation;
