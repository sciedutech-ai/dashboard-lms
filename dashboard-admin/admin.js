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

// --- 2. STATE & STATIC DATA ---
let ADMIN_DATA = null; 
let currentTab = 'dashboard';
let allBooks = [];
let allBorrowRequests = [];
let bookCoverBase64 = null;
let allStudents = []; 
let allTeachers = []; 
let allSchedules = []; 
let allExams = []; 
let allAnnouncements = []; 
let allLetters = []; // Array untuk Surat Menyurat
let totalTransactionsCount = 0;
let chartInstance = null;
let compressedImageBase64 = null;
let studentPhotoBase64 = null;
let teacherPhotoBase64 = null;

const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { id: 'students', label: 'Manajemen Siswa', icon: 'graduation-cap' },
    { id: 'teachers', label: 'Manajemen Guru', icon: 'users' },
    { id: 'schedule', label: 'Jadwal Pelajaran', icon: 'calendar' }, 
    { id: 'exams', label: 'Jadwal Ujian (CBT)', icon: 'monitor-check' }, 
    { id: 'finance', label: 'Keuangan / SPP', icon: 'wallet' },
    { id: 'library', label: 'E-Library Perpus', icon: 'library' },
    { id: 'announcements', label: 'Pengumuman', icon: 'megaphone' },
    { id: 'letters', label: 'Surat Menyurat', icon: 'mail' }, // Tab Surat Baru
    { id: 'settings', label: 'Pengaturan', icon: 'settings' }, // Tab Pengaturan Aktif

];

const ATTENDANCE_CHART_DATA = [ { name: 'Sen', hadir: 98 }, { name: 'Sel', hadir: 96 }, { name: 'Rab', hadir: 97 }, { name: 'Kam', hadir: 95 }, { name: 'Jum', hadir: 92 }, { name: 'Sab', hadir: 99 } ];
const RECENT_ACTIVITIES = [ { id: 1, user: "Pak Hery", action: "mengupload nilai", target: "Matematika IX", time: "2 jam lalu" }, { id: 2, user: "Sistem", action: "Backup Data Otomatis", target: "Server Utama", time: "Kemarin" } ];

function getCurrentMonthIndo() { const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]; return months[new Date().getMonth()]; }

// --- 3. AUTENTIKASI ADMIN ---
auth.onAuthStateChanged((user) => {
    const loginContainer = document.getElementById('login-container'), appContainer = document.getElementById('app-container');
    if (user) {
        if (loginContainer) loginContainer.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
        ADMIN_DATA = { name: user.displayName || "Administrator Utama", email: user.email, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}&backgroundColor=c0aede` };
        initDashboard();
    } else {
        if (loginContainer) loginContainer.classList.remove('hidden');
        if (appContainer) appContainer.classList.add('hidden');
        ADMIN_DATA = null;
    }
});

async function handleAdminLogin(event) {
    event.preventDefault(); 
    const email = document.getElementById('adminEmail').value, password = document.getElementById('adminPassword').value, btn = document.getElementById('btnLogin');
    btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin" width="18"></i> Memproses...`; btn.disabled = true;
    try { await auth.signInWithEmailAndPassword(email, password); Swal.fire({ icon: 'success', title: 'Berhasil Masuk', timer: 1500, showConfirmButton: false }); } 
    catch (error) { Swal.fire('Login Gagal', "Email atau Password salah.", 'error'); } 
    finally { btn.innerHTML = `Masuk Sistem <i data-lucide="arrow-right" width="18"></i>`; btn.disabled = false; lucide.createIcons(); }
}
function handleAdminLogout() { Swal.fire({ title: 'Keluar Sistem?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Ya, Keluar!' }).then((r) => { if (r.isConfirmed) auth.signOut(); }); }

// --- 4. INIT & NAVIGATION ---
function initDashboard() {
    document.getElementById('admin-name').innerText = ADMIN_DATA.name; document.getElementById('admin-email').innerText = ADMIN_DATA.email; document.getElementById('admin-avatar').src = ADMIN_DATA.avatar;
    renderNavigation(); listenToDatabase(); renderContent();
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
        const newSearch = globalSearch.cloneNode(true); globalSearch.parentNode.replaceChild(newSearch, globalSearch);
        newSearch.addEventListener('input', (e) => {
            if (currentTab === 'students') filterStudents(e.target.value);
            if (currentTab === 'teachers') filterTeachers(e.target.value);
            if (currentTab === 'finance') filterFinance(e.target.value);
            if (currentTab === 'exams') filterExams(e.target.value);
            if (currentTab === 'announcements') filterAnnouncements(e.target.value);
            if (currentTab === 'letters') filterLetters(e.target.value);
        });
    }
}

function listenToDatabase() {
    db.collection("students").orderBy("createdAt", "desc").onSnapshot((snap) => { allStudents = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); });
    db.collection("teachers").orderBy("createdAt", "desc").onSnapshot((snap) => { allTeachers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); });
    db.collection("schedules").onSnapshot((snap) => { allSchedules = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); });
    db.collection("exams").onSnapshot((snap) => { allExams = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); }); 
    db.collection("announcements").orderBy("createdAt", "desc").onSnapshot((snap) => { allAnnouncements = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); }); 
    db.collection("letters").orderBy("createdAt", "desc").onSnapshot((snap) => { allLetters = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); }); // Listener Surat
    db.collection("transactions").onSnapshot((snap) => { totalTransactionsCount = snap.size; updateActiveViewData(); });
    db.collection("books").orderBy("createdAt", "desc").onSnapshot((snap) => { allBooks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); });
    db.collection("borrow_requests").orderBy("requestDate", "desc").onSnapshot((snap) => { allBorrowRequests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); });
    
    // Auto-fill pengaturan
    db.collection("settings").doc("general").onSnapshot((doc) => {
        if(doc.exists && currentTab === 'settings') {
            document.getElementById('setSchoolName').value = doc.data().schoolName || "";
            document.getElementById('setHeadmaster').value = doc.data().headmaster || "";
            document.getElementById('setAcademicYear').value = doc.data().academicYear || "";
            document.getElementById('setSemester').value = doc.data().semester || "Ganjil";
        }
    });
}

function renderNavigation() {
    const container = document.getElementById('nav-container'); if (!container) return;
    container.innerHTML = NAV_ITEMS.map(item => `<button onclick="setTab('${item.id}')" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${currentTab === item.id ? 'bg-green-600 text-white font-medium shadow-lg shadow-green-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}"><i data-lucide="${item.icon}" class="${currentTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}" width="20"></i>${item.label}</button>`).join('');
    lucide.createIcons();
}

function setTab(tabId) {
    currentTab = tabId; const navItem = NAV_ITEMS.find(n => n.id === tabId); document.getElementById('page-title').innerText = navItem ? navItem.label : 'Admin Panel';
    const sidebar = document.getElementById('sidebar'); if (sidebar && sidebar.classList.contains('open')) toggleMobileMenu();
    renderNavigation(); renderContent();
}

function toggleMobileMenu() { const sidebar = document.getElementById('sidebar'), overlay = document.getElementById('mobile-overlay'); if (sidebar && overlay) { sidebar.classList.toggle('open'); overlay.classList.toggle('hidden'); } }

// --- 5. VIEW RENDERING ---
function renderContent() {
    const container = document.getElementById('main-content'); if (!container) return;
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    switch(currentTab) {
        case 'dashboard': container.innerHTML = getDashboardHTML(); initDashboardChart(); break;
        case 'students': container.innerHTML = getStudentsHTML(); break;
        case 'teachers': container.innerHTML = getTeachersHTML(); break;
        case 'schedule': container.innerHTML = getScheduleHTML(); break;
        case 'exams': container.innerHTML = getExamsHTML(); break; 
        case 'finance': container.innerHTML = getFinanceHTML(); break;
        case 'library': container.innerHTML = getLibraryAdminHTML(); renderLibraryAdmin(); break;
        case 'announcements': container.innerHTML = getAnnouncementsHTML(); break; 
        case 'letters': container.innerHTML = getLettersHTML(); break; 
        case 'settings': container.innerHTML = getSettingsHTML(); db.collection("settings").doc("general").get().then(doc=>{ if(doc.exists){ document.getElementById('setSchoolName').value = doc.data().schoolName||""; document.getElementById('setHeadmaster').value = doc.data().headmaster||""; document.getElementById('setAcademicYear').value = doc.data().academicYear||""; document.getElementById('setSemester').value = doc.data().semester||"Ganjil"; } }); break; 
        default: container.innerHTML = getUnderConstructionHTML();
    }
    lucide.createIcons(); updateActiveViewData();
}

function updateActiveViewData() {
    if (currentTab === 'dashboard') { const cSiswa = document.getElementById('stat-val-total-siswa'), cGuru = document.getElementById('stat-val-total-guru'); if (cSiswa) cSiswa.innerText = allStudents.length.toLocaleString(); if (cGuru) cGuru.innerText = allTeachers.length.toLocaleString(); } 
    else if (currentTab === 'students') { const c = document.getElementById("totalStudentsCount"); if(c) c.innerText = allStudents.length.toLocaleString(); filterStudents(); }
    else if (currentTab === 'teachers') { const c = document.getElementById("totalTeachersCount"); if(c) c.innerText = allTeachers.length.toLocaleString(); filterTeachers(); }
    else if (currentTab === 'schedule') { filterSchedules(); }
    else if (currentTab === 'exams') { filterExams(); } 
    else if (currentTab === 'finance') { updateFinanceStats(); filterFinance(); }
    else if (currentTab === 'announcements') { filterAnnouncements(); } 
    else if (currentTab === 'letters') { filterLetters(); } 
}

async function createUserAuth(email, password) { const appName = "SecondaryApp_" + Date.now(); const secondaryApp = firebase.initializeApp(firebaseConfig, appName); const secondaryAuth = secondaryApp.auth(); try { const cred = await secondaryAuth.createUserWithEmailAndPassword(email, password); await secondaryApp.delete(); return cred.user.uid; } catch (e) { await secondaryApp.delete(); throw e; } }

// --- 6A. SISWA ---
function filterStudents(globalSearchTerm = "") { const classFilter = document.getElementById('classFilter')?.value || "All", term = (globalSearchTerm || document.getElementById('tableSearch')?.value || "").toLowerCase(); const filtered = allStudents.filter(s => (classFilter === "All" || s.kelas === classFilter) && ((s.fullName||"").toLowerCase().includes(term) || (s.nisn||"").includes(term))); const tbody = document.getElementById('studentsTableBody'); if (!tbody) return; if (filtered.length === 0) return tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-500">Data tidak ditemukan.</td></tr>`; const cm = getCurrentMonthIndo(); tbody.innerHTML = filtered.map(s => { let isLunas = s.paidMonths && s.paidMonths.includes(cm); return `<tr class="hover:bg-slate-50 transition group"><td class="p-4"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs">${s.fullName ? s.fullName.charAt(0).toUpperCase() : '?'}</div><div><div class="font-bold text-slate-800">${s.fullName || 'Tanpa Nama'}</div><div class="text-xs text-slate-500">NISN: ${s.nisn || '-'}</div></div></div></td><td class="p-4"><div class="font-medium text-slate-700">${s.kelas || '-'}</div></td><td class="p-4"><div class="text-xs text-slate-500 font-mono">${s.email || '-'}</div></td><td class="p-4"><div class="text-sm text-slate-700">${s.parentName || '-'}</div><div class="text-xs text-slate-500">${s.parentPhone || ''}</div></td><td class="p-4"><span class="px-2 py-1 rounded-md text-xs font-semibold ${isLunas ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}">${isLunas ? 'Lunas' : 'Menunggak'}</span></td><td class="p-4 text-right"><div class="flex justify-end gap-2"><button onclick="editStudent('${s.id}')" class="p-1 text-slate-400 hover:text-green-600"><i data-lucide="edit" width="18"></i></button><button onclick="deleteStudent('${s.id}', '${s.fullName}')" class="p-1 text-slate-400 hover:text-red-600"><i data-lucide="trash-2" width="18"></i></button></div></td></tr>` }).join(''); lucide.createIcons(); }
// --- FUNGSI COMPRESS GAMBAR PROFIL ---
function compressProfileImage(file, callback) {
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = function(e) {
        const img = new Image(); img.src = e.target.result;
        img.onload = function() {
            const canvas = document.createElement('canvas'); 
            const MAX_SIZE = 400; // Ukuran kotak profil
            let width = img.width, height = img.height;
            if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
            else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
            canvas.width = width; canvas.height = height; 
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.8)); // 80% quality
        }
    }
}

function handleStudentPhoto(event) {
    const file = event.target.files[0]; if(!file) return;
    compressProfileImage(file, (base64) => {
        studentPhotoBase64 = base64;
        document.getElementById('studentPhotoPreview').src = base64;
    });
}

function handleTeacherPhoto(event) {
    const file = event.target.files[0]; if(!file) return;
    compressProfileImage(file, (base64) => {
        teacherPhotoBase64 = base64;
        document.getElementById('teacherPhotoPreview').src = base64;
    });
}
function openStudentModal(id = null) { document.getElementById('studentModal').classList.remove('hidden'); const form = document.getElementById('studentForm'); if (id) { const s = allStudents.find(student => student.id === id); document.getElementById('modalTitle').innerText = "Edit Data Siswa"; ['studentId','fullName','nisn','kelas','email','password','absen','pob','dob','parentName','parentPhone','ambition','hobbies'].forEach(f => { if(document.getElementById(f)) document.getElementById(f).value = s[f] || ""; }); } else { document.getElementById('modalTitle').innerText = "Tambah Siswa Baru"; form.reset(); document.getElementById('studentId').value = ""; } const handler = () => { const name = document.getElementById('fullName').value, nisn = document.getElementById('nisn').value; if (name) document.getElementById('email').value = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@mtsts.sc.id`; if (nisn) document.getElementById('password').value = nisn; }; document.getElementById('fullName').oninput = handler; document.getElementById('nisn').oninput = handler; }
function closeStudentModal() { document.getElementById('studentModal').classList.add('hidden'); }
async function saveStudent() { 
    const id = document.getElementById('studentId').value, fullName = document.getElementById('fullName').value, nisn = document.getElementById('nisn').value, email = document.getElementById('email').value, password = document.getElementById('password').value; 
    if (!fullName || !nisn) return Swal.fire('Peringatan', 'Nama & NISN wajib diisi!', 'warning'); 
    
    const data = { 
        fullName, nisn, email, password, 
        kelas: document.getElementById('kelas').value, 
        absen: document.getElementById('absen').value, 
        pob: document.getElementById('pob').value, 
        dob: document.getElementById('dob').value, 
        parentName: document.getElementById('parentName').value, 
        parentPhone: document.getElementById('parentPhone').value, 
        ambition: document.getElementById('ambition').value, 
        hobbies: document.getElementById('hobbies').value, 
        photoUrl: studentPhotoBase64, // Simpan Foto
        updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
    }; 
    
    Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading(), allowOutsideClick: false }); 
    try { 
        if (id) { await db.collection("students").doc(id).update(data); Swal.fire('Sukses', 'Data diperbarui', 'success'); } 
        else { let uid = await createUserAuth(email, password); data.uid = uid; data.paidMonths = []; data.createdAt = firebase.firestore.FieldValue.serverTimestamp(); await db.collection("students").add(data); Swal.fire('Sukses', 'Siswa berhasil dibuat', 'success'); } 
        closeStudentModal(); 
    } catch (error) { Swal.fire('Gagal', error.message, 'error'); } 
}
function deleteStudent(id, name) { Swal.fire({ title: 'Hapus?', text: `Siswa: ${name}`, icon: 'warning', showCancelButton: true }).then((r) => { if (r.isConfirmed) db.collection("students").doc(id).delete().then(() => Swal.fire('Terhapus', '', 'success')); }); }
function editStudent(id) { openStudentModal(id); }

// --- 6B. GURU ---
function filterTeachers(globalSearchTerm = "") { 
    const term = (globalSearchTerm || document.getElementById('teacherSearch')?.value || "").toLowerCase(); 
    const filtered = allTeachers.filter(t => 
        (t.fullName || "").toLowerCase().includes(term) || 
        (t.nip || "").toLowerCase().includes(term) || 
        (t.subject || "").toLowerCase().includes(term)
    ); 
    
    const tbody = document.getElementById('teachersTableBody'); 
    if (!tbody) return; 
    
    if (filtered.length === 0) {
        return tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500">Data tidak ditemukan.</td></tr>`; 
    }
    
    tbody.innerHTML = filtered.map(t => {
        // Tampilkan Badge Wali Kelas jika guru tersebut diset sebagai wali kelas
        const homeroomBadge = t.homeroomClass ? `<div class="text-[10px] text-orange-600 font-bold mt-1 bg-orange-50 border border-orange-100 inline-block px-2 py-0.5 rounded">Wali Kelas: ${t.homeroomClass}</div>` : '';
        
        return `
        <tr class="hover:bg-slate-50 transition group">
            <td class="p-4">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs">
                        ${t.fullName ? t.fullName.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                        <div class="font-bold text-slate-800">${t.fullName}</div>
                        <div class="text-xs text-slate-500">NIP: ${t.nip}</div>
                    </div>
                </div>
            </td>
            <td class="p-4">
                <span class="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-semibold">${t.subject || '-'}</span><br>
                ${homeroomBadge}
            </td>
            <td class="p-4">
                <div class="text-xs font-mono text-slate-600">${t.email}</div>
            </td>
            <td class="p-4 text-slate-600 text-sm">${t.phone || '-'}</td>
            <td class="p-4 text-right">
                <div class="flex justify-end gap-2">
                    <button onclick="editTeacher('${t.id}')" class="p-1 text-slate-400 hover:text-purple-600"><i data-lucide="edit" width="18"></i></button>
                    <button onclick="deleteTeacher('${t.id}', '${t.fullName}')" class="p-1 text-slate-400 hover:text-red-600"><i data-lucide="trash-2" width="18"></i></button>
                </div>
            </td>
        </tr>`;
    }).join(''); 
    
    lucide.createIcons(); 
}
function openTeacherModal(id = null) { 
    const modal = document.getElementById('teacherModal'); if(!modal) return; 
    modal.classList.remove('hidden'); const form = document.getElementById('teacherForm'); 
    
    teacherPhotoBase64 = null; // Reset foto
    
    if (id) { 
        const t = allTeachers.find(teacher => teacher.id === id); 
        document.getElementById('teacherModalTitle').innerText = "Edit Data Guru"; 
        document.getElementById('teacherId').value = t.id; 
        document.getElementById('teacherName').value = t.fullName || ""; 
        document.getElementById('teacherNip').value = t.nip || ""; 
        document.getElementById('teacherSubject').value = t.subject || ""; 
        document.getElementById('teacherHomeroom').value = t.homeroomClass || ""; 
        document.getElementById('teacherEducation').value = t.education || ""; // Pendidikan
        document.getElementById('teacherAchievements').value = t.achievements || ""; // Prestasi
        document.getElementById('teacherPhone').value = t.phone || ""; 
        document.getElementById('teacherEmail').value = t.email || ""; 
        document.getElementById('teacherPassword').value = t.password || ""; 
        
        teacherPhotoBase64 = t.photoUrl || null;
        document.getElementById('teacherPhotoPreview').src = t.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.email}&backgroundColor=e9d5ff`;
    } else { 
        document.getElementById('teacherModalTitle').innerText = "Tambah Data Guru"; 
        if(form) form.reset(); 
        document.getElementById('teacherId').value = ""; 
        document.getElementById('teacherPhotoPreview').src = "https://api.dicebear.com/7.x/avataaars/svg?seed=new&backgroundColor=e9d5ff";
    } 
    
    // Auto-fill email & pass (Tetap bisa diedit manual)
    const handler = () => { 
        const name = document.getElementById('teacherName').value;
        const nip = document.getElementById('teacherNip').value; 
        if (name && !id) { // Auto-fill hanya saat tambah baru
            let cleanName = name.split(',')[0].toLowerCase().replace(/[^a-z0-9]/g, ''); 
            document.getElementById('teacherEmail').value = `${cleanName}@mtsts.sc.id`; 
        } 
        if (nip && !id) document.getElementById('teacherPassword').value = nip; 
    }; 
    document.getElementById('teacherName').oninput = handler; 
    document.getElementById('teacherNip').oninput = handler; 
}

function closeTeacherModal() { 
    const modal = document.getElementById('teacherModal'); 
    if(modal) modal.classList.add('hidden'); 
}

async function saveTeacher() { 
    const id = document.getElementById('teacherId').value;
    const email = document.getElementById('teacherEmail').value;
    const password = document.getElementById('teacherPassword').value; 
    
    if (!document.getElementById('teacherName').value || !document.getElementById('teacherNip').value) return Swal.fire('Peringatan', 'Nama & NIP wajib diisi!', 'warning'); 
    
    const data = { 
        fullName: document.getElementById('teacherName').value, 
        nip: document.getElementById('teacherNip').value, 
        subject: document.getElementById('teacherSubject').value, 
        homeroomClass: document.getElementById('teacherHomeroom').value || null, 
        education: document.getElementById('teacherEducation').value || null,
        achievements: document.getElementById('teacherAchievements').value || null,
        phone: document.getElementById('teacherPhone').value, 
        email: email, 
        password: password, 
        role: 'teacher', 
        photoUrl: teacherPhotoBase64, // Simpan Foto
        updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
    }; 
    
    Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading(), allowOutsideClick: false }); 
    try { 
        if (id) { await db.collection("teachers").doc(id).update(data); Swal.fire('Sukses', 'Data Guru diperbarui', 'success'); } 
        else { let uid = await createUserAuth(email, password); data.uid = uid; data.createdAt = firebase.firestore.FieldValue.serverTimestamp(); await db.collection("teachers").add(data); Swal.fire('Sukses', 'Guru didaftarkan', 'success'); } 
        closeTeacherModal(); 
    } catch (error) { Swal.fire('Gagal', error.message, 'error'); } 
}

function deleteTeacher(id, name) { 
    Swal.fire({ 
        title: 'Hapus Guru?', 
        text: `${name} akan dihapus dari sistem.`, 
        icon: 'warning', 
        showCancelButton: true 
    }).then((r) => { 
        if (r.isConfirmed) {
            db.collection("teachers").doc(id).delete().then(() => Swal.fire('Terhapus', '', 'success')); 
        }
    }); 
}

function editTeacher(id) { 
    openTeacherModal(id); 
}

// --- 6C s/d 6E (JADWAL, EXAM, PENGUMUMAN) - SAMA SEPERTI SEBELUMNYA ---
function filterSchedules() { const classFilter = document.getElementById('scheduleClassFilter')?.value || "VII", dayFilter = document.getElementById('scheduleDayFilter')?.value || "Senin"; const filtered = allSchedules.filter(s => s.class === classFilter && s.day === dayFilter).sort((a,b) => a.startTime.localeCompare(b.startTime)); const tbody = document.getElementById('schedulesTableBody'); if(!tbody) return; if(filtered.length === 0) return tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500">Belum ada jadwal.</td></tr>`; tbody.innerHTML = filtered.map(s => `<tr class="hover:bg-slate-50 transition"><td class="p-4 font-bold text-orange-600 font-mono text-sm">${s.startTime} - ${s.endTime}</td><td class="p-4 font-bold text-slate-800">${s.subject}</td><td class="p-4 text-slate-600"><div class="flex items-center gap-2"><i data-lucide="user" width="14" class="text-slate-400"></i> ${s.teacherName}</div></td><td class="p-4 text-slate-500">${s.room}</td><td class="p-4 text-right"><div class="flex justify-end gap-2"><button onclick="editSchedule('${s.id}')" class="p-1 text-slate-400 hover:text-orange-600"><i data-lucide="edit" width="18"></i></button><button onclick="deleteSchedule('${s.id}')" class="p-1 text-slate-400 hover:text-red-600"><i data-lucide="trash-2" width="18"></i></button></div></td></tr>`).join(''); lucide.createIcons(); }
function populateTeacherSelect(elementId) { const select = document.getElementById(elementId); if(!select) return; select.innerHTML = '<option value="">-- Pilih Guru --</option>' + allTeachers.map(t => `<option value="${t.id}">${t.fullName}</option>`).join(''); }
function openScheduleModal(id = null) { document.getElementById('scheduleModal').classList.remove('hidden'); populateTeacherSelect('scheduleTeacher'); if (id) { const s = allSchedules.find(x => x.id === id); document.getElementById('scheduleModalTitle').innerText = "Edit Jadwal"; document.getElementById('scheduleId').value = s.id; ['day','class','startTime','endTime','subject','room'].forEach(f => document.getElementById('schedule'+f.charAt(0).toUpperCase()+f.slice(1)).value = s[f]); document.getElementById('scheduleTeacher').value = s.teacherId; } else { document.getElementById('scheduleModalTitle').innerText = "Tambah Jadwal"; document.getElementById('scheduleForm').reset(); document.getElementById('scheduleId').value = ""; document.getElementById('scheduleClass').value = document.getElementById('scheduleClassFilter')?.value || "VII"; document.getElementById('scheduleDay').value = document.getElementById('scheduleDayFilter')?.value || "Senin"; } }
function closeScheduleModal() { document.getElementById('scheduleModal').classList.add('hidden'); }
async function saveSchedule() { const id = document.getElementById('scheduleId').value, teacherSelect = document.getElementById('scheduleTeacher'); if (!teacherSelect.value) return Swal.fire('Peringatan', 'Mohon pilih guru pengajar!', 'warning'); const data = { day: document.getElementById('scheduleDay').value, class: document.getElementById('scheduleClass').value, startTime: document.getElementById('scheduleStartTime').value, endTime: document.getElementById('scheduleEndTime').value, subject: document.getElementById('scheduleSubject').value, teacherId: teacherSelect.value, teacherName: teacherSelect.options[teacherSelect.selectedIndex].text, room: document.getElementById('scheduleRoom').value, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }; Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading(), allowOutsideClick: false }); try { if (id) await db.collection("schedules").doc(id).update(data); else { data.createdAt = firebase.firestore.FieldValue.serverTimestamp(); await db.collection("schedules").add(data); } Swal.fire('Sukses', 'Jadwal tersimpan', 'success'); closeScheduleModal(); } catch (error) { Swal.fire('Gagal', error.message, 'error'); } }
function deleteSchedule(id) { Swal.fire({ title: 'Hapus Jadwal?', icon: 'warning', showCancelButton: true }).then((r) => { if (r.isConfirmed) db.collection("schedules").doc(id).delete().then(() => Swal.fire('Terhapus', '', 'success')); }); }
function editSchedule(id) { openScheduleModal(id); }

// --- 6D. EXAM ---
function filterExams(globalSearchTerm = "") { const classFilter = document.getElementById('examClassFilter')?.value || "All", term = (globalSearchTerm || document.getElementById('examSearch')?.value || "").toLowerCase(); const filtered = allExams.filter(e => (classFilter === "All" || e.class === classFilter) && ((e.subject||"").toLowerCase().includes(term) || (e.type||"").toLowerCase().includes(term))).sort((a,b) => new Date(b.date) - new Date(a.date)); const tbody = document.getElementById('examsTableBody'); if(!tbody) return; if(filtered.length === 0) return tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500">Belum ada jadwal ujian CBT.</td></tr>`; tbody.innerHTML = filtered.map(e => `<tr class="hover:bg-slate-50 transition"><td class="p-4"><div class="font-bold text-slate-800">${e.subject}</div><div class="text-xs text-blue-600 font-semibold">${e.type}</div></td><td class="p-4 font-medium text-slate-700">${e.class}</td><td class="p-4"><div class="text-sm text-slate-700"><i data-lucide="calendar" class="inline w-3 h-3 text-slate-400"></i> ${new Date(e.date).toLocaleDateString('id-ID')}</div><div class="text-xs text-slate-500 font-mono mt-1"><i data-lucide="clock" class="inline w-3 h-3 text-slate-400"></i> ${e.startTime} (${e.duration} Mnt)</div><div class="text-xs font-bold text-orange-600 mt-1">Ruang: ${e.room || '-'}</div></td><td class="p-4 text-sm text-slate-600"><span class="text-xs text-slate-400 block">Pengampu:</span><span class="font-bold">${e.teacherName}</span><span class="text-xs text-slate-400 block mt-1">Pengawas:</span><span class="font-semibold text-orange-700">${e.pengawasName || '-'}</span></td><td class="p-4 text-right"><div class="flex justify-end gap-2"><button onclick="editExam('${e.id}')" class="p-1 text-slate-400 hover:text-blue-600"><i data-lucide="edit" width="18"></i></button><button onclick="deleteExam('${e.id}')" class="p-1 text-slate-400 hover:text-red-600"><i data-lucide="trash-2" width="18"></i></button></div></td></tr>`).join(''); lucide.createIcons(); }
function openExamModal(id = null) { document.getElementById('examModal').classList.remove('hidden'); populateTeacherSelect('examTeacher'); populateTeacherSelect('examPengawas'); if (id) { const e = allExams.find(x => x.id === id); document.getElementById('examModalTitle').innerText = "Edit Jadwal Ujian CBT"; document.getElementById('examId').value = e.id; ['type','subject','class','date'].forEach(f => document.getElementById('exam'+f.charAt(0).toUpperCase()+f.slice(1)).value = e[f]); document.getElementById('examTime').value = e.startTime; document.getElementById('examDuration').value = e.duration; document.getElementById('examTeacher').value = e.teacherId; document.getElementById('examPengawas').value = e.pengawasId || ""; document.getElementById('examRoom').value = e.room || ""; } else { document.getElementById('examModalTitle').innerText = "Tambah Jadwal Ujian CBT"; document.getElementById('examForm').reset(); document.getElementById('examId').value = ""; document.getElementById('examClass').value = document.getElementById('examClassFilter')?.value !== "All" ? document.getElementById('examClassFilter')?.value : "VII"; } }
function closeExamModal() { document.getElementById('examModal').classList.add('hidden'); }
async function saveExam() { const id = document.getElementById('examId').value, teacherSelect = document.getElementById('examTeacher'), pengawasSelect = document.getElementById('examPengawas'); if (!teacherSelect.value) return Swal.fire('Peringatan', 'Mohon pilih guru pengampu!', 'warning'); const data = { type: document.getElementById('examType').value, subject: document.getElementById('examSubject').value, class: document.getElementById('examClass').value, date: document.getElementById('examDate').value, startTime: document.getElementById('examTime').value, duration: parseInt(document.getElementById('examDuration').value), teacherId: teacherSelect.value, teacherName: teacherSelect.options[teacherSelect.selectedIndex].text, pengawasId: pengawasSelect.value, pengawasName: pengawasSelect.value ? pengawasSelect.options[pengawasSelect.selectedIndex].text : '-', room: document.getElementById('examRoom').value, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }; Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading(), allowOutsideClick: false }); try { if (id) await db.collection("exams").doc(id).update(data); else { data.createdAt = firebase.firestore.FieldValue.serverTimestamp(); await db.collection("exams").add(data); } Swal.fire('Sukses', 'Jadwal ujian tersimpan', 'success'); closeExamModal(); } catch (error) { Swal.fire('Gagal', error.message, 'error'); } }
function deleteExam(id) { Swal.fire({ title: 'Hapus Jadwal Ujian?', icon: 'warning', showCancelButton: true }).then((r) => { if (r.isConfirmed) db.collection("exams").doc(id).delete().then(() => Swal.fire('Terhapus', '', 'success')); }); }
function editExam(id) { openExamModal(id); }

function getExamsHTML() { return `<div class="space-y-6 animate-fade-in"><div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div><h2 class="text-2xl font-bold text-slate-800">Jadwal Ujian (CBT)</h2><p class="text-slate-500">Sistem manajemen dan tugas pengawasan online</p></div><div class="flex gap-2 w-full sm:w-auto"><select id="examClassFilter" onchange="filterExams()" class="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 outline-none"><option value="All">Semua Kelas</option><option value="VII">Kelas VII</option><option value="VIII">Kelas VIII</option><option value="IX">Kelas IX</option></select><button onclick="openExamModal()" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"><i data-lucide="plus" width="18"></i> Buat Ujian</button></div></div><div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><div class="p-4 border-b border-slate-100"><div class="relative"><i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="18"></i><input type="text" id="examSearch" oninput="filterExams()" placeholder="Cari Mapel atau Jenis Ujian..." class="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></div></div><div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead class="bg-slate-50 text-slate-600 text-xs uppercase font-semibold"><tr><th class="p-4 border-b border-slate-100">Ujian & Mapel</th><th class="p-4 border-b border-slate-100">Kelas</th><th class="p-4 border-b border-slate-100">Waktu & Ruang</th><th class="p-4 border-b border-slate-100">Pengampu & Pengawas</th><th class="p-4 border-b border-slate-100 text-right">Aksi</th></tr></thead><tbody id="examsTableBody" class="text-sm divide-y divide-slate-100"><tr><td colspan="5" class="p-8 text-center">Memuat jadwal ujian...</td></tr></tbody></table></div></div></div>`; }

function getAnnouncementStyle(type) { switch(type) { case 'Libur': return { icon: 'calendar-off', bg: 'bg-red-100', text: 'text-red-600' }; case 'Ujian': return { icon: 'file-text', bg: 'bg-purple-100', text: 'text-purple-600' }; case 'Event': return { icon: 'calendar-star', bg: 'bg-orange-100', text: 'text-orange-600' }; default: return { icon: 'megaphone', bg: 'bg-blue-100', text: 'text-blue-600' }; } }
function filterAnnouncements(globalSearchTerm = "") { const term = (globalSearchTerm || document.getElementById('announcementSearch')?.value || "").toLowerCase(); const filtered = allAnnouncements.filter(a => (a.title || "").toLowerCase().includes(term) || (a.content || "").toLowerCase().includes(term)); const container = document.getElementById('announcementsContainer'); if (!container) return; if (filtered.length === 0) return container.innerHTML = `<div class="col-span-full p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">Belum ada pengumuman.</div>`; container.innerHTML = filtered.map(a => { const style = getAnnouncementStyle(a.type); const dateStr = a.createdAt ? new Date(a.createdAt.seconds * 1000).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : 'Baru saja'; return `<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition flex flex-col"><div class="flex justify-between items-start mb-3"><div class="flex items-center gap-3"><div class="p-2 ${style.bg} ${style.text} rounded-lg"><i data-lucide="${style.icon}" width="20"></i></div><div><h3 class="font-bold text-slate-800 leading-tight">${a.title}</h3><p class="text-[10px] text-slate-400 font-medium mt-1">${dateStr} • ${a.type}</p></div></div><div class="flex gap-2"><button onclick="editAnnouncement('${a.id}')" class="text-slate-400 hover:text-blue-600 transition"><i data-lucide="edit" width="16"></i></button><button onclick="deleteAnnouncement('${a.id}')" class="text-slate-400 hover:text-red-600 transition"><i data-lucide="trash-2" width="16"></i></button></div></div><p class="text-sm text-slate-600 mt-2 flex-1 whitespace-pre-wrap leading-relaxed">${a.content}</p></div>`; }).join(''); lucide.createIcons(); }
function openAnnouncementModal(id = null) { document.getElementById('announcementModal').classList.remove('hidden'); if (id) { const a = allAnnouncements.find(x => x.id === id); document.getElementById('announcementModalTitle').innerText = "Edit Pengumuman"; document.getElementById('announcementId').value = a.id; document.getElementById('announcementTitle').value = a.title; document.getElementById('announcementType').value = a.type; document.getElementById('announcementContent').value = a.content; } else { document.getElementById('announcementModalTitle').innerText = "Buat Pengumuman Baru"; document.getElementById('announcementForm').reset(); document.getElementById('announcementId').value = ""; } }
function closeAnnouncementModal() { document.getElementById('announcementModal').classList.add('hidden'); }
async function saveAnnouncement() { const id = document.getElementById('announcementId').value, title = document.getElementById('announcementTitle').value, content = document.getElementById('announcementContent').value; if (!title || !content) return Swal.fire('Peringatan', 'Judul dan isi pengumuman wajib diisi!', 'warning'); const data = { title: title, type: document.getElementById('announcementType').value, content: content, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }; Swal.fire({ title: 'Menyebarkan...', didOpen: () => Swal.showLoading(), allowOutsideClick: false }); try { if (id) await db.collection("announcements").doc(id).update(data); else { data.createdAt = firebase.firestore.FieldValue.serverTimestamp(); await db.collection("announcements").add(data); } Swal.fire('Sukses', 'Pengumuman berhasil disebarkan!', 'success'); closeAnnouncementModal(); } catch (error) { Swal.fire('Gagal', error.message, 'error'); } }
function deleteAnnouncement(id) { Swal.fire({ title: 'Hapus Pengumuman?', icon: 'warning', showCancelButton: true }).then((r) => { if (r.isConfirmed) db.collection("announcements").doc(id).delete().then(() => Swal.fire('Terhapus', '', 'success')); }); }
function editAnnouncement(id) { openAnnouncementModal(id); }

// --- 6F. SURAT MENYURAT (BARU) ---
function filterLetters(globalSearchTerm = "") {
    const roleFilter = document.getElementById('letterRoleFilter')?.value || "All";
    const term = (globalSearchTerm || document.getElementById('letterSearch')?.value || "").toLowerCase();
    
    const filtered = allLetters.filter(l => 
        (roleFilter === "All" || l.senderRole === roleFilter) && 
        ((l.senderName||"").toLowerCase().includes(term) || (l.type||"").toLowerCase().includes(term))
    );

    const tbody = document.getElementById('lettersTableBody'); if(!tbody) return;
    if(filtered.length === 0) return tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-500">Belum ada pengajuan surat.</td></tr>`;

    tbody.innerHTML = filtered.map(l => {
        let statusBadge = '';
        if(l.status === 'Disetujui') statusBadge = '<span class="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold">Disetujui</span>';
        else if(l.status === 'Ditolak') statusBadge = '<span class="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold">Ditolak</span>';
        else statusBadge = '<span class="px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-xs font-bold animate-pulse">Menunggu</span>';

        const dateStr = l.createdAt ? new Date(l.createdAt.seconds * 1000).toLocaleDateString('id-ID') : '-';

        return `
        <tr class="hover:bg-slate-50 transition">
            <td class="p-4">
                <div class="font-bold text-slate-800">${l.senderName}</div>
                <div class="text-xs text-slate-500">${l.senderRole === 'student' ? 'Siswa' : 'Guru'}</div>
            </td>
            <td class="p-4 font-medium text-slate-700">${l.type}</td>
            <td class="p-4 text-sm text-slate-500">${dateStr}</td>
            <td class="p-4">${statusBadge}</td>
            <td class="p-4 text-right">
                <button onclick="openLetterModal('${l.id}')" class="px-3 py-1 bg-blue-50 text-blue-600 font-bold text-xs rounded hover:bg-blue-100 transition">
                    Proses / Cek
                </button>
            </td>
        </tr>
    `}).join('');
    lucide.createIcons();
}

function openLetterModal(id) {
    const l = allLetters.find(x => x.id === id); if(!l) return;
    document.getElementById('letterModal').classList.remove('hidden');
    document.getElementById('letterId').value = l.id;
    document.getElementById('detailLetterSender').innerText = l.senderName;
    document.getElementById('detailLetterRole').innerText = l.senderRole === 'student' ? 'Siswa' : 'Guru';
    document.getElementById('detailLetterType').innerText = l.type;
    document.getElementById('detailLetterDate').innerText = l.createdAt ? new Date(l.createdAt.seconds * 1000).toLocaleDateString('id-ID') : '-';
    document.getElementById('detailLetterDesc').innerText = l.description || "Tidak ada keterangan.";
    document.getElementById('letterAdminNote').value = l.adminNote || "";
    document.getElementById('letterStatus').value = l.status || "Menunggu";
}

function closeLetterModal() { document.getElementById('letterModal').classList.add('hidden'); }

async function saveLetterStatus() {
    const id = document.getElementById('letterId').value;
    const newStatus = document.getElementById('letterStatus').value;
    const adminNote = document.getElementById('letterAdminNote').value;

    Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    try {
        await db.collection("letters").doc(id).update({
            status: newStatus,
            adminNote: adminNote,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        Swal.fire('Sukses', 'Status surat berhasil diperbarui!', 'success');
        closeLetterModal();
    } catch (error) { Swal.fire('Gagal', error.message, 'error'); }
}

// --- 7. KEUANGAN ---
function handleImageUpload(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = function (e) { const img = new Image(); img.src = e.target.result; img.onload = function () { const canvas = document.createElement('canvas'); let width = img.width, height = img.height; const MAX = 800; if (width > height) { if (width > MAX) { height *= MAX / width; width = MAX; } } else { if (height > MAX) { width *= MAX / height; height = MAX; } } canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height); let quality = 0.9, dataUrl = canvas.toDataURL('image/jpeg', quality); while (dataUrl.length > 137000 && quality > 0.1) { quality -= 0.1; dataUrl = canvas.toDataURL('image/jpeg', quality); } compressedImageBase64 = dataUrl; document.getElementById('proofPreview').src = dataUrl; document.getElementById('proofPreviewContainer').classList.remove('hidden'); document.getElementById('proofSize').innerText = `Ukuran: ${Math.round((dataUrl.length * 3) / 4 / 1024)} KB`; } } }
function updateFinanceStats() { const currentMonth = getCurrentMonthIndo(); let totalLunas = allStudents.filter(s => s.paidMonths && s.paidMonths.includes(currentMonth)).length, totalMenunggak = allStudents.length - totalLunas, estimasi = (totalLunas * 150000).toLocaleString('id-ID'); const elEstimasi = document.getElementById('finance-estimasi'), elProgress = document.getElementById('finance-progress'), elProgressText = document.getElementById('finance-progress-text'), elMenunggak = document.getElementById('finance-menunggak'), elTxCount = document.getElementById('totalTxCount'); if(elEstimasi) elEstimasi.innerText = `Rp ${estimasi}`; if(elProgress) elProgress.style.width = `${(totalLunas / (allStudents.length || 1)) * 100}%`; if(elProgressText) elProgressText.innerText = `${totalLunas} Siswa Lunas Bulan ${currentMonth}`; if(elMenunggak) elMenunggak.innerText = `${totalMenunggak} Siswa`; if(elTxCount) elTxCount.innerText = totalTransactionsCount.toLocaleString(); }
function filterFinance(globalSearchTerm = "") { const term = (globalSearchTerm || document.getElementById('financeSearch')?.value || "").toLowerCase(); renderFinanceTable(allStudents.filter(s => (s.fullName || "").toLowerCase().includes(term) || (s.kelas || "").toLowerCase().includes(term))); }
function renderFinanceTable(data) { const tbody = document.getElementById('financeTableBody'); if (!tbody) return; if (data.length === 0) return tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500">Data tidak ditemukan.</td></tr>`; const cm = getCurrentMonthIndo(); tbody.innerHTML = data.map(s => { let isLunas = s.paidMonths && s.paidMonths.includes(cm), textBulanTerakhir = (s.paidMonths && s.paidMonths.length > 0) ? `Lunas s/d ${s.paidMonths[s.paidMonths.length - 1]}` : "-"; return `<tr class="hover:bg-slate-50 transition"><td class="p-4 font-medium text-slate-800">${s.fullName}<br><span class="text-xs text-slate-400">NISN: ${s.nisn||'-'}</span></td><td class="p-4 text-slate-600">${s.kelas}</td><td class="p-4"><span class="px-2 py-1 rounded-md text-xs font-semibold ${isLunas?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700'}">${isLunas?'Lunas Bulan Ini':'Menunggak'}</span><div class="text-[10px] text-slate-400 mt-1">${textBulanTerakhir}</div></td><td class="p-4 text-slate-500 text-xs">${s.lastPaymentDate?new Date(s.lastPaymentDate.seconds*1000).toLocaleDateString('id-ID'):'Belum ada'}<br><span class="text-slate-400 font-bold">${s.lastPaymentType||''}</span></td><td class="p-4 text-right"><button onclick="openPaymentModal('${s.id}')" class="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition">+ Transaksi</button></td></tr>` }).join(''); lucide.createIcons(); }
function openPaymentModal(id) { const s = allStudents.find(student => student.id === id); if (!s) return; document.getElementById('paymentModal').classList.remove('hidden'); document.getElementById('payStudentId').value = s.id; document.getElementById('payStudentName').value = s.fullName; document.getElementById('payNameDisplay').innerText = s.fullName; document.getElementById('payClassDisplay').innerText = s.kelas; document.getElementById('payType').value = "SPP"; document.getElementById('payMonth').value = getCurrentMonthIndo(); document.getElementById('payAmount').value = ""; compressedImageBase64 = null; document.getElementById('payProof').value = ""; document.getElementById('proofPreviewContainer').classList.add('hidden'); toggleMonthInput();  }
function closePaymentModal() { document.getElementById('paymentModal').classList.add('hidden'); }
function toggleMonthInput() { document.getElementById('monthContainer').classList[document.getElementById('payType').value === 'SPP' ? 'remove' : 'add']('hidden'); }
async function submitPayment() { const studentId = document.getElementById('payStudentId').value, studentName = document.getElementById('payStudentName').value, type = document.getElementById('payType').value, month = document.getElementById('payMonth').value, amount = document.getElementById('payAmount').value, status = document.getElementById('payStatus').value; if (!amount) return Swal.fire('Peringatan', 'Isi nominal pembayaran', 'warning'); Swal.fire({ title: 'Memproses...', didOpen: () => Swal.showLoading(), allowOutsideClick: false }); try { await db.collection("transactions").add({ studentId, studentName, type, status, amount: parseInt(amount), month: type === 'SPP' ? month : '-', proofImage: compressedImageBase64 || null, date: firebase.firestore.FieldValue.serverTimestamp(), adminName: ADMIN_DATA.name }); let updateData = { lastPaymentDate: firebase.firestore.FieldValue.serverTimestamp(), lastPaymentType: type }; if (type === 'SPP' && status === 'Lunas') updateData.paidMonths = firebase.firestore.FieldValue.arrayUnion(month); await db.collection("students").doc(studentId).update(updateData); Swal.fire('Berhasil', `Pembayaran tersimpan!`, 'success'); closePaymentModal(); } catch (error) { Swal.fire('Gagal', error.message, 'error'); } }

// --- 8. SETTINGS ---
async function saveSettings() {
    const data = {
        schoolName: document.getElementById('setSchoolName').value,
        headmaster: document.getElementById('setHeadmaster').value,
        academicYear: document.getElementById('setAcademicYear').value,
        semester: document.getElementById('setSemester').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    try {
        await db.collection("settings").doc("general").set(data, { merge: true });
        Swal.fire('Sukses', 'Pengaturan berhasil disimpan!', 'success');
    } catch (e) { Swal.fire('Error', e.message, 'error'); }
}

// --- 9. HTML GENERATORS ---
function getDashboardHTML() { const STATS_UI = [{ id: 'total-siswa', title: "Total Siswa", change: "Live", icon: "graduation-cap", color: "text-blue-600", bg: "bg-blue-100" }, { id: 'total-guru', title: "Total Guru", change: "Live", icon: "users", color: "text-purple-600", bg: "bg-purple-100" }, { title: "Kehadiran Hari Ini", change: "+1.2%", icon: "check-circle", color: "text-green-600", bg: "bg-green-100" }, { title: "Sistem", change: "Online", icon: "server", color: "text-orange-600", bg: "bg-orange-100" }]; return `<div class="space-y-6 animate-fade-in"><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">${STATS_UI.map(stat => `<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start justify-between hover:shadow-md transition"><div><p class="text-slate-500 text-sm font-medium mb-1">${stat.title}</p><h3 class="text-2xl font-bold text-slate-800" id="${stat.id ? 'stat-val-' + stat.id : ''}">-</h3><div class="flex items-center gap-1 mt-2 text-sm"><span class="text-green-600">${stat.change}</span></div></div><div class="p-3 rounded-lg ${stat.bg} ${stat.color}"><i data-lucide="${stat.icon}" width="24"></i></div></div>`).join('')}</div><div class="grid grid-cols-1 lg:grid-cols-3 gap-6"><div class="bg-white rounded-xl shadow-sm border border-slate-200 lg:col-span-2 p-6"><h3 class="font-bold text-slate-800 text-lg mb-6">Tren Kehadiran</h3><div class="h-72 w-full relative"><canvas id="attendanceChart"></canvas></div></div><div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6"><h3 class="font-bold text-slate-800 text-lg mb-4">Aktivitas Terbaru</h3><div class="space-y-6 relative"><div class="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-100"></div>${RECENT_ACTIVITIES.map(act => `<div class="relative pl-8"><div class="absolute left-0 top-1 w-4 h-4 rounded-full bg-blue-100 border-2 border-white ring-1 ring-blue-500"></div><p class="text-sm text-slate-800"><span class="font-bold">${act.user}</span> ${act.action} <span class="text-blue-600 font-medium">${act.target}</span></p><span class="text-xs text-slate-400 mt-1 block">${act.time}</span></div>`).join('')}</div></div></div></div>`; }
function getStudentsHTML() { return `<div class="space-y-6 animate-fade-in"><div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div><h2 class="text-2xl font-bold text-slate-800">Manajemen Siswa</h2><p class="text-slate-500">Total Siswa: <span id="totalStudentsCount" class="font-bold text-green-600">0</span></p></div><div class="flex gap-2 w-full sm:w-auto"><select id="classFilter" onchange="filterStudents()" class="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-green-500 outline-none"><option value="All">Semua Kelas</option><option value="VII">VII</option><option value="VIII">VIII</option><option value="IX">IX</option></select><button onclick="openStudentModal()" class="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition flex items-center gap-2"><i data-lucide="plus" width="18"></i> Tambah</button></div></div><div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><div class="p-4 border-b border-slate-100"><div class="relative"><i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="18"></i><input type="text" id="tableSearch" oninput="filterStudents()" placeholder="Cari berdasarkan nama, nisn, kelas..." class="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"></div></div><div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead class="bg-slate-50 text-slate-600 text-xs uppercase"><tr><th class="p-4 border-b border-slate-100">Nama / NISN</th><th class="p-4 border-b border-slate-100">Kelas</th><th class="p-4 border-b border-slate-100">Akun Sekolah</th><th class="p-4 border-b border-slate-100">Wali</th><th class="p-4 border-b border-slate-100">SPP Berjalan</th><th class="p-4 border-b border-slate-100 text-right">Aksi</th></tr></thead><tbody id="studentsTableBody" class="text-sm divide-y divide-slate-100"><tr><td colspan="6" class="p-8 text-center">Memuat data...</td></tr></tbody></table></div></div></div>`; }
function getTeachersHTML() { return `<div class="space-y-6 animate-fade-in"><div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div><h2 class="text-2xl font-bold text-slate-800">Manajemen Guru & Staf</h2><p class="text-slate-500">Total Pendidik: <span id="totalTeachersCount" class="font-bold text-purple-600">0</span></p></div><button onclick="openTeacherModal()" class="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition flex items-center gap-2"><i data-lucide="plus" width="18"></i> Daftarkan Guru</button></div><div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><div class="p-4 border-b border-slate-100"><div class="relative"><i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="18"></i><input type="text" id="teacherSearch" oninput="filterTeachers()" placeholder="Cari nama guru, NIP, mapel..." class="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"></div></div><div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead class="bg-slate-50 text-slate-600 text-xs uppercase"><tr><th class="p-4 border-b border-slate-100">Nama / NIP</th><th class="p-4 border-b border-slate-100">Mata Pelajaran</th><th class="p-4 border-b border-slate-100">Akun Login</th><th class="p-4 border-b border-slate-100">Kontak</th><th class="p-4 border-b border-slate-100 text-right">Aksi</th></tr></thead><tbody id="teachersTableBody" class="text-sm divide-y divide-slate-100"><tr><td colspan="5" class="p-8 text-center">Memuat data guru...</td></tr></tbody></table></div></div></div>`; }
function getScheduleHTML() { return `<div class="space-y-6 animate-fade-in"><div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div><h2 class="text-2xl font-bold text-slate-800">Jadwal Pelajaran</h2><p class="text-slate-500">Kelola jadwal tatap muka kelas</p></div><div class="flex gap-2 w-full sm:w-auto"><select id="scheduleClassFilter" onchange="filterSchedules()" class="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-orange-500 outline-none"><option value="VII">Kelas VII</option><option value="VIII">Kelas VIII</option><option value="IX">Kelas IX</option></select><select id="scheduleDayFilter" onchange="filterSchedules()" class="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-orange-500 outline-none"><option value="Senin">Senin</option><option value="Selasa">Selasa</option><option value="Rabu">Rabu</option><option value="Kamis">Kamis</option><option value="Jumat">Jumat</option><option value="Sabtu">Sabtu</option></select><button onclick="openScheduleModal()" class="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition flex items-center gap-2"><i data-lucide="plus" width="18"></i> Tambah</button></div></div><div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead class="bg-slate-50 text-slate-600 text-xs uppercase font-semibold"><tr><th class="p-4 border-b border-slate-100 w-32">Waktu</th><th class="p-4 border-b border-slate-100">Mata Pelajaran</th><th class="p-4 border-b border-slate-100">Guru Pengajar</th><th class="p-4 border-b border-slate-100">Ruang</th><th class="p-4 border-b border-slate-100 text-right">Aksi</th></tr></thead><tbody id="schedulesTableBody" class="text-sm divide-y divide-slate-100"><tr><td colspan="5" class="p-8 text-center">Memuat jadwal...</td></tr></tbody></table></div></div></div>`; }
function getExamsHTML() { return `<div class="space-y-6 animate-fade-in"><div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div><h2 class="text-2xl font-bold text-slate-800">Jadwal Ujian (CBT)</h2><p class="text-slate-500">Sistem manajemen dan token ujian online</p></div><div class="flex gap-2 w-full sm:w-auto"><select id="examClassFilter" onchange="filterExams()" class="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 outline-none"><option value="All">Semua Kelas</option><option value="VII">Kelas VII</option><option value="VIII">Kelas VIII</option><option value="IX">Kelas IX</option></select><button onclick="openExamModal()" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"><i data-lucide="plus" width="18"></i> Buat Ujian</button></div></div><div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><div class="p-4 border-b border-slate-100"><div class="relative"><i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="18"></i><input type="text" id="examSearch" oninput="filterExams()" placeholder="Cari Mapel atau Jenis Ujian..." class="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></div></div><div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead class="bg-slate-50 text-slate-600 text-xs uppercase font-semibold"><tr><th class="p-4 border-b border-slate-100">Ujian & Mapel</th><th class="p-4 border-b border-slate-100">Kelas</th><th class="p-4 border-b border-slate-100">Waktu Pelaksanaan</th><th class="p-4 border-b border-slate-100">Pengawas</th><th class="p-4 border-b border-slate-100 text-right">Aksi</th></tr></thead><tbody id="examsTableBody" class="text-sm divide-y divide-slate-100"><tr><td colspan="5" class="p-8 text-center">Memuat jadwal ujian...</td></tr></tbody></table></div></div></div>`; }
function getFinanceHTML() { return `<div class="space-y-6 animate-fade-in"><div class="flex justify-between items-center"><div><h2 class="text-2xl font-bold text-slate-800">Keuangan & SPP</h2><p class="text-slate-500">Bulan Berjalan: <span class="font-bold text-blue-600">${getCurrentMonthIndo()}</span></p></div><button onclick="Swal.fire('Info', 'Fitur Export Laporan akan segera hadir', 'info')" class="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition shadow-sm"><i data-lucide="printer" width="18"></i> Cetak Laporan</button></div><div class="grid grid-cols-1 md:grid-cols-3 gap-6"><div class="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-lg"><p class="text-emerald-100 font-medium mb-1">Estimasi Pemasukan (SPP)</p><h3 class="text-3xl font-bold" id="finance-estimasi">Rp 0</h3><div class="mt-4 w-full bg-black/20 rounded-full h-1.5"><div class="bg-white h-1.5 rounded-full" id="finance-progress" style="width: 0%"></div></div><p class="text-xs text-emerald-100 mt-2" id="finance-progress-text">Menghitung...</p></div><div class="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center justify-between"><div><p class="text-slate-500 text-sm font-bold uppercase">Siswa Menunggak</p><h3 class="text-2xl font-bold text-red-600 mt-1" id="finance-menunggak">0 Siswa</h3><p class="text-xs text-slate-400 mt-1">Perlu ditindaklanjuti</p></div><div class="p-3 bg-red-100 text-red-600 rounded-lg"><i data-lucide="alert-circle" width="24"></i></div></div><div class="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center justify-between"><div><p class="text-slate-500 text-sm font-bold uppercase">Total Transaksi</p><h3 class="text-2xl font-bold text-blue-600 mt-1" id="totalTxCount">0</h3><p class="text-xs text-slate-400 mt-1">Keseluruhan</p></div><div class="p-3 bg-blue-100 text-blue-600 rounded-lg"><i data-lucide="receipt" width="24"></i></div></div></div><div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><div class="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center"><h3 class="font-bold text-slate-800">Daftar Tagihan Siswa</h3><div class="relative w-full sm:w-64"><i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="18"></i><input type="text" id="financeSearch" oninput="filterFinance()" placeholder="Cari Siswa atau Kelas..." class="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></div></div><div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead class="bg-slate-50 text-slate-600 text-xs uppercase font-semibold"><tr><th class="p-4 border-b border-slate-100">Siswa</th><th class="p-4 border-b border-slate-100">Kelas</th><th class="p-4 border-b border-slate-100">Status Bulan Ini</th><th class="p-4 border-b border-slate-100">Terakhir Bayar</th><th class="p-4 border-b border-slate-100 text-right">Aksi</th></tr></thead><tbody id="financeTableBody" class="text-sm divide-y divide-slate-100"><tr><td colspan="5" class="p-8 text-center">Memuat data...</td></tr></tbody></table></div></div></div>`; }
function getAnnouncementsHTML() { return `<div class="space-y-6 animate-fade-in"><div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div><h2 class="text-2xl font-bold text-slate-800">Papan Pengumuman</h2><p class="text-slate-500">Sebarkan informasi ke Dashboard Guru dan Siswa</p></div><div class="flex gap-2 w-full sm:w-auto"><div class="relative w-full sm:w-64"><i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="18"></i><input type="text" id="announcementSearch" oninput="filterAnnouncements()" placeholder="Cari pengumuman..." class="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"></div><button onclick="openAnnouncementModal()" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"><i data-lucide="megaphone" width="18"></i> Buat Baru</button></div></div><div id="announcementsContainer" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"><div class="col-span-full p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">Memuat pengumuman...</div></div></div>`; }

// TAMPILAN HTML SURAT MENYURAT
function getLettersHTML() {
    return `
    <div class="space-y-6 animate-fade-in">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h2 class="text-2xl font-bold text-slate-800">Surat Menyurat</h2>
                <p class="text-slate-500">Proses pengajuan surat / izin dari Siswa & Guru</p>
            </div>
            <div class="flex gap-2 w-full sm:w-auto">
                <select id="letterRoleFilter" onchange="filterLetters()" class="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 outline-none">
                    <option value="All">Semua Pengirim</option>
                    <option value="student">Dari Siswa</option>
                    <option value="teacher">Dari Guru</option>
                </select>
                <div class="relative w-full sm:w-64">
                    <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="18"></i>
                    <input type="text" id="letterSearch" oninput="filterLetters()" placeholder="Cari nama atau jenis surat..." class="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                </div>
            </div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                        <tr>
                            <th class="p-4 border-b border-slate-100">Pengirim</th>
                            <th class="p-4 border-b border-slate-100">Jenis Surat / Izin</th>
                            <th class="p-4 border-b border-slate-100">Waktu Pengajuan</th>
                            <th class="p-4 border-b border-slate-100">Status</th>
                            <th class="p-4 border-b border-slate-100 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="lettersTableBody" class="text-sm divide-y divide-slate-100">
                        <tr><td colspan="5" class="p-8 text-center text-slate-500">Memuat data surat...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>`;
}

// TAMPILAN HTML PENGATURAN
function getSettingsHTML() {
    return `
    <div class="space-y-6 animate-fade-in max-w-3xl">
        <div>
            <h2 class="text-2xl font-bold text-slate-800">Pengaturan Sekolah</h2>
            <p class="text-slate-500">Konfigurasi dasar sistem akademik sekolah</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 class="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Informasi Umum</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Nama Institusi / Sekolah</label>
                    <input type="text" id="setSchoolName" placeholder="Contoh: MTS Tarbiyatus Syarifah" class="w-full border border-slate-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 text-sm">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Nama Kepala Sekolah</label>
                    <input type="text" id="setHeadmaster" placeholder="Nama Kepala Sekolah beserta gelar" class="w-full border border-slate-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 text-sm">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Tahun Ajaran Aktif</label>
                        <input type="text" id="setAcademicYear" placeholder="Contoh: 2025/2026" class="w-full border border-slate-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 text-sm">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Semester Aktif</label>
                        <select id="setSemester" class="w-full border border-slate-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 text-sm">
                            <option value="Ganjil">Ganjil</option>
                            <option value="Genap">Genap</option>
                        </select>
                    </div>
                </div>
                <div class="pt-4">
                    <button onclick="saveSettings()" class="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
                        Simpan Pengaturan
                    </button>
                </div>
            </div>
        </div>
    </div>`;
}


function getUnderConstructionHTML() { return `<div class="flex flex-col items-center justify-center h-96 opacity-50 animate-fade-in"><i data-lucide="alert-circle" width="48" class="mb-4 text-slate-400"></i><h2 class="text-xl font-bold text-slate-600">Fitur Sedang Dikembangkan</h2><p class="text-sm text-slate-400 mt-2">Nantikan pembaruan sistem berikutnya.</p></div>`; }
function initDashboardChart() { const canvas = document.getElementById('attendanceChart'); if (!canvas) return; const ctx = canvas.getContext('2d'); chartInstance = new Chart(ctx, { type: 'line', data: { labels: ATTENDANCE_CHART_DATA.map(d => d.name), datasets: [{ label: 'Hadir', data: ATTENDANCE_CHART_DATA.map(d => d.hadir), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 3, tension: 0.4, fill: true, pointRadius: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { min: 80, max: 100 } } } }); }

// ==========================================
// FITUR E-LIBRARY ADMIN
// ==========================================

function getLibraryAdminHTML() {
    return `
    <div class="space-y-6 animate-fade-in pb-10">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h2 class="text-2xl font-bold text-slate-800">Manajemen E-Library</h2>
                <p class="text-slate-500">Kelola katalog buku dan persetujuan peminjaman</p>
            </div>
            <button onclick="openBookModal()" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2">
                <i data-lucide="plus" width="18"></i> Tambah Buku Baru
            </button>
        </div>

        <div class="flex gap-4 border-b border-slate-200">
            <button onclick="switchLibTab('catalog')" id="tabCatalog" class="pb-3 px-2 font-bold text-blue-600 border-b-2 border-blue-600">Katalog Buku</button>
            <button onclick="switchLibTab('requests')" id="tabRequests" class="pb-3 px-2 font-bold text-slate-500 hover:text-slate-700">Pengajuan Peminjaman <span id="reqBadge" class="ml-1 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full hidden">0</span></button>
        </div>

        <div id="libCatalogArea" class="block">
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="p-4 border-b border-slate-100 relative">
                    <i data-lucide="search" class="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" width="18"></i>
                    <input type="text" id="adminBookSearch" oninput="renderLibraryAdmin()" placeholder="Cari judul buku..." class="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                            <tr>
                                <th class="p-4">Buku & Penulis</th>
                                <th class="p-4">Kategori</th>
                                <th class="p-4">Tipe & Stok</th>
                                <th class="p-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="adminBooksBody" class="text-sm divide-y divide-slate-100"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="libRequestsArea" class="hidden">
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                            <tr>
                                <th class="p-4">Peminjam</th>
                                <th class="p-4">Buku Fisik</th>
                                <th class="p-4">Waktu Pengajuan</th>
                                <th class="p-4">Status</th>
                                <th class="p-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="adminRequestsBody" class="text-sm divide-y divide-slate-100"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <div id="bookModal" class="fixed inset-0 z-50 hidden bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
        <div class="flex items-center justify-center min-h-screen p-4">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in">
                <div class="flex justify-between items-center p-6 border-b border-slate-100">
                    <h3 id="bookModalTitle" class="text-lg font-bold text-slate-800">Tambah Buku</h3>
                    <button onclick="closeBookModal()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x"></i></button>
                </div>
                <div class="p-6 space-y-4">
                    <input type="hidden" id="bookId">
                    
                    <div class="flex flex-col md:flex-row gap-6 items-start">
                        <div class="w-full md:w-32 shrink-0 flex flex-col items-center">
                            <div class="w-24 h-36 bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center relative overflow-hidden mb-2">
                                <img id="bookCoverPreview" class="absolute inset-0 w-full h-full object-cover hidden">
                                <i data-lucide="image-plus" class="text-slate-400 mb-1"></i>
                                <span class="text-[10px] text-slate-500 font-bold">Cover</span>
                            </div>
                            <input type="file" id="bookCoverFile" accept="image/*" onchange="handleBookCover(event)" class="text-[10px] w-full">
                        </div>
                        
                        <div class="flex-1 space-y-4 w-full">
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-1">Judul Buku</label>
                                <input type="text" id="bookTitle" class="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-blue-500 outline-none">
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-1">Penulis / Pengarang</label>
                                <input type="text" id="bookAuthor" class="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-blue-500 outline-none">
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-bold text-slate-700 mb-1">Kategori</label>
                                    <select id="bookCategory" class="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-blue-500 outline-none">
                                        <option value="Buku Pelajaran">Buku Pelajaran</option>
                                        <option value="Novel Remaja">Novel Remaja</option>
                                        <option value="Karya Ilmiah">Karya Ilmiah</option>
                                        <option value="Pengayaan">Buku Pengayaan</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-bold text-slate-700 mb-1">Tipe Buku</label>
                                    <select id="bookType" onchange="toggleBookType()" class="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-blue-500 outline-none">
                                        <option value="Fisik">Buku Fisik</option>
                                        <option value="E-Book">E-Book (PDF)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div id="physicalFields">
                                <label class="block text-sm font-bold text-slate-700 mb-1">Stok Fisik Tersedia</label>
                                <input type="number" id="bookStock" min="0" value="1" class="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-blue-500 outline-none">
                            </div>
                            
                            <div id="digitalFields" class="hidden border border-blue-200 bg-blue-50 p-3 rounded-lg">
                                <label class="block text-sm font-bold text-slate-700 mb-1">Link Google Drive (E-Book)</label>
                                <input type="text" id="bookPdfUrl" placeholder="https://drive.google.com/file/d/..../view" class="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-blue-500 outline-none">
                                <p class="text-[10px] text-blue-600 font-medium mt-1"><i data-lucide="info" class="inline w-3 h-3 mr-1"></i>Pastikan akses link G-Drive di-set ke "Siapa saja memiliki tautan" (Public).</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-2">
                    <button onclick="closeBookModal()" class="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-lg transition">Batal</button>
                    <button onclick="saveBook()" class="px-6 py-2 bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 rounded-lg transition shadow-sm">Simpan</button>
                </div>
            </div>
        </div>
    </div>`;
}

function switchLibTab(tab) {
    document.getElementById('libCatalogArea').classList[tab === 'catalog' ? 'remove' : 'add']('hidden');
    document.getElementById('libRequestsArea').classList[tab === 'requests' ? 'remove' : 'add']('hidden');
    document.getElementById('tabCatalog').className = tab === 'catalog' ? "pb-3 px-2 font-bold text-blue-600 border-b-2 border-blue-600" : "pb-3 px-2 font-bold text-slate-500 hover:text-slate-700";
    document.getElementById('tabRequests').className = tab === 'requests' ? "pb-3 px-2 font-bold text-blue-600 border-b-2 border-blue-600" : "pb-3 px-2 font-bold text-slate-500 hover:text-slate-700";
}

function toggleBookType() {
    const type = document.getElementById('bookType').value;
    document.getElementById('physicalFields').classList[type === 'Fisik' ? 'remove' : 'add']('hidden');
    document.getElementById('digitalFields').classList[type === 'E-Book' ? 'remove' : 'add']('hidden');
}

function renderLibraryAdmin() {
    const bookBody = document.getElementById('adminBooksBody');
    const reqBody = document.getElementById('adminRequestsBody');
    const badge = document.getElementById('reqBadge');
    if (!bookBody || !reqBody) return;

    // Render Badge & Requests Table
    const pendingReqs = allBorrowRequests.filter(r => r.status === 'Menunggu Persetujuan');
    if (pendingReqs.length > 0) { badge.innerText = pendingReqs.length; badge.classList.remove('hidden'); } 
    else { badge.classList.add('hidden'); }

    if (allBorrowRequests.length === 0) {
        reqBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500">Belum ada pengajuan peminjaman.</td></tr>`;
    } else {
        reqBody.innerHTML = allBorrowRequests.map(r => {
            const dateStr = r.requestDate ? new Date(r.requestDate.seconds * 1000).toLocaleDateString('id-ID') : '-';
            let statusUI = `<span class="px-2 py-1 bg-orange-100 text-orange-600 rounded text-xs font-bold animate-pulse">Menunggu</span>`;
            let actionUI = `
                <button onclick="processReq('${r.id}', '${r.bookId}', 'Approve')" class="px-2 py-1 bg-blue-600 text-white rounded text-xs font-bold shadow-sm">Setujui</button>
                <button onclick="processReq('${r.id}', '${r.bookId}', 'Reject')" class="px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-bold">Tolak</button>
            `;
            
            if(r.status === 'Dipinjam') {
                statusUI = `<span class="px-2 py-1 bg-green-100 text-green-600 rounded text-xs font-bold">Sedang Dipinjam</span>`;
                actionUI = `<button onclick="processReq('${r.id}', '${r.bookId}', 'Return')" class="px-3 py-1 bg-slate-900 text-white rounded text-xs font-bold shadow-sm"><i data-lucide="check-square" class="inline w-3 h-3 mr-1"></i>Tandai Kembali</button>`;
            } else if (r.status === 'Dikembalikan') {
                statusUI = `<span class="px-2 py-1 bg-slate-100 text-slate-500 rounded text-xs font-bold">Selesai</span>`;
                actionUI = `-`;
            } else if (r.status === 'Ditolak') {
                statusUI = `<span class="px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-bold">Ditolak</span>`;
                actionUI = `-`;
            }

            return `<tr class="border-b border-slate-100 hover:bg-slate-50 transition"><td class="p-4 font-bold text-slate-800">${r.studentName} <span class="block text-xs font-normal text-slate-500">Kelas ${r.class}</span></td><td class="p-4 font-medium text-slate-700">${r.bookTitle}</td><td class="p-4 text-sm text-slate-500">${dateStr}</td><td class="p-4">${statusUI}</td><td class="p-4 text-right flex gap-1 justify-end">${actionUI}</td></tr>`;
        }).join('');
    }

    // Render Books Catalog Table
    const search = (document.getElementById('adminBookSearch')?.value || "").toLowerCase();
    const filteredBooks = allBooks.filter(b => (b.title || "").toLowerCase().includes(search) || (b.author || "").toLowerCase().includes(search));

    if (filteredBooks.length === 0) {
        bookBody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-500">Buku tidak ditemukan.</td></tr>`;
    } else {
        bookBody.innerHTML = filteredBooks.map(b => {
            const isEbook = b.type === 'E-Book';
            const typeBadge = isEbook ? `<span class="text-blue-600 font-bold"><i data-lucide="smartphone" class="inline w-3 h-3 mr-1"></i>E-Book</span>` : `<span class="text-orange-600 font-bold"><i data-lucide="book" class="inline w-3 h-3 mr-1"></i>Fisik</span> <span class="text-slate-400 font-normal">(${b.stock} tersisa)</span>`;
            return `<tr class="border-b border-slate-100 hover:bg-slate-50 transition"><td class="p-4"><div class="font-bold text-slate-800 leading-tight line-clamp-1">${b.title}</div><div class="text-xs text-slate-500">${b.author}</div></td><td class="p-4 text-sm text-slate-600">${b.category}</td><td class="p-4 text-sm">${typeBadge}</td><td class="p-4 text-right flex justify-end gap-2"><button onclick="editBook('${b.id}')" class="p-1.5 text-slate-400 hover:text-blue-600 transition"><i data-lucide="edit" width="16"></i></button><button onclick="deleteBook('${b.id}')" class="p-1.5 text-slate-400 hover:text-red-600 transition"><i data-lucide="trash-2" width="16"></i></button></td></tr>`;
        }).join('');
    }
    lucide.createIcons();
}

function handleBookCover(e) {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = function(evt) {
        const img = new Image(); img.src = evt.target.result;
        img.onload = function() {
            const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
            const MAX = 400; let w = img.width, h = img.height;
            if(w > h) { if(w > MAX) { h *= MAX/w; w = MAX; } } else { if(h > MAX) { w *= MAX/h; h = MAX; } }
            canvas.width = w; canvas.height = h; ctx.drawImage(img, 0, 0, w, h);
            bookCoverBase64 = canvas.toDataURL('image/jpeg', 0.8);
            document.getElementById('bookCoverPreview').src = bookCoverBase64;
            document.getElementById('bookCoverPreview').classList.remove('hidden');
        }
    }
}

function openBookModal() { 
    document.getElementById('bookModal').classList.remove('hidden'); 
    document.getElementById('bookId').value = ""; 
    document.getElementById('bookTitle').value = ""; 
    document.getElementById('bookAuthor').value = ""; 
    document.getElementById('bookStock').value = "1"; 
    document.getElementById('bookPdfUrl').value = ""; // Bersihkan link G-Drive lama
    bookCoverBase64 = null; 
    document.getElementById('bookCoverPreview').classList.add('hidden');
    document.getElementById('bookModalTitle').innerText = "Tambah Buku Baru";
    toggleBookType();
}

function editBook(id) {
    const b = allBooks.find(x => x.id === id); if(!b) return;
    openBookModal();
    document.getElementById('bookModalTitle').innerText = "Edit Buku";
    document.getElementById('bookId').value = b.id;
    document.getElementById('bookTitle').value = b.title;
    document.getElementById('bookAuthor').value = b.author;
    document.getElementById('bookCategory').value = b.category;
    document.getElementById('bookType').value = b.type;
    document.getElementById('bookStock').value = b.stock || 0;
    document.getElementById('bookPdfUrl').value = b.pdfUrl || ""; // Munculkan link G-Drive jika ada
    if(b.coverUrl) {
        bookCoverBase64 = b.coverUrl;
        document.getElementById('bookCoverPreview').src = b.coverUrl;
        document.getElementById('bookCoverPreview').classList.remove('hidden');
    }
    toggleBookType();
}

function closeBookModal() { document.getElementById('bookModal').classList.add('hidden'); }

async function saveBook() {
    const id = document.getElementById('bookId').value;
    const type = document.getElementById('bookType').value;
    const pdfUrl = document.getElementById('bookPdfUrl').value;
    
    if(!document.getElementById('bookTitle').value) return Swal.fire('Error', 'Judul buku wajib diisi!', 'warning');
    if(type === 'E-Book' && !pdfUrl) return Swal.fire('Error', 'Link Google Drive wajib diisi untuk tipe E-Book!', 'warning');

    Swal.fire({ title: 'Menyimpan Buku...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

    try {
        const data = {
            title: document.getElementById('bookTitle').value,
            author: document.getElementById('bookAuthor').value,
            category: document.getElementById('bookCategory').value,
            type: type,
            stock: type === 'Fisik' ? parseInt(document.getElementById('bookStock').value) : null,
            coverUrl: bookCoverBase64,
            pdfUrl: type === 'E-Book' ? pdfUrl : null, // Langsung simpan link teks
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if(id) {
            await db.collection("books").doc(id).update(data);
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("books").add(data);
        }

        Swal.fire('Sukses', 'Buku berhasil disimpan ke katalog!', 'success');
        closeBookModal();
    } catch(e) {
        Swal.fire('Gagal Menyimpan', e.message, 'error');
    }
}

function deleteBook(id) { 
    Swal.fire({ title: 'Hapus Buku?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then((r) => { 
        if (r.isConfirmed) db.collection("books").doc(id).delete().then(()=>Swal.fire('Dihapus', '', 'success')); 
    }); 
}

async function processReq(reqId, bookId, action) {
    const req = allBorrowRequests.find(r => r.id === reqId);
    if(!req) return;

    Swal.fire({ title: 'Memproses...', didOpen: () => Swal.showLoading() });
    try {
        if(action === 'Approve') {
            const book = allBooks.find(b => b.id === bookId);
            if(!book || book.stock <= 0) return Swal.fire('Gagal', 'Stok buku fisik ini sudah habis!', 'error');
            
            const batch = db.batch();
            batch.update(db.collection('borrow_requests').doc(reqId), { status: 'Dipinjam', approvedAt: firebase.firestore.FieldValue.serverTimestamp() });
            batch.update(db.collection('books').doc(bookId), { stock: firebase.firestore.FieldValue.increment(-1) });
            await batch.commit();
            Swal.fire('Disetujui', 'Siswa dipersilakan mengambil buku.', 'success');
        } 
        else if (action === 'Reject') {
            await db.collection('borrow_requests').doc(reqId).update({ status: 'Ditolak' });
            Swal.fire('Ditolak', 'Pengajuan telah dibatalkan.', 'success');
        } 
        else if (action === 'Return') {
            const batch = db.batch();
            batch.update(db.collection('borrow_requests').doc(reqId), { status: 'Dikembalikan', returnDate: firebase.firestore.FieldValue.serverTimestamp() });
            batch.update(db.collection('books').doc(bookId), { stock: firebase.firestore.FieldValue.increment(1) });
            await batch.commit();
            Swal.fire('Dikembalikan', 'Stok buku telah bertambah.', 'success');
        }
    } catch (e) {
        Swal.fire('Error', e.message, 'error');
    }
}