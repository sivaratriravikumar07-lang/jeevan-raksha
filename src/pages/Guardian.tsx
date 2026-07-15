import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, MapPin, Clock, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { buildEmergencyMessage, openSmsToAll } from "@/lib/sms";
import { getCurrentPosition, watchPosition, clearWatch } from "@/lib/emergency";

interface Trip {
  destination: string;
  etaMinutes: number;
  startedAt: number;
}

const KEY = "jr_guardian_trip";

const Guardian = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(() => {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [destination, setDestination] = useState("");
  const [eta, setEta] = useState(30);
  const [remaining, setRemaining] = useState(0);
  const watchIdRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!trip) return;
    const tick = () => {
      const elapsed = (Date.now() - trip.startedAt) / 1000;
      const left = trip.etaMinutes * 60 - elapsed;
      setRemaining(Math.max(0, left));
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true;
        triggerAutoSOS();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip]);

  useEffect(() => {
    if (!trip) return;
    watchIdRef.current = watchPosition(() => {});
    return () => {
      if (watchIdRef.current !== null) clearWatch(watchIdRef.current);
    };
  }, [trip]);

  const triggerAutoSOS = async () => {
    if (!user) return;
    toast.error("Trip overdue — auto-SOS triggered");
    try {
      const pos = await getCurrentPosition();
      const [{ data: profile }, { data: contacts }] = await Promise.all([
        supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
        supabase.from("emergency_contacts").select("name, phone, email").eq("user_id", user.id),
      ]);
      const msg = buildEmergencyMessage(
        { name: profile?.full_name ?? "User", phone: profile?.phone, note: `Guardian Trip to ${trip?.destination} OVERDUE` },
        { lat: pos.coords.latitude, lng: pos.coords.longitude },
      );
      openSmsToAll((contacts ?? []) as any, msg);
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => navigate("/emergency"), 1500);
  };

  const start = () => {
    if (!destination.trim()) return toast.error("Enter destination");
    const t: Trip = { destination: destination.trim(), etaMinutes: eta, startedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(t));
    setTrip(t);
    firedRef.current = false;
    toast.success("Guardian watching your trip");
  };

  const iamsafe = () => {
    localStorage.removeItem(KEY);
    setTrip(null);
    firedRef.current = true;
    toast.success("Arrived safely 💚");
  };

  const mm = Math.floor(remaining / 60);
  const ss = Math.floor(remaining % 60);

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-5 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-lg bg-background/20 flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><Shield className="w-5 h-5" /> Guardian Angel</h1>
            <p className="text-xs opacity-85">Auto-SOS if you don't arrive on time</p>
          </div>
        </div>
      </header>

      <main className="container py-5 space-y-4">
        {!trip ? (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Destination</label>
              <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Home / Office / Friend's place" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">ETA (minutes)</label>
              <Input type="number" value={eta} onChange={(e) => setEta(+e.target.value || 30)} min={1} max={480} className="mt-1" />
            </div>
            <Button onClick={start} className="w-full bg-gradient-emergency">
              <Play className="w-4 h-4 mr-2" /> Start Trip
            </Button>
            <p className="text-xs text-muted-foreground">Timer expire ayithe trusted contacts ki SMS + auto SOS trigger avtundi.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gradient-trust mx-auto flex items-center justify-center">
              <Shield className="w-8 h-8 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Heading to</p>
              <p className="text-lg font-bold flex items-center justify-center gap-2"><MapPin className="w-4 h-4" />{trip.destination}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> Time left</p>
              <p className="text-4xl font-bold tabular-nums">{mm}:{ss.toString().padStart(2, "0")}</p>
            </div>
            <Button onClick={iamsafe} className="w-full" size="lg">
              <Square className="w-4 h-4 mr-2" /> I've Arrived Safely
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Guardian;
