// src/NotificationToast.jsx
// Shows in-app toasts when notifications arrive while app is open
// Also shows permission request prompt for new users

import { useState, useEffect, useCallback } from "react";
import { X, CheckCircle, RotateCcw, Bell, BellOff } from "lucide-react";

const T = {
  bg1:"#111118", bg2:"#18181F", bg3:"#202028",
  border:"rgba(255,255,255,0.07)",
  text1:"#F0EFF8", text2:"#8B8A9E", text3:"#4A4960",
  violetMid:"#8B5CF6", violetSoft:"rgba(124,58,237,0.14)",
  violetGlow:"rgba(124,58,237,0.38)",
  green:"#10B981", greenSoft:"rgba(16,185,129,0.12)",
  amber:"#F59E0B", amberSoft:"rgba(245,158,11,0.12)",
  gradViolet:"linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)",
};

const CSS = `
  @keyframes toastIn{from{opacity:0;transform:translateY(-20px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes toastOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-20px)}}
  @keyframes permIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
`;

/* ─── In-app notification toast ───────────────────────────────────────────── */
function Toast({ toast, onDismiss, onComplete, onReschedule }) {
  const [leaving, setLeaving] = useState(false);

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(toast.id), 280);
  }, [toast.id, onDismiss]);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const t = setTimeout(dismiss, 8000);
    return () => clearTimeout(t);
  }, [dismiss]);

  const isFollowup = toast.data?.type === "followup";
  const isReminder = toast.data?.type === "reminder";
  const isMorning  = toast.data?.type === "morning";

  const accentColor = isFollowup ? T.green : isReminder ? T.amber : T.violetMid;
  const accentSoft  = isFollowup ? T.greenSoft : isReminder ? T.amberSoft : T.violetSoft;

  return (
    <div style={{
      background: T.bg1, borderRadius: 18,
      border: `1px solid ${accentColor}33`,
      boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${accentColor}22`,
      padding: "14px 16px", marginBottom: 8,
      animation: leaving ? "toastOut 0.28s ease forwards" : "toastIn 0.3s cubic-bezier(0.34,1.2,0.64,1)",
      maxWidth: 380, width: "100%",
    }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
        {/* Icon */}
        <div style={{ width:36, height:36, borderRadius:11, background:accentSoft, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Bell size={16} color={accentColor}/>
        </div>

        {/* Content */}
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:13, fontWeight:700, color:T.text1, marginBottom:2 }}>{toast.title}</p>
          <p style={{ fontSize:12, color:T.text2, lineHeight:1.4 }}>{toast.body}</p>

          {/* Action buttons for followup */}
          {isFollowup && toast.data?.taskId && (
            <div style={{ display:"flex", gap:8, marginTop:10 }}>
              <button onClick={() => { onComplete(toast.data.taskId); dismiss(); }}
                style={{ flex:1, border:"none", borderRadius:10, padding:"8px 10px", background:T.greenSoft, color:T.green, fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                <CheckCircle size={13} color={T.green}/> Done
              </button>
              <button onClick={() => { onReschedule(toast.data.taskId); dismiss(); }}
                style={{ flex:1, border:"none", borderRadius:10, padding:"8px 10px", background:T.amberSoft, color:T.amber, fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                <RotateCcw size={13} color={T.amber}/> Reschedule
              </button>
            </div>
          )}
        </div>

        {/* Close */}
        <button onClick={dismiss} style={{ border:"none", background:"transparent", cursor:"pointer", padding:2, flexShrink:0 }}>
          <X size={14} color={T.text3}/>
        </button>
      </div>
    </div>
  );
}

/* ─── Permission prompt (shown to new users) ──────────────────────────────── */
export function NotificationPermissionPrompt({ onEnable, onDismiss }) {
  return (
    <>
      <style>{CSS}</style>
      <div style={{
        position:"fixed", bottom:88, left:16, right:16, maxWidth:398,
        margin:"0 auto",
        background:T.bg1, borderRadius:20,
        border:`1px solid ${T.violetMid}33`,
        boxShadow:`0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px ${T.violetGlow}`,
        padding:"18px 18px 16px",
        zIndex:140,
        animation:"permIn 0.35s cubic-bezier(0.34,1.2,0.64,1)",
      }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:14 }}>
          <div style={{ width:42, height:42, borderRadius:13, background:T.gradViolet, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 4px 16px ${T.violetGlow}` }}>
            <Bell size={20} color="#fff"/>
          </div>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:15, fontWeight:800, color:T.text1, letterSpacing:"-0.3px" }}>Stay on track</p>
            <p style={{ fontSize:13, color:T.text2, marginTop:3, lineHeight:1.5 }}>
              Get notified before tasks start, and confirm completion right from the notification.
            </p>
          </div>
          <button onClick={onDismiss} style={{ border:"none", background:"transparent", cursor:"pointer", padding:2, flexShrink:0 }}>
            <X size={15} color={T.text3}/>
          </button>
        </div>

        {/* Features list */}
        <div style={{ background:T.bg2, borderRadius:12, padding:"10px 12px", marginBottom:14, border:`1px solid ${T.border}` }}>
          {[
            { emoji:"☀️", text:"Morning reminder to plan your day"       },
            { emoji:"⏰", text:"15-min heads-up before each task"        },
            { emoji:"✅", text:"Mark done or reschedule from notification"},
          ].map(({ emoji, text }) => (
            <div key={text} style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0" }}>
              <span style={{ fontSize:14 }}>{emoji}</span>
              <span style={{ fontSize:12, color:T.text2 }}>{text}</span>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onDismiss} style={{ flex:1, border:`1px solid ${T.border}`, borderRadius:12, padding:"11px", background:T.bg2, color:T.text2, fontSize:13, fontWeight:600, cursor:"pointer" }}>
            Not now
          </button>
          <button onClick={onEnable} style={{ flex:2, border:"none", borderRadius:12, padding:"11px", background:T.gradViolet, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:`0 4px 16px ${T.violetGlow}` }}>
            Enable notifications
          </button>
        </div>

        {/* iOS note */}
        {/iPhone|iPad|iPod/.test(navigator.userAgent) && (
          <p style={{ fontSize:11, color:T.text3, textAlign:"center", marginTop:10, lineHeight:1.5 }}>
            📱 On iPhone: add app to Home Screen first, then enable notifications
          </p>
        )}
      </div>
    </>
  );
}

/* ─── Toast container ─────────────────────────────────────────────────────── */
export function NotificationToastContainer({ onComplete, onReschedule }) {
  const [toasts, setToasts] = useState([]);

  // Register global handler so notifications.js can trigger toasts
  useEffect(() => {
    window.__showNotificationToast = ({ title, body, data }) => {
      setToasts(prev => [...prev, {
        id:    Date.now(),
        title, body, data,
      }]);
    };
    return () => { delete window.__showNotificationToast; };
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  if (!toasts.length) return null;

  return (
    <>
      <style>{CSS}</style>
      <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", width:"calc(100% - 32px)", maxWidth:398, zIndex:300, display:"flex", flexDirection:"column" }}>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            toast={toast}
            onDismiss={dismiss}
            onComplete={onComplete}
            onReschedule={onReschedule}
          />
        ))}
      </div>
    </>
  );
}
