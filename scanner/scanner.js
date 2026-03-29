// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyBWp0bTZLKoE4LMLTAj7uF4hWjrjGF19Tk",
    authDomain: "school-dashboard-trial.firebaseapp.com",
    projectId: "school-dashboard-trial",
    storageBucket: "school-dashboard-trial.firebasestorage.app",
    messagingSenderId: "125925153098",
    appId: "1:125925153098:web:820250f29a9871538709b3"
};

// Initialize Firebase
try { if (!firebase.apps.length) firebase.initializeApp(firebaseConfig); } catch (e) { console.error(e); }
const db = firebase.firestore();

// --- 2. STATE & VARIABLES ---
let html5QrcodeScanner = null;
let isScannerRunning = false;

let allStudents = [];
let teacherData = null;
let isWaliKelas = false;
let homeroomClass = "";

// Waktu Live (Jam)
setInterval(() => {
    const now = new Date();
    const clockEl = document.getElementById('clockDisplay');
    if(clockEl) clockEl.innerText = now.toLocaleTimeString('id-ID', { hour12: false });
}, 1000);

// --- 3. INIT APLIKASI ---
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    const container = document.getElementById('studentListContainer');
    if (container) {
        container.innerHTML = `<div class="p-8 text-center text-blue-400"><i data-lucide="loader-2" class="animate-spin mx-auto mb-2"></i> Verifikasi Sesi Login...</div>`;
        lucide.createIcons();
    }

    // Tunggu verifikasi tiket login dari Dashboard
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const snap = await db.collection("teachers").where("uid", "==", user.uid).get();
                if (!snap.empty) {
                    teacherData = snap.docs[0].data();
                    if(teacherData.homeroomClass) {
                        isWaliKelas = true;
                        homeroomClass = teacherData.homeroomClass;
                    }
                }
            } catch (err) {
                console.warn("Gagal mengambil data guru:", err);
            }
            
            // Tiket aman, tarik data siswa
            fetchStudents();
            startScanner();
            
        } else {
            Swal.fire({
                title: 'Akses Ditolak',
                text: 'Sesi login tidak ditemukan. Harap login melalui Dashboard.',
                icon: 'error',
                confirmButtonColor: '#d33'
            }).then(() => {
                goBack();
            });
        }
    });
});

function goBack() {
    if(html5QrcodeScanner) html5QrcodeScanner.clear(); 
    window.location.href = '/dashboard-lms/dashboard-teacher/teacher.html'; 
}

// --- 4. TAB NAVIGATION (DUAL MODE) ---
function switchMode(mode) {
    const btnScan = document.getElementById('tabScanner');
    const btnManual = document.getElementById('tabManual');
    const areaScan = document.getElementById('areaScanner');
    const areaManual = document.getElementById('areaManual');

    if (mode === 'scanner') {
        btnScan.className = "flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex justify-center items-center gap-2 bg-blue-600 text-white shadow-md";
        btnManual.className = "flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex justify-center items-center gap-2 text-slate-400 hover:text-slate-200 bg-slate-800";
        
        areaScan.style.display = "flex";
        areaManual.style.display = "none";
        
        if(!isScannerRunning) startScanner();
        
    } else {
        btnManual.className = "flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex justify-center items-center gap-2 bg-blue-600 text-white shadow-md";
        btnScan.className = "flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex justify-center items-center gap-2 text-slate-400 hover:text-slate-200 bg-slate-800";
        
        areaManual.style.display = "flex";
        areaScan.style.display = "none";
        
        if(html5QrcodeScanner) {
            html5QrcodeScanner.clear().then(() => { isScannerRunning = false; }).catch(err => console.log(err));
        }
        
        document.getElementById('searchInput').value = "";
        renderManualList(allStudents); 
    }
    lucide.createIcons();
}

// --- 5. LOGIKA SCANNER (KAMERA) ---
function startScanner() {
    const loadingEl = document.getElementById('kameraLoading');
    if(loadingEl) loadingEl.classList.remove('hidden');
    
    html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
    isScannerRunning = true;
    
    setTimeout(() => { if(loadingEl) loadingEl.classList.add('hidden'); }, 1500);
}

function onScanSuccess(decodedText, decodedResult) {
    const searchId = decodedText.trim();
    const student = allStudents.find(s => s.nisn === searchId || s.id === searchId);
    const resBox = document.getElementById('scanResult');
    
    if (student) {
        html5QrcodeScanner.pause(true);
        resBox.className = "w-full bg-emerald-900/30 border border-emerald-500/50 rounded-xl p-4 min-h-[90px] flex flex-col items-center justify-center transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] text-center";
        resBox.innerHTML = `<div class="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-2 shadow-lg"><i data-lucide="check" width="24"></i></div><p class="font-black text-emerald-400 text-lg">${student.fullName || 'Tanpa Nama'}</p><p class="text-emerald-500/80 text-xs font-bold mt-1">Kelas ${student.kelas || '-'} | NISN: ${student.nisn || '-'}</p>`;
        lucide.createIcons();
        saveAttendance(student.id, student.fullName, student.kelas, 'Hadir', 'Scanner Kamera');

        setTimeout(() => {
            resBox.className = "w-full bg-slate-800 border border-slate-700 rounded-xl p-4 min-h-[90px] flex flex-col items-center justify-center transition-all shadow-lg text-center";
            resBox.innerHTML = `<div class="text-slate-400 text-xs uppercase font-bold tracking-widest flex items-center gap-2"><i data-lucide="qr-code" width="16"></i> Menunggu Scan...</div>`;
            lucide.createIcons();
            if(isScannerRunning) html5QrcodeScanner.resume();
        }, 2500);
    } else {
        html5QrcodeScanner.pause(true);
        resBox.className = "w-full bg-red-900/30 border border-red-500/50 rounded-xl p-4 min-h-[90px] flex flex-col items-center justify-center transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] text-center";
        resBox.innerHTML = `<div class="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white mb-2 shadow-lg"><i data-lucide="x" width="24"></i></div><p class="font-black text-red-400 text-lg">Tidak Dikenali!</p><p class="text-red-500/80 text-xs font-bold mt-1">Kode: ${searchId}</p>`;
        lucide.createIcons();

        setTimeout(() => {
            resBox.className = "w-full bg-slate-800 border border-slate-700 rounded-xl p-4 min-h-[90px] flex flex-col items-center justify-center transition-all shadow-lg text-center";
            resBox.innerHTML = `<div class="text-slate-400 text-xs uppercase font-bold tracking-widest flex items-center gap-2"><i data-lucide="qr-code" width="16"></i> Menunggu Scan...</div>`;
            lucide.createIcons();
            if(isScannerRunning) html5QrcodeScanner.resume();
        }, 2000);
    }
}

function onScanFailure(error) { /* Abaikan */ }

// --- 6. LOGIKA PENCARIAN MANUAL ---
function fetchStudents() {
    db.collection("students").get().then((snap) => {
        allStudents = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        allStudents.sort((a, b) => {
            let namaA = (a.fullName || a.name || a.nama || "").toLowerCase();
            let namaB = (b.fullName || b.name || b.nama || "").toLowerCase();
            return namaA.localeCompare(namaB);
        });

        // (Opsional) Hapus komentar di bawah ini jika ingin ada notifikasi sukses
        // Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, icon: 'success', title: `Data ${allStudents.length} siswa dimuat!` });
        
        renderManualList(allStudents);
    }).catch(err => {
        document.getElementById('studentListContainer').innerHTML = `<p class="text-red-500 p-4 text-center">Gagal memuat data: ${err.message}</p>`;
    });
}

function renderManualList(dataList) {
    const container = document.getElementById('studentListContainer');
    
    if(dataList.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-slate-500 mt-10">
                <i data-lucide="search-x" class="mb-2" width="32"></i>
                <p class="text-sm font-medium">Tidak ada siswa ditemukan.</p>
            </div>`;
        lucide.createIcons();
        return;
    }

    container.innerHTML = dataList.map(s => {
        const nama = s.fullName || s.name || s.nama || "Tanpa Nama";
        const nisn = s.nisn || "-";
        const kelas = s.kelas || "-";
        const safeName = nama.replace(/'/g, "\\'");

        return `
        <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-3 shadow-md">
            <div class="flex justify-between items-start mb-3 border-b border-slate-700/50 pb-3">
                <div>
                    <h3 class="font-bold text-white text-sm md:text-base">${nama}</h3>
                    <p class="text-xs text-slate-400 font-mono mt-1">NISN: ${nisn} <span class="mx-1 text-slate-600">|</span> Kelas: <span class="text-blue-400 font-bold">${kelas}</span></p>
                </div>
            </div>
            <div class="grid grid-cols-4 gap-2">
                <button onclick="saveManualAttendance('${s.id}', '${safeName}', '${kelas}', 'Hadir', this)" class="py-2 text-xs font-bold rounded-lg border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white transition shadow-sm">Hadir</button>
                <button onclick="saveManualAttendance('${s.id}', '${safeName}', '${kelas}', 'Sakit', this)" class="py-2 text-xs font-bold rounded-lg border border-orange-500/30 text-orange-400 bg-orange-500/10 hover:bg-orange-500 hover:text-white transition shadow-sm">Sakit</button>
                <button onclick="saveManualAttendance('${s.id}', '${safeName}', '${kelas}', 'Izin', this)" class="py-2 text-xs font-bold rounded-lg border border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-600 hover:text-white transition shadow-sm">Izin</button>
                <button onclick="saveManualAttendance('${s.id}', '${safeName}', '${kelas}', 'Alpha', this)" class="py-2 text-xs font-bold rounded-lg border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-600 hover:text-white transition shadow-sm">Alpha</button>
            </div>
        </div>`;
    }).join('');
    
    lucide.createIcons();
}

function filterStudents() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    
    const filtered = allStudents.filter(s => {
        const namaSiswa = (s.fullName || s.name || s.nama || "").toLowerCase();
        const nisnSiswa = (s.nisn || "").toLowerCase();
        return namaSiswa.includes(query) || nisnSiswa.includes(query);
    });
    
    renderManualList(filtered);
}

// --- 7. DATABASE SAVING ---
async function saveManualAttendance(id, name, kelas, status, btnElement) {
    const originalText = btnElement.innerText;
    const originalClass = btnElement.className;
    
    btnElement.innerHTML = `<i data-lucide="loader-2" class="animate-spin inline w-4 h-4"></i>`;
    btnElement.classList.add('opacity-80', 'cursor-not-allowed');
    lucide.createIcons();
    
    await saveAttendance(id, name, kelas, status, 'Pencarian Manual');
    
    btnElement.innerText = "Tersimpan!";
    btnElement.className = "py-2 text-xs font-bold rounded-lg bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)] transition";
    
    setTimeout(() => {
        btnElement.innerText = originalText;
        btnElement.className = originalClass;
    }, 2000);
}

async function saveAttendance(studentId, studentName, studentClass, status, method) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' });

    try {
        const existingSnap = await db.collection("attendance")
            .where("studentId", "==", studentId)
            .where("date", "==", dateStr)
            .where("type", "==", "Gerbang")
            .get();

        if (!existingSnap.empty) {
            const docId = existingSnap.docs[0].id;
            await db.collection("attendance").doc(docId).update({
                status: status,
                time: timeStr,
                method: method,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            await db.collection("attendance").add({
                studentId: studentId,
                studentName: studentName,
                class: studentClass || "Umum",
                date: dateStr,
                time: timeStr,
                status: status,
                type: 'Gerbang', 
                method: method, 
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error("Error saving attendance:", error);
        Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 })
            .fire({ icon: 'error', title: `Gagal menyimpan absen ${studentName}` });
    }
}