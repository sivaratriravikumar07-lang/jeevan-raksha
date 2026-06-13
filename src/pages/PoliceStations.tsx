import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Phone, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Station {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
}

const PoliceStations = () => {
  const navigate = useNavigate();
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("police_stations").select("*").eq("city", "Vijayawada");
      setStations(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-6">
          <button onClick={() => navigate("/dashboard")} className="inline-flex items-center gap-2 text-sm opacity-90 mb-3">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-bold">Police Stations</h1>
          <p className="text-sm opacity-80 mt-1">Vijayawada — verified stations with directions.</p>
        </div>
      </header>

      <main className="container py-6 space-y-3">
        {loading && (
          <div className="text-center py-10 text-muted-foreground text-sm">Loading...</div>
        )}
        {!loading && stations.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">No police stations found for Vijayawada.</div>
        )}
        {stations.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-2xl p-4 shadow-card">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-emergency flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.address}</div>
                <div className="flex gap-3 mt-2">
                  {p.phone && (
                    <a href={`tel:${p.phone}`} className="text-xs font-medium text-secondary inline-flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Call
                    </a>
                  )}
                  {p.latitude && p.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-secondary inline-flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" /> Directions
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

export default PoliceStations;
