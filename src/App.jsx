import { useState, useEffect } from "react";
import {
  Smile, Meh, Frown, CheckCircle, Clock, Plus, Calendar,
  BarChart2, User, Zap, Target, Sun, Moon, Flame,
  TrendingUp, Award, Bell, Coffee, X, Edit3,
  Battery, Wind, ChevronRight
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   THEME — Midnight Dark × Electric Violet × Coral
   Best for 18–35: premium, focused, high-contrast, not corporate
───────────────────────────────────────────────────────────────────────────── */
const T = {
  bg0:   "#09090F",
  bg1:   "#111118",
  bg2:   "#18181F",
  bg3:   "#202028",
  border: "rgba(255,255,255,0.07)",
  text1: "#F0EFF8",
  text2: "#8B8A9E",
  text3: "#4A4960",
  violet:     "#7C3AED",
  violetMid:  "#8B5CF6",
  violetSoft: "rgba(124,58,237,0.14)",
  violetGlow: "rgba(124,58,237,0.38)",
  coral:      "#F97316",
  coralSoft:  "rgba(249,115,22,0.12)",
  green:      "#10B981",
  greenSoft:  "rgba(16,185,129,0.12)",
  amber:      "#F59E0B",
  amberSoft:  "rgba(245,158,11,0.12)",
  red:        "#EF4444",
  redSoft:    "rgba(239,68,68,0.12)",
  gradViolet: "linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)",
  gradHero:   "linear-gradient(135deg,#7C3AED 0%,#9333EA 60%,#F97316 100%)",
};

const TAG_META = {
  work:     { bg:"rgba(139,92,246,0.14)", text:"#A78BFA", dot:"#8B5CF6" },
  comms:    { bg:"rgba(59,130,246,0.14)", text:"#93C5FD", dot:"#60A5FA" },
  wellness: { bg:"rgba(16,185,129,0.14)", text:"#6EE7B7", dot:"#10B981" },
  growth:   { bg:"rgba(245,158,11,0.14)", text:"#FCD34D", dot:"#F59E0B" },
};

const INITIAL_TASKS = {
  morning: [
    { id:1, title:"Review sprint goals",    done:true,  duration:15, tag:"work"    },
    { id:2, title:"Reply to team messages", done:false, duration:20, tag:"comms"   },
    { id:3, title:"Morning journal entry",  done:false, duration:10, tag:"wellness"},
  ],
  afternoon: [
    { id:4, title:"Deep work: feature build", done:false, duration:90, tag:"work"    },
    { id:5, title:"Team standup call",        done:false, duration:30, tag:"comms"   },
    { id:6, title:"Lunch walk",               done:true,  duration:20, tag:"wellness"},
  ],
  evening: [
    { id:7, title:"Plan tomorrow", done:false, duration:15, tag:"work"  },
    { id:8, title:"Read 30 min",   done:false, duration:30, tag:"growth"},
  ],
};

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  body{background:${T.bg0};}
  ::-webkit-scrollbar{display:none;}
  input,select{color-scheme:dark;font-family:Outfit,sans-serif;}
  input[type=range]{accent-color:${T.violetMid};}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
  @keyframes backdropIn{from{opacity:0}to{opacity:1}}
`;

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const getMomentum = t => { const a=Object.values(t).flat(); return a.length?Math.round(a.filter(x=>x.done).length/a.length*100):0; };
const getNext = t => { for(const s of["morning","afternoon","evening"]){const x=t[s].find(x=>!x.done);if(x)return{...x,section:s};}return null; };
const now = new Date();
const greeting = now.getHours()<12?"Good morning":now.getHours()<17?"Good afternoon":"Good evening";
const dateStr = now.toLocaleDateString("en-IN",{weekday:"long",month:"long",day:"numeric"});

/* ─── Atoms ───────────────────────────────────────────────────────────────── */
function Badge({tag}){
  const m=TAG_META[tag]||{bg:T.bg3,text:T.text2,dot:T.text3};
  return(
    <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.05em",padding:"3px 9px",borderRadius:99,background:m.bg,color:m.text,display:"inline-flex",alignItems:"center",gap:4,textTransform:"uppercase"}}>
      <span style={{width:4,height:4,borderRadius:"50%",background:m.dot,flexShrink:0}}/>
      {tag}
    </span>
  );
}

function Card({children,style={},glow=false}){
  return(
    <div style={{background:T.bg1,borderRadius:20,border:`1px solid ${T.border}`,padding:"18px",marginBottom:12,position:"relative",overflow:"hidden",...(glow&&{boxShadow:`0 0 0 1px ${T.violetGlow},0 8px 32px ${T.violetGlow}`}),...style}}>
      {children}
    </div>
  );
}

function SLabel({icon:Icon,label,color=T.text2}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
      <Icon size={13} color={color} strokeWidth={2}/>
      <span style={{fontSize:11,fontWeight:700,color,letterSpacing:"0.08em",textTransform:"uppercase"}}>{label}</span>
    </div>
  );
}

function StatCard({label,value,icon:Icon,color,soft}){
  return(
    <div style={{background:soft,borderRadius:18,padding:"16px 14px",border:`1px solid ${color}22`}}>
      <Icon size={18} color={color} style={{marginBottom:10}}/>
      <p style={{fontSize:22,fontWeight:800,color:T.text1,letterSpacing:"-0.5px"}}>{value}</p>
      <p style={{fontSize:11,color:T.text2,marginTop:2,fontWeight:500}}>{label}</p>
    </div>
  );
}

/* ─── TaskRow ─────────────────────────────────────────────────────────────── */
function TaskRow({task,onToggle,compact=false}){
  const[pressed,setPressed]=useState(false);
  return(
    <div onClick={()=>onToggle(task.id)} onMouseDown={()=>setPressed(true)} onMouseUp={()=>setPressed(false)} onTouchStart={()=>setPressed(true)} onTouchEnd={()=>setPressed(false)}
      style={{display:"flex",alignItems:"center",gap:12,padding:compact?"10px 0":"13px 0",borderBottom:`1px solid ${T.border}`,cursor:"pointer",opacity:task.done?0.38:1,transform:pressed?"scale(0.985)":"scale(1)",transition:"all 0.15s ease"}}>
      <div style={{width:22,height:22,borderRadius:7,flexShrink:0,border:task.done?"none":`1.5px solid ${T.text3}`,background:task.done?T.gradViolet:"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
        {task.done&&<CheckCircle size={13} color="#fff" strokeWidth={2.5}/>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <p style={{fontSize:14,fontWeight:500,color:T.text1,textDecoration:task.done?"line-through":"none",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.4}}>{task.title}</p>
        {!compact&&<div style={{display:"flex",alignItems:"center",gap:5,marginTop:3}}><Clock size={11} color={T.text3}/><span style={{fontSize:11,color:T.text3}}>{task.duration}m</span></div>}
      </div>
      {!compact&&<Badge tag={task.tag}/>}
    </div>
  );
}

/* ─── MoodSelector ────────────────────────────────────────────────────────── */
function MoodSelector({mood,setMood}){
  const moods=[{key:"high",Icon:Smile,label:"Energized",color:T.green,soft:T.greenSoft},{key:"neutral",Icon:Meh,label:"Steady",color:T.amber,soft:T.amberSoft},{key:"low",Icon:Frown,label:"Drained",color:T.red,soft:T.redSoft}];
  return(
    <div style={{display:"flex",gap:8}}>
      {moods.map(({key,Icon,label,color,soft})=>{
        const a=mood===key;
        return(<button key={key} onClick={()=>setMood(key)} style={{flex:1,border:a?`1.5px solid ${color}`:`1px solid ${T.border}`,borderRadius:16,padding:"14px 6px",background:a?soft:T.bg2,cursor:"pointer",transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)",transform:a?"scale(1.06)":"scale(1)"}}>
          <Icon size={22} color={a?color:T.text3} style={{margin:"0 auto 6px",display:"block"}}/>
          <p style={{fontSize:11,fontWeight:700,color:a?color:T.text3,letterSpacing:"0.03em"}}>{label}</p>
        </button>);
      })}
    </div>
  );
}

/* ─── MomentumBar ─────────────────────────────────────────────────────────── */
function MomentumBar({pct}){
  const color=pct>=70?T.green:pct>=40?T.amber:T.red;
  const grad=pct>=70?"linear-gradient(90deg,#10B981,#34D399)":pct>=40?"linear-gradient(90deg,#F59E0B,#FCD34D)":"linear-gradient(90deg,#EF4444,#F87171)";
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}><Flame size={15} color={color}/><span style={{fontSize:13,fontWeight:700,color:T.text1}}>Momentum</span></div>
        <span style={{fontSize:14,fontWeight:800,color,letterSpacing:"-0.3px"}}>{pct}%</span>
      </div>
      <div style={{height:7,borderRadius:99,background:T.bg3}}>
        <div style={{height:"100%",borderRadius:99,width:`${pct}%`,background:grad,transition:"width 0.6s cubic-bezier(0.34,1.56,0.64,1)",boxShadow:`0 0 10px ${color}66`}}/>
      </div>
    </div>
  );
}

/* ─── AddTaskSheet ────────────────────────────────────────────────────────── */
function AddTaskSheet({onClose,onAdd}){
  const[title,setTitle]=useState("");
  const[dur,setDur]=useState("20");
  const[tag,setTag]=useState("work");
  const[section,setSection]=useState("morning");

  const iStyle={width:"100%",background:T.bg2,border:`1px solid ${T.border}`,borderRadius:14,padding:"13px 14px",fontSize:14,color:T.text1,outline:"none",transition:"border 0.2s"};

  const handleAdd=()=>{
    if(!title.trim())return;
    onAdd(section,{id:Date.now(),title:title.trim(),done:false,duration:parseInt(dur)||20,tag});
    onClose();
  };

  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(6px)",zIndex:200,animation:"backdropIn 0.2s ease"}}/>
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:T.bg1,borderRadius:"24px 24px 0 0",border:`1px solid ${T.border}`,padding:"24px 20px 44px",zIndex:201,animation:"slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1)"}}>
        {/* Handle */}
        <div style={{width:36,height:4,borderRadius:99,background:T.bg3,margin:"0 auto 20px"}}/>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div>
            <p style={{fontSize:20,fontWeight:800,color:T.text1,letterSpacing:"-0.4px"}}>New Task</p>
            <p style={{fontSize:12,color:T.text2,marginTop:2}}>What do you want to get done?</p>
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:99,border:`1px solid ${T.border}`,background:T.bg2,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <X size={15} color={T.text2}/>
          </button>
        </div>
        {/* Title input */}
        <input autoFocus placeholder="Task title..." value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAdd()}
          style={{...iStyle,marginBottom:10,fontSize:16,fontWeight:500}}
          onFocus={e=>e.target.style.borderColor=T.violetMid} onBlur={e=>e.target.style.borderColor=T.border}/>
        {/* Duration + tag */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          {[{label:"Duration",el:<select value={dur} onChange={e=>setDur(e.target.value)} style={{...iStyle,padding:"11px 12px"}}>{[5,10,15,20,30,45,60,90,120].map(v=><option key={v} value={v}>{v} min</option>)}</select>},
            {label:"Category",el:<select value={tag} onChange={e=>setTag(e.target.value)} style={{...iStyle,padding:"11px 12px"}}>{["work","comms","wellness","growth"].map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}</select>}]
            .map(({label,el})=>(
            <div key={label}>
              <p style={{fontSize:11,fontWeight:700,color:T.text3,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>{label}</p>
              {el}
            </div>
          ))}
        </div>
        {/* Section */}
        <p style={{fontSize:11,fontWeight:700,color:T.text3,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:8}}>Add to</p>
        <div style={{display:"flex",gap:8,marginBottom:20}}>
          {[{key:"morning",label:"Morning",Icon:Coffee},{key:"afternoon",label:"Afternoon",Icon:Sun},{key:"evening",label:"Evening",Icon:Moon}].map(({key,label,Icon})=>(
            <button key={key} onClick={()=>setSection(key)} style={{flex:1,padding:"10px 6px",borderRadius:14,border:section===key?`1.5px solid ${T.violetMid}`:`1px solid ${T.border}`,background:section===key?T.violetSoft:T.bg2,cursor:"pointer",transition:"all 0.18s"}}>
              <Icon size={14} color={section===key?T.violetMid:T.text3} style={{margin:"0 auto 4px",display:"block"}}/>
              <p style={{fontSize:11,fontWeight:600,color:section===key?T.violetMid:T.text2}}>{label}</p>
            </button>
          ))}
        </div>
        {/* CTA */}
        <button onClick={handleAdd} style={{width:"100%",border:"none",borderRadius:16,padding:"15px",background:title.trim()?T.gradViolet:T.bg3,color:title.trim()?"#fff":T.text3,fontSize:15,fontWeight:700,cursor:"pointer",transition:"all 0.2s",boxShadow:title.trim()?`0 8px 24px ${T.violetGlow}`:"none"}}>
          Add Task
        </button>
      </div>
    </>
  );
}

/* ─── HOME VIEW ───────────────────────────────────────────────────────────── */
function HomeView({tasks,setTasks,mood,setMood}){
  const momentum=getMomentum(tasks);
  const nextTask=getNext(tasks);
  const all=Object.values(tasks).flat();
  const done=all.filter(t=>t.done).length;

  const toggle=id=>setTasks(prev=>{const u={};for(const s in prev)u[s]=prev[s].map(t=>t.id===id?{...t,done:!t.done}:t);return u;});

  return(
    <div style={{animation:"fadeUp 0.3s ease"}}>
      {/* Header */}
      <div style={{marginBottom:22}}>
        <p style={{fontSize:12,color:T.text2,fontWeight:500,marginBottom:4}}>{dateStr}</p>
        <h1 style={{fontSize:28,fontWeight:800,color:T.text1,letterSpacing:"-0.8px",lineHeight:1.15}}>
          {greeting},<br/>
          <span style={{background:T.gradHero,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>let's crush it.</span>
        </h1>
      </div>

      {/* Hero next task */}
      {nextTask?(
        <div style={{background:T.gradViolet,borderRadius:22,padding:"22px 20px",marginBottom:12,position:"relative",overflow:"hidden",boxShadow:`0 16px 40px ${T.violetGlow}`}}>
          <div style={{position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:"50%",background:"rgba(255,255,255,0.07)",pointerEvents:"none"}}/>
          <div style={{position:"absolute",bottom:-20,left:-20,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,0.05)",pointerEvents:"none"}}/>
          <p style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:"rgba(255,255,255,0.55)",textTransform:"uppercase",marginBottom:6}}>Up next</p>
          <p style={{fontSize:18,fontWeight:700,color:"#fff",marginBottom:6,lineHeight:1.3}}>{nextTask.title}</p>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18}}>
            <Clock size={12} color="rgba(255,255,255,0.65)"/>
            <span style={{fontSize:12,color:"rgba(255,255,255,0.65)"}}>{nextTask.duration} min</span>
            <span style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.45)",background:"rgba(255,255,255,0.1)",padding:"2px 8px",borderRadius:99,textTransform:"uppercase",letterSpacing:"0.05em"}}>{nextTask.tag}</span>
          </div>
          <button onClick={()=>toggle(nextTask.id)} style={{display:"flex",alignItems:"center",gap:8,border:"none",background:"rgba(255,255,255,0.16)",borderRadius:12,padding:"11px 18px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",backdropFilter:"blur(8px)",transition:"background 0.18s"}}
            onMouseDown={e=>e.currentTarget.style.background="rgba(255,255,255,0.24)"} onMouseUp={e=>e.currentTarget.style.background="rgba(255,255,255,0.16)"}>
            <CheckCircle size={15} color="#fff"/> Mark complete
          </button>
        </div>
      ):(
        <Card style={{textAlign:"center",padding:"28px 20px",background:T.greenSoft,border:`1px solid ${T.green}33`}}>
          <Award size={32} color={T.green} style={{margin:"0 auto 10px",display:"block"}}/>
          <p style={{fontSize:17,fontWeight:700,color:T.text1}}>All done! 🎉</p>
          <p style={{fontSize:13,color:T.text2,marginTop:4}}>You've completed everything today.</p>
        </Card>
      )}

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <StatCard label="Completed" value={`${done}/${all.length}`} icon={CheckCircle} color={T.green} soft={T.greenSoft}/>
        <StatCard label="Focus left" value={`${all.filter(t=>!t.done).reduce((s,t)=>s+t.duration,0)}m`} icon={Clock} color={T.violetMid} soft={T.violetSoft}/>
      </div>

      <Card><MomentumBar pct={momentum}/></Card>

      <Card>
        <SLabel icon={Wind} label="Energy check"/>
        <MoodSelector mood={mood} setMood={setMood}/>
      </Card>

      <Card>
        <SLabel icon={CheckCircle} label="Today's tasks"/>
        {all.slice(0,5).map(t=><TaskRow key={t.id} task={t} onToggle={toggle} compact/>)}
        {all.length>5&&<p style={{marginTop:10,fontSize:13,color:T.violetMid,fontWeight:600}}>+{all.length-5} more</p>}
      </Card>
    </div>
  );
}

/* ─── PLANNER VIEW ────────────────────────────────────────────────────────── */
function PlannerView({tasks,setTasks}){
  const sections=[
    {key:"morning",  label:"Morning",   Icon:Coffee, color:T.amber,    soft:T.amberSoft  },
    {key:"afternoon",label:"Afternoon", Icon:Sun,    color:T.coral,    soft:T.coralSoft  },
    {key:"evening",  label:"Evening",   Icon:Moon,   color:T.violetMid,soft:T.violetSoft },
  ];
  const toggle=id=>setTasks(prev=>{const u={};for(const s in prev)u[s]=prev[s].map(t=>t.id===id?{...t,done:!t.done}:t);return u;});

  return(
    <div style={{animation:"fadeUp 0.3s ease"}}>
      <div style={{marginBottom:22}}>
        <p style={{fontSize:12,color:T.text2,marginBottom:4}}>{dateStr}</p>
        <h1 style={{fontSize:28,fontWeight:800,color:T.text1,letterSpacing:"-0.8px"}}>Daily Planner</h1>
      </div>
      {sections.map(({key,label,Icon,color,soft})=>(
        <Card key={key} style={{padding:"16px 18px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
            <div style={{width:34,height:34,borderRadius:11,background:soft,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <Icon size={17} color={color}/>
            </div>
            <div style={{flex:1}}>
              <p style={{fontSize:15,fontWeight:700,color:T.text1}}>{label}</p>
              <p style={{fontSize:11,color:T.text2}}>{tasks[key].filter(t=>t.done).length}/{tasks[key].length} done · {tasks[key].reduce((s,t)=>s+t.duration,0)}m total</p>
            </div>
            <div style={{width:44,height:4,borderRadius:99,background:T.bg3,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:99,background:color,width:`${tasks[key].length?(tasks[key].filter(t=>t.done).length/tasks[key].length)*100:0}%`,transition:"width 0.4s ease"}}/>
            </div>
          </div>
          {tasks[key].map(t=><TaskRow key={t.id} task={t} onToggle={toggle}/>)}
          {tasks[key].length===0&&<p style={{fontSize:13,color:T.text3,padding:"10px 0 2px",textAlign:"center"}}>No tasks yet — tap + to add one</p>}
        </Card>
      ))}
    </div>
  );
}

/* ─── INSIGHTS VIEW ───────────────────────────────────────────────────────── */
function InsightsView({tasks,mood}){
  const all=Object.values(tasks).flat();
  const done=all.filter(t=>t.done).length;
  const momentum=getMomentum(tasks);
  const focusDone=all.filter(t=>t.done).reduce((s,t)=>s+t.duration,0);
  const focusLeft=all.filter(t=>!t.done).reduce((s,t)=>s+t.duration,0);
  const byTag={};all.forEach(t=>{byTag[t.tag]=(byTag[t.tag]||0)+1;});
  const MIcon=mood==="high"?Smile:mood==="low"?Frown:Meh;
  const mColor=mood==="high"?T.green:mood==="low"?T.red:T.amber;

  return(
    <div style={{animation:"fadeUp 0.3s ease"}}>
      <div style={{marginBottom:22}}>
        <p style={{fontSize:12,color:T.text2,marginBottom:4}}>{dateStr}</p>
        <h1 style={{fontSize:28,fontWeight:800,color:T.text1,letterSpacing:"-0.8px"}}>Insights</h1>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <StatCard label="Tasks done" value={`${done}/${all.length}`} icon={CheckCircle} color={T.green} soft={T.greenSoft}/>
        <StatCard label="Momentum"   value={`${momentum}%`}          icon={TrendingUp}  color={T.violetMid} soft={T.violetSoft}/>
        <StatCard label="Focus done" value={`${focusDone}m`}         icon={Clock}       color={T.coral} soft={T.coralSoft}/>
        <StatCard label="Day streak" value="4 days"                  icon={Flame}       color={T.amber} soft={T.amberSoft}/>
      </div>
      <Card>
        <SLabel icon={MIcon} label="Today's mood" color={mColor}/>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:50,height:50,borderRadius:16,background:`${mColor}18`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <MIcon size={26} color={mColor}/>
          </div>
          <div>
            <p style={{fontSize:17,fontWeight:700,color:T.text1}}>{mood==="high"?"Energized":mood==="low"?"Drained":"Steady"}</p>
            <p style={{fontSize:12,color:T.text2,marginTop:2}}>Logged for today</p>
          </div>
        </div>
      </Card>
      <Card>
        <SLabel icon={BarChart2} label="Tasks by category"/>
        {Object.entries(byTag).map(([tag,count])=>{
          const m=TAG_META[tag]||{bg:T.bg3,text:T.text2,dot:T.text3};
          const pct=Math.round((count/all.length)*100);
          return(
            <div key={tag} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:13,fontWeight:600,color:T.text1,textTransform:"capitalize"}}>{tag}</span>
                <span style={{fontSize:12,fontWeight:700,color:m.text}}>{count} · {pct}%</span>
              </div>
              <div style={{height:5,borderRadius:99,background:T.bg3}}>
                <div style={{height:"100%",borderRadius:99,width:`${pct}%`,background:m.dot,transition:"width 0.5s ease",boxShadow:`0 0 6px ${m.dot}88`}}/>
              </div>
            </div>
          );
        })}
      </Card>
      <Card>
        <SLabel icon={Battery} label="Focus time"/>
        <div style={{display:"flex",gap:10}}>
          {[{label:"done",value:`${focusDone}m`,color:T.green,soft:T.greenSoft},{label:"remaining",value:`${focusLeft}m`,color:T.text2,soft:T.bg2}].map(({label,value,color,soft})=>(
            <div key={label} style={{flex:1,textAlign:"center",background:soft,borderRadius:14,padding:"16px 10px",border:`1px solid ${T.border}`}}>
              <p style={{fontSize:24,fontWeight:800,color,letterSpacing:"-0.5px"}}>{value}</p>
              <p style={{fontSize:10,color:T.text3,marginTop:3,textTransform:"uppercase",letterSpacing:"0.05em",fontWeight:700}}>{label}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─── PROFILE VIEW ────────────────────────────────────────────────────────── */
function ProfileView(){
  const[workStart,setWorkStart]=useState("09:00");
  const[workEnd,setWorkEnd]=useState("18:00");
  const[focusDur,setFocusDur]=useState(45);
  const[breakDur,setBreakDur]=useState(10);
  const[notifs,setNotifs]=useState(true);

  const iStyle={width:"100%",background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:"11px 12px",fontSize:14,color:T.text1,outline:"none"};

  return(
    <div style={{animation:"fadeUp 0.3s ease"}}>
      <div style={{marginBottom:22,textAlign:"center"}}>
        <div style={{width:72,height:72,borderRadius:"50%",background:T.gradViolet,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",boxShadow:`0 8px 24px ${T.violetGlow}`}}>
          <User size={30} color="#fff"/>
        </div>
        <p style={{fontSize:20,fontWeight:800,color:T.text1}}>Your Name</p>
        <p style={{fontSize:12,color:T.text2,marginTop:2}}>Day Copilot · Pro</p>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[{label:"Day streak",value:"4"},{label:"Tasks done",value:"32"},{label:"Focus hrs",value:"18"}].map(({label,value})=>(
          <div key={label} style={{flex:1,background:T.bg1,borderRadius:14,padding:"12px 8px",textAlign:"center",border:`1px solid ${T.border}`}}>
            <p style={{fontSize:20,fontWeight:800,color:T.text1}}>{value}</p>
            <p style={{fontSize:10,color:T.text2,marginTop:2,fontWeight:700,letterSpacing:"0.04em"}}>{label}</p>
          </div>
        ))}
      </div>
      <Card>
        <SLabel icon={Clock} label="Working Hours"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[{l:"Start",v:workStart,s:setWorkStart},{l:"End",v:workEnd,s:setWorkEnd}].map(({l,v,s})=>(
            <div key={l}>
              <p style={{fontSize:11,color:T.text3,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>{l}</p>
              <input type="time" value={v} onChange={e=>s(e.target.value)} style={iStyle}/>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <SLabel icon={Target} label="Focus Settings"/>
        {[{label:"Focus session",val:focusDur,set:setFocusDur,min:15,max:120,step:5,color:T.violetMid},{label:"Break length",val:breakDur,set:setBreakDur,min:5,max:30,step:5,color:T.green}].map(({label,val,set,min,max,step,color})=>(
          <div key={label} style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <p style={{fontSize:14,fontWeight:500,color:T.text1}}>{label}</p>
              <span style={{fontSize:14,fontWeight:800,color}}>{val}m</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={val} onChange={e=>set(+e.target.value)} style={{width:"100%",accentColor:color}}/>
          </div>
        ))}
      </Card>
      <Card>
        {[{label:"Notifications",sub:"Task reminders & nudges",right:<div onClick={()=>setNotifs(!notifs)} style={{width:46,height:26,borderRadius:99,cursor:"pointer",background:notifs?T.violetMid:T.bg3,display:"flex",alignItems:"center",padding:"0 4px",justifyContent:notifs?"flex-end":"flex-start",transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)",boxShadow:notifs?`0 0 10px ${T.violetGlow}`:"none"}}><div style={{width:18,height:18,borderRadius:"50%",background:"#fff"}}/></div>},
           {label:"Daily recap",sub:"Summary at end of day",right:<ChevronRight size={16} color={T.text3}/>},
           {label:"Theme",sub:null,right:<span style={{fontSize:12,fontWeight:700,color:T.violetMid,background:T.violetSoft,padding:"4px 12px",borderRadius:99}}>Midnight</span>}
        ].map(({label,sub,right},i,arr)=>(
          <div key={label} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 0",borderBottom:i<arr.length-1?`1px solid ${T.border}`:"none"}}>
            <div><p style={{fontSize:14,fontWeight:600,color:T.text1}}>{label}</p>{sub&&<p style={{fontSize:12,color:T.text2,marginTop:1}}>{sub}</p>}</div>
            {right}
          </div>
        ))}
      </Card>
      <p style={{textAlign:"center",fontSize:12,color:T.text3,padding:"12px 0 4px"}}>Day Copilot · v1.0.0</p>
    </div>
  );
}

/* ─── BOTTOM NAV ──────────────────────────────────────────────────────────── */
function BottomNav({active,setActive,onPlus}){
  const left=[{key:"home",label:"Home",Icon:Zap},{key:"planner",label:"Planner",Icon:Calendar}];
  const right=[{key:"insights",label:"Insights",Icon:BarChart2},{key:"profile",label:"Profile",Icon:User}];
  const Tab=({k,label,Icon})=>{
    const a=active===k;
    return(
      <button onClick={()=>setActive(k)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,border:"none",background:"transparent",cursor:"pointer",padding:"8px 0",transition:"transform 0.22s cubic-bezier(0.34,1.56,0.64,1)",transform:a?"scale(1.1)":"scale(1)"}}>
        <div style={{width:36,height:28,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",background:a?T.violetSoft:"transparent",transition:"background 0.2s"}}>
          <Icon size={19} color={a?T.violetMid:T.text3} strokeWidth={a?2.3:1.7}/>
        </div>
        <span style={{fontSize:10,fontWeight:a?700:500,color:a?T.violetMid:T.text3,letterSpacing:"0.03em",transition:"color 0.2s"}}>{label}</span>
      </button>
    );
  };
  return(
    <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"rgba(17,17,24,0.94)",backdropFilter:"blur(20px)",borderTop:`1px solid ${T.border}`,borderRadius:"22px 22px 0 0",height:70,zIndex:100,display:"flex",alignItems:"center",padding:"0 6px"}}>
      {left.map(t=><Tab key={t.key} k={t.key} label={t.label} Icon={t.Icon}/>)}

      {/* Center FAB */}
      <div style={{flex:"0 0 70px",display:"flex",justifyContent:"center",alignItems:"center"}}>
        <button onClick={onPlus} style={{width:58,height:58,borderRadius:"50%",border:"none",background:T.gradViolet,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",bottom:18,boxShadow:`0 8px 28px ${T.violetGlow},0 0 0 4px ${T.bg0}`,transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)"}}
          onMouseDown={e=>{e.currentTarget.style.transform="scale(0.88)";e.currentTarget.style.boxShadow=`0 4px 12px ${T.violetGlow},0 0 0 4px ${T.bg0}`;}}
          onMouseUp={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow=`0 8px 28px ${T.violetGlow},0 0 0 4px ${T.bg0}`;}}
          onTouchStart={e=>{e.currentTarget.style.transform="scale(0.88)";}}
          onTouchEnd={e=>{e.currentTarget.style.transform="scale(1)";}}>
          <Plus size={26} color="#fff" strokeWidth={2.5}/>
        </button>
      </div>

      {right.map(t=><Tab key={t.key} k={t.key} label={t.label} Icon={t.Icon}/>)}
    </nav>
  );
}

/* ─── ROOT ────────────────────────────────────────────────────────────────── */
export default function App(){
  const[tab,setTab]=useState("home");
  const[tasks,setTasks]=useState(INITIAL_TASKS);
  const[mood,setMood]=useState("neutral");
  const[showAdd,setShowAdd]=useState(false);

  const addTask=(section,task)=>setTasks(prev=>({...prev,[section]:[...prev[section],task]}));

  const screens={
    home:    <HomeView tasks={tasks} setTasks={setTasks} mood={mood} setMood={setMood}/>,
    planner: <PlannerView tasks={tasks} setTasks={setTasks}/>,
    insights:<InsightsView tasks={tasks} mood={mood}/>,
    profile: <ProfileView/>,
  };

  return(
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{minHeight:"100vh",background:T.bg0,display:"flex",justifyContent:"center",fontFamily:"Outfit,-apple-system,sans-serif"}}>
        <div style={{width:"100%",maxWidth:430,position:"relative"}}>
          <div style={{minHeight:"100vh",padding:"28px 16px 96px",overflowX:"hidden"}}>
            <div key={tab} style={{animation:"fadeUp 0.25s ease both"}}>
              {screens[tab]}
            </div>
          </div>
          <BottomNav active={tab} setActive={setTab} onPlus={()=>setShowAdd(true)}/>
          {showAdd&&<AddTaskSheet onClose={()=>setShowAdd(false)} onAdd={addTask}/>}
        </div>
      </div>
    </>
  );
}