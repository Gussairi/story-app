import routes from '../routes/routes';
import { getActiveRoute } from '../routes/url-parser';
import { showConfirm, showSuccess } from '../utils/swal-helper';

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;

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
      
      window.location.reload();
    }
  }

  async renderPage() {
    const url = getActiveRoute();
    const page = routes[url];

    if (!page) {
      console.error('Page not found for route:', url);
      window.location.hash = '#/';
      return;
    }

    this.#updateNavigation();

    this.#content.innerHTML = await page.render();
    await page.afterRender();
  }
}

export default App;