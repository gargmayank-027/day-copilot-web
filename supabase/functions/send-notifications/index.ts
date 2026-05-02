// supabase/functions/send-notifications/index.ts
// Uses Firebase Cloud Messaging V1 API (modern, non-legacy)

import { serve }        from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const SUPABASE_URL         = Deno.env.get("https://zeauvlcubkunarvzvntf.supabase.co")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplYXV2bGN1Ymt1bmFydnp2bnRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzAxNzIwMywiZXhwIjoyMDkyNTkzMjAzfQ.qxh4ErkGtPqT99zW9C6oeUrvPij1msgEpSAZYpHD-QA")!;

// From your Firebase service account JSON file — set as Supabase secrets
const FCM_PROJECT_ID   = Deno.env.get("day-copilot")!;    // e.g. "day-copilot-12345"
const FCM_CLIENT_EMAIL = Deno.env.get("firebase-adminsdk-fbsvc@day-copilot.iam.gserviceaccount.com")!;  // firebase-adminsdk-xxx@...
const FCM_PRIVATE_KEY  = Deno.env.get("-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCkdI8J13r27tg/\n4gQjstIkgQRBNJJ85Cf6gNFoOFlf/0unlPglBg6uS+4u5y1EcKbwYKDoruVZQSFU\n/BXxl/mM86SU5BaGICrVQ9wtBdq3ZeW/wX1zLZ6zFFFdlJzJ8yuWUN3E+AqPk44v\nP/6XhS1W4fJq+wezT0wEqIIjc8fD+zt5dzedsHacn5oQK6FD996qK1IkXT1QolfY\n+E+X8IyGgHoiGXB4x66WNY0STvsRom9ST5vThB2mhEhzzBFk/p6/o0EaGis3GTPW\ncRzjgOJFmY+l92kpjMg6hTiPoNlOYvIc5QYZRsO6gNcEeCNzB3gVVe4ieqdo3by4\nXEHKNtR/AgMBAAECggEABVJrFaskVhp4dw+LnQ5JZURBHf53AUaWIJ4uHtGHFfs1\nacl3guqZCQbH3onHRj3MQxA8Ovo3MCTIlb3cNwK+HCJ1alWeWZj5qeCuY8M4WoRm\n9zJ+AzBrIt/+wcZJB2j1iDfYVqWJzaVbBAq8qZjsQRQRaC304K8pkDrfyWtN2Koa\n1ms8WWzvtGmD/4jVcM553/MwMgj2qYEAnQQUC390QzhZ3RJbnE4+9HgTRxoBDd+Z\nbZHvcLVYthjQx6N7RbpoA0YOlUSeUfb3PZ6nmNQJzYbJTM0wSFN+VoTaCpS3jQRa\nHbanHZsSpQ+It4yllWr47OwJDPQmHu6s5IGCvRx4EQKBgQDay4NftBo2Bu/x0QP5\nt0xtKhvobLPeTgftNGmWQI2UD1tuLey0royqObWUeRPbPN1vWiDl8kK/PDi81IHr\n8O7Wt90aNkuP68zuVj2p9EmmqyEjgpW61aIGNMtTAV0UpDQu8bNPiyG4alTcS5qH\n+67SNkZZCwo0f8BVIt/BeUW+ZwKBgQDAa44Y4ljhaEYelFj648PPD7ZCHgeH63Cv\nM7AM2z/T1Bkm0gGyv+6dkCPbK9Y5BJLxzsq+4g+fyz4PST2hpPVvAZKLQCkOZXdN\nQekTrQKtWioymgYG1h8VO+2omjdKq/7mbPqzad0Spp9dUeyPEBDXgPX+89gIsDZf\n94HPhtg6KQKBgDWt/rJpTpD4zL/IZzBKH28dCLHSkaK2BE3XMRyTA+lShz0V+WAu\n/wX4mKsvtYZxfWaHd1DTSjr+/HCftqx7dS2q+I0oywspcCL9d62N6NACZmP+8tte\n9JyPMV9RE1QwITlvRW37la9YLy/JQMWiIzch58qK4dsViMuafclLBqh7AoGBAI+c\ndoyJ+s4Y9iSCkbqG3bCfyGamZPaDuTF6AU5HIOcnaLI5kPzpFN1SJADDQfqCOG3y\n6gz3SbP4i9P61N3c8TUtVkNJ2pqdDiKCK8P8n3/kSJRFsnPNwZsmhCUPHG9F2VP/\nSEk5nL77zvtmVokb84X0ASWMttMdOSf84UyTFrSpAoGAAlSxdvs3iO0zP9HXZDmr\nyoZCSuUSiIUPt4ThYFDfPcvGvFLBE/It+Aqy07rRIopsyYUUfrAxoCaZ8Wz0rGOs\ntPEinwf11nAiwiVbasuhI8JHQvxoQ+XXwVCNv+0VS+FgOjl+PQih16MZlIMITbba\nzlDApFdiMfN/6mAPuFLCXlo=\n-----END PRIVATE KEY-----\n")!;   // the private_key value

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/* ─── Get OAuth2 access token for FCM V1 ─────────────────────────────────── */
async function getFCMAccessToken(): Promise<string> {
  // Clean up private key (Supabase secrets encode newlines as \n)
  const privateKeyPem = FCM_PRIVATE_KEY.replace(/\\n/g, "\n");

  const keyData = privateKeyPem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Create JWT for Google OAuth2
  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    {
      iss:   FCM_CLIENT_EMAIL,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud:   "https://oauth2.googleapis.com/token",
      exp:   getNumericDate(3600),
      iat:   getNumericDate(0),
    },
    cryptoKey
  );

  // Exchange JWT for access token
  const res = await fetch("https://oauth2.googleapis.com/token", {
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

/* ─── Send one FCM V1 notification ───────────────────────────────────────── */
async function sendNotification(
  token:       string,
  title:       string,
  body:        string,
  data:        Record<string, string>,
  type:        string,
  accessToken: string
): Promise<boolean> {
  const actions =
    type === "followup" ? [
      { action: "done",       title: "✅ Done"        },
      { action: "reschedule", title: "🔄 Reschedule"  },
    ] :
    type === "morning"  ? [{ action: "open", title: "📋 Plan my day" }] :
                          [{ action: "open", title: "▶️ Start task"  }];

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
        payload: {
          aps: {
            alert:    { title, body },
            sound:    "default",
            badge:    1,
            category: type === "followup" ? "TASK_FOLLOWUP" : "TASK_REMINDER",
          },
        },
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
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    }
  );

  const result = await res.json();
  if (!res.ok) { console.error("FCM error:", JSON.stringify(result)); return false; }
  console.log("Sent:", result.name);
  return true;
}

/* ─── Main ────────────────────────────────────────────────────────────────── */
serve(async () => {
  try {
    const nowISO = new Date().toISOString();

    // Fetch due unsent notifications
    const { data: due, error } = await supabase
      .from("notification_schedule")
      .select("*, push_tokens!inner(token)")
      .eq("sent", false)
      .lte("send_at", nowISO)
      .limit(50);

    if (error) throw error;
    if (!due?.length) return new Response(
      JSON.stringify({ message: "Nothing due", time: nowISO }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );

    // Get access token once — reuse for all sends
    const accessToken = await getFCMAccessToken();

    const results = await Promise.allSettled(
      due.map(async notif => {
        const token = notif.push_tokens?.token;
        if (!token) return;

        await sendNotification(
          token, notif.title, notif.body || "",
          {
            type:      notif.type,
            taskId:    notif.task_id    || "",
            taskTitle: notif.task_title || "",
            taskTag:   notif.task_tag   || "",
          },
          notif.type, accessToken
        );

        // Always mark sent to avoid retrying failed ones infinitely
        await supabase
          .from("notification_schedule")
          .update({ sent: true, sent_at: new Date().toISOString() })
          .eq("id", notif.id);
      })
    );

    const sent   = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;

    return new Response(
      JSON.stringify({ sent, failed, total: due.length }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );

  } catch(e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});
