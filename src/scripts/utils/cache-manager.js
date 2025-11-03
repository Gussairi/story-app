export async function getCacheInfo() {
    if (!('caches' in window)) {
        return {
            supported: false,
            caches: [],
            totalSize: 0,
            totalEntries: 0
        };
    }

    try {
        const cacheNames = await caches.keys();
        const cacheInfo = [];
        let totalSize = 0;
        let totalEntries = 0;

        for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            
            let cacheSize = 0;
            for (const request of keys) {
                try {
                    const response = await cache.match(request);
                    if (response) {
                        const blob = await response.blob();
                        cacheSize += blob.size;
                    }
                } catch (error) {
                    console.error('Error calculating cache size:', error);
                }
            }

            cacheInfo.push({
                name: cacheName,
                entries: keys.length,
                size: cacheSize,
                sizeFormatted: formatBytes(cacheSize)
            });

            totalSize += cacheSize;
            totalEntries += keys.length;
        }

        return {
            supported: true,
            caches: cacheInfo,
            totalSize,
            totalSizeFormatted: formatBytes(totalSize),
            totalEntries
        };
    } catch (error) {
        console.error('Error getting cache info:', error);
        return {
            supported: true,
            error: error.message,
            caches: [],
            totalSize: 0,
            totalEntries: 0
        };
    }
}

export async function clearCache(cacheName) {
    if (!('caches' in window)) {
        return false;
    }

    try {
        const deleted = await caches.delete(cacheName);
        console.log(`Cache ${cacheName} ${deleted ? 'deleted' : 'not found'}`);
        return deleted;
    } catch (error) {
        console.error('Error clearing cache:', error);
        return false;
    }
}

export async function clearAllCaches() {
    if (!('caches' in window)) {
        return 0;
    }

    try {
        const cacheNames = await caches.keys();
        let cleared = 0;

        for (const cacheName of cacheNames) {
            const deleted = await caches.delete(cacheName);
            if (deleted) {
                cleared++;
                console.log(`Cleared cache: ${cacheName}`);
            }
        }

        return cleared;
    } catch (error) {
        console.error('Error clearing all caches:', error);
        return 0;
    }
}

export async function clearOldCacheEntries(cacheName, days = 7) {
    if (!('caches' in window)) {
        return 0;
    }

    try {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        const now = Date.now();
        const threshold = days * 24 * 60 * 60 * 1000;
        let cleared = 0;

        for (const request of keys) {
            try {
                const response = await cache.match(request);
                if (response) {
                    const dateHeader = response.headers.get('date');
                    if (dateHeader) {
                        const cacheDate = new Date(dateHeader).getTime();
                        if (now - cacheDate > threshold) {
                            await cache.delete(request);
                            cleared++;
                        }
                    }
                }
            } catch (error) {
                console.error('Error clearing old entry:', error);
            }
        }

        console.log(`Cleared ${cleared} old entries from ${cacheName}`);
        return cleared;
    } catch (error) {
        console.error('Error clearing old cache entries:', error);
        return 0;
    }
}

export async function getStorageQuota() {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
        return {
            supported: false,
            quota: 0,
            usage: 0,
            available: 0
        };
    }

    try {
        const estimate = await navigator.storage.estimate();
        const quota = estimate.quota || 0;
        const usage = estimate.usage || 0;
        const available = quota - usage;
        const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

        return {
            supported: true,
            quota,
            quotaFormatted: formatBytes(quota),
            usage,
            usageFormatted: formatBytes(usage),
            available,
            availableFormatted: formatBytes(available),
            percentUsed: percentUsed.toFixed(2)
        };
    } catch (error) {
        console.error('Error getting storage quota:', error);
        return {
            supported: true,
            error: error.message,
            quota: 0,
            usage: 0,
            available: 0
        };
    }
}

export async function isCacheTooLarge(maxSizeMB = 50) {
    const info = await getCacheInfo();
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return info.totalSize > maxSizeBytes;
}

export async function removeImagesFromCache() {
    if (!('caches' in window)) {
        return 0;
    }

    try {
        const cacheNames = await caches.keys();
        let removed = 0;

        for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();

            for (const request of keys) {
                const url = request.url;
                
                if (url.includes('story-api.dicoding.dev') && 
                    (url.includes('/images/') || 
                    url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i))) {
                    await cache.delete(request);
                    removed++;
                    console.log(`Removed image from cache: ${url}`);
                }
                
                try {
                    const response = await cache.match(request);
                    if (response) {
                        const contentType = response.headers.get('content-type');
                        if (contentType && contentType.startsWith('image/')) {
                            await cache.delete(request);
                            removed++;
                            console.log(`Removed image by content-type: ${url}`);
                        }
                    }
                } catch (error) {
                }
            }
        }

        console.log(`Total images removed: ${removed}`);
        return removed;
    } catch (error) {
        console.error('Error removing images from cache:', error);
        return 0;
    }
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export async function autoCleanupCache() {
    console.log('Running auto cache cleanup...');
    
    const info = await getCacheInfo();
    const maxSizeMB = 50;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (info.totalSize <= maxSizeBytes) {
        console.log(`Cache size OK: ${info.totalSizeFormatted}`);
        return {
            cleaned: false,
            reason: 'Cache size within limit',
            size: info.totalSizeFormatted
        };
    }

    console.log(`Cache too large: ${info.totalSizeFormatted}, cleaning up...`);

    const imagesRemoved = await removeImagesFromCache();

    let oldEntriesRemoved = 0;
    for (const cacheInfo of info.caches) {
        const removed = await clearOldCacheEntries(cacheInfo.name, 7);
        oldEntriesRemoved += removed;
    }

    const newInfo = await getCacheInfo();

    return {
        cleaned: true,
        imagesRemoved,
        oldEntriesRemoved,
        oldSize: info.totalSizeFormatted,
        newSize: newInfo.totalSizeFormatted,
        savedBytes: info.totalSize - newInfo.totalSize,
        savedFormatted: formatBytes(info.totalSize - newInfo.totalSize)
    };
}