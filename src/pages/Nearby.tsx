import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, Hospital, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Place { id: string; name: string; address: string | null; phone: string | null; latitude: number | null; longitude: number | null; city: string | null; }

const Nearby = () => {
  const [stations, setStations] = useState<Place[]>([]);
  const [hospitals, setHospitals] = useState<Place[]>([]);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("police_stations").select("*");
      const { data: h } = await supabase.from("hospitals").select("*");
      setStations(s ?? []);
      setHospitals(h ?? []);
    })();
  }, []);

  const Card = ({ p, icon: Icon, color }: { p: Place; icon: any; color: string }) => (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{p.name}</div>
          <div className="text-xs text-muted-foreground">{p.address}</div>
          <div className="flex gap-3 mt-2">
            {p.phone && <a href={`tel:${p.phone}`} className="text-xs font-medium text-secondary inline-flex items-center gap-1"><Phone className="w-3 h-3" /> Call</a>}
            {p.latitude && p.longitude && (
              <a href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-secondary inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Directions
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm opacity-90 mb-3">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="text-2xl font-bold">Nearby Help</h1>
          <p className="text-sm opacity-80 mt-1">Verified police stations and hospitals.</p>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <section>
          <h2 className="font-bold mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Police Stations</h2>
          <div className="space-y-2">
            {stations.map((p) => <Card key={p.id} p={p} icon={Shield} color="bg-gradient-emergency" />)}
          </div>
        </section>
        <section>
          <h2 className="font-bold mb-3 flex items-center gap-2"><Hospital className="w-4 h-4 text-secondary" /> Hospitals</h2>
          <div className="space-y-2">
            {hospitals.map((p) => <Card key={p.id} p={p} icon={Hospital} color="bg-gradient-trust" />)}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Nearby;
