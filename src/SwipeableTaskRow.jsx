import { useState, useRef } from "react";
import { CheckCircle, Clock, X, RotateCcw } from "lucide-react";

const T = {
  bg1: "#111118", bg2: "#18181F", bg3: "#202028",
  border: "rgba(255,255,255,0.07)",
  text1: "#F0EFF8", text2: "#8B8A9E", text3: "#4A4960",
  violet: "#7C3AED", violetMid: "#8B5CF6",
  gradViolet: "linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)",
  green: "#10B981", greenSoft: "rgba(16,185,129,0.15)",
  red: "#EF4444", redSoft: "rgba(239,68,68,0.15)",
  amber: "#F59E0B",
};

const TAG_META = {
  work:    { bg: "rgba(139,92,246,0.14)", text: "#A78BFA", dot: "#8B5CF6" },
  comms:   { bg: "rgba(59,130,246,0.14)",  text: "#93C5FD", dot: "#60A5FA" },
  wellness:{ bg: "rgba(16,185,129,0.14)",  text: "#6EE7B7", dot: "#10B981" },
  growth:  { bg: "rgba(245,158,11,0.14)",  text: "#FCD34D", dot: "#F59E0B" },
};

function Badge({ tag }) {
  const m = TAG_META[tag] || { bg: T.bg3, text: T.text2, dot: T.text3 };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", padding: "3px 9px", borderRadius: 99, background: m.bg, color: m.text, display: "inline-flex", alignItems: "center", gap: 4, textTransform: "uppercase" }}>
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
      {tag}
    </span>
  );
}

const SWIPE_THRESHOLD = 60; // px before action triggers

/**
 * SwipeableTaskRow
 * - Swipe RIGHT  → complete
 * - Swipe LEFT   → reveal delete / reschedule
 */
export default function SwipeableTaskRow({ task, onToggle, onDelete, onReschedule, compact = false }) {
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [revealed, setRevealed] = useState(false); // left-swipe action buttons visible
  const startX = useRef(null);
  const containerRef = useRef(null);

  /* ── touch handlers ── */
  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const onTouchMove = (e) => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    // Clamp: allow full right, but only -120px left
    setOffsetX(Math.max(-120, Math.min(dx, containerRef.current?.offsetWidth * 0.5 || 180)));
  };

  const onTouchEnd = () => {
    setSwiping(false);
    if (offsetX > SWIPE_THRESHOLD) {
      // Right swipe → complete
      onToggle(task.id, task.done);
      setOffsetX(0);
    } else if (offsetX < -SWIPE_THRESHOLD) {
      // Left swipe → reveal actions
      setRevealed(true);
      setOffsetX(-120);
    } else {
      setOffsetX(0);
      setRevealed(false);
    }
    startX.current = null;
  };

  const close = () => { setOffsetX(0); setRevealed(false); };

  /* ── action colour overlay ── */
  const rightAlpha = Math.min(offsetX / SWIPE_THRESHOLD, 1);
  const leftAlpha  = Math.min(-offsetX / SWIPE_THRESHOLD, 1);

  return (
    <div ref={containerRef} style={{ position: "relative", overflow: "hidden", borderBottom: `1px solid ${T.border}` }}>

      {/* Right action bg (complete — green) */}
      {offsetX > 0 && (
        <div style={{ position: "absolute", inset: 0, background: T.greenSoft, display: "flex", alignItems: "center", paddingLeft: 20, opacity: rightAlpha }}>
          <CheckCircle size={20} color={T.green} />
          <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 700, color: T.green }}>Complete</span>
        </div>
      )}

      {/* Left action bg (delete/reschedule — red) */}
      {offsetX <= 0 && (
        <div style={{ position: "absolute", inset: 0, background: T.redSoft, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 16, gap: 8, opacity: leftAlpha }}>
          {revealed ? (
            <>
              <button onClick={() => { onReschedule(task); close(); }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "rgba(245,158,11,0.18)", border: `1px solid ${T.amber}44`, borderRadius: 12, padding: "8px 12px", cursor: "pointer" }}>
                <RotateCcw size={16} color={T.amber} />
                <span style={{ fontSize: 10, fontWeight: 700, color: T.amber }}>Reschedule</span>
              </button>
              <button onClick={() => { onDelete(task.id); close(); }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: T.redSoft, border: `1px solid ${T.red}44`, borderRadius: 12, padding: "8px 12px", cursor: "pointer" }}>
                <X size={16} color={T.red} />
                <span style={{ fontSize: 10, fontWeight: 700, color: T.red }}>Delete</span>
              </button>
              <button onClick={close}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "rgba(255,255,255,0.06)", border: `1px solid ${T.border}`, borderRadius: 12, padding: "8px 12px", cursor: "pointer" }}>
                <X size={16} color={T.text3} />
                <span style={{ fontSize: 10, fontWeight: 700, color: T.text3 }}>Cancel</span>
              </button>
            </>
          ) : (
            <><X size={18} color={T.red} /><span style={{ fontSize: 13, fontWeight: 700, color: T.red }}>Delete</span></>
          )}
        </div>
      )}

      {/* Task content — slides */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: compact ? "10px 0" : "13px 0",
          opacity: task.done ? 0.38 : 1,
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? "none" : "transform 0.3s cubic-bezier(0.34,1.2,0.64,1)",
          background: T.bg1,
          cursor: "grab",
          userSelect: "none",
        }}
      >
        {/* Checkbox */}
        <div
          onClick={() => onToggle(task.id, task.done)}
          style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, border: task.done ? "none" : `1.5px solid ${T.text3}`, background: task.done ? "linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", cursor: "pointer" }}
        >
          {task.done && <CheckCircle size={13} color="#fff" strokeWidth={2.5} />}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: T.text1, textDecoration: task.done ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.4 }}>{task.title}</p>
          {!compact && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
              <Clock size={11} color={T.text3} />
              <span style={{ fontSize: 11, color: T.text3 }}>{task.duration}m</span>
            </div>
          )}
        </div>

        {!compact && <Badge tag={task.tag} />}

        {/* Swipe hint */}
        {!task.done && !revealed && (
          <span style={{ fontSize: 9, color: T.text3, flexShrink: 0, paddingRight: 2 }}>⟵ ⟶</span>
        )}
      </div>
    </div>
  );
}
