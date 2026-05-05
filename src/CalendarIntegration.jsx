/**
 * CalendarIntegration.jsx
 * Google Calendar connect button + Review & Accept modal
 */
import { useState, useEffect } from "react";
import {
  Calendar, X, CheckCircle, Clock, RefreshCw,
  Link, Unlink, ChevronRight, Coffee, Sun, Moon,
  MapPin, ExternalLink, Loader
} from "lucide-react";
import {
  loadGoogleScripts, googleSignIn, googleSignOut,
  isGoogleConnected, fetchTodayCalendarEvents,
  GOOGLE_CLIENT_ID
} from "./integrationManager";

/* ─── THEME (matches App.jsx) ─────────────────────────────────────────────── */
const T = {
  bg0:"#09090F", bg1:"#111118", bg2:"#18181F", bg3:"#202028",
  border:"rgba(255,255,255,0.07)",
  text1:"#F0EFF8", text2:"#8B8A9E", text3:"#4A4960",
  violet:"#7C3AED", violetMid:"#8B5CF6",
  violetSoft:"rgba(124,58,237,0.14)", violetGlow:"rgba(124,58,237,0.38)",
  coral:"#F97316", coralSoft:"rgba(249,115,22,0.12)",
  green:"#10B981", greenSoft:"rgba(16,185,129,0.12)",
  amber:"#F59E0B", amberSoft:"rgba(245,158,11,0.12)",
  red:"#EF4444", redSoft:"rgba(239,68,68,0.12)",
  gradViolet:"linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)",
  blue:"#3B82F6", blueSoft:"rgba(59,130,246,0.12)",
};

const TAG_META = {
  work:    { bg:"rgba(139,92,246,0.14)", text:"#A78BFA", dot:"#8B5CF6" },
  comms:   { bg:"rgba(59,130,246,0.14)", text:"#93C5FD", dot:"#60A5FA" },
  wellness:{ bg:"rgba(16,185,129,0.14)", text:"#6EE7B7", dot:"#10B981" },
  growth:  { bg:"rgba(245,158,11,0.14)", text:"#FCD34D", dot:"#F59E0B" },
};

const SECTION_META = {
  morning:   { Icon: Coffee, color: T.amber,     label: "Morning"   },
  afternoon: { Icon: Sun,    color: T.coral,     label: "Afternoon" },
  evening:   { Icon: Moon,   color: T.violetMid, label: "Evening"   },
};

/* ─── HELPERS ─────────────────────────────────────────────────────────────── */
function Spinner({ size = 18, color = T.violetMid }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `2px solid rgba(139,92,246,0.2)`,
      borderTopColor: color,
      animation: "spin 0.7s linear infinite", flexShrink: 0
    }}/>
  );
}

function Badge({ tag }) {
  const m = TAG_META[tag] || { bg: T.bg3, text: T.text2, dot: T.text3 };
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: "0.05em",
      padding: "2px 7px", borderRadius: 99, background: m.bg,
      color: m.text, display: "inline-flex", alignItems: "center",
      gap: 3, textTransform: "uppercase"
    }}>
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: m.dot }}/>
      {tag}
    </span>
  );
}

/* ─── EVENT REVIEW CARD ───────────────────────────────────────────────────── */
function EventCard({ event, selected, onToggle, onSectionChange }) {
  const sm = SECTION_META[event.section];
  const SIcon = sm.Icon;
  const [editing, setEditing] = useState(false);

  return (
    <div style={{
      background: selected ? "rgba(124,58,237,0.08)" : T.bg2,
      border: `1px solid ${selected ? T.violetMid + "55" : T.border}`,
      borderRadius: 16, padding: "14px", marginBottom: 8,
      transition: "all 0.2s",
    }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {/* Checkbox */}
        <div
          onClick={onToggle}
          style={{
            width: 22, height: 22, borderRadius: 7, flexShrink: 0,
            border: selected ? "none" : `1.5px solid ${T.text3}`,
            background: selected ? T.gradViolet : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.18s", marginTop: 1
          }}
        >
          {selected && <CheckCircle size={13} color="#fff" strokeWidth={2.5}/>}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: T.text1, lineHeight: 1.3, marginBottom: 4 }}>
            {event.sourceIcon} {event.title}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
            {/* Time */}
            {event.startTime && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: T.text2 }}>
                <Clock size={10} color={T.text3}/>{event.startTime}
              </span>
            )}
            {/* Duration */}
            <span style={{ fontSize: 11, color: T.text3 }}>{event.duration}m</span>
            {/* Tag badge */}
            <Badge tag={event.tag}/>
            {/* Location */}
            {event.location && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: T.text3 }}>
                <MapPin size={9} color={T.text3}/>
                {event.location.slice(0, 24)}{event.location.length > 24 ? "…" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Section chip + edit */}
        <button
          onClick={() => setEditing(!editing)}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            background: `${sm.color}18`, border: `1px solid ${sm.color}44`,
            borderRadius: 10, padding: "4px 9px", cursor: "pointer",
            flexShrink: 0
          }}
        >
          <SIcon size={11} color={sm.color}/>
          <span style={{ fontSize: 10, fontWeight: 700, color: sm.color, textTransform: "capitalize" }}>
            {event.section}
          </span>
        </button>
      </div>

      {/* Section picker (inline edit) */}
      {editing && (
        <div style={{ display: "flex", gap: 6, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
          <p style={{ fontSize: 11, color: T.text3, fontWeight: 600, alignSelf: "center", marginRight: 2 }}>Move to:</p>
          {Object.entries(SECTION_META).map(([key, { Icon, color, label }]) => (
            <button
              key={key}
              onClick={() => { onSectionChange(key); setEditing(false); }}
              style={{
                flex: 1, padding: "7px 4px", borderRadius: 10, border:
                  event.section === key ? `1.5px solid ${color}` : `1px solid ${color}33`,
                background: event.section === key ? `${color}18` : "transparent",
                cursor: "pointer", transition: "all 0.15s"
              }}
            >
              <Icon size={12} color={color} style={{ margin: "0 auto 2px", display: "block" }}/>
              <p style={{ fontSize: 9, fontWeight: 700, color, textTransform: "capitalize" }}>{label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Open in Google Calendar link */}
      {event.htmlLink && (
        <a
          href={event.htmlLink} target="_blank" rel="noopener noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 10, color: T.text3, marginTop: 8, textDecoration: "none"
          }}
        >
          <ExternalLink size={9} color={T.text3}/> Open in Google Calendar
        </a>
      )}
    </div>
  );
}

/* ─── REVIEW MODAL ────────────────────────────────────────────────────────── */
function ReviewModal({ events, onAccept, onDismiss }) {
  const [selected, setSelected] = useState(new Set(events.map(e => e.id)));
  const [localEvents, setLocalEvents] = useState(events);

  const toggle = (id) => setSelected(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const changeSection = (id, section) => {
    setLocalEvents(prev => prev.map(e => e.id === id ? { ...e, section } : e));
  };

  const handleAccept = () => {
    const picked = localEvents.filter(e => selected.has(e.id));
    onAccept(picked);
  };

  const grouped = { morning: [], afternoon: [], evening: [] };
  localEvents.forEach(e => { if (grouped[e.section]) grouped[e.section].push(e); });

  const pickedCount = selected.size;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onDismiss}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(8px)", zIndex: 300,
          animation: "backdropIn 0.2s ease"
        }}
      />

      {/* Sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 430,
        background: T.bg1, borderRadius: "24px 24px 0 0",
        border: `1px solid ${T.border}`,
        padding: "0 0 44px", zIndex: 301,
        animation: "slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1)",
        maxHeight: "88vh", display: "flex", flexDirection: "column"
      }}>
        {/* Handle + Header */}
        <div style={{ padding: "20px 20px 0", flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: T.bg3, margin: "0 auto 18px" }}/>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, background: T.blueSoft,
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <Calendar size={16} color={T.blue}/>
                </div>
                <p style={{ fontSize: 18, fontWeight: 800, color: T.text1, letterSpacing: "-0.4px" }}>
                  Google Calendar
                </p>
              </div>
              <p style={{ fontSize: 12, color: T.text2 }}>
                {localEvents.length} events found today · Select which to add
              </p>
            </div>
            <button
              onClick={onDismiss}
              style={{
                width: 32, height: 32, borderRadius: 99, border: `1px solid ${T.border}`,
                background: T.bg2, cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", flexShrink: 0
              }}
            ><X size={15} color={T.text2}/></button>
          </div>

          {/* Select all */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 12px", background: T.bg2, borderRadius: 12,
            border: `1px solid ${T.border}`, marginBottom: 12
          }}>
            <p style={{ fontSize: 13, color: T.text1, fontWeight: 600 }}>
              {pickedCount} of {localEvents.length} selected
            </p>
            <button
              onClick={() =>
                selected.size === localEvents.length
                  ? setSelected(new Set())
                  : setSelected(new Set(localEvents.map(e => e.id)))
              }
              style={{
                fontSize: 12, fontWeight: 700, color: T.violetMid,
                background: T.violetSoft, border: "none", borderRadius: 8,
                padding: "5px 12px", cursor: "pointer"
              }}
            >
              {selected.size === localEvents.length ? "Deselect all" : "Select all"}
            </button>
          </div>
        </div>

        {/* Scrollable events list */}
        <div style={{ overflowY: "auto", padding: "0 20px", flex: 1 }}>
          {Object.entries(grouped).map(([section, evts]) => {
            if (evts.length === 0) return null;
            const sm = SECTION_META[section];
            const SIcon = sm.Icon;
            return (
              <div key={section} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <SIcon size={12} color={sm.color}/>
                  <p style={{
                    fontSize: 11, fontWeight: 700, color: sm.color,
                    letterSpacing: "0.07em", textTransform: "uppercase"
                  }}>{sm.label}</p>
                </div>
                {evts.map(e => (
                  <EventCard
                    key={e.id}
                    event={e}
                    selected={selected.has(e.id)}
                    onToggle={() => toggle(e.id)}
                    onSectionChange={(s) => changeSection(e.id, s)}
                  />
                ))}
              </div>
            );
          })}

          {localEvents.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <Calendar size={32} color={T.text3} style={{ margin: "0 auto 12px", display: "block" }}/>
              <p style={{ fontSize: 14, color: T.text2, fontWeight: 600 }}>No events today</p>
              <p style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>Your Google Calendar is clear for today</p>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        {localEvents.length > 0 && (
          <div style={{ padding: "12px 20px 0", flexShrink: 0 }}>
            <button
              onClick={handleAccept}
              disabled={pickedCount === 0}
              style={{
                width: "100%", border: "none", borderRadius: 16, padding: "15px",
                background: pickedCount > 0 ? T.gradViolet : T.bg3,
                color: pickedCount > 0 ? "#fff" : T.text3,
                fontSize: 15, fontWeight: 700,
                cursor: pickedCount > 0 ? "pointer" : "not-allowed",
                transition: "all 0.2s",
                boxShadow: pickedCount > 0 ? `0 8px 24px ${T.violetGlow}` : "none",
              }}
            >
              {pickedCount > 0
                ? `Add ${pickedCount} event${pickedCount > 1 ? "s" : ""} to today →`
                : "Select at least one event"
              }
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── MAIN EXPORT: Integration Connect Card ───────────────────────────────── */
export default function CalendarIntegration({ onAddTasks }) {
  const [scriptsReady, setScriptsReady] = useState(false);
  const [connected,    setConnected]    = useState(false);
  const [syncing,      setSyncing]      = useState(false);
  const [error,        setError]        = useState("");
  const [events,       setEvents]       = useState([]);
  const [showReview,   setShowReview]   = useState(false);
  const [lastSync,     setLastSync]     = useState(null);
  const [configError,  setConfigError]  = useState(false);

  // Check if client ID is configured
  useEffect(() => {
    if (GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com") {
      setConfigError(true);
    }
  }, []);

  // Load Google scripts on mount
  useEffect(() => {
    if (configError) return;
    loadGoogleScripts()
      .then(() => {
        setScriptsReady(true);
        // Restore previous session
        if (isGoogleConnected()) setConnected(true);
      })
      .catch(() => setError("Failed to load Google scripts."));
  }, [configError]);

  const handleConnect = async () => {
    setError("");
    setSyncing(true);
    try {
      await googleSignIn();
      setConnected(true);
      await handleSync(true);
    } catch (e) {
      setError("Connection failed. Please try again.");
      setConnected(false);
    }
    setSyncing(false);
  };

  const handleSync = async (skipLoadingState = false) => {
    if (!skipLoadingState) setSyncing(true);
    setError("");
    try {
      const evts = await fetchTodayCalendarEvents();
      setEvents(evts);
      setLastSync(new Date());
      if (evts.length > 0) setShowReview(true);
      else setError("No events found for today.");
    } catch (e) {
      setError("Sync failed. Try reconnecting.");
      if (e.message === "Not authenticated") setConnected(false);
    }
    if (!skipLoadingState) setSyncing(false);
  };

  const handleDisconnect = () => {
    googleSignOut();
    setConnected(false);
    setEvents([]);
    setLastSync(null);
    setError("");
  };

  const handleAccept = (picked) => {
    onAddTasks(picked);
    setShowReview(false);
    setEvents([]);
  };

  // ── NOT CONFIGURED YET ──
  if (configError) {
    return (
      <div style={{
        background: T.bg2, borderRadius: 18,
        border: `1px solid ${T.amber}33`, padding: "16px",
        marginBottom: 12
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11, background: T.amberSoft,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
          }}>
            <Calendar size={18} color={T.amber}/>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: T.text1 }}>Google Calendar</p>
            <p style={{ fontSize: 12, color: T.amber, marginTop: 1 }}>⚠ Setup required</p>
          </div>
        </div>
        <p style={{ fontSize: 12, color: T.text2, lineHeight: 1.6 }}>
          Add your Google OAuth Client ID to{" "}
          <code style={{ background: T.bg3, padding: "1px 6px", borderRadius: 5, fontSize: 11, color: T.violetMid }}>
            src/integrationManager.js
          </code>{" "}
          to enable calendar sync.
        </p>
      </div>
    );
  }

  // ── CONNECTED STATE ──
  if (connected) {
    return (
      <>
        <div style={{
          background: T.bg2, borderRadius: 18,
          border: `1px solid ${T.green}33`, padding: "16px",
          marginBottom: 12
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, background: T.greenSoft,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
            }}>
              <Calendar size={18} color={T.green}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: T.text1 }}>Google Calendar</p>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: T.green, background: T.greenSoft,
                  padding: "2px 7px", borderRadius: 99, letterSpacing: "0.05em"
                }}>CONNECTED</span>
              </div>
              {lastSync && (
                <p style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>
                  Last synced {lastSync.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
            {/* Sync + Disconnect */}
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => handleSync()}
                disabled={syncing}
                style={{
                  width: 34, height: 34, borderRadius: 10, border: `1px solid ${T.border}`,
                  background: T.bg3, cursor: syncing ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}
              >
                {syncing
                  ? <Spinner size={14}/>
                  : <RefreshCw size={14} color={T.text2}/>
                }
              </button>
              <button
                onClick={handleDisconnect}
                style={{
                  width: 34, height: 34, borderRadius: 10, border: `1px solid ${T.red}33`,
                  background: T.redSoft, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}
              >
                <Unlink size={14} color={T.red}/>
              </button>
            </div>
          </div>

          {error && (
            <p style={{
              fontSize: 12, color: T.red, marginTop: 10, background: T.redSoft,
              padding: "8px 12px", borderRadius: 10
            }}>{error}</p>
          )}

          {/* Pull today's events CTA */}
          <button
            onClick={() => handleSync()}
            disabled={syncing}
            style={{
              width: "100%", marginTop: 12, border: "none", borderRadius: 12,
              padding: "11px", background: T.violetSoft,
              color: T.violetMid, fontSize: 13, fontWeight: 700,
              cursor: syncing ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.18s"
            }}
          >
            {syncing ? <Spinner size={14}/> : <Calendar size={14} color={T.violetMid}/>}
            {syncing ? "Fetching events…" : "Pull today's events"}
          </button>
        </div>

        {showReview && (
          <ReviewModal
            events={events}
            onAccept={handleAccept}
            onDismiss={() => setShowReview(false)}
          />
        )}
      </>
    );
  }

  // ── DISCONNECTED STATE ──
  return (
    <div style={{
      background: T.bg2, borderRadius: 18,
      border: `1px solid ${T.border}`, padding: "16px",
      marginBottom: 12, opacity: scriptsReady ? 1 : 0.6,
      transition: "opacity 0.3s"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, background: T.blueSoft,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
        }}>
          {scriptsReady ? <Calendar size={18} color={T.blue}/> : <Loader size={18} color={T.text3}/>}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: T.text1 }}>Google Calendar</p>
          <p style={{ fontSize: 12, color: T.text2, marginTop: 1 }}>
            Auto-import today's events as tasks
          </p>
        </div>
        <ChevronRight size={16} color={T.text3}/>
      </div>

      {error && (
        <p style={{
          fontSize: 12, color: T.red, marginBottom: 10, background: T.redSoft,
          padding: "8px 12px", borderRadius: 10
        }}>{error}</p>
      )}

      <button
        onClick={handleConnect}
        disabled={!scriptsReady || syncing}
        style={{
          width: "100%", border: "none", borderRadius: 12, padding: "12px",
          background: scriptsReady ? T.gradViolet : T.bg3,
          color: scriptsReady ? "#fff" : T.text3,
          fontSize: 13, fontWeight: 700,
          cursor: !scriptsReady || syncing ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          boxShadow: scriptsReady ? `0 6px 20px ${T.violetGlow}` : "none",
          transition: "all 0.2s"
        }}
      >
        {syncing ? <Spinner size={14} color="#fff"/> : <Link size={14} color={scriptsReady ? "#fff" : T.text3}/>}
        {syncing ? "Connecting…" : scriptsReady ? "Connect Google Calendar" : "Loading…"}
      </button>

      <p style={{ fontSize: 11, color: T.text3, textAlign: "center", marginTop: 10 }}>
        Read-only access · Events stay private
      </p>
    </div>
  );
}
