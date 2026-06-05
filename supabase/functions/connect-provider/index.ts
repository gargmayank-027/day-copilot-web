import { createClient } from "npm:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { provider } = await req.json();

    const nangoBase = Deno.env.get("NANGO_BASE_URL")!;
    const nangoSecret = Deno.env.get("NANGO_SECRET_KEY")!;
    const connectionId = `${provider}-${user.id}`;

    const { data: row, error: insertError } = await supabase
      .from("app_connections")
      .upsert({
        user_id: user.id,
        provider,
        connection_id: connectionId,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const resp = await fetch(`${nangoBase}/connect/sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${nangoSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        end_user: { id: user.id },
        allowed_integrations: [provider],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text);
    }

    const data = await resp.json();

    await supabase
      .from("app_connections")
      .update({ status: "auth_started" })
      .eq("id", row.id);

    return new Response(JSON.stringify({ connectUrl: data.connect_link || data.url }), {
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