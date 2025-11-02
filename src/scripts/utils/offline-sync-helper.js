// src/scripts/utils/offline-sync-helper.js

const DB_NAME = 'story-app-sync-db';
const DB_VERSION = 1;
const PENDING_STORIES_STORE = 'pending-stories';

/**
 * Inisialisasi dan buka koneksi ke IndexedDB untuk sync
 * @returns {Promise<IDBDatabase>}
 */
function openSyncDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Error opening Sync DB:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Buat object store untuk pending stories
            if (!db.objectStoreNames.contains(PENDING_STORIES_STORE)) {
                const objectStore = db.createObjectStore(PENDING_STORIES_STORE, { 
                    keyPath: 'id',
                    autoIncrement: true 
                });
                objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                objectStore.createIndex('status', 'status', { unique: false });
                console.log('Pending stories store created');
            }
        };
    });
}

/**
 * Simpan story ke IndexedDB untuk di-sync nanti
 * @param {Object} storyData - Data story yang akan disimpan
 * @returns {Promise<number>} - ID dari story yang disimpan
 */
export async function savePendingStory(storyData) {
    try {
        const db = await openSyncDB();
        const transaction = db.transaction([PENDING_STORIES_STORE], 'readwrite');
        const store = transaction.objectStore(PENDING_STORIES_STORE);

        const pendingStory = {
            description: storyData.description,
            photoBlob: storyData.photo, // File object
            photoName: storyData.photo.name,
            photoType: storyData.photo.type,
            photoSize: storyData.photo.size,
            lat: storyData.lat || null,
            lon: storyData.lon || null,
            timestamp: Date.now(),
            status: 'pending', // pending, syncing, failed
            retryCount: 0,
            error: null
        };

        const request = store.add(pendingStory);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const id = request.result;
                console.log(`Pending story saved with ID: ${id}`, pendingStory);
                resolve(id);
            };

            request.onerror = () => {
                console.error('Error saving pending story:', request.error);
                reject(request.error);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        console.error('Error in savePendingStory:', error);
        throw error;
    }
}

/**
 * Ambil semua pending stories
 * @returns {Promise<Array>}
 */
export async function getPendingStories() {
    try {
        const db = await openSyncDB();
        const transaction = db.transaction([PENDING_STORIES_STORE], 'readonly');
        const store = transaction.objectStore(PENDING_STORIES_STORE);
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const stories = request.result || [];
                console.log(`Retrieved ${stories.length} pending stories`);
                resolve(stories);
            };

            request.onerror = () => {
                console.error('Error getting pending stories:', request.error);
                reject(request.error);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        console.error('Error in getPendingStories:', error);
        return [];
    }
}

/**
 * Update status pending story
 * @param {number} id - ID story
 * @param {string} status - Status baru (pending, syncing, failed)
 * @param {string} error - Error message jika ada
 * @returns {Promise<void>}
 */
export async function updatePendingStoryStatus(id, status, error = null) {
    try {
        const db = await openSyncDB();
        const transaction = db.transaction([PENDING_STORIES_STORE], 'readwrite');
        const store = transaction.objectStore(PENDING_STORIES_STORE);
        
        const getRequest = store.get(id);

        return new Promise((resolve, reject) => {
            getRequest.onsuccess = () => {
                const story = getRequest.result;
                if (!story) {
                    reject(new Error('Story not found'));
                    return;
                }

                story.status = status;
                story.error = error;
                if (status === 'failed') {
                    story.retryCount = (story.retryCount || 0) + 1;
                }

                const updateRequest = store.put(story);
                
                updateRequest.onsuccess = () => {
                    console.log(`Story ${id} status updated to: ${status}`);
                    resolve();
                };

                updateRequest.onerror = () => {
                    reject(updateRequest.error);
                };
            };

            getRequest.onerror = () => {
                reject(getRequest.error);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        console.error('Error updating story status:', error);
        throw error;
    }
}

/**
 * Hapus pending story setelah berhasil sync
 * @param {number} id - ID story yang akan dihapus
 * @returns {Promise<void>}
 */
export async function deletePendingStory(id) {
    try {
        const db = await openSyncDB();
        const transaction = db.transaction([PENDING_STORIES_STORE], 'readwrite');
        const store = transaction.objectStore(PENDING_STORIES_STORE);
        const request = store.delete(id);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                console.log(`Pending story ${id} deleted`);
                resolve();
            };

            request.onerror = () => {
                console.error('Error deleting pending story:', request.error);
                reject(request.error);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        console.error('Error in deletePendingStory:', error);
        throw error;
    }
}

/**
 * Hitung jumlah pending stories
 * @returns {Promise<number>}
 */
export async function getPendingStoriesCount() {
    try {
        const db = await openSyncDB();
        const transaction = db.transaction([PENDING_STORIES_STORE], 'readonly');
        const store = transaction.objectStore(PENDING_STORIES_STORE);
        const request = store.count();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        console.error('Error in getPendingStoriesCount:', error);
        return 0;
    }
}

/**
 * Clear semua pending stories (untuk testing/reset)
 * @returns {Promise<void>}
 */
export async function clearPendingStories() {
    try {
        const db = await openSyncDB();
        const transaction = db.transaction([PENDING_STORIES_STORE], 'readwrite');
        const store = transaction.objectStore(PENDING_STORIES_STORE);
        const request = store.clear();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                console.log('All pending stories cleared');
                resolve();
            };

            request.onerror = () => {
                console.error('Error clearing pending stories:', request.error);
                reject(request.error);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        console.error('Error in clearPendingStories:', error);
        throw error;
    }
}