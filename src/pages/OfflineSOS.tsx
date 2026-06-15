import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MessageSquare, WifiOff, MapPin, Phone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { buildEmergencyMessage, openSmsToAll, type ContactLite } from "@/lib/sms";
import { toast } from "sonner";

const STORAGE_KEY = "jr_offline_cache_v1";

interface Cache {
  contacts: ContactLite[];
  profile: { name: string; phone?: string | null; bloodGroup?: string | null; note?: string | null };
  coords?: { lat: number; lng: number; ts: number };
}

const OfflineSOS = () => {
  const { user } = useAuth();
  const [online, setOnline] = useState(navigator.onLine);
  const [cache, setCache] = useState<Cache | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) try { setCache(JSON.parse(raw)); } catch {}
    refresh();
    // Track location aggressively while page open
    const id = navigator.geolocation?.watchPosition?.((p) => {
      setCache((prev) => {
        const next: Cache = {
          contacts: prev?.contacts ?? [],
          profile: prev?.profile ?? { name: "Friend" },
          coords: { lat: p.coords.latitude, lng: p.coords.longitude, ts: Date.now() },
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    }, () => {}, { enableHighAccuracy: true, maximumAge: 10000 });
    return () => { if (id != null) navigator.geolocation.clearWatch(id); };
    // eslint-disable-next-line
  }, [user]);

  const refresh = async () => {
    if (!user || !navigator.onLine) return;
    setRefreshing(true);
    const [p, c] = await Promise.all([
      supabase.from("profiles").select("full_name, phone, blood_group, emergency_message").eq("id", user.id).maybeSingle(),
      supabase.from("emergency_contacts").select("name, phone").eq("user_id", user.id),
    ]);
    setCache((prev) => {
      const next: Cache = {
        contacts: (c.data ?? []) as ContactLite[],
        profile: {
          name: p.data?.full_name ?? "Friend",
          phone: p.data?.phone,
          bloodGroup: p.data?.blood_group,
          note: p.data?.emergency_message,
        },
        coords: prev?.coords,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setRefreshing(false);
    toast.success("Offline pack refreshed");
  };

  const triggerOffline = () => {
    if (!cache || !cache.contacts.length) return toast.error("No contacts cached");
    const msg = buildEmergencyMessage(cache.profile, cache.coords ? { lat: cache.coords.lat, lng: cache.coords.lng } : null);
    openSmsToAll(cache.contacts, msg);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-5 flex items-center gap-3">
          <Link to="/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-bold text-lg flex items-center gap-2"><WifiOff className="w-5 h-5" /> Offline SOS</h1>
        </div>
      </header>

      <main className="container -mt-4 space-y-4">
        <div className={`rounded-2xl p-4 text-sm flex items-center justify-between ${online ? "bg-secondary/10 text-secondary" : "bg-destructive/10 text-destructive"}`}>
          <span className="font-semibold">{online ? "🟢 Online — pack auto-syncs" : "🔴 Offline — using cached pack"}</span>
          <Button size="sm" variant="ghost" onClick={refresh} disabled={!online || refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 shadow-elevated text-center">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Offline SOS · No internet needed</p>
          <button onClick={triggerOffline}
            className="w-40 h-40 rounded-full bg-gradient-emergency shadow-emergency mx-auto flex flex-col items-center justify-center text-primary-foreground active:scale-95 transition-transform">
            <MessageSquare className="w-9 h-9 mb-1" />
            <span className="text-2xl font-extrabold">SEND SMS</span>
            <span className="text-[10px] opacity-90 mt-0.5">To {cache?.contacts?.length ?? 0} contact(s)</span>
          </button>
          <p className="text-xs text-muted-foreground mt-4">Opens phone's native SMS app with all contacts pre-filled and last GPS attached.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <a href="tel:100" className="p-4 bg-card border border-border rounded-2xl text-center">
            <Phone className="w-5 h-5 text-primary mx-auto mb-1" />
            <div className="font-bold">100</div>
            <div className="text-[10px] text-muted-foreground">Police</div>
          </a>
          <a href="tel:112" className="p-4 bg-card border border-border rounded-2xl text-center">
            <Phone className="w-5 h-5 text-secondary mx-auto mb-1" />
            <div className="font-bold">112</div>
            <div className="text-[10px] text-muted-foreground">All-India SOS</div>
          </a>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 space-y-2 text-xs">
          <p className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-secondary" /> Cached pack</p>
          <p className="text-muted-foreground">Contacts: <b className="text-foreground">{cache?.contacts?.length ?? 0}</b></p>
          <p className="text-muted-foreground">Last GPS: {cache?.coords
            ? <b className="text-foreground">{cache.coords.lat.toFixed(4)}, {cache.coords.lng.toFixed(4)} · {new Date(cache.coords.ts).toLocaleTimeString()}</b>
            : <span className="text-destructive">none yet — keep this page open briefly to capture</span>}</p>
          <p className="text-muted-foreground pt-2 border-t border-border">ⓘ Calls (100/112) and outgoing SMS work over GSM even with zero data.</p>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default OfflineSOS;
