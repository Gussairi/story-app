import API from '../../data/api';
import { showFormattedDate } from '../../utils/helper';
import { parseActivePathname } from '../../routes/url-parser';

export default class StoryDetailPage {
    #map = null;
    #marker = null;

    async render() {
        return `
        <section class="container">
            <div class="detail-header">
                <button id="btnBack" class="btn-back">← Kembali</button>
            </div>
            <div id="storyDetailContainer" class="story-detail-container">
                <div class="loading">Memuat detail cerita...</div>
            </div>
        </section>
        `;
    }

    async afterRender() {
        const btnBack = document.getElementById('btnBack');
        if (btnBack) {
            btnBack.addEventListener('click', () => {
                window.location.hash = '#/';
            });
        }

        await this.#loadStoryDetail();
    }

    async #loadStoryDetail() {
        const token = localStorage.getItem('token');
        const { id } = parseActivePathname();
        const container = document.getElementById('storyDetailContainer');

        if (!token) {
            window.location.hash = '#/login';
            return;
        }

        if (!id) {
            container.innerHTML =
                '<p class="error-message">ID cerita tidak valid.</p>';
            return;
        }

        try {
            const response = await API.getDetailStory(token, id);

            if (response.error === false && response.story) {
                const story = response.story;

                container.innerHTML = `
                    <article class="story-detail">
                        <div class="story-detail-image-wrapper">
                            <img src="${story.photoUrl}" alt="${story.name}" class="story-detail-image" />
                        </div>
                        <div class="story-detail-content">
                            <h2 class="story-detail-name">${story.name}</h2>
                            <p class="story-detail-date">${showFormattedDate(story.createdAt, 'id-ID')}</p>
                            <p class="story-detail-description">${story.description.replace(/\n/g, '<br>')}</p>
                            ${
                                story.lat && story.lon
                                    ? `
                                <div class="story-location">
                                    <h3>Lokasi</h3>
                                    <div id="map" class="map-container"></div>
                                    <p class="coordinates">Koordinat: ${story.lat}, ${story.lon}</p>
                                </div>
                            `
                                    : '<p class="no-location">Cerita ini tidak memiliki informasi lokasi.</p>'
                            }
                        </div>
                    </article>
                `;

                if (story.lat && story.lon) {
                    await this.#initializeMap(story.lat, story.lon, story.name);
                }
            } else {
                throw new Error('Gagal memuat detail cerita');
            }
        } catch (error) {
            console.error('Error loading story detail:', error);
            container.innerHTML = `
                <div class="error-message">
                    <p>Gagal memuat detail cerita. Silakan coba lagi.</p>
                    <button onclick="window.location.hash='#/'">Kembali ke Beranda</button>
                </div>
            `;
        }
    }

    async #initializeMap(lat, lon, title) {
        if (typeof L === 'undefined') {
            console.error('Leaflet library not loaded');
            return;
        }

        await new Promise((resolve) => setTimeout(resolve, 100));

        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        try {
            this.#map = L.map('map').setView([lat, lon], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
            }).addTo(this.#map);

            this.#marker = L.marker([lat, lon]).addTo(this.#map);
            this.#marker.bindPopup(`<b>${title}</b>`).openPopup();

            setTimeout(() => {
                if (this.#map) {
                    this.#map.invalidateSize();
                }
            }, 200);
        } catch (error) {
            console.error('Error initializing map:', error);
        }
    }
}
