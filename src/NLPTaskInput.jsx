// src/NLPTaskInput.jsx
// Natural language task input — parses free text like
// "Call team for 30 min this morning" → title, section, duration, tag chips.

import { useState, useRef, useEffect } from "react";
import { Sparkles, Clock, Sun, Moon, Coffee, X, Plus, Wand2 } from "lucide-react";

/* ─── Theme (mirrors App.jsx T object) ──────────────────────────────────── */
const T = {
  bg0: "#09090F", bg1: "#111118", bg2: "#18181F", bg3: "#202028",
  border: "rgba(255,255,255,0.07)",
  text1: "#F0EFF8", text2: "#8B8A9E", text3: "#4A4960",
  violet: "#7C3AED", violetMid: "#8B5CF6",
  violetSoft: "rgba(124,58,237,0.14)", violetGlow: "rgba(124,58,237,0.38)",
  coral: "#F97316", coralSoft: "rgba(249,115,22,0.12)",
  green: "#10B981", greenSoft: "rgba(16,185,129,0.12)",
  amber: "#F59E0B", amberSoft: "rgba(245,158,11,0.12)",
  red: "#EF4444",
  gradViolet: "linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)",
};

const TAG_META = {
  work:     { bg: "rgba(139,92,246,0.18)", text: "#A78BFA", dot: "#8B5CF6" },
  comms:    { bg: "rgba(59,130,246,0.18)",  text: "#93C5FD", dot: "#60A5FA" },
  wellness: { bg: "rgba(16,185,129,0.18)",  text: "#6EE7B7", dot: "#10B981" },
  growth:   { bg: "rgba(245,158,11,0.18)",  text: "#FCD34D", dot: "#F59E0B" },
};

const SECTION_META = {
  morning:   { label: "Morning",   Icon: Coffee, color: T.amber },
  afternoon: { label: "Afternoon", Icon: Sun,    color: T.coral },
  evening:   { label: "Evening",   Icon: Moon,   color: T.violetMid },
};

/* ─── Placeholder examples cycling ──────────────────────────────────────── */
const PLACEHOLDERS = [
  "Review PRD for 45 min this afternoon…",
  "Morning standup for 15 min…",
  "Gym session, 1 hour, wellness…",
  "Write weekly report in evening…",
  "Call with client for 30 min…",
  "Read book for 20 min tonight…",
];

/* ─── NLP PARSER ─────────────────────────────────────────────────────────── */

const SECTION_PATTERNS = {
  morning:   /\b(morning|early|breakfast|am\b|dawn|today morning)\b/i,
  afternoon: /\b(afternoon|midday|noon|lunch|pm\b|mid-day)\b/i,
  evening:   /\b(evening|night|tonight|dusk|after work|late)\b/i,
};

const TAG_PATTERNS = {
  work:     /\b(work|meeting|standup|review|report|email|project|task|client|call|presentation|sprint|deploy|code|develop|design|strategy|plan|brief|proposal)\b/i,
  comms:    /\b(message|chat|reply|respond|text|slack|whatsapp|dm|communicate|follow.?up|reach out|ping|call)\b/i,
  wellness: /\b(gym|workout|exercise|run|walk|yoga|meditate|sleep|rest|health|water|diet|stretch|jog|swim|cycle|breathe)\b/i,
  growth:   /\b(read|book|course|learn|study|practice|research|podcast|journal|write|blog|skill|grow|workshop|tutorial)\b/i,
};

// Duration: "30 min", "1 hour", "45 minutes", "1.5h", "2hr"
const DURATION_PATTERN = /\b(\d+(?:\.\d+)?)\s*(hours?|hrs?|h\b|minutes?|mins?|m\b)/i;

function parseNL(text) {
  if (!text.trim()) return null;

  let section = null;
  let duration = null;
  let tag = null;
  let remaining = text;

  // Extract section
  for (const [s, re] of Object.entries(SECTION_PATTERNS)) {
    if (re.test(remaining)) {
      section = s;
      remaining = remaining.replace(re, " ").replace(/\s{2,}/g, " ").trim();
      break;
    }
  }

  // Extract duration
  const durMatch = remaining.match(DURATION_PATTERN);
  if (durMatch) {
    const num = parseFloat(durMatch[1]);
    const unit = durMatch[2].toLowerCase();
    duration = unit.startsWith("h") ? Math.round(num * 60) : Math.round(num);
    remaining = remaining.replace(durMatch[0], " ").replace(/\s{2,}/g, " ").trim();
  }

  // Extract tag (scan original text for context keywords)
  for (const [t, re] of Object.entries(TAG_PATTERNS)) {
    if (re.test(text)) {
      tag = t;
      break;
    }
  }

  // Clean up connecting words that are left dangling
  const cleanup = /\b(for|in the|in|at|this|the|a|an|during|around|by|to)\s*$/i;
  let title = remaining.replace(cleanup, "").trim();

  // Capitalise first letter
  if (title) title = title.charAt(0).toUpperCase() + title.slice(1);

  return {
    title:    title || text.trim(),
    section:  section  || guessSection(),
    duration: duration || 20,
    tag:      tag      || "work",
  };
}

/** Smart default: guess section from current time */
function guessSection() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

/* ─── CHIP ───────────────────────────────────────────────────────────────── */
function Chip({ label, color, bg, dot, onClear, small }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: small ? "3px 8px" : "4px 10px",
      borderRadius: 99,
      background: bg,
      color: color,
      fontSize: small ? 10 : 11,
      fontWeight: 700,
      letterSpacing: "0.04em",
      fontFamily: "Outfit, sans-serif",
      whiteSpace: "nowrap",
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: "50%", background: dot, flexShrink: 0 }} />}
      {label}
      {onClear && (
        <button onClick={onClear} style={{
          border: "none", background: "transparent", cursor: "pointer",
          display: "flex", alignItems: "center", padding: 0, marginLeft: 2,
          color: color, opacity: 0.6,
        }}>
          <X size={9} />
        </button>
      )}
    </span>
  );
}

/* ─── SECTION CHIP ───────────────────────────────────────────────────────── */
function SectionChip({ section, onClear }) {
  const { label, Icon, color } = SECTION_META[section];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "4px 10px", borderRadius: 99,
      background: `${color}18`, color, fontSize: 11, fontWeight: 700,
      letterSpacing: "0.04em", fontFamily: "Outfit, sans-serif",
    }}>
      <Icon size={10} color={color} />
      {label}
      {onClear && (
        <button onClick={onClear} style={{
          border: "none", background: "transparent", cursor: "pointer",
          display: "flex", alignItems: "center", padding: 0, marginLeft: 2,
          color, opacity: 0.6,
        }}>
          <X size={9} />
        </button>
      )}
    </span>
  );
}

/* ─── DURATION CHIP ──────────────────────────────────────────────────────── */
function DurationChip({ duration, onClear }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "4px 10px", borderRadius: 99,
      background: "rgba(255,255,255,0.06)", color: T.text2,
      fontSize: 11, fontWeight: 700, fontFamily: "Outfit, sans-serif",
    }}>
      <Clock size={10} color={T.text2} />
      {duration >= 60 ? `${duration / 60}h` : `${duration}m`}
      {onClear && (
        <button onClick={onClear} style={{
          border: "none", background: "transparent", cursor: "pointer",
          display: "flex", alignItems: "center", padding: 0, marginLeft: 2,
          color: T.text2, opacity: 0.6,
        }}>
          <X size={9} />
        </button>
      )}
    </span>
  );
}

/* ─── EDITABLE SECTION PICKER ────────────────────────────────────────────── */
function SectionPicker({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {Object.entries(SECTION_META).map(([key, { label, Icon, color }]) => {
        const active = value === key;
        return (
          <button key={key} onClick={() => onChange(key)} style={{
            flex: 1, padding: "8px 4px", borderRadius: 12,
            border: active ? `1.5px solid ${color}` : `1px solid ${T.border}`,
            background: active ? `${color}18` : T.bg2,
            cursor: "pointer", transition: "all 0.18s",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          }}>
            <Icon size={13} color={active ? color : T.text3} />
            <span style={{ fontSize: 10, fontWeight: 600, color: active ? color : T.text3 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── DURATION PICKER ────────────────────────────────────────────────────── */
const DUR_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];
function DurationPicker({ value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {DUR_OPTIONS.map(d => {
        const active = value === d;
        return (
          <button key={d} onClick={() => onChange(d)} style={{
            padding: "6px 12px", borderRadius: 10,
            border: active ? `1.5px solid ${T.violetMid}` : `1px solid ${T.border}`,
            background: active ? T.violetSoft : T.bg2,
            color: active ? T.violetMid : T.text2,
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            transition: "all 0.15s", fontFamily: "Outfit, sans-serif",
          }}>
            {d >= 60 ? `${d / 60}h` : `${d}m`}
          </button>
        );
      })}
    </div>
  );
}

/* ─── TAG PICKER ─────────────────────────────────────────────────────────── */
function TagPicker({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {Object.entries(TAG_META).map(([key, { bg, text, dot }]) => {
        const active = value === key;
        return (
          <button key={key} onClick={() => onChange(key)} style={{
            flex: 1, padding: "8px 4px", borderRadius: 12,
            border: active ? `1.5px solid ${dot}` : `1px solid ${T.border}`,
            background: active ? bg : T.bg2,
            cursor: "pointer", transition: "all 0.18s",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: active ? dot : T.text3 }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: active ? text : T.text3, textTransform: "capitalize" }}>{key}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── SPINNER ────────────────────────────────────────────────────────────── */
function Spinner({ color = T.violetMid, size = 16 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `2px solid ${T.violetSoft}`, borderTopColor: color,
      animation: "nlp-spin 0.7s linear infinite", flexShrink: 0,
    }} />
  );
}

const SPIN_CSS = `@keyframes nlp-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes nlp-fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes nlp-pulse{0%,100%{opacity:1}50%{opacity:0.4}}`;

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function NLPTaskInput({ onAdd, style = {} }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const parseTimer = useRef(null);

  // Cycle placeholder text
  useEffect(() => {
    const id = setInterval(() => {
      if (!focused && !text) {
        setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length);
      }
    }, 3000);
    return () => clearInterval(id);
  }, [focused, text]);

  // Debounced parse on text change
  useEffect(() => {
    clearTimeout(parseTimer.current);
    if (!text.trim()) { setParsed(null); return; }
    parseTimer.current = setTimeout(() => {
      setParsed(parseNL(text));
    }, 180);
    return () => clearTimeout(parseTimer.current);
  }, [text]);

  const handleAdd = async () => {
    if (!parsed || !parsed.title.trim() || saving) return;
    setSaving(true);
    try {
      await onAdd(parsed.section, {
        title: parsed.title,
        done: false,
        duration: parsed.duration,
        tag: parsed.tag,
        section: parsed.section,
      });
      setText("");
      setParsed(null);
      setShowDetails(false);
    } catch (e) {
      console.error("NLPTaskInput add error:", e);
    }
    setSaving(false);
  };

  const hasInput = text.trim().length > 0;
  const tagMeta = parsed ? TAG_META[parsed.tag] : null;

  return (
    <>
      <style>{SPIN_CSS}</style>
      <div style={{
        background: T.bg1,
        borderRadius: 20,
        border: `1px solid ${focused ? T.violetMid + "66" : T.border}`,
        padding: "14px 16px",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxShadow: focused ? `0 0 0 3px ${T.violetSoft}` : "none",
        ...style,
      }}>
        {/* Input row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            background: hasInput ? T.violetSoft : T.bg2,
            border: `1px solid ${hasInput ? T.violetMid + "44" : T.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s",
          }}>
            {hasInput
              ? <Wand2 size={15} color={T.violetMid} />
              : <Plus size={15} color={T.text3} />}
          </div>

          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={e => {
              if (e.key === "Enter" && parsed) handleAdd();
              if (e.key === "Escape") { setText(""); setParsed(null); }
            }}
            placeholder={PLACEHOLDERS[placeholderIdx]}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              fontSize: 14, fontWeight: 500, color: T.text1,
              fontFamily: "Outfit, sans-serif",
              caretColor: T.violetMid,
            }}
          />

          {hasInput && (
            <button onClick={() => { setText(""); setParsed(null); inputRef.current?.focus(); }}
              style={{
                border: "none", background: T.bg2, cursor: "pointer",
                width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              <X size={12} color={T.text3} />
            </button>
          )}
        </div>

        {/* Live parse preview chips */}
        {parsed && (
          <div style={{
            marginTop: 10,
            display: "flex", alignItems: "center", gap: 6,
            flexWrap: "wrap",
            animation: "nlp-fadeUp 0.22s ease",
          }}>
            <Sparkles size={11} color={T.violetMid} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: T.text3, fontWeight: 600, marginRight: 2 }}>Detected:</span>

            {/* Tag chip */}
            <Chip
              label={parsed.tag.charAt(0).toUpperCase() + parsed.tag.slice(1)}
              color={tagMeta.text}
              bg={tagMeta.bg}
              dot={tagMeta.dot}
              onClear={() => {
                setShowDetails(true);
                inputRef.current?.focus();
              }}
            />

            {/* Section chip */}
            <SectionChip
              section={parsed.section}
              onClear={() => {
                setShowDetails(true);
                inputRef.current?.focus();
              }}
            />

            {/* Duration chip */}
            <DurationChip
              duration={parsed.duration}
              onClear={() => {
                setShowDetails(true);
                inputRef.current?.focus();
              }}
            />

            {/* Edit toggle */}
            <button
              onClick={() => setShowDetails(v => !v)}
              style={{
                marginLeft: "auto", border: `1px solid ${T.border}`,
                borderRadius: 8, padding: "3px 8px",
                background: showDetails ? T.violetSoft : T.bg2,
                color: showDetails ? T.violetMid : T.text3,
                fontSize: 10, fontWeight: 600, cursor: "pointer",
                fontFamily: "Outfit, sans-serif",
              }}
            >
              {showDetails ? "▲ collapse" : "✎ edit"}
            </button>
          </div>
        )}

        {/* Editable detail pickers (collapsible) */}
        {parsed && showDetails && (
          <div style={{
            marginTop: 14, paddingTop: 14,
            borderTop: `1px solid ${T.border}`,
            display: "flex", flexDirection: "column", gap: 12,
            animation: "nlp-fadeUp 0.22s ease",
          }}>
            {/* Section */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: T.text3, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 7 }}>
                Time of day
              </p>
              <SectionPicker
                value={parsed.section}
                onChange={v => setParsed(p => ({ ...p, section: v }))}
              />
            </div>

            {/* Duration */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: T.text3, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 7 }}>
                Duration
              </p>
              <DurationPicker
                value={parsed.duration}
                onChange={v => setParsed(p => ({ ...p, duration: v }))}
              />
            </div>

            {/* Tag */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: T.text3, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 7 }}>
                Category
              </p>
              <TagPicker
                value={parsed.tag}
                onChange={v => setParsed(p => ({ ...p, tag: v }))}
              />
            </div>
          </div>
        )}

        {/* Add button — only shown when there's something parsed */}
        {parsed && (
          <button
            onClick={handleAdd}
            disabled={saving || !parsed.title.trim()}
            style={{
              marginTop: 14, width: "100%",
              border: "none", borderRadius: 14, padding: "13px",
              background: parsed.title.trim() ? T.gradViolet : T.bg3,
              color: parsed.title.trim() ? "#fff" : T.text3,
              fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              boxShadow: parsed.title.trim() ? `0 8px 24px ${T.violetGlow}` : "none",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: "Outfit, sans-serif",
              animation: "nlp-fadeUp 0.25s ease",
            }}
          >
            {saving ? <Spinner color="#fff" /> : <Plus size={15} color="#fff" />}
            {saving ? "Adding…" : `Add "${parsed.title.length > 28 ? parsed.title.slice(0, 28) + "…" : parsed.title}"`}
          </button>
        )}

        {/* Hint text when empty */}
        {!hasInput && (
          <p style={{
            marginTop: 8, fontSize: 11, color: T.text3,
            lineHeight: 1.5, fontFamily: "Outfit, sans-serif",
          }}>
            Type naturally — <span style={{ color: T.violetMid }}>section</span>, <span style={{ color: T.amber }}>time</span> &amp; <span style={{ color: T.green }}>category</span> are auto-detected.
          </p>
        )}
      </div>
    </>
  );
}
