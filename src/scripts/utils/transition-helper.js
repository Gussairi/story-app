export const supportsViewTransitions = () => {
    return 'startViewTransition' in document;
};

export const transitionHelper = async (updateCallback) => {
    if (!supportsViewTransitions()) {
        await updateCallback();
        return;
    }

    const transition = document.startViewTransition(async () => {
        await updateCallback();
    });

    try {
        await transition.finished;
    } catch (error) {
        console.log('Transition interrupted:', error);
    }
};

export const transitionWithName = async (updateCallback, transitionName) => {
    if (!supportsViewTransitions()) {
        await updateCallback();
        return;
    }

    document.documentElement.setAttribute('data-transition', transitionName);

    const transition = document.startViewTransition(async () => {
        await updateCallback();
    });

    try {
        await transition.finished;
    } catch (error) {
        console.log('Transition interrupted:', error);
    } finally {
        document.documentElement.removeAttribute('data-transition');
    }
};

export const transitionWithDirection = async (
    updateCallback,
    direction = 'forward'
) => {
    if (!supportsViewTransitions()) {
        await updateCallback();
        return;
    }

    document.documentElement.setAttribute('data-direction', direction);

    const transition = document.startViewTransition(async () => {
        await updateCallback();
    });

    try {
        await transition.finished;
    } catch (error) {
        console.log('Transition interrupted:', error);
    } finally {
        document.documentElement.removeAttribute('data-direction');
    }
};

export const preloadImages = (imageUrls) => {
    return Promise.all(
        imageUrls.map((url) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(url);
                img.onerror = () => reject(url);
                img.src = url;
            });
        })
    );
};
