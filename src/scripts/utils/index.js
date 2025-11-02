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
        console.log('Service Worker API unsupported');
        return null;
    }

    try {
        // Registrasi service worker jika belum terdaftar (penting untuk build produksi)
        let existingRegistration = await navigator.serviceWorker.getRegistration();
        if (!existingRegistration) {
            // Catatan: Dengan Vite PWA (injectManifest), file hasil build berada di /sw.js
            // Menggunakan path absolut agar bekerja di dev dan produksi
            console.log('No existing SW registration found, registering /sw.js ...');
            existingRegistration = await navigator.serviceWorker.register('/sw.js');
        }

        // Tunggu service worker siap
        const registration = await navigator.serviceWorker.ready;
        console.log('Service worker ready', registration);

        return registration;
    } catch (error) {
        console.log('Failed to setup service worker:', error);
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