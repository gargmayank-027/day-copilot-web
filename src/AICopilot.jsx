import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Send, Zap, Sparkles, CloudRain, Sun, Cloud,
  RotateCcw, Plus, Trash2, Calendar, TrendingUp,
  AlertTriangle, Coffee, ChevronDown, Mic, Bot
} from "lucide-react";

/* ─── THEME (matches app) ─────────────────────────────────────────────────── */
const T = {
  bg0:"#09090F", bg1:"#111118", bg2:"#18181F", bg3:"#202028",
  border:"rgba(255,255,255,0.07)", borderHover:"rgba(255,255,255,0.14)",
  text1:"#F0EFF8", text2:"#8B8A9E", text3:"#4A4960",
  violetMid:"#8B5CF6", violetSoft:"rgba(124,58,237,0.14)",
  violetGlow:"rgba(124,58,237,0.38)",
  coral:"#F97316", coralSoft:"rgba(249,115,22,0.12)",
  green:"#10B981", greenSoft:"rgba(16,185,129,0.12)",
  amber:"#F59E0B", amberSoft:"rgba(245,158,11,0.12)",
  red:"#EF4444", redSoft:"rgba(239,68,68,0.12)",
  gradViolet:"linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)",
  gradHero:"linear-gradient(135deg,#7C3AED 0%,#9333EA 55%,#F97316 100%)",
};

const CSS = `
  @keyframes slideUpChat{from{opacity:0;transform:translateY(20px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes msgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(0.92)}}
  @keyframes bubblePop{0%{transform:scale(1)}50%{transform:scale(1.15)}100%{transform:scale(1)}}
  @keyframes typingDot{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
`;

/* ─── Quick action suggestions ───────────────────────────────────────────── */
const QUICK_ACTIONS = [
  { label:"☀️ Morning briefing",   prompt:"Give me a morning briefing for today"                },
  { label:"🔄 Reschedule my day",  prompt:"I need to reschedule my day, help me reprioritize"   },
  { label:"⚠️ Recovery mode",      prompt:"I've fallen behind on tasks, help me recover"         },
  { label:"🌦 Weather check",      prompt:"Check the weather and suggest if any tasks need changes"},
  { label:"📊 Weekly insights",    prompt:"Analyze my task patterns and give me weekly insights"  },
  { label:"➕ Add tasks from goals",prompt:"Suggest new tasks based on my goals and profile"      },
];

/* ─── Weather fetcher (Open-Meteo, free, no key) ─────────────────────────── */
async function fetchWeather(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m,precipitation&timezone=auto`;
    const res  = await fetch(url);
    const data = await res.json();
    const c    = data.current;
    const code = c.weathercode;
    const condition =
      code === 0                        ? "Clear sky"      :
      code <= 3                         ? "Partly cloudy"  :
      code <= 49                        ? "Foggy"          :
      code <= 67                        ? "Rainy"          :
      code <= 77                        ? "Snowy"          :
      code <= 82                        ? "Showers"        : "Thunderstorm";
    return {
      temp:        Math.round(c.temperature_2m),
      condition,
      wind:        Math.round(c.windspeed_10m),
      precip:      c.precipitation,
      isOutdoorOk: code <= 3 && c.precipitation === 0,
    };
  } catch {
    return null;
  }
}

/* ─── Get user location ──────────────────────────────────────────────────── */
function getUserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      ()  => resolve(null),
      { timeout: 5000 }
    );
  });
}

/* ─── Build the system prompt ─────────────────────────────────────────────── */
function buildSystemPrompt(userProfile, tasks, weather, now) {
  const allTasks    = Object.values(tasks).flat();
  const doneTasks   = allTasks.filter(t => t.done);
  const pendingTasks= allTasks.filter(t => !t.done);
  const momentum    = allTasks.length ? Math.round(doneTasks.length / allTasks.length * 100) : 0;
  const hour        = now.getHours();
  const timeOfDay   = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  const tasksSummary = ["morning","afternoon","evening"].map(section => {
    const st = tasks[section] || [];
    if (!st.length) return `${section}: empty`;
    return `${section}:\n` + st.map(t =>
      `  - [${t.done?"✓":"○"}] "${t.title}" (${t.duration}min, ${t.tag}) [id:${t.id}]`
    ).join("\n");
  }).join("\n");

  const weatherStr = weather
    ? `Current weather: ${weather.condition}, ${weather.temp}°C, wind ${weather.wind}km/h, precipitation ${weather.precip}mm. Outdoor activities: ${weather.isOutdoorOk ? "FINE" : "NOT RECOMMENDED"}.`
    : "Weather: unavailable";

  return `You are Day Copilot, an intelligent personal productivity assistant embedded in a task management app. You have full context about the user and their day.

## USER PROFILE
Name: ${userProfile?.name || "User"}
Energy type: ${userProfile?.energy_type || "unknown"} (early=peak before noon, midday=peak after lunch, night=peak after 6pm)
Work hours: ${userProfile?.work_start || "9:00"} - ${userProfile?.work_end || "18:00"}
Work days: ${userProfile?.work_days?.join(", ") || "Mon-Fri"}
Goals: ${userProfile?.goals?.join(", ") || "productivity"}
Focus duration: ${userProfile?.focus_duration || 45} minutes
Break style: ${userProfile?.break_style || "custom"}
Commitments: ${userProfile?.commitments?.join(", ") || "none"}

## CURRENT DAY STATE
Time: ${now.toLocaleTimeString("en-IN", {hour:"2-digit",minute:"2-digit"})} (${timeOfDay})
Date: ${now.toLocaleDateString("en-IN",{weekday:"long",month:"long",day:"numeric"})}
Momentum: ${momentum}%
Tasks completed: ${doneTasks.length}/${allTasks.length}

## TODAY'S TASKS
${tasksSummary}

## ${weatherStr}

## YOUR CAPABILITIES
You can take ACTIONS on tasks. When you want to perform an action, include a JSON block in your response using this exact format:

\`\`\`actions
[
  {"action": "add_task", "title": "Task title", "section": "morning|afternoon|evening", "duration": 30, "tag": "work|comms|wellness|growth"},
  {"action": "delete_task", "id": "task-uuid-here"},
  {"action": "complete_task", "id": "task-uuid-here"},
  {"action": "reschedule_task", "id": "task-uuid-here", "section": "evening"},
  {"action": "add_task", "title": "Another task", "section": "afternoon", "duration": 20, "tag": "wellness"}
]
\`\`\`

Rules for actions:
- Only use task IDs that appear in the task list above with [id:...]
- You can include multiple actions in one block
- Always explain what you're doing and why BEFORE the action block
- After the action block, summarize what changed

## YOUR PERSONALITY
- Warm, direct, like a smart friend who knows your schedule
- Don't be robotic. Use the user's name sometimes.
- Be specific — reference actual task names, times, goals
- For weather: if outdoor tasks exist and weather is bad, proactively flag and offer to reschedule
- For recovery mode: be empathetic, help prioritize ruthlessly, suggest what to drop
- For morning briefing: be energizing, brief, actionable
- For weekly insights: find real patterns (which tags get done, which get skipped, time of day patterns)
- Keep responses concise but complete. No unnecessary filler.`;
}

/* ─── Parse AI response into text + actions ──────────────────────────────── */
function parseResponse(raw) {
  const actionMatch = raw.match(/```actions\n([\s\S]*?)\n```/);
  let actions = [];
  let text    = raw;

  if (actionMatch) {
    try {
      actions = JSON.parse(actionMatch[1]);
    } catch {}
    text = raw.replace(/```actions\n[\s\S]*?\n```/, "").trim();
  }
  return { text, actions };
}

/* ─── Action renderer chip ───────────────────────────────────────────────── */
function ActionChip({ action }) {
  const configs = {
    add_task:       { icon: Plus,       color: T.green,    label: `Added: "${action.title}"` },
    delete_task:    { icon: Trash2,     color: T.red,      label: "Task removed"              },
    complete_task:  { icon: Zap,        color: T.violetMid,label: "Task marked done"          },
    reschedule_task:{ icon: Calendar,   color: T.amber,    label: `Moved to ${action.section}`},
  };
  const cfg = configs[action.action] || { icon: Sparkles, color: T.text2, label: action.action };
  const Icon = cfg.icon;
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:99, background:`${cfg.color}15`, border:`1px solid ${cfg.color}33`, marginTop:4, marginRight:4 }}>
      <Icon size={11} color={cfg.color}/>
      <span style={{ fontSize:11, fontWeight:600, color:cfg.color }}>{cfg.label}</span>
    </div>
  );
}

/* ─── Message bubble ──────────────────────────────────────────────────────── */
function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  const isSystem = msg.role === "system";

  if (isSystem) {
    return (
      <div style={{ textAlign:"center", padding:"6px 0", animation:"msgIn 0.2s ease" }}>
        <span style={{ fontSize:11, color:T.text3, background:T.bg2, padding:"4px 12px", borderRadius:99, border:`1px solid ${T.border}` }}>{msg.content}</span>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection: isUser ? "row-reverse" : "row", gap:8, marginBottom:12, animation:"msgIn 0.25s ease" }}>
      {/* Avatar */}
      {!isUser && (
        <div style={{ width:28, height:28, borderRadius:9, background:T.gradViolet, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, alignSelf:"flex-end", boxShadow:`0 4px 12px ${T.violetGlow}` }}>
          <Bot size={14} color="#fff"/>
        </div>
      )}

      <div style={{ maxWidth:"82%", display:"flex", flexDirection:"column", alignItems: isUser ? "flex-end" : "flex-start" }}>
        {/* Bubble */}
        <div style={{
          padding:"11px 14px", borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isUser ? T.gradViolet : T.bg2,
          border: isUser ? "none" : `1px solid ${T.border}`,
          boxShadow: isUser ? `0 4px 16px ${T.violetGlow}` : "none",
        }}>
          <p style={{ fontSize:14, color: isUser ? "#fff" : T.text1, lineHeight:1.55, whiteSpace:"pre-wrap", margin:0 }}>
            {msg.text || msg.content}
          </p>
        </div>

        {/* Action chips */}
        {msg.actions?.length > 0 && (
          <div style={{ marginTop:6, display:"flex", flexWrap:"wrap" }}>
            {msg.actions.map((a, i) => <ActionChip key={i} action={a}/>)}
          </div>
        )}

        <span style={{ fontSize:10, color:T.text3, marginTop:4 }}>
          {msg.time}
        </span>
      </div>
    </div>
  );
}

/* ─── Typing indicator ────────────────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div style={{ display:"flex", gap:8, marginBottom:12, animation:"msgIn 0.2s ease" }}>
      <div style={{ width:28, height:28, borderRadius:9, background:T.gradViolet, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, alignSelf:"flex-end" }}>
        <Bot size={14} color="#fff"/>
      </div>
      <div style={{ padding:"12px 16px", borderRadius:"18px 18px 18px 4px", background:T.bg2, border:`1px solid ${T.border}`, display:"flex", gap:5, alignItems:"center" }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:T.violetMid, animation:`typingDot 1.2s ease ${i*0.15}s infinite` }}/>
        ))}
      </div>
    </div>
  );
}

/* ─── MAIN COPILOT COMPONENT ─────────────────────────────────────────────── */
export default function AICopilot({
  apiKey,          // Anthropic API key
  userProfile,     // from Supabase user_profiles
  tasks,           // { morning:[], afternoon:[], evening:[] }
  onAddTask,       // (section, taskData) => Promise
  onDeleteTask,    // (id) => Promise
  onCompleteTask,  // (id, currentDone) => Promise
  onRescheduleTask,// (id, newSection) => Promise
}) {
  const [open,      setOpen]     = useState(false);
  const [messages,  setMessages] = useState([]);
  const [input,     setInput]    = useState("");
  const [loading,   setLoading]  = useState(false);
  const [weather,   setWeather]  = useState(null);
  const [hasNotif,  setHasNotif] = useState(true); // morning briefing badge
  const [history,   setHistory]  = useState([]); // raw API message history
  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const now         = new Date();

  /* ── Scroll to bottom ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, loading]);

  /* ── Focus input when opened ── */
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setHasNotif(false);
    }
  }, [open]);

  /* ── Fetch weather on mount ── */
  useEffect(() => {
    (async () => {
      const loc = await getUserLocation();
      if (loc) {
        const w = await fetchWeather(loc.lat, loc.lon);
        setWeather(w);
      }
    })();
  }, []);

  /* ── Welcome message ── */
  useEffect(() => {
    const hour = now.getHours();
    const name = userProfile?.name || "there";
    const allTasks = Object.values(tasks).flat();
    const pending  = allTasks.filter(t => !t.done).length;
    const momentum = allTasks.length ? Math.round(allTasks.filter(t=>t.done).length/allTasks.length*100) : 0;

    let welcome = hour < 12
      ? `Good morning, ${name}! ☀️ Ready to make today count? You have ${pending} tasks ahead. Ask me anything — I can reschedule your day, add tasks, check the weather, or give you a full briefing.`
      : hour < 17
      ? `Hey ${name}! 🎯 You're at ${momentum}% momentum with ${pending} tasks remaining. Need help reprioritizing or recovering lost time?`
      : `Evening, ${name} 🌙 Day's winding down. ${momentum}% complete. Want me to help plan tomorrow or analyze how today went?`;

    if (weather && !weather.isOutdoorOk) {
      welcome += `\n\n⚠️ Heads up: weather looks ${weather.condition.toLowerCase()} (${weather.temp}°C). If you have outdoor tasks, I can help reschedule them.`;
    }

    setMessages([{
      id: "welcome",
      role: "assistant",
      text: welcome,
      actions: [],
      time: now.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" }),
    }]);
  }, [weather, userProfile]);

  /* ── Execute actions returned by AI ── */
  const executeActions = useCallback(async (actions) => {
    for (const action of actions) {
      try {
        if (action.action === "add_task") {
          await onAddTask(action.section, {
            title:    action.title,
            duration: action.duration || 20,
            tag:      action.tag || "work",
            done:     false,
            section:  action.section,
          });
        } else if (action.action === "delete_task") {
          await onDeleteTask(action.id);
        } else if (action.action === "complete_task") {
          const allTasks = Object.values(tasks).flat();
          const task = allTasks.find(t => t.id === action.id);
          if (task) await onCompleteTask(task.id, task.done);
        } else if (action.action === "reschedule_task") {
          await onRescheduleTask(action.id, action.section);
        }
      } catch(e) {
        console.error("Action failed:", action, e);
      }
    }
  }, [tasks, onAddTask, onDeleteTask, onCompleteTask, onRescheduleTask]);

  /* ── Send message to Gemini ── */
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return;
    const userText = text.trim();
    setInput("");
    setLoading(true);

    const userMsg = {
      id:      Date.now(),
      role:    "user",
      text:    userText,
      content: userText,
      actions: [],
      time:    now.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" }),
    };
    setMessages(prev => [...prev, userMsg]);

    // Build API history
    const newHistory = [
      ...history,
      { role:"user", content: userText },
    ];

    try {
      console.log("Calling Gemini with key:", apiKey?.slice(0,10));
      const systemPrompt = buildSystemPrompt(userProfile, tasks, weather, new Date());

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: newHistory.map(m => ({
              role:  m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            })),
          }),
        }
      );

      if (!res.ok) {
        const errBody = await res.json();
        console.error("Gemini error response:", errBody);
        throw new Error(`API error: ${res.status}`);
      }

      const data    = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text
        || "Sorry, I couldn't process that. Try again.";
      const { text: aiText, actions } = parseResponse(rawText);

      // Execute any task actions
      if (actions.length > 0) {
        await executeActions(actions);
      }

      const aiMsg = {
        id:      Date.now() + 1,
        role:    "assistant",
        text:    aiText,
        actions,
        time:    new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" }),
      };

      setMessages(prev => [...prev, aiMsg]);
      setHistory([...newHistory, { role:"assistant", content: rawText }]);

    } catch(e) {
      const errMsg = {
        id:      Date.now() + 1,
        role:    "assistant",
        text:    e.message.includes("400") || e.message.includes("401")
          ? "⚠️ Invalid Gemini API key. Get one free at aistudio.google.com"
          : e.message.includes("429")
          ? "⚠️ Rate limit hit. Wait a moment and try again."
          : "⚠️ Something went wrong. Check your API key and connection.",
        actions: [],
        time:    new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" }),
      };
      setMessages(prev => [...prev, errMsg]);
    }

    setLoading(false);
  }, [loading, history, userProfile, tasks, weather, executeActions]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  /* ── If no API key, show setup prompt ── */
  const noKey = !apiKey;

  return (
    <>
      <style>{CSS}</style>

      {/* ── Floating bubble ── */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position:"fixed", bottom:88, right:16,
          width:52, height:52, borderRadius:"50%",
          border:"none", cursor:"pointer",
          background: open ? T.bg2 : T.gradViolet,
          boxShadow: open
            ? `0 4px 16px rgba(0,0,0,0.3), 0 0 0 1px ${T.border}`
            : `0 8px 28px ${T.violetGlow}, 0 0 0 3px ${T.bg0}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          zIndex:150,
          transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          transform: open ? "scale(0.92)" : "scale(1)",
          animation: !open ? "bubblePop 2s ease 3s 1" : "none",
        }}
      >
        {open
          ? <ChevronDown size={22} color={T.text2}/>
          : <Bot size={22} color="#fff" strokeWidth={2}/>
        }

        {/* Notification dot */}
        {hasNotif && !open && (
          <div style={{ position:"absolute", top:2, right:2, width:10, height:10, borderRadius:"50%", background:T.coral, border:`2px solid ${T.bg0}`, animation:"pulse 2s ease infinite" }}/>
        )}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div style={{
          position:"fixed", bottom:152, right:16,
          width: Math.min(window.innerWidth - 32, 380),
          height: Math.min(window.innerHeight - 200, 520),
          background:T.bg1, borderRadius:24,
          border:`1px solid ${T.border}`,
          boxShadow:`0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px ${T.violetGlow}`,
          display:"flex", flexDirection:"column",
          zIndex:149, overflow:"hidden",
          animation:"slideUpChat 0.3s cubic-bezier(0.34,1.2,0.64,1)",
        }}>

          {/* Header */}
          <div style={{ padding:"14px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:10, flexShrink:0, background:T.bg1 }}>
            <div style={{ width:34, height:34, borderRadius:11, background:T.gradViolet, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 4px 12px ${T.violetGlow}` }}>
              <Sparkles size={16} color="#fff"/>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:14, fontWeight:800, color:T.text1, letterSpacing:"-0.3px" }}>Day Copilot AI</p>
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background: noKey ? T.amber : T.green }}/>
                <p style={{ fontSize:11, color:T.text2 }}>{noKey ? "API key needed" : weather ? `${weather.condition} · ${weather.temp}°C` : "Online"}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ border:"none", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", padding:4 }}>
              <X size={16} color={T.text3}/>
            </button>
          </div>

          {/* No API key state */}
          {noKey ? (
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, textAlign:"center" }}>
              <div style={{ width:48, height:48, borderRadius:16, background:T.amberSoft, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
                <AlertTriangle size={24} color={T.amber}/>
              </div>
              <p style={{ fontSize:15, fontWeight:700, color:T.text1, marginBottom:8 }}>API Key Required</p>
              <p style={{ fontSize:13, color:T.text2, lineHeight:1.6, marginBottom:16 }}>
                Add your Gemini API key to unlock the AI assistant. Get one free at aistudio.google.com
              </p>
              <div style={{ background:T.bg3, borderRadius:12, padding:"10px 14px", width:"100%", border:`1px solid ${T.border}` }}>
                <p style={{ fontSize:11, color:T.text3, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:6 }}>Add to App.jsx</p>
                <code style={{ fontSize:12, color:T.violetMid, fontFamily:"monospace" }}>
                  {"apiKey=\"AIzaSy-...\""}<br/>
                  {"// Pass to <AICopilot>"}
                </code>
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 8px", display:"flex", flexDirection:"column" }}>

                {/* Quick actions (show when no user messages yet) */}
                {messages.length <= 1 && (
                  <div style={{ marginBottom:16, animation:"fadeIn 0.4s ease 0.3s both" }}>
                    <p style={{ fontSize:11, fontWeight:700, color:T.text3, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8 }}>Quick actions</p>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {QUICK_ACTIONS.map(({ label, prompt }) => (
                        <button key={label} onClick={() => sendMessage(prompt)} style={{
                          padding:"6px 12px", borderRadius:99, border:`1px solid ${T.border}`,
                          background:T.bg2, color:T.text2, fontSize:12, fontWeight:500,
                          cursor:"pointer", transition:"all 0.15s",
                          whiteSpace:"nowrap",
                        }}
                          onMouseEnter={e => { e.target.style.borderColor = T.violetMid; e.target.style.color = T.text1; }}
                          onMouseLeave={e => { e.target.style.borderColor = T.border;    e.target.style.color = T.text2; }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map(msg => <MessageBubble key={msg.id} msg={msg}/>)}
                {loading && <TypingIndicator/>}
                <div ref={bottomRef}/>
              </div>

              {/* Input */}
              <div style={{ padding:"10px 12px 12px", borderTop:`1px solid ${T.border}`, flexShrink:0, background:T.bg1 }}>
                <div style={{ display:"flex", gap:8, alignItems:"flex-end", background:T.bg2, borderRadius:16, border:`1px solid ${T.border}`, padding:"8px 8px 8px 14px", transition:"border 0.2s" }}
                  onFocus={() => {}} // border highlight handled below
                >
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me anything about your day..."
                    rows={1}
                    style={{
                      flex:1, border:"none", background:"transparent",
                      color:T.text1, fontSize:14, outline:"none", resize:"none",
                      fontFamily:"Outfit,sans-serif", lineHeight:1.5,
                      maxHeight:80, overflowY:"auto",
                    }}
                    onInput={e => {
                      e.target.style.height = "auto";
                      e.target.style.height = Math.min(e.target.scrollHeight, 80) + "px";
                    }}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || loading}
                    style={{
                      width:34, height:34, borderRadius:11, border:"none", flexShrink:0,
                      background: input.trim() && !loading ? T.gradViolet : T.bg3,
                      cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      transition:"all 0.2s",
                      boxShadow: input.trim() && !loading ? `0 4px 12px ${T.violetGlow}` : "none",
                    }}
                  >
                    {loading
                      ? <div style={{ width:14, height:14, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.2)", borderTopColor:"#fff", animation:"spin 0.6s linear infinite" }}/>
                      : <Send size={14} color={input.trim() ? "#fff" : T.text3}/>
                    }
                  </button>
                </div>
                <p style={{ fontSize:10, color:T.text3, textAlign:"center", marginTop:6 }}>
                  Enter to send · Shift+Enter for new line
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
