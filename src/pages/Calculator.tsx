import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// Disguise Mode: looks like a calculator. Type SOS code (e.g. 911= or 100=) to trigger emergency.
const SECRET_CODES = ["911", "100", "1091"];

const Calculator = () => {
  const navigate = useNavigate();
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<string | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const holdRef = useRef<number | null>(null);

  const press = (v: string) => {
    if (SECRET_CODES.includes(display) && v === "=") {
      navigate("/emergency");
      return;
    }
    if (/[0-9.]/.test(v)) {
      setDisplay((d) => (d === "0" ? v : d + v));
    } else if (v === "C") {
      setDisplay("0"); setPrev(null); setOp(null);
    } else if (v === "=") {
      if (prev && op) {
        const a = parseFloat(prev), b = parseFloat(display);
        const r = op === "+" ? a + b : op === "-" ? a - b : op === "×" ? a * b : a / b;
        setDisplay(String(r)); setPrev(null); setOp(null);
      }
    } else {
      setPrev(display); setOp(v); setDisplay("0");
    }
  };

  // Long-press "=" to exit disguise
  const startHold = () => {
    holdRef.current = window.setTimeout(() => navigate("/dashboard"), 2000);
  };
  const endHold = () => {
    if (holdRef.current) { clearTimeout(holdRef.current); holdRef.current = null; }
  };

  useEffect(() => { document.title = "Calculator"; }, []);

  const keys = [
    ["C", "/", "×", "-"],
    ["7", "8", "9", "+"],
    ["4", "5", "6", ""],
    ["1", "2", "3", "="],
    ["0", ".", "", ""],
  ];

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col">
      <div className="flex-1 flex items-end justify-end p-6 text-5xl font-light break-all">{display}</div>
      <div className="grid grid-cols-4 gap-px bg-neutral-800">
        {keys.flat().map((k, i) => {
          if (!k) return <div key={i} className="bg-neutral-900" />;
          const isOp = /[+\-×/=]/.test(k);
          const isEq = k === "=";
          return (
            <button
              key={i}
              onClick={() => press(k)}
              onMouseDown={isEq ? startHold : undefined}
              onMouseUp={isEq ? endHold : undefined}
              onTouchStart={isEq ? startHold : undefined}
              onTouchEnd={isEq ? endHold : undefined}
              className={`py-6 text-2xl font-medium active:opacity-70 ${
                isOp ? "bg-orange-500" : "bg-neutral-700"
              }`}
            >
              {k}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-neutral-600 text-center py-2">v2.1</p>
    </div>
  );
};

export default Calculator;
