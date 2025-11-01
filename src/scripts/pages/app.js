import routes from '../routes/routes';
import { getActiveRoute, parseActivePathname } from '../routes/url-parser';
import { showConfirm, showSuccess, showError } from '../utils/swal-helper';
import { transitionHelper, transitionWithName, transitionWithDirection } from '../utils/transition-helper';
import { 
    checkSubscriptionStatus, 
    subscribeToPushNotification, 
    unsubscribeFromPushNotification 
} from '../utils/index';

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;
  #previousRoute = '/';
  #navigationHistory = [];
  #notificationToggle = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;

    this.#setupDrawer();
    this.#updateNavigation();
    this.#setupKeyboardNavigation();
  }

  #setupDrawer() {
    this.#drawerButton.addEventListener('click', () => {
      const isOpen = this.#navigationDrawer.classList.toggle('open');
      this.#drawerButton.setAttribute('aria-expanded', isOpen);
    });

    document.body.addEventListener('click', (event) => {
      if (
        !this.#navigationDrawer.contains(event.target) &&
        !this.#drawerButton.contains(event.target)
      ) {
        this.#navigationDrawer.classList.remove('open');
        this.#drawerButton.setAttribute('aria-expanded', 'false');
      }

      this.#navigationDrawer.querySelectorAll('a').forEach((link) => {
        if (link.contains(event.target)) {
          this.#navigationDrawer.classList.remove('open');
          this.#drawerButton.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  #setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.#navigationDrawer.classList.contains('open')) {
        this.#navigationDrawer.classList.remove('open');
        this.#drawerButton.setAttribute('aria-expanded', 'false');
        this.#drawerButton.focus();
      }
    });

    this.#navigationDrawer.addEventListener('keydown', (e) => {
      if (!this.#navigationDrawer.classList.contains('open')) return;

      if (e.key === 'Tab') {
        const focusableElements = this.#navigationDrawer.querySelectorAll(
          'a[href], button:not([disabled])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    });
  }

  async #updateNavigation() {
    const token = localStorage.getItem('token');
    const navList = document.getElementById('nav-list');
    
    if (!navList) return;

    if (token) {
      // Cek status subscription
      const subscriptionStatus = await checkSubscriptionStatus();
      const isSubscribed = subscriptionStatus.subscribed;
      const notificationIcon = isSubscribed ? '🔔' : '🔕';
      const notificationText = isSubscribed ? 'Matikan Notifikasi' : 'Aktifkan Notifikasi';

      navList.innerHTML = `
        <li><a href="#/">Beranda</a></li>
        <li><a href="#/add-story">Tambah Cerita</a></li>
        <li>
          <button 
            type="button" 
            id="nav-notification-toggle" 
            class="nav-button"
            title="${notificationText}"
            aria-label="${notificationText}"
          >
            <span class="notification-icon">${notificationIcon}</span>
            <span class="notification-text">${notificationText}</span>
          </button>
        </li>
        <li><a href="javascript:void(0)" id="nav-logout">Logout</a></li>
      `;

      const logoutLink = document.getElementById('nav-logout');
      if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
          e.preventDefault();
          this.#handleLogout();
        });
      }

      const notificationToggle = document.getElementById('nav-notification-toggle');
      if (notificationToggle) {
        notificationToggle.addEventListener('click', async (e) => {
          e.preventDefault();
          await this.#handleNotificationToggle();
        });
      }
    } else {
      navList.innerHTML = `
        <li><a href="#/">Beranda</a></li>
        <li><a href="#/add-story">Tambah Cerita</a></li>
        <li><a href="#/login">Login</a></li>
        <li><a href="#/register">Register</a></li>
      `;
    }
  }

  async #handleNotificationToggle() {
    const subscriptionStatus = await checkSubscriptionStatus();

    if (!subscriptionStatus.supported) {
      showError(
        'Tidak Didukung',
        'Browser Anda tidak mendukung push notification.'
      );
      return;
    }

    if (subscriptionStatus.subscribed) {
      // Unsubscribe
      const confirmed = await showConfirm(
        'Matikan Notifikasi?',
        'Anda tidak akan menerima notifikasi push lagi.',
        'Ya, Matikan',
        'Batal'
      );

      if (confirmed) {
        const result = await unsubscribeFromPushNotification();
        
        if (result.success) {
          await showSuccess(
            'Notifikasi Dimatikan',
            'Anda tidak akan menerima notifikasi push.',
            1500
          );
          await this.#updateNavigation();
        } else {
          showError(
            'Gagal Matikan Notifikasi',
            result.error || 'Terjadi kesalahan.'
          );
        }
      }
    } else {
      // Subscribe
      const confirmed = await showConfirm(
        'Aktifkan Notifikasi?',
        'Anda akan menerima notifikasi tentang cerita baru dan update.',
        'Ya, Aktifkan',
        'Batal'
      );

      if (confirmed) {
        const result = await subscribeToPushNotification();
        
        if (result.success) {
          await showSuccess(
            'Notifikasi Diaktifkan!',
            'Anda akan menerima notifikasi push.',
            1500
          );
          await this.#updateNavigation();
        } else {
          showError(
            'Gagal Aktifkan Notifikasi',
            result.error || 'Terjadi kesalahan. Pastikan Anda memberikan izin notifikasi.'
          );
        }
      }
    }

    // Tutup drawer setelah aksi
    this.#navigationDrawer.classList.remove('open');
    this.#drawerButton.setAttribute('aria-expanded', 'false');
  }

  async #handleLogout() {
    const isConfirmed = await showConfirm(
      'Konfirmasi Logout',
      'Apakah Anda yakin ingin logout?',
      'Ya, Logout',
      'Batal'
    );

    if (isConfirmed) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      
      this.#navigationDrawer.classList.remove('open');
      this.#drawerButton.setAttribute('aria-expanded', 'false');

      showSuccess(
        'Logout Berhasil',
        'Anda telah keluar dari aplikasi',
        1500,
      );
    
      await transitionHelper(async () => {
        window.location.reload();
      });
    }
  }

  #getTransitionType(currentRoute, previousRoute) {
    if (currentRoute.includes('/story/')) {
      return 'detail';
    }
    
    if (
        (currentRoute === '/login' || currentRoute === '/register') &&
        previousRoute !== '/login' &&
        previousRoute !== '/register'
    ) {
      return 'auth';
    }
    
    if (currentRoute === '/add-story') {
      return 'form';
    }
    
    return 'slide';
  }

  #getTransitionDirection(currentRoute, previousRoute) {
    const routeDepth = {
      '/': 0,
      '/login': 1,
      '/register': 1,
      '/add-story': 1,
      '/story/:id': 2
    };

    const currentDepth = routeDepth[currentRoute] ?? 1;
    const previousDepth = routeDepth[previousRoute] ?? 0;

    if (currentRoute === '/') {
      return 'backward';
    }

    if (previousRoute.includes('/story/') && currentRoute === '/') {
      return 'backward';
    }

    return currentDepth > previousDepth ? 'forward' : 'backward';
  }

  async renderPage() {
    const currentRoute = getActiveRoute();
    const page = routes[currentRoute];

    if (!page) {
      console.error('Page not found for route:', currentRoute);
      
      await transitionHelper(async () => {
        window.location.hash = '#/';
      });
      return;
    }

    this.#navigationHistory.push(currentRoute);
    if (this.#navigationHistory.length > 10) {
      this.#navigationHistory.shift();
    }

    const transitionType = this.#getTransitionType(currentRoute, this.#previousRoute);

    await this.#updateNavigation();

    if (transitionType === 'slide') {
      const direction = this.#getTransitionDirection(currentRoute, this.#previousRoute);
      
      await transitionWithDirection(async () => {
        this.#content.innerHTML = await page.render();
        await page.afterRender();
        
        this.#focusMainContent();
      }, direction);
    } else {
      await transitionWithName(async () => {
        this.#content.innerHTML = await page.render();
        await page.afterRender();
        
        this.#focusMainContent();
      }, transitionType);
    }

    this.#previousRoute = currentRoute;
  }

  #focusMainContent() {
    setTimeout(() => {
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.focus();
        
        const pageTitle = document.querySelector('h1');
        if (pageTitle) {
          const announcement = document.createElement('div');
          announcement.setAttribute('role', 'status');
          announcement.setAttribute('aria-live', 'polite');
          announcement.className = 'sr-only';
          announcement.textContent = `Navigated to ${pageTitle.textContent}`;
          document.body.appendChild(announcement);
          
          setTimeout(() => announcement.remove(), 1000);
        }
      }
    }, 100);
  }
}

export default App;