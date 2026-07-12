import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, HeartPulse, Search, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/BottomNav";

interface Guide {
  title: string;
  keywords: string[];
  steps: string[];
  warn?: string;
}

const guides: Guide[] = [
  {
    title: "Bleeding (Severe)",
    keywords: ["bleed", "cut", "wound", "blood"],
    steps: [
      "Call 108 immediately.",
      "Wear gloves or use a plastic bag if available.",
      "Press firmly on the wound with a clean cloth for 10 minutes without lifting.",
      "Raise the injured area above heart level if possible.",
      "If cloth soaks through, add more on top — do NOT remove.",
      "Keep the person warm and lying down until help arrives.",
    ],
  },
  {
    title: "Choking (Adult)",
    keywords: ["choke", "choking", "airway"],
    steps: [
      "Ask 'Are you choking?' — if they can't speak, act now.",
      "Stand behind, lean them slightly forward.",
      "Give 5 sharp back blows between shoulder blades with heel of hand.",
      "If still choking, do 5 abdominal thrusts (Heimlich): fist above navel, thrust inward and upward.",
      "Alternate 5 back blows and 5 thrusts until object is out or person becomes unconscious.",
      "If unconscious → start CPR and call 108.",
    ],
  },
  {
    title: "CPR (Adult)",
    keywords: ["cpr", "heart", "cardiac", "unconscious", "breathing"],
    steps: [
      "Call 108 and get an AED if available.",
      "Lay person flat on back on hard surface.",
      "Kneel beside them, hands centered on chest, one on top of the other.",
      "Push HARD and FAST — 5–6 cm deep, 100–120 compressions/minute (beat of 'Stayin' Alive').",
      "After 30 compressions give 2 rescue breaths (if trained). Otherwise continue compressions only.",
      "Do not stop until help arrives or person breathes normally.",
    ],
  },
  {
    title: "Burns",
    keywords: ["burn", "fire", "scald"],
    steps: [
      "Move away from the heat source.",
      "Cool the burn under cool (not cold) running water for at least 20 minutes.",
      "Remove tight clothing/jewelry near the burn before it swells.",
      "Cover loosely with a clean non-stick cloth or cling film.",
      "Do NOT apply ice, butter, toothpaste, or oil.",
      "Seek medical help for burns larger than the palm, on face, hands, or genitals.",
    ],
  },
  {
    title: "Fracture / Broken Bone",
    keywords: ["fracture", "broken", "bone", "sprain"],
    steps: [
      "Do not move the person unnecessarily.",
      "Immobilize the injured area — support above and below the injury.",
      "Apply a cold pack wrapped in cloth for 20 minutes.",
      "Do NOT try to realign the bone.",
      "Watch for signs of shock — pale, sweaty, rapid breathing. Lay flat, cover with blanket.",
      "Get to hospital or call 108.",
    ],
  },
  {
    title: "Fainting",
    keywords: ["faint", "dizzy", "unconscious", "collapse"],
    steps: [
      "Lay the person flat on their back.",
      "Raise their legs about 30 cm above heart level.",
      "Loosen tight clothing around neck and waist.",
      "Ensure fresh air — move bystanders away.",
      "If not recovering in 1 minute, call 108.",
      "When they wake up, keep them lying for a few minutes before standing.",
    ],
  },
  {
    title: "Snake Bite",
    keywords: ["snake", "bite", "venom"],
    steps: [
      "Call 108 immediately. Note snake's color/pattern if safe.",
      "Keep the person calm and still — movement spreads venom.",
      "Keep bitten limb BELOW heart level.",
      "Remove rings, watches, tight clothing near the bite.",
      "Do NOT cut the wound, suck the venom, apply ice, or tourniquet.",
      "Rush to nearest hospital with anti-venom.",
    ],
  },
  {
    title: "Heart Attack",
    keywords: ["heart attack", "chest pain", "cardiac"],
    steps: [
      "Call 108 immediately.",
      "Sit person down, half-lying with knees bent.",
      "Loosen tight clothing.",
      "If not allergic and available, give 300mg aspirin to chew slowly.",
      "Monitor breathing. If they stop breathing → start CPR.",
      "Stay calm and keep reassuring them until help arrives.",
    ],
  },
  {
    title: "Seizure",
    keywords: ["seizure", "epilepsy", "fits", "convulsion"],
    steps: [
      "Do NOT restrain the person or put anything in their mouth.",
      "Clear the area of hard/sharp objects.",
      "Cushion their head with something soft.",
      "Time the seizure. Call 108 if it lasts more than 5 minutes.",
      "When it stops, turn them onto their side (recovery position).",
      "Stay with them until fully alert.",
    ],
  },
];

const FirstAid = () => {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const filtered = guides.filter(
    (g) =>
      !q ||
      g.title.toLowerCase().includes(q.toLowerCase()) ||
      g.keywords.some((k) => k.includes(q.toLowerCase())),
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-emergency text-primary-foreground">
        <div className="container py-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm opacity-90 mb-3">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5" />
            <h1 className="text-2xl font-bold">First Aid Guide</h1>
          </div>
          <p className="text-sm opacity-90 mt-1">Quick life-saving steps for common emergencies. Always call 108 first.</p>

          <a href="tel:108" className="mt-3 inline-flex items-center gap-2 bg-background text-foreground px-4 py-2 rounded-full text-sm font-bold shadow-card">
            <Phone className="w-4 h-4" /> Call Ambulance 108
          </a>
        </div>
      </header>

      <main className="container py-6 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search: bleed, burn, cpr…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {filtered.map((g) => {
          const isOpen = open === g.title;
          return (
            <button
              key={g.title}
              onClick={() => setOpen(isOpen ? null : g.title)}
              className="w-full text-left bg-card border border-border rounded-2xl p-4 shadow-card"
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold">{g.title}</div>
                <span className="text-xs text-secondary font-semibold">{isOpen ? "Hide" : "Show"}</span>
              </div>
              {isOpen && (
                <ol className="mt-3 space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                  {g.steps.map((s, i) => (<li key={i}>{s}</li>))}
                </ol>
              )}
            </button>
          );
        })}

        <p className="text-[10px] text-muted-foreground text-center pt-4">
          This guide is for information only and does not replace professional medical care.
        </p>
      </main>

      <BottomNav />
    </div>
  );
};

export default FirstAid;
