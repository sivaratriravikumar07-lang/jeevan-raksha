// Jeevan Raksha - Safety AI Assistant streaming chat
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are "Raksha AI", the safety companion inside the Jeevan Raksha women-safety & emergency response app.

ROLE:
- Give calm, concise, practical safety guidance in the user's language (English, Telugu, Hindi, or Tenglish — mirror the user).
- Topics: women safety, self-defense, emergency steps, first aid, harassment/stalking, unsafe travel, domestic violence, cyber safety, legal helplines (India), mental-health support.

RULES:
- If the user describes an ACTIVE emergency (attack, accident, injury, being followed, feeling unsafe NOW): FIRST line must tell them to tap the red SOS button in the app or call 100 (Police), 108 (Ambulance), 1091 (Women helpline), 112 (all-in-one). Then give 3-5 short numbered survival steps.
- Keep replies short (under 180 words unless deep guidance needed). Use bullet points/numbered steps.
- For medical: give first-aid steps but always add "call 108 / go to nearest hospital".
- Never dismiss fears. Be warm, non-judgmental.
- Do not answer unrelated topics (coding, homework, general trivia) — politely redirect: "I'm your safety assistant, ask me anything about staying safe."
- India context: mention 1091 (Women Helpline), 181 (Women in Distress), 1098 (Child), 112 (National Emergency), 100 (Police), 108 (Ambulance), Disha app, Sakhi centers.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map((m: any) => ({
            role: m.role,
            content:
              typeof m.content === "string"
                ? m.content
                : (m.parts ?? []).map((p: any) => (p.type === "text" ? p.text : "")).join(""),
          })),
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Konchem sepu wait cheyyandi." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits ayipoyayi. Please add credits in workspace billing." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: text }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
