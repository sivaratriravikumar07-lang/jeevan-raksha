import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onTrigger: () => void;
}

const TRIGGER_PHRASES = ["help me", "help", "save me", "bachao", "bachaoo", "emergency", "sos"];

export const VoiceActivation = ({ onTrigger }: Props) => {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const listeningRef = useRef(false);
  const onTriggerRef = useRef(onTrigger);

  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
        if (event.results[i].isFinal) {
          for (const phrase of TRIGGER_PHRASES) {
            if (transcript.includes(phrase)) {
              toast.error("Voice trigger detected! Activating SOS...");
              listeningRef.current = false;
              setListening(false);
              try { recognition.stop(); } catch {}
              onTriggerRef.current();
              return;
            }
          }
        }
      }
    };

    recognition.onerror = (e: any) => {
      console.log("SpeechRecognition error:", e.error);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        toast.error("Microphone permission denied. Open the app in a browser tab and allow mic access.");
        listeningRef.current = false;
        setListening(false);
      } else if (e.error === "no-speech" || e.error === "aborted" || e.error === "network") {
        // ignore, will restart in onend
      } else {
        toast.error(`Voice error: ${e.error}`);
      }
    };

    recognition.onend = () => {
      if (listeningRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;

    return () => {
      listeningRef.current = false;
      try { recognition.stop(); } catch {}
    };
  }, []);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current) return;
    try {
      // Request mic permission explicitly so error is clear
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      toast.error("Mic access denied. Please allow microphone permission.");
      return;
    }
    try {
      listeningRef.current = true;
      recognitionRef.current.start();
      setListening(true);
      toast.info("Voice listening active. Say 'Help Me' to trigger SOS.");
    } catch (err) {
      console.log("start error", err);
    }
  }, []);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    try { recognitionRef.current?.stop(); } catch {}
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

  return (
    <button
      onClick={() => {
        if (listening) stopListening();
        else startListening();
      }}
      className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all w-full ${
        listening
          ? "bg-primary text-primary-foreground border-primary shadow-emergency animate-pulse"
          : "bg-card text-foreground border-border hover:shadow-card"
      }`}
    >
      {listening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5 text-muted-foreground" />}
      <div className="text-left">
        <div className="text-sm font-semibold">{listening ? "Listening..." : "Voice SOS"}</div>
        <div className="text-xs opacity-80">
          {listening ? "Say 'Help Me' to alert" : "Tap to enable voice trigger"}
        </div>
      </div>
    </button>
  );
};
