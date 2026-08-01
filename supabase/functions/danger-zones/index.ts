import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_maps';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 3; // 3 days

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

  try {
    const body = await req.json().catch(() => ({}));
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return new Response(JSON.stringify({ error: 'Valid lat and lng are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI credentials are not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cellKey = `${lat.toFixed(2)}_${lng.toFixed(2)}`; // ~1.1 km cell
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: cached } = await supabase
      .from('danger_zone_cache')
      .select('*')
      .eq('cell_key', cellKey)
      .maybeSingle();

    if (cached && Date.now() - new Date(cached.updated_at).getTime() < CACHE_TTL_MS) {
      return new Response(
        JSON.stringify({ zones: cached.zones, areaLabel: cached.area_label, updatedAt: cached.updated_at, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 1. Reverse geocode for local context (best effort)
    let areaLabel = '';
    if (GOOGLE_MAPS_API_KEY) {
      try {
        const geoRes = await fetch(`${GATEWAY_URL}/maps/api/geocode/json?latlng=${lat},${lng}`, {
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY },
        });
        if (geoRes.ok) {
          const geo = await geoRes.json();
          areaLabel = geo?.results?.[0]?.formatted_address ?? '';
        } else {
          console.error(`Geocode failed [${geoRes.status}]: ${await geoRes.text()}`);
        }
      } catch (e) {
        console.error('Geocode error', e);
      }
    }

    // 2. Generate risk assessment for the exact surroundings
    const prompt = `You are a public-safety risk analyst for India.
Current coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}
Reverse-geocoded address: ${areaLabel || 'unknown'}

List 6 to 9 realistic risk-prone spots within 6 km of these coordinates, based on the kind of infrastructure typically present there (railway/bus stations, highway junctions, flyover underpasses, isolated bypass roads, market lanes, riverbanks, low-lying flood areas, unlit stretches).
Return STRICT JSON only, matching:
{"zones":[{"name":string,"lat":number,"lng":number,"radiusKm":number,"level":"low"|"medium"|"high"|"critical","type":"high_crime"|"crime_hotspot"|"accident_prone"|"women_safety"|"poor_lighting"|"flood_prone"|"disaster_alert","reason":string,"advice":string}]}
Rules: coordinates must be plausible and within 6 km of the given point; radiusKm between 0.3 and 2; reason and advice under 120 characters each; cover a mix of types including at least one women_safety and one accident_prone.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      const details = await aiRes.text();
      console.error(`AI gateway failed [${aiRes.status}]: ${details}`);
      if (cached) {
        return new Response(
          JSON.stringify({ zones: cached.zones, areaLabel: cached.area_label, updatedAt: cached.updated_at, stale: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ error: 'Risk analysis failed', status: aiRes.status, details }), {
        status: aiRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiJson = await aiRes.json();
    let zones: unknown[] = [];
    try {
      const parsed = JSON.parse(aiJson?.choices?.[0]?.message?.content ?? '{}');
      zones = Array.isArray(parsed?.zones) ? parsed.zones : [];
    } catch (e) {
      console.error('Failed to parse AI response', e);
    }

    const levels = ['low', 'medium', 'high', 'critical'];
    zones = zones
      .filter((z: any) => Number.isFinite(Number(z?.lat)) && Number.isFinite(Number(z?.lng)))
      .map((z: any) => ({
        name: String(z.name ?? 'Unnamed area').slice(0, 90),
        lat: Number(z.lat),
        lng: Number(z.lng),
        radiusKm: Math.min(Math.max(Number(z.radiusKm) || 0.6, 0.3), 2),
        level: levels.includes(z.level) ? z.level : 'medium',
        type: String(z.type ?? 'crime_hotspot'),
        reason: String(z.reason ?? '').slice(0, 160),
        advice: String(z.advice ?? 'Stay alert and keep SOS ready.').slice(0, 160),
      }));

    if (zones.length === 0) {
      return new Response(JSON.stringify({ error: 'No risk data could be generated for this location' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const updatedAt = new Date().toISOString();
    await supabase.from('danger_zone_cache').upsert({
      cell_key: cellKey,
      latitude: lat,
      longitude: lng,
      area_label: areaLabel,
      zones,
      updated_at: updatedAt,
    });

    return new Response(JSON.stringify({ zones, areaLabel, updatedAt, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('danger-zones error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
