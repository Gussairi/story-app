import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

export const showLoading = (
    title = 'Loading...',
    text = 'Mohon tunggu sebentar'
) => {
    Swal.fire({
        title,
        text,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        },
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
        timerProgressBar: true,
    });
};

export const showError = (title, text = '') => {
    return Swal.fire({
        icon: 'error',
        title,
        text,
        confirmButtonText: 'OK',
        confirmButtonColor: '#4CAF50',
    });
};

export const showConfirm = async (
    title,
    text = '',
    confirmButtonText = 'Ya',
    cancelButtonText = 'Batal'
) => {
    const result = await Swal.fire({
        icon: 'question',
        title,
        text,
        showCancelButton: true,
        confirmButtonText,
        cancelButtonText,
        confirmButtonColor: '#4CAF50',
        cancelButtonColor: '#d33',
        reverseButtons: true,
    });

    return result.isConfirmed;
};
