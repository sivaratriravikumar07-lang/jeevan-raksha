import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, BatteryCharging, Mic, ShieldCheck, Smartphone, Radio, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { runSosWorkflow } from "@/lib/sosWorkflow";
import { VoiceGuard, isVoiceGuardNative, type VoiceGuardStatus } from "@/lib/voiceGuard";

const PHRASES = ["Help Me", "Help", "Save Me", "Emergency", "Jeevan Raksha", "Jeevan Raksha Help"];

const Chip = ({ label, value, ok }: { label: string; value: string; ok: boolean }) => (
  <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span
      className={`text-[11px] font-semibold uppercase tracking-wide ${ok ? "text-secondary" : "text-primary"}`}
    >
      {value}
    </span>
  </div>
);

const VoiceProtection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<VoiceGuardStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastPhrase, setLastPhrase] = useState<string | null>(null);
  const native = isVoiceGuardNative();
  const userRef = useRef(user);
  userRef.current = user;

  const refresh = useCallback(async () => {
    try {
      setStatus(await VoiceGuard.getStatus());
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (!native) return;
    const handles: { remove: () => void }[] = [];

    VoiceGuard.addListener("voiceGuardState", () => refresh()).then((h) => handles.push(h));
    VoiceGuard.addListener("voiceEmergency", async ({ phrase }) => {
      setLastPhrase(phrase);
      toast.error(`Voice command "${phrase}" detected — sending SOS with live location…`);
      const u = userRef.current;
      if (!u) {
        toast.warning("Sign in cheyandi — alert pampadaniki account kavali.");
        return;
      }
      await runSosWorkflow(u.id, { type: "voice", callNumber: "112" });
    }).then((h) => handles.push(h));

    const onVisible = () => refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      handles.forEach((h) => h.remove());
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [native, refresh]);

  const toggle = async (on: boolean) => {
    if (!native) {
      toast.info("Voice Protection Mode Android app lo matrame pani chestundi. Download page nunchi app install cheyandi.");
      return;
    }
    setBusy(true);
    try {
      const res = on ? await VoiceGuard.start() : await VoiceGuard.stop();
      setStatus(res);
      if (on && res.error === "microphone_denied") {
        toast.error("Microphone permission ivvandi — lekapothe voice monitoring start avvadhu.");
      } else if (on && res.serviceActive) {
        toast.success("Voice Protection Mode ON — 'Jeevan Raksha Safety Protection Active' notification chudandi.");
      } else if (!on) {
        toast.info("Voice Protection Mode OFF — microphone release ayindi.");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const active = !!status?.serviceActive;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-5">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-secondary-foreground hover:bg-background/20">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Voice Protection Mode</h1>
              <p className="text-xs opacity-80">Native Android emergency voice monitoring</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container -mt-5 space-y-4">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-elevated">
          <div className="flex items-start gap-4">
            <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${active ? "bg-primary/15 animate-pulse" : "bg-muted"}`}>
              <Mic className={`w-6 h-6 ${active ? "text-primary" : "text-muted-foreground"}`} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{active ? "Protection Active" : "Protection Off"}</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {active
                  ? "Emergency voice commands monitor avutunnayi. Notification lo status kanipistundi."
                  : "Toggle ON cheste native Android foreground service start avutundi."}
              </p>
            </div>
            <Switch checked={active} disabled={busy} onCheckedChange={toggle} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Chip label="Voice Mode" value={active ? "ON" : "OFF"} ok={active} />
          <Chip label="Service" value={active ? "RUNNING" : "STOPPED"} ok={active} />
          <Chip label="Microphone" value={status?.microphone ?? "unknown"} ok={status?.microphone === "granted"} />
          <Chip label="Notifications" value={status?.notifications ?? "unknown"} ok={status?.notifications === "granted"} />
          <Chip label="Speech engine" value={status?.recognitionAvailable ? "ready" : native ? "missing" : "n/a"} ok={!!status?.recognitionAvailable} />
          <Chip label="Battery" value={status?.batteryUnrestricted ? "unrestricted" : "restricted"} ok={!!status?.batteryUnrestricted} />
        </div>

        {lastPhrase && (
          <div className="rounded-2xl border border-primary/40 bg-primary/10 p-3 text-sm">
            Last detected command: <span className="font-semibold">"{lastPhrase}"</span>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Radio className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Emergency commands</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {PHRASES.map((p) => (
              <span key={p} className="rounded-full border border-border bg-muted px-3 py-1 text-xs">"{p}"</span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Detect ayithe: GPS location → Google Maps link → emergency contacts ki alert SMS → 112 call → emergency notification.
            Idhe workflow SOS button and Volume 3x kuda vadutundi.
          </p>
        </div>

        {!status?.batteryUnrestricted && native && (
          <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm space-y-3">
            <div className="flex gap-2">
              <BatteryCharging className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p>
                Battery optimization valla background lo service stop avvachu. "Unrestricted" battery usage allow cheyandi.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => VoiceGuard.openBatterySettings()}>
              Allow unrestricted battery
            </Button>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground space-y-2">
          <div className="flex items-center gap-2 text-foreground text-sm font-semibold">
            <ShieldCheck className="w-4 h-4 text-secondary" /> Privacy
          </div>
          <p>Audio on-device lo matrame process avutundi. Mee voice record avvadhu, store avvadhu, upload avvadhu.</p>
          <div className="flex items-center gap-2 text-foreground text-sm font-semibold pt-2">
            <AlertTriangle className="w-4 h-4 text-warning" /> Android limits
          </div>
          <p>
            Screen-off / background detection Android version and phone brand battery rules meeda aadhaarapadi untundi —
            anni phones lo continuous ga pani chestundi ani guarantee ivvalemu.
          </p>
        </div>

        {!native && (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm flex gap-2">
            <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
            <p className="text-muted-foreground">
              Browser lo ee native feature run avvadhu. Android app install chesaka ikkade toggle cheyandi.
              Website lo unna Voice SOS (mic) yatha vidhi ga pani chestundi.
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default VoiceProtection;
