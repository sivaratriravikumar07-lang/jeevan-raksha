import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  Check,
  X,
  ExternalLink,
  Zap,
  Loader2,
  MapPin,
  Mic,
  Camera,
  Bell,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import {
  PERMISSIONS,
  isEmbedded,
  openInFullTab,
  readAllPermissions,
  requestPermission,
  requestAllPermissions,
  watchPermissions,
  type PermKey,
  type PermState,
} from "@/lib/permissions";

const ICONS: Record<PermKey, typeof MapPin> = {
  location: MapPin,
  microphone: Mic,
  camera: Camera,
  notifications: Bell,
  motion: Activity,
};

const badge = (s: PermState) => {
  switch (s) {
    case "granted":
      return { text: "LIVE", cls: "bg-secondary/20 text-secondary border-secondary/40" };
    case "denied":
      return { text: "BLOCKED", cls: "bg-primary/20 text-primary border-primary/40" };
    case "frame-blocked":
      return { text: "PREVIEW BLOCK", cls: "bg-primary/20 text-primary border-primary/40" };
    case "unsupported":
      return { text: "N/A", cls: "bg-muted text-muted-foreground border-border" };
    default:
      return { text: "IDLE", cls: "bg-muted text-muted-foreground border-border" };
  }
};

const Permissions = () => {
  const navigate = useNavigate();
  const [states, setStates] = useState<Partial<Record<PermKey, PermState>>>({});
  const [busy, setBusy] = useState<PermKey | "all" | null>(null);

  const refresh = useCallback(async () => setStates(await readAllPermissions()), []);

  useEffect(() => {
    refresh();
    return watchPermissions(refresh);
  }, [refresh]);

  const handleResult = (s: PermState) => {
    if (s === "granted") toast.success("Access allowed");
    else if (s === "frame-blocked")
      toast.error("Preview window block chestundi — full tab lo open cheyandi");
    else if (s === "unsupported") toast.info("Ee browser lo support ledu");
    else toast.error("Blocked — browser settings lo allow cheyandi");
  };

  const askOne = async (key: PermKey) => {
    setBusy(key);
    const s = await requestPermission(key);
    setStates((p) => ({ ...p, [key]: s }));
    setBusy(null);
    handleResult(s);
  };

  const askAll = async () => {
    setBusy("all");
    const res = await requestAllPermissions((key, state) => setStates((p) => ({ ...p, [key]: state })));
    setBusy(null);
    const ok = Object.values(res).filter((s) => s === "granted").length;
    toast[ok === PERMISSIONS.length ? "success" : "info"](`${ok}/${PERMISSIONS.length} permissions active`);
  };

  const grantedCount = PERMISSIONS.filter((p) => states[p.key] === "granted").length;
  const pct = Math.round((grantedCount / PERMISSIONS.length) * 100);
  const frameBlocked = PERMISSIONS.some((p) => states[p.key] === "frame-blocked");
  const ring = 2 * Math.PI * 52;

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Console header */}
      <header className="relative overflow-hidden border-b border-border bg-card">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="container relative py-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl border border-border flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.25em] text-muted-foreground font-bold">SYSTEM ACCESS</p>
              <h1 className="text-xl font-bold leading-tight flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-secondary" /> Access Console
              </h1>
            </div>
          </div>

          {/* Radial status */}
          <div className="mt-5 flex items-center gap-5">
            <div className="relative w-[124px] h-[124px] shrink-0">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke={pct === 100 ? "hsl(var(--secondary))" : "hsl(var(--primary))"}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={ring}
                  strokeDashoffset={ring - (ring * pct) / 100}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold tabular-nums">{pct}%</span>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {grantedCount}/{PERMISSIONS.length} ACTIVE
                </span>
              </div>
            </div>
            <div className="min-w-0 space-y-3">
              <p className="text-xs text-muted-foreground">
                Anni sensors active ayithe SOS, sound detection, evidence capture real-time ga pani chestai.
              </p>
              <Button onClick={askAll} disabled={busy !== null} className="w-full">
                {busy === "all" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Activate all
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-5 space-y-3">
        {(frameBlocked || isEmbedded()) && (
          <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4">
            <p className="text-sm font-bold flex items-center gap-2 text-primary">
              <AlertTriangle className="w-4 h-4" /> Preview window camera & notifications block chestundi
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Ee preview frame lo browser camera/notification prompts ivvadu. App ni sonta tab lo open cheste anni
              permissions correct ga adugutundi.
            </p>
            <Button onClick={openInFullTab} className="w-full mt-3" variant="secondary">
              <ExternalLink className="w-4 h-4 mr-2" /> Open in full tab
            </Button>
          </div>
        )}

        {PERMISSIONS.map((p, i) => {
          const s = states[p.key] ?? "unknown";
          const b = badge(s);
          const Icon = ICONS[p.key];
          const ok = s === "granted";
          return (
            <div
              key={p.key}
              className={`relative rounded-2xl border bg-card p-4 pl-5 overflow-hidden ${
                ok ? "border-secondary/40" : "border-border"
              }`}
            >
              <span
                className={`absolute left-0 top-0 bottom-0 w-1 ${ok ? "bg-secondary" : "bg-muted"}`}
                aria-hidden
              />
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    ok ? "bg-secondary/15 text-secondary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold">{p.label}</p>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wider border ${b.cls}`}
                    >
                      {b.text}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.why}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono">
                    MODULE {String(i + 1).padStart(2, "0")}
                  </p>
                </div>
                {ok ? (
                  <div className="w-9 h-9 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-secondary" />
                  </div>
                ) : s === "unsupported" ? (
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </div>
                ) : s === "frame-blocked" ? (
                  <Button size="sm" variant="outline" onClick={openInFullTab} className="shrink-0">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy !== null}
                    onClick={() => askOne(p.key)}
                    className="shrink-0"
                  >
                    {busy === p.key ? <Loader2 className="w-4 h-4 animate-spin" /> : "Allow"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        <p className="text-[11px] text-muted-foreground text-center px-4 pt-1">
          Mee data mee device lo &amp; mee secure account lone untundi. Blocked ayithe address bar lock icon → Site
          settings nunchi Camera / Notifications allow cheyandi.
        </p>
      </main>
      <BottomNav />
    </div>
  );
};

export default Permissions;
