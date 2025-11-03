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

    #setupOnlineListener() {
        window.addEventListener('online', async () => {
            console.log('Connection restored - Starting sync...');
            await this.syncPendingStories();
        });

        window.addEventListener('offline', () => {
            console.log('Connection lost - Stories will be queued for sync');
        });
    }

    #startPeriodicSync() {
        this.#syncInterval = setInterval(async () => {
            if (navigator.onLine && !this.#isSyncing) {
                const count = await getPendingStoriesCount();
                if (count > 0) {
                    console.log(`Auto-sync: ${count} pending stories found`);
                    await this.syncPendingStories(true);
                }
            }
        }, 30000);
    }

    stopPeriodicSync() {
        if (this.#syncInterval) {
            clearInterval(this.#syncInterval);
            this.#syncInterval = null;
        }
    }

    subscribe(callback) {
        this.#listeners.push(callback);
        return () => {
            this.#listeners = this.#listeners.filter(cb => cb !== callback);
        };
    }

    #emit(event) {
        this.#listeners.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error('Error in sync listener:', error);
            }
        });
    }

    async syncPendingStories(silent = false) {
        if (this.#isSyncing) {
            console.log('Sync already in progress, skipping...');
            return { success: 0, failed: 0 };
        }

        if (!navigator.onLine) {
            console.log('Device offline, cannot sync');
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
            
            console.log(`Found ${pendingStories.length} pending stories in IndexedDB`);
            
            if (pendingStories.length === 0) {
                console.log('No pending stories to sync');
                this.#isSyncing = false;
                return { success: 0, failed: 0 };
            }

            pendingStories.forEach((story, index) => {
                console.log(`  Story ${index + 1}:`, {
                    id: story.id,
                    status: story.status,
                    retryCount: story.retryCount,
                    timestamp: new Date(story.timestamp).toLocaleString()
                });
            });

            const storiesToSync = pendingStories.filter(
                story => story.status === 'pending' || 
                        (story.status === 'failed' && story.retryCount < 3)
            );

            console.log(`Syncing ${storiesToSync.length} stories...`);

            for (let i = 0; i < storiesToSync.length; i++) {
                const story = storiesToSync[i];
                
                console.log(`\nSyncing story ${i + 1}/${storiesToSync.length} (ID: ${story.id})...`);
                
                try {
                    await this.#syncSingleStory(story);
                    successCount++;
                    console.log(`Story ${story.id} synced successfully (${successCount}/${storiesToSync.length})`);
                    
                    this.#emit({ 
                        type: 'sync-progress', 
                        current: successCount + failedCount,
                        total: storiesToSync.length,
                        success: successCount,
                        failed: failedCount
                    });

                    if (i < storiesToSync.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                    
                } catch (error) {
                    failedCount++;
                    console.error(`Failed to sync story ${story.id}:`, error.message);
                    console.error('Error details:', error);
                    
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

            if (!silent && (successCount > 0 || failedCount > 0)) {
                if (failedCount === 0) {
                    showSuccess(
                        'Sync Berhasil!',
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
            console.error('Critical error during sync:', error);
            console.error('Stack trace:', error.stack);
            this.#emit({ type: 'sync-error', error });
            
            if (!silent) {
                showError(
                    'Sync Error',
                    'Terjadi kesalahan saat melakukan sync'
                );
            }
        } finally {
            this.#isSyncing = false;
            console.log('Sync process completed\n');
        }

        return { success: successCount, failed: failedCount };
    }

    async #syncSingleStory(story) {
        console.log('Story details:', {
            id: story.id,
            description: story.description?.substring(0, 50) + '...',
            photoName: story.photoName,
            photoSize: story.photoSize,
            hasLocation: !!(story.lat && story.lon)
        });

        try {
            await updatePendingStoryStatus(story.id, 'syncing');
            console.log(`Status updated to 'syncing' for story ${story.id}`);
        } catch (error) {
            console.error('Failed to update status to syncing:', error);
        }

        try {
            const token = localStorage.getItem('token');
            
            if (!story.photoBlob) {
                throw new Error('Photo blob is missing');
            }

            if (!story.description || story.description.trim() === '') {
                throw new Error('Description is missing');
            }

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

            let response;
            if (token) {
                response = await API.addStory(token, storyData);
            } else {
                response = await API.addStoryGuest(storyData);
            }

            console.log(`API response:`, response);

            if (response.error === false) {
                console.log(`Deleting story ${story.id} from IndexedDB...`);
                await deletePendingStory(story.id);
                console.log(`Story ${story.id} successfully deleted from IndexedDB`);
            } else {
                throw new Error(response.message || 'Failed to sync story');
            }

        } catch (error) {
            console.error(`Error syncing story ${story.id}:`, error);
            
            try {
                await updatePendingStoryStatus(
                    story.id, 
                    'failed', 
                    error.message || 'Unknown error'
                );
                console.log(`Status updated to 'failed' for story ${story.id}`);
            } catch (updateError) {
                console.error('Failed to update error status:', updateError);
            }
            
            throw error;
        }
    }

    async hasPendingStories() {
        const count = await getPendingStoriesCount();
        return count > 0;
    }

    getStatus() {
        return {
            isSyncing: this.#isSyncing,
            isOnline: navigator.onLine
        };
    }
}

const syncManager = new SyncManager();
export default syncManager;