import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { HandHeart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVE_REQ_KEY, VOL_EVENT, STATUS_LABEL, isFinal } from "@/lib/volunteers";

export const ActiveVolunteerBanner = () => {
  const { pathname } = useLocation();
  const [id, setId] = useState<string | null>(() => localStorage.getItem(ACTIVE_REQ_KEY));
  const [status, setStatus] = useState<string>("searching");

  useEffect(() => {
    const h = () => setId(localStorage.getItem(ACTIVE_REQ_KEY));
    window.addEventListener(VOL_EVENT, h);
    return () => window.removeEventListener(VOL_EVENT, h);
  }, []);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    const load = async () => {
      const { data } = await (supabase as any).from("volunteer_requests").select("status, timeout_at").eq("id", id).maybeSingle();
      if (!alive) return;
      if (!data || isFinal(data.status, data.timeout_at)) {
        localStorage.removeItem(ACTIVE_REQ_KEY);
        setId(null);
        return;
      }
      setStatus(data.status);
    };
    load();
    const t = setInterval(load, 8000);
    return () => { alive = false; clearInterval(t); };
  }, [id]);

  if (!id || pathname.startsWith("/volunteer-help")) return null;
  return (
    <Link to={`/volunteer-help/${id}`}
      className="fixed top-2 left-2 right-2 z-50 flex items-center gap-2 rounded-xl bg-gradient-emergency text-primary-foreground px-4 py-3 shadow-emergency text-sm font-semibold">
      <HandHeart className="w-5 h-5 shrink-0" /> {STATUS_LABEL[status] ?? status} — tap to view
    </Link>
  );
};
