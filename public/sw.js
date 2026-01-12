// MuscleDesk Service Worker for Push Notifications

self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  let data = {
    title: 'MuscleDesk',
    body: 'You have a new notification',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url: '/' }
  };
  
  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    console.error('Error parsing push data:', e);
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    vibrate: [100, 50, 100],
    data: data.data || { url: '/' },
    actions: getActionsForType(data.data?.notification_type),
    tag: data.data?.notification_type || 'general',
    renotify: true,
    requireInteraction: data.data?.notification_type === 'expiry_reminder',
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

function getActionsForType(type) {
  switch (type) {
    case 'check_in':
      return [
        { action: 'view', title: 'View Details', icon: '/pwa-192x192.png' }
      ];
    case 'expiry_reminder':
      return [
        { action: 'renew', title: 'Renew Now', icon: '/pwa-192x192.png' },
        { action: 'dismiss', title: 'Remind Later', icon: '/pwa-192x192.png' }
      ];
    case 'new_class':
      return [
        { action: 'book', title: 'Book Class', icon: '/pwa-192x192.png' },
        { action: 'dismiss', title: 'Dismiss', icon: '/pwa-192x192.png' }
      ];
    case 'payment_confirmation':
      return [
        { action: 'view', title: 'View Receipt', icon: '/pwa-192x192.png' }
      ];
    default:
      return [];
  }
}

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data || {};
  let url = data.url || '/';
  
  // Handle different actions
  if (action === 'renew') {
    url = '/member/payments';
  } else if (action === 'book') {
    url = '/member/classes';
  } else if (action === 'view') {
    url = data.url || '/member/dashboard';
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Open new window if none found
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});
