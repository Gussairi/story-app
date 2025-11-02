// src/scripts/utils/sync-manager.js

import API from '../data/api';
import {
    getPendingStories,
    updatePendingStoryStatus,
    deletePendingStory,
    getPendingStoriesCount
} from './offline-sync-helper';
import { showSuccess, showError } from './swal-helper';

class SyncManager {
    #isSyncing = false;
    #syncInterval = null;
    #listeners = [];

    constructor() {
        this.#setupOnlineListener();
        this.#startPeriodicSync();
    }

    /**
     * Setup listener untuk online/offline event
     */
    #setupOnlineListener() {
        window.addEventListener('online', async () => {
            console.log('🌐 Connection restored - Starting sync...');
            await this.syncPendingStories();
        });

        window.addEventListener('offline', () => {
            console.log('📴 Connection lost - Stories will be queued for sync');
        });
    }

    /**
     * Mulai periodic sync setiap 30 detik (jika online)
     */
    #startPeriodicSync() {
        // Cek setiap 30 detik
        this.#syncInterval = setInterval(async () => {
            if (navigator.onLine && !this.#isSyncing) {
                const count = await getPendingStoriesCount();
                if (count > 0) {
                    console.log(`📤 Auto-sync: ${count} pending stories found`);
                    await this.syncPendingStories(true); // silent mode
                }
            }
        }, 30000); // 30 seconds
    }

    /**
     * Stop periodic sync
     */
    stopPeriodicSync() {
        if (this.#syncInterval) {
            clearInterval(this.#syncInterval);
            this.#syncInterval = null;
        }
    }

    /**
     * Subscribe ke sync events
     * @param {Function} callback - Callback function(event)
     */
    subscribe(callback) {
        this.#listeners.push(callback);
        return () => {
            this.#listeners = this.#listeners.filter(cb => cb !== callback);
        };
    }

    /**
     * Emit event ke semua listeners
     * @param {Object} event - Event data
     */
    #emit(event) {
        this.#listeners.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error('Error in sync listener:', error);
            }
        });
    }

    /**
     * Sync semua pending stories
     * @param {boolean} silent - Jika true, tidak tampilkan notifikasi
     * @returns {Promise<Object>} - Result {success: number, failed: number}
     */
    async syncPendingStories(silent = false) {
        if (this.#isSyncing) {
            console.log('Sync already in progress');
            return { success: 0, failed: 0 };
        }

        if (!navigator.onLine) {
            if (!silent) {
                showError(
                    'Tidak Ada Koneksi',
                    'Tidak dapat melakukan sync saat offline'
                );
            }
            return { success: 0, failed: 0 };
        }

        this.#isSyncing = true;
        this.#emit({ type: 'sync-start' });

        let successCount = 0;
        let failedCount = 0;

        try {
            const pendingStories = await getPendingStories();
            
            if (pendingStories.length === 0) {
                console.log('No pending stories to sync');
                this.#isSyncing = false;
                return { success: 0, failed: 0 };
            }

            console.log(`📤 Syncing ${pendingStories.length} pending stories...`);

            // Filter hanya yang pending atau failed dengan retry < 3
            const storiesToSync = pendingStories.filter(
                story => story.status === 'pending' || 
                        (story.status === 'failed' && story.retryCount < 3)
            );

            for (const story of storiesToSync) {
                try {
                    await this.#syncSingleStory(story);
                    successCount++;
                    this.#emit({ 
                        type: 'sync-progress', 
                        current: successCount + failedCount,
                        total: storiesToSync.length,
                        success: successCount,
                        failed: failedCount
                    });
                } catch (error) {
                    console.error(`Failed to sync story ${story.id}:`, error);
                    failedCount++;
                    this.#emit({ 
                        type: 'sync-progress', 
                        current: successCount + failedCount,
                        total: storiesToSync.length,
                        success: successCount,
                        failed: failedCount
                    });
                }
            }

            this.#emit({ 
                type: 'sync-complete', 
                success: successCount, 
                failed: failedCount 
            });

            // Tampilkan notifikasi hasil sync
            if (!silent && (successCount > 0 || failedCount > 0)) {
                if (failedCount === 0) {
                    showSuccess(
                        'Sync Berhasil! ✅',
                        `${successCount} cerita berhasil di-sync`,
                        2000
                    );
                } else if (successCount > 0) {
                    showSuccess(
                        'Sync Selesai',
                        `${successCount} berhasil, ${failedCount} gagal`,
                        2000
                    );
                } else {
                    showError(
                        'Sync Gagal',
                        `${failedCount} cerita gagal di-sync. Akan dicoba lagi nanti.`
                    );
                }
            }

        } catch (error) {
            console.error('Error during sync:', error);
            this.#emit({ type: 'sync-error', error });
            
            if (!silent) {
                showError(
                    'Sync Error',
                    'Terjadi kesalahan saat melakukan sync'
                );
            }
        } finally {
            this.#isSyncing = false;
        }

        return { success: successCount, failed: failedCount };
    }

    /**
     * Sync single story
     * @param {Object} story - Story data dari IndexedDB
     */
    async #syncSingleStory(story) {
        // Update status ke syncing
        await updatePendingStoryStatus(story.id, 'syncing');

        try {
            const token = localStorage.getItem('token');
            
            // Siapkan data untuk API
            const storyData = {
                photo: story.photoBlob,
                description: story.description
            };

            if (story.lat !== null && story.lat !== undefined) {
                storyData.lat = story.lat;
            }
            if (story.lon !== null && story.lon !== undefined) {
                storyData.lon = story.lon;
            }

            // Upload ke server
            let response;
            if (token) {
                response = await API.addStory(token, storyData);
            } else {
                response = await API.addStoryGuest(storyData);
            }

            if (response.error === false) {
                // Berhasil - hapus dari pending
                await deletePendingStory(story.id);
                console.log(`✅ Story ${story.id} synced successfully`);
            } else {
                throw new Error(response.message || 'Failed to sync story');
            }

        } catch (error) {
            console.error(`❌ Failed to sync story ${story.id}:`, error);
            
            // Update status ke failed
            await updatePendingStoryStatus(
                story.id, 
                'failed', 
                error.message
            );
            
            throw error;
        }
    }

    /**
     * Cek apakah ada pending stories
     * @returns {Promise<boolean>}
     */
    async hasPendingStories() {
        const count = await getPendingStoriesCount();
        return count > 0;
    }

    /**
     * Get status sync
     * @returns {Object}
     */
    getStatus() {
        return {
            isSyncing: this.#isSyncing,
            isOnline: navigator.onLine
        };
    }
}

// Export singleton instance
const syncManager = new SyncManager();
export default syncManager;