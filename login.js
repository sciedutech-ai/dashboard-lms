// --- 1. CONFIGURATION (SAMA SEPERTI SEBELUMNYA) ---
const firebaseConfig = {
    apiKey: "AIzaSyBWp0bTZLKoE4LMLTAj7uF4hWjrjGF19Tk",
    authDomain: "school-dashboard-trial.firebaseapp.com",
    projectId: "school-dashboard-trial",
    storageBucket: "school-dashboard-trial.firebasestorage.app",
    messagingSenderId: "125925153098",
    appId: "1:125925153098:web:820250f29a9871538709b3"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- 2. UI LOGIC (ROLE SWITCHER) ---
let currentRole = 'siswa'; 

const roleConfig = {
    siswa: {
        color: 'emerald', hex: 'bg-emerald-600', hover: 'hover:bg-emerald-700', ring: 'focus:ring-emerald-500',
        icon: 'graduation-cap', title: 'Siswa', collection: 'students', redirect: '/dashboard-student/student.html'
    },
    guru: {
        color: 'blue', hex: 'bg-blue-600', hover: 'hover:bg-blue-700', ring: 'focus:ring-blue-500',
        icon: 'book-open', title: 'Guru', collection: 'teachers', redirect: '/dashboard-teacher/teacher.html'
    },
    admin: {
        color: 'slate', hex: 'bg-slate-800', hover: 'hover:bg-slate-900', ring: 'focus:ring-slate-500',
        icon: 'shield-check', title: 'Administrator', collection: 'admins', redirect: '/dashboard-admin/admin.html'
    }
};

function switchRole(role) {
    currentRole = role;
    const config = roleConfig[role];

    // Update Header
    const header = document.getElementById('header-bg');
    header.className = header.className.replace(/bg-\w+-600|bg-slate-800/g, '');
    header.classList.add(config.hex);
    document.getElementById('role-text').innerText = config.title;
    
    // Update Icon
    document.getElementById('header-icon').setAttribute('data-lucide', config.icon);
    lucide.createIcons();

    // Update Button
    const btn = document.getElementById('btnLogin');
    btn.className = `w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white transition-all role-transition transform hover:scale-[1.02] ${config.hex} ${config.hover}`;

    // Update Inputs Ring
    document.querySelectorAll('input').forEach(input => {
        input.className = input.className.replace(/focus:ring-\w+-500/g, '');
        input.classList.add(config.ring);
        // Update checkbox color logic (manual css replacement)
        if(input.type === 'checkbox') {
            input.className = input.className.replace(/text-\w+-600/g, `text-${config.color}-600`).replace(/focus:ring-\w+-500/g, `focus:ring-${config.color}-500`);
        }
    });
    
    // Update link color
    const forgotLink = document.querySelector('a[onclick="lupaPassword()"]');
    if(forgotLink) {
        forgotLink.className = forgotLink.className.replace(/text-\w+-600/g, `text-${config.color}-600`).replace(/hover:text-\w+-500/g, `hover:text-${config.color}-500`);
    }

    // Update Tabs
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.classList.remove('bg-white', 'text-slate-800', 'shadow-sm', 'border-t-4', 'active-tab');
        btn.classList.remove('border-emerald-500', 'border-blue-500', 'border-slate-800');
        btn.classList.add('text-slate-500', 'hover:bg-white');
    });

    const activeBtn = document.getElementById(`btn-${role}`);
    activeBtn.classList.remove('text-slate-500', 'hover:bg-white');
    activeBtn.classList.add('bg-white', 'text-slate-800', 'shadow-sm', 'border-t-4', 'active-tab');
    
    if(role === 'siswa') activeBtn.classList.add('border-emerald-500');
    if(role === 'guru') activeBtn.classList.add('border-blue-500');
    if(role === 'admin') activeBtn.classList.add('border-slate-800');
}

// --- 3. FITUR "INGAT SAYA" & CEK LOGIN ---

// A. Saat Halaman Dimuat
document.addEventListener('DOMContentLoaded', () => {
    // 1. Cek LocalStorage (Auto Fill Form)
    const savedRole = localStorage.getItem('school_role');
    const savedEmail = localStorage.getItem('school_email');

    if (savedRole) {
        switchRole(savedRole);
    } else {
        switchRole('siswa'); // Default
    }

    if (savedEmail) {
        document.getElementById('email').value = savedEmail;
        document.getElementById('remember-me').checked = true;
    }

    // 2. Cek Firebase Session (Auto Redirect jika belum logout)
    auth.onAuthStateChanged((user) => {
        if (user) {
            // Jika user masih login, kita harus tahu dia role-nya apa untuk redirect yang benar
            // Kita bisa cek localStorage 'school_role' sebagai hint cepat
            // Atau redirect ke halaman default, dan biarkan halaman itu memvalidasi
            
            const lastRole = localStorage.getItem('school_role') || 'siswa';
            const config = roleConfig[lastRole];
            
            console.log(`User terdeteksi login sebagai ${lastRole}, mengalihkan...`);
            window.location.href = config.redirect;
        }
    });
});

// B. Logika Tombol Lupa Password
function lupaPassword() {
    const email = document.getElementById('email').value;
    if (!email) {
        Swal.fire('Info', 'Masukkan email Anda terlebih dahulu di kolom email, lalu klik Lupa Password lagi.', 'info');
        return;
    }
    
    auth.sendPasswordResetEmail(email)
        .then(() => {
            Swal.fire('Terkirim', 'Link reset password telah dikirim ke email Anda.', 'success');
        })
        .catch((error) => {
            Swal.fire('Gagal', error.message, 'error');
        });
}

// --- 4. LOGIN SUBMIT ---

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    const btn = document.getElementById('btnLogin');
    const config = roleConfig[currentRole];

    const originalText = `<i data-lucide="log-in" width="18"></i> Masuk Sistem`;
    btn.disabled = true;
    btn.innerHTML = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Memverifikasi...`;

    try {
        // 1. Auth Firebase
        // Set Persistence berdasarkan checkbox
        // LOCAL = Ingat selamanya (sampai logout), SESSION = Hilang saat tab ditutup
        const persistence = rememberMe ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;
        
        await auth.setPersistence(persistence);
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // 2. Validasi Role di Database
        let isAuthorized = false;

        if (currentRole === 'admin') {
            isAuthorized = true; // Sementara True untuk testing
        } else {
            const docRef = db.collection(config.collection).doc(user.uid);
            const docSnap = await docRef.get();
            if (docSnap.exists) isAuthorized = true;
        }

        if (isAuthorized) {
            // 3. SIMPAN PREFERENSI KE LOCALSTORAGE (Hanya Email & Role, Password jangan!)
            if (rememberMe) {
                localStorage.setItem('school_email', email);
                localStorage.setItem('school_role', currentRole);
            } else {
                localStorage.removeItem('school_email');
                // Role tetap disimpan agar UX lebih baik saat kembali
                localStorage.setItem('school_role', currentRole); 
            }

            Swal.fire({
                icon: 'success',
                title: `Selamat Datang!`,
                text: 'Login berhasil.',
                timer: 1000,
                showConfirmButton: false
            }).then(() => {
                window.location.href = config.redirect;
            });

        } else {
            await auth.signOut();
            throw new Error(`Akun tidak ditemukan di data ${config.title}.`);
        }

    } catch (error) {
        console.error("Login Error:", error);
        
        let msg = "Email atau password salah.";
        if (error.message.includes("Akun tidak ditemukan")) {
            msg = error.message;
        } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            msg = "Kombinasi email dan password tidak valid.";
        } else if (error.code === 'auth/too-many-requests') {
            msg = "Terlalu banyak percobaan gagal. Coba lagi nanti.";
        }

        Swal.fire({ icon: 'error', title: 'Gagal', text: msg });
        btn.disabled = false;
        btn.innerHTML = originalText;
        lucide.createIcons();
    }
});

// Init Icons
lucide.createIcons();