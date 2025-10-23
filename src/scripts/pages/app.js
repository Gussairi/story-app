import routes from '../routes/routes';
import { getActiveRoute } from '../routes/url-parser';

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
      // User logged in - show logout button
      navList.innerHTML = `
        <li><a href="#/">Beranda</a></li>
        <li><a href="#/add-story">Tambah Cerita</a></li>
        <li><a href="#/about">About</a></li>
        <li><a href="javascript:void(0)" id="nav-logout">Logout</a></li>
      `;

      // Add logout handler
      const logoutLink = document.getElementById('nav-logout');
      if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
          e.preventDefault();
          this.#handleLogout();
        });
      }
    } else {
      // User not logged in - show login and register
      navList.innerHTML = `
        <li><a href="#/">Beranda</a></li>
        <li><a href="#/add-story">Tambah Cerita</a></li>
        <li><a href="#/about">About</a></li>
        <li><a href="#/login">Login</a></li>
        <li><a href="#/register">Register</a></li>
      `;
    }
  }

  #handleLogout() {
    if (confirm('Apakah Anda yakin ingin logout?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      
      // Close drawer if open
      this.#navigationDrawer.classList.remove('open');
      
      // Redirect to home
      window.location.hash = '#/';
    }
  }

  async renderPage() {
    const url = getActiveRoute();
    const page = routes[url];

    // Check if page exists
    if (!page) {
      console.error('Page not found for route:', url);
      window.location.hash = '#/';
      return;
    }

    // Update navigation before rendering page
    this.#updateNavigation();

    this.#content.innerHTML = await page.render();
    await page.afterRender();
  }
}

export default App;