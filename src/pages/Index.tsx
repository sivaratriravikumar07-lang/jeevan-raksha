import { Link } from "react-router-dom";
import { Shield, Zap, MapPin, Mic, Bell, Users, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { LANGUAGES, useLanguage, type LangCode } from "@/hooks/useLanguage";

const featureIcons = [Zap, MapPin, Mic, Bell, Users, Shield];

const Index = () => {
  const { t, lang, setLang } = useLanguage();
  const features = featureIcons.map((icon, i) => ({ icon, title: t(`index.f${i + 1}t`), desc: t(`index.f${i + 1}d`) }));
  const stats = [
    { value: "15s", label: t("index.stat1") },
    { value: "24/7", label: t("index.stat2") },
    { value: "100+", label: t("index.stat3") },
  ];
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container flex items-center justify-between gap-2 h-16 min-w-0">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <Logo className="w-9 h-9 shrink-0" />
            <span className="font-bold text-base sm:text-lg tracking-tight truncate">Jeevan Raksha</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <select aria-label="Language" value={lang} onChange={(e) => setLang(e.target.value as LangCode)} className="h-8 rounded-md border border-border bg-background text-xs px-1">
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.native}</option>)}
            </select>
            <Link to="/auth"><Button variant="ghost" size="sm" className="px-2 sm:px-3">{t("common.login")}</Button></Link>
            <Link to="/auth?mode=signup"><Button size="sm" className="px-3 bg-gradient-emergency shadow-emergency">{t("common.signUp")}</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero — dark editorial band */}
      <section className="relative overflow-hidden bg-foreground text-background">
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(to right, hsl(var(--background)/0.35) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--background)/0.35) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="absolute -top-24 -left-20 w-72 h-72 rounded-full bg-gradient-emergency opacity-40 blur-[90px]" />
        <div className="absolute -bottom-28 -right-16 w-80 h-80 rounded-full bg-gradient-trust opacity-40 blur-[100px]" />

        <div className="container relative py-12 md:py-20">
          <div className="grid md:grid-cols-[1.05fr_0.95fr] gap-10 md:gap-8 items-center">
            <div className="space-y-6 order-2 md:order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-background/25 text-[11px] font-semibold uppercase tracking-[0.18em]">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> {t("index.badge")}
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.02]">
                {t("index.heroA")}
                <span className="text-gradient-emergency"> {t("index.heroB")}</span>
                <br />
                {t("index.heroC")}
                <span className="text-gradient-trust"> {t("index.heroD")}</span>
              </h1>

              <p className="text-base sm:text-lg text-background/70 max-w-md">
                {t("index.sub")}
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/auth?mode=signup" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-emergency shadow-emergency text-base h-12 px-8">
                    <AlertTriangle className="w-5 h-5 mr-2" /> {t("index.cta")}
                  </Button>
                </Link>
                <Link to="/auth" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 bg-transparent border-background/30 text-background hover:bg-background/10 hover:text-background">
                    {t("common.signIn")}
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-background/15 max-w-md">
                {stats.map((s) => (
                  <div key={s.label}>
                    <div className="text-2xl font-extrabold">{s.value}</div>
                    <div className="text-[11px] uppercase tracking-wider text-background/55 leading-tight">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Brand mark */}
            <div className="order-1 md:order-2 flex justify-center mark-3d-scene">
              <div className="relative mark-3d">
                <div className="absolute -inset-10 rounded-full blur-3xl mark-3d-plate" />
                <div className="absolute -inset-6 bg-gradient-hero rounded-full opacity-25 blur-3xl" />
                <div className="absolute -inset-3 rounded-[3rem] border border-background/15" />
                <div className="absolute -inset-1 rounded-[2.6rem] bg-gradient-to-b from-background/20 to-transparent opacity-60" />
                <img
                  src="/jeevan-raksha-logo.png"
                  alt="Jeevan Raksha emblem — emergency response for women and elders"
                  className="relative w-56 h-56 sm:w-72 sm:h-72 md:w-[22rem] md:h-[22rem] object-contain rounded-[2.5rem] ring-1 ring-background/20 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.7),inset_0_1px_0_hsl(var(--background)/0.25)]"
                />
                <div className="pointer-events-none absolute inset-0 rounded-[2.5rem] bg-[linear-gradient(115deg,hsl(var(--background)/0.28)_0%,transparent_38%,transparent_62%,hsl(var(--background)/0.12)_100%)]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features — numbered editorial list */}
      <section className="container py-16 md:py-24">
        <div className="max-w-2xl mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">{t("index.featuresEyebrow")}</p>
          <h2 className="text-3xl md:text-5xl font-bold leading-tight">{t("index.featuresTitle")}</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-3xl overflow-hidden border border-border">
          {features.map((f, i) => (
            <div key={f.title} className="group relative bg-card p-7 hover:bg-accent/50 transition-colors">
              <span className="absolute top-6 right-6 text-xs font-mono text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <f.icon className="w-6 h-6 text-primary mb-5" />
              <h3 className="font-bold text-lg mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-trust p-8 md:p-14 shadow-trust">
          <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative max-w-xl">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-foreground mb-3">{t("index.ctaTitle")}</h2>
            <p className="text-secondary-foreground/85 mb-7">{t("index.ctaSub")}</p>
            <Link to="/auth?mode=signup">
              <Button size="lg" variant="secondary" className="h-12 px-8 bg-background text-foreground hover:bg-background/90">
                {t("index.ctaBtn")} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground space-y-2">
        <div className="flex items-center justify-center gap-4">
          <Link to="/download" className="hover:text-foreground transition-colors">{t("index.download")}</Link>
          <span>·</span>
          <Link to="/safety-tips" className="hover:text-foreground transition-colors">{t("index.safetyTips")}</Link>
          <span>·</span>
          <Link to="/auth?mode=signup" className="hover:text-foreground transition-colors">{t("common.signUp")}</Link>
        </div>
        <div>{t("index.rights")}</div>
        <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
      </footer>
    </div>
  );
};

export default Index;

