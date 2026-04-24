import { useState } from "react";
import {
  Zap, Sun, Moon, Sunset, Target, Clock, Coffee,
  Dumbbell, UtensilsCrossed, Users, Briefcase, Heart,
  Brain, Leaf, ChevronRight, ChevronLeft, Check,
  Sparkles, Calendar, Battery, Wind
} from "lucide-react";
import { supabase } from "./lib/supabase";

/* ─── THEME (matches main app) ───────────────────────────────────────────── */
const T = {
  bg0:"#09090F", bg1:"#111118", bg2:"#18181F", bg3:"#202028",
  border:"rgba(255,255,255,0.07)", borderHover:"rgba(255,255,255,0.15)",
  text1:"#F0EFF8", text2:"#8B8A9E", text3:"#4A4960",
  violet:"#7C3AED", violetMid:"#8B5CF6",
  violetSoft:"rgba(124,58,237,0.14)", violetGlow:"rgba(124,58,237,0.38)",
  coral:"#F97316", coralSoft:"rgba(249,115,22,0.12)",
  green:"#10B981", greenSoft:"rgba(16,185,129,0.12)",
  amber:"#F59E0B", amberSoft:"rgba(245,158,11,0.12)",
  gradViolet:"linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)",
  gradHero:"linear-gradient(135deg,#7C3AED 0%,#9333EA 55%,#F97316 100%)",
  gradCoral:"linear-gradient(135deg,#F97316 0%,#EA580C 100%)",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  body{background:#09090F;}
  ::-webkit-scrollbar{display:none;}
  input,select{color-scheme:dark;font-family:Outfit,sans-serif;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes slideLeft{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
  @keyframes slideRight{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:translateX(0)}}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
  @keyframes scaleIn{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}
`;

/* ─── SUPABASE TABLES SETUP SQL (run in Supabase SQL editor)
CREATE TABLE user_profiles (
  id uuid references auth.users(id) primary key,
  name text,
  energy_type text,
  work_start text,
  work_end text,
  work_days text[],
  goals text[],
  focus_duration integer,
  break_duration integer,
  break_style text,
  commitments jsonb,
  onboarding_done boolean default false,
  created_at timestamptz default now()
);
alter table user_profiles enable row level security;
create policy "Users manage own profile" on user_profiles for all using (auth.uid() = id) with check (auth.uid() = id);
─── */

/* ─── Atoms ───────────────────────────────────────────────────────────────── */
function Spinner({ size = 20, color = T.violetMid }) {
  return <div style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${T.violetSoft}`, borderTopColor: color, animation: "spin 0.7s linear infinite", flexShrink: 0 }} />;
}

function ProgressBar({ step, total }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, overflow: "hidden", background: T.bg3 }}>
          <div style={{ height: "100%", borderRadius: 99, background: i < step ? T.gradViolet : "transparent", transition: "all 0.4s ease" }} />
        </div>
      ))}
    </div>
  );
}

/* ── Option chip — single or multi select ── */
function Chip({ label, icon: Icon, selected, onClick, color = T.violetMid, soft = T.violetSoft }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "12px 16px", borderRadius: 14, cursor: "pointer",
      border: selected ? `1.5px solid ${color}` : `1px solid ${T.border}`,
      background: selected ? soft : T.bg2,
      transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
      transform: selected ? "scale(1.03)" : "scale(1)",
      width: "100%", textAlign: "left",
    }}>
      {Icon && (
        <div style={{ width: 32, height: 32, borderRadius: 10, background: selected ? `${color}22` : T.bg3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={16} color={selected ? color : T.text3} />
        </div>
      )}
      <span style={{ fontSize: 14, fontWeight: selected ? 700 : 500, color: selected ? T.text1 : T.text2 }}>{label}</span>
      {selected && (
        <div style={{ marginLeft: "auto", width: 18, height: 18, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Check size={11} color="#fff" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}

/* ── Day chip (Mon Tue etc) ── */
function DayChip({ label, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: 40, height: 40, borderRadius: 12, border: selected ? `1.5px solid ${T.violetMid}` : `1px solid ${T.border}`,
      background: selected ? T.violetSoft : T.bg2, color: selected ? T.violetMid : T.text3,
      fontSize: 12, fontWeight: 700, cursor: "pointer",
      transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
      transform: selected ? "scale(1.1)" : "scale(1)",
    }}>{label}</button>
  );
}

/* ─── SCREEN 1: Welcome + Name ────────────────────────────────────────────── */
function Screen1({ data, setData, onNext }) {
  const valid = data.name.trim().length >= 2;
  return (
    <div style={{ animation: "slideLeft 0.35s ease" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 24, background: T.gradViolet,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px", boxShadow: `0 16px 40px ${T.violetGlow}`,
          animation: "scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
          <Zap size={34} color="#fff" strokeWidth={2.5} />
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: T.text1, letterSpacing: "-0.8px", lineHeight: 1.15, marginBottom: 10 }}>
          Meet your<br />
          <span style={{ background: T.gradHero, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Day Copilot.</span>
        </h1>
        <p style={{ fontSize: 15, color: T.text2, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
          Answer 4 quick questions and we'll build your perfect daily plan automatically.
        </p>
      </div>

      {/* Name input */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>What should we call you?</p>
        <input
          autoFocus
          placeholder="Your first name..."
          value={data.name}
          onChange={e => setData(p => ({ ...p, name: e.target.value }))}
          onKeyDown={e => e.key === "Enter" && valid && onNext()}
          style={{
            width: "100%", background: T.bg2, border: `1px solid ${T.border}`,
            borderRadius: 16, padding: "16px 18px", fontSize: 18, fontWeight: 700,
            color: T.text1, outline: "none", transition: "border 0.2s",
            fontFamily: "Outfit, sans-serif",
          }}
          onFocus={e => e.target.style.borderColor = T.violetMid}
          onBlur={e => e.target.style.borderColor = T.border}
        />
      </div>

      {/* What you'll get */}
      <div style={{ background: T.bg2, borderRadius: 16, padding: "16px", border: `1px solid ${T.border}`, marginBottom: 28 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: T.text3, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>What you'll get</p>
        {[
          { icon: Sparkles, label: "AI-generated daily plan", color: T.violetMid },
          { icon: Calendar, label: "Smart schedule based on your energy", color: T.coral },
          { icon: Target,   label: "Tasks aligned to your goals", color: T.green },
        ].map(({ icon: Icon, label, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={14} color={color} />
            </div>
            <span style={{ fontSize: 13, color: T.text2, fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>

      <button onClick={onNext} disabled={!valid} style={{
        width: "100%", border: "none", borderRadius: 16, padding: "16px",
        background: valid ? T.gradViolet : T.bg3,
        color: valid ? "#fff" : T.text3, fontSize: 15, fontWeight: 700,
        cursor: valid ? "pointer" : "not-allowed",
        boxShadow: valid ? `0 8px 24px ${T.violetGlow}` : "none",
        transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        Let's go, {data.name || "..."} <ChevronRight size={18} />
      </button>
    </div>
  );
}

/* ─── SCREEN 2: Schedule + Energy ────────────────────────────────────────── */
function Screen2({ data, setData, onNext, onBack }) {
  const days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const toggleDay = (d) => setData(p => ({
    ...p,
    workDays: p.workDays.includes(d) ? p.workDays.filter(x => x !== d) : [...p.workDays, d]
  }));

  const energyOptions = [
    { key: "early", label: "Early bird", sub: "Peak energy before noon", Icon: Sun, color: T.amber },
    { key: "midday", label: "Midday warrior", sub: "Best focus after lunch", Icon: Sunset, color: T.coral },
    { key: "night", label: "Night owl", sub: "Creative after sundown", Icon: Moon, color: T.violetMid },
  ];

  const valid = data.workDays.length > 0 && data.energyType;

  return (
    <div style={{ animation: "slideLeft 0.35s ease" }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 13, color: T.violetMid, fontWeight: 700, marginBottom: 6 }}>Step 2 of 4</p>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: T.text1, letterSpacing: "-0.6px", lineHeight: 1.2 }}>Your schedule<br />&amp; energy</h2>
        <p style={{ fontSize: 14, color: T.text2, marginTop: 6 }}>We'll plan around when you're actually at your best.</p>
      </div>

      {/* Work days */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Work days</p>
        <div style={{ display: "flex", gap: 8 }}>
          {days.map(d => <DayChip key={d} label={d} selected={data.workDays.includes(d)} onClick={() => toggleDay(d)} />)}
        </div>
      </div>

      {/* Work hours */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Work hours</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[{ label: "Start", key: "workStart" }, { label: "End", key: "workEnd" }].map(({ label, key }) => (
            <div key={key}>
              <p style={{ fontSize: 11, color: T.text3, fontWeight: 600, marginBottom: 6 }}>{label}</p>
              <input type="time" value={data[key]} onChange={e => setData(p => ({ ...p, [key]: e.target.value }))}
                style={{ width: "100%", background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "11px 12px", fontSize: 14, color: T.text1, outline: "none", fontFamily: "Outfit,sans-serif" }} />
            </div>
          ))}
        </div>
      </div>

      {/* Energy type */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>When are you sharpest?</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {energyOptions.map(({ key, label, sub, Icon, color }) => (
            <button key={key} onClick={() => setData(p => ({ ...p, energyType: key }))} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
              borderRadius: 16, cursor: "pointer",
              border: data.energyType === key ? `1.5px solid ${color}` : `1px solid ${T.border}`,
              background: data.energyType === key ? `${color}14` : T.bg2,
              transition: "all 0.2s", textAlign: "left",
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={18} color={color} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: T.text1 }}>{label}</p>
                <p style={{ fontSize: 12, color: T.text2, marginTop: 1 }}>{sub}</p>
              </div>
              {data.energyType === key && (
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Check size={12} color="#fff" strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onBack} style={{ width: 48, height: 52, border: `1px solid ${T.border}`, borderRadius: 14, background: T.bg2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ChevronLeft size={18} color={T.text2} />
        </button>
        <button onClick={onNext} disabled={!valid} style={{ flex: 1, border: "none", borderRadius: 14, padding: "15px", background: valid ? T.gradViolet : T.bg3, color: valid ? "#fff" : T.text3, fontSize: 15, fontWeight: 700, cursor: valid ? "pointer" : "not-allowed", boxShadow: valid ? `0 8px 24px ${T.violetGlow}` : "none", transition: "all 0.2s" }}>
          Continue →
        </button>
      </div>
    </div>
  );
}

/* ─── SCREEN 3: Goals + Focus ─────────────────────────────────────────────── */
function Screen3({ data, setData, onNext, onBack }) {
  const goals = [
    { key: "productivity", label: "Deep productivity", Icon: Brain, color: T.violetMid },
    { key: "wellness",     label: "Health & wellness", Icon: Heart, color: "#EC4899"   },
    { key: "focus",        label: "Single-task focus",  Icon: Target, color: T.coral   },
    { key: "balance",      label: "Work-life balance",  Icon: Leaf,  color: T.green    },
    { key: "growth",       label: "Learning & growth",  Icon: Sparkles, color: T.amber },
    { key: "team",         label: "Team collaboration", Icon: Users, color: "#60A5FA"  },
  ];

  const toggleGoal = (k) => setData(p => ({
    ...p,
    goals: p.goals.includes(k) ? p.goals.filter(x => x !== k) : [...p.goals, k]
  }));

  const breakStyles = [
    { key: "pomodoro", label: "Pomodoro", sub: "25 min focus, 5 min break" },
    { key: "deep",     label: "Deep work", sub: "90 min focus, 20 min break" },
    { key: "custom",   label: "Custom",    sub: "I'll set my own rhythm" },
  ];

  const valid = data.goals.length > 0 && data.breakStyle;

  return (
    <div style={{ animation: "slideLeft 0.35s ease" }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: T.violetMid, fontWeight: 700, marginBottom: 6 }}>Step 3 of 4</p>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: T.text1, letterSpacing: "-0.6px", lineHeight: 1.2 }}>Goals &amp;<br />focus style</h2>
        <p style={{ fontSize: 14, color: T.text2, marginTop: 6 }}>We'll prioritize tasks that move you toward what matters.</p>
      </div>

      {/* Goals */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Your main goals (pick all that fit)</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {goals.map(({ key, label, Icon, color }) => {
            const sel = data.goals.includes(key);
            return (
              <button key={key} onClick={() => toggleGoal(key)} style={{
                padding: "14px 12px", borderRadius: 14, cursor: "pointer",
                border: sel ? `1.5px solid ${color}` : `1px solid ${T.border}`,
                background: sel ? `${color}14` : T.bg2,
                transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                transform: sel ? "scale(1.03)" : "scale(1)",
                textAlign: "left",
              }}>
                <Icon size={18} color={sel ? color : T.text3} style={{ marginBottom: 8 }} />
                <p style={{ fontSize: 12, fontWeight: 700, color: sel ? T.text1 : T.text2 }}>{label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Focus duration */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: "0.08em", textTransform: "uppercase" }}>Focus session length</p>
          <span style={{ fontSize: 13, fontWeight: 800, color: T.violetMid }}>{data.focusDuration} min</span>
        </div>
        <input type="range" min={15} max={120} step={5} value={data.focusDuration}
          onChange={e => setData(p => ({ ...p, focusDuration: +e.target.value }))}
          style={{ width: "100%", accentColor: T.violetMid }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 11, color: T.text3 }}>15 min</span>
          <span style={{ fontSize: 11, color: T.text3 }}>2 hrs</span>
        </div>
      </div>

      {/* Break style */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Break style</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {breakStyles.map(({ key, label, sub }) => (
            <button key={key} onClick={() => setData(p => ({ ...p, breakStyle: key }))} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "13px 16px", borderRadius: 14, cursor: "pointer",
              border: data.breakStyle === key ? `1.5px solid ${T.violetMid}` : `1px solid ${T.border}`,
              background: data.breakStyle === key ? T.violetSoft : T.bg2,
              transition: "all 0.2s",
            }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: T.text1, textAlign: "left" }}>{label}</p>
                <p style={{ fontSize: 12, color: T.text2, marginTop: 2, textAlign: "left" }}>{sub}</p>
              </div>
              {data.breakStyle === key && (
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: T.violetMid, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Check size={12} color="#fff" strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onBack} style={{ width: 48, height: 52, border: `1px solid ${T.border}`, borderRadius: 14, background: T.bg2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ChevronLeft size={18} color={T.text2} />
        </button>
        <button onClick={onNext} disabled={!valid} style={{ flex: 1, border: "none", borderRadius: 14, padding: "15px", background: valid ? T.gradViolet : T.bg3, color: valid ? "#fff" : T.text3, fontSize: 15, fontWeight: 700, cursor: valid ? "pointer" : "not-allowed", boxShadow: valid ? `0 8px 24px ${T.violetGlow}` : "none", transition: "all 0.2s" }}>
          Continue →
        </button>
      </div>
    </div>
  );
}

/* ─── SCREEN 4: Commitments ───────────────────────────────────────────────── */
function Screen4({ data, setData, onNext, onBack }) {
  const commitments = [
    { key: "gym",      label: "Morning gym / workout", Icon: Dumbbell,       color: T.coral   },
    { key: "meals",    label: "Scheduled meal breaks",  Icon: UtensilsCrossed, color: T.green  },
    { key: "meetings", label: "Regular team meetings",  Icon: Users,           color: "#60A5FA" },
    { key: "coffee",   label: "Morning coffee ritual",  Icon: Coffee,          color: T.amber   },
    { key: "walk",     label: "Daily walk / outdoors",  Icon: Leaf,            color: T.green   },
    { key: "focus",    label: "No-meeting focus block", Icon: Brain,           color: T.violetMid },
  ];

  const toggle = (k) => setData(p => ({
    ...p,
    commitments: p.commitments.includes(k) ? p.commitments.filter(x => x !== k) : [...p.commitments, k]
  }));

  return (
    <div style={{ animation: "slideLeft 0.35s ease" }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: T.violetMid, fontWeight: 700, marginBottom: 6 }}>Step 4 of 4</p>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: T.text1, letterSpacing: "-0.6px", lineHeight: 1.2 }}>Your daily<br />commitments</h2>
        <p style={{ fontSize: 14, color: T.text2, marginTop: 6 }}>We'll protect these slots when building your plan.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
        {commitments.map(({ key, label, Icon, color }) => (
          <Chip key={key} label={label} icon={Icon} selected={data.commitments.includes(key)}
            onClick={() => toggle(key)} color={color} soft={`${color}14`} />
        ))}
      </div>

      <p style={{ fontSize: 12, color: T.text3, textAlign: "center", marginBottom: 20 }}>
        You can always add more commitments later in settings.
      </p>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onBack} style={{ width: 48, height: 52, border: `1px solid ${T.border}`, borderRadius: 14, background: T.bg2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ChevronLeft size={18} color={T.text2} />
        </button>
        <button onClick={onNext} style={{ flex: 1, border: "none", borderRadius: 14, padding: "15px", background: T.gradViolet, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: `0 8px 24px ${T.violetGlow}`, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Sparkles size={16} /> Build my day plan
        </button>
      </div>
    </div>
  );
}

/* ─── SCREEN 5: AI Generating + Review ───────────────────────────────────── */
function Screen5({ data, userId, onComplete }) {
  const [phase, setPhase] = useState("generating"); // generating | review
  const [suggestedTasks, setSuggestedTasks] = useState([]);
  const [accepted, setAccepted] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Generate plan on mount
  useState(() => {
    generatePlan();
  }, []);

  // Use useEffect equivalent via initial render trigger
  const [generated, setGenerated] = useState(false);
  if (!generated) {
    setGenerated(true);
    setTimeout(generatePlan, 100);
  }

  async function generatePlan() {
    try {
      const prompt = `You are a smart daily planner. Based on this user profile, generate a realistic and helpful first-day task plan.

User profile:
- Name: ${data.name}
- Energy type: ${data.energyType} (early bird = best before noon, midday = best after lunch, night owl = best after 6pm)
- Work hours: ${data.workStart} to ${data.workEnd}
- Work days: ${data.workDays.join(", ")}
- Goals: ${data.goals.join(", ")}
- Focus duration preference: ${data.focusDuration} minutes
- Break style: ${data.breakStyle}
- Daily commitments: ${data.commitments.length > 0 ? data.commitments.join(", ") : "none specified"}

Generate exactly 6-8 tasks for today split across morning, afternoon, and evening. 
Respect their energy pattern — put deep work in their peak hours.
Protect time for their commitments.
Keep tasks specific, actionable, and realistic.

Respond ONLY with a JSON array, no explanation, no markdown. Example format:
[{"title":"Review project goals","section":"morning","duration":20,"tag":"work"},{"title":"Team standup","section":"morning","duration":30,"tag":"comms"}]

Tags must be one of: work, comms, wellness, growth
Sections must be one of: morning, afternoon, evening`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const json = await res.json();
      const raw = json.content?.[0]?.text || "[]";
      const clean = raw.replace(/```json|```/g, "").trim();
      const tasks = JSON.parse(clean);

      const withIds = tasks.map((t, i) => ({ ...t, id: `suggested-${i}` }));
      setSuggestedTasks(withIds);

      // Default all accepted
      const acc = {};
      withIds.forEach(t => { acc[t.id] = true; });
      setAccepted(acc);

      setPhase("review");
    } catch (e) {
      setError("Couldn't generate plan. You can still continue and add tasks manually.");
      setPhase("review");
    }
  }

  const handleFinish = async () => {
    setSaving(true);

    // 1. Save user profile to Supabase
    await supabase.from("user_profiles").upsert({
      id: userId,
      name: data.name,
      energy_type: data.energyType,
      work_start: data.workStart,
      work_end: data.workEnd,
      work_days: data.workDays,
      goals: data.goals,
      focus_duration: data.focusDuration,
      break_style: data.breakStyle,
      commitments: data.commitments,
      onboarding_done: true,
    });

    // 2. Save accepted tasks to Supabase
    const acceptedTasks = suggestedTasks
      .filter(t => accepted[t.id])
      .map(t => ({
        title: t.title,
        section: t.section,
        duration: t.duration,
        tag: t.tag,
        done: false,
        user_id: userId,
      }));

    if (acceptedTasks.length > 0) {
      await supabase.from("tasks").insert(acceptedTasks);
    }

    setSaving(false);
    onComplete();
  };

  const TAG_COLORS = {
    work: "#8B5CF6", comms: "#60A5FA", wellness: "#10B981", growth: "#F59E0B",
  };
  const SECTION_ORDER = { morning: 0, afternoon: 1, evening: 2 };
  const sorted = [...suggestedTasks].sort((a, b) => SECTION_ORDER[a.section] - SECTION_ORDER[b.section]);
  const acceptedCount = Object.values(accepted).filter(Boolean).length;

  if (phase === "generating") {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", animation: "fadeIn 0.4s ease" }}>
        <div style={{ width: 72, height: 72, borderRadius: 24, background: T.gradViolet, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: `0 16px 40px ${T.violetGlow}` }}>
          <Sparkles size={32} color="#fff" />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: T.text1, letterSpacing: "-0.5px", marginBottom: 10 }}>
          Building your plan...
        </h2>
        <p style={{ fontSize: 14, color: T.text2, marginBottom: 32, lineHeight: 1.6 }}>
          AI is analyzing your profile and<br />crafting your perfect first day.
        </p>

        {/* Animated dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 32 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: T.violetMid, animation: `pulse 1.2s ease ${i * 0.2}s infinite` }} />
          ))}
        </div>

        {[
          { label: "Analyzing your energy pattern", done: true },
          { label: "Scheduling around commitments", done: true },
          { label: "Generating personalized tasks", done: false },
        ].map(({ label, done }, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", justifyContent: "center" }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: done ? T.green : T.bg3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {done ? <Check size={11} color="#fff" strokeWidth={3} /> : <Spinner size={12} />}
            </div>
            <span style={{ fontSize: 13, color: done ? T.text1 : T.text2, fontWeight: done ? 600 : 400 }}>{label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ animation: "slideLeft 0.35s ease" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: T.gradViolet, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={18} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text1, letterSpacing: "-0.4px" }}>Your day plan is ready!</h2>
            <p style={{ fontSize: 12, color: T.text2 }}>Tap any task to remove it from your plan</p>
          </div>
        </div>

        {error && (
          <div style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: "10px 14px", marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: T.amber }}>{error}</p>
          </div>
        )}
      </div>

      {/* Task list */}
      <div style={{ marginBottom: 16 }}>
        {["morning", "afternoon", "evening"].map(section => {
          const sectionTasks = sorted.filter(t => t.section === section);
          if (sectionTasks.length === 0) return null;
          const icons = { morning: Coffee, afternoon: Sun, evening: Moon };
          const colors = { morning: T.amber, afternoon: T.coral, evening: T.violetMid };
          const SIcon = icons[section];
          return (
            <div key={section} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <SIcon size={13} color={colors[section]} />
                <span style={{ fontSize: 11, fontWeight: 700, color: colors[section], letterSpacing: "0.08em", textTransform: "uppercase" }}>{section}</span>
              </div>
              {sectionTasks.map(task => {
                const isAccepted = accepted[task.id];
                return (
                  <div key={task.id} onClick={() => setAccepted(p => ({ ...p, [task.id]: !p[task.id] }))}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, marginBottom: 6, cursor: "pointer", border: isAccepted ? `1px solid ${T.border}` : `1px solid transparent`, background: isAccepted ? T.bg2 : T.bg1, opacity: isAccepted ? 1 : 0.4, transition: "all 0.2s" }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: isAccepted ? T.gradViolet : T.bg3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                      {isAccepted && <Check size={12} color="#fff" strokeWidth={3} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: T.text1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.title}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <Clock size={10} color={T.text3} />
                        <span style={{ fontSize: 11, color: T.text3 }}>{task.duration}m</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: TAG_COLORS[task.tag] || T.text3, background: `${TAG_COLORS[task.tag]}18`, padding: "2px 8px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>{task.tag}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div style={{ background: T.bg2, borderRadius: 14, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 13, color: T.text2 }}>{acceptedCount} tasks selected</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.violetMid }}>
          {sorted.filter(t => accepted[t.id]).reduce((s, t) => s + t.duration, 0)} min total
        </span>
      </div>

      <button onClick={handleFinish} disabled={saving} style={{ width: "100%", border: "none", borderRadius: 16, padding: "16px", background: T.gradViolet, color: "#fff", fontSize: 15, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", boxShadow: `0 8px 24px ${T.violetGlow}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "all 0.2s" }}>
        {saving ? <><Spinner size={18} color="#fff" /> Saving your plan...</> : <>Start my day <ChevronRight size={18} /></>}
      </button>
    </div>
  );
}

/* ─── MAIN ONBOARDING COMPONENT ───────────────────────────────────────────── */
export default function Onboarding({ userId, onComplete }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    name: "",
    energyType: "",
    workStart: "09:00",
    workEnd: "18:00",
    workDays: ["Mo", "Tu", "We", "Th", "Fr"],
    goals: [],
    focusDuration: 45,
    breakStyle: "",
    commitments: [],
  });

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => s - 1);

  return (
    <div style={{ minHeight: "100vh", background: T.bg0, display: "flex", justifyContent: "center", fontFamily: "Outfit, -apple-system, sans-serif" }}>
      <style>{CSS}</style>
      <div style={{ width: "100%", maxWidth: 430, padding: "48px 24px 40px", display: "flex", flexDirection: "column" }}>
        {step < 5 && <ProgressBar step={step} total={4} />}

        {step === 1 && <Screen1 data={data} setData={setData} onNext={next} />}
        {step === 2 && <Screen2 data={data} setData={setData} onNext={next} onBack={back} />}
        {step === 3 && <Screen3 data={data} setData={setData} onNext={next} onBack={back} />}
        {step === 4 && <Screen4 data={data} setData={setData} onNext={next} onBack={back} />}
        {step === 5 && <Screen5 data={data} userId={userId} onComplete={onComplete} />}
      </div>
    </div>
  );
}
