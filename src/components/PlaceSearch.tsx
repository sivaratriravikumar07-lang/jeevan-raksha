import { useState } from "react";
import { Search, Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loadGoogleMaps } from "@/lib/maps";

export interface PlaceResult {
  label: string;
  lat: number;
  lng: number;
}

interface Props {
  placeholder?: string;
  bias?: { lat: number; lng: number } | null;
  onSelect: (place: PlaceResult) => void;
}

/** Search any place in India (college, office, landmark) and pick its exact coordinates. */
export const PlaceSearch = ({ placeholder = "Search a place…", bias, onSelect }: Props) => {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    const query = q.trim();
    if (!query) return;
    setBusy(true);
    setErr(null);
    try {
      const maps = await loadGoogleMaps();
      const geocoder = new maps.Geocoder();
      const res = await geocoder.geocode({
        address: query,
        componentRestrictions: { country: "IN" },
        ...(bias
          ? {
              bounds: new maps.LatLngBounds(
                { lat: bias.lat - 0.5, lng: bias.lng - 0.5 },
                { lat: bias.lat + 0.5, lng: bias.lng + 0.5 },
              ),
            }
          : {}),
      });
      const list = res.results.slice(0, 5).map((r) => ({
        label: r.formatted_address,
        lat: r.geometry.location.lat(),
        lng: r.geometry.location.lng(),
      }));
      setResults(list);
      if (!list.length) setErr("No place found. Try a fuller name with the city.");
    } catch {
      setErr("Search failed. Check your internet and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={q}
          placeholder={placeholder}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
        />
        <Button type="button" variant="secondary" onClick={run} disabled={busy} className="shrink-0">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </div>
      {err && <p className="text-xs text-primary">{err}</p>}
      {results.length > 0 && (
        <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
          {results.map((r) => (
            <button
              key={`${r.lat},${r.lng}`}
              onClick={() => {
                onSelect(r);
                setResults([]);
                setQ("");
              }}
              className="w-full text-left px-3 py-2 text-xs flex gap-2 items-start hover:bg-muted/60"
            >
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-secondary" />
              <span className="min-w-0">{r.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
