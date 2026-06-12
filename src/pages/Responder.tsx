import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, MapPin, Phone, RadioTower, Clock, CheckCircle, AlertCircle, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Incident {
  id: string; user_id: string; type: string; status: string;
  latitude: number | null; longitude: number | null; created_at: string; resolved_at: string | null;
  address: string | null; notes: string | null; responder_id: string | null;
}

interface Log {
  latitude: number; longitude: number; created_at: string; accuracy: number | null;
}

const statusColor: Record<string, string> = {
  active: "bg-primary text-primary-foreground",
  responded: "bg-warning text-warning-foreground",
  resolved: "bg-success text-success-foreground",
  false_alarm: "bg-muted text-muted-foreground",
};

const Responder = () => {
  const { user, roles } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    const { data } = await supabase.from("incidents").select("*").order("created_at", { ascending: false }).limit(100);
    setIncidents(data ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("incidents-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (!selectedId) { setLogs([]); return; }
    (async () => {
      const { data } = await supabase.from("location_logs").select("latitude, longitude, created_at, accuracy")
        .eq("incident_id", selectedId).order("created_at", { ascending: true }).limit(50);
      setLogs(data ?? []);
    })();
  }, [selectedId]);

  const respond = async (id: string) => {
    const { error } = await supabase.from("incidents").update({ status: "responded", responder_id: user?.id }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Marked as responding");
  };
  const resolve = async (id: string) => {
    const { error } = await supabase.from("incidents").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Resolved");
  };

  const roleLabel = roles.includes("admin") ? "Admin" : roles.includes("police") ? "Police" : "Hospital";

  const filtered = filter === "all" ? incidents : incidents.filter((i) => i.status === filter);

  const selected = incidents.find((i) => i.id === selectedId);

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

      <main className="container py-6 space-y-4">
        {incidents.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No incidents reported.</p>
          </div>
        )}

        {incidents.length > 0 && (
          <Tabs defaultValue="all" onValueChange={setFilter}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="responded">Responded</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>
            <TabsContent value={filter} className="space-y-3 mt-4">
              {filtered.map((i) => (
                <div key={i.id} className="bg-card border border-border rounded-2xl p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="font-semibold capitalize">{i.type} · {i.status.replace("_", " ")}</div>
                      <div className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleString()}</div>
                    </div>
                    <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${statusColor[i.status] ?? "bg-muted"}`}>
                      {i.status}
                    </span>
                  </div>

                  {i.address && <p className="text-xs text-muted-foreground mb-2">{i.address}</p>}

                  {i.latitude && i.longitude && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      <a href={`https://www.google.com/maps?q=${i.latitude},${i.longitude}`} target="_blank" rel="noreferrer"
                         className="text-xs font-medium text-secondary inline-flex items-center gap-1 bg-accent px-2 py-1 rounded-lg">
                        <MapPin className="w-3 h-3" /> Open Map
                      </a>
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${i.latitude},${i.longitude}`} target="_blank" rel="noreferrer"
                         className="text-xs font-medium text-secondary inline-flex items-center gap-1 bg-accent px-2 py-1 rounded-lg">
                        <Navigation className="w-3 h-3" /> Navigate
                      </a>
                      <button onClick={() => setSelectedId(selectedId === i.id ? null : i.id)}
                              className="text-xs font-medium text-secondary inline-flex items-center gap-1 bg-accent px-2 py-1 rounded-lg">
                        <Clock className="w-3 h-3" /> {selectedId === i.id ? "Hide trail" : "Location trail"}
                      </button>
                    </div>
                  )}

                  {selectedId === i.id && logs.length > 0 && (
                    <div className="bg-muted/50 rounded-xl p-3 mb-3 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Location Trail ({logs.length} points)</p>
                      {logs.slice(-5).map((log, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="font-mono">{log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}</span>
                          <span className="text-muted-foreground">{new Date(log.created_at).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {i.status === "active" && <Button size="sm" onClick={() => respond(i.id)} className="bg-gradient-trust"><CheckCircle className="w-3.5 h-3.5 mr-1" /> Respond</Button>}
                    {i.status !== "resolved" && i.status !== "false_alarm" && <Button size="sm" variant="outline" onClick={() => resolve(i.id)}><AlertCircle className="w-3.5 h-3.5 mr-1" /> Resolve</Button>}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No incidents in this category.</p>}
            </TabsContent>
          </Tabs>
        )}

        {selected && (
          <div className="bg-gradient-card border border-border rounded-2xl p-4 shadow-card">
            <h3 className="font-semibold mb-2">Incident Detail</h3>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>ID: <span className="font-mono">{selected.id.slice(0, 8)}</span></p>
              <p>Type: {selected.type}</p>
              <p>Status: {selected.status}</p>
              {selected.responder_id && <p>Responder assigned</p>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Responder;
