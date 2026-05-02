// src/notifications.js
// Handles all push notification logic:
// - Firebase FCM setup
// - Permission request
// - Token storage in Supabase
// - Scheduling notifications for tasks
// - Handling notification actions (done / reschedule)

import { initializeApp }        from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { supabase }             from './lib/supabase';

// ── Replace with your Firebase config from console.firebase.google.com ──
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBhWsXRJCNY11TqkdQLWFmwsvbSy3DOnW0",
  authDomain: "day-copilot.firebaseapp.com",
  projectId: "day-copilot",
  storageBucket: "day-copilot.firebasestorage.app",
  messagingSenderId: "988152314776",
  appId: "1:988152314776:web:a09e2e2b643473ab4449ed",
};

// Your VAPID key from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
const VAPID_KEY = "YOUR_VAPID_KEY_HERE";

// ── Init Firebase ──
let app, messaging;
try {
  app       = initializeApp(FIREBASE_CONFIG);
  messaging = getMessaging(app);
} catch(e) {
  console.warn("Firebase init failed:", e);
}

/* ─────────────────────────────────────────────────────────────────────────────
   REQUEST PERMISSION + GET TOKEN
───────────────────────────────────────────────────────────────────────────── */
export async function initPushNotifications(userId) {
  if (!messaging || !userId) return false;

  try {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return false;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }

    // Register service worker
    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey:            VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (!token) return false;

    // Save token to Supabase (upsert = update if exists)
    await supabase.from('push_tokens').upsert({
      user_id:  userId,
      token,
      platform: /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'ios' : 'web',
    }, { onConflict: 'user_id,token' });

    console.log('Push notifications enabled ✓');

    // Listen for foreground messages (app is open)
    onMessage(messaging, payload => {
      handleForegroundMessage(payload);
    });

    // Listen for service worker messages (notification actions)
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.type === 'NOTIFICATION_ACTION') {
        window.__handleNotificationAction?.(event.data.action, event.data.data);
      }
    });

    // Handle URL params from notification click (app was closed)
    handleNotificationUrlParams();

    return true;
  } catch(e) {
    console.warn('Push notification setup failed:', e);
    return false;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   FOREGROUND MESSAGE HANDLER (app is open)
───────────────────────────────────────────────────────────────────────────── */
function handleForegroundMessage(payload) {
  const data  = payload.data || {};
  const title = payload.notification?.title || 'Day Copilot';
  const body  = payload.notification?.body  || '';

  // Show a custom in-app toast instead of system notification
  window.__showNotificationToast?.({ title, body, data });
}

/* ─────────────────────────────────────────────────────────────────────────────
   HANDLE URL PARAMS (user clicked notification when app was closed)
───────────────────────────────────────────────────────────────────────────── */
function handleNotificationUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const action = params.get('action');
  const taskId = params.get('taskId');

  if (action && taskId) {
    // Small delay to let app initialize
    setTimeout(() => {
      window.__handleNotificationAction?.(action, { taskId });
      // Clean URL
      window.history.replaceState({}, '', '/');
    }, 1000);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   SCHEDULE NOTIFICATIONS FOR TODAY'S TASKS
   Call this after tasks are loaded / updated
───────────────────────────────────────────────────────────────────────────── */
export async function scheduleTaskNotifications(userId, tasks) {
  if (!userId) return;

  const all = Object.values(tasks).flat().filter(t => !t.done);
  if (!all.length) return;

  const now  = new Date();
  const hour = now.getHours();

  // Build schedule for each pending task
  const schedule = [];

  all.forEach(task => {
    // Estimate task start time based on section
    const sectionHours = {
      morning:   { start: 9,  end: 12 },
      afternoon: { start: 13, end: 17 },
      evening:   { start: 18, end: 21 },
    };
    const slot = sectionHours[task.section] || sectionHours.morning;

    // Find a rough start time within the section
    const taskStartHour = slot.start;
    const taskEndHour   = taskStartHour + Math.ceil(task.duration / 60);

    // Only schedule future notifications
    const reminderHour  = taskStartHour - 0.25; // 15 min before (0.25hr)
    const followUpHour  = taskStartHour + (task.duration / 60); // after duration

    if (reminderHour > hour) {
      schedule.push({
        type:    'reminder',
        task,
        hour:    reminderHour,
        title:   `⏰ Up next: ${task.title}`,
        body:    `Starting in 15 minutes · ${task.duration} min`,
      });
    }

    if (followUpHour > hour) {
      schedule.push({
        type:    'followup',
        task,
        hour:    followUpHour,
        title:   `Did you finish "${task.title}"?`,
        body:    'Mark it done or reschedule 👇',
      });
    }
  });

  // Save schedule to Supabase so Edge Function can send them
  if (schedule.length > 0) {
    await saveNotificationSchedule(userId, schedule);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   SAVE SCHEDULE TO SUPABASE
   Edge Function will read this and send notifications at the right time
───────────────────────────────────────────────────────────────────────────── */
async function saveNotificationSchedule(userId, schedule) {
  // Convert hour floats to actual today's timestamps
  const today = new Date();
  today.setSeconds(0, 0);

  const rows = schedule.map(s => {
    const sendAt = new Date(today);
    const hours  = Math.floor(s.hour);
    const mins   = Math.round((s.hour % 1) * 60);
    sendAt.setHours(hours, mins, 0, 0);

    return {
      user_id:    userId,
      task_id:    s.task.id,
      task_title: s.task.title,
      task_tag:   s.task.tag,
      type:       s.type,
      title:      s.title,
      body:       s.body,
      send_at:    sendAt.toISOString(),
      sent:       false,
    };
  });

  // Upsert (avoid duplicate schedules)
  await supabase.from('notification_schedule')
    .upsert(rows, { onConflict: 'task_id,type', ignoreDuplicates: true });
}

/* ─────────────────────────────────────────────────────────────────────────────
   MORNING NOTIFICATION — called on app open if before 9am
───────────────────────────────────────────────────────────────────────────── */
export async function scheduleMorningNotification(userId) {
  if (!userId) return;
  const now = new Date();
  if (now.getHours() >= 9) return; // Already past 9am

  const sendAt = new Date();
  sendAt.setHours(8, 0, 0, 0);
  if (sendAt < now) return; // Already passed today

  await supabase.from('notification_schedule').upsert({
    user_id:    userId,
    task_id:    null,
    task_title: null,
    type:       'morning',
    title:      "Good morning! ☀️ Ready to plan your day?",
    body:       "Tap to add your tasks and let Day Copilot schedule them for you.",
    send_at:    sendAt.toISOString(),
    sent:       false,
  }, { onConflict: 'user_id,type,send_at', ignoreDuplicates: true });
}

/* ─────────────────────────────────────────────────────────────────────────────
   CHECK NOTIFICATION PERMISSION STATUS
───────────────────────────────────────────────────────────────────────────── */
export function getNotificationStatus() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

/* ─────────────────────────────────────────────────────────────────────────────
   DISABLE NOTIFICATIONS — remove token from Supabase
───────────────────────────────────────────────────────────────────────────── */
export async function disablePushNotifications(userId) {
  if (!userId) return;
  await supabase.from('push_tokens').delete().eq('user_id', userId);
  await supabase.from('notification_schedule').delete().eq('user_id', userId).eq('sent', false);
}
