import CONFIG from '../config';
import { subscribeWebPush, unsubscribeWebPush } from '../data/api';

export function isServiceWorkerAvailable() {
    return 'serviceWorker' in navigator;
}

export function isNotificationSupported() {
    return 'Notification' in window;
}

export function isPushSupported() {
    return 'PushManager' in window;
}

export async function requestNotificationPermission() {
    if (!isNotificationSupported()) {
        console.log('Browser tidak mendukung notification');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
}

export async function registerServiceWorker() {
    if (!isServiceWorkerAvailable()) {
        console.warn('⚠️ Browser tidak mendukung Service Worker');
        return null;
    }

    try {
        console.log('🔄 Memulai proses registrasi Service Worker...');
        
        // Cek apakah sudah ada service worker terdaftar
        const existingRegistrations = await navigator.serviceWorker.getRegistrations();
        console.log(`📋 Jumlah Service Worker terdaftar: ${existingRegistrations.length}`);
        
        if (existingRegistrations.length > 0) {
            existingRegistrations.forEach((reg, index) => {
                console.log(`SW ${index + 1}:`, {
                    scope: reg.scope,
                    active: !!reg.active,
                    installing: !!reg.installing,
                    waiting: !!reg.waiting
                });
            });
        }

        // Registrasi service worker
        let registration = await navigator.serviceWorker.getRegistration();
        
        if (!registration) {
            console.log('📝 Mendaftarkan Service Worker baru...');
            registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
                updateViaCache: 'none' // Pastikan selalu mengambil versi terbaru
            });
            console.log('✅ Service Worker berhasil didaftarkan');
        } else {
            console.log('✅ Service Worker sudah terdaftar');
            // Force update untuk memastikan mendapatkan versi terbaru
            await registration.update();
        }

        // Monitor status instalasi
        if (registration.installing) {
            console.log('⏳ Service Worker sedang installing...');
            await trackInstallation(registration.installing);
        } else if (registration.waiting) {
            console.log('⏸️ Service Worker waiting (ada versi baru)');
        } else if (registration.active) {
            console.log('✅ Service Worker aktif dan berjalan');
        }

        // Tunggu service worker benar-benar siap
        const readyRegistration = await navigator.serviceWorker.ready;
        console.log('🎉 Service Worker ready:', {
            scope: readyRegistration.scope,
            active: !!readyRegistration.active,
            updateFound: false
        });

        // Monitor update
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('🆕 Update Service Worker ditemukan');
            
            trackInstallation(newWorker);
        });

        // Cek update secara periodik (setiap 30 detik)
        setInterval(() => {
            registration.update().catch(err => {
                console.log('Error saat cek update SW:', err.message);
            });
        }, 30000);

        return readyRegistration;
    } catch (error) {
        console.error('❌ Gagal mendaftarkan Service Worker:', error);
        console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });
        
        // Retry setelah 5 detik jika gagal
        console.log('🔄 Akan mencoba lagi dalam 5 detik...');
        setTimeout(() => {
            console.log('🔄 Mencoba registrasi ulang...');
            registerServiceWorker();
        }, 5000);
        
        return null;
    }
}



export async function subscribeToPushNotification() {
    try {
        const permissionGranted = await requestNotificationPermission();
        if (!permissionGranted) {
            throw new Error('Permission untuk notification ditolak');
        }

        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            console.log('Already subscribed to push', subscription);
            return { success: true, subscription, isNew: false };
        }

        // Subscribe baru
        const convertedVapidKey = urlBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
        });
        console.log('Subscribed to push:', subscription);

        // Simpan subscription ke localStorage
        localStorage.setItem('pushSubscription', JSON.stringify(subscription));

        // Kirim subscription ke backend
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Token tidak ditemukan. Silakan login ulang.');
        }
        // Format subscription agar sesuai dengan API
        const subObj = subscription.toJSON();
        const payload = {
            endpoint: subObj.endpoint,
            keys: {
                p256dh: subObj.keys.p256dh,
                auth: subObj.keys.auth
            }
        };
        await subscribeWebPush(token, payload);

        return { success: true, subscription, isNew: true };
    } catch (error) {
        console.error('Failed to subscribe to push:', error);
        return { success: false, error: error.message };
    }
}

export async function unsubscribeFromPushNotification() {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            console.log('No subscription found');
            return { success: true, message: 'Tidak ada subscription aktif' };
        }

        // Hapus dari backend
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Token tidak ditemukan. Silakan login ulang.');
        }
        const subObj = subscription.toJSON();
        await unsubscribeWebPush(token, subObj.endpoint);

        const success = await subscription.unsubscribe();
        if (success) {
            console.log('Unsubscribed from push');
            localStorage.removeItem('pushSubscription');
            return { success: true, message: 'Berhasil unsubscribe' };
        } else {
            throw new Error('Failed to unsubscribe');
        }
    } catch (error) {
        console.error('Error unsubscribing:', error);
        return { success: false, error: error.message };
    }
}

export async function checkSubscriptionStatus() {
    try {
        if (!isPushSupported()) {
            return { supported: false, subscribed: false };
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        return {
            supported: true,
            subscribed: !!subscription,
            permission: Notification.permission,
            subscription: subscription
        };
    } catch (error) {
        console.error('Error checking subscription:', error);
        return { supported: false, subscribed: false, error: error.message };
    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Fungsi untuk testing push notification
export async function sendTestNotification(data = {}) {
    try {
        const registration = await navigator.serviceWorker.ready;
        
        const defaultData = {
            title: 'Test Notification',
            body: 'Ini adalah test notification',
            tag: 'test-notification',
            ...data
        };
        
        await registration.showNotification(defaultData.title, {
            body: defaultData.body,
            tag: defaultData.tag,
            data: defaultData.data || {},
            vibrate: [200, 100, 200],
            actions: [
                {
                    action: 'view',
                    title: 'Lihat'
                },
                {
                    action: 'close',
                    title: 'Tutup'
                }
            ]
        });
        
        return { success: true };
    } catch (error) {
        console.error('Error sending test notification:', error);
        return { success: false, error: error.message };
    }
}

export async function registerBackgroundSync() {
    if (!('serviceWorker' in navigator) || !('sync' in ServiceWorkerRegistration.prototype)) {
        console.log('Background Sync not supported');
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-stories');
        console.log('✅ Background Sync registered');
        return true;
    } catch (error) {
        console.error('Failed to register background sync:', error);
        return false;
    }
}

/**
 * Listen untuk background sync messages dari service worker
 */
export function setupBackgroundSyncListener(callback) {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'BACKGROUND_SYNC') {
            console.log('Received background sync message:', event.data);
            if (callback) {
                callback(event.data);
            }
        }
    });
}