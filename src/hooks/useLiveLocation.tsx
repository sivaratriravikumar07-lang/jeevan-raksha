import { useEffect, useRef, useState } from "react";
import { distanceKm } from "@/lib/maps";

export interface LiveCoords {
  lat: number;
  lng: number;
  accuracy: number;
}

/**
 * Continuous GPS tracking with a movement threshold so we only refetch
 * (and burn battery/API quota) when the user actually moves.
 */
export const useLiveLocation = (thresholdMeters = 400) => {
  const [coords, setCoords] = useState<LiveCoords | null>(null); // raw live position
  const [anchor, setAnchor] = useState<LiveCoords | null>(null); // throttled position for data fetches
  const [error, setError] = useState<string | null>(null);
  const anchorRef = useRef<LiveCoords | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("GPS is not supported on this device.");
      return;
    }

    const handle = (p: GeolocationPosition) => {
      const next = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
      setError(null);
      setCoords(next);
      const prev = anchorRef.current;
      if (!prev || distanceKm(prev, next) * 1000 >= thresholdMeters) {
        anchorRef.current = next;
        setAnchor(next);
      }
    };

    const fail = (e: GeolocationPositionError) => {
      if (e.code === e.PERMISSION_DENIED) setError("Location permission denied. Enable it to see nearby data.");
      else if (e.code === e.POSITION_UNAVAILABLE) setError("GPS unavailable. Turn on location services.");
      else setError("Could not get your location. Retrying…");
    };

    navigator.geolocation.getCurrentPosition(handle, fail, { enableHighAccuracy: true, timeout: 15000 });
    const id = navigator.geolocation.watchPosition(handle, fail, {
      enableHighAccuracy: true,
      maximumAge: 15000,
      timeout: 20000,
    });
    return () => navigator.geolocation.clearWatch(id);
  }, [thresholdMeters]);

  return { coords, anchor, error };
};
