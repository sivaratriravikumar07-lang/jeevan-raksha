import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Mic,
  MicOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";

type PermissionState = "prompt" | "granted" | "denied" | "unknown";

const MicTest = () => {
  const [permission, setPermission] = useState<PermissionState>("unknown");
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [lastSpoken, setLastSpoken] = useState("");

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // Read the persistent mic permission state from the browser.
  const queryPermission = useCallback(async () => {
    try {
      if (typeof navigator === "undefined" || !navigator.permissions) {
        setPermission("unknown");
        return;
      }
      const result = await navigator.permissions.query({ name: "microphone" as any });
      setPermission(result.state as PermissionState);
      result.addEventListener("change", () => setPermission(result.state as PermissionState));
    } catch {
      setPermission("unknown");
    }
  }, []);

  useEffect(() => {
    queryPermission();
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
  }, [queryPermission]);

  const stopAudio = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setLevel(0);
  }, []);

  const stopSpeech = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {}
  }, []);

  const startAudioMeter = useCallback(async () => {
    stopAudio();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    ctxRef.current = ctx;
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const sum = data.reduce((a, v) => a + v, 0);
      const avg = data.length ? sum / data.length : 0;
      const normalized = Math.min(100, Math.round((avg / 128) * 100));
      setLevel(normalized);
      setPeak((p) => Math.max(p, normalized));
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, [stopAudio]);

  const startSpeechTest = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    stopSpeech();
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.trim();
        if (event.results[i].isFinal) {
          setLastSpoken(transcript);
          toast.info(`Heard: "${transcript}"`);
        }
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        toast.error("Speech recognition permission denied.");
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, [stopSpeech]);

  const runTest = useCallback(async () => {
    setTesting(true);
    setPeak(0);
    setLastSpoken("");
    try {
      await startAudioMeter();
      await queryPermission();
      toast.success("Microphone access granted. Speak to see the meter move.");
      if (speechSupported) startSpeechTest();
    } catch (err: any) {
      console.error("Mic test failed:", err);
      await queryPermission();
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        toast.error("Microphone permission denied. Allow mic access in browser settings.");
      } else {
        toast.error(`Mic test failed: ${err?.message || "Unknown error"}`);
      }
    } finally {
      setTesting(false);
    }
  }, [queryPermission, speechSupported, startAudioMeter, startSpeechTest]);

  const stopTest = useCallback(() => {
    stopAudio();
    stopSpeech();
    setLevel(0);
    setPeak(0);
    toast.info("Mic test stopped.");
  }, [stopAudio, stopSpeech]);

  useEffect(() => {
    return () => {
      stopAudio();
      stopSpeech();
    };
  }, [stopAudio, stopSpeech]);

  const statusConfig: Record<PermissionState, { label: string; color: string; icon: any }> = {
    granted: {
      label: "Allowed",
      color: "text-success",
      icon: CheckCircle2,
    },
    denied: {
      label: "Blocked",
      color: "text-destructive",
      icon: XCircle,
    },
    prompt: {
      label: "Not asked yet",
      color: "text-warning",
      icon: AlertCircle,
    },
    unknown: {
      label: "Unknown",
      color: "text-muted-foreground",
      icon: AlertCircle,
    },
  };

  const StatusIcon = statusConfig[permission].icon;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm opacity-90 mb-3">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mic className="w-6 h-6" /> Mic Permission Test
          </h1>
          <p className="text-sm opacity-80 mt-1">
            Verify microphone access before using Voice SOS.
          </p>
        </div>
      </header>

      <main className="container py-6 space-y-5">
        {/* Permission status card */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Browser permission status
              </div>
              <div className={`text-lg font-bold flex items-center gap-2 ${statusConfig[permission].color}`}>
                <StatusIcon className="w-5 h-5" />
                {statusConfig[permission].label}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={queryPermission}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          <div className="h-px bg-border" />

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Voice recognition support</span>
              <span className={`font-semibold ${speechSupported ? "text-success" : "text-destructive"}`}>
                {speechSupported ? "Supported" : "Not supported"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Audio meter</span>
              <span className={`font-semibold ${streamRef.current ? "text-success" : "text-muted-foreground"}`}>
                {streamRef.current ? "Active" : "Idle"}
              </span>
            </div>
          </div>
        </div>

        {/* Live meter */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-secondary" /> Live input level
            </div>
            <div className="text-xs text-muted-foreground">Peak: {peak}%</div>
          </div>
          <div className="h-4 bg-accent rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-emergency transition-all duration-75"
              style={{ width: `${level}%` }}
            />
          </div>
          {lastSpoken && (
            <div className="text-sm bg-accent/50 rounded-xl p-3">
              <span className="text-muted-foreground">Last heard:</span>{" "}
              <span className="font-medium">"{lastSpoken}"</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={runTest}
            disabled={testing || streamRef.current !== null}
            className="h-12 bg-gradient-emergency shadow-emergency"
          >
            <Mic className="w-4 h-4 mr-2" />
            {testing ? "Testing..." : streamRef.current ? "Mic Active" : "Test Mic"}
          </Button>
          <Button
            onClick={stopTest}
            variant="outline"
            disabled={streamRef.current === null}
            className="h-12"
          >
            <MicOff className="w-4 h-4 mr-2" /> Stop
          </Button>
        </div>

        {/* Instructions */}
        <div className="bg-accent/40 border border-accent rounded-2xl p-4 space-y-3 text-sm">
          <p className="font-semibold text-foreground">How to fix mic issues</p>
          <ul className="space-y-2 text-muted-foreground list-disc pl-4">
            <li>Open this app in a full browser tab (not an iframe preview).</li>
            <li>Tap <strong>Test Mic</strong> and choose <strong>Allow</strong> when prompted.</li>
            <li>If blocked, go to browser settings → Site settings → Microphone → Allow.</li>
            <li>Use Chrome or Edge for best voice recognition support.</li>
            <li>iOS Safari supports speech recognition only while the page is active.</li>
          </ul>
        </div>

        {/* Voice SOS shortcut */}
        <Button
          variant="secondary"
          className="w-full h-12"
          onClick={() => window.history.back()}
        >
          Back to Dashboard
        </Button>
      </main>

      <BottomNav />
    </div>
  );
};

export default MicTest;
