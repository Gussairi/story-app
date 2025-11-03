import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST || []);

const CACHE_NAME = 'story-app-runtime-v1';
const API_CACHE_NAME = 'story-app-api-v1';

self.addEventListener('install', () => {
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
    
    if (url.origin === 'https://story-api.dicoding.dev') {
        if (request.method !== 'GET') {
            return;
        }

        if (url.pathname.includes('/photos/') || 
            url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
            request.headers.get('accept')?.includes('image/')) {
            console.log('Skipping cache for image:', url.pathname);
            event.respondWith(fetch(request));
            return;
        }
        
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const responseClone = response.clone();
                        caches.open(API_CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                            console.log('Cached JSON response:', url.pathname);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request);
                })
        );
        return;
    }

    if (url.origin === self.location.origin) {
        if (url.pathname.endsWith('.html') || url.pathname === '/') {
            event.respondWith(
                fetch(request).catch(() => caches.match(request))
            );
            return;
        }

        if (url.pathname.match(/\.(js|css|woff2|woff|ttf|eot)$/)) {
            event.respondWith(
                caches.match(request).then((response) => {
                    return response || fetch(request).then((fetchResponse) => {
                        return caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, fetchResponse.clone());
                            return fetchResponse;
                        });
                    });
                })
            );
            return;
        }
    }
});

self.addEventListener('push', (event) => {
    console.log('Service Worker: Push event received', event);
    
    let notificationData = {
        title: 'Story App',
        body: 'Anda mendapat notifikasi baru!',
        tag: 'story-notification',
        requireInteraction: false,
        data: {
            url: '/'
        }
    };
    
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

self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);
    console.log('Action:', event.action);
    console.log('Notification data:', event.notification.data);
    
    event.notification.close();
    
    if (event.action === 'close') {
        console.log('Close action clicked - notification closed');
        return;
    }
    
    let targetPath = '/';
    
    if (event.notification.data) {
        const data = event.notification.data;
        
        if (data.storyId) {
            targetPath = `/#/story/${data.storyId}`;
            console.log('Navigating to story detail:', targetPath);
        } 
        else if (data.url) {
            targetPath = data.url;
            console.log('Navigating to custom URL:', targetPath);
        }
    }
    
    if (event.action === 'open' || !event.action) {
        console.log('Opening path:', targetPath);
        
        event.waitUntil(
            clients.matchAll({ 
                type: 'window', 
                includeUncontrolled: true 
            })
            .then((clientList) => {
                console.log('Found clients:', clientList.length);
                
                const fullUrl = new URL(targetPath, self.location.origin).href;
                console.log('Full URL:', fullUrl);
                
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    console.log('Checking client:', client.url);
                    
                    if ('focus' in client && 'navigate' in client) {
                        console.log('Focusing existing window');
                        return client.focus().then(() => {
                            console.log('Navigating to:', fullUrl);
                            return client.navigate(fullUrl);
                        });
                    }
                }
                
                console.log('Opening new window with URL:', fullUrl);
                return clients.openWindow(fullUrl);
            })
            .catch((error) => {
                console.error('Error handling notification click:', error);
            })
        );
    }
});

self.addEventListener('sync', (event) => {
    console.log('Background Sync event triggered:', event.tag);
    
    if (event.tag === 'sync-stories') {
        event.waitUntil(syncPendingStories());
    }
});

async function syncPendingStories() {
    console.log('🔄 Background sync: Syncing pending stories...');
    
    try {
        const clients = await self.clients.matchAll({ 
            type: 'window',
            includeUncontrolled: true 
        });
        
        for (const client of clients) {
            client.postMessage({
                type: 'BACKGROUND_SYNC',
                action: 'sync-stories'
            });
        }
        
        console.log('✅ Background sync message sent to clients');
    } catch (error) {
        console.error('❌ Background sync error:', error);
        throw error;
    }
}

self.addEventListener('periodicsync', (event) => {
    console.log('Periodic Sync event triggered:', event.tag);
    
    if (event.tag === 'sync-stories-periodic') {
        event.waitUntil(syncPendingStories());
    }
});