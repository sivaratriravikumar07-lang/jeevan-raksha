// Lightweight Google Maps JS API loader (singleton)
import { supabase } from "@/integrations/supabase/client";

let loadPromise: Promise<typeof google.maps> | null = null;

const getKeys = async (): Promise<{ key: string; channel: string }> => {
  const envKey = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as string | undefined;
  const envChannel = (import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] as string | undefined) ?? "";
  if (envKey) return { key: envKey, channel: envChannel };
  // Fallback: fetch the public, referrer-restricted browser key from the backend
  const { data, error } = await supabase.functions.invoke("maps-config", { method: "GET" });
  if (error || !data?.browserKey) throw new Error("Maps key missing");
  return { key: data.browserKey, channel: data.trackingId ?? "" };
};

export const loadGoogleMaps = (): Promise<typeof google.maps> => {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    if ((window as any).google?.maps?.Map) return (window as any).google.maps;
    const { key, channel } = await getKeys();
    return new Promise<typeof google.maps>((resolve, reject) => {
      const cbName = "__jrInitMap";
      (window as any)[cbName] = () => resolve((window as any).google.maps);
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=${cbName}${channel ? `&channel=${channel}` : ""}`;
      s.async = true;
      s.onerror = () => reject(new Error("Failed to load Google Maps"));
      document.head.appendChild(s);
    });
  })().catch((e) => {
    loadPromise = null; // allow retry
    throw e;
  });

  return loadPromise;
};

export const distanceKm = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
