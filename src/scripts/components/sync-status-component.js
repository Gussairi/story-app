// src/scripts/components/sync-status-component.js

import syncManager from '../utils/sync-manager';
import { getPendingStoriesCount } from '../utils/offline-sync-helper';
import { showConfirm } from '../utils/swal-helper';

class SyncStatusComponent {
    #container = null;
    #unsubscribe = null;

    /**
     * Inisialisasi dan render sync status di page
     */
    async init() {
        // Cek apakah sudah ada container
        if (document.getElementById('sync-status-container')) {
            return;
        }

        // Buat container
        this.#container = document.createElement('div');
        this.#container.id = 'sync-status-container';
        this.#container.className = 'sync-status-container';
        document.body.appendChild(this.#container);

        // Subscribe ke sync events
        this.#unsubscribe = syncManager.subscribe((event) => {
            this.#handleSyncEvent(event);
        });

        // Render initial status
        await this.#render();

        // Setup listeners
        this.#setupEventListeners();
    }

    /**
     * Destroy component
     */
    destroy() {
        if (this.#unsubscribe) {
            this.#unsubscribe();
        }
        if (this.#container) {
            this.#container.remove();
        }
    }

    /**
     * Setup event listeners
     */
    #setupEventListeners() {
        window.addEventListener('online', () => this.#render());
        window.addEventListener('offline', () => this.#render());
    }

    /**
     * Handle sync events
     */
    #handleSyncEvent(event) {
        switch (event.type) {
            case 'sync-start':
                this.#showSyncing();
                break;
            case 'sync-progress':
                this.#updateProgress(event);
                break;
            case 'sync-complete':
                this.#showComplete(event);
                setTimeout(() => this.#render(), 3000);
                break;
            case 'sync-error':
                this.#showError(event);
                setTimeout(() => this.#render(), 3000);
                break;
        }
    }

    /**
     * Render sync status
     */
    async #render() {
        const pendingCount = await getPendingStoriesCount();
        const isOnline = navigator.onLine;
        const { isSyncing } = syncManager.getStatus();

        if (pendingCount === 0 && !isSyncing) {
            this.#container.innerHTML = '';
            this.#container.classList.remove('show');
            return;
        }

        const statusHTML = `
            <div class="sync-status ${isOnline ? 'online' : 'offline'}">
                <div class="sync-status-content">
                    <span class="sync-icon">${isOnline ? '🔄' : '📴'}</span>
                    <div class="sync-info">
                        <span class="sync-title">
                            ${isOnline ? 'Pending Sync' : 'Mode Offline'}
                        </span>
                        <span class="sync-count">${pendingCount} cerita menunggu</span>
                    </div>
                </div>
                ${isOnline && pendingCount > 0 ? `
                    <button class="sync-button" id="btnManualSync" title="Sync Sekarang">
                        <span>Sync</span>
                    </button>
                ` : ''}
            </div>
        `;

        this.#container.innerHTML = statusHTML;
        this.#container.classList.add('show');

        // Setup sync button
        const btnManualSync = document.getElementById('btnManualSync');
        if (btnManualSync) {
            btnManualSync.addEventListener('click', async () => {
                await syncManager.syncPendingStories();
            });
        }
    }

    /**
     * Show syncing state
     */
    #showSyncing() {
        this.#container.innerHTML = `
            <div class="sync-status syncing">
                <div class="sync-status-content">
                    <span class="sync-icon sync-spinner">🔄</span>
                    <div class="sync-info">
                        <span class="sync-title">Syncing...</span>
                        <span class="sync-count">Mengirim cerita ke server</span>
                    </div>
                </div>
            </div>
        `;
        this.#container.classList.add('show');
    }

    /**
     * Update progress
     */
    #updateProgress(event) {
        const { current, total, success, failed } = event;
        this.#container.innerHTML = `
            <div class="sync-status syncing">
                <div class="sync-status-content">
                    <span class="sync-icon sync-spinner">🔄</span>
                    <div class="sync-info">
                        <span class="sync-title">Syncing ${current}/${total}</span>
                        <span class="sync-count">✅ ${success} berhasil ${failed > 0 ? `• ❌ ${failed} gagal` : ''}</span>
                    </div>
                </div>
                <div class="sync-progress">
                    <div class="sync-progress-bar" style="width: ${(current/total)*100}%"></div>
                </div>
            </div>
        `;
    }

    /**
     * Show complete state
     */
    #showComplete(event) {
        const { success, failed } = event;
        this.#container.innerHTML = `
            <div class="sync-status success">
                <div class="sync-status-content">
                    <span class="sync-icon">✅</span>
                    <div class="sync-info">
                        <span class="sync-title">Sync Selesai!</span>
                        <span class="sync-count">${success} berhasil${failed > 0 ? `, ${failed} gagal` : ''}</span>
                    </div>
                </div>
            </div>
        `;
        this.#container.classList.add('show');
    }

    /**
     * Show error state
     */
    #showError(event) {
        this.#container.innerHTML = `
            <div class="sync-status error">
                <div class="sync-status-content">
                    <span class="sync-icon">❌</span>
                    <div class="sync-info">
                        <span class="sync-title">Sync Gagal</span>
                        <span class="sync-count">Akan dicoba lagi nanti</span>
                    </div>
                </div>
            </div>
        `;
        this.#container.classList.add('show');
    }
}

// Export singleton instance
const syncStatusComponent = new SyncStatusComponent();
export default syncStatusComponent;