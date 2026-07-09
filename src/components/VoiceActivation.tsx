import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ExternalLink, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getMicAccessErrorMessage,
  getMicPermissionStatus,
  getSpeechRecognitionCtor,
  isEmbeddedFrame,
  MicPermissionStatus,
  openCurrentPageInFullTab,
  requestMicrophoneStream,
  stopMediaStream,
  watchMicPermission,
} from "@/lib/microphone";

interface Props {
  onTrigger: () => void;
}

const TRIGGER_PHRASES = [
  "help me",
  "help",
  "save me",
  "bachao",
  "bachaoo",
  "emergency",
  "sos",
  "sahayam",
  "kapadandi",
  "rakshinchandi",
  "help cheyandi",
  "save cheyandi",
];

export const VoiceActivation = ({ onTrigger }: Props) => {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [starting, setStarting] = useState(false);
  const [micPermission, setMicPermission] = useState<MicPermissionStatus>("unknown");
  const [micError, setMicError] = useState("");
  const recognitionRef = useRef<any>(null);
  const listeningRef = useRef(false);
  const onTriggerRef = useRef(onTrigger);
  const lastTriggerRef = useRef(0);

  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  useEffect(() => watchMicPermission(setMicPermission), []);

  useEffect(() => {
    const SpeechRecognition = getSpeechRecognitionCtor();
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        for (const phrase of TRIGGER_PHRASES) {
          if (transcript.includes(phrase) && Date.now() - lastTriggerRef.current > 3000) {
            lastTriggerRef.current = Date.now();
            toast.error("Voice trigger detected! Activating SOS...");
            listeningRef.current = false;
            setListening(false);
            try {
              recognition.stop();
            } catch {}
            onTriggerRef.current();
            return;
          }
        }
      }
    };

    recognition.onerror = (e: any) => {
      console.log("SpeechRecognition error:", e.error);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        const message = getMicAccessErrorMessage({ name: "NotAllowedError" });
        setMicError(message);
        setMicPermission("denied");
        toast.error(message);
        listeningRef.current = false;
        setListening(false);
      } else if (e.error === "no-speech" || e.error === "aborted" || e.error === "network") {
        // Harmless in continuous speech recognition; onend restarts if still active.
      } else {
        toast.error(`Voice error: ${e.error}`);
      }
    };

    recognition.onend = () => {
      if (listeningRef.current) {
        try {
          recognition.start();
        } catch {}
      }
    };

    recognitionRef.current = recognition;

    return () => {
      listeningRef.current = false;
      try {
        recognition.stop();
      } catch {}
    };
  }, []);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current) return;
    setStarting(true);
    setMicError("");

    try {
      const stream = await requestMicrophoneStream();
      stopMediaStream(stream);
      setMicPermission(await getMicPermissionStatus());
    } catch (err) {
      const message = getMicAccessErrorMessage(err);
      setMicError(message);
      setMicPermission(await getMicPermissionStatus());
      toast.error(message);
      setStarting(false);
      return;
    }

    try {
      listeningRef.current = true;
      recognitionRef.current.start();
      setListening(true);
      toast.info("Voice listening active. Say 'Help Me' or 'SOS'.");
    } catch (err) {
      console.log("start error", err);
      const message = getMicAccessErrorMessage(err);
      setMicError(message);
      toast.error(message);
      listeningRef.current = false;
      setListening(false);
    } finally {
      setStarting(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {}
    setListening(false);
  }, []);

  if (!supported) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-border bg-card w-full">
        <MicOff className="w-5 h-5 text-muted-foreground" />
        <div className="text-left">
          <div className="text-sm font-semibold">Voice SOS unsupported</div>
          <div className="text-xs text-muted-foreground">Use Chrome/Edge browser</div>
        </div>
      </div>
    );
  }

  const showMicHelp = micError || micPermission === "denied" || isEmbeddedFrame();

  return (
    <div className="space-y-2">
      <button
        disabled={starting}
        onClick={() => {
          if (listening) stopListening();
          else startListening();
        }}
        className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all w-full disabled:opacity-60 ${
          listening
            ? "bg-primary text-primary-foreground border-primary shadow-emergency animate-pulse"
            : "bg-card text-foreground border-border hover:shadow-card"
        }`}
      >
        {listening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5 text-muted-foreground" />}
        <div className="text-left flex-1">
          <div className="text-sm font-semibold">{starting ? "Starting mic..." : listening ? "Listening..." : "Voice SOS"}</div>
          <div className="text-xs opacity-80">
            {listening ? "Say 'Help Me' / 'SOS'" : micPermission === "denied" ? "Mic blocked" : "Tap to enable voice trigger"}
          </div>
        </div>
        <span className="text-[10px] font-semibold uppercase opacity-80">{micPermission}</span>
      </button>

      {showMicHelp && (
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-3 text-sm">
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
