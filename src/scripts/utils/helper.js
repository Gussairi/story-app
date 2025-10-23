export function showFormattedDate(date, locale = 'en-US', options = {}) {
    return new Date(date).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options,
    });
}

export function sleep(time = 1000) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

export const showFormStatus = (element, message, type = 'info') => {
    if (!element) return;
    
    element.textContent = message;
    element.classList.remove('sr-only');
    
    element.classList.remove('status-success', 'status-error', 'status-info');
    
    if (type === 'success') {
        element.classList.add('status-success');
    } else if (type === 'error') {
        element.classList.add('status-error');
    } else {
        element.classList.add('status-info');
    }
};

export const hideFormStatus = (element) => {
    if (!element) return;
    
    element.textContent = '';
    element.classList.add('sr-only');
    element.classList.remove('status-success', 'status-error', 'status-info');
};

export const setButtonLoading = (button, isLoading, loadingText = 'Loading...') => {
    if (!button) return;
    
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = loadingText;
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || 'Submit';
    }
};

export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const isValidPassword = (password) => {
    return password && password.length >= 8;
};

export const trimFormData = (data) => {
    const trimmed = {};
    for (const [key, value] of Object.entries(data)) {
        trimmed[key] = typeof value === 'string' ? value.trim() : value;
    }
    return trimmed;
};