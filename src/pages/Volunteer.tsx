import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BadgeCheck, HandHeart, MapPin, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";
import { vibrate } from "@/lib/emergency";

const db = supabase as any;
interface Vol { display_name: string; verified: boolean; available: boolean }
interface Open { id: string; distance_km: number; created_at: string }
interface Assigned { id: string; status: string; latitude: number; longitude: number }

const NEXT: Record<string, { to: string; label: string }> = {
  accepted: { to: "on_the_way", label: "I'm on the way" },
  on_the_way: { to: "arrived", label: "I've arrived" },
  arrived: { to: "completed", label: "Mark completed" },
};

const Volunteer = () => {
  const { user } = useAuth();
  const [vol, setVol] = useState<Vol | null>(null);
  const [name, setName] = useState("");
  const [open, setOpen] = useState<Open[]>([]);
  const [assigned, setAssigned] = useState<Assigned | null>(null);
  const [requester, setRequester] = useState<{ first_name: string; phone: string | null } | null>(null);
  const pos = useRef<{ lat: number; lng: number } | null>(null);
  const seen = useRef<Set<string>>(new Set());

  const loadVol = useCallback(async () => {
    if (!user) return;
    const { data } = await db.from("volunteers").select("display_name, verified, available").eq("user_id", user.id).maybeSingle();
    setVol(data);
  }, [user]);

  useEffect(() => { loadVol(); }, [loadVol]);

  // Keep volunteer location fresh while available
  useEffect(() => {
    if (!user || !vol?.available || !("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(async (p) => {
      pos.current = { lat: p.coords.latitude, lng: p.coords.longitude };
      await db.from("volunteers").update({ latitude: p.coords.latitude, longitude: p.coords.longitude }).eq("user_id", user.id);
    }, () => toast.error("Location needed to receive nearby requests"), { enableHighAccuracy: true, maximumAge: 20000 });
    return () => navigator.geolocation.clearWatch(id);
  }, [user, vol?.available]);

  const refresh = useCallback(async () => {
    if (!user || !vol?.available) { setOpen([]); }
    else {
      const { data } = await db.rpc("open_requests_near_me");
      const list = (data ?? []) as Open[];
      list.forEach((r) => {
        if (!seen.current.has(r.id)) {
          seen.current.add(r.id);
          vibrate([400, 150, 400]);
          toast.error(`SOS ${r.distance_km} km away — can you help?`);
          if ("Notification" in window && Notification.permission === "granted") new Notification("Jeevan Raksha: SOS nearby", { body: `${r.distance_km} km away` });
        }
      });
      setOpen(list);
    }
    if (user) {
      const { data: a } = await db.from("volunteer_requests").select("id, status, latitude, longitude")
        .eq("accepted_volunteer_id", user.id).in("status", ["accepted", "on_the_way", "arrived"]).maybeSingle();
      setAssigned(a);
      if (a) {
        const { data: r } = await db.rpc("requester_info_for_request", { _request_id: a.id });
        setRequester(r?.[0] ?? null);
      }
    }
  }, [user, vol?.available]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [refresh]);

  const register = async () => {
    if (!user || name.trim().length < 2) return toast.error("Enter your name");
    const { error } = await db.from("volunteers").insert({ user_id: user.id, display_name: name.trim().slice(0, 60), available: true });
    if (error) return toast.error("Could not register");
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    toast.success("You're now a volunteer");
    loadVol();
  };

  const toggle = async (v: boolean) => {
    if (!user) return;
    await db.from("volunteers").update({ available: v }).eq("user_id", user.id);
    setVol((p) => (p ? { ...p, available: v } : p));
  };

  const respond = async (id: string, accept: boolean) => {
    const { data, error } = await db.rpc("respond_volunteer_request", { _request_id: id, _accept: accept });
    if (error) return toast.error(error.message);
    if (accept) data ? toast.success("Accepted — please go help") : toast.info("Another volunteer already accepted");
    refresh();
  };

  const progress = async (to: string) => {
    if (!assigned) return;
    await db.rpc("update_volunteer_progress", { _request_id: assigned.id, _status: to, _lat: pos.current?.lat ?? null, _lng: pos.current?.lng ?? null });
    toast.success("Status updated");
    refresh();
  };

  // Share live position with requester while assisting
  useEffect(() => {
    if (!assigned) return;
    const t = setInterval(() => {
      if (pos.current) db.rpc("update_volunteer_progress", { _request_id: assigned.id, _status: assigned.status, _lat: pos.current.lat, _lng: pos.current.lng });
    }, 15000);
    return () => clearInterval(t);
  }, [assigned]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm opacity-90 mb-3"><ArrowLeft className="w-4 h-4" /> Back</Link>
          <h1 className="text-2xl font-bold flex items-center gap-2"><HandHeart className="w-6 h-6" /> Volunteer</h1>
          <p className="text-sm opacity-80 mt-1">Help people near you during an SOS (within 3–5 km).</p>
        </div>
      </header>

      <main className="container py-6 space-y-4">
        {!vol ? (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-3">
            <p className="font-semibold">Become a volunteer</p>
            <p className="text-sm text-muted-foreground">Only your first name and approximate distance are shown. Exact SOS location is shared with you only after you accept.</p>
            <Input placeholder="Name shown to requester" value={name} onChange={(e) => setName(e.target.value)} />
            <Button className="w-full bg-gradient-emergency" onClick={register}>Register as volunteer</Button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold flex items-center gap-1">{vol.display_name}{vol.verified && <BadgeCheck className="w-4 h-4 text-secondary" />}</div>
              <div className="text-xs text-muted-foreground">{vol.available ? "Available — receiving nearby SOS" : "Unavailable"}</div>
            </div>
            <Switch checked={vol.available} onCheckedChange={toggle} />
          </div>
        )}

        {assigned && (
          <div className="bg-card border-2 border-primary rounded-2xl p-5 shadow-card space-y-3">
            <p className="font-bold">Active assistance{requester ? ` — ${requester.first_name}` : ""}</p>
            <div className="flex flex-wrap gap-2">
              <a className="inline-flex items-center gap-1 text-sm font-semibold text-secondary" target="_blank" rel="noreferrer"
                href={`https://www.google.com/maps/dir/?api=1&destination=${assigned.latitude},${assigned.longitude}`}><MapPin className="w-4 h-4" /> Navigate</a>
              {requester?.phone && <a className="inline-flex items-center gap-1 text-sm font-semibold text-secondary" href={`tel:${requester.phone}`}><Phone className="w-4 h-4" /> Call</a>}
            </div>
            {NEXT[assigned.status] && <Button className="w-full bg-gradient-emergency" onClick={() => progress(NEXT[assigned.status].to)}>{NEXT[assigned.status].label}</Button>}
          </div>
        )}

        {vol?.available && !assigned && (
          <section className="space-y-2">
            <h2 className="font-bold">Nearby SOS requests</h2>
            {open.length === 0 && <p className="text-sm text-muted-foreground">No active requests near you.</p>}
            {open.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-2">
                <div className="font-semibold">SOS · {r.distance_km} km away</div>
                <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleTimeString()}</div>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-gradient-emergency" onClick={() => respond(r.id, true)}>Accept</Button>
                  <Button variant="outline" className="flex-1" onClick={() => respond(r.id, false)}>Reject</Button>
                </div>
              </div>
            ))}
          </section>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Volunteer;
