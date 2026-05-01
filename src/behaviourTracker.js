import { supabase } from "./lib/supabase";

/* ─────────────────────────────────────────────────────────────────────────────
   BEHAVIOUR TRACKER
   Call these functions whenever a user takes an action on a task.
   The data accumulates over time and is fed into the AI's system prompt
   so it learns individual patterns and gives smarter suggestions.
───────────────────────────────────────────────────────────────────────────── */

/**
 * Log a task action to user_behaviour table
 */
export async function logBehaviour(userId, action, task, mood = "neutral") {
  if (!userId || !task) return;
  const now = new Date();
  try {
    await supabase.from("user_behaviour").insert({
      user_id:      userId,
      action,                          // completed | skipped | rescheduled | deleted | added
      task_title:   task.title,
      task_tag:     task.tag,
      task_section: task.section,
      hour_of_day:  now.getHours(),
      day_of_week:  now.toLocaleDateString("en-US", { weekday: "long" }),
      mood,
    });
  } catch(e) {
    console.warn("Behaviour log failed:", e);
  }
}

/**
 * Fetch last N days of behaviour + chat history for a user
 * Returns a structured summary string for the AI system prompt
 */
export async function fetchUserPatterns(userId, days = 14) {
  if (!userId) return "";
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString();

    // Fetch behaviour logs
    const { data: behaviour } = await supabase
      .from("user_behaviour")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", sinceStr)
      .order("created_at", { ascending: false })
      .limit(200);

    // Fetch recent chat history (last 5 days)
    const chatSince = new Date();
    chatSince.setDate(chatSince.getDate() - 5);
    const { data: chats } = await supabase
      .from("chat_history")
      .select("role, content, created_at")
      .eq("user_id", userId)
      .gte("created_at", chatSince.toISOString())
      .order("created_at", { ascending: true })
      .limit(40);

    if (!behaviour?.length && !chats?.length) {
      return "No behaviour history yet — this is a new user. Be encouraging and help them build good habits.";
    }

    return buildPatternSummary(behaviour || [], chats || []);
  } catch(e) {
    console.warn("Pattern fetch failed:", e);
    return "";
  }
}

/**
 * Fetch recent chat history for continuing conversation context
 */
export async function fetchRecentChats(userId, limit = 20) {
  if (!userId) return [];
  try {
    const { data } = await supabase
      .from("chat_history")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    // Return in chronological order for the API
    return (data || []).reverse();
  } catch(e) {
    return [];
  }
}

/**
 * Save a message to chat history
 */
export async function saveChatMessage(userId, role, content) {
  if (!userId) return;
  try {
    await supabase.from("chat_history").insert({ user_id: userId, role, content });
  } catch(e) {
    console.warn("Chat save failed:", e);
  }
}

/* ─── Pattern analysis ────────────────────────────────────────────────────── */
function buildPatternSummary(behaviour, chats) {
  const lines = [];

  if (behaviour.length > 0) {
    // ── Completion rate by tag ──
    const byTag = {};
    behaviour.forEach(b => {
      if (!b.task_tag) return;
      if (!byTag[b.task_tag]) byTag[b.task_tag] = { completed: 0, skipped: 0, total: 0 };
      byTag[b.task_tag].total++;
      if (b.action === "completed") byTag[b.task_tag].completed++;
      if (b.action === "skipped")   byTag[b.task_tag].skipped++;
    });

    const tagInsights = Object.entries(byTag).map(([tag, d]) => {
      const rate = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0;
      return `${tag}: ${rate}% completion rate (${d.completed} done, ${d.skipped} skipped out of ${d.total})`;
    });
    if (tagInsights.length) lines.push("COMPLETION RATE BY CATEGORY:\n" + tagInsights.join("\n"));

    // ── Best productive hours ──
    const completedByHour = {};
    behaviour.filter(b => b.action === "completed").forEach(b => {
      const h = b.hour_of_day;
      completedByHour[h] = (completedByHour[h] || 0) + 1;
    });
    const topHours = Object.entries(completedByHour)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([h, count]) => `${h}:00 (${count} tasks done)`);
    if (topHours.length) lines.push("PEAK PRODUCTIVE HOURS: " + topHours.join(", "));

    // ── Completion by section ──
    const bySection = {};
    behaviour.forEach(b => {
      if (!b.task_section) return;
      if (!bySection[b.task_section]) bySection[b.task_section] = { completed: 0, total: 0 };
      bySection[b.task_section].total++;
      if (b.action === "completed") bySection[b.task_section].completed++;
    });
    const sectionInsights = Object.entries(bySection).map(([s, d]) => {
      const rate = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0;
      return `${s}: ${rate}%`;
    });
    if (sectionInsights.length) lines.push("COMPLETION BY TIME OF DAY: " + sectionInsights.join(", "));

    // ── Most skipped tasks ──
    const skipped = behaviour
      .filter(b => b.action === "skipped")
      .reduce((acc, b) => {
        acc[b.task_title] = (acc[b.task_title] || 0) + 1;
        return acc;
      }, {});
    const topSkipped = Object.entries(skipped)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([title, count]) => `"${title}" (skipped ${count}x)`);
    if (topSkipped.length) lines.push("FREQUENTLY SKIPPED TASKS: " + topSkipped.join(", "));

    // ── Most completed tasks (strengths) ──
    const completed = behaviour
      .filter(b => b.action === "completed")
      .reduce((acc, b) => {
        acc[b.task_tag] = (acc[b.task_tag] || 0) + 1;
        return acc;
      }, {});
    const topTag = Object.entries(completed).sort((a, b) => b[1] - a[1])[0];
    if (topTag) lines.push(`STRONGEST CATEGORY: ${topTag[0]} (${topTag[1]} tasks completed)`);

    // ── Mood vs completion ──
    const moodCompletion = {};
    behaviour.forEach(b => {
      if (!b.mood) return;
      if (!moodCompletion[b.mood]) moodCompletion[b.mood] = { completed: 0, total: 0 };
      moodCompletion[b.mood].total++;
      if (b.action === "completed") moodCompletion[b.mood].completed++;
    });
    const moodInsights = Object.entries(moodCompletion).map(([mood, d]) => {
      const rate = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0;
      return `${mood} mood: ${rate}% completion`;
    });
    if (moodInsights.length) lines.push("MOOD VS PRODUCTIVITY: " + moodInsights.join(", "));

    // ── Recent trend (last 3 days) ──
    const recentDays = behaviour.filter(b => {
      const d = new Date(b.created_at);
      const daysAgo = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 3;
    });
    const recentCompleted = recentDays.filter(b => b.action === "completed").length;
    const recentTotal     = recentDays.filter(b => ["completed","skipped"].includes(b.action)).length;
    if (recentTotal > 0) {
      const recentRate = Math.round((recentCompleted / recentTotal) * 100);
      lines.push(`RECENT TREND (last 3 days): ${recentRate}% completion rate — ${recentRate >= 70 ? "strong momentum" : recentRate >= 40 ? "moderate pace" : "struggling, needs support"}`);
    }

    // ── Rescheduling patterns ──
    const reschedules = behaviour.filter(b => b.action === "rescheduled").length;
    if (reschedules > 2) lines.push(`RESCHEDULING: Has rescheduled ${reschedules} tasks recently — may be over-planning or underestimating time`);
  }

  // ── Recent conversation summary ──
  if (chats.length > 0) {
    const recentUserMessages = chats
      .filter(c => c.role === "user")
      .slice(-5)
      .map(c => `- "${c.content.slice(0, 80)}${c.content.length > 80 ? "..." : ""}"`)
      .join("\n");
    if (recentUserMessages) {
      lines.push("RECENT CONVERSATIONS (last 5 days):\n" + recentUserMessages);
    }
  }

  return lines.length
    ? "## USER BEHAVIOUR PATTERNS (last 14 days)\n" + lines.join("\n\n")
    : "Insufficient history to identify patterns yet.";
}
