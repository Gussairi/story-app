export function isServiceWorkerAvailable() {
        return 'serviceWorker' in navigator;
    }
    
    export async function registerServiceWorker() {
        if (!isServiceWorkerAvailable()) {
            console.log('Service Worker API unsupported');
            return;
        }
        
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service worker telah terpasang', registration);
        } catch (error) {
            console.log('Failed to install service worker:', error);
    }
}