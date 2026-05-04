// src/dailyManager.js
// Handles:
// - New day detection (checks last_opened_date in localStorage)
// - Fetching/generating daily AI suggestions
// - Recurring pattern fetching
// - Task history loading for Insights

import { supabase } from "./lib/supabase";

const TODAY = new Date().toISOString().split("T")[0];

/* ─────────────────────────────────────────────────────────────────────────────
   CHECK IF IT'S A NEW DAY
───────────────────────────────────────────────────────────────────────────── */
export function isNewDay() {
  const lastOpened = localStorage.getItem("day_copilot_last_opened");
  return lastOpened !== TODAY;
}

export function markDayOpened() {
  localStorage.setItem("day_copilot_last_opened", TODAY);
}

/* ─────────────────────────────────────────────────────────────────────────────
   LOAD TODAY'S TASKS (only today's date)
───────────────────────────────────────────────────────────────────────────── */
export async function loadTodaysTasks(userId) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("task_date", TODAY)
    .order("created_at", { ascending: true });

  if (error) { console.error("Load tasks error:", error); return []; }
  return data || [];
}

/* ─────────────────────────────────────────────────────────────────────────────
   ADD TASK WITH TODAY'S DATE
───────────────────────────────────────────────────────────────────────────── */
export async function addTaskToday(userId, taskData) {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      ...taskData,
      user_id:   userId,
      task_date: TODAY,
      done:      false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/* ─────────────────────────────────────────────────────────────────────────────
   FETCH DAILY SUGGESTIONS
   Returns existing suggestions for today, or null if none generated yet
───────────────────────────────────────────────────────────────────────────── */
export async function fetchDailySuggestions(userId) {
  const { data } = await supabase
    .from("daily_suggestions")
    .select("*")
    .eq("user_id", userId)
    .eq("date", TODAY)
    .single();

  return data; // null if no suggestions yet for today
}

/* ─────────────────────────────────────────────────────────────────────────────
   GENERATE DAILY SUGGESTIONS VIA GEMINI
───────────────────────────────────────────────────────────────────────────── */
export async function generateDailySuggestions(userId, userProfile, apiKey) {
  try {
    // Check if already generated today
    const existing = await fetchDailySuggestions(userId);
    if (existing) return existing;

    // Fetch context
    const [recurringData, historyData, behaviourData] = await Promise.all([
      supabase.from("recurring_patterns").select("*").eq("user_id", userId).gte("confidence", 40).order("confidence", { ascending: false }).limit(10),
      supabase.from("task_history").select("*").eq("user_id", userId).gte("task_date", getDateDaysAgo(7)).order("task_date", { ascending: false }).limit(30),
      supabase.from("user_behaviour").select("*").eq("user_id", userId).gte("created_at", getDateDaysAgo(14) + "T00:00:00Z").limit(100),
    ]);

    const recurring  = recurringData.data  || [];
    const history    = historyData.data    || [];
    const behaviour  = behaviourData.data  || [];

    const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });

    // Build completion rates by tag
    const tagStats = {};
    behaviour.forEach(b => {
      if (!b.task_tag) return;
      if (!tagStats[b.task_tag]) tagStats[b.task_tag] = { done: 0, total: 0 };
      tagStats[b.task_tag].total++;
      if (b.action === "completed") tagStats[b.task_tag].done++;
    });

    const tagInsights = Object.entries(tagStats).map(([tag, s]) =>
      `${tag}: ${s.total > 0 ? Math.round(s.done/s.total*100) : 0}% completion rate`
    ).join(", ");

    const recurringStr = recurring.length > 0
      ? recurring.map(r => `"${r.title}" (${r.section}, ${r.duration}min, ${r.tag}, ${r.frequency}, confidence: ${r.confidence}%)`).join("\n")
      : "No recurring patterns detected yet";

    const recentStr = history.slice(0, 10).map(h =>
      `${h.task_date}: "${h.title}" (${h.tag}, ${h.section})`
    ).join("\n") || "No history yet";

    const prompt = `You are Day Copilot AI. Generate smart task suggestions for a user's ${dayOfWeek}.

USER PROFILE:
- Name: ${userProfile?.name || "User"}
- Energy type: ${userProfile?.energy_type || "unknown"}
- Work hours: ${userProfile?.work_start || "9:00"} - ${userProfile?.work_end || "18:00"}
- Work days: ${userProfile?.work_days?.join(", ") || "Mon-Fri"}
- Goals: ${userProfile?.goals?.join(", ") || "productivity"}
- Focus duration: ${userProfile?.focus_duration || 45} minutes
- Commitments: ${userProfile?.commitments?.join(", ") || "none"}

RECURRING PATTERNS (tasks this user does regularly):
${recurringStr}

RECENT COMPLETED TASKS (last 7 days):
${recentStr}

BEHAVIOUR STATS:
${tagInsights || "No behaviour data yet"}

TODAY: ${dayOfWeek}, ${new Date().toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}

INSTRUCTIONS:
1. Suggest 5-8 tasks for today
2. Prioritize recurring tasks that match today's day of week
3. Include tasks aligned with their goals
4. Respect their energy type (schedule deep work at peak hours)
5. Mix task types based on their completion rates (suggest more of what they actually do)
6. For new users with no history, suggest based on their profile and onboarding answers
7. Each task must have a confidence score (how likely user will want it)

Respond ONLY with a JSON array, no markdown, no explanation:
[
  {
    "title": "Task title",
    "section": "morning|afternoon|evening",
    "duration": 30,
    "tag": "work|comms|wellness|growth",
    "reason": "Brief reason why (1 sentence)",
    "confidence": 85,
    "isRecurring": true
  }
]`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: "You are a smart productivity AI. Always respond with valid JSON only." }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      }
    );

    const geminiData = await res.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const clean   = rawText.replace(/```json|```/g, "").trim();
    const suggestions = JSON.parse(clean);

    // Save to Supabase
    const { data: saved } = await supabase
      .from("daily_suggestions")
      .upsert({
        user_id:     userId,
        date:        TODAY,
        suggestions: suggestions,
        status:      "pending",
      }, { onConflict: "user_id,date" })
      .select()
      .single();

    return saved;

  } catch(e) {
    console.error("Generate suggestions error:", e);
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   ACCEPT SUGGESTIONS — add selected ones as today's tasks
───────────────────────────────────────────────────────────────────────────── */
export async function acceptSuggestions(userId, suggestions) {
  const tasks = suggestions.map(s => ({
    user_id:   userId,
    title:     s.title,
    section:   s.section,
    duration:  s.duration || 20,
    tag:       s.tag || "work",
    done:      false,
    task_date: TODAY,
  }));

  const { data, error } = await supabase
    .from("tasks")
    .insert(tasks)
    .select();

  if (error) throw error;

  // Mark suggestions as accepted
  await supabase
    .from("daily_suggestions")
    .update({ status: "accepted" })
    .eq("user_id", userId)
    .eq("date", TODAY);

  return data || [];
}

/* ─────────────────────────────────────────────────────────────────────────────
   DISMISS SUGGESTIONS
───────────────────────────────────────────────────────────────────────────── */
export async function dismissSuggestions(userId) {
  await supabase
    .from("daily_suggestions")
    .update({ status: "dismissed" })
    .eq("user_id", userId)
    .eq("date", TODAY);
}

/* ─────────────────────────────────────────────────────────────────────────────
   FETCH TASK HISTORY FOR INSIGHTS
───────────────────────────────────────────────────────────────────────────── */
export async function fetchTaskHistory(userId, days = 7) {
  const { data } = await supabase
    .from("task_history")
    .select("*")
    .eq("user_id", userId)
    .gte("task_date", getDateDaysAgo(days))
    .order("task_date", { ascending: false });

  return data || [];
}

/* ─────────────────────────────────────────────────────────────────────────────
   FETCH RECURRING PATTERNS
───────────────────────────────────────────────────────────────────────────── */
export async function fetchRecurringPatterns(userId) {
  const { data } = await supabase
    .from("recurring_patterns")
    .select("*")
    .eq("user_id", userId)
    .gte("confidence", 30)
    .order("confidence", { ascending: false });

  return data || [];
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function getDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

export { TODAY };
