import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Hospital, Phone, MapPin, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Hosp {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  emergency_24x7: boolean | null;
}

const Hospitals = () => {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState<Hosp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("hospitals").select("*").eq("city", "Vijayawada");
      setHospitals(data ?? []);
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
          <h1 className="text-2xl font-bold">Hospitals</h1>
          <p className="text-sm opacity-80 mt-1">Vijayawada — verified hospitals with emergency info.</p>
        </div>
      </header>

      <main className="container py-6 space-y-3">
        {loading && (
          <div className="text-center py-10 text-muted-foreground text-sm">Loading...</div>
        )}
        {!loading && hospitals.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">No hospitals found for Vijayawada.</div>
        )}
        {hospitals.map((h) => (
          <div key={h.id} className="bg-card border border-border rounded-2xl p-4 shadow-card">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-trust flex items-center justify-center shrink-0">
                <Hospital className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{h.name}</div>
                <div className="text-xs text-muted-foreground">{h.address}</div>
                {h.emergency_24x7 && (
                  <div className="text-[10px] font-semibold text-success inline-flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" /> 24x7 Emergency
                  </div>
                )}
                <div className="flex gap-3 mt-2">
                  {h.phone && (
                    <a href={`tel:${h.phone}`} className="text-xs font-medium text-secondary inline-flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Call
                    </a>
                  )}
                  {h.latitude && h.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${h.latitude},${h.longitude}`}
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

export default Hospitals;
