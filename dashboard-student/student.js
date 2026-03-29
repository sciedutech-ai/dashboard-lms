// --- 1. CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyBWp0bTZLKoE4LMLTAj7uF4hWjrjGF19Tk",
    authDomain: "school-dashboard-trial.firebaseapp.com",
    projectId: "school-dashboard-trial",
    storageBucket: "school-dashboard-trial.firebasestorage.app",
    messagingSenderId: "125925153098",
    appId: "1:125925153098:web:820250f29a9871538709b3"
};

try { if (!firebase.apps.length) firebase.initializeApp(firebaseConfig); } catch (e) { console.error(e); }

const db = firebase.firestore();
const auth = firebase.auth();

// --- 2. STATE & DATA ---
let STUDENT_DATA = null;
let STUDENT_DOC_ID = null;
let SCHOOL_SETTINGS = { schoolName: 'MTS Tarbiyatus Syarifah', academicYear: '2025/2026', semester: 'Ganjil' };

let currentTab = 'home';
let activeScheduleDay = 'Senin';

let mySchedules = [];
let myExams = [];
let myGrades = [];
let myLetters = [];
let allAnnouncements = [];
let myAttendance = [];
let allBooks = [];
let myBorrowRequests = [];

const NAV_ITEMS = [
    { id: 'home', label: 'Beranda Utama', icon: 'home' },
    { id: 'schedule', label: 'Jadwal Pelajaran', icon: 'calendar' },
    { id: 'cbt', label: 'Ujian (CBT)', icon: 'monitor-play' },
    { id: 'grades', label: 'Rapor Akademik', icon: 'file-text' },
    { id: 'announcements', label: 'Papan Pengumuman', icon: 'megaphone' },
    { id: 'letters', label: 'Pengajuan Izin', icon: 'mail' },
    { id: 'profile', label: 'Profil Saya', icon: 'user' },
    { id: 'library', label: 'E-Library', icon: 'library' }, 
    { id: 'lab', label: 'Virtual Lab', icon: 'flask-conical' },
    { id: 'settings', label: 'Pengaturan', icon: 'settings' }
];

const VIRTUAL_LABS = [
    // FISIKA
    { id: 'f1', title: 'Race of Motion: Siapa Paling Cepat?', emoji: '🚀', subject: 'Fisika', topic: 'Gerak Lurus (GLB & GLBB)', file: 'lab-race-of-motion.html', color: 'bg-blue-500' },
    { id: 'f2', title: 'Projectile Master: Bidik & Tembak!', emoji: '🎯', subject: 'Fisika', topic: 'Gerak Parabola', file: 'lab-projectile-master.html', color: 'bg-blue-500' },
    { id: 'f3', title: 'Force Arena: Hukum Newton in Action', emoji: '⚖️', subject: 'Fisika', topic: 'Hukum Newton', file: 'lab-force-arena.html', color: 'bg-blue-500' },
    { id: 'f4', title: 'Friction Challenge: Lawan Gesekan!', emoji: '🛑', subject: 'Fisika', topic: 'Gaya Gesek', file: 'lab-friction-challenge.html', color: 'bg-blue-500' },
    { id: 'f5', title: 'Deep Pressure: Misteri Dasar Laut', emoji: '🌊', subject: 'Fisika', topic: 'Tekanan Hidrostatis', file: 'lab-deep-pressure.html', color: 'bg-blue-500' },
    { id: 'f6', title: 'Float or Sink: Uji Archimedes', emoji: '⚓', subject: 'Fisika', topic: 'Hukum Archimedes', file: 'lab-float-or-sink.html', color: 'bg-blue-500' },
    { id: 'f7', title: 'Hydraulic Power: Angkat Dunia!', emoji: '🏗️', subject: 'Fisika', topic: 'Hukum Pascal', file: 'lab-hydraulic-power.html', color: 'bg-blue-500' },
    { id: 'f8', title: 'Circuit Builder: Teknisi Listrik!', emoji: '💡', subject: 'Fisika', topic: 'Rangkaian Seri & Paralel', file: 'lab-circuit-builder.html', color: 'bg-blue-500' },
    { id: 'f9', title: 'Ohm’s Law: Tegangan vs Arus', emoji: '⚡', subject: 'Fisika', topic: 'Hukum Ohm', file: 'lab-ohms-law.html', color: 'bg-blue-500' },
    { id: 'f10', title: 'Magnetic Field Explorer', emoji: '🧲', subject: 'Fisika', topic: 'Medan Magnet', file: 'lab-magnetic-field.html', color: 'bg-blue-500' },
    { id: 'f11', title: 'Mini Gen: Listrik dari Gerak', emoji: '🔄', subject: 'Fisika', topic: 'Induksi Elektromagnetik', file: 'lab-mini-generator.html', color: 'bg-blue-500' },
    { id: 'f12', title: 'Wave Lab: Visualisasi Gelombang', emoji: '🌊', subject: 'Fisika', topic: 'Gelombang', file: 'lab-wave.html', color: 'bg-blue-500' },
    { id: 'f13', title: 'Sound Explorer: Dunia Bunyi', emoji: '🔊', subject: 'Fisika', topic: 'Gelombang Bunyi', file: 'lab-sound-explorer.html', color: 'bg-blue-500' },
    { id: 'f14', title: 'Mirror Lab: Dunia Bayangan', emoji: '🔍', subject: 'Fisika', topic: 'Cermin', file: 'lab-mirror.html', color: 'bg-blue-500' },
    { id: 'f15', title: 'Lens Studio: Fokus & Bayangan', emoji: '👓', subject: 'Fisika', topic: 'Lensa', file: 'lab-lens.html', color: 'bg-blue-500' },
    // KIMIA
    { id: 'k1', title: 'Reaction Lab: Ledakan Warna!', emoji: '🧨', subject: 'Kimia', topic: 'Reaksi Kimia', file: 'lab-reaction.html', color: 'bg-purple-500' },
    { id: 'k2', title: 'Reaction Speed: Siapa Cepat?', emoji: '⏱️', subject: 'Kimia', topic: 'Laju Reaksi', file: 'lab-reaction-speed.html', color: 'bg-purple-500' },
    { id: 'k3', title: 'Energy Lab: Eksoterm vs Endoterm', emoji: '🔥', subject: 'Kimia', topic: 'Energi Reaksi', file: 'lab-energy.html', color: 'bg-purple-500' },
    { id: 'k4', title: 'Atomic Builder: Rancang Atommu!', emoji: '⚛️', subject: 'Kimia', topic: 'Struktur Atom', file: 'lab-atomic-builder.html', color: 'bg-purple-500' },
    { id: 'k5', title: 'Electron Config Game', emoji: '🧬', subject: 'Kimia', topic: 'Konfigurasi Elektron', file: 'lab-electron-config.html', color: 'bg-purple-500' },
    { id: 'k6', title: 'Periodic Table Explorer', emoji: '🧪', subject: 'Kimia', topic: 'Sistem Periodik Unsur', file: 'lab-periodic-table.html', color: 'bg-purple-500' },
    { id: 'k7', title: 'pH Lab: Asam atau Basa?', emoji: '🌈', subject: 'Kimia', topic: 'Asam Basa', file: 'lab-ph.html', color: 'bg-purple-500' },
    { id: 'k8', title: 'Titration Master Lab', emoji: '⚗️', subject: 'Kimia', topic: 'Titrasi Asam Basa', file: 'lab-titration.html', color: 'bg-purple-500' },
    { id: 'k9', title: 'Electrolyte Test: Lampu Nyala?', emoji: '💡', subject: 'Kimia', topic: 'Larutan Elektrolit', file: 'lab-electrolyte.html', color: 'bg-purple-500' },
    // BIOLOGI
    { id: 'b1', title: 'Blood Flow Simulator', emoji: '❤️', subject: 'Biologi', topic: 'Sistem Peredaran Darah', file: 'lab-blood-flow.html', color: 'bg-green-500' },
    { id: 'b2', title: 'Breathing System Lab', emoji: '🌬️', subject: 'Biologi', topic: 'Sistem Pernapasan', file: 'lab-breathing.html', color: 'bg-green-500' },
    { id: 'b3', title: 'Neuro Lab: Sistem Saraf', emoji: '🧠', subject: 'Biologi', topic: 'Sistem Saraf', file: 'lab-neuro.html', color: 'bg-green-500' },
    { id: 'b4', title: 'Digestive Journey', emoji: '🍔', subject: 'Biologi', topic: 'Sistem Pencernaan', file: 'lab-digestive.html', color: 'bg-green-500' },
    { id: 'b5', title: 'Ecosystem Balance Simulator', emoji: '🌿', subject: 'Biologi', topic: 'Ekosistem', file: 'lab-ecosystem.html', color: 'bg-green-500' },
    { id: 'b6', title: 'Food Chain Strategy Game', emoji: '🐺', subject: 'Biologi', topic: 'Rantai Makanan', file: 'lab-food-chain.html', color: 'bg-green-500' },
    { id: 'b7', title: 'Cycle Lab: Daur Biogeokimia', emoji: '🔄', subject: 'Biologi', topic: 'Daur Air, Karbon, Nitrogen', file: 'lab-cycle.html', color: 'bg-green-500' },
    { id: 'b8', title: 'Cell Explorer 3D', emoji: '🔬', subject: 'Biologi', topic: 'Struktur Sel', file: 'lab-cell-3d.html', color: 'bg-green-500' },
    { id: 'b9', title: 'Microscope Simulator', emoji: '🧫', subject: 'Biologi', topic: 'Penggunaan Mikroskop', file: 'lab-microscope.html', color: 'bg-green-500' },
    { id: 'b10', title: 'Cell Division Lab', emoji: '🧬', subject: 'Biologi', topic: 'Mitosis & Meiosis', file: 'lab-cell-division.html', color: 'bg-green-500' },
    // GEOLOGI
    { id: 'g1', title: 'Volcano Simulator: Letusan!', emoji: '🌋', subject: 'Geologi', topic: 'Gunung Api', file: 'lab-volcano.html', color: 'bg-orange-600' },
    { id: 'g2', title: 'Earth Layer Explorer', emoji: '🌍', subject: 'Geologi', topic: 'Struktur Bumi', file: 'lab-earth-layer.html', color: 'bg-orange-600' },
    { id: 'g3', title: 'Tectonic Plate Simulator', emoji: '🌊', subject: 'Geologi', topic: 'Lempeng Tektonik', file: 'lab-tectonic.html', color: 'bg-orange-600' },
    // ASTRONOMI
    { id: 'a1', title: 'Solar System Explorer', emoji: '🌌', subject: 'Astronomi', topic: 'Tata Surya', file: 'lab-solar-system.html', color: 'bg-slate-800' },
    { id: 'a2', title: 'Moon Phase Simulator', emoji: '🌙', subject: 'Astronomi', topic: 'Fase Bulan', file: 'lab-moon-phase.html', color: 'bg-slate-800' },
    { id: 'a3', title: 'Eclipse Lab: Gerhana', emoji: '🌑', subject: 'Astronomi', topic: 'Gerhana', file: 'lab-eclipse.html', color: 'bg-slate-800' },
    // EKOLOGI
    { id: 'e1', title: 'Climate Change Simulator', emoji: '🌱', subject: 'Ekologi', topic: 'Perubahan Iklim', file: 'lab-climate-change.html', color: 'bg-teal-600' },
    { id: 'e2', title: 'Pollution Impact Lab', emoji: '🏭', subject: 'Ekologi', topic: 'Pencemaran Lingkungan', file: 'lab-pollution.html', color: 'bg-teal-600' }
];
// --- 3. AUTENTIKASI SISWA ---
auth.onAuthStateChanged((user) => {
    const loginContainer = document.getElementById('login-container'), appContainer = document.getElementById('app-container');
    if (user) {
        db.collection("students").where("uid", "==", user.uid).get().then((querySnapshot) => {
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                STUDENT_DOC_ID = doc.id;
                STUDENT_DATA = doc.data();
                
                if (loginContainer) loginContainer.classList.add('hidden');
                if (appContainer) appContainer.classList.remove('hidden');
                
                document.getElementById('header-name').innerText = STUDENT_DATA.fullName;
                document.getElementById('header-class').innerText = `Kelas ${STUDENT_DATA.kelas}`;
                document.getElementById('header-name').innerText = STUDENT_DATA.fullName;
                document.getElementById('header-class').innerText = `Kelas ${STUDENT_DATA.kelas}`;
                
                // 👇 UBAH BAGIAN AVATAR MENJADI INI 👇
                const avatarSrc = STUDENT_DATA.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${STUDENT_DATA.email}&backgroundColor=bfdbfe`;
                document.getElementById('header-avatar').src = avatarSrc;
                // 👆 --------------------------------- 👆
                
                db.collection("settings").doc("general").get().then(sDoc => { if(sDoc.exists) SCHOOL_SETTINGS = sDoc.data(); });
                initDashboard();
            } else {
                Swal.fire('Akses Ditolak', 'Akun Anda tidak terdaftar sebagai Siswa.', 'error');
                auth.signOut();
            }
        });
    } else {
        if (loginContainer) loginContainer.classList.remove('hidden');
        if (appContainer) appContainer.classList.add('hidden');
        STUDENT_DATA = null; STUDENT_DOC_ID = null;
    }
});

async function handleStudentLogin(event) {
    event.preventDefault(); 
    const email = document.getElementById('studentEmail').value, password = document.getElementById('studentPassword').value, btn = document.getElementById('btnLogin');
    btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin" width="18"></i> Memproses...`; btn.disabled = true;
    try { await auth.signInWithEmailAndPassword(email, password); Swal.fire({ icon: 'success', title: 'Berhasil Masuk', timer: 1500, showConfirmButton: false }); } 
    catch (error) { Swal.fire('Login Gagal', "Email/NISN salah.", 'error'); } 
    finally { btn.innerHTML = `Masuk Kelas <i data-lucide="arrow-right" width="18"></i>`; btn.disabled = false; lucide.createIcons(); }
}
function handleLogout() { Swal.fire({ title: 'Keluar Akun?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Ya' }).then((r) => { if (r.isConfirmed) auth.signOut(); }); }

// --- 4. INIT & NAVIGATION ---
function initDashboard() {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    let today = days[new Date().getDay()];
    if(today === 'Minggu') today = 'Senin'; 
    activeScheduleDay = today;
    renderNavigation(); listenToDatabase(); renderContent();
}

function listenToDatabase() {
    db.collection("schedules").where("class", "==", STUDENT_DATA.kelas).onSnapshot((snap) => { mySchedules = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); });
    db.collection("exams").where("class", "==", STUDENT_DATA.kelas).onSnapshot((snap) => { myExams = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); });
    db.collection("grades").where("studentId", "==", STUDENT_DOC_ID).onSnapshot((snap) => { myGrades = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); });
    db.collection("letters").where("senderId", "==", STUDENT_DOC_ID).onSnapshot((snap) => { myLetters = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); });
    db.collection("announcements").orderBy("createdAt", "desc").onSnapshot((snap) => { allAnnouncements = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); });
    db.collection("attendance").where("studentId", "==", STUDENT_DOC_ID).onSnapshot((snap) => { myAttendance = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); });
    db.collection("books").onSnapshot((snap) => { allBooks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); });
    db.collection("borrow_requests").where("studentId", "==", STUDENT_DOC_ID).onSnapshot((snap) => { myBorrowRequests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); });
}

function renderNavigation() {
    const container = document.getElementById('nav-container'); if (!container) return;
    container.innerHTML = NAV_ITEMS.map(item => `<button onclick="setTab('${item.id}')" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${currentTab === item.id ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}"><i data-lucide="${item.icon}" class="${currentTab === item.id ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}" width="20"></i>${item.label}</button>`).join('');
    lucide.createIcons();
}

function setTab(tabId) {
    currentTab = tabId; const navItem = NAV_ITEMS.find(n => n.id === tabId); document.getElementById('page-title').innerText = navItem ? navItem.label : 'Dashboard';
    const sidebar = document.getElementById('sidebar'); if (sidebar && sidebar.classList.contains('open')) toggleMobileMenu();
    renderNavigation(); renderContent();
}

function toggleMobileMenu() { const sidebar = document.getElementById('sidebar'), overlay = document.getElementById('mobile-overlay'); if (sidebar && overlay) { sidebar.classList.toggle('open'); overlay.classList.toggle('hidden'); } }

// --- 5. VIEW RENDERING ---
function renderContent() {
    const container = document.getElementById('app-content'); if (!container) return;
    
    switch(currentTab) {
        case 'home': container.innerHTML = getHomeHTML(); initHomeChart(); break;
        case 'schedule': container.innerHTML = getScheduleHTML(); break;
        case 'cbt': container.innerHTML = getCbtHTML(); break;
        case 'grades': container.innerHTML = getGradesHTML(); break;
        case 'announcements': container.innerHTML = getAnnouncementsHTML(); break;
        case 'letters': container.innerHTML = getLettersHTML(); break;
        case 'profile': container.innerHTML = getProfileHTML(); break;
        case 'library': container.innerHTML = getLibraryHTML(); break;
        case 'lab': container.innerHTML = getLabHTML(); break;
        case 'settings': container.innerHTML = getSettingsHTML(); break;
    }
    
    lucide.createIcons(); 
    updateActiveViewData(); // Fungsi ini akan mengisi data ke dalam kerangka HTML di atas
}

function updateActiveViewData() {
    if (currentTab === 'schedule') { 
        renderScheduleList(); 
    }
    else if (currentTab === 'letters') { 
        renderLettersTable(); 
    }

    else if (currentTab === 'library') { 
        renderLibraryGrid(); 
    }
    else if (currentTab === 'lab') { 
        renderLabGrid(); 
    }
}

// --- 6. LOGIKA VIEW SISWA ---
function setScheduleDay(day) { activeScheduleDay = day; renderContent(); }

function renderScheduleList() {
    const container = document.getElementById('scheduleListContainer'); if(!container) return;
    const todaySchedules = mySchedules.filter(s => s.day === activeScheduleDay).sort((a,b) => a.startTime.localeCompare(b.startTime));

    if(todaySchedules.length === 0) return container.innerHTML = `<div class="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-slate-100 border-dashed"><i data-lucide="coffee" width="48" class="mx-auto mb-3 opacity-50"></i><p>Tidak ada jadwal pelajaran hari ini.</p></div>`;

    container.innerHTML = todaySchedules.map(sub => `<div class="flex flex-col md:flex-row gap-4 p-4 border border-slate-100 rounded-xl hover:border-blue-200 hover:shadow-sm transition bg-white"><div class="flex md:flex-col items-center md:items-start gap-2 md:w-32 md:border-r border-slate-100 md:pr-4 shrink-0"><span class="text-lg font-bold text-blue-600">${sub.startTime}</span><span class="text-xs text-slate-400">${sub.endTime}</span></div><div class="flex-1"><h4 class="text-lg font-bold text-slate-800">${sub.subject}</h4><div class="flex items-center gap-2 mt-1"><span class="px-2 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600"><i data-lucide="map-pin" class="inline w-3 h-3 mr-1"></i> ${sub.room}</span><span class="text-sm text-slate-500"><i data-lucide="user" class="inline w-3 h-3 mr-1"></i> ${sub.teacherName}</span></div></div></div>`).join('');
    lucide.createIcons();
}

function initHomeChart() {
    const canvas = document.getElementById('gradesChart'); if (!canvas) return;
    const subjectAverages = {};
    myGrades.forEach(g => { if(!subjectAverages[g.subject]) subjectAverages[g.subject] = { total: 0, count: 0 }; subjectAverages[g.subject].total += g.score; subjectAverages[g.subject].count += 1; });
    const labels = [], data = [];
    for(const [subj, d] of Object.entries(subjectAverages)) { labels.push(subj); data.push(Math.round(d.total / d.count)); }
    if(labels.length === 0) return; 

    const ctx = canvas.getContext('2d');
    const backgroundColors = data.map(score => score >= 90 ? '#22c55e' : score >= 80 ? '#3b82f6' : '#f59e0b');
    new Chart(ctx, { type: 'bar', data: { labels: labels, datasets: [{ label: 'Nilai Rata-rata', data: data, backgroundColor: backgroundColors, borderRadius: 4, barThickness: 30 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100, grid: { display: false } }, x: { grid: { display: false } } } } });
}

function renderLettersTable() {
    const tbody = document.getElementById('studentLettersBody'); if (!tbody) return;
    const sortedLetters = myLetters.sort((a,b) => { const tA = a.createdAt ? a.createdAt.toMillis() : 0; const tB = b.createdAt ? b.createdAt.toMillis() : 0; return tB - tA; });
    if (sortedLetters.length === 0) return tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-500">Kamu belum pernah membuat pengajuan.</td></tr>`;

    tbody.innerHTML = sortedLetters.map((l, index) => {
        let statusBadge = l.status === 'Disetujui' ? '<span class="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold">Disetujui</span>' : l.status === 'Ditolak' ? '<span class="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold">Ditolak</span>' : '<span class="px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-xs font-bold animate-pulse">Menunggu</span>';
        return `<tr class="hover:bg-slate-50 transition border-b border-slate-100"><td class="p-4 font-bold text-slate-800">${l.type}</td><td class="p-4 text-sm text-slate-600 line-clamp-1">${l.description}</td><td class="p-4 text-sm text-slate-500">${l.createdAt ? new Date(l.createdAt.seconds * 1000).toLocaleDateString('id-ID') : '-'}</td><td class="p-4">${statusBadge} ${l.adminNote ? `<div class="text-[10px] text-blue-600 mt-1 bg-blue-50 p-1 rounded w-max"><b>Admin:</b> ${l.adminNote}</div>` : ''}</td></tr>`;
    }).join('');
}

function openLetterModal() { document.getElementById('letterModal').classList.remove('hidden'); document.getElementById('letterForm').reset(); }
function closeLetterModal() { document.getElementById('letterModal').classList.add('hidden'); }
async function submitLetter() {
    const type = document.getElementById('letterType').value, desc = document.getElementById('letterDesc').value;
    if (!desc) return Swal.fire('Peringatan', 'Alasan wajib diisi!', 'warning');
    const data = { senderId: STUDENT_DOC_ID, senderName: STUDENT_DATA.fullName, senderRole: 'student', type: type, description: desc, status: 'Menunggu', adminNote: '', createdAt: firebase.firestore.FieldValue.serverTimestamp() };
    Swal.fire({ title: 'Mengirim...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    try { await db.collection("letters").add(data); Swal.fire('Berhasil', 'Pengajuan terkirim.', 'success'); closeLetterModal(); } catch (e) { Swal.fire('Gagal', e.message, 'error'); }
}

function startCBT(examId) {
    const exam = myExams.find(e => e.id === examId);
    if (!exam) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    // Normalisasi hari dari database
    const examDateRaw = (exam.date || "").trim();
    const [eYear, eMonth, eDay] = examDateRaw.split('-').map(Number);
    const examTimeObj = new Date(eYear, eMonth - 1, eDay).getTime();
    const todayTimeObj = new Date(year, now.getMonth(), now.getDate()).getTime();

    // Validasi Hari
    if (examTimeObj !== todayTimeObj) {
        return Swal.fire('Akses Ditolak', 'Ujian ini tidak dijadwalkan untuk hari ini.', 'error');
    }

    // Validasi Jam (Cek apakah current time sudah melewati exam.startTime)
    if (exam.startTime) {
        const [examHour, examMinute] = exam.startTime.split(':').map(Number);
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        const examTimeInMinutes = (examHour * 60) + (examMinute || 0);
        const currentTimeInMinutes = (currentHour * 60) + currentMinute;

        if (currentTimeInMinutes < examTimeInMinutes) {
            return Swal.fire('Belum Waktunya', `Ujian baru akan dibuka pada pukul ${exam.startTime} WIB.`, 'warning');
        }
    }

    // Validasi sudah dikerjakan atau belum
    const hasTaken = myGrades.find(g => g.subject === exam.subject && g.type === exam.type && g.isCBT === true);
    if (hasTaken) return Swal.fire('Sudah Dikerjakan', `Anda sudah menyelesaikan ujian ini dengan nilai ${hasTaken.score}.`, 'info');

    Swal.fire({ 
        title: 'Mulai Ujian?', 
        text: "Kamera pengawas dan mode layar penuh akan diaktifkan. Pastikan koneksi stabil.", 
        icon: 'warning', 
        showCancelButton: true, 
        confirmButtonColor: '#2563eb', 
        confirmButtonText: 'Ya, Mulai Sekarang!' 
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire('Memuat Modul CBT...', 'Sistem Ujian akan segera terbuka', 'success');
            setTimeout(() => { window.location.href = `cbt.html?examId=${examId}`; }, 1500);
        }
    });
}

// --- 7. HTML GENERATORS ---
function getHomeHTML() {
    let totalScore = 0; myGrades.forEach(g => totalScore += g.score);
    let avg = myGrades.length > 0 ? (totalScore / myGrades.length).toFixed(1) : 0;
    
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const today = days[new Date().getDay()];
    const todaySchedules = mySchedules.filter(s => s.day === today).sort((a,b) => a.startTime.localeCompare(b.startTime));

    // 1. Logika Foto Profil Asli
    const avatarSrc = STUDENT_DATA.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${STUDENT_DATA.email}&backgroundColor=bfdbfe`;

    // 2. Logika Absensi Scanner Real-time
    const todayStr = new Date().toISOString().split('T')[0];
    
    // 👇 UBAH allAttendance MENJADI myAttendance DI BARIS INI 👇
    const todayAtt = myAttendance.find(a => a.date === todayStr && a.type === 'Gerbang');
    
    let attStatusUI = `<div class="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-2"><i data-lucide="clock"></i></div>
                       <span class="text-xl md:text-2xl font-bold text-slate-400">Belum</span>
                       <span class="text-[10px] md:text-xs text-slate-500">Tap Gerbang</span>`;
                       
    if (todayAtt) {
        attStatusUI = `<div class="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2"><i data-lucide="check-circle"></i></div>
                       <span class="text-xl md:text-2xl font-bold text-slate-800">${todayAtt.time}</span>
                       <span class="text-[10px] md:text-xs text-green-600 font-bold">Sukses Hadir</span>`;
    }

    return `
    <div class="space-y-6 animate-fade-in">
        <div class="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
            <div class="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4"><i data-lucide="book-open" width="200" height="200"></i></div>
            <h1 class="text-2xl md:text-3xl font-bold mb-2">Halo, ${STUDENT_DATA.fullName.split(' ')[0]}! 👋</h1>
            <p class="opacity-90 mb-4">"Belajar dengan Semangat, Maju Bersama"</p>
            <div class="flex gap-3"><button onclick="setTab('schedule')" class="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-50 transition shadow-sm">Lihat Jadwal Hari Ini</button></div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 space-y-6">
                <div class="grid grid-cols-3 gap-4">
                    <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col items-center justify-center text-center">
                        ${attStatusUI}
                    </div>
                    <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col items-center justify-center text-center">
                        <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2"><i data-lucide="award"></i></div>
                        <span class="text-xl md:text-2xl font-bold text-slate-800">${avg}</span><span class="text-[10px] md:text-xs text-slate-500">Rata-rata Nilai</span>
                    </div>
                    <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col items-center justify-center text-center">
                        <div class="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-2"><i data-lucide="monitor-play"></i></div>
                        <span class="text-xl md:text-2xl font-bold text-slate-800">${myExams.length}</span><span class="text-[10px] md:text-xs text-slate-500">Ujian Mendatang</span>
                    </div>
                </div>
                
                <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <div class="flex justify-between items-center mb-6"><h3 class="font-bold text-slate-800">Capaian Akademik</h3><button onclick="setTab('grades')" class="text-blue-600 text-sm hover:underline font-bold">Detail</button></div>
                    <div class="h-64 w-full relative">${myGrades.length > 0 ? '<canvas id="gradesChart"></canvas>' : '<div class="flex items-center justify-center h-full text-slate-400">Belum ada data nilai.</div>'}</div>
                </div>
            </div>

            <div class="space-y-6">
                <div class="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
                    <div class="h-20 bg-blue-600 relative"><div class="absolute bottom-0 left-0 w-full h-1/2 bg-white/10 skew-y-3 origin-bottom-left"></div><div class="absolute top-4 left-4 text-white font-bold tracking-wider text-sm opacity-90">KARTU PELAJAR</div></div>
                    <div class="px-6 pb-6 pt-0 relative">
                        <div class="flex justify-between items-end -mt-10 mb-4"><img src="${avatarSrc}" class="w-20 h-20 object-cover rounded-full border-4 border-white bg-white shadow-md"><div class="text-right"><div class="text-xs text-slate-500 uppercase font-semibold">T.A</div><div class="text-sm font-bold text-slate-800">${SCHOOL_SETTINGS.academicYear}</div></div></div>
                        <h2 class="text-xl font-bold text-slate-800 leading-tight">${STUDENT_DATA.fullName}</h2><p class="text-slate-500 text-sm mb-4">NISN: ${STUDENT_DATA.nisn}</p>
                        <div class="flex justify-between items-center border-t border-slate-100 pt-4"><div><div class="text-xs text-slate-400 font-semibold uppercase">Kelas</div><div class="text-base font-bold text-blue-600">${STUDENT_DATA.kelas}</div></div><div class="w-12 h-12 bg-slate-900 rounded flex items-center justify-center"><i data-lucide="qr-code" class="text-white"></i></div></div>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                    <h3 class="font-bold text-slate-800 mb-4 flex items-center gap-2"><i data-lucide="calendar" class="text-blue-500" width="18"></i> Jadwal Hari Ini (${today})</h3>
                    <div class="space-y-3">
                        ${todaySchedules.length > 0 ? todaySchedules.map(sub => `<div class="flex gap-3 items-start p-2 rounded-lg hover:bg-slate-50 transition border border-transparent hover:border-slate-100"><div class="text-xs font-bold text-blue-600 w-16 pt-1">${sub.startTime}</div><div class="flex-1"><div class="font-bold text-slate-800 text-sm">${sub.subject}</div><div class="text-xs text-slate-500">${sub.room}</div></div></div>`).join('') : '<p class="text-sm text-slate-400 text-center py-4">Tidak ada jadwal hari ini.</p>'}
                    </div>
                    <button onclick="setTab('schedule')" class="w-full mt-4 text-center text-xs font-bold text-blue-600 uppercase tracking-wide py-2 hover:bg-blue-50 rounded-lg transition">Lihat Jadwal Lengkap</button>
                </div>
            </div>
        </div>
    </div>`;
}

function getScheduleHTML() {
    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return `
    <div class="space-y-6 animate-fade-in">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><h2 class="text-2xl font-bold text-slate-800">Rencana Pembelajaran</h2><p class="text-slate-500">Jadwal Kelas ${STUDENT_DATA.kelas}</p></div></div>
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="flex overflow-x-auto border-b border-slate-100 no-scrollbar">
                ${days.map(day => `<button onclick="setScheduleDay('${day}')" class="px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${activeScheduleDay === day ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}">${day}</button>`).join('')}
            </div>
            <div class="p-6" id="scheduleListContainer"><div class="text-center py-12 text-slate-400">Memuat jadwal...</div></div>
        </div>
    </div>`;
}

function getCbtHTML() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    // String murni (jaga-jaga sebagai fallback)
    const currentDateStr = `${year}-${month}-${day}`;
    // Date object yang dinormalisasi ke pukul 00:00:00 hari ini
    const todayTime = new Date(year, now.getMonth(), now.getDate()).getTime();

    return `
    <div class="space-y-6 animate-fade-in">
        <div><h2 class="text-2xl font-bold text-slate-800">Ujian (CBT)</h2><p class="text-slate-500">Daftar ujian dan kuis online yang tersedia untukmu</p></div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${myExams.length > 0 ? myExams.map(e => {
                const hasTaken = myGrades.find(g => g.subject === e.subject && g.type === e.type && g.isCBT === true);
                let btnHtml = '', statusBadge = '', borderColor = 'border-t-blue-500';

                // Parsing tanggal aman dari database
                const examDateRaw = (e.date || "").trim();
                let isToday = false, isFuture = false, isPast = false;

                // Konversi string tanggal DB ke Date Object agar komparasinya akurat
                // Asumsi e.date formatnya "YYYY-MM-DD"
                const [eYear, eMonth, eDay] = examDateRaw.split('-').map(Number);
                
                if (eYear && eMonth && eDay) {
                    const examTimeObj = new Date(eYear, eMonth - 1, eDay).getTime();
                    isToday = (examTimeObj === todayTime);
                    isFuture = (examTimeObj > todayTime);
                    isPast = (examTimeObj < todayTime);
                } else {
                    // Fallback kasar jika format dari DB aneh
                    isToday = (examDateRaw === currentDateStr);
                    isFuture = (examDateRaw > currentDateStr);
                    isPast = (examDateRaw < currentDateStr);
                }

                if (hasTaken) {
                    statusBadge = '<span class="px-2 py-1 rounded bg-green-100 text-green-700 text-[10px] font-bold uppercase">Selesai Dikerjakan</span>'; borderColor = 'border-t-green-500';
                    btnHtml = `<button disabled class="w-full py-2.5 bg-green-50 text-green-600 rounded-lg font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2 shadow-sm border border-green-200"><i data-lucide="check-circle" width="18"></i> Nilai Anda: ${hasTaken.score}</button>`;
                } else if (isFuture) {
                    statusBadge = '<span class="px-2 py-1 rounded bg-slate-100 text-slate-500 text-[10px] font-bold uppercase">Belum Waktunya</span>'; borderColor = 'border-t-slate-300';
                    btnHtml = `<button disabled class="w-full py-2.5 bg-slate-100 text-slate-400 rounded-lg font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"><i data-lucide="lock" width="18"></i> Belum Dibuka</button>`;
                } else if (isPast) {
                    statusBadge = '<span class="px-2 py-1 rounded bg-red-100 text-red-700 text-[10px] font-bold uppercase">Terlewat / Ditutup</span>'; borderColor = 'border-t-red-500';
                    btnHtml = `<button disabled class="w-full py-2.5 bg-red-50 text-red-500 rounded-lg font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2 shadow-sm border border-red-200"><i data-lucide="x-circle" width="18"></i> Ujian Telah Berakhir</button>`;
                } else {
                    // Hari ini (IsToday == true)
                    statusBadge = '<span class="px-2 py-1 rounded bg-blue-100 text-blue-700 text-[10px] font-bold uppercase animate-pulse">Sedang Berlangsung</span>';
                    btnHtml = `<button onclick="startCBT('${e.id}')" class="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-sm"><i data-lucide="play-circle" width="18"></i> Mulai Ujian</button>`;
                }

                return `<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition group border-t-4 ${borderColor}"><div class="flex justify-between items-start mb-4">${statusBadge}<span class="text-xs text-slate-400 font-bold"><i data-lucide="clock" class="inline w-3 h-3"></i> ${e.duration || '-'} Menit</span></div><h3 class="text-lg font-bold text-slate-800 mb-1 leading-tight">${e.subject}</h3><p class="text-sm text-slate-500 mb-4 font-medium"><i data-lucide="calendar" class="inline w-4 h-4 mr-1"></i> ${new Date(examDateRaw).toLocaleDateString('id-ID')} - ${e.startTime || '-'}</p>${btnHtml}</div>`;
            }).join('') : '<div class="col-span-full p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">Belum ada ujian yang dijadwalkan.</div>'}
        </div>
    </div>`;
}

function getGradesHTML() {
    const subjectAverages = {};
    myGrades.forEach(g => { if(!subjectAverages[g.subject]) subjectAverages[g.subject] = { total: 0, count: 0 }; subjectAverages[g.subject].total += g.score; subjectAverages[g.subject].count += 1; });
    const rows = Object.entries(subjectAverages).map(([subject, data]) => {
        const avg = Math.round(data.total / data.count); let predicate = avg >= 90 ? 'A' : avg >= 80 ? 'B' : avg >= 70 ? 'C' : 'D'; let color = avg >= 90 ? 'bg-green-100 text-green-700' : avg >= 80 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'; let status = avg >= 75 ? '<span class="text-green-600 font-bold">Tuntas</span>' : '<span class="text-red-500 font-bold">Remedial</span>';
        return `<tr class="hover:bg-slate-50 transition border-b border-slate-100"><td class="p-4 font-bold text-slate-800">${subject}</td><td class="p-4 text-center font-bold text-slate-400">75</td><td class="p-4 text-center font-bold text-lg text-slate-800">${avg}</td><td class="p-4 text-center"><span class="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs ${color}">${predicate}</span></td><td class="p-4">${status}</td></tr>`;
    }).join('');

    return `
    <div class="space-y-6 animate-fade-in">
        <div class="flex justify-between items-center"><div><h2 class="text-2xl font-bold text-slate-800">Laporan Hasil Belajar</h2><p class="text-slate-500">Semester ${SCHOOL_SETTINGS.semester} - T.A ${SCHOOL_SETTINGS.academicYear}</p></div><button onclick="Swal.fire('Info','Rapor resmi bisa diambil melalui Wali Kelas Anda.','info')" class="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition border border-blue-200"><i data-lucide="printer" width="16"></i> Info Cetak</button></div>
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden"><div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead><tr class="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold"><th class="p-4 border-b border-slate-200">Mata Pelajaran</th><th class="p-4 border-b border-slate-200 text-center">KKM</th><th class="p-4 border-b border-slate-200 text-center">Rata-rata Nilai</th><th class="p-4 border-b border-slate-200 text-center">Predikat</th><th class="p-4 border-b border-slate-200">Keterangan</th></tr></thead><tbody class="text-sm divide-y divide-slate-100">${Object.keys(subjectAverages).length > 0 ? rows : '<tr><td colspan="5" class="p-8 text-center text-slate-400">Belum ada nilai yang masuk.</td></tr>'}</tbody></table></div></div>
    </div>`;
}

function getAnnouncementsHTML() {
    return `
    <div class="space-y-6 animate-fade-in">
        <div><h2 class="text-2xl font-bold text-slate-800">Papan Pengumuman</h2><p class="text-slate-500">Informasi dan event sekolah terbaru</p></div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${allAnnouncements.length > 0 ? allAnnouncements.map(a => { const dateStr = a.createdAt ? new Date(a.createdAt.seconds * 1000).toLocaleDateString('id-ID', {day: 'numeric', month: 'long'}) : 'Baru saja'; return `<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col"><div class="flex items-center gap-3 mb-3"><div class="p-2 bg-blue-100 text-blue-600 rounded-lg"><i data-lucide="megaphone" width="20"></i></div><div><h3 class="font-bold text-slate-800 leading-tight">${a.title}</h3><p class="text-[10px] text-slate-400 font-medium mt-1">${dateStr} • ${a.type}</p></div></div><p class="text-sm text-slate-600 mt-2 flex-1 whitespace-pre-wrap leading-relaxed">${a.content}</p></div>`; }).join('') : '<div class="col-span-full p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">Belum ada pengumuman.</div>'}
        </div>
    </div>`;
}

function getLettersHTML() {
    return `
    <div class="space-y-6 animate-fade-in">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div><h2 class="text-2xl font-bold text-slate-800">Surat & Izin</h2><p class="text-slate-500">Ajukan surat izin sakit atau keterangan siswa aktif</p></div><button onclick="openLetterModal()" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2 text-sm"><i data-lucide="plus" width="16"></i> Buat Pengajuan</button></div>
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead class="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200"><tr><th class="p-4">Jenis & Keterangan</th><th class="p-4 w-32">Tanggal</th><th class="p-4">Status</th></tr></thead><tbody id="studentLettersBody" class="text-sm divide-y divide-slate-100"><tr><td colspan="3" class="p-8 text-center text-slate-500">Memuat pengajuan...</td></tr></tbody></table></div></div>
    </div>`;
}

function getProfileHTML() {
    // Siapkan data dengan fallback (jika data kosong)
    const dobStr = STUDENT_DATA.dob ? new Date(STUDENT_DATA.dob).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : '-';
    const pobStr = STUDENT_DATA.pob || '-';
    const parentStr = STUDENT_DATA.parentName || '-';
    return `
    <div class="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10">
        
        <div class="relative w-full h-48 md:h-64 rounded-[2rem] bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 overflow-hidden shadow-2xl">
            <div class="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/4"></div>
            <div class="absolute bottom-0 left-0 w-48 h-48 bg-blue-500 opacity-20 rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/4"></div>
            <i data-lucide="fingerprint" class="absolute top-4 right-4 text-white/10 w-40 h-40 transform rotate-12"></i>
            
            <div class="absolute top-6 left-6 md:top-8 md:left-8">
                <span class="px-4 py-1.5 bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-widest rounded-full shadow-lg">
                    Identitas Digital Siswa
                </span>
            </div>
        </div>

        <div class="relative bg-white rounded-[2rem] shadow-sm border border-slate-100 px-6 md:px-10 pb-10 -mt-24 mx-4 md:mx-8 z-10">
            
            <div class="absolute -top-16 left-1/2 transform -translate-x-1/2">
                <div class="relative group">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${STUDENT_DATA.email}&backgroundColor=bfdbfe" 
                         class="w-32 h-32 rounded-full border-[6px] border-white bg-slate-50 shadow-xl object-cover transition-transform duration-300 group-hover:scale-105">
                    <div class="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-white rounded-full shadow-sm" title="Status Aktif"></div>
                </div>
            </div>

            <div class="text-center pt-24 mb-10">
                <h2 class="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">${STUDENT_DATA.fullName}</h2>
                <div class="mt-2 flex items-center justify-center gap-2">
                    <p class="text-slate-600 font-mono text-sm bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg shadow-inner">
                        NISN: ${STUDENT_DATA.nisn}
                    </p>
                </div>
                <div class="mt-5 flex justify-center gap-3">
                    <span class="px-4 py-2 bg-blue-50 text-blue-700 font-bold text-sm rounded-xl border border-blue-100 flex items-center gap-2 transition hover:bg-blue-100">
                        <i data-lucide="book-open" width="18"></i> Kelas ${STUDENT_DATA.kelas}
                    </span>
                    <span class="px-4 py-2 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-xl border border-indigo-100 flex items-center gap-2 transition hover:bg-indigo-100">
                        <i data-lucide="award" width="18"></i> Siswa Aktif
                    </span>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div class="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-100 hover:border-blue-200 transition-colors group shadow-sm">
                    <div class="flex items-center gap-4 mb-6 pb-4 border-b border-slate-200/60">
                        <div class="p-3 bg-white rounded-xl shadow-sm text-blue-600 group-hover:scale-110 transition-transform"><i data-lucide="user"></i></div>
                        <h3 class="font-bold text-slate-800 text-lg">Data Pribadi</h3>
                    </div>
                    <div class="space-y-5">
                        <div>
                            <p class="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">Email Sekolah</p>
                            <p class="font-medium text-slate-800 text-sm md:text-base">${STUDENT_DATA.email}</p>
                        </div>
                        <div>
                            <p class="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tempat, Tanggal Lahir</p>
                            <p class="font-medium text-slate-800 text-sm md:text-base">${pobStr}, ${dobStr}</p>
                        </div>
                        <div>
                            <p class="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">Nama Orang Tua / Wali</p>
                            <p class="font-medium text-slate-800 text-sm md:text-base">${parentStr}</p>
                        </div>
                    </div>
                </div>

                <div class="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-100 hover:border-blue-200 transition-colors group shadow-sm flex flex-col justify-between">
                    <div>
                        <div class="flex items-center gap-4 mb-6 pb-4 border-b border-slate-200/60">
                            <div class="p-3 bg-white rounded-xl shadow-sm text-indigo-600 group-hover:scale-110 transition-transform"><i data-lucide="shield-check"></i></div>
                            <h3 class="font-bold text-slate-800 text-lg">Keamanan Akun</h3>
                        </div>
                        <div class="space-y-5 mb-8">
                            <div>
                                <p class="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Kata Sandi Akses</p>
                                <p class="font-mono text-slate-600 bg-slate-200/50 px-3 py-1.5 rounded border border-slate-200 inline-block text-sm tracking-widest shadow-inner">
                                    ••••••••
                                </p>
                            </div>
                            <div>
                                <p class="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">Sistem Enkripsi</p>
                                <p class="font-bold text-green-600 flex items-center gap-2 text-sm bg-green-50 px-3 py-2 rounded-lg w-max border border-green-100">
                                    <i data-lucide="check-circle-2" width="16"></i> Dilindungi Firebase Auth
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <button onclick="Swal.fire('Informasi', 'Permintaan perubahan kata sandi harus diajukan langsung kepada Admin Sekolah atau Wali Kelas Anda.', 'info')" class="w-full py-3.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow">
                        <i data-lucide="key" width="18"></i> Ajukan Ganti Sandi
                    </button>
                </div>

            </div>
        </div>
    </div>`;
}

// ==========================================
// FITUR E-LIBRARY (PERPUSTAKAAN DIGITAL SISWA)
// ==========================================

function getLibraryHTML() {
    return `
    <div class="space-y-6 animate-fade-in pb-10">
        <div class="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
            <div class="absolute top-0 right-0 opacity-20 transform translate-x-4 -translate-y-4">
                <i data-lucide="library" width="180" height="180"></i>
            </div>
            <h1 class="text-2xl md:text-3xl font-bold mb-2">E-Library Digital</h1>
            <p class="text-slate-400 mb-6 max-w-xl">Jelajahi ribuan literatur fisik maupun E-Book secara gratis. Pinjam buku fisik atau baca PDF langsung dari gawaimu.</p>
            
            <div class="flex flex-col md:flex-row gap-3 relative z-10">
                <div class="relative flex-1">
                    <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="18"></i>
                    <input type="text" id="libSearch" oninput="renderLibraryGrid()" placeholder="Cari judul buku atau penulis..." class="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm">
                </div>
                <select id="libCategory" onchange="renderLibraryGrid()" class="py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm [&>option]:text-slate-900">
                    <option value="Semua">Semua Kategori</option>
                    <option value="Buku Pelajaran">Buku Pelajaran</option>
                    <option value="Novel Remaja">Novel Remaja</option>
                    <option value="Karya Ilmiah">Karya Ilmiah (Alumni)</option>
                    <option value="Pengayaan">Buku Pengayaan</option>
                </select>
                <select id="libType" onchange="renderLibraryGrid()" class="py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm [&>option]:text-slate-900">
                    <option value="Semua">Semua Tipe</option>
                    <option value="E-Book">E-Book (PDF)</option>
                    <option value="Fisik">Buku Fisik</option>
                </select>
            </div>
        </div>

        <div id="activeBorrowAlert"></div>

        <div id="libraryGrid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            <div class="col-span-full p-8 text-center text-slate-500">Memuat koleksi buku...</div>
        </div>
    </div>`;
}

function renderLibraryGrid() {
    const grid = document.getElementById('libraryGrid');
    const alertBox = document.getElementById('activeBorrowAlert');
    if (!grid) return;

    const searchTerm = (document.getElementById('libSearch')?.value || "").toLowerCase();
    const catFilter = document.getElementById('libCategory')?.value || "Semua";
    const typeFilter = document.getElementById('libType')?.value || "Semua";

    // Notifikasi jika ada peminjaman buku fisik yang sedang berjalan/menunggu
    const activeReqs = myBorrowRequests.filter(r => r.status === 'Menunggu Persetujuan' || r.status === 'Dipinjam');
    if (activeReqs.length > 0 && alertBox) {
        alertBox.innerHTML = activeReqs.map(r => `
            <div class="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between shadow-sm mb-4">
                <div class="flex items-center gap-3">
                    <div class="p-2 ${r.status === 'Dipinjam' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'} rounded-lg"><i data-lucide="${r.status === 'Dipinjam' ? 'book-open-check' : 'clock'}" width="20"></i></div>
                    <div>
                        <p class="text-sm font-bold text-slate-800">${r.bookTitle}</p>
                        <p class="text-xs ${r.status === 'Dipinjam' ? 'text-green-600' : 'text-orange-600'} font-medium">Status: ${r.status}</p>
                    </div>
                </div>
            </div>
        `).join('');
    } else if (alertBox) { alertBox.innerHTML = ''; }

    // Filter Data
    const filteredBooks = allBooks.filter(b => {
        const matchSearch = (b.title || "").toLowerCase().includes(searchTerm) || (b.author || "").toLowerCase().includes(searchTerm);
        const matchCat = catFilter === "Semua" || b.category === catFilter;
        const matchType = typeFilter === "Semua" || b.type === typeFilter;
        return matchSearch && matchCat && matchType;
    });

    if (filteredBooks.length === 0) {
        return grid.innerHTML = `<div class="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm"><i data-lucide="book-x" class="mx-auto text-slate-300 mb-3" width="48" height="48"></i><p class="text-slate-500 font-medium">Buku tidak ditemukan.</p></div>`;
    }

    grid.innerHTML = filteredBooks.map(b => {
        const coverImg = b.coverUrl || `https://ui-avatars.com/api/?name=${b.title}&background=f8fafc&color=94a3b8&size=300&font-size=0.25&length=3`;
        const isEbook = b.type === 'E-Book';
        const badgeUI = isEbook 
            ? `<span class="absolute top-2 right-2 bg-blue-600/90 backdrop-blur text-white px-2 py-1 text-[10px] font-bold rounded shadow-sm"><i data-lucide="smartphone" class="inline w-3 h-3 mr-1"></i>E-Book</span>`
            : `<span class="absolute top-2 right-2 bg-orange-500/90 backdrop-blur text-white px-2 py-1 text-[10px] font-bold rounded shadow-sm"><i data-lucide="book" class="inline w-3 h-3 mr-1"></i>Fisik</span>`;
        
        let actionUI = '';
        if (isEbook) {
            actionUI = `<button onclick="readEbook('${b.id}', '${b.title.replace(/'/g, "\\'")}')" class="w-full py-2 bg-blue-50 text-blue-600 font-bold text-xs rounded hover:bg-blue-600 hover:text-white transition-colors border border-blue-100 hover:border-blue-600">Baca E-Book</button>`;
        } else {
            const stock = b.stock || 0;
            if (stock > 0) {
                // Cek apakah siswa sudah meminjam buku ini
                const isAlreadyRequested = activeReqs.some(r => r.bookId === b.id);
                if(isAlreadyRequested) {
                    actionUI = `<button disabled class="w-full py-2 bg-slate-100 text-slate-400 font-bold text-xs rounded cursor-not-allowed border border-slate-200">Sedang Diproses</button>`;
                } else {
                    actionUI = `<button onclick="requestBorrowBook('${b.id}', '${b.title.replace(/'/g, "\\'")}')" class="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded hover:bg-slate-800 transition-colors">Pinjam Buku</button>`;
                }
            } else {
                actionUI = `<button disabled class="w-full py-2 bg-red-50 text-red-500 font-bold text-xs rounded cursor-not-allowed border border-red-100">Stok Habis</button>`;
            }
        }

        return `
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col">
            <div class="relative aspect-[2/3] bg-slate-100 overflow-hidden">
                <img src="${coverImg}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                ${badgeUI}
                ${!isEbook ? `<div class="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 text-white"><p class="text-[10px] font-medium opacity-80 uppercase tracking-wider">Stok Tersedia</p><p class="font-bold text-sm">${b.stock || 0} Buku</p></div>` : ''}
            </div>
            <div class="p-4 flex flex-col flex-1 justify-between">
                <div class="mb-4">
                    <p class="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">${b.category}</p>
                    <h3 class="font-bold text-slate-800 leading-snug line-clamp-2" title="${b.title}">${b.title}</h3>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-1">${b.author || 'Anonim'}</p>
                </div>
                ${actionUI}
            </div>
        </div>`;
    }).join('');
    lucide.createIcons();
}

function readEbook(bookId, title) {
    // Tanpa animasi, langsung tembak ke halaman reader!
    window.location.href = `reader.html?bookId=${bookId}`;
}

function requestBorrowBook(bookId, title) {
    Swal.fire({
        title: 'Pinjam Buku Fisik?',
        html: `Kamu akan mengajukan peminjaman untuk buku:<br><b class="text-slate-800">${title}</b><br><br><span class="text-xs text-slate-500">Silakan ambil buku di perpustakaan setelah Admin menyetujui pengajuan ini.</span>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Ajukan Pinjam',
        cancelButtonText: 'Batal'
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Memproses...', didOpen: () => Swal.showLoading() });
            try {
                // Tambahkan request ke koleksi borrow_requests
                await db.collection("borrow_requests").add({
                    studentId: STUDENT_DOC_ID,
                    studentName: STUDENT_DATA.fullName,
                    class: STUDENT_DATA.kelas,
                    bookId: bookId,
                    bookTitle: title,
                    status: 'Menunggu Persetujuan',
                    requestDate: firebase.firestore.FieldValue.serverTimestamp(),
                    returnDate: null
                });
                Swal.fire('Berhasil Diajukan!', 'Pantau statusnya di bagian atas E-Library.', 'success');
            } catch (error) {
                Swal.fire('Gagal', error.message, 'error');
            }
        }
    });
}

// ==========================================
// FITUR PENGATURAN AKUN SISWA
// ==========================================

function getSettingsHTML() {
    const avatarSrc = STUDENT_DATA.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${STUDENT_DATA.email}&backgroundColor=bfdbfe`;
    
    return `
    <div class="space-y-6 animate-fade-in max-w-3xl mx-auto pb-10">
        <div>
            <h2 class="text-2xl font-bold text-slate-800">Pengaturan Akun</h2>
            <p class="text-slate-500">Perbarui profil, foto, dan kata sandi Anda</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
            <form id="studentSettingsForm" onsubmit="saveStudentSettings(event)" class="space-y-5">
                
                <div class="flex items-center gap-6 mb-6 pb-6 border-b border-slate-100">
                    <img id="settingAvatarPreview" src="${avatarSrc}" class="w-20 h-20 rounded-full border-4 border-slate-100 object-cover shadow-sm">
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Foto Profil (Avatar)</label>
                        <input type="file" id="settingPhoto" accept="image/*" onchange="handleSettingPhoto(event)" class="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer">
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Email (Hanya Baca)</label>
                        <input type="text" value="${STUDENT_DATA.email}" disabled class="w-full border border-slate-200 bg-slate-50 rounded-lg py-2.5 px-3 text-sm text-slate-500 cursor-not-allowed">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">No. HP / WhatsApp Pribadi</label>
                        <input type="text" id="setPhone" value="${STUDENT_DATA.parentPhone || ''}" placeholder="0812xxxx" class="w-full border border-slate-300 rounded-lg py-2.5 px-3 text-sm focus:ring-blue-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Hobi</label>
                        <input type="text" id="setHobbies" value="${STUDENT_DATA.hobbies || ''}" placeholder="Membaca, Olahraga..." class="w-full border border-slate-300 rounded-lg py-2.5 px-3 text-sm focus:ring-blue-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Cita-cita</label>
                        <input type="text" id="setAmbition" value="${STUDENT_DATA.ambition || ''}" placeholder="Dokter, Programmer..." class="w-full border border-slate-300 rounded-lg py-2.5 px-3 text-sm focus:ring-blue-500 outline-none">
                    </div>
                </div>

                <div class="pt-6 mt-6 border-t border-slate-100">
                    <h3 class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><i data-lucide="shield-check" class="text-green-600" width="18"></i> Keamanan Akun</h3>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Ganti Kata Sandi (Opsional)</label>
                        <input type="password" id="setNewPassword" placeholder="Kosongkan jika tidak ingin mengubah sandi" class="w-full md:w-1/2 border border-slate-300 rounded-lg py-2.5 px-3 text-sm focus:ring-blue-500 outline-none">
                    </div>
                </div>

                <div class="pt-6 flex justify-end">
                    <button type="submit" class="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-md flex items-center gap-2"><i data-lucide="save" width="18"></i> Simpan Perubahan</button>
                </div>
            </form>
        </div>
    </div>`;
}
let settingPhotoBase64 = null;

function handleSettingPhoto(event) {
    const file = event.target.files[0]; if(!file) return;
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = function(e) {
        const img = new Image(); img.src = e.target.result;
        img.onload = function() {
            const canvas = document.createElement('canvas'); 
            const MAX = 400; let width = img.width, height = img.height;
            if(width > height) { if(width > MAX) { height *= MAX / width; width = MAX; } } 
            else { if(height > MAX) { width *= MAX / height; height = MAX; } }
            canvas.width = width; canvas.height = height; 
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
            settingPhotoBase64 = canvas.toDataURL('image/jpeg', 0.8);
            document.getElementById('settingAvatarPreview').src = settingPhotoBase64;
        }
    }
}

async function saveStudentSettings(e) {
    e.preventDefault();
    const phone = document.getElementById('setPhone').value;
    const hobbies = document.getElementById('setHobbies').value;
    const ambition = document.getElementById('setAmbition').value;
    const newPass = document.getElementById('setNewPassword').value;

    Swal.fire({ title: 'Menyimpan Profil...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    
    try {
        let updateData = {
            parentPhone: phone,
            hobbies: hobbies,
            ambition: ambition,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (settingPhotoBase64) {
            updateData.photoUrl = settingPhotoBase64;
        }

        // Jika mengubah kata sandi
        if (newPass) {
            const user = auth.currentUser;
            if(user) await user.updatePassword(newPass);
            updateData.password = newPass; // Update juga di database agar admin bisa lihat
        }

        await db.collection("students").doc(STUDENT_DOC_ID).update(updateData);
        
        // Sinkronisasi data di layar langsung (tanpa perlu refresh)
        STUDENT_DATA = { ...STUDENT_DATA, ...updateData };
        if(settingPhotoBase64) document.getElementById('header-avatar').src = settingPhotoBase64;

        Swal.fire('Sukses', 'Pengaturan profil berhasil diperbarui!', 'success');
        document.getElementById('setNewPassword').value = ''; // Kosongkan form password
        
    } catch (err) {
        if (err.code === 'auth/requires-recent-login') {
            Swal.fire('Akses Ditolak', 'Demi keamanan, Anda harus Logout dan Login kembali sebelum dapat mengubah Kata Sandi.', 'error');
        } else {
            Swal.fire('Error', err.message, 'error');
        }
    }
}


// ==========================================
// FITUR LABORATORIUM DIGITAL (VIRTUAL LAB)
// ==========================================

function getLabHTML() {
    return `
    <div class="space-y-6 animate-fade-in pb-10">
        <div class="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
            <div class="absolute top-0 right-0 opacity-20 transform translate-x-4 -translate-y-4">
                <i data-lucide="flask-conical" width="180" height="180"></i>
            </div>
            <h1 class="text-2xl md:text-3xl font-bold mb-2">Virtual Laboratory</h1>
            <p class="text-indigo-200 mb-6 max-w-xl">Lakukan eksperimen sains secara interaktif. Pilih modul simulasi dan jelajahi keajaiban ilmu pengetahuan langsung dari layarmu.</p>
            
            <div class="flex flex-col md:flex-row gap-3 relative z-10">
                <div class="relative flex-1">
                    <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300" width="18"></i>
                    <input type="text" id="labSearch" oninput="renderLabGrid()" placeholder="Cari modul eksperimen..." class="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 backdrop-blur-sm">
                </div>
                <select id="labSubject" onchange="renderLabGrid()" class="py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 backdrop-blur-sm [&>option]:text-slate-900">
                    <option value="Semua">Semua Mata Pelajaran</option>
                    <option value="Fisika">Fisika</option>
                    <option value="Kimia">Kimia</option>
                    <option value="Biologi">Biologi</option>
                    <option value="Geologi">Geologi</option>
                    <option value="Astronomi">Astronomi</option>
                    <option value="Ekologi">Ekologi</option>
                </select>
            </div>
        </div>

        <div id="labGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            </div>
    </div>`;
}

function renderLabGrid() {
    const grid = document.getElementById('labGrid');
    if (!grid) return;

    const searchTerm = (document.getElementById('labSearch')?.value || "").toLowerCase();
    const subjectFilter = document.getElementById('labSubject')?.value || "Semua";

    const filteredLabs = VIRTUAL_LABS.filter(lab => {
        const matchSearch = lab.title.toLowerCase().includes(searchTerm) || lab.topic.toLowerCase().includes(searchTerm);
        const matchSubject = subjectFilter === "Semua" || lab.subject === subjectFilter;
        return matchSearch && matchSubject;
    });

    if (filteredLabs.length === 0) {
        return grid.innerHTML = `<div class="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm"><i data-lucide="flask-round" class="mx-auto text-slate-300 mb-3" width="48" height="48"></i><p class="text-slate-500 font-medium">Modul simulasi tidak ditemukan.</p></div>`;
    }

    grid.innerHTML = filteredLabs.map(lab => {
        // Kita gunakan trik Emoji besar sebagai "Gambar Cover" sementara jika tidak ada gambar asli
        return `
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col">
            <div class="${lab.color} h-32 flex items-center justify-center relative overflow-hidden">
                <div class="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                <span class="text-6xl group-hover:scale-110 transition-transform duration-300 drop-shadow-md">${lab.emoji}</span>
                <span class="absolute top-2 right-2 bg-white/90 backdrop-blur text-slate-800 px-2 py-1 text-[10px] font-bold rounded shadow-sm">${lab.subject}</span>
            </div>
            <div class="p-4 flex flex-col flex-1 justify-between">
                <div class="mb-5">
                    <h3 class="font-bold text-slate-800 leading-snug line-clamp-2 mb-1">${lab.title}</h3>
                    <p class="text-xs font-medium text-slate-500 flex items-center gap-1"><i data-lucide="book-open" width="12"></i> ${lab.topic}</p>
                </div>
                <button onclick="launchLab('${lab.file}', '${lab.title.replace(/'/g, "\\'")}')" class="w-full py-2.5 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-lg hover:bg-indigo-600 hover:text-white transition-colors border border-indigo-100 hover:border-indigo-600 flex items-center justify-center gap-2">
                    <i data-lucide="play" width="14"></i> Mulai Simulasi
                </button>
            </div>
        </div>`;
    }).join('');
    
    lucide.createIcons();
}

function launchLab(filename, title) {
    Swal.fire({
        title: 'Membuka Laboratorium...',
        text: `Menyiapkan alat dan bahan untuk: ${title}`,
        icon: 'info',
        timer: 1500,
        showConfirmButton: false,
        willClose: () => {
            // Mengarahkan path ke dalam folder virtua-lab
            window.open(`virtual-lab/${filename}`, '_blank'); 
        }
    });
}