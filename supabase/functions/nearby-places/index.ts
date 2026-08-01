import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_maps';

interface PlaceOut {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  userRatingCount: number | null;
  openNow: boolean | null;
  phone: string | null;
  distanceKm: number;
  durationMin: number | null;
}

const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

  try {
    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) {
      return new Response(JSON.stringify({ error: 'Maps credentials are not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    const radius = Math.min(Math.max(Number(body?.radius) || 5000, 500), 50000);
    const kind = body?.kind === 'police' ? 'police' : 'hospital';

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return new Response(JSON.stringify({ error: 'Valid lat and lng are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const gwHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY,
      'Content-Type': 'application/json',
    };

    // 1. Nearby search (Places API New)
    const searchRes = await fetch(`${GATEWAY_URL}/places/v1/places:searchNearby`, {
      method: 'POST',
      headers: {
        ...gwHeaders,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours.openNow,places.nationalPhoneNumber',
      },
      body: JSON.stringify({
        includedTypes: kind === 'police' ? ['police'] : ['hospital'],
        maxResultCount: 20,
        rankPreference: 'DISTANCE',
        locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius } },
      }),
    });

    if (!searchRes.ok) {
      const details = await searchRes.text();
      console.error(`Places searchNearby failed [${searchRes.status}]: ${details}`);
      return new Response(
        JSON.stringify({ error: 'Places request failed', status: searchRes.status, details }),
        { status: searchRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const searchJson = await searchRes.json();
    const raw = Array.isArray(searchJson?.places) ? searchJson.places : [];

    let places: PlaceOut[] = raw.map((p: any) => ({
      id: p.id,
      name: p.displayName?.text ?? 'Unknown',
      address: p.formattedAddress ?? '',
      lat: p.location?.latitude ?? 0,
      lng: p.location?.longitude ?? 0,
      rating: p.rating ?? null,
      userRatingCount: p.userRatingCount ?? null,
      openNow: p.currentOpeningHours?.openNow ?? null,
      phone: p.nationalPhoneNumber ?? null,
      distanceKm: haversineKm({ lat, lng }, { lat: p.location?.latitude ?? 0, lng: p.location?.longitude ?? 0 }),
      durationMin: null,
    }));

    places.sort((a, b) => a.distanceKm - b.distanceKm);
    places = places.slice(0, 15);

    // 2. Travel times (Routes API) — best effort
    if (places.length > 0) {
      try {
        const matrixRes = await fetch(`${GATEWAY_URL}/routes/distanceMatrix/v2:computeRouteMatrix`, {
          method: 'POST',
          headers: { ...gwHeaders, 'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,condition' },
          body: JSON.stringify({
            origins: [{ waypoint: { location: { latLng: { latitude: lat, longitude: lng } } } }],
            destinations: places.map((p) => ({
              waypoint: { location: { latLng: { latitude: p.lat, longitude: p.lng } } },
            })),
            travelMode: 'DRIVE',
          }),
        });
        if (matrixRes.ok) {
          const rows = await matrixRes.json();
          for (const row of Array.isArray(rows) ? rows : []) {
            const idx = row?.destinationIndex;
            const secs = Number(String(row?.duration ?? '').replace('s', ''));
            if (typeof idx === 'number' && places[idx] && Number.isFinite(secs) && secs > 0) {
              places[idx].durationMin = Math.max(1, Math.round(secs / 60));
            }
          }
        } else {
          console.error(`Route matrix failed [${matrixRes.status}]: ${await matrixRes.text()}`);
        }
      } catch (e) {
        console.error('Route matrix error', e);
      }
    }

    return new Response(JSON.stringify({ places }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('nearby-places error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
