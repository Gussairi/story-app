// Offline Helper - untuk mendeteksi status offline/online

export function isOnline() {
    return navigator.onLine;
}

export function setupOfflineIndicator() {
    // Create offline indicator element
    const offlineIndicator = document.createElement('div');
    offlineIndicator.id = 'offline-indicator';
    offlineIndicator.className = 'offline-indicator hidden';
    offlineIndicator.innerHTML = `
        <div class="offline-content">
            <span class="offline-icon">📡</span>
            <span class="offline-text">Anda sedang offline. Beberapa fitur mungkin terbatas.</span>
        </div>
    `;
    document.body.appendChild(offlineIndicator);

    // Online indicator
    const onlineIndicator = document.createElement('div');
    onlineIndicator.id = 'online-indicator';
    onlineIndicator.className = 'online-indicator hidden';
    onlineIndicator.innerHTML = `
        <div class="online-content">
            <span class="online-icon">✓</span>
            <span class="online-text">Kembali online!</span>
        </div>
    `;
    document.body.appendChild(onlineIndicator);

    // Event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial status
    if (!navigator.onLine) {
        showOfflineIndicator();
    }
}

function handleOffline() {
    console.log('App is offline');
    showOfflineIndicator();
}

function handleOnline() {
    console.log('App is online');
    hideOfflineIndicator();
    showOnlineIndicator();
    
    // Hide online indicator after 3 seconds
    setTimeout(() => {
        hideOnlineIndicator();
    }, 3000);
}

function showOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator');
    if (indicator) {
        indicator.classList.remove('hidden');
        indicator.classList.add('show');
    }
}

function hideOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator');
    if (indicator) {
        indicator.classList.remove('show');
        indicator.classList.add('hidden');
    }
}

function showOnlineIndicator() {
    const indicator = document.getElementById('online-indicator');
    if (indicator) {
        indicator.classList.remove('hidden');
        indicator.classList.add('show');
    }
}

function hideOnlineIndicator() {
    const indicator = document.getElementById('online-indicator');
    if (indicator) {
        indicator.classList.remove('show');
        indicator.classList.add('hidden');
    }
}

// Check if content is cached
export async function isContentCached(url) {
    if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const response = await cache.match(url);
            if (response) {
                return true;
            }
        }
    }
    return false;
}

// Get cached stories count
export async function getCachedStoriesCount() {
    if ('caches' in window) {
        const cache = await caches.open('story-app-api-v1');
        const keys = await cache.keys();
        const storyKeys = keys.filter(key => key.url.includes('/stories'));
        return storyKeys.length;
    }
    return 0;
}