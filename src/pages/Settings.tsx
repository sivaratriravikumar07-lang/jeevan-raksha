import { Link } from "react-router-dom";
import { ArrowLeft, Check, Globe, Info, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { LANGUAGES, useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";

const Settings = () => {
  const { lang, setLang, t, deviceLang, suggestionDismissed, dismissSuggestion } = useLanguage();
  const suggested = deviceLang && deviceLang !== "en" && deviceLang !== lang && !suggestionDismissed
    ? LANGUAGES.find((l) => l.code === deviceLang)
    : null;
  const current = LANGUAGES.find((l) => l.code === lang);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm opacity-90 mb-3">
            <ArrowLeft className="w-4 h-4" /> {t("common.back")}
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="w-6 h-6" /> {t("settings.title")}
          </h1>
          <p className="text-sm opacity-80 mt-1">{t("settings.sub")}</p>
        </div>
      </header>

      <main className="container py-6 space-y-5">
        {suggested && (
          <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-3">
            <p className="font-semibold">{t("settings.suggestTitle", { lang: suggested.native })}</p>
            <p className="text-sm text-muted-foreground">{t("settings.suggestBody", { lang: suggested.native })}</p>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-gradient-emergency shadow-emergency"
                onClick={() => {
                  setLang(suggested.code);
                  dismissSuggestion();
                  toast.success(t("settings.changed", { lang: suggested.native }));
                }}
              >
                {t("settings.suggestYes", { lang: suggested.native })}
              </Button>
              <Button variant="outline" className="flex-1" onClick={dismissSuggestion}>
                {t("settings.suggestNo")}
              </Button>
            </div>
          </div>
        )}

        <section className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="p-5 pb-3">
            <h2 className="font-bold flex items-center gap-2"><Globe className="w-5 h-5 text-primary" /> {t("settings.languageTitle")}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t("settings.languageSub")}</p>
          </div>
          <ul className="divide-y divide-border">
            {LANGUAGES.map((l) => (
              <li key={l.code}>
                <button
                  type="button"
                  onClick={() => {
                    if (l.code === lang) return;
                    setLang(l.code);
                    toast.success(t("settings.changed", { lang: l.native }));
                  }}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/60 transition-colors"
                  aria-current={l.code === lang}
                >
                  <span>
                    <span className="block font-semibold text-base">{l.native}</span>
                    <span className="block text-xs text-muted-foreground">{l.label}</span>
                  </span>
                  {l.code === lang && <Check className="w-5 h-5 text-primary shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
          <div className="px-5 py-3 border-t border-border text-xs text-muted-foreground">
            {t("settings.current")}: <span className="text-foreground font-semibold">{current?.native}</span>
          </div>
        </section>

        <p className="flex gap-2 text-xs text-muted-foreground bg-muted/50 border border-border rounded-xl p-4">
          <Info className="w-4 h-4 shrink-0 mt-0.5" /> {t("settings.note")}
        </p>
      </main>

      <BottomNav />
    </div>
  );
};

export default Settings;
