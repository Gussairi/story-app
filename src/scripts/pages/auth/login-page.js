import API  from "../../data/api"
import { showFormStatus, setButtonLoading } from "../../utils/helper"

export default class LoginPage {
    async render() {
        return `
            <section class="container">
                <form id="loginForm">
                    <h2>Login</h2>
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            autocomplete="on"
                            placeholder="Masukan email"
                            required
                        />
                    </div>
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            placeholder="Masukan password"
                            required
                        />
                    </div>
                    <div role="status" aria-live="polite" id="formStatus" class="sr-only"></div>
                    <button type="submit" id="btnLogin">Login</button>
                    <p class="text-center">
                        Belum punya akun? <a href="#/register">Daftar di sini</a>
                    </p>
                </form>
            </section>
        `;
    }

    async afterRender() {
        const form = document.getElementById('loginForm');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const formStatus = document.getElementById('formStatus');
        const btn = document.getElementById('btnLogin');

        emailInput.focus();

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!emailInput.value.trim() || !passwordInput.value.trim()) {
                showFormStatus(formStatus, 'Email dan password harus diisi.', 'error')
                return;
            }

            setButtonLoading(btn, true);
            showFormStatus(formStatus, 'Sedang login...', 'info');

            try {
                const response = await API.login({
                    email: emailInput.value.trim(),
                    password: passwordInput.value.trim()
                });

                if (response.error === false && response.loginResult) {
                    localStorage.setItem('token', response.loginResult.token);
                    localStorage.setItem('userId', response.loginResult.userId);
                    localStorage.setItem('userName', response.loginResult.name);

                    showFormStatus(formStatus, 'Login berhasil! Mengalihkan...', 'success');

                    setTimeout(() => {
                        window.location.hash = '/';
                    }, 1000);
                }
            } catch (error) {
                console.error('Login error:', error);

                let errorMessage = 'Terjadi kesalahan saat login. Silakan coba lagi.';
                
                const errorString = error.message.toLowerCase();
                
                if (errorString.includes('unauthorized') || 
                    errorString.includes('invalid') || 
                    errorString.includes('wrong') ||
                    errorString.includes('incorrect')) {
                    errorMessage = 'Email atau password salah. Silakan coba lagi.';
                } else if (errorString.includes('not found') || 
                    errorString.includes('user not found')) {
                    errorMessage = 'Akun tidak ditemukan. Silakan daftar terlebih dahulu.';
                } else if (errorString.includes('email')) {
                    errorMessage = 'Email tidak valid.';
                } else if (errorString.includes('password')) {
                    errorMessage = 'Password salah.';
                } else if (error.message) {
                    errorMessage = error.message;
                }

                showFormStatus(formStatus, errorMessage, 'error');
                setButtonLoading(btn, false);
                emailInput.focus();
                emailInput.select();
            }
        });

        emailInput.addEventListener('blur', () => {
            if (emailInput.value && !isValidEmail(emailInput.value.trim())) { //isValidEmail not defined
                showFormStatus(formStatus, 'Format email tidak valid.', 'error');
            }
        });
    }
}
