// supabase/functions/sync-provider/index.ts
import { createClient } from "npm:@supabase/supabase-js";
import { corsHeaders } from "npm:@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) throw new Error("Unauthorized");

    const { provider } = await req.json();

    const { data: connection, error: connectionError } = await supabase
      .from("app_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .single();

    if (connectionError || !connection) throw new Error("Connection not found");

    const { data: job } = await supabase
      .from("sync_jobs")
      .insert({
        user_id: user.id,
        provider,
        connection_id: connection.connection_id,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    const nangoBase = Deno.env.get("NANGO_BASE_URL")!;
    const nangoSecret = Deno.env.get("NANGO_SECRET_KEY")!;

    const syncResp = await fetch(
      `${nangoBase}/records?provider_config_key=${provider}&connection_id=${connection.connection_id}&model=items`,
      {
        headers: { Authorization: `Bearer ${nangoSecret}` },
      }
    );

    if (!syncResp.ok) throw new Error(await syncResp.text());
    const payload = await syncResp.json();

    const records = (payload.records || []).map((item: any) => ({
      user_id: user.id,
      provider,
      connection_id: connection.connection_id,
      source_type: item.source_type || "unknown",
      source_id: item.id,
      title: item.title || null,
      summary: item.summary || null,
      status: item.status || null,
      priority: item.priority || null,
      start_at: item.start_at || null,
      due_at: item.due_at || null,
      assignee: item.assignee || null,
      url: item.url || null,
      raw_payload: item,
      dedupe_hash: `${provider}:${item.source_type || "unknown"}:${item.id}`,
    }));

    if (records.length) {
      const { error: upsertError } = await supabase
        .from("external_items")
        .upsert(records, {
          onConflict: "user_id,provider,source_type,source_id",
        });

      if (upsertError) throw upsertError;
    }

    await supabase.from("app_connections").update({
      status: "connected",
      last_synced_at: new Date().toISOString(),
      last_error: null,
    }).eq("id", connection.id);

    await supabase.from("sync_jobs").update({
      status: "success",
      records_in: records.length,
      records_out: records.length,
      finished_at: new Date().toISOString(),
    }).eq("id", job.id);

    return new Response(JSON.stringify({ ok: true, records: records.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error.message || error) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});