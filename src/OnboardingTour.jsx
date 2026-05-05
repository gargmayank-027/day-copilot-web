import { useState } from "react";
import { ChevronRight, X, Zap, Target, Bot, BarChart2, CheckCircle } from "lucide-react";

const STEPS = [
  {
    icon: Zap,
    color: "#8B5CF6",
    soft: "rgba(139,92,246,0.15)",
    title: "Welcome to Day Copilot",
    desc: "Your AI-powered daily execution engine. Plan smarter, do more, and finish each day with momentum.",
  },
  {
    icon: Target,
    color: "#F97316",
    soft: "rgba(249,115,22,0.15)",
    title: "Your tasks, organised",
    desc: "Tasks are split into Morning, Afternoon & Evening — matching your natural energy curve throughout the day.",
  },
  {
    icon: Bot,
    color: "#10B981",
    soft: "rgba(16,185,129,0.15)",
    title: "AI Copilot at your side",
    desc: "Tap the AI button anytime to get smart reschedule suggestions, motivational nudges, and daily planning help.",
  },
  {
    icon: BarChart2,
    color: "#F59E0B",
    soft: "rgba(245,158,11,0.15)",
    title: "Build momentum daily",
    desc: "Complete tasks to grow your streak and momentum score. Consistent days = exponential progress.",
  },
  {
    icon: CheckCircle,
    color: "#7C3AED",
    soft: "rgba(124,58,237,0.15)",
    title: "You're all set!",
    desc: "Swipe right on a task to complete it. Swipe left to delete or reschedule. Let's build an amazing day.",
  },
];

export default function OnboardingTour({ onFinish }) {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  const next = () => {
    if (isLast) {
      setExiting(true);
      setTimeout(onFinish, 350);
    } else {
      setStep(s => s + 1);
    }
  };

  const skip = () => { setExiting(true); setTimeout(onFinish, 350); };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)",
      backdropFilter: "blur(12px)", zIndex: 9000,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      opacity: exiting ? 0 : 1, transition: "opacity 0.35s ease",
    }}>
      <div style={{
        width: "100%", maxWidth: 430,
        background: "#111118",
        borderRadius: "28px 28px 0 0",
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "32px 24px 52px",
        animation: "slideUp 0.35s cubic-bezier(0.34,1.2,0.64,1)",
      }}>
        {/* Skip */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
          <button onClick={skip} style={{ background: "transparent", border: "none", color: "#4A4960", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <X size={13} /> Skip tour
          </button>
        </div>

        {/* Icon */}
        <div style={{ width: 72, height: 72, borderRadius: 22, background: current.soft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: `0 12px 32px ${current.color}44`, transition: "all 0.3s" }}>
          <Icon size={34} color={current.color} strokeWidth={1.8} />
        </div>

        {/* Text */}
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#F0EFF8", textAlign: "center", letterSpacing: "-0.5px", marginBottom: 12, lineHeight: 1.2 }}>{current.title}</h2>
        <p style={{ fontSize: 15, color: "#8B8A9E", textAlign: "center", lineHeight: 1.65, maxWidth: 320, margin: "0 auto 32px" }}>{current.desc}</p>

        {/* Step dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 28 }}>
          {STEPS.map((_, i) => (
            <div key={i} onClick={() => setStep(i)} style={{
              width: i === step ? 20 : 6,
              height: 6, borderRadius: 99,
              background: i === step ? current.color : "#202028",
              transition: "all 0.3s cubic-bezier(0.34,1.2,0.64,1)",
              cursor: "pointer",
            }} />
          ))}
        </div>

        {/* CTA */}
        <button onClick={next} style={{
          width: "100%", border: "none", borderRadius: 18,
          padding: "15px",
          background: `linear-gradient(135deg, ${current.color} 0%, ${current.color}cc 100%)`,
          color: "#fff", fontSize: 15, fontWeight: 700,
          cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 8,
          boxShadow: `0 8px 24px ${current.color}55`,
          transition: "all 0.25s",
        }}>
          {isLast ? "Let's go!" : "Next"}
          {!isLast && <ChevronRight size={17} />}
        </button>
      </div>
    </div>
  );
}
