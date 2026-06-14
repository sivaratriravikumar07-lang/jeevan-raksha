import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, History as HistoryIcon, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";

interface Incident { id: string; type: string; status: string; latitude: number | null; longitude: number | null; created_at: string; resolved_at: string | null; }

const statusColor: Record<string, string> = {
  active: "bg-primary text-primary-foreground",
  responded: "bg-warning text-warning-foreground",
  resolved: "bg-success text-success-foreground",
  false_alarm: "bg-muted text-muted-foreground",
};

const History = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Incident[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("incidents").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setItems(data ?? []);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm opacity-90 mb-3">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="text-2xl font-bold">Incident History</h1>
          <p className="text-sm opacity-80 mt-1">Your past alerts and responses.</p>
        </div>
      </header>

      <main className="container py-6 space-y-3">
        {items.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <HistoryIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No incidents yet. Stay safe!</p>
          </div>
        )}
        {items.map((i) => (
          <div key={i.id} className="bg-card border border-border rounded-2xl p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold capitalize">{i.type} alert</div>
                <div className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleString()}</div>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColor[i.status] ?? "bg-muted"}`}>{i.status.replace("_", " ")}</span>
            </div>
            {i.latitude && i.longitude && (
              <a href={`https://www.google.com/maps?q=${i.latitude},${i.longitude}`} target="_blank" rel="noreferrer"
                 className="mt-3 text-xs text-secondary inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" /> View location
              </a>
            )}
          </div>
        ))}
      </main>
      <BottomNav />
    </div>
  );
};

export default History;
