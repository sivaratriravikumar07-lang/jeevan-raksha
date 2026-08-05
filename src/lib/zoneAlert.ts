// Auto-alert to emergency contacts when a user leaves a safe zone.
import { supabase } from "@/integrations/supabase/client";
import { openSmsToAll, type ContactLite } from "@/lib/sms";

export interface ZoneAlertResult {
  contacts: number;
  autoSent: number;
  fallbackOpened: boolean;
}

export const buildZoneExitMessage = (
  zoneName: string,
  userName: string,
  coords: { lat: number; lng: number } | null,
) => {
  const mapLink = coords ? `https://maps.google.com/?q=${coords.lat},${coords.lng}` : "Location unavailable";
  return [
    "⚠️ SAFE ZONE ALERT - Jeevan Raksha",
    `${userName} has left the safe zone "${zoneName}".`,
    `Live location: ${mapLink}`,
    `Time: ${new Date().toLocaleTimeString()}`,
    "Please check on them. Police: 100 | Ambulance: 108",
  ].join("\n");
};

export const sendZoneExitAlert = async (
  zoneName: string,
  coords: { lat: number; lng: number } | null,
  openFallback = true,
): Promise<ZoneAlertResult> => {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return { contacts: 0, autoSent: 0, fallbackOpened: false };

  const [{ data: profile }, { data: contacts }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("emergency_contacts").select("name, phone, email").eq("user_id", user.id).order("priority"),
  ]);

  const list = (contacts ?? []).filter((c) => !!c.phone) as ContactLite[];
  if (!list.length) return { contacts: 0, autoSent: 0, fallbackOpened: false };

  const message = buildZoneExitMessage(zoneName, profile?.full_name ?? "Your contact", coords);

  // 1) Try the real SMS gateway (no tap required)
  let autoSent = 0;
  try {
    const { data, error } = await supabase.functions.invoke("send-sos-sms", {
      body: { latitude: coords?.lat ?? null, longitude: coords?.lng ?? null },
    });
    if (!error && data?.configured && data?.sent > 0) autoSent = data.sent as number;
  } catch {
    /* fall through to composer */
  }

  // 2) Fallback: open the phone SMS app pre-filled for every contact
  let fallbackOpened = false;
  if (!autoSent && openFallback) {
    openSmsToAll(list, message);
    fallbackOpened = true;
  }

  return { contacts: list.length, autoSent, fallbackOpened };
};
