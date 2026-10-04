import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Returns the referrer-restricted Google Maps BROWSER key (public by design)
// so the frontend never depends on build-time env vars being present.
Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const browserKey = Deno.env.get('GOOGLE_MAPS_BROWSER_KEY') ?? '';
  const trackingId = Deno.env.get('GOOGLE_MAPS_TRACKING_ID') ?? '';
  if (!browserKey) {
    return new Response(JSON.stringify({ error: 'Maps browser key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ browserKey, trackingId }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
  });
});
