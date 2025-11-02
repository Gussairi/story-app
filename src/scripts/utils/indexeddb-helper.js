// src/scripts/utils/indexeddb-helper.js

const DB_NAME = 'story-app-db';
const DB_VERSION = 1;
const STORE_NAME = 'preferences';

/**
 * Inisialisasi dan buka koneksi ke IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Error opening IndexedDB:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Buat object store jika belum ada
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
                objectStore.createIndex('key', 'key', { unique: true });
                console.log('Object store created:', STORE_NAME);
            }
        };
    });
}

/**
 * Simpan data ke IndexedDB
 * @param {string} key - Key untuk data
 * @param {any} value - Value yang akan disimpan
 * @returns {Promise<void>}
 */
export async function saveToIndexedDB(key, value) {
    try {
        const db = await openDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const data = {
            key: key,
            value: value,
            timestamp: Date.now()
        };

        const request = store.put(data);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                console.log(`Data saved to IndexedDB: ${key}`, value);
                resolve();
            };

            request.onerror = () => {
                console.error(`Error saving to IndexedDB: ${key}`, request.error);
                reject(request.error);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        console.error('Error in saveToIndexedDB:', error);
        throw error;
    }
}

/**
 * Ambil data dari IndexedDB
 * @param {string} key - Key untuk data yang ingin diambil
 * @returns {Promise<any>}
 */
export async function getFromIndexedDB(key) {
    try {
        const db = await openDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const result = request.result;
                console.log(`Data retrieved from IndexedDB: ${key}`, result);
                resolve(result ? result.value : null);
            };

            request.onerror = () => {
                console.error(`Error getting from IndexedDB: ${key}`, request.error);
                reject(request.error);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        console.error('Error in getFromIndexedDB:', error);
        return null;
    }
}

/**
 * Hapus data dari IndexedDB
 * @param {string} key - Key untuk data yang ingin dihapus
 * @returns {Promise<void>}
 */
export async function deleteFromIndexedDB(key) {
    try {
        const db = await openDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                console.log(`Data deleted from IndexedDB: ${key}`);
                resolve();
            };

            request.onerror = () => {
                console.error(`Error deleting from IndexedDB: ${key}`, request.error);
                reject(request.error);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        console.error('Error in deleteFromIndexedDB:', error);
        throw error;
    }
}

/**
 * Ambil semua data dari IndexedDB
 * @returns {Promise<Array>}
 */
export async function getAllFromIndexedDB() {
    try {
        const db = await openDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                console.log('All data retrieved from IndexedDB:', request.result);
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Error getting all from IndexedDB:', request.error);
                reject(request.error);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        console.error('Error in getAllFromIndexedDB:', error);
        return [];
    }
}

/**
 * Hapus semua data dari IndexedDB
 * @returns {Promise<void>}
 */
export async function clearIndexedDB() {
    try {
        const db = await openDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                console.log('IndexedDB cleared');
                resolve();
            };

            request.onerror = () => {
                console.error('Error clearing IndexedDB:', request.error);
                reject(request.error);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        console.error('Error in clearIndexedDB:', error);
        throw error;
    }
}

/**
 * Cek apakah IndexedDB tersedia
 * @returns {boolean}
 */
export function isIndexedDBAvailable() {
    return 'indexedDB' in window;
}