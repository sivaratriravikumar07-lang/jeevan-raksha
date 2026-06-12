import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onTrigger: () => void;
}

const TRIGGER_PHRASES = ["help me", "help", "save me", "bachao", "bachaoo"];

export const VoiceActivation = ({ onTrigger }: Props) => {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startListening = useCallback(() => {
    if (! recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setListening(true);
      toast.info("Voice listening active. Say 'Help Me' to trigger SOS.");
    } catch {
      // Already started
    }
  }, []);

  const stopListening = useCallback(() => {
    if (! recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {}
    setListening(false);
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
              stopListening();
              onTrigger();
              return;
            }
          }
        }
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === "not-allowed") {
        toast.error("Microphone permission denied.");
        setListening(false);
      }
    };

    recognition.onend = () => {
      if (listening) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;

    return () => {
      stopListening();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [onTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!supported) return null;

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
        <div className="text-xs opacity-80">{listening ? "Say 'Help Me' to alert" : "Tap to enable voice trigger"}</div>
      </div>
    </button>
  );
};
