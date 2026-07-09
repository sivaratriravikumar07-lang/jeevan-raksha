import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, AudioWaveform, ExternalLink, Mic, MicOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getMicAccessErrorMessage,
  getMicPermissionStatus,
  isEmbeddedFrame,
  MicPermissionStatus,
  openCurrentPageInFullTab,
  requestMicrophoneStream,
  watchMicPermission,
} from "@/lib/microphone";

interface Props { onDetect: () => void; threshold?: number }

/**
 * Listens to the mic and triggers `onDetect` when a sustained loud sound (crash / scream)
 * is detected. Uses Web Audio AnalyserNode (no recording / upload).
 */
export const SoundDetector = ({ onDetect, threshold = 0.18 }: Props) => {
  const [enabled, setEnabled] = useState(false);
  const [starting, setStarting] = useState(false);
  const [level, setLevel] = useState(0);
  const [micPermission, setMicPermission] = useState<MicPermissionStatus>("unknown");
  const [micError, setMicError] = useState("");
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTriggerRef = useRef(0);
  const loudStartRef = useRef<number | null>(null);
  const onDetectRef = useRef(onDetect);

  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  useEffect(() => watchMicPermission(setMicPermission), []);

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    loudStartRef.current = null;
    setLevel(0);
  };

  const start = async () => {
    if (streamRef.current) return;
    setStarting(true);
    setMicError("");
    try {
      const stream = await requestMicrophoneStream();
      streamRef.current = stream;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === "suspended") await ctx.resume();
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
          // Sustained loud (>180ms) and cooldown 10s
          if (now - loudStartRef.current > 180 && now - lastTriggerRef.current > 10000) {
            lastTriggerRef.current = now;
            loudStartRef.current = null;
            toast.error("Loud sound detected — triggering SOS!");
            onDetectRef.current();
          }
        } else {
          loudStartRef.current = null;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      setMicPermission(await getMicPermissionStatus());
      setEnabled(true);
      toast.success("Sound shield ON — mic is listening for crashes/screams.");
    } catch (err: any) {
      console.log("Sound shield mic error:", err);
      const message = getMicAccessErrorMessage(err);
      setMicError(message);
      setMicPermission(await getMicPermissionStatus());
      toast.error(message);
      setEnabled(false);
      stop();
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnabledChange = (checked: boolean) => {
    if (checked) start();
    else {
      setEnabled(false);
      stop();
    }
  };

  const pct = Math.min(100, Math.round(level * 350));
  const showMicHelp = micError || micPermission === "denied" || isEmbeddedFrame();

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
            <div className="text-xs text-muted-foreground">{starting ? "Starting mic..." : `Mic: ${micPermission}`}</div>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={handleEnabledChange} disabled={starting} />
      </div>
      {enabled && (
        <div className="h-2 bg-accent rounded-full overflow-hidden mt-3">
          <div
            className={`h-full transition-all ${level > threshold ? "bg-primary" : "bg-secondary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {showMicHelp && !enabled && (
        <div className="mt-3 rounded-2xl border border-warning/40 bg-warning/10 p-3 text-sm">
          <div className="flex gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div className="space-y-3">
              <p className="text-foreground">
                {micError || "Preview iframe lo mic block avvachu. Full browser tab lo open chesi Allow cheyyandi."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={openCurrentPageInFullTab}>
                  <ExternalLink className="h-4 w-4" /> Open Full Tab
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/mic-test">Mic Test</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
