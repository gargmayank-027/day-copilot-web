import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Send, Sparkles, Plus, Trash2, Calendar,
  AlertTriangle, ChevronDown, Bot, Brain
} from "lucide-react";
import {
  fetchUserPatterns,
  fetchRecentChats,
  saveChatMessage,
} from "./behaviourTracker";

/* ─── THEME ───────────────────────────────────────────────────────────────── */
const T = {
  bg0:"#09090F", bg1:"#111118", bg2:"#18181F", bg3:"#202028",
  border:"rgba(255,255,255,0.07)",
  text1:"#F0EFF8", text2:"#8B8A9E", text3:"#4A4960",
  violetMid:"#8B5CF6", violetSoft:"rgba(124,58,237,0.14)",
  violetGlow:"rgba(124,58,237,0.38)",
  coral:"#F97316",
  green:"#10B981",
  amber:"#F59E0B", amberSoft:"rgba(245,158,11,0.12)",
  red:"#EF4444",
  gradViolet:"linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)",
};

const CSS = `
  @keyframes slideUpChat{from{opacity:0;transform:translateY(20px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes msgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(0.92)}}
  @keyframes typingDot{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
`;

const QUICK_ACTIONS = [
  { label:"☀️ Morning briefing",    prompt:"Give me a morning briefing for today"                 },
  { label:"🔄 Reschedule my day",   prompt:"I need to reschedule my day, help me reprioritize"    },
  { label:"⚠️ Recovery mode",       prompt:"I've fallen behind on tasks, help me recover"          },
  { label:"🌦 Weather check",       prompt:"Check the weather and suggest if any tasks need changes"},
  { label:"📊 Weekly insights",     prompt:"Analyze my task patterns and give me weekly insights"  },
  { label:"➕ Add tasks from goals", prompt:"Suggest new tasks based on my goals and profile"       },
];

/* ─── Weather (Open-Meteo, free, no key needed) ───────────────────────────── */
async function fetchWeather(lat, lon) {
  try {
    const res  = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m,precipitation&timezone=auto`);
    const data = await res.json();
    const c = data.current, code = c.weathercode;
    const condition =
      code===0?"Clear sky":code<=3?"Partly cloudy":code<=49?"Foggy":
      code<=67?"Rainy":code<=77?"Snowy":code<=82?"Showers":"Thunderstorm";
    return { temp:Math.round(c.temperature_2m), condition, wind:Math.round(c.windspeed_10m), precip:c.precipitation, isOutdoorOk:code<=3&&c.precipitation===0 };
  } catch { return null; }
}

function getUserLocation() {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat:p.coords.latitude, lon:p.coords.longitude }),
      () => resolve(null), { timeout:5000 }
    );
  });
}

/* ─── System prompt builder ───────────────────────────────────────────────── */
function buildSystemPrompt(userProfile, tasks, weather, patternSummary, now) {
  const all     = Object.values(tasks).flat();
  const done    = all.filter(t => t.done);
  const momentum= all.length ? Math.round(done.length/all.length*100) : 0;
  const hour    = now.getHours();
  const timeOfDay = hour<12?"morning":hour<17?"afternoon":"evening";

  const tasksSummary = ["morning","afternoon","evening"].map(s => {
    const st = tasks[s]||[];
    if (!st.length) return `${s}: empty`;
    return `${s}:\n`+st.map(t=>`  - [${t.done?"✓":"○"}] "${t.title}" (${t.duration}min, ${t.tag}) [id:${t.id}]`).join("\n");
  }).join("\n");

  const weatherStr = weather
    ? `${weather.condition}, ${weather.temp}°C, wind ${weather.wind}km/h. Outdoor tasks: ${weather.isOutdoorOk?"FINE":"NOT RECOMMENDED"}.`
    : "unavailable";

  return `You are Day Copilot, an intelligent personal AI productivity coach. You learn from each user's behaviour over time and give increasingly personalized advice.

## USER PROFILE
Name: ${userProfile?.name||"User"}
Energy type: ${userProfile?.energy_type||"unknown"} (early=peak before noon, midday=peak after lunch, night=peak after 6pm)
Work hours: ${userProfile?.work_start||"9:00"} - ${userProfile?.work_end||"18:00"}
Work days: ${userProfile?.work_days?.join(", ")||"Mon-Fri"}
Goals: ${userProfile?.goals?.join(", ")||"productivity"}
Focus duration: ${userProfile?.focus_duration||45} minutes
Break style: ${userProfile?.break_style||"custom"}
Commitments: ${userProfile?.commitments?.join(", ")||"none"}

## CURRENT STATE
Time: ${now.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})} (${timeOfDay})
Date: ${now.toLocaleDateString("en-IN",{weekday:"long",month:"long",day:"numeric"})}
Momentum: ${momentum}%
Completed: ${done.length}/${all.length} tasks
Weather: ${weatherStr}

## TODAY'S TASKS
${tasksSummary}

${patternSummary}

## ACTIONS YOU CAN TAKE
When performing task actions, include this exact JSON block in your response:

\`\`\`actions
[
  {"action":"add_task","title":"Task title","section":"morning|afternoon|evening","duration":30,"tag":"work|comms|wellness|growth"},
  {"action":"delete_task","id":"exact-task-uuid"},
  {"action":"complete_task","id":"exact-task-uuid"},
  {"action":"reschedule_task","id":"exact-task-uuid","section":"evening"}
]
\`\`\`

Rules:
- Only use IDs exactly as shown above in [id:...]
- Always explain what you're doing BEFORE the action block
- You can chain multiple actions in one block
- After actions, briefly confirm what changed

## BEHAVIOUR-BASED COACHING RULES
- Reference actual patterns when giving advice ("I notice you tend to skip wellness tasks in the afternoon...")
- If user has low completion on a tag, suggest fewer tasks of that type or moving them to better times
- If user is most productive at certain hours, schedule deep work there
- If user has been rescheduling a lot, gently suggest they may be over-planning
- For new users (no history), be encouraging and ask what's working for them
- Morning briefing: reference yesterday's patterns if available
- Weekly insights: give specific numbers, not vague advice

## PERSONALITY
- Like a smart, caring friend who knows your habits — not a corporate assistant
- Reference the user's name naturally
- Be specific, not generic — use actual task names and real numbers
- Keep responses concise. No filler. Every sentence should add value.
- For recovery mode: empathetic first, then ruthlessly practical`;
}

/* ─── Parse AI response ───────────────────────────────────────────────────── */
function parseResponse(raw) {
  const match = raw.match(/```actions\n([\s\S]*?)\n```/);
  let actions = [], text = raw;
  if (match) {
    try { actions = JSON.parse(match[1]); } catch {}
    text = raw.replace(/```actions\n[\s\S]*?\n```/, "").trim();
  }
  return { text, actions };
}

/* ─── Action chip ─────────────────────────────────────────────────────────── */
function ActionChip({ action }) {
  const cfg = {
    add_task:       { icon:Plus,     color:T.green,    label:`Added: "${action.title?.slice(0,30)}"` },
    delete_task:    { icon:Trash2,   color:T.red,      label:"Task removed"                          },
    complete_task:  { icon:Sparkles, color:T.violetMid,label:"Marked complete"                       },
    reschedule_task:{ icon:Calendar, color:T.amber,    label:`Moved to ${action.section}`            },
  }[action.action] || { icon:Brain, color:T.text2, label:action.action };
  const Icon = cfg.icon;
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 9px", borderRadius:99, background:`${cfg.color}15`, border:`1px solid ${cfg.color}33`, marginTop:4, marginRight:4 }}>
      <Icon size={10} color={cfg.color}/>
      <span style={{ fontSize:11, fontWeight:600, color:cfg.color }}>{cfg.label}</span>
    </div>
  );
}

/* ─── Message bubble ──────────────────────────────────────────────────────── */
function MessageBubble({ msg }) {
  if (msg.role === "system") {
    return (
      <div style={{ textAlign:"center", padding:"6px 0", animation:"msgIn 0.2s ease" }}>
        <span style={{ fontSize:11, color:T.text3, background:T.bg2, padding:"4px 12px", borderRadius:99, border:`1px solid ${T.border}` }}>{msg.content}</span>
      </div>
    );
  }
  const isUser = msg.role === "user";
  return (
    <div style={{ display:"flex", flexDirection:isUser?"row-reverse":"row", gap:8, marginBottom:12, animation:"msgIn 0.25s ease" }}>
      {!isUser && (
        <div style={{ width:28, height:28, borderRadius:9, background:T.gradViolet, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, alignSelf:"flex-end", boxShadow:`0 4px 12px ${T.violetGlow}` }}>
          <Bot size={14} color="#fff"/>
        </div>
      )}
      <div style={{ maxWidth:"82%", display:"flex", flexDirection:"column", alignItems:isUser?"flex-end":"flex-start" }}>
        <div style={{ padding:"11px 14px", borderRadius:isUser?"18px 18px 4px 18px":"18px 18px 18px 4px", background:isUser?T.gradViolet:T.bg2, border:isUser?"none":`1px solid ${T.border}`, boxShadow:isUser?`0 4px 16px ${T.violetGlow}`:"none" }}>
          <p style={{ fontSize:14, color:isUser?"#fff":T.text1, lineHeight:1.55, whiteSpace:"pre-wrap", margin:0 }}>
            {msg.text||msg.content}
          </p>
        </div>
        {msg.actions?.length>0 && (
          <div style={{ marginTop:6, display:"flex", flexWrap:"wrap" }}>
            {msg.actions.map((a,i) => <ActionChip key={i} action={a}/>)}
          </div>
        )}
        <span style={{ fontSize:10, color:T.text3, marginTop:4 }}>{msg.time}</span>
      </div>
    </div>
  );
}

/* ─── Typing indicator ────────────────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div style={{ display:"flex", gap:8, marginBottom:12 }}>
      <div style={{ width:28, height:28, borderRadius:9, background:T.gradViolet, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, alignSelf:"flex-end" }}>
        <Bot size={14} color="#fff"/>
      </div>
      <div style={{ padding:"12px 16px", borderRadius:"18px 18px 18px 4px", background:T.bg2, border:`1px solid ${T.border}`, display:"flex", gap:5, alignItems:"center" }}>
        {[0,1,2].map(i=>(
          <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:T.violetMid, animation:`typingDot 1.2s ease ${i*0.15}s infinite` }}/>
        ))}
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ──────────────────────────────────────────────────────── */
export default function AICopilot({
  apiKey,
  userId,
  userProfile,
  tasks,
  mood,
  onAddTask,
  onDeleteTask,
  onCompleteTask,
  onRescheduleTask,
}) {
  const [open,          setOpen]         = useState(false);
  const [messages,      setMessages]     = useState([]);
  const [input,         setInput]        = useState("");
  const [loading,       setLoading]      = useState(false);
  const [loadingCtx,    setLoadingCtx]   = useState(true);  // loading patterns
  const [weather,       setWeather]      = useState(null);
  const [hasNotif,      setHasNotif]     = useState(true);
  const [apiHistory,    setApiHistory]   = useState([]);    // persisted history for API
  const [patternSummary,setPatternSummary]=useState("");
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const now       = new Date();

  /* ── Scroll to bottom ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, loading]);

  /* ── Focus input when opened ── */
  useEffect(() => {
    if (open) { setTimeout(()=>inputRef.current?.focus(), 300); setHasNotif(false); }
  }, [open]);

  /* ── Fetch weather ── */
  useEffect(() => {
    (async () => {
      const loc = await getUserLocation();
      if (loc) setWeather(await fetchWeather(loc.lat, loc.lon));
    })();
  }, []);

  /* ── Load patterns + chat history from Supabase ── */
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoadingCtx(true);
      const [patterns, recentChats] = await Promise.all([
        fetchUserPatterns(userId, 14),
        fetchRecentChats(userId, 20),
      ]);
      setPatternSummary(patterns);

      // Seed API history with recent chats so AI remembers past convos
      if (recentChats.length > 0) {
        setApiHistory(recentChats.map(c => ({ role:c.role==="assistant"?"model":"user", content:c.content })));
      }
      setLoadingCtx(false);
    })();
  }, [userId]);

  /* ── Welcome message (after context loads) ── */
  useEffect(() => {
    if (loadingCtx) return;
    const hour    = now.getHours();
    const name    = userProfile?.name || "there";
    const all     = Object.values(tasks).flat();
    const pending = all.filter(t=>!t.done).length;
    const momentum= all.length ? Math.round(all.filter(t=>t.done).length/all.length*100) : 0;
    const hasHistory = patternSummary && !patternSummary.includes("new user");

    let welcome = hour<12
      ? `Good morning, ${name}! ☀️ You have ${pending} tasks ahead${hasHistory?" — and I know your patterns well enough to help you nail them":""}.`
      : hour<17
      ? `Hey ${name}! 🎯 ${momentum}% momentum, ${pending} tasks left. ${hasHistory?"Based on your patterns, let me help you finish strong.":"How can I help you right now?"}`
      : `Evening, ${name} 🌙 ${momentum}% complete today. ${hasHistory?"I can see your recent trends — want a quick debrief or help planning tomorrow?":"Want help wrapping up or planning tomorrow?"}`;

    if (weather && !weather.isOutdoorOk) {
      welcome += `\n\n⚠️ Weather alert: ${weather.condition} (${weather.temp}°C). Let me know if you have outdoor tasks — I can reschedule them.`;
    }

    setMessages([{
      id:"welcome", role:"assistant", text:welcome, actions:[],
      time: now.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}),
    }]);
  }, [loadingCtx, weather]);

  /* ── Execute task actions ── */
  const executeActions = useCallback(async (actions) => {
    for (const a of actions) {
      try {
        if (a.action==="add_task") {
          await onAddTask(a.section, { title:a.title, duration:a.duration||20, tag:a.tag||"work", done:false, section:a.section });
        } else if (a.action==="delete_task") {
          await onDeleteTask(a.id);
        } else if (a.action==="complete_task") {
          const task = Object.values(tasks).flat().find(t=>t.id===a.id);
          if (task) await onCompleteTask(task.id, task.done);
        } else if (a.action==="reschedule_task") {
          await onRescheduleTask(a.id, a.section);
        }
      } catch(e) { console.error("Action failed:", a, e); }
    }
  }, [tasks, onAddTask, onDeleteTask, onCompleteTask, onRescheduleTask]);

  /* ── Send message ── */
  const sendMessage = useCallback(async (text) => {
    if (!text.trim()||loading) return;
    const userText = text.trim();
    setInput("");
    setLoading(true);

    const timeStr = now.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
    setMessages(prev=>[...prev,{ id:Date.now(), role:"user", text:userText, content:userText, actions:[], time:timeStr }]);

    // Save user message to Supabase
    await saveChatMessage(userId, "user", userText);

    const newApiHistory = [...apiHistory, { role:"user", content:userText }];

    try {
      const systemPrompt = buildSystemPrompt(userProfile, tasks, weather, patternSummary, new Date());

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            system_instruction:{ parts:[{ text:systemPrompt }] },
            contents: newApiHistory.map(m=>({ role:m.role, parts:[{ text:m.content }] })),
          }),
        }
      );

      if (!res.ok) {
        const errBody = await res.json().catch(()=>({}));
        console.error("Gemini error:", errBody);
        throw new Error(`API error: ${res.status}`);
      }

      const data    = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that.";
      const { text:aiText, actions } = parseResponse(rawText);

      if (actions.length>0) await executeActions(actions);

      const aiMsg = {
        id:Date.now()+1, role:"assistant", text:aiText, actions,
        time: new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}),
      };
      setMessages(prev=>[...prev, aiMsg]);

      // Save AI response + update local history
      await saveChatMessage(userId, "assistant", rawText);
      setApiHistory([...newApiHistory, { role:"model", content:rawText }]);

    } catch(e) {
      setMessages(prev=>[...prev,{
        id:Date.now()+1, role:"assistant", actions:[],
        text: e.message.includes("400")||e.message.includes("401")
          ? "⚠️ Invalid Gemini API key. Check aistudio.google.com"
          : e.message.includes("429")
          ? "⚠️ Rate limit hit. Wait a moment and try again."
          : "⚠️ Something went wrong. Check your API key and connection.",
        time: new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}),
      }]);
    }
    setLoading(false);
  }, [loading, apiHistory, userProfile, tasks, weather, patternSummary, apiKey, userId, executeActions]);

  const handleKeyDown = e => {
    if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const noKey = !apiKey;

  return (
    <>
      <style>{CSS}</style>

      {/* ── Floating bubble ── */}
      <button onClick={()=>setOpen(!open)} style={{
        position:"fixed", bottom:88, right:16,
        width:52, height:52, borderRadius:"50%", border:"none", cursor:"pointer",
        background: open?T.bg2:T.gradViolet,
        boxShadow: open?`0 4px 16px rgba(0,0,0,0.3),0 0 0 1px ${T.border}`:`0 8px 28px ${T.violetGlow},0 0 0 3px ${T.bg0}`,
        display:"flex", alignItems:"center", justifyContent:"center",
        zIndex:150, transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        transform:open?"scale(0.92)":"scale(1)",
      }}>
        {open ? <ChevronDown size={22} color={T.text2}/> : <Bot size={22} color="#fff" strokeWidth={2}/>}
        {hasNotif&&!open&&(
          <div style={{ position:"absolute", top:2, right:2, width:10, height:10, borderRadius:"50%", background:T.coral, border:`2px solid ${T.bg0}`, animation:"pulse 2s ease infinite" }}/>
        )}
      </button>

      {/* ── Chat panel ── */}
      {open&&(
        <div style={{
          position:"fixed", bottom:152, right:16,
          width:Math.min(window.innerWidth-32,380),
          height:Math.min(window.innerHeight-200,520),
          background:T.bg1, borderRadius:24,
          border:`1px solid ${T.border}`,
          boxShadow:`0 24px 64px rgba(0,0,0,0.5),0 0 0 1px ${T.violetGlow}`,
          display:"flex", flexDirection:"column",
          zIndex:149, overflow:"hidden",
          animation:"slideUpChat 0.3s cubic-bezier(0.34,1.2,0.64,1)",
        }}>

          {/* Header */}
          <div style={{ padding:"14px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
            <div style={{ width:34, height:34, borderRadius:11, background:T.gradViolet, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 4px 12px ${T.violetGlow}` }}>
              <Sparkles size={16} color="#fff"/>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:14, fontWeight:800, color:T.text1, letterSpacing:"-0.3px" }}>Day Copilot AI</p>
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:noKey?T.amber:loadingCtx?T.amber:T.green }}/>
                <p style={{ fontSize:11, color:T.text2 }}>
                  {noKey?"API key needed":loadingCtx?"Loading your patterns...":weather?`${weather.condition} · ${weather.temp}°C · Patterns loaded`:"Patterns loaded"}
                </p>
              </div>
            </div>
            <button onClick={()=>setOpen(false)} style={{ border:"none", background:"transparent", cursor:"pointer", padding:4 }}>
              <X size={16} color={T.text3}/>
            </button>
          </div>

          {/* No API key */}
          {noKey?(
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, textAlign:"center" }}>
              <div style={{ width:48, height:48, borderRadius:16, background:T.amberSoft, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
                <AlertTriangle size={24} color={T.amber}/>
              </div>
              <p style={{ fontSize:15, fontWeight:700, color:T.text1, marginBottom:8 }}>API Key Required</p>
              <p style={{ fontSize:13, color:T.text2, lineHeight:1.6, marginBottom:16 }}>
                Add your Gemini API key to unlock the AI assistant. Get one free at aistudio.google.com
              </p>
              <div style={{ background:T.bg3, borderRadius:12, padding:"10px 14px", width:"100%", border:`1px solid ${T.border}` }}>
                <p style={{ fontSize:11, color:T.text3, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:6 }}>In App.jsx</p>
                <code style={{ fontSize:12, color:T.violetMid, fontFamily:"monospace" }}>
                  {"apiKey=\"AIzaSy-...\""}<br/>{"// Pass to <AICopilot>"}
                </code>
              </div>
            </div>
          ):(
            <>
              {/* Messages */}
              <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 8px", display:"flex", flexDirection:"column" }}>

                {/* Loading context indicator */}
                {loadingCtx&&(
                  <div style={{ textAlign:"center", padding:"20px 0", animation:"fadeIn 0.3s ease" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:8 }}>
                      <div style={{ width:16, height:16, borderRadius:"50%", border:`2px solid ${T.violetSoft}`, borderTopColor:T.violetMid, animation:"spin 0.7s linear infinite" }}/>
                      <span style={{ fontSize:13, color:T.text2 }}>Loading your patterns...</span>
                    </div>
                    <p style={{ fontSize:11, color:T.text3 }}>Analysing your behaviour history</p>
                  </div>
                )}

                {/* Quick actions */}
                {!loadingCtx&&messages.length<=1&&(
                  <div style={{ marginBottom:16, animation:"fadeIn 0.4s ease 0.3s both" }}>
                    <p style={{ fontSize:11, fontWeight:700, color:T.text3, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8 }}>Quick actions</p>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {QUICK_ACTIONS.map(({label,prompt})=>(
                        <button key={label} onClick={()=>sendMessage(prompt)} style={{
                          padding:"6px 12px", borderRadius:99, border:`1px solid ${T.border}`,
                          background:T.bg2, color:T.text2, fontSize:12, fontWeight:500,
                          cursor:"pointer", transition:"all 0.15s", whiteSpace:"nowrap",
                        }}
                          onMouseEnter={e=>{e.target.style.borderColor=T.violetMid;e.target.style.color=T.text1;}}
                          onMouseLeave={e=>{e.target.style.borderColor=T.border;e.target.style.color=T.text2;}}
                        >{label}</button>
                      ))}
                    </div>
                  </div>
                )}

                {!loadingCtx&&messages.map(msg=><MessageBubble key={msg.id} msg={msg}/>)}
                {loading&&<TypingIndicator/>}
                <div ref={bottomRef}/>
              </div>

              {/* Input */}
              <div style={{ padding:"10px 12px 12px", borderTop:`1px solid ${T.border}`, flexShrink:0 }}>
                <div style={{ display:"flex", gap:8, alignItems:"flex-end", background:T.bg2, borderRadius:16, border:`1px solid ${T.border}`, padding:"8px 8px 8px 14px" }}>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e=>setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me anything about your day..."
                    rows={1}
                    disabled={loadingCtx}
                    style={{
                      flex:1, border:"none", background:"transparent",
                      color:T.text1, fontSize:14, outline:"none", resize:"none",
                      fontFamily:"Outfit,sans-serif", lineHeight:1.5,
                      maxHeight:80, overflowY:"auto",
                    }}
                    onInput={e=>{
                      e.target.style.height="auto";
                      e.target.style.height=Math.min(e.target.scrollHeight,80)+"px";
                    }}
                  />
                  <button onClick={()=>sendMessage(input)} disabled={!input.trim()||loading||loadingCtx} style={{
                    width:34, height:34, borderRadius:11, border:"none", flexShrink:0,
                    background:input.trim()&&!loading&&!loadingCtx?T.gradViolet:T.bg3,
                    cursor:input.trim()&&!loading&&!loadingCtx?"pointer":"not-allowed",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    transition:"all 0.2s",
                    boxShadow:input.trim()&&!loading?`0 4px 12px ${T.violetGlow}`:"none",
                  }}>
                    {loading
                      ?<div style={{ width:14, height:14, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.2)", borderTopColor:"#fff", animation:"spin 0.6s linear infinite" }}/>
                      :<Send size={14} color={input.trim()?"#fff":T.text3}/>
                    }
                  </button>
                </div>
                <p style={{ fontSize:10, color:T.text3, textAlign:"center", marginTop:6 }}>Enter to send · Shift+Enter for new line</p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
