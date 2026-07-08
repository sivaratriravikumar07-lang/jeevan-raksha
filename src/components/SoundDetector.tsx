import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, AudioWaveform } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Props { onDetect: () => void; threshold?: number }

/**
 * Listens to the mic and triggers `onDetect` when a sustained loud sound (crash / scream)
 * is detected. Uses Web Audio AnalyserNode (no recording / upload).
 */
export const SoundDetector = ({ onDetect, threshold = 0.35 }: Props) => {
  const [enabled, setEnabled] = useState(false);
  const [level, setLevel] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTriggerRef = useRef(0);
  const loudStartRef = useRef<number | null>(null);

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setLevel(0);
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);

      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        setLevel(rms);

        const now = Date.now();
        if (rms > threshold) {
          if (loudStartRef.current === null) loudStartRef.current = now;
          // Sustained loud (>250ms) and cooldown 10s
          if (now - loudStartRef.current > 250 && now - lastTriggerRef.current > 10000) {
            lastTriggerRef.current = now;
            loudStartRef.current = null;
            toast.error("Loud sound detected — triggering SOS!");
            onDetect();
          }
        } else {
          loudStartRef.current = null;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      toast.success("Sound shield ON — mic is listening for crashes/screams.");
    } catch {
      toast.error("Mic permission denied. Cannot enable sound shield.");
      setEnabled(false);
    }
  };

  useEffect(() => {
    if (enabled) start();
    else stop();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const pct = Math.min(100, Math.round(level * 200));

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${enabled ? "bg-gradient-emergency" : "bg-accent"}`}>
            {enabled ? <Mic className="w-4 h-4 text-primary-foreground" /> : <MicOff className="w-4 h-4 text-secondary" />}
          </div>
          <div>
            <div className="font-semibold text-sm flex items-center gap-1">
              <AudioWaveform className="w-3.5 h-3.5" /> Sound Shield
            </div>
            <div className="text-xs text-muted-foreground">Auto-SOS on crash/scream</div>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>
      {enabled && (
        <div className="h-2 bg-accent rounded-full overflow-hidden mt-3">
          <div
            className={`h-full transition-all ${level > threshold ? "bg-primary" : "bg-secondary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
};
