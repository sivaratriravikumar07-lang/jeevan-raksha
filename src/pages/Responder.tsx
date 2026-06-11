import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, MapPin, Phone, RadioTower } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Incident {
  id: string; user_id: string; type: string; status: string;
  latitude: number | null; longitude: number | null; created_at: string;
}

const Responder = () => {
  const { roles } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const load = async () => {
    const { data } = await supabase.from("incidents").select("*").order("created_at", { ascending: false }).limit(50);
    setIncidents(data ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("incidents-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const respond = async (id: string) => {
    const { error } = await supabase.from("incidents").update({ status: "responded" }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Marked as responding");
  };
  const resolve = async (id: string) => {
    const { error } = await supabase.from("incidents").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Resolved");
  };

  const roleLabel = roles.includes("admin") ? "Admin" : roles.includes("police") ? "Police" : "Hospital";

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm opacity-90 mb-3">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <RadioTower className="w-5 h-5" />
            <span className="text-xs font-semibold uppercase tracking-wider opacity-90">{roleLabel} Panel</span>
          </div>
          <h1 className="text-2xl font-bold mt-1">Live Incident Feed</h1>
          <p className="text-sm opacity-80">Real-time SOS alerts from users.</p>
        </div>
      </header>

      <main className="container py-6 space-y-3">
        {incidents.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No incidents reported.</p>
          </div>
        )}
        {incidents.map((i) => (
          <div key={i.id} className="bg-card border border-border rounded-2xl p-4 shadow-card">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="font-semibold capitalize">{i.type} · {i.status.replace("_", " ")}</div>
                <div className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleString()}</div>
              </div>
              {i.status === "active" && (
                <span className="text-xs font-bold uppercase px-2 py-1 rounded-full bg-primary text-primary-foreground animate-pulse">Active</span>
              )}
            </div>
            {i.latitude && i.longitude && (
              <a href={`https://www.google.com/maps?q=${i.latitude},${i.longitude}`} target="_blank" rel="noreferrer"
                 className="text-xs text-secondary inline-flex items-center gap-1 mb-3">
                <MapPin className="w-3 h-3" /> {i.latitude.toFixed(5)}, {i.longitude.toFixed(5)}
              </a>
            )}
            <div className="flex gap-2">
              {i.status === "active" && <Button size="sm" onClick={() => respond(i.id)} className="bg-gradient-trust">Respond</Button>}
              {i.status !== "resolved" && <Button size="sm" variant="outline" onClick={() => resolve(i.id)}>Resolve</Button>}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

export default Responder;
