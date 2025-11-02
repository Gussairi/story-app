// src/scripts/index.js
import '../styles/styles.css';
import '../styles/transitions.css';

import App from './pages/app.js';
import { registerServiceWorker, requestNotificationPermission } from './utils/index.js';
import syncManager from './utils/sync-manager.js';
import syncStatusComponent from './components/sync-status-component.js';

document.addEventListener('DOMContentLoaded', async () => {
    const app = new App({
        content: document.querySelector('#main-content'),
        drawerButton: document.querySelector('#drawer-button'),
        navigationDrawer: document.querySelector('#navigation-drawer'),
    });
    
    await app.renderPage();
    await registerServiceWorker();
    
    // Request notification permission setelah service worker ready
    await requestNotificationPermission();

    // Initialize sync status component
    await syncStatusComponent.init();

    // Cek dan sync pending stories saat app load (jika online)
    if (navigator.onLine) {
        const hasPending = await syncManager.hasPendingStories();
        if (hasPending) {
            console.log('🔄 Found pending stories, starting auto-sync...');
            // Delay 2 detik agar user sempat lihat UI dulu
            setTimeout(() => {
                syncManager.syncPendingStories(true); // silent mode
            }, 2000);
        }
    }

    window.addEventListener('hashchange', async () => {
        await app.renderPage();
    });

    window.addEventListener('storage', async (e) => {
        if (e.key === 'token' || e.key === null) {
            await app.renderPage();
        }
    });
});