// --- 1. INISIALISASI FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyBWp0bTZLKoE4LMLTAj7uF4hWjrjGF19Tk",
    authDomain: "school-dashboard-trial.firebaseapp.com",
    projectId: "school-dashboard-trial",
    storageBucket: "school-dashboard-trial.firebasestorage.app",
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();
const auth = firebase.auth(); // <-- Tambahan Auth

const resultBox = document.getElementById('scanResult');
let isProcessing = false; 

// --- 2. LOGIKA SCANNER KAMERA ---
let html5QrcodeScanner = new Html5QrcodeScanner(
    "reader",
    { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false 
    },
    false
);

function onScanSuccess(decodedText, decodedResult) {
    if (isProcessing) return; 
    const nisnScanned = decodedText.trim();
    if(nisnScanned) processAttendance(nisnScanned);
}

function onScanFailure(error) { /* Abaikan frame kosong */ }

// --- 3. SISTEM KEAMANAN & LOGIN (BARU) ---
// Kamera HANYA akan menyala jika pengguna sudah terautentikasi
auth.onAuthStateChanged((user) => {
    if (user) {
        // Izin Diberikan -> Nyalakan Kamera!
        html5QrcodeScanner.render(onScanSuccess, onScanFailure);
    } else {
        // Belum Login -> Munculkan Pop-up Login
        Swal.fire({
            title: 'Akses Scanner Gerbang',
            text: 'Silakan login menggunakan akun Admin atau Guru untuk menyalakan mesin scanner.',
            html: `
                <input type="email" id="scanEmail" class="swal2-input" placeholder="Email Akun">
                <input type="password" id="scanPass" class="swal2-input" placeholder="Kata Sandi">
            `,
            confirmButtonText: 'Aktifkan Kamera',
            allowOutsideClick: false,
            allowEscapeKey: false,
            preConfirm: () => {
                const e = document.getElementById('scanEmail').value;
                const p = document.getElementById('scanPass').value;
                if(!e || !p) Swal.showValidationMessage('Isi email dan kata sandi!');
                return {e, p};
            }
        }).then(async (res) => {
            if(res.isConfirmed) {
                Swal.fire({ title: 'Menghubungkan...', didOpen: () => Swal.showLoading() });
                try {
                    await auth.signInWithEmailAndPassword(res.value.e, res.value.p);
                    Swal.fire('Akses Diberikan!', 'Kamera siap digunakan.', 'success');
                } catch(err) {
                    Swal.fire('Akses Ditolak', 'Kredensial salah.', 'error').then(()=> window.location.reload());
                }
            }
        });
    }
});

// --- 4. LOGIKA UTAMA ABSENSI ---
async function processAttendance(nisn) {
    isProcessing = true; 
    resultBox.innerHTML = `<div class="text-blue-400 font-bold text-xl animate-pulse">Mencari Data...</div>`;
    resultBox.className = "scan-box-processing";

    try {
        const snapshot = await db.collection('students').where('nisn', '==', nisn).get();
        
        if (snapshot.empty) {
            resultBox.innerHTML = `
                <div class="text-red-500 font-bold text-3xl mb-2">❌</div>
                <div class="text-white font-bold text-lg">Siswa Tidak Ditemukan</div>
                <p class="text-slate-400 mt-1 font-mono text-sm">NISN: ${nisn}</p>
            `;
            resultBox.className = "scan-box-error";
            playAudio('error');
            setTimeout(() => resetBox(), 3500);
            return;
        }

        const student = snapshot.docs[0].data();
        const studentId = snapshot.docs[0].id;
        
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const timeNow = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        const checkAtt = await db.collection('attendance')
            .where('studentId', '==', studentId)
            .where('date', '==', todayStr)
            .where('type', '==', 'Gerbang')
            .get();

        if (!checkAtt.empty) {
            resultBox.innerHTML = `
                <div class="text-orange-500 font-bold text-3xl mb-2">⚠️</div>
                <div class="text-white font-bold text-lg">${student.fullName}</div>
                <p class="text-orange-400 text-sm mt-1">Sudah Absen Hari Ini</p>
            `;
            resultBox.className = "scan-box-error"; 
            playAudio('error');
        } else {
            await db.collection('attendance').add({
                studentId: studentId,
                studentName: student.fullName,
                class: student.kelas,
                date: todayStr,
                time: timeNow,
                status: 'Hadir',
                type: 'Gerbang',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            resultBox.innerHTML = `
                <div class="text-green-500 text-4xl mb-2">✅</div>
                <h2 class="text-xl font-bold text-white mb-1 line-clamp-1 text-center w-full">${student.fullName}</h2>
                <p class="text-green-400 font-black text-2xl tracking-widest">${timeNow} WIB</p>
                <p class="text-slate-400 text-xs mt-2 font-bold uppercase tracking-wider">Kelas ${student.kelas}</p>
            `;
            resultBox.className = "scan-box-success";
            playAudio('success');
        }
        setTimeout(() => resetBox(), 3500);

    } catch (error) {
        // JIKA MASIH ERROR, KITA TAMPILKAN PESAN ERROR ASLINYA DI LAYAR
        console.error("Error Absensi:", error);
        resultBox.innerHTML = `
            <div class="text-red-500 font-bold text-xl">Koneksi Error</div>
            <p class="text-xs text-slate-400 mt-2 text-center px-4">${error.message}</p>
        `;
        resultBox.className = "scan-box-error";
        setTimeout(() => resetBox(), 5000);
    }
}

// --- 5. FUNGSI PENDUKUNG ---
function resetBox() {
    resultBox.innerHTML = `<div class="text-slate-500 animate-pulse font-medium text-lg">Siap Scan Berikutnya...</div>`;
    resultBox.className = "scan-box-default";
    isProcessing = false; 
}

function playAudio(type) {
    let url = '';
    if (type === 'success') url = 'https://www.soundjay.com/buttons/sounds/button-09.mp3';
    else if (type === 'error') url = 'https://www.soundjay.com/buttons/sounds/button-10.mp3';
    if (url) {
        const audio = new Audio(url);
        audio.play().catch(e => console.log("Audio diabaikan browser:", e));
    }
}