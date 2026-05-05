importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBhWsXRJCNY11TqkdQLWFmwsvbSy3DOnW0",
  authDomain: "day-copilot.firebaseapp.com",
  projectId: "day-copilot",
  storageBucket: "day-copilot.firebasestorage.app",
  messagingSenderId: "988152314776",
  appId: "1:988152314776:web:a09e2e2b643473ab4449ed",
});

const messaging = firebase.messaging();

// Handle background notifications
messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification;
  const data = payload.data || {};

  const actions = data.type === 'followup'
    ? [
        { action: 'done',       title: '✅ Done'       },
        { action: 'reschedule', title: '🔄 Reschedule' },
      ]
    : [];

  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    actions,
    data,
    tag: data.taskId || 'day-copilot',
    renotify: true,
  });
});

// Handle action button clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const action = event.action;
  const data   = event.notification.data || {};

  const url = action
    ? `/?action=${action}&taskId=${data.taskId}`
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) {
        list[0].focus();
        list[0].postMessage({ type: 'NOTIFICATION_ACTION', action, data });
      } else {
        clients.openWindow(url);
      }
    })
  );
});