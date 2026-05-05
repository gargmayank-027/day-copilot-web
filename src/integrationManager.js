/**
 * integrationManager.js
 * Handles Google Calendar OAuth + event fetching
 * Replace GOOGLE_CLIENT_ID with your actual client ID from Google Cloud Console
 */

// ─── CONFIG ────────────────────────────────────────────────────────────────
export const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email";
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];

// ─── STATE ─────────────────────────────────────────────────────────────────
let gapiLoaded   = false;
let gisLoaded    = false;
let tokenClient  = null;
let accessToken  = null;

// ─── LOAD GAPI ─────────────────────────────────────────────────────────────
export function loadGoogleScripts() {
  return new Promise((resolve) => {
    if (gapiLoaded && gisLoaded) { resolve(); return; }

    let gapiReady = false;
    let gisReady  = false;
    const tryResolve = () => { if (gapiReady && gisReady) resolve(); };

    // Load gapi
    if (!document.getElementById("gapi-script")) {
      const s = document.createElement("script");
      s.id  = "gapi-script";
      s.src = "https://apis.google.com/js/api.js";
      s.onload = () => {
        window.gapi.load("client", async () => {
          await window.gapi.client.init({
            discoveryDocs: DISCOVERY_DOCS,
          });
          gapiLoaded = true;
          gapiReady  = true;
          tryResolve();
        });
      };
      document.body.appendChild(s);
    } else {
      gapiReady = true;
      tryResolve();
    }

    // Load GIS (token client)
    if (!document.getElementById("gis-script")) {
      const s = document.createElement("script");
      s.id  = "gis-script";
      s.src = "https://accounts.google.com/gsi/client";
      s.onload = () => { gisLoaded = true; gisReady = true; tryResolve(); };
      document.body.appendChild(s);
    } else {
      gisReady = true;
      tryResolve();
    }
  });
}

// ─── SIGN IN ────────────────────────────────────────────────────────────────
export function googleSignIn() {
  return new Promise((resolve, reject) => {
    if (!window.google) { reject(new Error("Google scripts not loaded")); return; }

    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) { reject(resp); return; }
        accessToken = resp.access_token;
        window.gapi.client.setToken({ access_token: accessToken });
        // Save token expiry
        const expiry = Date.now() + (resp.expires_in - 60) * 1000;
        sessionStorage.setItem("gcal_token",    accessToken);
        sessionStorage.setItem("gcal_expiry",   String(expiry));
        resolve(accessToken);
      },
    });
    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

// ─── RESTORE SESSION TOKEN ──────────────────────────────────────────────────
export function restoreGoogleSession() {
  const saved  = sessionStorage.getItem("gcal_token");
  const expiry = Number(sessionStorage.getItem("gcal_expiry") || 0);
  if (saved && Date.now() < expiry) {
    accessToken = saved;
    if (window.gapi?.client) window.gapi.client.setToken({ access_token: saved });
    return true;
  }
  return false;
}

// ─── SIGN OUT ───────────────────────────────────────────────────────────────
export function googleSignOut() {
  if (accessToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(accessToken, () => {});
  }
  accessToken = null;
  sessionStorage.removeItem("gcal_token");
  sessionStorage.removeItem("gcal_expiry");
}

export function isGoogleConnected() {
  if (accessToken) return true;
  return restoreGoogleSession();
}

// ─── FETCH TODAY'S CALENDAR EVENTS ──────────────────────────────────────────
export async function fetchTodayCalendarEvents() {
  if (!accessToken && !restoreGoogleSession()) {
    throw new Error("Not authenticated");
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const resp = await window.gapi.client.calendar.events.list({
    calendarId: "primary",
    timeMin:    startOfDay.toISOString(),
    timeMax:    endOfDay.toISOString(),
    showDeleted: false,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 50,
  });

  const events = resp.result.items || [];

  // Convert Google Calendar events → Day Copilot task format
  return events
    .filter(e => e.status !== "cancelled")
    .map(e => {
      const start = e.start?.dateTime ? new Date(e.start.dateTime) : null;
      const end   = e.end?.dateTime   ? new Date(e.end.dateTime)   : null;

      // Duration in minutes
      let duration = 30;
      if (start && end) {
        duration = Math.round((end - start) / 60000);
        duration = Math.max(5, Math.min(duration, 180)); // clamp 5–180
      }

      // Determine section from start hour
      let section = "morning";
      if (start) {
        const h = start.getHours();
        if (h >= 12 && h < 17) section = "afternoon";
        else if (h >= 17)      section = "evening";
      }

      // Guess tag from title keywords
      const title = e.summary || "Untitled event";
      const lower = title.toLowerCase();
      let tag = "work";
      if (/meet|call|sync|standup|1:1|interview|chat/.test(lower))   tag = "comms";
      if (/gym|run|walk|yoga|meditation|lunch|break|health/.test(lower)) tag = "wellness";
      if (/learn|read|course|study|book|research/.test(lower))       tag = "growth";

      return {
        id:          `gcal_${e.id}`,
        title,
        done:        false,
        duration,
        tag,
        section,
        source:      "google_calendar",
        sourceIcon:  "📅",
        originalId:  e.id,
        startTime:   start ? start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : null,
        description: e.description || null,
        location:    e.location    || null,
        htmlLink:    e.htmlLink    || null,
      };
    });
}

// ─── ALSO FETCH NEXT 7 DAYS (for upcoming view) ─────────────────────────────
export async function fetchUpcomingCalendarEvents(days = 7) {
  if (!accessToken && !restoreGoogleSession()) throw new Error("Not authenticated");

  const now    = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);

  const resp = await window.gapi.client.calendar.events.list({
    calendarId:   "primary",
    timeMin:      now.toISOString(),
    timeMax:      future.toISOString(),
    showDeleted:  false,
    singleEvents: true,
    orderBy:      "startTime",
    maxResults:   100,
  });

  return (resp.result.items || []).filter(e => e.status !== "cancelled");
}
