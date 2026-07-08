import { useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onTrigger: () => void;
  holdSeconds?: number;
}

/**
 * Animated SOS button with a 5-second confirmation countdown to prevent
 * accidental / fake SOS. User can tap again (or the cancel button) to abort.
 */
export const SOSButton = ({ onTrigger, holdSeconds = 5 }: Props) => {
  const [counting, setCounting] = useState(false);
  const [remaining, setRemaining] = useState(holdSeconds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => () => clear(), []);

  const start = () => {
    if (counting) return;
    setCounting(true);
    setRemaining(holdSeconds);
    if ("vibrate" in navigator) navigator.vibrate(80);
    toast.warning(`Sending SOS in ${holdSeconds}s — tap Cancel if safe`);
    timerRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clear();
          setCounting(false);
          onTrigger();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  };

  const cancel = () => {
    clear();
    setCounting(false);
    setRemaining(holdSeconds);
    toast.success("SOS cancelled — stay safe");
  };

  const progress = ((holdSeconds - remaining) / holdSeconds) * 100;

  return (
    <div className="relative w-44 h-44 mx-auto">
      {counting && (
        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
          <circle
            cx="50" cy="50" r="46" fill="none"
            stroke="hsl(var(--primary))" strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 46}
            strokeDashoffset={2 * Math.PI * 46 * (1 - progress / 100)}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
      )}
      <button
        onClick={counting ? cancel : start}
        className={`relative w-44 h-44 rounded-full bg-gradient-emergency shadow-emergency mx-auto active:scale-95 transition-transform ${counting ? "" : "animate-sos-pulse"}`}
        aria-label={counting ? "Cancel SOS" : "Trigger SOS"}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center text-primary-foreground">
          {counting ? (
            <>
              <X className="w-8 h-8 mb-1" />
              <span className="text-4xl font-extrabold">{remaining}</span>
              <span className="text-[10px] uppercase tracking-wider opacity-90 mt-0.5">Tap to cancel</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-10 h-10 mb-1" />
              <span className="text-3xl font-extrabold tracking-wider">SOS</span>
              <span className="text-xs opacity-90 mt-0.5">Tap to alert</span>
            </>
          )}
        </div>
      </button>
    </div>
  );
};
