import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Check, HandHeart, Loader2, MapPin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { distanceKm } from "@/lib/maps";
import { ACTIVE_REQ_KEY, STATUS_LABEL, VOL_EVENT, isFinal } from "@/lib/volunteers";

const STEPS = ["searching", "accepted", "on_the_way", "arrived", "completed"];
const db = supabase as any;

interface Req {
  id: string; status: string; latitude: number; longitude: number; radius_m: number;
  volunteer_latitude: number | null; volunteer_longitude: number | null;
  timeout_at: string; accepted_at: string | null; updated_at: string; created_at: string;
}

const VolunteerHelp = () => {
  const { id } = useParams();
  const [req, setReq] = useState<Req | null>(null);
  const [vol, setVol] = useState<{ display_name: string; verified: boolean } | null>(null);
  const [nearbyCount, setNearbyCount] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data } = await db.from("volunteer_requests").select("*").eq("id", id).maybeSingle();
      setReq(data);
      if (data?.accepted_volunteer_id || (data && data.status !== "searching")) {
        const { data: v } = await db.rpc("volunteer_info_for_request", { _request_id: id });
        setVol(v?.[0] ?? null);
      } else if (data) {
        const { data: c } = await db.rpc("count_nearby_volunteers", { _request_id: id });
        setNearbyCount(typeof c === "number" ? c : null);
      }
    };
    load();
    const ch = supabase.channel(`vr-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "volunteer_requests", filter: `id=eq.${id}` }, load)
      .subscribe();
    const poll = setInterval(load, 10000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { supabase.removeChannel(ch); clearInterval(poll); clearInterval(tick); };
  }, [id]);

  const cancel = async () => {
    if (!req) return;
    const { error } = await db.from("volunteer_requests").update({ status: "cancelled" }).eq("id", req.id);
    if (error) return toast.error("Could not cancel");
    localStorage.removeItem(ACTIVE_REQ_KEY);
    window.dispatchEvent(new Event(VOL_EVENT));
    toast.success("Volunteer request cancelled");
  };

  if (!req) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  const expired = req.status === "searching" && new Date(req.timeout_at).getTime() < now;
  const status = expired ? "expired" : req.status;
  const secsLeft = Math.max(0, Math.round((new Date(req.timeout_at).getTime() - now) / 1000));
  const dist = req.volunteer_latitude && req.volunteer_longitude
    ? distanceKm({ lat: req.latitude, lng: req.longitude }, { lat: req.volunteer_latitude, lng: req.volunteer_longitude })
    : null;
  const etaMin = dist !== null ? Math.max(1, Math.round((dist / 4.5) * 60)) : null; // walking ~4.5 km/h
  const stepIdx = STEPS.indexOf(status);

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="bg-gradient-emergency text-primary-foreground">
        <div className="container py-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm opacity-90 mb-3"><ArrowLeft className="w-4 h-4" /> Back</Link>
          <h1 className="text-2xl font-bold flex items-center gap-2"><HandHeart className="w-6 h-6" /> Nearby Volunteers</h1>
          <p className="text-sm opacity-90 mt-1">{STATUS_LABEL[status] ?? status}</p>
        </div>
      </header>

      <main className="container py-6 space-y-4">
        {status === "searching" && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card text-center space-y-2">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
            <p className="font-semibold">Alerting volunteers within {(req.radius_m / 1000).toFixed(0)} km</p>
            {nearbyCount !== null && <p className="text-sm text-muted-foreground">{nearbyCount} available volunteer{nearbyCount === 1 ? "" : "s"} nearby</p>}
            <p className="text-xs text-muted-foreground">Waiting {secsLeft}s. Your SOS SMS and call continue regardless.</p>
          </div>
        )}

        {vol && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-2">
            <div className="flex items-center gap-2 font-bold text-lg">{vol.display_name}{vol.verified && <BadgeCheck className="w-5 h-5 text-secondary" />}</div>
            <p className="text-sm text-muted-foreground">{vol.verified ? "Verified volunteer" : "Community volunteer (not yet verified)"}</p>
            {dist !== null && <p className="text-sm">Distance: <b>{dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}</b> · ETA ~{etaMin} min on foot</p>}
            <p className="text-xs text-muted-foreground">Last update: {new Date(req.updated_at).toLocaleTimeString()}</p>
            {req.volunteer_latitude && (
              <a className="inline-flex items-center gap-1 text-sm text-secondary font-semibold" target="_blank" rel="noreferrer"
                href={`https://www.google.com/maps/dir/?api=1&origin=${req.volunteer_latitude},${req.volunteer_longitude}&destination=${req.latitude},${req.longitude}`}>
                <MapPin className="w-4 h-4" /> View volunteer on map
              </a>
            )}
          </div>
        )}

        {status !== "expired" && status !== "cancelled" && (
          <ol className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-3">
            {STEPS.map((s, i) => (
              <li key={s} className={`flex items-center gap-3 text-sm ${i <= stepIdx ? "font-semibold" : "text-muted-foreground"}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center ${i <= stepIdx ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {i <= stepIdx ? <Check className="w-4 h-4" /> : i + 1}
                </span>
                {STATUS_LABEL[s]}
              </li>
            ))}
          </ol>
        )}

        {status === "expired" && (
          <div className="bg-warning/10 border border-warning rounded-2xl p-5 text-sm">No volunteer accepted in time. Your emergency contacts were already alerted by SMS and the emergency call workflow continues.</div>
        )}

        {!isFinal(status) && (
          <Button variant="outline" className="w-full" onClick={cancel}><X className="w-4 h-4 mr-2" /> Cancel volunteer request</Button>
        )}
      </main>
    </div>
  );
};

export default VolunteerHelp;
