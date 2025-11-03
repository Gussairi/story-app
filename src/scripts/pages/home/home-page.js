import API from '../../data/api';
import { showFormattedDate } from '../../utils/helper';
import { closeLoading, showError, showLoading } from '../../utils/swal-helper';
import { saveToIndexedDB, getFromIndexedDB } from '../../utils/indexeddb-helper';

export default class HomePage {
    #currentPage = 1;
    #pageSize = 10;
    #totalPages = 1;
    #maxPageReached = 1;
    #sortOrder = 'newest';

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
                    
                    <div class="sort-selector">
                        <label for="sortSelect">Urutkan:</label>
                        <select id="sortSelect" class="sort-select">
                            <option value="newest" selected>Terbaru</option>
                            <option value="oldest">Terlama</option>
                        </select>
                    </div>
                    
                    <div class="page-info" id="pageInfo"></div>
                </div>

                <div id="storiesContainer" class="stories-container"></div>

                <div id="paginationContainer" class="pagination-container hidden">
                    <button id="btnFirst" class="pagination-btn" title="Halaman Pertama">
                        &lt;&lt; Pertama
                    </button>
                    <button id="btnPrev" class="pagination-btn" title="Halaman Sebelumnya">
                        &lt; Sebelumnya
                    </button>
                    
                    <div id="pageNumbers" class="page-numbers"></div>
                    
                    <button id="btnNext" class="pagination-btn" title="Halaman Berikutnya">
                        Berikutnya &gt;
                    </button>
                    <button id="btnLast" class="pagination-btn" title="Halaman Terakhir">
                        Terakhir &gt;&gt;
                    </button>
                </div>
            </section>
        `;
    }

    async afterRender() {
        const token = localStorage.getItem('token');

        if (!token) return;

        await this.#loadSortPreference();

        const pageSizeSelect = document.getElementById('pageSizeSelect');
        const sortSelect = document.getElementById('sortSelect');

        if (sortSelect) {
            sortSelect.value = this.#sortOrder;
        }

        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.#pageSize = parseInt(e.target.value);
                this.#currentPage = 1;
                this.#maxPageReached = 1;
                this.#totalPages = 1;
                this.#loadStories();
            });
        }

        if (sortSelect) {
            sortSelect.addEventListener('change', async (e) => {
                this.#sortOrder = e.target.value;
                
                await saveToIndexedDB('sortOrder', this.#sortOrder);
                
                this.#currentPage = 1;
                this.#maxPageReached = 1;
                this.#totalPages = 1;
                this.#loadStories();
            });
        }

        await this.#loadStories();
        this.#setupPaginationListeners();
    }

    async #loadSortPreference() {
        try {
            const savedSortOrder = await getFromIndexedDB('sortOrder');
            if (savedSortOrder) {
                this.#sortOrder = savedSortOrder;
                console.log('Loaded sort preference:', this.#sortOrder);
            }
        } catch (error) {
            console.error('Error loading sort preference:', error);
            this.#sortOrder = 'newest';
        }
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
                size: this.#pageSize,
            });

            if (response.error === false && response.listStory) {
                let stories = response.listStory;
                
                stories = this.#sortStories(stories);

                const storyCount = stories.length;

                if (this.#currentPage > this.#maxPageReached) {
                    this.#maxPageReached = this.#currentPage;
                }

                if (storyCount < this.#pageSize) {
                    this.#totalPages = this.#currentPage;
                } else {
                    this.#totalPages = Math.max(
                        this.#totalPages,
                        this.#currentPage + 1
                    );
                }

                if (stories.length === 0) {
                    if (this.#currentPage === 1) {
                        closeLoading();
                        storiesContainer.innerHTML =
                            '<p class="no-stories">Belum ada cerita yang tersedia.</p>';
                        this.#updatePageInfo(0, 0, 0);
                    } else {
                        this.#currentPage--;
                        await this.#loadStories();
                    }
                    return;
                }

                closeLoading();

                const startIndex = (this.#currentPage - 1) * this.#pageSize + 1;
                const endIndex = startIndex + stories.length - 1;

                storiesContainer.innerHTML = stories
                    .map(
                        (story) => `
                            <article class="story-card" role="listitem" tabindex="0" data-id="${story.id}" aria-label="Story: ${this.#escapeHtml(story.name)}" >
                                <div class="story-image-wrapper">
                                    <img src="${story.photoUrl}" alt="${this.#escapeHtml(story.name)}" class="story-image" loading="lazy" />
                                </div>
                                <div class="story-content">
                                    <h2 class="story-name">${this.#escapeHtml(story.name)}</h2>
                                    <p class="story-description">${this.#escapeHtml(this.#truncateText(story.description, 100))}</p>
                                    <p class="story-date">
                                        <time datetime="${story.createdAt}">
                                            ${showFormattedDate(story.createdAt, 'id-ID')}
                                        </time>
                                    </p>
                                </div>
                            </article>
                        `
                    )
                    .join('');

                this.#setupStoryCardListeners();

                this.#updatePageInfo(startIndex, endIndex, storyCount);
                this.#updatePagination();

                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                throw new Error('Gagal memuat cerita');
            }
        } catch (error) {
            console.error('Error loading stories:', error);
            closeLoading();
            storiesContainer.innerHTML = `
                <div class="error-message">
                    <p>Gagal memuat cerita. Silakan coba lagi.</p>
                    <button onclick="location.reload()">Muat Ulang</button>
                </div>
            `;
        }
    }

    #sortStories(stories) {
        return stories.sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            
            if (this.#sortOrder === 'newest') {
                return dateB - dateA;
            } else {
                return dateA - dateB;
            }
        });
    }

    #setupStoryCardListeners() {
        const storyCards = document.querySelectorAll('.story-card');
        
        storyCards.forEach(card => {
            card.addEventListener('click', () => {
                this.#navigateToStory(card.dataset.id);
            });

            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.#navigateToStory(card.dataset.id);
                }
            });

            card.addEventListener('focus', () => {
                card.classList.add('focused');
            });

            card.addEventListener('blur', () => {
                card.classList.remove('focused');
            });
        });
    }

    #navigateToStory(storyId) {
        window.location.hash = `#/story/${storyId}`;
    }

    #escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    #updatePageInfo(startIndex, endIndex, totalOnPage) {
        const pageInfo = document.getElementById('pageInfo');
        if (!pageInfo) return;

        const sortText = this.#sortOrder === 'newest' ? 'Terbaru' : 'Terlama';

        if (totalOnPage === 0) {
            pageInfo.innerHTML =
                '<span class="page-info-text">Tidak ada cerita</span>';
        } else {
            pageInfo.innerHTML = `
                <span class="page-info-text">
                Menampilkan ${startIndex}-${endIndex} cerita
                <span class="page-separator">•</span>
                Halaman ${this.#currentPage}
                <span class="page-separator">•</span>
                <span class="sort-info">${sortText}</span>
                </span>
            `;
        }
    }

    #updatePagination() {
        const paginationContainer = document.getElementById(
            'paginationContainer'
        );
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

        btnFirst.setAttribute('aria-label', `Go to first page`);
        btnPrev.setAttribute('aria-label', `Go to previous page, page ${this.#currentPage - 1}`);
        btnNext.setAttribute('aria-label', `Go to next page, page ${this.#currentPage + 1}`);
        btnLast.setAttribute('aria-label', `Go to last page, page ${this.#totalPages}`);

        const pageNumbersHTML = this.#generatePageNumbers();
        pageNumbers.innerHTML = pageNumbersHTML;

        pageNumbers.querySelectorAll('.page-number-btn').forEach((btn) => {
            const pageNum = parseInt(btn.dataset.page);
            btn.setAttribute('aria-label', `Go to page ${pageNum}`);
            btn.setAttribute('aria-current', pageNum === this.#currentPage ? 'page' : 'false');
            
            btn.addEventListener('click', (e) => {
                this.#goToPage(pageNum);
            });
        });
    }

    #generatePageNumbers() {
        const pages = [];
        const maxVisible = 3;

        let startPage = Math.max(
            1,
            this.#currentPage - Math.floor(maxVisible / 2)
        );
        let endPage = Math.min(this.#totalPages, startPage + maxVisible - 1);

        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        if (startPage > 1) {
            pages.push(
                `<button class="page-number-btn" data-page="1">1</button>`
            );
            if (startPage > 2) {
                pages.push(`<span class="page-ellipsis" aria-hidden="true">...</span>`);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === this.#currentPage ? 'active' : '';
            pages.push(
                `<button class="page-number-btn ${isActive}" data-page="${i}">${i}</button>`
            );
        }

        if (endPage < this.#totalPages) {
            if (endPage < this.#totalPages - 1) {
                pages.push(`<span class="page-ellipsis" aria-hidden="true">...</span>`);
            }
            pages.push(
                `<button class="page-number-btn" data-page="${this.#totalPages}">${this.#totalPages}</button>`
            );
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

        showLoading(
            'Mencari Halaman Terakhir...',
            'Mohon tunggu, sedang mencari halaman terakhir'
        );

        try {
            let testPage = Math.max(this.#maxPageReached, this.#currentPage);
            let step = 10;
            let lastValidPage = testPage;

            while (true) {
                const response = await API.getStories(token, {
                    page: testPage,
                    size: this.#pageSize,
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
                    size: this.#pageSize,
                });

                if (
                    response.error === false &&
                    response.listStory &&
                    response.listStory.length > 0
                ) {
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

            await showError(
                'Gagal Mencari Halaman Terakhir',
                'Terjadi kesalahan. Silahkan coba lagi.'
            );
        }
    }

    #truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
}