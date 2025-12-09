// SafeVoice Service Worker for Push Notifications
// Handles offline caching and notification display

const CACHE_NAME = 'safevoice-v1';
const urlsToCache = [
  '/',
  '/favicon.svg',
  '/manifest.json'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Push event - handle incoming push messages
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'New notification from SafeVoice',
      icon: data.icon || '/favicon.svg',
      badge: '/favicon.svg',
      tag: data.tag || 'safevoice-notification',
      data: data.data || {},
      requireInteraction: data.type === 'crisis',
      actions: data.type === 'crisis' ? [
        {
          action: 'view-crisis',
          title: 'View Crisis',
          icon: '/favicon.svg'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/favicon.svg'
        }
      ] : undefined
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'SafeVoice', options)
    );
  } catch (error) {
    console.error('[SW] Failed to parse push data:', error);
    
    // Fallback to basic notification
    event.waitUntil(
      self.registration.showNotification('SafeVoice', {
        body: 'You have a new notification',
        icon: '/favicon.svg',
        tag: 'safevoice-notification'
      })
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action, event.notification.tag);
  
  event.notification.close();
  
  if (event.action === 'view-crisis') {
    // Open crisis modal or navigate to crisis section
    event.waitUntil(
      clients.openWindow('/?crisis=active')
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default click - open the app
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
  
  // Could track analytics here if needed
});

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'safevoice-offline-actions') {
    event.waitUntil(
      processOfflineActions()
    );
  }
});

// Process queued offline actions
async function processOfflineActions() {
  try {
    const actions = await getOfflineActions();
    
    for (const action of actions) {
      try {
        await processOfflineAction(action);
        await removeOfflineAction(action.id);
      } catch (error) {
        console.error('[SW] Failed to process offline action:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Failed to process offline actions:', error);
  }
}

// IndexedDB helpers for offline storage
async function getOfflineActions() {
  // This would integrate with the existing IndexedDB setup
  // For now, return empty array
  return [];
}

async function removeOfflineAction(id) {
  // Remove processed action from IndexedDB
}

async function processOfflineAction(action) {
  // Process the offline action (send message, report crisis, etc.)
  const response = await fetch(action.endpoint, {
    method: action.method,
    headers: action.headers,
    body: action.body
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
}

// Handle message events from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});