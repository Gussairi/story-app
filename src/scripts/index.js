import '../styles/styles.css';
import '../styles/transitions.css';

import App from './pages/app.js';
import { registerServiceWorker, requestNotificationPermission } from './utils/index.js';
import syncManager from './utils/sync-manager.js';
import syncStatusComponent from './components/sync-status-component.js';
import { autoCleanupCache } from './utils/cache-manager.js';

document.addEventListener('DOMContentLoaded', async () => {
    const app = new App({
        content: document.querySelector('#main-content'),
        drawerButton: document.querySelector('#drawer-button'),
        navigationDrawer: document.querySelector('#navigation-drawer'),
    });
    
    await app.renderPage();
    await registerServiceWorker();
    
    await requestNotificationPermission();

    await syncStatusComponent.init();

    autoCleanupCache().then(result => {
        if (result.cleaned) {
            console.log('✅ Cache auto-cleanup completed:', result);
        }
    }).catch(error => {
        console.error('Error during cache auto-cleanup:', error);
    });

    if (navigator.onLine) {
        const hasPending = await syncManager.hasPendingStories();
        if (hasPending) {
            console.log('🔄 Found pending stories, starting auto-sync...')
            setTimeout(() => {
                syncManager.syncPendingStories(true);
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