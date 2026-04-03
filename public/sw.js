// StudyVault Service Worker
const CACHE_NAME = 'studyvault-v1.0.0';
const STATIC_CACHE = 'studyvault-static-v1.0.0';
const DYNAMIC_CACHE = 'studyvault-dynamic-v1.0.0';

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Will be populated by build process
];

// Routes that should be cached with network-first strategy
const DYNAMIC_ROUTES = [
  '/dashboard',
  '/notes',
  '/files',
  '/chat',
  '/learn',
  '/analytics',
  '/profile',
  '/settings'
];

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  /\/api\/notes/,
  /\/api\/files/,
  /\/api\/profile/
];

// Background sync registration
const SYNC_TAGS = {
  NOTES_SYNC: 'notes-sync',
  FILES_SYNC: 'files-sync',
  ANALYTICS_SYNC: 'analytics-sync'
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(DYNAMIC_CACHE).then((cache) => {
        console.log('[SW] Dynamic cache ready');
        return cache;
      })
    ]).then(() => {
      console.log('[SW] Installation complete');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests and non-HTTP(S) requests
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  // Handle different request types with appropriate strategies
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  } else if (isAPIRequest(url)) {
    event.respondWith(networkFirst(request));
  } else if (isDynamicRoute(url)) {
    event.respondWith(staleWhileRevalidate(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  switch (event.tag) {
    case SYNC_TAGS.NOTES_SYNC:
      event.waitUntil(syncNotes());
      break;
    case SYNC_TAGS.FILES_SYNC:
      event.waitUntil(syncFiles());
      break;
    case SYNC_TAGS.ANALYTICS_SYNC:
      event.waitUntil(syncAnalytics());
      break;
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  const options = {
    body: 'You have new study updates!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open StudyVault',
        icon: '/icons/action-explore.png'
      },
      {
        action: 'close',
        title: 'Dismiss',
        icon: '/icons/action-close.png'
      }
    ]
  };

  if (event.data) {
    const payload = event.data.json();
    options.body = payload.body || options.body;
    options.title = payload.title || 'StudyVault';
  }

  event.waitUntil(
    self.registration.showNotification('StudyVault', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received.');

  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Just close the notification
  }
});

// Cache strategies
async function cacheFirst(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache first failed:', error);
    return new Response('Offline - Resource not available', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network first fallback to cache:', error);
    
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Offline - Content not available', { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => cachedResponse);
  
  return cachedResponse || fetchPromise;
}

// Helper functions
function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/);
}

function isAPIRequest(url) {
  return url.pathname.startsWith('/api/') || 
         url.hostname.includes('supabase') ||
         API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
}

function isDynamicRoute(url) {
  return DYNAMIC_ROUTES.some(route => url.pathname.startsWith(route));
}

// Background sync functions
async function syncNotes() {
  try {
    console.log('[SW] Syncing notes...');
    // Get pending note updates from IndexedDB
    const pendingNotes = await getPendingNotes();
    
    for (const note of pendingNotes) {
      try {
        await fetch('/api/notes', {
          method: note.method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(note.data)
        });
        await removePendingNote(note.id);
      } catch (error) {
        console.log('[SW] Failed to sync note:', error);
      }
    }
  } catch (error) {
    console.log('[SW] Notes sync failed:', error);
  }
}

async function syncFiles() {
  try {
    console.log('[SW] Syncing files...');
    // Implementation for file sync
  } catch (error) {
    console.log('[SW] Files sync failed:', error);
  }
}

async function syncAnalytics() {
  try {
    console.log('[SW] Syncing analytics...');
    // Implementation for analytics sync
  } catch (error) {
    console.log('[SW] Analytics sync failed:', error);
  }
}

// IndexedDB helpers (simplified)
async function getPendingNotes() {
  // Implementation would use IndexedDB to get pending notes
  return [];
}

async function removePendingNote(id) {
  // Implementation would remove synced note from IndexedDB
}