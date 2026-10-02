import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { vibrate, getCurrentPosition } from "@/lib/emergency";
import { buildEmergencyMessage, openSmsToAll, type ContactLite } from "@/lib/sms";
import { requestNearbyVolunteers } from "@/lib/volunteers";
import { VoiceGuard } from "@/lib/voiceGuard";

export interface SosOptions {
  /** Incident type stored in the incidents table. */
  type?: "auto_detected" | "manual" | "sos" | "voice";
  /** Emergency number dialled after alerting contacts. */
  callNumber?: string;
  /** Delay before the dialler opens. */
  callDelayMs?: number;
}

/**
 * Shared SOS workflow used by the manual SOS button, the Volume 3x trigger and
 * the native Voice Protection Mode: GPS → Google Maps link → contact alerts →
 * emergency call.
 */
let lastRun = 0;

export const runSosWorkflow = async (
  userId: string,
  { type = "sos", callNumber = "100", callDelayMs = 2500 }: SosOptions = {},
) => {
  // Guard against the same trigger firing from two listeners at once.
  const now = Date.now();
  if (now - lastRun < 10000) return;
  lastRun = now;

  vibrate([300, 100, 300, 100, 600]);

  let lat = 0;
  let lng = 0;
  try {
    const pos = await getCurrentPosition();
    lat = pos.coords.latitude;
    lng = pos.coords.longitude;
  } catch {
    toast.warning("GPS unavailable — alert will be sent without location.");
  }

  const [{ data: profile }, { data: cs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, phone, blood_group, emergency_message")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("emergency_contacts").select("name, phone, email").eq("user_id", userId),
  ]);
  const list = (cs ?? []) as ContactLite[];

  const msg = buildEmergencyMessage(
    {
      name: profile?.full_name ?? "A Jeevan Raksha user",
      phone: profile?.phone,
      bloodGroup: profile?.blood_group,
      note: profile?.emergency_message,
    },
    lat && lng ? { lat, lng } : null,
  );

  try {
    const incident = await supabase
      .from("incidents")
      .insert({
        user_id: userId,
        type,
        status: "active",
        latitude: lat || null,
        longitude: lng || null,
      })
      .select()
      .single();

    // Additive: alert nearby volunteers (non-blocking, never stops SOS).
    void requestNearbyVolunteers(incident.data?.id ?? null, lat, lng);



    const { data: smsRes, error: smsErr } = await supabase.functions.invoke("send-sos-sms", {
      body: { incidentId: incident.data?.id, latitude: lat || null, longitude: lng || null },
    });

    if (!smsErr && smsRes?.configured && smsRes?.sent > 0) {
      toast.success(`Auto SMS sent to ${smsRes.sent} contact${smsRes.sent > 1 ? "s" : ""} with live location.`);
    } else if (list.length && msg) {
      openSmsToAll(list, msg);
      toast.info(`SMS opened for ${list.length} contact${list.length > 1 ? "s" : ""}.`);
    }
  } catch {
    if (list.length && msg) {
      openSmsToAll(list, msg);
      toast.info(`SMS opened for ${list.length} contact${list.length > 1 ? "s" : ""}.`);
    }
  }

  setTimeout(() => {
    VoiceGuard.callNow({ number: callNumber }).catch(() => {
      window.location.href = `tel:${callNumber}`;
    });
  }, callDelayMs);
};
