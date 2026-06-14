import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Shield, Phone, MapPin, Users, Eye, Car, Home, Moon } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

const tips = [
  {
    icon: Phone,
    title: "Emergency Numbers Memorise Cheyandi",
    body: "Police 100 · Women Helpline 1091 · Ambulance 108 · Child Helpline 1098 · Anti-stalking 1096. Phone lock screen lo ivvi save chesi pettandi.",
  },
  {
    icon: Users,
    title: "Trusted Circle Build Cheyandi",
    body: "Family + 2 close friends ki mee live location share chesi unchandi. Travel ki vellethe roju 'check-in' message pampandi.",
  },
  {
    icon: MapPin,
    title: "Share Your Live Location",
    body: "Auto/Cab ekkithe number plate photo teesi family ki pampandi. Jeevan Raksha SOS press chesthe location automatic ga share avtundi.",
  },
  {
    icon: Eye,
    title: "Surroundings Aware Ga Undali",
    body: "Headphones rendu chevulalo petukokandi raatri pootu. Phone lo munchi pothe attacker ki easy target avutaru. Confident ga walk cheyandi.",
  },
  {
    icon: Car,
    title: "Cab / Auto Safety",
    body: "Back seat lo kurchondi, driver details + number plate trusted person ki pampandi. Route deviate ayithe ventane SOS press cheyandi.",
  },
  {
    icon: Home,
    title: "Home Safety",
    body: "Door open chese mundu peephole/CCTV check cheyandi. Strangers ki addressleda 'alone unna' ane info ivvakandi. Spare key safe place lo unchandi.",
  },
  {
    icon: Moon,
    title: "Night Travel",
    body: "Bright lit roads use cheyandi. Pepper spray / safety alarm jeb lo undali. Sound Shield ON cheyandi — crash/scream detect ayithe auto SOS trigger avtundi.",
  },
  {
    icon: Shield,
    title: "Self-Defense Basics",
    body: "Attacker eyes, throat, knee — weak points. Loudly 'FIRE!' ani arvandi (attention vastundi 'Help' kanna). Self-defense class join avvandi.",
  },
];

const helplines = [
  { name: "Police", num: "100" },
  { name: "Women Helpline", num: "1091" },
  { name: "Ambulance", num: "108" },
  { name: "Child Helpline", num: "1098" },
  { name: "Domestic Abuse", num: "181" },
  { name: "Cyber Crime", num: "1930" },
];

const SafetyTips = () => (
  <div className="min-h-screen bg-background pb-24">
    <header className="bg-gradient-trust text-secondary-foreground">
      <div className="container py-6">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm opacity-90 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="w-6 h-6" /> Safety Tips</h1>
        <p className="text-sm opacity-80 mt-1">Practical tips to stay safe every day.</p>
      </div>
    </header>

    <main className="container py-6 space-y-4">
      <section className="grid grid-cols-3 gap-2">
        {helplines.map((h) => (
          <a
            key={h.num}
            href={`tel:${h.num}`}
            className="bg-card border border-border rounded-xl p-3 text-center shadow-card hover:border-primary/40"
          >
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{h.name}</div>
            <div className="text-lg font-extrabold text-primary mt-0.5">{h.num}</div>
          </a>
        ))}
      </section>

      <div className="space-y-3">
        {tips.map((t) => (
          <article key={t.title} className="bg-card border border-border rounded-2xl p-4 shadow-card">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                <t.icon className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm mb-1">{t.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{t.body}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>

    <BottomNav />
  </div>
);

export default SafetyTips;
