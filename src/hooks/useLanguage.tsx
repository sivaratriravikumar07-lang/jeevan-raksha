import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en from "@/i18n/en.json";
import te from "@/i18n/te.json";
import hi from "@/i18n/hi.json";
import { supabase } from "@/integrations/supabase/client";

export type LangCode = "en" | "te" | "hi";

export const LANGUAGES: { code: LangCode; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
];

const DICTS: Record<LangCode, Record<string, unknown>> = { en, te, hi } as never;
const STORAGE_KEY = "jr_lang";
const SUGGEST_KEY = "jr_lang_suggested";

function lookup(dict: Record<string, unknown>, path: string): string | undefined {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, dict);
  return typeof value === "string" ? value : undefined;
}

interface LanguageCtx {
  lang: LangCode;
  setLang: (code: LangCode) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  deviceLang: LangCode | null;
  suggestionDismissed: boolean;
  dismissSuggestion: () => void;
}

const Ctx = createContext<LanguageCtx | undefined>(undefined);

function detectDeviceLang(): LangCode | null {
  if (typeof navigator === "undefined") return null;
  const codes = [navigator.language, ...(navigator.languages ?? [])].filter(Boolean);
  for (const c of codes) {
    const base = c.toLowerCase().split("-")[0];
    if (base === "te" || base === "hi" || base === "en") return base as LangCode;
  }
  return null;
}

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<LangCode>(() => {
    if (typeof localStorage === "undefined") return "en";
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "te" || saved === "hi" || saved === "en" ? saved : "en";
  });
  const [suggestionDismissed, setSuggestionDismissed] = useState<boolean>(
    () => typeof localStorage !== "undefined" && localStorage.getItem(SUGGEST_KEY) === "1"
  );
  const deviceLang = useMemo(detectDeviceLang, []);

  // Load saved preference from the user's account (does not block anything).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user || cancelled) return;
      const { data } = await supabase
        .from("profiles")
        .select("preferred_language")
        .eq("id", auth.user.id)
        .maybeSingle();
      const pref = data?.preferred_language;
      if (!cancelled && (pref === "en" || pref === "te" || pref === "hi")) {
        setLangState(pref);
        localStorage.setItem(STORAGE_KEY, pref);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((code: LangCode) => {
    setLangState(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        await supabase.from("profiles").update({ preferred_language: code }).eq("id", auth.user.id);
      }
    })();
  }, []);

  const dismissSuggestion = useCallback(() => {
    setSuggestionDismissed(true);
    try { localStorage.setItem(SUGGEST_KEY, "1"); } catch { /* ignore */ }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const raw = lookup(DICTS[lang], key) ?? lookup(DICTS.en, key) ?? key;
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
    },
    [lang]
  );

  const value = useMemo(
    () => ({ lang, setLang, t, deviceLang, suggestionDismissed, dismissSuggestion }),
    [lang, setLang, t, deviceLang, suggestionDismissed, dismissSuggestion]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useLanguage = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
