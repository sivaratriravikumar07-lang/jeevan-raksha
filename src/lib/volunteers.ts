import { supabase } from "@/integrations/supabase/client";

export const ACTIVE_REQ_KEY = "jr_active_volunteer_request";
export const VOL_EVENT = "jr-volunteer-request";
const db = supabase as any;

/** Creates a nearby-volunteer request for an SOS. Never throws — SOS must continue. */
export const requestNearbyVolunteers = async (incidentId: string | null, lat: number, lng: number, radiusM = 3000) => {
  if (!lat || !lng) return null;
  try {
    const { data, error } = await db.rpc("create_volunteer_request", {
      _incident_id: incidentId, _lat: lat, _lng: lng, _radius_m: radiusM, _timeout_s: 90,
    });
    if (error || !data) return null;
    localStorage.setItem(ACTIVE_REQ_KEY, data as string);
    window.dispatchEvent(new Event(VOL_EVENT));
    return data as string;
  } catch {
    return null;
  }
};

export const STATUS_LABEL: Record<string, string> = {
  searching: "Searching nearby volunteers…",
  accepted: "Volunteer accepted",
  on_the_way: "Volunteer on the way",
  arrived: "Volunteer arrived",
  completed: "Assistance completed",
  cancelled: "Request cancelled",
  expired: "No volunteer accepted — your contacts were alerted",
};

export const isFinal = (s: string, timeoutAt?: string) =>
  ["completed", "cancelled", "expired"].includes(s) ||
  (s === "searching" && !!timeoutAt && new Date(timeoutAt).getTime() < Date.now());
