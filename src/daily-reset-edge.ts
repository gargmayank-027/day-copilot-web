// supabase/functions/daily-reset/index.ts
// Runs at midnight via cron
// 1. Archives completed tasks to task_history
// 2. Deletes all tasks for the day
// 3. Detects recurring patterns from behaviour

import { serve }        from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")              ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async () => {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    console.log(`Running daily reset for ${yesterdayStr}`);

    // 1. Get all completed tasks from yesterday
    const { data: completedTasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("task_date", yesterdayStr)
      .eq("done", true);

    // 2. Archive completed tasks to task_history
    if (completedTasks && completedTasks.length > 0) {
      const historyRows = completedTasks.map(t => ({
        user_id:      t.user_id,
        title:        t.title,
        tag:          t.tag,
        section:      t.section,
        duration:     t.duration,
        task_date:    t.task_date,
        completed_at: new Date().toISOString(),
      }));

      await supabase.from("task_history").insert(historyRows);
      console.log(`Archived ${historyRows.length} completed tasks`);
    }

    // 3. Delete ALL tasks from yesterday (completed + incomplete)
    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("task_date", yesterdayStr);

    if (deleteError) console.error("Delete error:", deleteError);
    else console.log("Deleted yesterday's tasks");

    // 4. Detect recurring patterns per user
    await detectRecurringPatterns();

    return new Response(
      JSON.stringify({ success: true, date: yesterdayStr }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );

  } catch(e) {
    console.error("Daily reset error:", e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});

/* ─── Detect recurring patterns from task_history ────────────────────────── */
async function detectRecurringPatterns() {
  // Get all users who have history
  const { data: users } = await supabase
    .from("task_history")
    .select("user_id")
    .gte("task_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);

  if (!users) return;
  const uniqueUsers = [...new Set(users.map(u => u.user_id))];

  for (const userId of uniqueUsers) {
    try {
      // Get last 30 days of completed tasks
      const { data: history } = await supabase
        .from("task_history")
        .select("title, tag, section, duration, task_date")
        .eq("user_id", userId)
        .gte("task_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
        .order("task_date", { ascending: false });

      if (!history || history.length < 3) continue;

      // Count occurrences of each task title
      const taskCounts: Record<string, { count: number; tag: string; section: string; duration: number; dates: string[] }> = {};
      history.forEach(h => {
        if (!taskCounts[h.title]) {
          taskCounts[h.title] = { count: 0, tag: h.tag, section: h.section, duration: h.duration, dates: [] };
        }
        taskCounts[h.title].count++;
        taskCounts[h.title].dates.push(h.task_date);
      });

      // Tasks that appear 3+ times in 30 days are likely recurring
      for (const [title, data] of Object.entries(taskCounts)) {
        if (data.count < 3) continue;

        const confidence = Math.min(100, Math.round((data.count / 30) * 100 * 3));
        const frequency = data.count >= 20 ? "daily" : data.count >= 10 ? "weekdays" : "weekly";

        // Detect which days of week
        const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        const dayCount: Record<string, number> = {};
        data.dates.forEach(d => {
          const day = dayNames[new Date(d).getDay()];
          dayCount[day] = (dayCount[day] || 0) + 1;
        });
        const topDays = Object.entries(dayCount)
          .filter(([_, c]) => c >= 2)
          .sort((a, b) => b[1] - a[1])
          .map(([day]) => day);

        await supabase.from("recurring_patterns").upsert({
          user_id:    userId,
          title,
          tag:        data.tag,
          section:    data.section,
          duration:   data.duration,
          frequency,
          days:       topDays,
          confidence,
          last_seen:  data.dates[0],
        }, { onConflict: "user_id,title" });
      }

      console.log(`Detected patterns for user ${userId}`);
    } catch(e) {
      console.error(`Pattern detection failed for ${userId}:`, e);
    }
  }
}
