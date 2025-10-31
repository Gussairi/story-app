import '../styles/styles.css';
import '../styles/transitions.css';

import App from './pages/app.js';
import { registerServiceWorker } from './utils/index.js';

document.addEventListener('DOMContentLoaded', async () => {
    const app = new App({
        content: document.querySelector('#main-content'),
        drawerButton: document.querySelector('#drawer-button'),
        navigationDrawer: document.querySelector('#navigation-drawer'),
    });
    await app.renderPage();
    await registerServiceWorker();

    window.addEventListener('hashchange', async () => {
        await app.renderPage();
    });

    window.addEventListener('storage', async (e) => {
        if (e.key === 'token' || e.key === null) {
            await app.renderPage();
        }
    });
});
