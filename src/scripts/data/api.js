import CONFIG from '../config';

const API = {
    async register({name, email, password}) {
        try {
            const response = await fetch(`${CONFIG.BASE_URL}/register`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({name, email, password})
            });
            const responseJson = await response.json();

            if (!response.ok) {
                throw new Error(
                    responseJson.message || 'Failed to register'
                );
            }

            return responseJson;
        } catch (error) {
            console.error('Error during register:', error);
            throw error;
        }
    },

    async login({email, password}) {
        try {
            const response = await fetch(`${CONFIG.BASE_URL}/login`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({email, password})
            });
            const responseJson = await response.json();

            if (!response.ok) {
                throw new Error(
                    responseJson.message || 'Failed to login'
                );
            }

            return responseJson;
        } catch (error) {
            console.error('Error during login:', error);
            throw error;
        }
    },

    async addStory(token, story) {
        try {
            const formData = new FormData();
            formData.append('description', story.description);
            formData.append('photo', story.photo);

            if (story.lat !== undefined && story.lat !== null) {
                formData.append('lat', story.lat);
            }
            if (story.lon !== undefined && story.lon !== null) {
                formData.append('lon', story.lon);
            }

            const response = await fetch(`${CONFIG.BASE_URL}/stories`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}` 
                },
                body: formData,
            });
            const responseJson = await response.json();

            if (!response.ok) {
                throw new Error(
                    responseJson.message || 'Failed to add new story'
                );
            }

            return responseJson;
        } catch (error) {
            console.error('Error add new story:', error);
            throw error;
        }
    },
    
    async addStoryGuest(story) {
        try {
            const formData = new FormData();
            formData.append('description', story.description);
            formData.append('photo', story.photo);

            if (story.lat !== undefined && story.lat !== null) {
                formData.append('lat', story.lat);
            }
            if (story.lon !== undefined && story.lon !== null) {
                formData.append('lon', story.lon);
            }

            const response = await fetch(`${CONFIG.BASE_URL}/stories/guest`, {
                method: 'POST',
                body: formData,
            });
            const responseJson = await response.json();

            if (!response.ok) {
                throw new Error(
                    responseJson.message || 'Failed to add new story as guest'
                );
            }

            return responseJson;
        } catch (error) {
            console.error('Error add new story as guest:', error);
            throw error;
        }
    },

    async getStories(token, {page = 1, size = 20, location = 0} = {}) {
        try {
            const params = new URLSearchParams({
                page: String(page),
                size: String(size),
                location: String(location)
            });
            
            const response = await fetch(`${CONFIG.BASE_URL}/stories?${params.toString()}`, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}`
                },
            });
            const responseJson = await response.json();

            if (!response.ok) {
                throw new Error(
                    responseJson.message || 'Failed to get stories'
                );
            }

            return responseJson;
        } catch (error) {
            console.error('Error get stories:', error);
            throw error;
        }
    },

    async getDetailStory(token, id) {
        try {
            if (!id) {
                throw new Error('Missing story ID');
            }
            
            const response = await fetch(`${CONFIG.BASE_URL}/stories/${encodeURIComponent(id)}`, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}`
                },
            });
            const responseJson = await response.json();

            if (!response.ok) {
                throw new Error(
                    responseJson.message || 'Failed to get story detail'
                );
            }

            return responseJson;
        } catch (error) {
            console.error('Error get story detail:', error);
            throw error;
        }
    },
}

export default API;