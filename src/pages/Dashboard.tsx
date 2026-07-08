import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, AlertTriangle, Users, LogOut,
  Phone, Hospital, PhoneCall, Activity, MessageSquare, BookOpen,
  Share2, Navigation, Heart, WifiOff, Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VoiceActivation } from "@/components/VoiceActivation";
import { FakeCall } from "@/components/FakeCall";
import { SoundDetector } from "@/components/SoundDetector";
import { BottomNav } from "@/components/BottomNav";
import { SOSButton } from "@/components/SOSButton";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Profile { full_name: string; phone: string | null; }
interface Contact { id: string }

const Dashboard = () => {
  const { user, signOut, roles } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [contactsCount, setContactsCount] = useState(0);
  const [incidentsCount, setIncidentsCount] = useState(0);
  const [showFake, setShowFake] = useState(false);

  const isResponder = roles.includes("admin") || roles.includes("police") || roles.includes("hospital");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [p, c, i] = await Promise.all([
        supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
        supabase.from("emergency_contacts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("incidents").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setProfile(p.data);
      setContactsCount(c.count ?? 0);
      setIncidentsCount(i.count ?? 0);
    })();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
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
            <p className="text-sm opacity-80 mt-1">SOS tap chesthe Police 100 ki direct call + contacts ki SMS auto-send avtundi.</p>
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
              <span className="text-xs opacity-90 mt-0.5">Tap to alert</span>
            </div>
          </button>
          <p className="text-xs text-muted-foreground mt-4">Voice "Help Me" · Sound Shield · Tap button — all trigger SOS.</p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => navigate("/contacts")} className="p-3 bg-card border border-border rounded-2xl shadow-card text-center hover:border-primary/40">
            <Users className="w-4 h-4 text-secondary mx-auto mb-1" />
            <div className="text-xl font-bold">{contactsCount}</div>
            <div className="text-[10px] text-muted-foreground">Contacts</div>
          </button>
          <button onClick={() => navigate("/history")} className="p-3 bg-card border border-border rounded-2xl shadow-card text-center hover:border-primary/40">
            <Activity className="w-4 h-4 text-primary mx-auto mb-1" />
            <div className="text-xl font-bold">{incidentsCount}</div>
            <div className="text-[10px] text-muted-foreground">Incidents</div>
          </button>
          <button onClick={() => navigate("/safety-tips")} className="p-3 bg-card border border-border rounded-2xl shadow-card text-center hover:border-primary/40">
            <BookOpen className="w-4 h-4 text-secondary mx-auto mb-1" />
            <div className="text-xl font-bold">Tips</div>
            <div className="text-[10px] text-muted-foreground">Safety</div>
          </button>
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

        {/* Sound Shield — accident / scream detection */}
        <SoundDetector onDetect={() => navigate("/emergency")} />

        {/* Voice SOS */}
        <VoiceActivation onTrigger={() => navigate("/emergency")} />

        {/* Nearby */}
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

        {/* New advanced features */}
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">More protection</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate("/share-location")} className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl shadow-card text-left hover:border-primary/40">
              <div className="w-10 h-10 rounded-xl bg-gradient-trust flex items-center justify-center shrink-0"><Share2 className="w-5 h-5 text-secondary-foreground" /></div>
              <div><div className="font-semibold text-sm">Live Share</div><div className="text-xs text-muted-foreground">1-hour link</div></div>
            </button>
            <button onClick={() => navigate("/journey")} className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl shadow-card text-left hover:border-primary/40">
              <div className="w-10 h-10 rounded-xl bg-gradient-trust flex items-center justify-center shrink-0"><Navigation className="w-5 h-5 text-secondary-foreground" /></div>
              <div><div className="font-semibold text-sm">Safe Journey</div><div className="text-xs text-muted-foreground">Route + ETA</div></div>
            </button>
            <button onClick={() => navigate("/women-safety")} className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl shadow-card text-left hover:border-primary/40">
              <div className="w-10 h-10 rounded-xl bg-gradient-emergency flex items-center justify-center shrink-0"><Heart className="w-5 h-5 text-primary-foreground" /></div>
              <div><div className="font-semibold text-sm">Women Mode</div><div className="text-xs text-muted-foreground">1091 · Disha</div></div>
            </button>
            <button onClick={() => navigate("/offline-sos")} className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl shadow-card text-left hover:border-primary/40">
              <div className="w-10 h-10 rounded-xl bg-gradient-trust flex items-center justify-center shrink-0"><WifiOff className="w-5 h-5 text-secondary-foreground" /></div>
              <div><div className="font-semibold text-sm">Offline SOS</div><div className="text-xs text-muted-foreground">No internet</div></div>
            </button>
            <button onClick={() => navigate("/evidence")} className="col-span-2 flex items-center gap-3 p-4 bg-card border border-border rounded-2xl shadow-card text-left hover:border-primary/40">
              <div className="w-10 h-10 rounded-xl bg-gradient-emergency flex items-center justify-center shrink-0"><Camera className="w-5 h-5 text-primary-foreground" /></div>
              <div><div className="font-semibold text-sm">Evidence Capture</div><div className="text-xs text-muted-foreground">Photo + 15s video → private cloud vault</div></div>
            </button>
          </div>
        </section>

        <button
          onClick={() => navigate("/contacts")}
          className="w-full flex items-center justify-between p-4 bg-accent/40 border border-accent rounded-2xl text-left"
        >
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-secondary" />
            <div>
              <div className="font-semibold text-sm">Auto-SMS Ready</div>
              <div className="text-xs text-muted-foreground">
                {contactsCount > 0 ? `${contactsCount} contact${contactsCount > 1 ? "s" : ""} will be alerted` : "Add contacts to enable auto-alert"}
              </div>
            </div>
          </div>
          <span className="text-xs text-secondary font-semibold">Manage →</span>
        </button>

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
      <BottomNav />
    </div>
  );
};

export default Dashboard;
