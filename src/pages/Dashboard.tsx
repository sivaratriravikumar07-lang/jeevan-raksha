import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, AlertTriangle, Users, History as HistoryIcon, LogOut,
  Phone, Hospital, PhoneCall, Plus, Trash2, Activity,
  MapPin,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VoiceActivation } from "@/components/VoiceActivation";
import { FakeCall } from "@/components/FakeCall";
import { vibrate } from "@/lib/emergency";

interface Profile { full_name: string; phone: string | null; }
interface Contact { id: string; name: string; phone: string; email: string | null; relationship: string | null; }
interface Incident { id: string; type: string; status: string; latitude: number | null; longitude: number | null; created_at: string; }

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(8).max(20),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  relationship: z.string().trim().max(40).optional(),
});

const statusColor: Record<string, string> = {
  active: "bg-primary text-primary-foreground",
  responded: "bg-warning text-warning-foreground",
  resolved: "bg-success text-success-foreground",
  false_alarm: "bg-muted text-muted-foreground",
};

const Dashboard = () => {
  const { user, signOut, roles } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [showFake, setShowFake] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", relationship: "" });
  const [saving, setSaving] = useState(false);
  const lastShake = useRef(0);

  const isResponder = roles.includes("admin") || roles.includes("police") || roles.includes("hospital");

  const loadAll = async () => {
    if (!user) return;
    const [p, c, i] = await Promise.all([
      supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
      supabase.from("emergency_contacts").select("*").eq("user_id", user.id).order("priority"),
      supabase.from("incidents").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setProfile(p.data);
    setContacts(c.data ?? []);
    setIncidents(i.data ?? []);
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [user]);

  // Shake-to-SOS detection
  useEffect(() => {
    const handler = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const mag = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2);
      const now = Date.now();
      if (mag > 28 && now - lastShake.current > 1500) {
        lastShake.current = now;
        vibrate(300);
        toast.error("Shake detected — triggering SOS!");
        navigate("/emergency");
      }
    };
    window.addEventListener("devicemotion", handler);
    return () => window.removeEventListener("devicemotion", handler);
  }, [navigate]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/");
  };

  const addContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setSaving(true);
    const { error } = await supabase.from("emergency_contacts").insert({
      user_id: user!.id, name: parsed.data.name, phone: parsed.data.phone,
      email: parsed.data.email || null, relationship: parsed.data.relationship || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Contact added");
    setForm({ name: "", phone: "", email: "", relationship: "" });
    setAddOpen(false);
    loadAll();
  };

  const removeContact = async (id: string) => {
    await supabase.from("emergency_contacts").delete().eq("id", id);
    toast.success("Removed");
    loadAll();
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-background/20 backdrop-blur flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <span className="font-bold">Jeevan Raksha</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-secondary-foreground hover:bg-background/20">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
          <div>
            <p className="text-sm opacity-80">Hi {profile?.full_name?.split(" ")[0] ?? "there"} 👋</p>
            <h1 className="text-2xl font-bold mt-0.5">You are protected</h1>
            <p className="text-sm opacity-80 mt-1">SOS tap chesthe Police 100 ki direct call ayyela setup unnadi.</p>
          </div>
        </div>
      </header>

      <main className="container -mt-6 space-y-5">
        {/* SOS Card */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-elevated text-center">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Emergency SOS · Police 100</p>
          <button
            onClick={() => navigate("/emergency")}
            className="relative w-44 h-44 rounded-full bg-gradient-emergency shadow-emergency mx-auto animate-sos-pulse active:scale-95 transition-transform"
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center text-primary-foreground">
              <AlertTriangle className="w-10 h-10 mb-1" />
              <span className="text-3xl font-extrabold tracking-wider">SOS</span>
              <span className="text-xs opacity-90 mt-0.5">Tap or shake phone</span>
            </div>
          </button>
          <p className="text-xs text-muted-foreground mt-4">Voice "Help Me" · Shake phone · Tap button — all trigger SOS.</p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-card border border-border rounded-2xl shadow-card text-center">
            <Users className="w-4 h-4 text-secondary mx-auto mb-1" />
            <div className="text-xl font-bold">{contacts.length}</div>
            <div className="text-[10px] text-muted-foreground">Contacts</div>
          </div>
          <div className="p-3 bg-card border border-border rounded-2xl shadow-card text-center">
            <Activity className="w-4 h-4 text-primary mx-auto mb-1" />
            <div className="text-xl font-bold">{incidents.length}</div>
            <div className="text-[10px] text-muted-foreground">Incidents</div>
          </div>
          <div className="p-3 bg-card border border-border rounded-2xl shadow-card text-center">
            <MapPin className="w-4 h-4 text-secondary mx-auto mb-1" />
            <div className="text-xl font-bold">2</div>
            <div className="text-[10px] text-muted-foreground">Pages</div>
          </div>
        </div>

        {/* Quick action row */}
        <div className="grid grid-cols-2 gap-3">
          <a href="tel:100" className="flex items-center gap-3 p-4 bg-gradient-emergency rounded-2xl shadow-emergency text-primary-foreground">
            <Phone className="w-5 h-5" />
            <div>
              <div className="font-semibold text-sm">Call Police</div>
              <div className="text-xs opacity-90">100</div>
            </div>
          </a>
          <button onClick={() => setShowFake(true)} className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl shadow-card text-left">
            <PhoneCall className="w-5 h-5 text-secondary" />
            <div>
              <div className="font-semibold text-sm">Fake Call</div>
              <div className="text-xs text-muted-foreground">Decoy ringer</div>
            </div>
          </button>
        </div>

        {/* Voice SOS */}
        <VoiceActivation onTrigger={() => navigate("/emergency")} />

        {/* Separate page links for Nearby */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/police-stations")}
            className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl shadow-card text-left hover:border-primary/40 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-emergency flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold text-sm">Police Stations</div>
              <div className="text-xs text-muted-foreground">Vijayawada</div>
            </div>
          </button>
          <button
            onClick={() => navigate("/hospitals")}
            className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl shadow-card text-left hover:border-primary/40 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-trust flex items-center justify-center shrink-0">
              <Hospital className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold text-sm">Hospitals</div>
              <div className="text-xs text-muted-foreground">Vijayawada</div>
            </div>
          </button>
        </div>

        {/* Tabs: Contacts & History */}
        <Tabs defaultValue="contacts" className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Contacts */}
          <TabsContent value="contacts" className="space-y-2 mt-3">
            {contacts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No trusted contacts yet. Add your first one below.
              </div>
            )}
            {contacts.map((c) => (
              <div key={c.id} className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3 shadow-card">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold text-secondary">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate text-sm">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.phone}{c.relationship ? ` · ${c.relationship}` : ""}</div>
                </div>
                <a href={`tel:${c.phone}`} className="p-2 rounded-full hover:bg-accent">
                  <Phone className="w-4 h-4 text-secondary" />
                </a>
                <Button variant="ghost" size="icon" onClick={() => removeContact(c.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button className="w-full h-11 bg-gradient-emergency shadow-emergency">
                  <Plus className="w-4 h-4 mr-2" /> Add Trusted Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add contact</DialogTitle></DialogHeader>
                <form onSubmit={addContact} className="space-y-4">
                  <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                  <div><Label>Phone</Label><Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
                  <div><Label>Email (optional)</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label>Relationship (optional)</Label><Input placeholder="Mom, Friend..." value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} /></div>
                  <Button type="submit" disabled={saving} className="w-full bg-gradient-emergency">{saving ? "Saving..." : "Save Contact"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* History */}
          <TabsContent value="history" className="space-y-2 mt-3">
            {incidents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <HistoryIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No incidents yet. Stay safe!
              </div>
            )}
            {incidents.map((i) => (
              <div key={i.id} className="bg-card border border-border rounded-2xl p-3 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold capitalize text-sm">{i.type} alert</div>
                    <div className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleString()}</div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${statusColor[i.status] ?? "bg-muted"}`}>
                    {i.status.replace("_", " ")}
                  </span>
                </div>
                {i.latitude && i.longitude && (
                  <a href={`https://www.google.com/maps?q=${i.latitude},${i.longitude}`} target="_blank" rel="noreferrer"
                     className="mt-2 text-xs text-secondary inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> View location
                  </a>
                )}
              </div>
            ))}
          </TabsContent>
        </Tabs>

        {isResponder && (
          <div className="p-4 bg-gradient-trust rounded-2xl shadow-trust text-secondary-foreground">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">Responder access</p>
            <p className="text-sm mb-3">You have elevated access to incident dashboards.</p>
            <Button size="sm" variant="secondary" className="bg-background text-foreground" onClick={() => navigate("/responder")}>
              Open responder panel
            </Button>
          </div>
        )}
      </main>

      {showFake && <FakeCall onEnd={() => setShowFake(false)} />}
    </div>
  );
};

export default Dashboard;
