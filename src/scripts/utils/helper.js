export function showFormattedDate(date, locale = 'en-US', options = {}) {
    return new Date(date).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        ...options,
    });
}

export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const isValidPassword = (password) => {
    return password && password.length >= 8;
};

export async function sendPushNotification(notificationData) {
    if (!('serviceWorker' in navigator)) {
        console.log('Service Worker tidak didukung di browser ini');
        return false;
    }

    if (Notification.permission !== 'granted') {
        console.log('Notification permission belum diberikan');
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission ditolak');
            return false;
        }
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        
        if (registration.active) {
            registration.active.postMessage({
                type: 'SHOW_NOTIFICATION',
                payload: notificationData
            });
            return true;
        }
    } catch (error) {
        console.error('Error sending push notification:', error);
        return false;
    }
}

export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('Browser tidak mendukung notifikasi');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
}
