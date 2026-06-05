// supabase/functions/ingest-provider-webhook/index.ts
import { createClient } from "npm:@supabase/supabase-js";

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get("X-Nango-Signature");
    const expected = Deno.env.get("NANGO_WEBHOOK_SECRET");
    if (!signature || signature !== expected) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const provider = body.provider_config_key;
    const eventId = body.id || crypto.randomUUID();
    const connectionId = body.connection_id;
    const eventType = body.type || "unknown";

    const { error } = await admin.from("external_webhook_events").upsert({
      provider,
      event_id: eventId,
      connection_id: connectionId,
      event_type: eventType,
      payload: body,
      processed: false,
    }, {
      onConflict: "provider,event_id",
    });

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error.message || error) }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});