import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Check, X, ExternalLink, Zap, Loader2 } from "lucide-react";
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

const badge = (s: PermState) => {
  switch (s) {
    case "granted": return { text: "Allowed", cls: "bg-secondary/15 text-secondary" };
    case "denied": return { text: "Blocked", cls: "bg-primary/15 text-primary" };
    case "unsupported": return { text: "N/A", cls: "bg-muted text-muted-foreground" };
    default: return { text: "Not asked", cls: "bg-muted text-muted-foreground" };
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

  const askOne = async (key: PermKey) => {
    setBusy(key);
    const s = await requestPermission(key);
    setStates((p) => ({ ...p, [key]: s }));
    setBusy(null);
    if (s === "granted") toast.success("Access allowed");
    else toast.error("Blocked — browser settings lo allow cheyandi");
  };

  const askAll = async () => {
    setBusy("all");
    const res = await requestAllPermissions((key, state) => setStates((p) => ({ ...p, [key]: state })));
    setBusy(null);
    const ok = Object.values(res).filter((s) => s === "granted").length;
    toast[ok === PERMISSIONS.length ? "success" : "info"](
      `${ok}/${PERMISSIONS.length} permissions allowed`,
    );
  };

  const grantedCount = PERMISSIONS.filter((p) => states[p.key] === "granted").length;
  const pct = Math.round((grantedCount / PERMISSIONS.length) * 100);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-5 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-lg bg-background/20 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Full Access</h1>
            <p className="text-xs opacity-85">Anni features real-time ga pani cheyadaniki access ivvandi</p>
          </div>
        </div>
      </header>

      <main className="container py-5 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-5 text-center">
          <div className="text-3xl font-bold">{pct}%</div>
          <p className="text-xs text-muted-foreground mt-1">{grantedCount} of {PERMISSIONS.length} permissions active</p>
          <div className="h-2 rounded-full bg-muted mt-3 overflow-hidden">
            <div className="h-full bg-gradient-trust transition-all" style={{ width: `${pct}%` }} />
          </div>
          <Button onClick={askAll} disabled={busy !== null} className="w-full mt-4">
            {busy === "all" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
            Allow everything
          </Button>
          {isEmbedded() && (
            <button onClick={openInFullTab} className="text-[11px] font-semibold text-secondary underline mt-3 inline-flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Preview lo block ayithe full tab lo open cheyandi
            </button>
          )}
        </div>

        <div className="space-y-2">
          {PERMISSIONS.map((p) => {
            const s = states[p.key] ?? "unknown";
            const b = badge(s);
            return (
              <div key={p.key} className="bg-card border border-border rounded-2xl p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    {p.label}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${b.cls}`}>{b.text}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.why}</p>
                </div>
                {s === "granted" ? (
                  <div className="w-9 h-9 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-secondary" />
                  </div>
                ) : s === "unsupported" ? (
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </div>
                ) : (
                  <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => askOne(p.key)} className="shrink-0">
                    {busy === p.key ? <Loader2 className="w-4 h-4 animate-spin" /> : "Allow"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground text-center px-4">
          Mee data mee device lo &amp; mee secure account lone untundi. Blocked ayithe browser address bar lo lock icon → Site settings nunchi allow cheyandi.
        </p>
      </main>
      <BottomNav />
    </div>
  );
};

export default Permissions;
