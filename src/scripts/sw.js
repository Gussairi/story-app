// Import workbox
import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST || []);

const CACHE_NAME = 'story-app-runtime-v1';
const API_CACHE_NAME = 'story-app-api-v1';

self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && 
                        cacheName !== API_CACHE_NAME && 
                        !cacheName.startsWith('workbox-')) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    return self.clients.claim();
});

// Message event untuk menerima perintah dari main thread
self.addEventListener('message', (event) => {
    console.log('Service Worker: Message received', event.data);
    
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const notificationData = event.data.payload;
        console.log('Notification payload:', notificationData);
        
        const options = {
            body: notificationData.body || 'Anda mendapat notifikasi baru!',
            tag: notificationData.tag || 'story-notification',
            icon: notificationData.icon || '/pwa-192x192.png',
            badge: notificationData.badge || '/pwa-64x64.png',
            image: notificationData.image,
            vibrate: notificationData.vibrate || [200, 100, 200],
            data: notificationData.data || {},
            requireInteraction: notificationData.requireInteraction || false,
            timestamp: Date.now()
        };
        
        // Show notification without action buttons (no 'Open' action)
        console.log('Showing notification with options (no actions):', options);
        self.registration.showNotification(
            notificationData.title || 'Story App',
            options
        );
    }
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Hanya cache GET request dari API
    if (url.origin === 'https://story-api.dicoding.dev') {
        // Skip caching untuk request POST, PUT, DELETE
        if (request.method !== 'GET') {
            return;
        }
        
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const responseClone = response.clone();
                    caches.open(API_CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    return caches.match(request);
                })
        );
        return;
    }
});

// Push event - dengan data dinamis
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push event received', event);
    
    // Default notification data
    let notificationData = {
        title: 'Story App',
        body: 'Anda mendapat notifikasi baru!',
        tag: 'story-notification',
        requireInteraction: false,
        data: {
            url: '/'
        }
    };
    
    // Parse data dari push event
    if (event.data) {
        try {
            const pushData = event.data.json();
            console.log('Push data received:', pushData);
            
            notificationData = {
                title: pushData.title || 'Story App',
                body: pushData.body || pushData.message || 'Anda mendapat notifikasi baru!',
                tag: pushData.tag || 'story-notification',
                requireInteraction: pushData.requireInteraction || false,
                data: {
                    action: pushData.action || 'none',
                    ...pushData.data
                },
                badge: pushData.badge,
                icon: pushData.icon,
                image: pushData.image,
                vibrate: pushData.vibrate || [200, 100, 200],
                timestamp: Date.now()
            };
        } catch (e) {
            console.error('Error parsing push data:', e);
            notificationData.body = event.data.text();
        }
    }
    
    // Show push notification without action buttons
    event.waitUntil(
        self.registration.showNotification(notificationData.title, {
            body: notificationData.body,
            tag: notificationData.tag,
            data: notificationData.data,
            requireInteraction: notificationData.requireInteraction,
            badge: notificationData.badge,
            icon: notificationData.icon,
            image: notificationData.image,
            vibrate: notificationData.vibrate,
            timestamp: notificationData.timestamp
        })
    );
});

// Notification click event - simplified (no navigation to story detail)
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked (simplified):', event);
    event.notification.close();

    // Just focus an existing client or open app root. No story-detail navigation.
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/#/');
            }
        })
    );
});