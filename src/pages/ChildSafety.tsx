import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Baby, Phone, Save, Siren, KeyRound, MapPin, ShieldAlert, School } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentPosition, vibrate } from "@/lib/emergency";
import { openSmsToAll, type ContactLite } from "@/lib/sms";

interface ChildProfile {
  name: string;
  age: string;
  school: string;
  bloodGroup: string;
  safeWord: string;
  marks: string;
}

const EMPTY: ChildProfile = { name: "", age: "", school: "", bloodGroup: "", safeWord: "", marks: "" };
const KEY = "jr_child_profile";

const helplines = [
  { name: "Child Helpline", number: "1098", desc: "24x7 children in distress", color: "bg-gradient-emergency" },
  { name: "Police", number: "100", desc: "Missing child / immediate help", color: "bg-gradient-trust" },
  { name: "Cyber Crime", number: "1930", desc: "Online child abuse & grooming", color: "bg-gradient-trust" },
  { name: "Ambulance", number: "108", desc: "Medical emergency", color: "bg-gradient-emergency" },
];

const tips = [
  "Teach the child your full name, phone number and address by heart.",
  "Fix a family SAFE WORD — anyone picking them up must know it.",
  "Good touch / bad touch ni simple ga explain cheyandi — 'No, Go, Tell'.",
  "Never let the child go with a stranger even if they say 'amma pampindi'.",
  "Keep a fresh photo of the child on your phone — helps police instantly.",
  "In a crowd, tell the child to stand still and find a mother with kids or a shopkeeper.",
];

const ChildSafety = () => {
  const navigate = useNavigate();
  const [p, setP] = useState<ChildProfile>(EMPTY);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setP({ ...EMPTY, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);

  const save = () => {
    localStorage.setItem(KEY, JSON.stringify(p));
    toast.success("Child profile saved on this device");
  };

  const buildMessage = (coords: { lat: number; lng: number } | null) =>
    [
      "🚨 MISSING CHILD ALERT — Jeevan Raksha",
      p.name ? `Child: ${p.name}${p.age ? `, age ${p.age}` : ""}` : "A child is missing.",
      p.school ? `School: ${p.school}` : null,
      p.bloodGroup ? `Blood group: ${p.bloodGroup}` : null,
      p.marks ? `Identification: ${p.marks}` : null,
      `Last known location: ${coords ? `https://maps.google.com/?q=${coords.lat},${coords.lng}` : "unavailable"}`,
      `Time: ${new Date().toLocaleString()}`,
      "Please help. Child Helpline: 1098 | Police: 100",
    ]
      .filter(Boolean)
      .join("\n");

  const sendAlert = async () => {
    setSending(true);
    vibrate([200, 100, 200, 100, 400]);
    let coords: { lat: number; lng: number } | null = null;
    try {
      const pos = await getCurrentPosition();
      coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch { /* location optional */ }

    const message = buildMessage(coords);
    let autoSent = 0;
    let list: ContactLite[] = [];

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (auth?.user) {
        const { data } = await supabase
          .from("emergency_contacts")
          .select("name, phone, email")
          .eq("user_id", auth.user.id)
          .order("priority");
        list = (data ?? []).filter((c) => !!c.phone) as ContactLite[];
      }
      const { data: res, error } = await supabase.functions.invoke("send-sos-sms", {
        body: { latitude: coords?.lat ?? null, longitude: coords?.lng ?? null, message },
      });
      if (!error && res?.configured && res?.sent > 0) autoSent = res.sent as number;
    } catch { /* fall through */ }

    if (autoSent > 0) {
      toast.success(`Alert sent to ${autoSent} contact${autoSent > 1 ? "s" : ""}`);
    } else if (list.length) {
      openSmsToAll(list, message);
      toast.info("SMS app opened with the alert — press send");
    } else {
      toast.error("No emergency contacts saved yet");
      navigate("/contacts");
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-5 flex items-center gap-3">
          <Link to="/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="font-bold text-lg flex items-center gap-2"><Baby className="w-5 h-5" /> Child Safety</h1>
            <p className="text-xs opacity-90">1098 · Missing child alert · Safe word</p>
          </div>
        </div>
      </header>

      <main className="container -mt-4 space-y-4">
        <div className="bg-card border border-border rounded-3xl p-5 shadow-elevated text-center">
          <a href="tel:1098" className="block">
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-emergency shadow-emergency flex flex-col items-center justify-center text-primary-foreground active:scale-95 transition-transform">
              <Phone className="w-8 h-8" />
              <span className="text-2xl font-extrabold mt-1">1098</span>
              <span className="text-[10px] opacity-90">Child Helpline</span>
            </div>
          </a>
          <Button onClick={sendAlert} disabled={sending} className="mt-4 w-full bg-gradient-emergency">
            <Siren className="w-4 h-4 mr-2" /> {sending ? "Sending alert…" : "Send Missing Child Alert"}
          </Button>
          <p className="text-[11px] text-muted-foreground mt-2 flex items-center justify-center gap-1">
            <MapPin className="w-3 h-3" /> Sends child details + last known location to your emergency contacts
          </p>
        </div>

        <section>
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-2 px-1">Helplines</h2>
          <div className="grid grid-cols-2 gap-3">
            {helplines.map((h) => (
              <a key={h.name} href={`tel:${h.number}`} className={`${h.color} text-primary-foreground rounded-2xl p-4 shadow-card active:scale-95 transition-transform`}>
                <Phone className="w-4 h-4 mb-1 opacity-90" />
                <div className="font-bold text-lg leading-tight">{h.number}</div>
                <div className="text-xs font-semibold mt-1">{h.name}</div>
                <div className="text-[10px] opacity-90 mt-0.5">{h.desc}</div>
              </a>
            ))}
          </div>
        </section>

        <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <h2 className="font-bold text-sm flex items-center gap-2"><School className="w-4 h-4 text-secondary" /> Child ID Card</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Child name</Label>
              <Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="Name" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Age</Label>
              <Input value={p.age} onChange={(e) => setP({ ...p, age: e.target.value })} placeholder="8" inputMode="numeric" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">School</Label>
              <Input value={p.school} onChange={(e) => setP({ ...p, school: e.target.value })} placeholder="School name" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Blood group</Label>
              <Input value={p.bloodGroup} onChange={(e) => setP({ ...p, bloodGroup: e.target.value })} placeholder="O+" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1"><KeyRound className="w-3 h-3" /> Family safe word</Label>
            <Input value={p.safeWord} onChange={(e) => setP({ ...p, safeWord: e.target.value })} placeholder="Only trusted pickups know this" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Identification marks / usual clothes</Label>
            <Textarea rows={2} value={p.marks} onChange={(e) => setP({ ...p, marks: e.target.value })} placeholder="Mole on left cheek, blue school bag…" />
          </div>
          <Button onClick={save} variant="secondary" className="w-full">
            <Save className="w-4 h-4 mr-2" /> Save child profile
          </Button>
        </section>

        <section>
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-2 px-1">Parent checklist</h2>
          <div className="space-y-2">
            {tips.map((t) => (
              <div key={t} className="bg-card border border-border rounded-2xl p-3 flex gap-3">
                <ShieldAlert className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">{t}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default ChildSafety;
