import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/maps";

export interface MapMarker {
  lat: number;
  lng: number;
  title: string;
  color: string; // hex
  info?: string; // html string
}

export interface MapCircle {
  lat: number;
  lng: number;
  radiusKm: number;
  color: string; // hex
}

interface Props {
  center: { lat: number; lng: number } | null;
  markers?: MapMarker[];
  circles?: MapCircle[];
  zoom?: number;
  className?: string;
}

const pin = (color: string) => ({
  path: 0 as unknown as google.maps.SymbolPath, // SymbolPath.CIRCLE
  fillColor: color,
  fillOpacity: 1,
  strokeColor: "#ffffff",
  strokeWeight: 2,
  scale: 8,
});

export const SafetyMap = ({ center, markers = [], circles = [], zoom = 13, className }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const objectsRef = useRef<Array<google.maps.Marker | google.maps.Circle>>([]);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !ref.current) return;
        mapRef.current = new maps.Map(ref.current, {
          center: center ?? { lat: 20.5937, lng: 78.9629 },
          zoom,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
        });
        infoRef.current = new maps.InfoWindow();
        setReady(true);
      })
      .catch(() => setError("Map could not be loaded. Check your internet connection."));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ready && mapRef.current && center) mapRef.current.panTo(center);
  }, [ready, center?.lat, center?.lng]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const maps = (window as any).google.maps as typeof google.maps;
    objectsRef.current.forEach((o) => o.setMap(null));
    objectsRef.current = [];

    circles.forEach((c) => {
      objectsRef.current.push(
        new maps.Circle({
          map: mapRef.current!,
          center: { lat: c.lat, lng: c.lng },
          radius: c.radiusKm * 1000,
          fillColor: c.color,
          fillOpacity: 0.18,
          strokeColor: c.color,
          strokeOpacity: 0.7,
          strokeWeight: 1.5,
        }),
      );
    });

    markers.forEach((m) => {
      const marker = new maps.Marker({
        map: mapRef.current!,
        position: { lat: m.lat, lng: m.lng },
        title: m.title,
        icon: { ...pin(m.color), path: maps.SymbolPath.CIRCLE },
      });
      marker.addListener("click", () => {
        infoRef.current?.setContent(
          m.info ?? `<div style="font:600 13px system-ui">${m.title}</div>`,
        );
        infoRef.current?.open({ map: mapRef.current!, anchor: marker });
      });
      objectsRef.current.push(marker);
    });
  }, [ready, markers, circles]);

  if (error) {
    return (
      <div className={`rounded-2xl border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground ${className ?? ""}`}>
        {error}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border ${className ?? ""}`}>
      <div ref={ref} className="h-full w-full" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 text-xs text-muted-foreground">
          Loading map…
        </div>
      )}
    </div>
  );
};
