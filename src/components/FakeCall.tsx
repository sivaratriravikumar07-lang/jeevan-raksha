import { useEffect, useState } from "react";
import { Phone, PhoneOff, User } from "lucide-react";

interface Props {
  callerName?: string;
  callerNumber?: string;
  onEnd?: () => void;
}

export const FakeCall = ({ callerName = "Dad", callerNumber = "+91 98XXX XXXXX", onEnd }: Props) => {
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState<"incoming" | "ongoing" | "ended">("incoming");

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (status === "incoming") setStatus("ongoing");
    }, 5000);
    return () => clearTimeout(t);
  }, [status]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  if (status === "ended") {
    return (
      <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center text-center p-6">
        <p className="text-white text-lg font-semibold">Call Ended</p>
        <p className="text-white/70 text-sm mt-2">Duration {formatTime(seconds)}</p>
        <button onClick={onEnd} className="mt-6 px-6 py-2 rounded-full bg-white/10 text-white text-sm">Close</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-between py-12 px-6 animate-in fade-in duration-300">
      <div className="text-center space-y-2">
        <p className="text-white/70 text-sm uppercase tracking-wider">{status === "incoming" ? "Incoming Call" : "Ongoing Call"}</p>
        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto">
          <User className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white">{callerName}</h2>
        <p className="text-white/60 text-sm">{callerNumber}</p>
      </div>

      <div className="text-white/80 text-2xl font-mono tabular-nums">{formatTime(seconds)}</div>

      <div className="flex gap-6">
        {status === "incoming" && (
          <button
            onClick={() => setStatus("ongoing")}
            className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <Phone className="w-7 h-7 text-white" />
          </button>
        )}
        <button
          onClick={() => { setStatus("ended"); onEnd?.(); }}
          className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          <PhoneOff className="w-7 h-7 text-white" />
        </button>
      </div>
    </div>
  );
};
