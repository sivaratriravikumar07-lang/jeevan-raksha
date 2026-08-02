import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/gatewayapi';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// GatewayAPI expects MSISDN integers (country code + number, no +).
const toMsisdn = (raw: string): number | null => {
  let digits = (raw || '').replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.length === 10) digits = `91${digits}`; // default India
  if (digits.length < 10 || digits.length > 15) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const anon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anon.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const incidentId = typeof body.incidentId === 'string' ? body.incidentId : null;
    const lat = typeof body.latitude === 'number' ? body.latitude : null;
    const lng = typeof body.longitude === 'number' ? body.longitude : null;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const [{ data: profile }, { data: contacts }] = await Promise.all([
      admin.from('profiles').select('full_name, phone, blood_group, emergency_message').eq('id', userId).maybeSingle(),
      admin.from('emergency_contacts').select('name, phone').eq('user_id', userId).order('priority'),
    ]);

    const list = (contacts ?? []).filter((c) => !!c.phone);
    if (!list.length) return json({ configured: true, sent: 0, failed: 0, reason: 'no_contacts' });

    const mapLink = lat != null && lng != null
      ? `https://maps.google.com/?q=${lat},${lng}`
      : 'Location unavailable';
    const message = [
      'EMERGENCY - Jeevan Raksha',
      `${profile?.full_name ?? 'A Jeevan Raksha user'} needs help NOW.`,
      profile?.phone ? `Phone: ${profile.phone}` : null,
      profile?.blood_group ? `Blood: ${profile.blood_group}` : null,
      profile?.emergency_message ? `Note: ${profile.emergency_message}` : null,
      `Live location: ${mapLink}`,
      'Police: 100 | Ambulance: 108',
    ].filter(Boolean).join('\n');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GATEWAYAPI_API_KEY = Deno.env.get('GATEWAYAPI_API_KEY');

    if (!LOVABLE_API_KEY || !GATEWAYAPI_API_KEY) {
      // No SMS gateway linked yet — the app falls back to the phone SMS app.
      return json({ configured: false, sent: 0, failed: list.length, message });
    }

    const results: { recipient: string; ok: boolean; detail?: string }[] = [];

    for (const c of list) {
      const msisdn = toMsisdn(c.phone);
      if (!msisdn) {
        results.push({ recipient: c.phone, ok: false, detail: 'invalid_number' });
        continue;
      }
      const res = await fetch(`${GATEWAY_URL}/mobile/single`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': GATEWAYAPI_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: 'JeevanRak',
          recipient: msisdn,
          message,
          reference: incidentId ?? `sos-${userId}`,
        }),
      });
      if (!res.ok) {
        const detail = await res.text();
        console.error(`GatewayAPI send failed [${res.status}]: ${detail}`);
        results.push({ recipient: c.phone, ok: false, detail: `${res.status}: ${detail}` });
      } else {
        results.push({ recipient: c.phone, ok: true });
      }
    }

    if (incidentId) {
      await admin.from('alerts').insert(
        results.map((r) => ({
          incident_id: incidentId,
          user_id: userId,
          channel: 'sms',
          recipient: r.recipient,
          status: r.ok ? 'sent' : 'failed',
        })),
      );
    }

    const sent = results.filter((r) => r.ok).length;
    return json({ configured: true, sent, failed: results.length - sent, results, message });
  } catch (e) {
    console.error('send-sos-sms error', e);
    return json({ error: (e as Error).message }, 500);
  }
});
