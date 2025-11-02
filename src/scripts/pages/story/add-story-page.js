import API from '../../data/api';
import {
    showLoading,
    closeLoading,
    showSuccess,
    showError,
    showConfirm,
} from '../../utils/swal-helper';

export default class AddStoryPage {
    #previewImage = null;
    #selectedFile = null;
    #currentLat = null;
    #currentLon = null;
    #map = null;
    #marker = null;
    #stream = null;
    #videoElement = null;

    async render() {
        const token = localStorage.getItem('token');
        const userName = localStorage.getItem('userName');
        const isLoggedIn = !!token;

        return `
            <section class="container">
                <div class="add-story-header">
                    <h1>Tambah Cerita Baru</h1>
                    ${!isLoggedIn ? '<p class="guest-notice">Anda sedang membuat cerita sebagai guest</p>' : `<p class="user-notice">Halo, ${userName}! Ada cerita apa hari ini?</p>`}
                </div>
                
                <form id="addStoryForm" class="add-story-form">
                    <div class="form-group">
                        <label for="photoInput">Foto Cerita <span class="required">*</span></label>
                        
                        <div class="photo-options">
                            <button type="button" id="btnUploadFile" class="btn-photo-option active">
                                📁 Upload File
                            </button>
                            <button type="button" id="btnOpenCamera" class="btn-photo-option">
                                📷 Buka Kamera
                            </button>
                        </div>

                        <input
                            type="file"
                            id="photoInput"
                            name="photo"
                            accept="image/*"
                            class="photo-input-file"
                        />
                        
                        <div id="cameraContainer" class="camera-container hidden">
                            <video id="cameraPreview" class="camera-preview" autoplay playsinline></video>
                            <div class="camera-controls">
                                <button type="button" id="btnCapture" class="btn-capture">📸 Ambil Foto</button>
                                <button type="button" id="btnCloseCamera" class="btn-close-camera">✕ Tutup Kamera</button>
                            </div>
                        </div>

                        <small class="form-hint">Format: JPG, PNG, JPEG (Max 1MB)</small>
                    </div>

                    <div id="imagePreview" class="image-preview hidden">
                        <img id="previewImg" src="" alt="Preview" />
                        <button type="button" id="btnRemoveImage" class="btn-remove-image">✕ Hapus Gambar</button>
                    </div>

                    <div class="form-group">
                        <label for="description">Deskripsi <span class="required">*</span></label>
                        <textarea
                            id="description"
                            name="description"
                            placeholder="Ceritakan sesuatu..."
                            required
                            rows="5"
                        ></textarea>
                        <small class="form-hint" id="charCount">0 karakter</small>
                    </div>

                    <div class="form-group">
                        <label>Lokasi (Opsional)</label>
                        
                        <div class="location-options">
                            <button type="button" id="btnNoLocation" class="btn-location-option active">
                                🚫 Tanpa Lokasi
                            </button>
                            <button type="button" id="btnCurrentLocation" class="btn-location-option">
                                📍 Lokasi Saat Ini
                            </button>
                            <button type="button" id="btnChooseLocation" class="btn-location-option">
                                🗺️ Pilih di Peta
                            </button>
                        </div>
                    </div>

                    <div id="locationInfo" class="location-info hidden">
                        <p class="location-status">📍 Lokasi dipilih</p>
                        <p class="location-coords" id="locationCoords"></p>
                    </div>

                    <div id="mapContainer" class="map-picker-container hidden">
                        <p class="map-instruction">Klik pada peta untuk memilih lokasi</p>
                        <div id="mapPicker" class="map-picker"></div>
                        <button type="button" id="btnConfirmLocation" class="btn-confirm-location">
                            ✓ Konfirmasi Lokasi
                        </button>
                    </div>

                    <div class="form-actions">
                        <button type="button" id="btnCancel" class="btn-cancel">Batal</button>
                        <button type="submit" id="btnSubmit" class="btn-submit">Posting Cerita</button>
                    </div>

                    ${!isLoggedIn ? '<p class="login-prompt">Ingin menyimpan cerita Anda? <a href="#/login">Login di sini</a></p>' : ''}
                </form>
            </section>
        `;
    }

    async afterRender() {
        const form = document.getElementById('addStoryForm');
        const photoInput = document.getElementById('photoInput');
        const description = document.getElementById('description');
        const imagePreview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');
        const btnRemoveImage = document.getElementById('btnRemoveImage');
        const btnCancel = document.getElementById('btnCancel');
        const charCount = document.getElementById('charCount');
        const locationInfo = document.getElementById('locationInfo');
        const locationCoords = document.getElementById('locationCoords');

        const btnUploadFile = document.getElementById('btnUploadFile');
        const btnOpenCamera = document.getElementById('btnOpenCamera');
        const cameraContainer = document.getElementById('cameraContainer');
        const btnCapture = document.getElementById('btnCapture');
        const btnCloseCamera = document.getElementById('btnCloseCamera');

        const btnNoLocation = document.getElementById('btnNoLocation');
        const btnCurrentLocation = document.getElementById('btnCurrentLocation');
        const btnChooseLocation = document.getElementById('btnChooseLocation');
        const mapContainer = document.getElementById('mapContainer');
        const btnConfirmLocation = document.getElementById('btnConfirmLocation');

        btnUploadFile.addEventListener('click', () => {
            this.#switchPhotoMode('upload', btnUploadFile, btnOpenCamera, cameraContainer, photoInput);
        });

        btnOpenCamera.addEventListener('click', async () => {
            await this.#switchPhotoMode('camera', btnUploadFile, btnOpenCamera, cameraContainer, photoInput);
        });

        btnCloseCamera.addEventListener('click', () => {
            this.#closeCamera();
            this.#switchPhotoMode('upload', btnUploadFile, btnOpenCamera, cameraContainer, photoInput);
        });

        btnCapture.addEventListener('click', () => {
            this.#capturePhoto(imagePreview, previewImg, cameraContainer, btnUploadFile, btnOpenCamera);
        });

        photoInput.addEventListener('change', (e) => {
            this.#handlePhotoSelect(e, imagePreview, previewImg);
        });

        btnRemoveImage.addEventListener('click', () => {
            this.#removeImage(photoInput, imagePreview, previewImg);
        });

        description.addEventListener('input', (e) => {
            charCount.textContent = `${e.target.value.length} karakter`;
        });

        btnNoLocation.addEventListener('click', () => {
            this.#switchLocationMode('none', btnNoLocation, btnCurrentLocation, btnChooseLocation, locationInfo, mapContainer);
        });

        btnCurrentLocation.addEventListener('click', async () => {
            this.#switchLocationMode('current', btnNoLocation, btnCurrentLocation, btnChooseLocation, locationInfo, mapContainer);
            await this.#getCurrentLocation(locationInfo, locationCoords);
        });

        btnChooseLocation.addEventListener('click', async () => {
            this.#switchLocationMode('map', btnNoLocation, btnCurrentLocation, btnChooseLocation, locationInfo, mapContainer);
            await this.#initializeMapPicker();
        });

        btnConfirmLocation.addEventListener('click', () => {
            this.#confirmMapLocation(locationInfo, locationCoords, mapContainer);
        });

        btnCancel.addEventListener('click', async () => {
            const confirmed = await showConfirm(
                'Batalkan Pembuatan Cerita?',
                'Data yang sudah diisi akan hilang. Apakah anda yakin?',
                'Ya, Batalkan',
                'Tidak'
            );
            if (confirmed) {
                this.#closeCamera();
                window.location.hash = '#/';
            }
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.#handleSubmit(photoInput, description);
        });

        description.focus();
    }

    #switchPhotoMode(mode, btnUploadFile, btnOpenCamera, cameraContainer, photoInput) {
        if (mode === 'upload') {
            btnUploadFile.classList.add('active');
            btnOpenCamera.classList.remove('active');
            cameraContainer.classList.add('hidden');
            photoInput.style.display = 'block';
            this.#closeCamera();
        } else {
            btnUploadFile.classList.remove('active');
            btnOpenCamera.classList.add('active');
            cameraContainer.classList.remove('hidden');
            photoInput.style.display = 'none';
            this.#openCamera();
        }
    }

    async #openCamera() {
        try {
            this.#videoElement = document.getElementById('cameraPreview');
            this.#stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false,
            });
            this.#videoElement.srcObject = this.#stream;
        } catch (error) {
            console.error('Error opening camera:', error);
            showError('Gagal Membuka Kamera', 'Pastikan Anda memberikan izin akses pada kamera.');
        }
    }

    #closeCamera() {
        if (this.#stream) {
            this.#stream.getTracks().forEach((track) => track.stop());
            this.#stream = null;
        }
        if (this.#videoElement) {
            this.#videoElement.srcObject = null;
        }
    }

    #capturePhoto(imagePreview, previewImg, cameraContainer, btnUploadFile, btnOpenCamera) {
        if (!this.#videoElement) return;

        const canvas = document.createElement('canvas');
        canvas.width = this.#videoElement.videoWidth;
        canvas.height = this.#videoElement.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.#videoElement, 0, 0);

        canvas.toBlob((blob) => {
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
            this.#selectedFile = file;

            previewImg.src = URL.createObjectURL(blob);
            imagePreview.classList.remove('hidden');

            this.#closeCamera();
            cameraContainer.classList.add('hidden');
            btnUploadFile.classList.add('active');
            btnOpenCamera.classList.remove('active');
        }, 'image/jpeg', 0.95);
    }

    #switchLocationMode(mode, btnNoLocation, btnCurrentLocation, btnChooseLocation, locationInfo, mapContainer) {
        btnNoLocation.classList.remove('active');
        btnCurrentLocation.classList.remove('active');
        btnChooseLocation.classList.remove('active');

        if (mode === 'none') {
            btnNoLocation.classList.add('active');
            locationInfo.classList.add('hidden');
            mapContainer.classList.add('hidden');
            this.#currentLat = null;
            this.#currentLon = null;
        } else if (mode === 'current') {
            btnCurrentLocation.classList.add('active');
            mapContainer.classList.add('hidden');
        } else if (mode === 'map') {
            btnChooseLocation.classList.add('active');
            locationInfo.classList.add('hidden');
        }
    }

    async #getCurrentLocation(locationInfo, locationCoords) {
        if (!navigator.geolocation) {
            showError('Geolocation Tidak Didukung', 'Browser Anda tidak mendukung geolocation.');
            return;
        }

        showLoading('Mengambil Lokasi...', 'Mohon tunggu sebentar');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.#currentLat = position.coords.latitude;
                this.#currentLon = position.coords.longitude;

                locationCoords.textContent = `Lat: ${this.#currentLat.toFixed(6)}, Lon: ${this.#currentLon.toFixed(6)}`;
                locationInfo.classList.remove('hidden');

                closeLoading();
                showSuccess('Lokasi Berhasil Diambil.', '', 1500);
            },
            (error) => {
                console.error('Geolocation error:', error);
                closeLoading();
                showError('Gagal Mengambil Lokasi', 'Pastikan Anda memberikan izin akses lokasi');
            }
        );
    }

    async #initializeMapPicker() {
        mapContainer.classList.remove('hidden');

        if (typeof L === 'undefined') {
            console.error('Leaflet library not loaded');
            showError('Error', 'Library peta tidak dapat dimuat.');
            return;
        }

        await new Promise((resolve) => setTimeout(resolve, 100));

        const mapElement = document.getElementById('mapPicker');
        if (!mapElement) return;

        const defaultLat = -2.2331;
        const defaultLon = 117.2841;

        if (this.#map) {
            this.#map.remove();
        }

        this.#map = L.map('mapPicker').setView([defaultLat, defaultLon], 5);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
        }).addTo(this.#map);

        if (this.#marker) {
            this.#marker.remove();
            this.#marker = null;
        }

        this.#map.on('click', (e) => {
            this.#currentLat = e.latlng.lat;
            this.#currentLon = e.latlng.lng;

            if (this.#marker) {
                this.#marker.setLatLng(e.latlng);
            } else {
                this.#marker = L.marker(e.latlng).addTo(this.#map);
            }

            this.#marker.bindPopup(`Lat: ${this.#currentLat.toFixed(6)}<br>Lon: ${this.#currentLon.toFixed(6)}`).openPopup();
        });

        setTimeout(() => {
            if (this.#map) {
                this.#map.invalidateSize();
            }
        }, 200);
    }

    #confirmMapLocation(locationInfo, locationCoords, mapContainer) {
        if (!this.#currentLat || !this.#currentLon) {
            showError('Lokasi Belum Ditentukan', 'Silahkan pilih lokasi terlebih dahulu atau gunakan tanpa lokasi.');
            return;
        }

        locationCoords.textContent = `Lat: ${this.#currentLat.toFixed(6)}, Lon: ${this.#currentLon.toFixed(6)}`;
        locationInfo.classList.remove('hidden');
        mapContainer.classList.add('hidden');

        showSuccess('Lokasi Dikonfirmasi!', '', 1500);
    }

    #handlePhotoSelect(event, imagePreview, previewImg) {
        const file = event.target.files[0];

        if (!file) return;

        if (!file.type.match('image.*')) {
            showError('File Tidak Valid', 'File harus berupa gambar');
            event.target.value = '';
            return;
        }

        if (file.size > 1024 * 1024) {
            showError('File Terlalu Besar', 'Ukuran file maksimal 1MB!');
            event.target.value = '';
            return;
        }

        this.#selectedFile = file;

        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            imagePreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    #removeImage(photoInput, imagePreview, previewImg) {
        photoInput.value = '';
        previewImg.src = '';
        imagePreview.classList.add('hidden');
        this.#selectedFile = null;
    }

    async #handleSubmit(photoInput, description) {
        if (!this.#selectedFile) {
            showError('Foto Harus Dipilih!', 'Silahkan pilih foto untuk cerita Anda.');
            return;
        }

        if (!description.value.trim()) {
            showError('Deskripsi Harus Diisi!', 'Silahkan isi deskripsi');
            description.focus();
            return;
        }

        const storyData = {
            photo: this.#selectedFile,
            description: description.value.trim(),
        };

        if (this.#currentLat && this.#currentLon) {
            storyData.lat = this.#currentLat;
            storyData.lon = this.#currentLon;
        }

        showLoading('Memposting Cerita...', 'Mohon tunggu sebentar');

        try {
            const token = localStorage.getItem('token');
            let response;

            if (token) {
                response = await API.addStory(token, storyData);
            } else {
                response = await API.addStoryGuest(storyData);
            }

            if (response.error === false) {
                closeLoading();
                this.#closeCamera();

                // Server akan mengirim push notification otomatis ke semua subscriber
                // Tidak perlu memanggil sendPushNotification() dari client
                console.log('Story posted successfully. Server will send push notification to all subscribers.');

                await showSuccess(
                    'Cerita Berhasil Diposting!',
                    'Cerita Anda telah ditambahkan. Push notification akan dikirim ke semua subscriber.',
                    2000
                );
                window.location.hash = '#/';
            } else {
                throw new Error(response.message || 'Gagal memposting cerita');
            }
        } catch (error) {
            console.error('Error posting story:', error);
            closeLoading();

            let errorMessage = 'Terjadi kesalahan saat memposting cerita. Silakan coba lagi.';

            if (error.message) {
                errorMessage = error.message;
            }

            showError('Gagal Memposting Cerita', errorMessage);
        }
    }
}