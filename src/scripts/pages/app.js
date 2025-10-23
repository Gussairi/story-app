import routes from '../routes/routes';
import { getActiveRoute, parseActivePathname } from '../routes/url-parser';
import { showConfirm, showSuccess } from '../utils/swal-helper';
import { transitionHelper, transitionWithName, transitionWithDirection } from '../utils/transition-helper';

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;
  #previousRoute = '/';
  #navigationHistory = [];

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;

    this.#setupDrawer();
    this.#updateNavigation();
  }

  #setupDrawer() {
    this.#drawerButton.addEventListener('click', () => {
      this.#navigationDrawer.classList.toggle('open');
    });

    document.body.addEventListener('click', (event) => {
      if (
        !this.#navigationDrawer.contains(event.target) &&
        !this.#drawerButton.contains(event.target)
      ) {
        this.#navigationDrawer.classList.remove('open');
      }

      this.#navigationDrawer.querySelectorAll('a').forEach((link) => {
        if (link.contains(event.target)) {
          this.#navigationDrawer.classList.remove('open');
        }
      });
    });
  }

  #updateNavigation() {
    const token = localStorage.getItem('token');
    const navList = document.getElementById('nav-list');
    
    if (!navList) return;

    if (token) {
      navList.innerHTML = `
        <li><a href="#/">Beranda</a></li>
        <li><a href="#/add-story">Tambah Cerita</a></li>
        <li><a href="javascript:void(0)" id="nav-logout">Logout</a></li>
      `;

      const logoutLink = document.getElementById('nav-logout');
      if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
          e.preventDefault();
          this.#handleLogout();
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

  async #handleLogout() {
    const isConfirmed = await showConfirm(
      'Konfirmasi Logout',
      'Apakah Anda yakin ingin logout?',
      'Ya, Logout',
      'Batal'
    )

    if (isConfirmed) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      
      this.#navigationDrawer.classList.remove('open');

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
    
    if ((currentRoute === '/login' || currentRoute === '/register') && previousRoute !== '/login' && previousRoute !== '/register') {
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

    this.#updateNavigation();

    if (transitionType === 'slide') {
      const direction = this.#getTransitionDirection(currentRoute, this.#previousRoute);
      
      await transitionWithDirection(async () => {
        this.#content.innerHTML = await page.render();
        await page.afterRender();
      }, direction);
    } else {
      await transitionWithName(async () => {
        this.#content.innerHTML = await page.render();
        await page.afterRender();
      }, transitionType);
    }

    this.#previousRoute = currentRoute;
  }
}

export default App;