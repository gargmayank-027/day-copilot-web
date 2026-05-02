// public/firebase-messaging-sw.js
// This file MUST be in the public/ folder (served from root)

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// ── Replace with your Firebase config ──
firebase.initializeApp({
  apiKey: "AIzaSyBhWsXRJCNY11TqkdQLWFmwsvbSy3DOnW0",
  authDomain: "day-copilot.firebaseapp.com",
  projectId: "day-copilot",
  storageBucket: "day-copilot.firebasestorage.app",
  messagingSenderId: "988152314776",
  appId: "1:988152314776:web:a09e2e2b643473ab4449ed",
});

const messaging = firebase.messaging();

// Handle background messages (app is closed / in background)
messaging.onBackgroundMessage(payload => {
  const { title, body, data } = payload.notification || payload.data || {};
  const notifData = payload.data || {};

  const options = {
    body:    body || "",
    icon:    '/pwa-192x192.png',
    badge:   '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    tag:     notifData.taskId || 'day-copilot',
    data:    notifData,
    // Action buttons for task follow-up
    actions: notifData.type === 'followup' ? [
      { action: 'done',       title: '✅ Done'       },
      { action: 'reschedule', title: '🔄 Reschedule' },
    ] : notifData.type === 'morning' ? [
      { action: 'open', title: '📋 Plan my day' },
    ] : [
      { action: 'open', title: '▶️ Start task' },
    ],
  };

  self.registration.showNotification(title || 'Day Copilot', options);
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data   = event.notification.data || {};
  const action = event.action;

  let url = '/';

  if (action === 'done' && data.taskId) {
    // Send message to app to mark task done
    url = `/?action=complete&taskId=${data.taskId}`;
  } else if (action === 'reschedule' && data.taskId) {
    url = `/?action=reschedule&taskId=${data.taskId}`;
  } else if (data.type === 'morning') {
    url = '/';
  } else if (data.taskId) {
    url = `/?taskId=${data.taskId}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If app already open, focus it and send message
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NOTIFICATION_ACTION', action, data });
          return;
        }
      }
      // Otherwise open app
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
