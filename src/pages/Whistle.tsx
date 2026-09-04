import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Volume2, Zap, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";

// Loud attention-grabber: high-pitched whistle + full-screen white strobe (SOS morse).
// Great when a threat is nearby — draws public attention.

const Whistle = () => {
  const [running, setRunning] = useState(false);
  const [strobe, setStrobe] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);
  const strobeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startWhistle = () => {
    const AC = (window.AudioContext || (window as any).webkitAudioContext);
    const ctx = new AC();
    const gain = ctx.createGain();
    gain.gain.value = 0.35;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 2800; // piercing whistle
    // Wobble frequency to sound like a rescue whistle
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 6;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 400;
    lfo.connect(lfoGain).connect(osc.frequency);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    lfo.start();
    ctxRef.current = ctx;
    oscRef.current = osc;
    lfoRef.current = lfo;
    setRunning(true);
  };

  const stopWhistle = () => {
    try { oscRef.current?.stop(); } catch {}
    try { lfoRef.current?.stop(); } catch {}
    try { ctxRef.current?.close(); } catch {}
    ctxRef.current = null;
    setRunning(false);
  };

  const toggleStrobe = () => {
    if (strobe) {
      if (strobeRef.current) clearInterval(strobeRef.current);
      strobeRef.current = null;
      setStrobe(false);
      setFlashOn(false);
      return;
    }
    // SOS morse: ... --- ... — dot 150ms, dash 450ms, gap 150ms
    const pattern = [
      150, 150, 150, 150, 150, 450, // S
      450, 150, 450, 150, 450, 450, // O
      150, 150, 150, 150, 150, 900, // S + long gap
    ];
    let i = 0;
    let on = false;
    const step = () => {
      on = !on;
      setFlashOn(on);
      const dur = pattern[i % pattern.length];
      i++;
      strobeRef.current = setTimeout(step, dur) as unknown as ReturnType<typeof setInterval>;
    };
    step();
    setStrobe(true);
  };

  useEffect(() => () => {
    stopWhistle();
    if (strobeRef.current) clearTimeout(strobeRef.current as unknown as number);
  }, []);

  return (
    <div className={`min-h-screen pb-24 transition-colors ${flashOn ? "bg-white" : "bg-background"}`}>
      <header className="bg-gradient-emergency text-primary-foreground">
        <div className="container py-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm opacity-90 mb-3">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="text-2xl font-bold">Attention Whistle</h1>
          <p className="text-sm opacity-90 mt-1">Loud whistle + SOS screen strobe. Use to draw immediate public attention.</p>
        </div>
      </header>

      <main className="container py-6 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-emergency flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold">Loud Whistle</div>
              <div className="text-xs text-muted-foreground">Piercing 2.8kHz warble tone</div>
            </div>
          </div>
          {running ? (
            <Button onClick={stopWhistle} size="lg" className="w-full h-14 bg-gradient-trust text-secondary-foreground font-bold">
              <Square className="w-5 h-5 mr-2" /> Stop Whistle
            </Button>
          ) : (
            <Button onClick={startWhistle} size="lg" className="w-full h-14 bg-gradient-emergency shadow-emergency font-bold">
              <Volume2 className="w-5 h-5 mr-2" /> Start Whistle (Max Volume)
            </Button>
          )}
          <p className="text-[10px] text-muted-foreground text-center">Tip: turn phone volume to max before starting.</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-trust flex items-center justify-center">
              <Zap className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div>
              <div className="font-semibold">SOS Screen Strobe</div>
              <div className="text-xs text-muted-foreground">Morse code ··· ─── ··· — visible far away</div>
            </div>
          </div>
          <Button
            onClick={toggleStrobe}
            size="lg"
            className={`w-full h-14 font-bold ${strobe ? "bg-gradient-trust text-secondary-foreground" : "bg-foreground text-background"}`}
          >
            <Zap className="w-5 h-5 mr-2" /> {strobe ? "Stop Strobe" : "Start SOS Strobe"}
          </Button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Whistle;
