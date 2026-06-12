import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, AlertTriangle, Users, MapPin, History, LogOut, Phone, Hospital, Mic, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VoiceActivation } from "@/components/VoiceActivation";

interface Profile { full_name: string; phone: string | null; }
interface Stats { contacts: number; incidents: number; }

const Dashboard = () => {
  const { user, signOut, roles } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({ contacts: 0, incidents: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle();
      setProfile(p);
      const { count: c } = await supabase.from("emergency_contacts").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      const { count: i } = await supabase.from("incidents").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      setStats({ contacts: c ?? 0, incidents: i ?? 0 });
    })();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/");
  };

  const isResponder = roles.includes("admin") || roles.includes("police") || roles.includes("hospital");

  return (
    <div className="min-h-screen bg-background pb-24">
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
            <p className="text-sm opacity-80 mt-1">Tap the red button anytime for instant help.</p>
          </div>
        </div>
      </header>

      <main className="container -mt-6 space-y-5">
        {/* SOS Card */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-elevated text-center">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Emergency SOS</p>
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
          <p className="text-xs text-muted-foreground mt-4">Your location will be shared with your trusted contacts.</p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-card border border-border rounded-2xl shadow-card">
            <Users className="w-5 h-5 text-secondary mb-2" />
            <div className="text-2xl font-bold">{stats.contacts}</div>
            <div className="text-xs text-muted-foreground">Trusted contacts</div>
          </div>
          <div className="p-4 bg-card border border-border rounded-2xl shadow-card">
            <History className="w-5 h-5 text-primary mb-2" />
            <div className="text-2xl font-bold">{stats.incidents}</div>
            <div className="text-xs text-muted-foreground">Past incidents</div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="space-y-2">
          <Link to="/contacts" className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl shadow-card hover:shadow-elevated transition">
            <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center">
              <Users className="w-5 h-5 text-secondary" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Trusted Contacts</div>
              <div className="text-xs text-muted-foreground">Manage who gets alerted</div>
            </div>
          </Link>
          <Link to="/nearby" className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl shadow-card hover:shadow-elevated transition">
            <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center">
              <MapPin className="w-5 h-5 text-secondary" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Nearby Help</div>
              <div className="text-xs text-muted-foreground">Police stations & hospitals</div>
            </div>
          </Link>
          <Link to="/history" className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl shadow-card hover:shadow-elevated transition">
            <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center">
              <History className="w-5 h-5 text-secondary" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Incident History</div>
              <div className="text-xs text-muted-foreground">Past alerts & evidence</div>
            </div>
          </Link>
          <a href="tel:112" className="flex items-center gap-4 p-4 bg-gradient-emergency rounded-2xl shadow-emergency text-primary-foreground">
            <div className="w-11 h-11 rounded-xl bg-background/20 flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Call National Helpline 112</div>
              <div className="text-xs opacity-90">India emergency response</div>
            </div>
          </a>
        </div>

        {isResponder && (
          <div className="p-4 bg-gradient-trust rounded-2xl shadow-trust text-secondary-foreground">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">Responder access</p>
            <p className="text-sm mb-3">You have elevated access to incident dashboards.</p>
            <Link to="/responder"><Button size="sm" variant="secondary" className="bg-background text-foreground">Open responder panel</Button></Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
