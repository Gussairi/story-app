import Swal from "sweetalert2";
import API from "../../data/api";
import { showFormattedDate } from "../../utils/helper";
import { closeLoading, showError, showLoading, showLoadingWithProgress } from "../../utils/swal-helper";

export default class HomePage {
    #currentPage = 1;
    #pageSize = 10;
    #totalPages = 1;
    #maxPageReached = 1;

    async render() {
        const token = localStorage.getItem('token');
        
        if (!token) {
        return `
            <section class="container">
                <div class="welcome-section">
                    <h1>Selamat Datang di Story App</h1>
                    <p>Silakan <a href="#/login">login</a> atau <a href="#/register">daftar</a> untuk melihat cerita-cerita menarik.</p>
                </div>
            </section>
        `;
        }

        const userName = localStorage.getItem('userName') || 'Pengguna';

        return `
            <section class="container">
                <div class="home-header">
                    <div>
                        <h1>Daftar Cerita</h1>
                        <p class="welcome-text">Halo, ${userName}!</p>
                    </div>
                    <div class="header-actions">
                        <a href="#/add-story" class="btn-add-story">+ Tambah Cerita</a>
                    </div>
                </div>

                <div class="page-controls">
                <div class="page-size-selector">
                    <label for="pageSizeSelect">Tampilkan:</label>
                    <select id="pageSizeSelect" class="page-size-select">
                        <option value="5">5 cerita</option>
                        <option value="10" selected>10 cerita</option>
                        <option value="20">20 cerita</option>
                        <option value="30">30 cerita</option>
                    </select>
                </div>
                <div class="page-info" id="pageInfo">
                    <span class="loading-text">Memuat...</span>
                </div>
                </div>

                <div id="storiesContainer" class="stories-container">
                    <div class="loading">Memuat cerita...</div>
                </div>

                <div id="paginationContainer" class="pagination-container hidden">
                    <button id="btnFirst" class="pagination-btn" title="Halaman Pertama">
                        ⮜ Pertama
                    </button>
                    <button id="btnPrev" class="pagination-btn" title="Halaman Sebelumnya">
                        ← Sebelumnya
                    </button>
                    
                    <div id="pageNumbers" class="page-numbers"></div>
                    
                    <button id="btnNext" class="pagination-btn" title="Halaman Berikutnya">
                        Berikutnya →
                    </button>
                    <button id="btnLast" class="pagination-btn" title="Halaman Terakhir">
                        Terakhir ⮞
                    </button>
                </div>
            </section>
        `;
    }

    async afterRender() {
        const token = localStorage.getItem('token');
        
        if (!token) return;

        const pageSizeSelect = document.getElementById('pageSizeSelect');

        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.#pageSize = parseInt(e.target.value);
                this.#currentPage = 1;
                this.#maxPageReached = 1;
                this.#totalPages = 1;
                this.#loadStories();
            });
        }

        await this.#loadStories();
        this.#setupPaginationListeners();
    }

    async #loadStories() {
        const token = localStorage.getItem('token');
        const storiesContainer = document.getElementById('storiesContainer');
        const pageInfo = document.getElementById('pageInfo');

        if (!storiesContainer) return;

        showLoading();

        try {
            const response = await API.getStories(token, { 
                page: this.#currentPage, 
                size: this.#pageSize 
            });

            if (response.error === false && response.listStory) {
                const storyCount = response.listStory.length;

                if (this.#currentPage > this.#maxPageReached) {
                    this.#maxPageReached = this.#currentPage;
                }
                
                if (storyCount < this.#pageSize) {
                    this.#totalPages = this.#currentPage;
                } else {
                    this.#totalPages = Math.max(this.#totalPages, this.#currentPage + 1);
                }

                if (response.listStory.length === 0) {
                    if (this.#currentPage === 1) {
                        closeLoading();
                        storiesContainer.innerHTML = '<p class="no-stories">Belum ada cerita yang tersedia.</p>';
                        this.#updatePageInfo(0, 0, 0);
                    } else {
                        this.#currentPage--;
                        await this.#loadStories();
                    }
                    return;
                }

                closeLoading();

                const startIndex = (this.#currentPage - 1) * this.#pageSize + 1;
                const endIndex = startIndex + response.listStory.length - 1;

                storiesContainer.innerHTML = response.listStory.map(story => `
                    <article class="story-card" data-id="${story.id}">
                        <div class="story-image-wrapper">
                            <img src="${story.photoUrl}" alt="${story.name}" class="story-image" loading="lazy" />
                        </div>
                        <div class="story-content">
                            <h3 class="story-name">${story.name}</h3>
                            <p class="story-description">${this.#truncateText(story.description, 100)}</p>
                            <p class="story-date">${showFormattedDate(story.createdAt, 'id-ID')}</p>
                        </div>
                    </article>
                `).join('');

                document.querySelectorAll('.story-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const storyId = card.dataset.id;
                        window.location.hash = `#/story/${storyId}`;
                    });
                });

                this.#updatePageInfo(startIndex, endIndex, storyCount);
                this.#updatePagination();

                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                throw new Error('Gagal memuat cerita');
            }
        } catch (error) {
            console.error('Error loading stories:', error);
            storiesContainer.innerHTML = `
                <div class="error-message">
                    <p>Gagal memuat cerita. Silakan coba lagi.</p>
                    <button onclick="location.reload()">Muat Ulang</button>
                </div>
            `;
        }
    }

    #updatePageInfo(startIndex, endIndex, totalOnPage) {
        const pageInfo = document.getElementById('pageInfo');
        if (!pageInfo) return;

        if (totalOnPage === 0) {
            pageInfo.innerHTML = '<span class="page-info-text">Tidak ada cerita</span>';
        } else {
            pageInfo.innerHTML = `
                <span class="page-info-text">
                Menampilkan ${startIndex}-${endIndex} cerita
                <span class="page-separator">•</span>
                Halaman ${this.#currentPage}
                </span>
            `;
        }
    }

    #updatePagination() {
        const paginationContainer = document.getElementById('paginationContainer');
        const btnFirst = document.getElementById('btnFirst');
        const btnPrev = document.getElementById('btnPrev');
        const btnNext = document.getElementById('btnNext');
        const btnLast = document.getElementById('btnLast');
        const pageNumbers = document.getElementById('pageNumbers');

        if (!paginationContainer) return;

        paginationContainer.classList.remove('hidden');

        const isLastPage = this.#currentPage === this.#totalPages;

        btnFirst.disabled = this.#currentPage === 1;
        btnPrev.disabled = this.#currentPage === 1;
        btnNext.disabled = isLastPage;
        btnLast.disabled = isLastPage;

        const pageNumbersHTML = this.#generatePageNumbers();
        pageNumbers.innerHTML = pageNumbersHTML;

        pageNumbers.querySelectorAll('.page-number-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = parseInt(e.target.dataset.page);
                this.#goToPage(page);
            });
        });
    }

    #generatePageNumbers() {
        const pages = [];
        const maxVisible = 3;

        let startPage = Math.max(1, this.#currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(this.#totalPages, startPage + maxVisible - 1);

        if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
        }

        if (startPage > 1) {
            pages.push(`<button class="page-number-btn" data-page="1">1</button>`);
            if (startPage > 2) {
                pages.push(`<span class="page-ellipsis">...</span>`);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === this.#currentPage ? 'active' : '';
            pages.push(`<button class="page-number-btn ${isActive}" data-page="${i}">${i}</button>`);
        }

        if (endPage < this.#totalPages) {
            if (endPage < this.#totalPages - 1) {
                pages.push(`<span class="page-ellipsis">...</span>`);
            }
            pages.push(`<button class="page-number-btn" data-page="${this.#totalPages}">${this.#totalPages}</button>`);
        }

        return pages.join('');
    }

    #setupPaginationListeners() {
        const btnFirst = document.getElementById('btnFirst');
        const btnPrev = document.getElementById('btnPrev');
        const btnNext = document.getElementById('btnNext');
        const btnLast = document.getElementById('btnLast');

        if (btnFirst) {
            btnFirst.addEventListener('click', () => this.#goToPage(1));
        }

        if (btnPrev) {
            btnPrev.addEventListener('click', () => {
                if (this.#currentPage > 1) {
                this.#goToPage(this.#currentPage - 1);
                }
            });
        }

        if (btnNext) {
            btnNext.addEventListener('click', () => {
                if (this.#currentPage < this.#totalPages) {
                this.#goToPage(this.#currentPage + 1);
                }
            });
        }

        if (btnLast) {
            btnLast.addEventListener('click', async () => {
                await this.#findAndGoToLastPage();
            });
        }
    }

    #goToPage(page) {
        if (page < 1 || page === this.#currentPage) {
            return;
        }

        this.#currentPage = page;
        this.#loadStories();
    }

    async #findAndGoToLastPage() {
        const token = localStorage.getItem('token');
        if (!token) return;

        showLoading('Mencari Halaman Terakhir...', 'Mohon tunggu, sedang mencari halaman terakhir');

        try {
            let testPage = Math.max(this.#maxPageReached, this.#currentPage);
            let step = 10;
            let lastValidPage = testPage;

            while (true) {
                const response = await API.getStories(token, { 
                    page: testPage, 
                    size: this.#pageSize 
                });

                if (response.error === false && response.listStory) {
                    if (response.listStory.length === 0) {
                        break;
                    } else {
                        lastValidPage = testPage;
                        
                        if (response.listStory.length < this.#pageSize) {
                            this.#totalPages = testPage;
                            this.#maxPageReached = testPage;
                            closeLoading();
                            this.#goToPage(testPage);
                            return;
                        }
                        
                        testPage += step;
                    }
                } else {
                    break;
                }
            }

            let low = lastValidPage;
            let high = testPage;

            while (low < high) {
                const mid = Math.floor((low + high + 1) / 2);
                
                const response = await API.getStories(token, { 
                    page: mid, 
                    size: this.#pageSize 
                });

                if (response.error === false && response.listStory && response.listStory.length > 0) {
                    lastValidPage = mid;
                    
                    if (response.listStory.length < this.#pageSize) {
                        break;
                    }
                    
                    low = mid;
                } else {
                    high = mid - 1;
                }
            }

            this.#totalPages = lastValidPage;
            this.#maxPageReached = lastValidPage;
            closeLoading();
            this.#goToPage(lastValidPage);

        } catch (error) {
            console.error('Error finding last page:', error);
            closeLoading();

            await showError('Gagal Mencari Halaman Terakhir', 'Terjadi kesalahan. Silahkan coba lagi.');
        }
    }

    #truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
}