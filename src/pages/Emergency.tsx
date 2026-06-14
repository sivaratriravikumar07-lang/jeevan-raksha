import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, MapPin, Phone, X, Volume2, VolumeX, MessageSquare, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { startSiren, stopSiren, vibrate, getCurrentPosition, watchPosition, clearWatch } from "@/lib/emergency";
import { AudioRecorder } from "@/components/AudioRecorder";
import { buildEmergencyMessage, openSmsToAll, openWhatsAppFor, openEmailToAll, type ContactLite } from "@/lib/sms";

const Emergency = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [countdown, setCountdown] = useState(15);
  const [sirenOn, setSirenOn] = useState(true);
  const [contacts, setContacts] = useState<ContactLite[]>([]);
  const [message, setMessage] = useState("");
  const [smsOpened, setSmsOpened] = useState(false);
  const watchRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    vibrate([300, 100, 300, 100, 600]);
    startSiren();

    (async () => {
      let lat = 0, lng = 0, acc: number | null = null;
      try {
        const pos = await getCurrentPosition();
        lat = pos.coords.latitude; lng = pos.coords.longitude; acc = pos.coords.accuracy;
        if (!cancelled) setCoords({ lat, lng, acc: acc ?? 0 });
      } catch {
        toast.error("Could not access location — please enable GPS.");
      }

      const { data: incident, error } = await supabase.from("incidents").insert({
        user_id: user.id, type: "sos", status: "active",
        latitude: lat || null, longitude: lng || null,
      }).select().single();
      if (error || !incident) { toast.error("Failed to log incident"); return; }
      if (cancelled) return;
      setIncidentId(incident.id);

      if (lat && lng) {
        await supabase.from("location_logs").insert({ user_id: user.id, incident_id: incident.id, latitude: lat, longitude: lng, accuracy: acc });
      }

      // Load profile + contacts for the SMS payload
      const [{ data: profile }, { data: cs }] = await Promise.all([
        supabase.from("profiles").select("full_name, phone, blood_group, emergency_message").eq("id", user.id).maybeSingle(),
        supabase.from("emergency_contacts").select("name, phone, email").eq("user_id", user.id),
      ]);
      const list = (cs ?? []) as ContactLite[];
      setContacts(list);

      const msg = buildEmergencyMessage(
        {
          name: profile?.full_name ?? "A Jeevan Raksha user",
          phone: profile?.phone,
          bloodGroup: profile?.blood_group,
          note: profile?.emergency_message,
        },
        lat && lng ? { lat, lng } : null,
      );
      setMessage(msg);

      if (list.length) {
        await supabase.from("alerts").insert(
          list.map((c) => ({ incident_id: incident.id, user_id: user.id, channel: "sms", recipient: c.phone, status: "sent" })),
        );
        // Auto-open SMS composer to ALL contacts at once
        setTimeout(() => {
          openSmsToAll(list, msg);
          setSmsOpened(true);
          toast.success(`SMS opened for ${list.length} contact${list.length > 1 ? "s" : ""} — tap Send`);
        }, 600);
      } else {
        toast.warning("No trusted contacts. Add some after this emergency.");
      }

      // Live location tracking
      watchRef.current = watchPosition((p) => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy });
        supabase.from("location_logs").insert({
          user_id: user.id, incident_id: incident.id,
          latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy,
        });
      });
    })();

    // 15-sec countdown to Police 100
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          window.location.href = "tel:100";
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => {
      cancelled = true;
      stopSiren();
      if (watchRef.current !== null) clearWatch(watchRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const toggleSiren = () => {
    if (sirenOn) { stopSiren(); setSirenOn(false); }
    else { startSiren(); setSirenOn(true); }
  };

  const cancel = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    stopSiren();
    if (watchRef.current !== null) clearWatch(watchRef.current);
    if (incidentId) {
      await supabase.from("incidents").update({ status: "false_alarm", resolved_at: new Date().toISOString() }).eq("id", incidentId);
    }
    toast.success("Emergency cancelled. You're safe.");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen animate-siren text-primary-foreground flex flex-col">
      <header className="container py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-bold uppercase tracking-wider text-sm">Emergency Active</span>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleSiren} className="text-primary-foreground hover:bg-background/20">
          {sirenOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </Button>
      </header>

      <main className="flex-1 container flex flex-col items-center justify-center text-center space-y-5 py-6">
        <div className="bg-background/20 backdrop-blur-sm rounded-full w-32 h-32 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl font-extrabold">{countdown}</div>
            <div className="text-xs opacity-90">sec</div>
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-1">Calling Police 100 in {countdown}s</h1>
          <p className="text-sm opacity-90 max-w-xs">
            {contacts.length > 0
              ? `Alerting ${contacts.length} contact${contacts.length > 1 ? "s" : ""} with your live location.`
              : "Your live location is being prepared."}
          </p>
        </div>

        {coords && (
          <div className="bg-background/15 backdrop-blur-sm rounded-2xl p-4 w-full max-w-sm">
            <div className="flex items-center gap-2 justify-center mb-1">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Live location</span>
            </div>
            <div className="text-sm font-mono">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</div>
            <div className="text-xs opacity-80 mt-1">Accuracy ~ {Math.round(coords.acc)}m</div>
            <a
              href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
              target="_blank" rel="noreferrer"
              className="inline-block mt-3 text-xs underline"
            >Open in Maps →</a>
          </div>
        )}

        {/* Alert dispatch buttons */}
        {contacts.length > 0 && message && (
          <div className="bg-background/15 backdrop-blur-sm rounded-2xl p-4 w-full max-w-sm space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider">Alert contacts</p>
            <Button
              onClick={() => { openSmsToAll(contacts, message); setSmsOpened(true); }}
              size="sm"
              className="w-full bg-background text-foreground hover:bg-background/90"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {smsOpened ? "Re-open SMS" : "Send SMS to all"} ({contacts.length})
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => contacts.forEach((c) => openWhatsAppFor(c, message))}
                size="sm" variant="secondary"
                className="bg-background/30 text-primary-foreground hover:bg-background/40 border-0"
              >
                WhatsApp All
              </Button>
              <Button
                onClick={() => openEmailToAll(contacts, "🚨 Emergency — Jeevan Raksha", message)}
                size="sm" variant="secondary"
                className="bg-background/30 text-primary-foreground hover:bg-background/40 border-0"
              >
                <Mail className="w-4 h-4 mr-1" /> Email
              </Button>
            </div>
          </div>
        )}

        {user && incidentId && (
          <div className="bg-background/15 backdrop-blur-sm rounded-2xl p-4 w-full max-w-sm text-center">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3">Evidence Recorder</p>
            <div className="flex justify-center">
              <AudioRecorder incidentId={incidentId} userId={user.id} />
            </div>
            <p className="text-[10px] opacity-70 mt-3">Record audio evidence securely to the cloud.</p>
          </div>
        )}
      </main>

      <footer className="container py-6 space-y-3">
        <a href="tel:100" className="block">
          <Button size="lg" variant="secondary" className="w-full h-14 bg-background text-foreground hover:bg-background/90 font-bold">
            <Phone className="w-5 h-5 mr-2" /> Call Police 100 Now
          </Button>
        </a>
        <Button onClick={cancel} variant="ghost" className="w-full h-12 text-primary-foreground hover:bg-background/20 border border-primary-foreground/30">
          <X className="w-4 h-4 mr-2" /> I'm Safe — Cancel
        </Button>
      </footer>
    </div>
  );
};

export default Emergency;
