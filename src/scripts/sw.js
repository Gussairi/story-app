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
        console.log('Story ID in notification:', notificationData.data?.storyId);
        
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
        
        // Add actions with open and close buttons
        options.actions = [
            {
                action: 'open',
                title: 'Open'
            },
            {
                action: 'close',
                title: 'Close'
            }
        ];
        
        console.log('Showing notification with options:', options);
        
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
                    url: pushData.url || pushData.link || '/',
                    storyId: pushData.storyId || null,
                    action: pushData.action || 'open',
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
            timestamp: notificationData.timestamp,
        })
    );
});

// Notification click event dengan navigasi dinamis
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);
    console.log('Action:', event.action);
    console.log('Notification data:', event.notification.data);
    
    event.notification.close();
    
    // Handle close action - just close notification
    if (event.action === 'close') {
        console.log('Close action clicked - notification closed');
        return;
    }
    
    // Tentukan URL tujuan (relative path)
    let targetPath = '/';
    
    if (event.notification.data) {
        const data = event.notification.data;
        
        // Jika ada storyId, navigasi ke detail story
        if (data.storyId) {
            targetPath = `/#/story/${data.storyId}`;
            console.log('Navigating to story detail:', targetPath);
        } 
        // Jika ada URL custom
        else if (data.url) {
            targetPath = data.url;
            console.log('Navigating to custom URL:', targetPath);
        }
    }
    
    // Handle open action atau click pada notifikasi body
    if (event.action === 'open' || !event.action) {
        console.log('Opening path:', targetPath);
        
        // Buka atau focus window
        event.waitUntil(
            clients.matchAll({ 
                type: 'window', 
                includeUncontrolled: true 
            })
            .then((clientList) => {
                console.log('Found clients:', clientList.length);
                
                // Construct full URL
                const fullUrl = new URL(targetPath, self.location.origin).href;
                console.log('Full URL:', fullUrl);
                
                // Coba focus window yang sudah terbuka
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    console.log('Checking client:', client.url);
                    
                    // Focus window yang sudah terbuka dan navigate ke target URL
                    if ('focus' in client && 'navigate' in client) {
                        console.log('Focusing existing window');
                        return client.focus().then(() => {
                            console.log('Navigating to:', fullUrl);
                            return client.navigate(fullUrl);
                        });
                    }
                }
                
                // Jika tidak ada window yang terbuka, buka window baru
                console.log('Opening new window with URL:', fullUrl);
                return clients.openWindow(fullUrl);
            })
            .catch((error) => {
                console.error('Error handling notification click:', error);
            })
        );
    }
});