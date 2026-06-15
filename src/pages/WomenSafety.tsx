import { Link } from "react-router-dom";
import { ArrowLeft, Phone, Heart, Shield, Users, MapPin, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";

const helplines = [
  { name: "Women Helpline", number: "1091", desc: "24x7 women in distress (all India)", color: "bg-gradient-emergency" },
  { name: "Domestic Abuse", number: "181", desc: "Women's One Stop Centre", color: "bg-gradient-trust" },
  { name: "Police", number: "100", desc: "Immediate police response", color: "bg-gradient-emergency" },
  { name: "Cyber Crime", number: "1930", desc: "Online harassment & fraud", color: "bg-gradient-trust" },
  { name: "Child Helpline", number: "1098", desc: "Children in distress", color: "bg-gradient-trust" },
  { name: "Anti-Stalking AP", number: "1091", desc: "Andhra Pradesh Disha helpline", color: "bg-gradient-emergency" },
];

const sakhi = [
  { name: "Sakhi One Stop Centre — Vijayawada", addr: "Govt. General Hospital campus, Vijayawada", phone: "0866-2424344" },
  { name: "Disha Police Station — Vijayawada", addr: "Krishna District HQ", phone: "0866-2570333" },
  { name: "She Team — Andhra Pradesh", addr: "Women safety wing, AP Police", phone: "1091" },
];

const tips = [
  "Share live location with a trusted contact before travel.",
  "Trust your instincts — leave any place that feels unsafe.",
  "Memorise 1091 and 100 — they work even with no balance.",
  "In Ola/Uber, share trip and verify driver + number plate.",
  "Carry a whistle / use Sound Shield in Jeevan Raksha.",
];

const WomenSafety = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-emergency text-primary-foreground">
        <div className="container py-5 flex items-center gap-3">
          <Link to="/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="font-bold text-lg flex items-center gap-2"><Heart className="w-5 h-5" /> Women Safety Mode</h1>
            <p className="text-xs opacity-90">1091 · Disha · Sakhi · She Team</p>
          </div>
        </div>
      </header>

      <main className="container -mt-4 space-y-4">
        <div className="bg-card border border-border rounded-3xl p-5 shadow-elevated text-center">
          <a href="tel:1091" className="block">
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-emergency shadow-emergency flex flex-col items-center justify-center text-primary-foreground active:scale-95 transition-transform">
              <Phone className="w-8 h-8" />
              <span className="text-2xl font-extrabold mt-1">1091</span>
              <span className="text-[10px] opacity-90">Women Helpline</span>
            </div>
          </a>
          <Button onClick={() => navigate("/emergency")} className="mt-4 w-full bg-gradient-emergency">
            <AlertTriangle className="w-4 h-4 mr-2" /> Trigger Full SOS
          </Button>
        </div>

        <section>
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-2 px-1">Helplines</h2>
          <div className="grid grid-cols-2 gap-3">
            {helplines.map((h) => (
              <a key={h.name + h.number} href={`tel:${h.number}`} className={`${h.color} text-primary-foreground rounded-2xl p-4 shadow-card active:scale-95 transition-transform`}>
                <Phone className="w-4 h-4 mb-1 opacity-90" />
                <div className="font-bold text-lg leading-tight">{h.number}</div>
                <div className="text-xs font-semibold mt-1">{h.name}</div>
                <div className="text-[10px] opacity-90 mt-0.5">{h.desc}</div>
              </a>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-2 px-1">Sakhi & Disha — Vijayawada</h2>
          <div className="space-y-2">
            {sakhi.map((s) => (
              <div key={s.name} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {s.addr}</p>
                  </div>
                  <a href={`tel:${s.phone}`} className="shrink-0 p-2 rounded-lg bg-secondary text-secondary-foreground"><Phone className="w-4 h-4" /></a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-accent/40 border border-accent rounded-2xl p-4">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-2"><Shield className="w-4 h-4 text-secondary" /> Quick safety tips</h3>
          <ul className="space-y-1.5 text-xs text-muted-foreground list-disc pl-5">
            {tips.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>
      </main>
      <BottomNav />
    </div>
  );
};

export default WomenSafety;
