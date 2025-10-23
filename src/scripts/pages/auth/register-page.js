import API from "../../data/api";
import { isValidEmail, isValidPassword } from "../../utils/helper";
import { showLoading, closeLoading, showSuccess, showError } from "../../utils/swal-helper";

export default class RegisterPage {
    async render() {
        return `
            <section class="container">
                <form id="registerForm">
                    <h2>Daftar Akun</h2>
                    <div class="form-group">
                        <label for="name">Nama</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            placeholder="Masukan nama lengkap"
                            required
                        />
                    </div>
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
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
                            placeholder="Minimal 8 karakter"
                            required
                            minlength="8"
                        />
                        <small class="form-hint">Password harus minimal 8 karakter</small>
                    </div>
                    <div class="form-group">
                        <label for="confirmPassword">Konfirmasi Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            placeholder="Masukan password kembali"
                            required
                            minlength="8"
                        />
                    </div>
                    <button type="submit" id="btnRegister">Daftar</button>
                    <p class="text-center">
                        Sudah punya akun? <a href="#/login">Login di sini</a>
                    </p>
                </form>
            </section>
        `;
    }

    async afterRender() {
        const form = document.getElementById('registerForm');
        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        nameInput.focus();

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!nameInput.value.trim()) {
                showError('Validasi Gagal', 'Nama lengkap harus diisi.');
                nameInput.focus();
                return;
            }

            if (!emailInput.value.trim()) {
                showError('Validasi Gagal', 'Email harus diisi.');
                emailInput.focus();
                return;
            }

            if (!passwordInput.value.trim()) {
                showError('Validasi Gagal', 'Password harus diisi.');
                passwordInput.focus();
                return;
            }

            if (!confirmPasswordInput.value.trim()) {
                showError('Validasi Gagal', 'Konfirmasi password harus diisi.');
                confirmPasswordInput.focus();
                return;
            }

            if (!isValidEmail(emailInput.value.trim())) {
                showError('Email Tidak Valid', 'Format email tidak valid.');
                emailInput.focus();
                return;
            }

            if (!isValidPassword(passwordInput.value)) {
                showError('Password Tidak Valid', 'Password harus minimal 8 karakter.');
                passwordInput.focus();
                return;
            }

            if (passwordInput.value !== confirmPasswordInput.value) {
                showError('Password Tidak Sama', 'Password dan konfirmasi password tidak sama.');
                confirmPasswordInput.focus();
                return;
            }

            showLoading('Sedang Mendaftar...', 'Mohon tunggu sebentar');

            try {
                const response = await API.register({
                    name: nameInput.value.trim(),
                    email: emailInput.value.trim(),
                    password: passwordInput.value.trim()
                });

                if (response.error === false) {
                    closeLoading();

                    await showSuccess(
                        'Register Berhasil',
                        'Akun Anda telah dibuat. Silahkan login.',
                        2000
                    )

                    form.reset();

                    setTimeout(() => {
                        window.location.hash = '#/login';
                    }, 2000);
                } else {
                    throw new Error(response.message || 'Registrasi gagal');
                }
            } catch (error) {
                console.error('Register error:', error);
                closeLoading();
                
                let errorMessage = 'Terjadi kesalahan saat mendaftar. Silakan coba lagi.';
                
                const errorString = error.message.toLowerCase();
                
                if (errorString.includes('email is already taken') || 
                    errorString.includes('email already') || 
                    errorString.includes('already taken')) {
                    errorMessage = 'Email sudah terdaftar. Silakan gunakan email lain atau login jika Anda sudah memiliki akun.';
                    emailInput.focus();
                    emailInput.select();
                } else if (errorString.includes('email')) {
                    errorMessage = 'Email tidak valid atau sudah digunakan.';
                    emailInput.focus();
                } else if (errorString.includes('password')) {
                    errorMessage = 'Password tidak memenuhi kriteria.';
                    passwordInput.focus();
                } else if (errorString.includes('name')) {
                    errorMessage = 'Nama tidak valid.';
                    nameInput.focus();
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                await showError('Registrasi Gagal', errorMessage);
            }
        });

        confirmPasswordInput.addEventListener('input', () => {
            if (confirmPasswordInput.value && passwordInput.value !== confirmPasswordInput.value) {
                confirmPasswordInput.setCustomValidity('Password tidak sama');
            } else {
                confirmPasswordInput.setCustomValidity('');
            }
        });
    }
}