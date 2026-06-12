import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Phone, PhoneOff, User, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const CALLERS = [
  { name: "Dad", number: "+91 98XXX XXXXX" },
  { name: "Mom", number: "+91 99XXX XXXXX" },
  { name: "Brother", number: "+91 97XXX XXXXX" },
  { name: "Friend", number: "+91 96XXX XXXXX" },
];

const FakeCallPage = () => {
  const [selected, setSelected] = useState(CALLERS[0]);
  const [status, setStatus] = useState<"setup" | "ringing" | "ongoing" | "ended">("setup");
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (status !== "ongoing") return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const startCall = () => {
    setStatus("ringing");
    setTimeout(() => {
      setStatus("ongoing");
      setSeconds(0);
    }, 2000);
  };

  const endCall = () => setStatus("ended");

  if (status === "ringing") {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-300">
        <p className="text-white/70 text-sm uppercase tracking-wider mb-4">Incoming Call</p>
        <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mb-4 animate-bounce">
          <User className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-4xl font-bold text-white mb-1">{selected.name}</h2>
        <p className="text-white/60 text-lg">{selected.number}</p>
        <div className="flex gap-6 mt-12">
          <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform">
            <PhoneOff className="w-7 h-7 text-white" />
          </button>
          <button onClick={() => setStatus("ongoing")} className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform">
            <Phone className="w-7 h-7 text-white" />
          </button>
        </div>
      </div>
    );
  }

  if (status === "ongoing") {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-between py-12 px-6 animate-in fade-in duration-300">
        <div className="text-center space-y-2">
          <p className="text-white/70 text-sm uppercase tracking-wider">Ongoing Call</p>
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto">
            <User className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white">{selected.name}</h2>
          <p className="text-white/60 text-sm">{selected.number}</p>
        </div>
        <div className="text-white/80 text-3xl font-mono tabular-nums">{formatTime(seconds)}</div>
        <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform">
          <PhoneOff className="w-7 h-7 text-white" />
        </button>
      </div>
    );
  }

  if (status === "ended") {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-center p-6">
        <PhoneOff className="w-12 h-12 text-white/50 mb-4" />
        <p className="text-white text-lg font-semibold">Call Ended</p>
        <p className="text-white/70 text-sm mt-2">Duration {formatTime(seconds)}</p>
        <Link to="/dashboard" className="mt-8">
          <Button variant="secondary">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm opacity-90 mb-3">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="text-2xl font-bold">Fake Call</h1>
          <p className="text-sm opacity-80 mt-1">Simulate an incoming call to distract a threat.</p>
        </div>
      </header>

      <main className="container py-6 space-y-4">
        <div className="space-y-2">
          {CALLERS.map((c) => (
            <button
              key={c.name}
              onClick={() => setSelected(c)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition ${
                selected.name === c.name
                  ? "bg-card border-secondary shadow-card"
                  : "bg-transparent border-border hover:bg-card"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold text-secondary text-sm">
                {c.name[0]}
              </div>
              <div className="text-left">
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.number}</div>
              </div>
            </button>
          ))}
        </div>

        <Button onClick={startCall} className="w-full h-14 bg-gradient-emergency shadow-emergency text-base">
          <Phone className="w-5 h-5 mr-2" /> Start Fake Call from {selected.name}
        </Button>

        <div className="p-4 bg-accent/50 rounded-2xl text-sm text-accent-foreground">
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 mt-0.5 shrink-0" />
            <p>The call screen will appear in full screen after a 2-second delay. Use this to create a plausible reason to leave an uncomfortable situation.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FakeCallPage;
