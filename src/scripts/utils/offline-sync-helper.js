const DB_NAME = 'story-app-sync-db';
const DB_VERSION = 1;
const PENDING_STORIES_STORE = 'pending-stories';

function openSyncDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Error opening Sync DB:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            console.log('Sync DB opened successfully');
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

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

export async function savePendingStory(storyData) {
    console.log('\nSaving pending story to IndexedDB...');
    
    try {
        const db = await openSyncDB();
        const transaction = db.transaction([PENDING_STORIES_STORE], 'readwrite');
        const store = transaction.objectStore(PENDING_STORIES_STORE);

        // Validate story data
        if (!storyData.photo) {
            throw new Error('Photo is required');
        }

        if (!storyData.description || storyData.description.trim() === '') {
            throw new Error('Description is required');
        }

        const pendingStory = {
            description: storyData.description,
            photoBlob: storyData.photo,
            photoName: storyData.photo.name,
            photoType: storyData.photo.type,
            photoSize: storyData.photo.size,
            lat: storyData.lat || null,
            lon: storyData.lon || null,
            timestamp: Date.now(),
            status: 'pending',
            retryCount: 0,
            error: null
        };

        console.log('  Story data:', {
            description: pendingStory.description.substring(0, 50) + '...',
            photoName: pendingStory.photoName,
            photoSize: pendingStory.photoSize,
            hasLocation: !!(pendingStory.lat && pendingStory.lon)
        });

        const request = store.add(pendingStory);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const id = request.result;
                console.log(`Pending story saved with ID: ${id}`);
                resolve(id);
            };

            request.onerror = () => {
                console.error('Error saving pending story:', request.error);
                reject(request.error);
            };

            transaction.oncomplete = () => {
                db.close();
                console.log('  Database connection closed');
            };

            transaction.onerror = () => {
                console.error('Transaction error:', transaction.error);
                reject(transaction.error);
            };
        });
    } catch (error) {
        console.error('Error in savePendingStory:', error);
        throw error;
    }
}

export async function getPendingStories() {
    console.log('\n📂 Fetching pending stories from IndexedDB...');
    
    try {
        const db = await openSyncDB();
        const transaction = db.transaction([PENDING_STORIES_STORE], 'readonly');
        const store = transaction.objectStore(PENDING_STORIES_STORE);
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const stories = request.result || [];
                console.log(`Retrieved ${stories.length} pending stories`);
                
                if (stories.length > 0) {
                    console.log('  Stories overview:');
                    stories.forEach((story, index) => {
                        console.log(`    ${index + 1}. ID: ${story.id}, Status: ${story.status}, Retries: ${story.retryCount}`);
                    });
                }
                
                resolve(stories);
            };

            request.onerror = () => {
                console.error('Error getting pending stories:', request.error);
                reject(request.error);
            };

            transaction.oncomplete = () => {
                db.close();
            };

            transaction.onerror = () => {
                console.error('Transaction error:', transaction.error);
                reject(transaction.error);
            };
        });
    } catch (error) {
        console.error('Error in getPendingStories:', error);
        return [];
    }
}

export async function updatePendingStoryStatus(id, status, error = null) {
    console.log(`\nUpdating story ${id} status to: ${status}`);
    
    try {
        const db = await openSyncDB();
        const transaction = db.transaction([PENDING_STORIES_STORE], 'readwrite');
        const store = transaction.objectStore(PENDING_STORIES_STORE);
        
        const getRequest = store.get(id);

        return new Promise((resolve, reject) => {
            getRequest.onsuccess = () => {
                const story = getRequest.result;
                
                if (!story) {
                    const errorMsg = `Story with ID ${id} not found`;
                    console.error(`${errorMsg}`);
                    reject(new Error(errorMsg));
                    return;
                }

                console.log(`  Current status: ${story.status}, New status: ${status}`);

                story.status = status;
                story.error = error;
                
                if (status === 'failed') {
                    story.retryCount = (story.retryCount || 0) + 1;
                    console.log(`Retry count increased to: ${story.retryCount}`);
                }

                const updateRequest = store.put(story);
                
                updateRequest.onsuccess = () => {
                    console.log(`Story ${id} status updated successfully`);
                    resolve();
                };

                updateRequest.onerror = () => {
                    console.error(`Error updating story ${id}:`, updateRequest.error);
                    reject(updateRequest.error);
                };
            };

            getRequest.onerror = () => {
                console.error(`Error getting story ${id}:`, getRequest.error);
                reject(getRequest.error);
            };

            transaction.oncomplete = () => {
                db.close();
            };

            transaction.onerror = () => {
                console.error('Transaction error:', transaction.error);
                reject(transaction.error);
            };
        });
    } catch (error) {
        console.error('Error in updatePendingStoryStatus:', error);
        throw error;
    }
}

export async function deletePendingStory(id) {
    console.log(`\nDeleting pending story ${id} from IndexedDB...`);
    
    try {
        const db = await openSyncDB();
        const transaction = db.transaction([PENDING_STORIES_STORE], 'readwrite');
        const store = transaction.objectStore(PENDING_STORIES_STORE);
        const request = store.delete(id);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                console.log(`Pending story ${id} deleted successfully`);
                resolve();
            };

            request.onerror = () => {
                console.error(`Error deleting pending story ${id}:`, request.error);
                reject(request.error);
            };

            transaction.oncomplete = () => {
                db.close();
                console.log('  Database connection closed');
            };

            transaction.onerror = () => {
                console.error('Transaction error:', transaction.error);
                reject(transaction.error);
            };
        });
    } catch (error) {
        console.error('Error in deletePendingStory:', error);
        throw error;
    }
}

export async function getPendingStoriesCount() {
    try {
        const db = await openSyncDB();
        const transaction = db.transaction([PENDING_STORIES_STORE], 'readonly');
        const store = transaction.objectStore(PENDING_STORIES_STORE);
        const request = store.count();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const count = request.result;
                console.log(`Pending stories count: ${count}`);
                resolve(count);
            };

            request.onerror = () => {
                console.error('Error counting pending stories:', request.error);
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

export async function clearPendingStories() {
    console.log('\nClearing all pending stories from IndexedDB...');
    
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

            transaction.onerror = () => {
                console.error('Transaction error:', transaction.error);
                reject(transaction.error);
            };
        });
    } catch (error) {
        console.error('Error in clearPendingStories:', error);
        throw error;
    }
}