// SweetAlert2 Helper Functions
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

export const showLoading = (title = 'Loading...', text = 'Mohon tunggu sebentar') => {
    Swal.fire({
        title,
        text,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
};

export const closeLoading = () => {
    Swal.close();
};

export const showSuccess = (title, text = '', timer = 2000) => {
    return Swal.fire({
        icon: 'success',
        title,
        text,
        timer,
        showConfirmButton: timer ? false : true,
        timerProgressBar: true
    });
};

export const showError = (title, text = '') => {
    return Swal.fire({
        icon: 'error',
        title,
        text,
        confirmButtonText: 'OK',
        confirmButtonColor: '#4CAF50'
    });
};

export const showInfo = (title, text = '') => {
    return Swal.fire({
        icon: 'info',
        title,
        text,
        confirmButtonText: 'OK',
        confirmButtonColor: '#4CAF50'
    });
};

export const showWarning = (title, text = '') => {
    return Swal.fire({
        icon: 'warning',
        title,
        text,
        confirmButtonText: 'OK',
        confirmButtonColor: '#4CAF50'
    });
};

export const showConfirm = async (title, text = '', confirmButtonText = 'Ya', cancelButtonText = 'Batal') => {
    const result = await Swal.fire({
        icon: 'question',
        title,
        text,
        showCancelButton: true,
        confirmButtonText,
        cancelButtonText,
        confirmButtonColor: '#4CAF50',
        cancelButtonColor: '#d33',
        reverseButtons: true
    });
    
    return result.isConfirmed;
};

export const showToast = (title, icon = 'success', timer = 3000) => {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    });

    return Toast.fire({
        icon,
        title
    });
};

export const showLoadingWithProgress = (title = 'Memproses...') => {
    let timerInterval;
    
    Swal.fire({
        title,
        html: 'Progres: <b></b>%',
        timer: 100000,
        timerProgressBar: true,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
            const b = Swal.getHtmlContainer().querySelector('b');
            timerInterval = setInterval(() => {
                const currentProgress = Swal.getTimerLeft();
                const progress = Math.round((1 - currentProgress / 100000) * 100);
                b.textContent = progress;
            }, 100);
        },
        willClose: () => {
            clearInterval(timerInterval);
        }
    });
};