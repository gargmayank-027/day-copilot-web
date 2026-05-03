// supabase/functions/send-notifications/index.ts

import { serve }        from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")              ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FCM_PROJECT_ID       = Deno.env.get("FCM_PROJECT_ID")            ?? "";
const FCM_CLIENT_EMAIL     = Deno.env.get("FCM_CLIENT_EMAIL")          ?? "";
const RAW_KEY              = Deno.env.get("FCM_PRIVATE_KEY")           ?? "";
const FCM_PRIVATE_KEY      = RAW_KEY.replace(/\\n/g, "\n");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/* ─── OAuth2 token for FCM V1 ─────────────────────────────────────────────── */
async function getFCMAccessToken(): Promise<string> {
  const pemBody = FCM_PRIVATE_KEY
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");

  const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const privateKey = await crypto.subtle.importKey(
    "pkcs8", binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );

  const now = Math.floor(Date.now() / 1000);

  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }))
    .replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");

  const claims = btoa(JSON.stringify({
    iss:   FCM_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud:   "https://oauth2.googleapis.com/token",
    exp:   now + 3600,
    iat:   now,
  })).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");

  const sigBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", privateKey,
    new TextEncoder().encode(`${header}.${claims}`)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)))
    .replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");

  const jwt = `${header}.${claims}.${sigB64}`;

  const res  = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion:  jwt,
    }),
  });

  const data = await res.json();
  if (!data.access_token) throw new Error(`OAuth2 failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

/* ─── Send FCM notification ───────────────────────────────────────────────── */
async function sendFCM(
  token: string, title: string, body: string,
  data: Record<string,string>, type: string, accessToken: string
): Promise<boolean> {
  const actions =
    type === "followup" ? [
      { action:"done",       title:"✅ Done"       },
      { action:"reschedule", title:"🔄 Reschedule" },
    ] :
    type === "morning"  ? [{ action:"open", title:"📋 Plan my day" }] :
                          [{ action:"open", title:"▶️ Start task"  }];

  const payload = {
    message: {
      token,
      notification: { title, body },
      data,
      android: {
        priority: "high",
        notification: { channel_id: "day-copilot-tasks" },
      },
      apns: {
        headers: { "apns-priority": "10" },
        payload: { aps: { alert: { title, body }, sound: "default", badge: 1 } },
      },
      webpush: {
        notification: {
          title, body,
          icon:               "/pwa-192x192.png",
          badge:              "/pwa-192x192.png",
          actions,
          vibrate:            [200, 100, 200],
          tag:                data.taskId || "day-copilot",
          requireInteraction: type === "followup",
        },
        fcm_options: { link: "/" },
      },
    },
  };

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
      body:    JSON.stringify(payload),
    }
  );

  const result = await res.json();
  if (!res.ok) { console.error("FCM error:", JSON.stringify(result)); return false; }
  console.log("FCM sent:", result.name);
  return true;
}

/* ─── Main ────────────────────────────────────────────────────────────────── */
serve(async () => {
  try {
    if (!FCM_PROJECT_ID || !FCM_CLIENT_EMAIL || !FCM_PRIVATE_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing FCM secrets" }),
        { headers: { "Content-Type": "application/json" }, status: 500 }
      );
    }

    const nowISO = new Date().toISOString();

    // Step 1 — Fetch due notifications (no join)
    const { data: due, error: e1 } = await supabase
      .from("notification_schedule")
      .select("id, user_id, task_id, task_title, task_tag, type, title, body")
      .eq("sent", false)
      .lte("send_at", nowISO)
      .limit(50);

    if (e1) throw new Error(`Fetch notifications error: ${e1.message}`);
    if (!due || due.length === 0) {
      return new Response(
        JSON.stringify({ message: "No notifications due", time: nowISO }),
        { headers: { "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Step 2 — Get all unique user IDs from due notifications
    const userIds = [...new Set(due.map(n => n.user_id))];

    // Step 3 — Fetch push tokens for those users (separate query)
    const { data: tokens, error: e2 } = await supabase
      .from("push_tokens")
      .select("user_id, token")
      .in("user_id", userIds);

    if (e2) throw new Error(`Fetch tokens error: ${e2.message}`);

    // Build a map of user_id -> token for fast lookup
    const tokenMap: Record<string, string> = {};
    (tokens || []).forEach(t => { tokenMap[t.user_id] = t.token; });

    console.log(`${due.length} notifications, ${Object.keys(tokenMap).length} tokens`);

    if (Object.keys(tokenMap).length === 0) {
      return new Response(
        JSON.stringify({ message: "No push tokens found — users haven't enabled notifications yet" }),
        { headers: { "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Step 4 — Get FCM access token once
    const accessToken = await getFCMAccessToken();

    let sent = 0, failed = 0, skipped = 0;

    // Step 5 — Send each notification
    for (const notif of due) {
      const token = tokenMap[notif.user_id];

      if (!token) {
        console.warn(`No token for user ${notif.user_id}, skipping`);
        skipped++;
        // Mark sent so we don't retry forever
        await supabase.from("notification_schedule")
          .update({ sent: true, sent_at: new Date().toISOString() })
          .eq("id", notif.id);
        continue;
      }

      try {
        const ok = await sendFCM(
          token,
          notif.title,
          notif.body || "",
          {
            type:      notif.type       || "",
            taskId:    notif.task_id    || "",
            taskTitle: notif.task_title || "",
            taskTag:   notif.task_tag   || "",
          },
          notif.type,
          accessToken
        );

        await supabase.from("notification_schedule")
          .update({ sent: true, sent_at: new Date().toISOString() })
          .eq("id", notif.id);

        ok ? sent++ : failed++;

      } catch(e) {
        console.error("Send error for notif", notif.id, e);
        failed++;
        await supabase.from("notification_schedule")
          .update({ sent: true, sent_at: new Date().toISOString() })
          .eq("id", notif.id);
      }
    }

    return new Response(
      JSON.stringify({ sent, failed, skipped, total: due.length }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );

  } catch(e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Fatal:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});
