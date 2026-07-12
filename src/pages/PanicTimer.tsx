import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Timer, Play, Square, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";

// Dead-man's switch: user starts a timer. If they don't tap "I'm Safe" before it ends,
// the app auto-navigates to /emergency (which triggers SOS + SMS + call 100).
const STORAGE_KEY = "jr_panic_timer_deadline";

const PanicTimer = () => {
  const navigate = useNavigate();
  const [minutes, setMinutes] = useState(10);
  const [deadline, setDeadline] = useState<number | null>(() => {
    const v = localStorage.getItem(STORAGE_KEY);
    return v ? Number(v) : null;
  });
  const [remaining, setRemaining] = useState(0);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const ms = deadline - Date.now();
      setRemaining(Math.max(0, ms));
      if (ms <= 0 && !firedRef.current) {
        firedRef.current = true;
        localStorage.removeItem(STORAGE_KEY);
        toast.error("Check-in missed — triggering SOS");
        navigate("/emergency");
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [deadline, navigate]);

  const start = () => {
    if (minutes < 1 || minutes > 240) { toast.error("Choose 1–240 minutes"); return; }
    const d = Date.now() + minutes * 60_000;
    localStorage.setItem(STORAGE_KEY, String(d));
    firedRef.current = false;
    setDeadline(d);
    toast.success(`Timer armed for ${minutes} min`);
  };

  const safe = () => {
    localStorage.removeItem(STORAGE_KEY);
    setDeadline(null);
    toast.success("Marked safe. Timer cleared.");
  };

  const mm = Math.floor(remaining / 60000).toString().padStart(2, "0");
  const ss = Math.floor((remaining % 60000) / 1000).toString().padStart(2, "0");

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm opacity-90 mb-3">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5" />
            <h1 className="text-2xl font-bold">Check-in Timer</h1>
          </div>
          <p className="text-sm opacity-80 mt-1">
            Auto-SOS if you don't check-in before the timer ends. Great for late-night rides, meetings with strangers, or solo travel.
          </p>
        </div>
      </header>

      <main className="container py-6 space-y-5">
        {!deadline ? (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
            <div>
              <Label>Timer duration (minutes)</Label>
              <Input
                type="number" min={1} max={240}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="mt-1 text-lg font-bold"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 15, 30].map((m) => (
                <button
                  key={m}
                  onClick={() => setMinutes(m)}
                  className={`py-2 rounded-lg text-xs font-semibold border ${
                    minutes === m ? "bg-secondary text-secondary-foreground border-secondary" : "border-border"
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
            <Button onClick={start} className="w-full h-12 bg-gradient-emergency shadow-emergency">
              <Play className="w-5 h-5 mr-2" /> Arm Timer
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              If you don't tap "I'm Safe" before it ends, SOS triggers automatically.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-primary/40 rounded-2xl p-6 shadow-elevated text-center space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timer active — check-in before</p>
            <div className="text-6xl font-extrabold text-primary tabular-nums">{mm}:{ss}</div>
            <Button onClick={safe} size="lg" className="w-full h-14 bg-gradient-trust text-secondary-foreground font-bold">
              <Square className="w-5 h-5 mr-2" /> I'm Safe — Stop Timer
            </Button>
            <button onClick={() => { safe(); }} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        )}

        <div className="bg-accent/40 border border-accent rounded-2xl p-4 text-sm">
          <p className="font-semibold mb-1">How it works</p>
          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
            <li>Set a duration you expect to be safe within.</li>
            <li>Keep this app tab open on your phone.</li>
            <li>Tap "I'm Safe" before the timer ends — nothing happens.</li>
            <li>Miss the check-in → SMS to trusted contacts + call 100 automatically.</li>
          </ul>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default PanicTimer;
