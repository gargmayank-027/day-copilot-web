// src/MorningSuggestions.jsx
// Shows when user opens app on a new day
// Displays AI-generated task suggestions based on patterns + history
// User can accept all, pick individually, or dismiss

import { useState } from "react";
import {
  Sparkles, Check, X, ChevronRight, Clock,
  RotateCcw, Coffee, Sun, Moon, Zap, Brain
} from "lucide-react";

const T = {
  bg0:"#09090F", bg1:"#111118", bg2:"#18181F", bg3:"#202028",
  border:"rgba(255,255,255,0.07)",
  text1:"#F0EFF8", text2:"#8B8A9E", text3:"#4A4960",
  violetMid:"#8B5CF6", violetSoft:"rgba(124,58,237,0.14)",
  violetGlow:"rgba(124,58,237,0.38)",
  coral:"#F97316", coralSoft:"rgba(249,115,22,0.12)",
  green:"#10B981", greenSoft:"rgba(16,185,129,0.12)",
  amber:"#F59E0B", amberSoft:"rgba(245,158,11,0.12)",
  red:"#EF4444",
  gradViolet:"linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)",
  gradHero:"linear-gradient(135deg,#7C3AED 0%,#9333EA 55%,#F97316 100%)",
};

const TAG_COLORS = {
  work:     { bg:"rgba(139,92,246,0.14)", text:"#A78BFA", dot:"#8B5CF6" },
  comms:    { bg:"rgba(59,130,246,0.14)",  text:"#93C5FD", dot:"#60A5FA" },
  wellness: { bg:"rgba(16,185,129,0.14)",  text:"#6EE7B7", dot:"#10B981" },
  growth:   { bg:"rgba(245,158,11,0.14)",  text:"#FCD34D", dot:"#F59E0B" },
};

const SECTION_ICONS = { morning: Coffee, afternoon: Sun, evening: Moon };
const SECTION_COLORS = { morning: T.amber, afternoon: T.coral, evening: T.violetMid };

const CSS = `
  @keyframes slideDown{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes checkPop{0%{transform:scale(0)}70%{transform:scale(1.2)}100%{transform:scale(1)}}
`;

function SuggestionItem({ suggestion, selected, onToggle, index }) {
  const tag = TAG_COLORS[suggestion.tag] || TAG_COLORS.work;
  const SIcon = SECTION_ICONS[suggestion.section] || Coffee;
  const sColor = SECTION_COLORS[suggestion.section] || T.amber;
  const [pressed, setPressed] = useState(false);

  return (
    <div
      onClick={onToggle}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        padding: "12px 14px", borderRadius: 16, marginBottom: 8,
        border: selected ? `1.5px solid ${T.violetMid}` : `1px solid ${T.border}`,
        background: selected ? T.violetSoft : T.bg2,
        cursor: "pointer",
        transform: pressed ? "scale(0.98)" : "scale(1)",
        transition: "all 0.18s cubic-bezier(0.34,1.56,0.64,1)",
        animation: `fadeIn 0.3s ease ${index * 0.06}s both`,
      }}
    >
      {/* Checkbox */}
      <div style={{
        width: 22, height: 22, borderRadius: 7, flexShrink: 0, marginTop: 1,
        border: selected ? "none" : `1.5px solid ${T.text3}`,
        background: selected ? T.gradViolet : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.2s",
      }}>
        {selected && (
          <Check size={13} color="#fff" strokeWidth={3}
            style={{ animation: "checkPop 0.25s ease" }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: T.text1, lineHeight: 1.3 }}>
            {suggestion.title}
          </p>
          {suggestion.isRecurring && (
            <span style={{ fontSize: 9, fontWeight: 700, color: T.green, background: T.greenSoft, padding: "1px 6px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>
              recurring
            </span>
          )}
        </div>
        <p style={{ fontSize: 11, color: T.text3, lineHeight: 1.4, marginBottom: 6 }}>
          {suggestion.reason}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Section */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <SIcon size={11} color={sColor} />
            <span style={{ fontSize: 11, color: sColor, fontWeight: 600, textTransform: "capitalize" }}>{suggestion.section}</span>
          </div>
          {/* Duration */}
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Clock size={11} color={T.text3} />
            <span style={{ fontSize: 11, color: T.text3 }}>{suggestion.duration}m</span>
          </div>
          {/* Tag */}
          <span style={{ fontSize: 9, fontWeight: 700, color: tag.text, background: tag.bg, padding: "2px 7px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {suggestion.tag}
          </span>
        </div>
      </div>

      {/* Confidence bar */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: suggestion.confidence >= 70 ? T.green : suggestion.confidence >= 50 ? T.amber : T.text3 }}>
          {suggestion.confidence}%
        </span>
        <div style={{ width: 32, height: 3, borderRadius: 99, background: T.bg3, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 99, width: `${suggestion.confidence}%`, background: suggestion.confidence >= 70 ? T.green : suggestion.confidence >= 50 ? T.amber : T.text3 }} />
        </div>
      </div>
    </div>
  );
}

export default function MorningSuggestions({ suggestions, userName, onAccept, onDismiss, loading }) {
  const [selected, setSelected] = useState(() =>
    new Set(suggestions.map((_, i) => i))
  );
  const [accepting, setAccepting] = useState(false);

  const toggleItem = (i) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === suggestions.length) setSelected(new Set());
    else setSelected(new Set(suggestions.map((_, i) => i)));
  };

  const handleAccept = async () => {
    setAccepting(true);
    const picked = suggestions.filter((_, i) => selected.has(i));
    await onAccept(picked);
    setAccepting(false);
  };

  const now = new Date();
  const greet = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" });

  if (loading) {
    return (
      <div style={{ background: T.bg1, borderRadius: 22, border: `1px solid ${T.border}`, overflow: "hidden", marginBottom: 16, animation: "slideDown 0.3s ease" }}>
        <style>{CSS}</style>
        {/* Gradient header */}
        <div style={{ background: T.gradViolet, padding: "20px 20px 18px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={18} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>{greet}, {userName}!</p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>Building your day plan...</p>
            </div>
          </div>
        </div>
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 72, borderRadius: 14, background: T.bg2, border: `1px solid ${T.border}`, animation: `fadeIn 0.3s ease ${i * 0.1}s both` }} />
          ))}
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: T.violetMid, animation: `fadeIn 0.8s ease ${i * 0.2}s infinite alternate` }} />
              ))}
              <span style={{ fontSize: 12, color: T.text2 }}>Analysing your patterns...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!suggestions.length) return null;

  return (
    <div style={{ background: T.bg1, borderRadius: 22, border: `1px solid ${T.border}`, overflow: "hidden", marginBottom: 16, animation: "slideDown 0.35s cubic-bezier(0.34,1.2,0.64,1)" }}>
      <style>{CSS}</style>

      {/* Gradient header */}
      <div style={{ background: T.gradViolet, padding: "20px 20px 18px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Sparkles size={18} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>{greet}, {userName}!</p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>{dateStr}</p>
            </div>
          </div>
          <button onClick={onDismiss} style={{ border: "none", background: "rgba(255,255,255,0.12)", borderRadius: 99, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <X size={13} color="rgba(255,255,255,0.8)" />
          </button>
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 10, lineHeight: 1.5 }}>
          Here's your AI-planned day based on your patterns. Pick what works for you.
        </p>
      </div>

      {/* Suggestion list */}
      <div style={{ padding: "16px 14px 14px" }}>
        {/* Select all row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {suggestions.length} suggestions · {selected.size} selected
          </span>
          <button onClick={toggleAll} style={{ border: `1px solid ${T.border}`, background: T.bg2, borderRadius: 99, padding: "4px 12px", cursor: "pointer", fontSize: 11, fontWeight: 600, color: T.text2 }}>
            {selected.size === suggestions.length ? "Deselect all" : "Select all"}
          </button>
        </div>

        {suggestions.map((s, i) => (
          <SuggestionItem
            key={i}
            index={i}
            suggestion={s}
            selected={selected.has(i)}
            onToggle={() => toggleItem(i)}
          />
        ))}

        {/* CTA row */}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={onDismiss} style={{ flex: 1, border: `1px solid ${T.border}`, borderRadius: 14, padding: "12px", background: T.bg2, color: T.text2, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Skip
          </button>
          <button
            onClick={handleAccept}
            disabled={accepting || selected.size === 0}
            style={{
              flex: 3, border: "none", borderRadius: 14, padding: "12px",
              background: selected.size > 0 ? T.gradViolet : T.bg3,
              color: selected.size > 0 ? "#fff" : T.text3,
              fontSize: 14, fontWeight: 700, cursor: accepting || selected.size === 0 ? "not-allowed" : "pointer",
              boxShadow: selected.size > 0 ? `0 6px 20px ${T.violetGlow}` : "none",
              transition: "all 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {accepting ? (
              <>
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.6s linear infinite" }} />
                Adding tasks...
              </>
            ) : (
              <>
                <Zap size={15} color={selected.size > 0 ? "#fff" : T.text3} />
                Start my day ({selected.size} tasks)
              </>
            )}
          </button>
        </div>

        <p style={{ fontSize: 11, color: T.text3, textAlign: "center", marginTop: 10 }}>
          Confidence scores based on your past behaviour
        </p>
      </div>
    </div>
  );
}
