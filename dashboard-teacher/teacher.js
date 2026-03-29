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
let TEACHER_DATA = null; 
let TEACHER_DOC_ID = null; 
let SCHOOL_SETTINGS = { schoolName: 'MTS Tarbiyatus Syarifah', headmaster: 'Kepala Sekolah', academicYear: '2025/2026', semester: 'Ganjil' };
let currentTab = 'dashboard';

// Variabel Data
let mySchedules = []; 
let myExams = []; // Ujian yang diampu (buat soal)
let myInvigilations = []; // Tugas Pengawasan Ujian
let myLetters = []; // Data Surat milik Guru
let allAnnouncements = []; 
let allStudents = []; 
let allGrades = []; 
let allSyllabus = []; 
let allAttendance = []; 
let currentExamQuestions = []; 
let qCompressedImageBase64 = null;

// State Jurnal Kelas Aktif
let activeClassId = null;
let activeClassSubject = null;
let activeGradeStudentId = null;
let activeGradeStudentName = null;
let activeAttStudentId = null; 
let activeAttStudentName = null;

const NAV_ITEMS = [
    { id: 'dashboard', label: 'Beranda Utama', icon: 'layout-dashboard' },
    { id: 'schedule', label: 'Jadwal & Jurnal Kelas', icon: 'calendar-clock' },
    { id: 'syllabus', label: 'Silabus & RPP', icon: 'book-open' },
    { id: 'cbt', label: 'Kelola Ujian (CBT)', icon: 'monitor-edit' },
    { id: 'grades', label: 'Input Nilai Siswa', icon: 'clipboard-list' }, 
    { id: 'announcements', label: 'Pengumuman', icon: 'megaphone' },
    { id: 'letters', label: 'Surat & Izin', icon: 'mail-plus' },
    { id: 'profile', label: 'Profil Pendidik', icon: 'user-check' }
];

// --- 3. AUTENTIKASI GURU ---
auth.onAuthStateChanged((user) => {
    const loginContainer = document.getElementById('login-container'), appContainer = document.getElementById('app-container');
    if (user) {
        db.collection("teachers").where("uid", "==", user.uid).get().then((querySnapshot) => {
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                TEACHER_DOC_ID = doc.id;
                TEACHER_DATA = doc.data();
                
                if (TEACHER_DATA.homeroomClass && !NAV_ITEMS.find(n => n.id === 'homeroom')) {
                    NAV_ITEMS.splice(5, 0, { id: 'homeroom', label: `Wali Kelas ${TEACHER_DATA.homeroomClass}`, icon: 'star' });
                }

                if (loginContainer) loginContainer.classList.add('hidden');
                if (appContainer) appContainer.classList.remove('hidden');
                
                document.getElementById('user-name').innerText = TEACHER_DATA.fullName;
                document.getElementById('user-avatar').src = TEACHER_DATA.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${TEACHER_DATA.email}&backgroundColor=e9d5ff`;
                
                db.collection("settings").doc("general").get().then(sDoc => { if(sDoc.exists) SCHOOL_SETTINGS = sDoc.data(); });
                
                initDashboard();
            } else {
                Swal.fire('Akses Ditolak', 'Akun Anda tidak terdaftar.', 'error'); auth.signOut();
            }
        });
    } else {
        if (loginContainer) loginContainer.classList.remove('hidden');
        if (appContainer) appContainer.classList.add('hidden');
        TEACHER_DATA = null; TEACHER_DOC_ID = null;
    }
});

async function handleTeacherLogin(event) {
    event.preventDefault(); 
    const email = document.getElementById('teacherEmail').value, password = document.getElementById('teacherPassword').value, btn = document.getElementById('btnLogin');
    btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin" width="18"></i> Memproses...`; btn.disabled = true;
    try { await auth.signInWithEmailAndPassword(email, password); Swal.fire({ icon: 'success', title: 'Berhasil Masuk', timer: 1500, showConfirmButton: false }); } 
    catch (error) { Swal.fire('Login Gagal', "Email/Password salah.", 'error'); } 
    finally { btn.innerHTML = `Masuk Portal <i data-lucide="arrow-right" width="18"></i>`; btn.disabled = false; lucide.createIcons(); }
}
function handleLogout() { Swal.fire({ title: 'Keluar Portal?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Ya, Keluar' }).then((r) => { if (r.isConfirmed) auth.signOut(); }); }

// --- 4. INIT & NAVIGATION ---
function initDashboard() { renderNavigation(); listenToDatabase(); renderContent(); }

function listenToDatabase() {
    db.collection("schedules").where("teacherId", "==", TEACHER_DOC_ID).onSnapshot((snap) => { mySchedules = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); });
    db.collection("exams").where("teacherId", "==", TEACHER_DOC_ID).onSnapshot((snap) => { myExams = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); });
    db.collection("exams").where("pengawasId", "==", TEACHER_DOC_ID).onSnapshot((snap) => { myInvigilations = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); }); // Pengawas CBT
    db.collection("announcements").orderBy("createdAt", "desc").onSnapshot((snap) => { allAnnouncements = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); });
    db.collection("students").orderBy("fullName", "asc").onSnapshot((snap) => { allStudents = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); });
    db.collection("grades").onSnapshot((snap) => { allGrades = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); });
    db.collection("syllabus").where("teacherId", "==", TEACHER_DOC_ID).onSnapshot((snap) => { allSyllabus = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); });
    db.collection("attendance").onSnapshot((snap) => { allAttendance = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); });
    db.collection("letters").where("senderId", "==", TEACHER_DOC_ID).onSnapshot((snap) => { myLetters = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateActiveViewData(); }); // Surat & Izin
}

function renderNavigation() {
    const container = document.getElementById('nav-container'); if (!container) return;
    container.innerHTML = NAV_ITEMS.map(item => `<button onclick="setTab('${item.id}')" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${currentTab === item.id ? 'bg-purple-600 text-white font-medium shadow-lg shadow-purple-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}"><i data-lucide="${item.icon}" class="${currentTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}" width="20"></i>${item.label}</button>`).join('');
    lucide.createIcons();
}

function setTab(tabId) {
    currentTab = tabId; const navItem = NAV_ITEMS.find(n => n.id === tabId); document.getElementById('page-title').innerText = navItem ? navItem.label : 'Portal Guru';
    const sidebar = document.getElementById('sidebar'); if (sidebar && sidebar.classList.contains('open')) toggleMobileMenu();
    renderNavigation(); renderContent();
}

function toggleMobileMenu() { const sidebar = document.getElementById('sidebar'), overlay = document.getElementById('mobile-overlay'); if (sidebar && overlay) { sidebar.classList.toggle('open'); overlay.classList.toggle('hidden'); } }

// --- 5. VIEW RENDERING ---
function renderContent() {
    const container = document.getElementById('main-content'); if (!container) return;
    switch(currentTab) {
        case 'dashboard': container.innerHTML = getDashboardHTML(); break;
        case 'schedule': container.innerHTML = getScheduleHTML(); break;
        case 'active-class': container.innerHTML = getActiveClassHTML(); break;
        case 'syllabus': container.innerHTML = getSyllabusHTML(); break; 
        case 'cbt': container.innerHTML = getCbtHTML(); break;
        case 'grades': container.innerHTML = getGradesHTML(); break; 
        case 'homeroom': container.innerHTML = getHomeroomHTML(); break; 
        case 'announcements': container.innerHTML = getAnnouncementsHTML(); break;
        case 'letters': container.innerHTML = getLettersHTML(); break; 
        case 'profile': container.innerHTML = getProfileHTML(); break; 
    }
    lucide.createIcons(); updateActiveViewData();
}

function updateActiveViewData() {
    if (currentTab === 'dashboard') { const cS = document.getElementById('dash-schedules'); if(cS) cS.innerText = mySchedules.length; const cE = document.getElementById('dash-exams'); if(cE) cE.innerText = myExams.length; } 
    else if (currentTab === 'schedule') { renderSchedules(); }
    else if (currentTab === 'active-class') { renderActiveClassList(); }
    else if (currentTab === 'syllabus') { renderSyllabusTable(); } 
    else if (currentTab === 'cbt') { renderExams(); }
    else if (currentTab === 'grades') { renderGradesTable(); } 
    else if (currentTab === 'homeroom') { renderHomeroomTable(); } 
    else if (currentTab === 'grade-history') { if(activeGradeStudentId) viewGradeHistory(activeGradeStudentId, activeGradeStudentName); }
    else if (currentTab === 'announcements') { renderAnnouncements(); }
    else if (currentTab === 'letters') { renderLettersTable(); }
}

// --- 6. LOGIKA VIEW GURU ---

// A. JADWAL & JURNAL KELAS (ABSENSI)
function renderSchedules() {
    const tbody = document.getElementById('mySchedulesBody'); if(!tbody) return;
    if(mySchedules.length === 0) return tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500">Anda belum memiliki jadwal mengajar.</td></tr>`;
    
    const dayOrder = { 'Senin':1, 'Selasa':2, 'Rabu':3, 'Kamis':4, 'Jumat':5, 'Sabtu':6 };
    let sorted = mySchedules.sort((a,b) => (dayOrder[a.day] - dayOrder[b.day]) || a.startTime.localeCompare(b.startTime));
    
    tbody.innerHTML = sorted.map(s => `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100">
            <td class="p-4 font-bold text-purple-700">${s.day}</td>
            <td class="p-4 font-mono text-sm">${s.startTime} - ${s.endTime}</td>
            <td class="p-4 font-bold text-slate-800">${s.subject} <span class="px-2 py-0.5 ml-2 bg-slate-100 text-slate-600 rounded text-xs">Kelas ${s.class}</span></td>
            <td class="p-4 text-slate-500">${s.room}</td>
            <td class="p-4 text-right">
                <button onclick="openClassSession('${s.class}', '${s.subject}')" class="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 ml-auto shadow-sm">
                    <i data-lucide="play-circle" width="16"></i> Mulai Kelas
                </button>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

function openClassSession(className, subject) { activeClassId = className; activeClassSubject = subject; currentTab = 'active-class'; document.getElementById('page-title').innerText = `Jurnal Kelas: ${className}`; renderContent(); }

function renderActiveClassList() {
    const tbody = document.getElementById('activeClassBody'); if (!tbody) return;
    const studentsInClass = allStudents.filter(s => s.kelas === activeClassId);

    if (studentsInClass.length === 0) return tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500">Tidak ada siswa di kelas ini.</td></tr>`;

    const todayStr = new Date().toISOString().split('T')[0];

    tbody.innerHTML = studentsInClass.map((s, index) => {
        const todaysAtt = allAttendance.find(a => a.studentId === s.id && a.date === todayStr && a.subject === activeClassSubject);
        const currentStatus = todaysAtt ? todaysAtt.status : 'Hadir'; 

        return `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100">
            <td class="p-4 font-medium text-slate-500 w-10 text-center">${index + 1}</td>
            <td class="p-4"><div class="font-bold text-slate-800">${s.fullName}</div><div class="text-xs text-slate-500">NISN: ${s.nisn}</div></td>
            <td class="p-4">
                <select id="att_${s.id}" class="w-full border border-slate-300 rounded-md py-1.5 px-2 text-sm focus:ring-blue-500 outline-none font-bold ${currentStatus === 'Hadir' ? 'text-green-700 bg-green-50' : currentStatus === 'Sakit' || currentStatus === 'Izin' ? 'text-orange-700 bg-orange-50' : 'text-red-700 bg-red-50'}">
                    <option value="Hadir" ${currentStatus === 'Hadir' ? 'selected' : ''}>✅ Hadir</option>
                    <option value="Sakit" ${currentStatus === 'Sakit' ? 'selected' : ''}>🤒 Sakit</option>
                    <option value="Izin" ${currentStatus === 'Izin' ? 'selected' : ''}>📝 Izin</option>
                    <option value="Alpha" ${currentStatus === 'Alpha' ? 'selected' : ''}>❌ Alpha</option>
                </select>
            </td>
            <td class="p-4"><input type="number" id="grade_${s.id}" min="0" max="100" placeholder="0-100" class="w-full border border-slate-300 rounded-md py-1.5 px-2 text-sm focus:ring-blue-500 outline-none font-bold text-center"></td>
            <td class="p-4 text-xs text-slate-500">Nilai Harian / Keaktifan (Opsional)</td>
        </tr>
        `;
    }).join('');
    
    studentsInClass.forEach(s => {
        const selectEl = document.getElementById(`att_${s.id}`);
        selectEl.addEventListener('change', (e) => {
            const val = e.target.value;
            selectEl.className = `w-full border border-slate-300 rounded-md py-1.5 px-2 text-sm focus:ring-blue-500 outline-none font-bold ${val === 'Hadir' ? 'text-green-700 bg-green-50' : val === 'Sakit' || val === 'Izin' ? 'text-orange-700 bg-orange-50' : 'text-red-700 bg-red-50'}`;
        });
    });
}

async function saveClassSession() {
    const studentsInClass = allStudents.filter(s => s.kelas === activeClassId);
    const todayStr = new Date().toISOString().split('T')[0];
    Swal.fire({ title: 'Menyimpan Jurnal...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

    try {
        const batch = db.batch(); 
        studentsInClass.forEach(s => {
            const attStatus = document.getElementById(`att_${s.id}`).value;
            const gradeScore = document.getElementById(`grade_${s.id}`).value;

            const existingAtt = allAttendance.find(a => a.studentId === s.id && a.date === todayStr && a.subject === activeClassSubject);
            if (existingAtt) {
                const attRef = db.collection("attendance").doc(existingAtt.id);
                batch.update(attRef, { status: attStatus, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
            } else {
                const attRef = db.collection("attendance").doc();
                batch.set(attRef, { studentId: s.id, studentName: s.fullName, class: activeClassId, teacherId: TEACHER_DOC_ID, subject: activeClassSubject, date: todayStr, status: attStatus, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            }

            if (gradeScore && gradeScore >= 0 && gradeScore <= 100) {
                const gradeRef = db.collection("grades").doc();
                batch.set(gradeRef, { studentId: s.id, studentName: s.fullName, class: activeClassId, subject: activeClassSubject, teacherId: TEACHER_DOC_ID, type: "Nilai Harian", score: parseInt(gradeScore), createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            }
        });
        await batch.commit(); 
        Swal.fire('Selesai!', 'Jurnal Mengajar dan Nilai Harian berhasil disimpan.', 'success').then(() => { setTab('schedule'); });
    } catch (error) { Swal.fire('Gagal Menyimpan', error.message, 'error'); }
}

// B. WALI KELAS & REKAP ABSENSI
function renderHomeroomTable() {
    const tbody = document.getElementById('homeroomTableBody'); if(!tbody) return;
    const hrClass = TEACHER_DATA.homeroomClass;
    const studentsInClass = allStudents.filter(s => s.kelas === hrClass);

    if (studentsInClass.length === 0) return tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500">Belum ada siswa di kelas Anda.</td></tr>`;

    tbody.innerHTML = studentsInClass.map((s, index) => {
        const studentGrades = allGrades.filter(g => g.studentId === s.id);
        const totalScore = studentGrades.reduce((sum, g) => sum + g.score, 0);
        const avgScore = studentGrades.length > 0 ? (totalScore / studentGrades.length).toFixed(1) : 0;

        const studentAtt = allAttendance.filter(a => a.studentId === s.id);
        const H = studentAtt.filter(a => a.status === 'Hadir').length;
        const S = studentAtt.filter(a => a.status === 'Sakit').length;
        const I = studentAtt.filter(a => a.status === 'Izin').length;
        const A = studentAtt.filter(a => a.status === 'Alpha').length;

        // Tambahkan tombol Koreksi Absen bersama tombol Rapor dan Naik Kelas
        return `<tr class="hover:bg-slate-50 transition border-b border-slate-100"><td class="p-4 font-medium text-slate-500 w-10 text-center">${index + 1}</td><td class="p-4"><div class="font-bold text-slate-800">${s.fullName}</div><div class="text-xs text-slate-500">NISN: ${s.nisn}</div></td><td class="p-4 text-center"><div class="font-bold text-blue-600 text-lg">${avgScore}</div></td><td class="p-4 text-center"><div class="flex items-center justify-center gap-2 text-xs font-bold font-mono"><span class="text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100" title="Hadir">H:${H}</span><span class="text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100" title="Sakit">S:${S}</span><span class="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100" title="Izin">I:${I}</span><span class="text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100" title="Alpha">A:${A}</span></div></td><td class="p-4 text-right"><div class="flex justify-end gap-2 flex-wrap">
            <button onclick="viewAttendanceHistory('${s.id}', '${s.fullName.replace(/'/g, "\\'")}')" class="px-3 py-1.5 bg-blue-50 text-blue-600 font-bold text-xs rounded-lg hover:bg-blue-100 transition flex items-center gap-1" title="Lihat Riwayat Absen"><i data-lucide="calendar-days" width="14"></i> Rekap</button>
            <button onclick="editGateAttendance('${s.id}', '${s.fullName.replace(/'/g, "\\'")}')" class="px-3 py-1.5 bg-orange-100 text-orange-700 font-bold text-xs rounded-lg hover:bg-orange-200 transition flex items-center gap-1" title="Koreksi Absen Hari Ini"><i data-lucide="clock" width="14"></i> Koreksi</button>
            <button onclick="printRapor('${s.id}')" class="px-3 py-1.5 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition flex items-center gap-1" title="Cetak Rapor Siswa"><i data-lucide="printer" width="14"></i> Rapor</button>
            <button onclick="promoteStudent('${s.id}', '${s.fullName.replace(/'/g, "\\'")}', '${s.kelas}')" class="px-3 py-1.5 bg-green-100 text-green-700 font-bold text-xs rounded-lg hover:bg-green-200 transition flex items-center gap-1" title="Validasi Kenaikan Kelas"><i data-lucide="trending-up" width="14"></i> Naik Kelas</button>
        </div></td></tr>`;
    }).join('');
    lucide.createIcons();
}

// Fungsi Edit Absensi Gerbang oleh Wali Kelas
function editGateAttendance(studentId, studentName) {
    const todayStr = new Date().toISOString().split('T')[0];
    const existingAtt = allAttendance.find(a => a.studentId === studentId && a.date === todayStr && a.type === 'Gerbang');
    
    const currentTime = existingAtt ? existingAtt.time : '';
    const currentStatus = existingAtt ? existingAtt.status : 'Hadir';

    Swal.fire({
        title: `Koreksi Absen: ${studentName}`,
        html: `
            <div class="text-left space-y-3 mt-3">
                <div>
                    <label class="block text-sm font-bold text-slate-700">Status Kehadiran</label>
                    <select id="corrStatus" class="w-full mt-1 border border-slate-300 rounded p-2 focus:ring-blue-500 outline-none">
                        <option value="Hadir" ${currentStatus === 'Hadir' ? 'selected' : ''}>Hadir</option>
                        <option value="Sakit" ${currentStatus === 'Sakit' ? 'selected' : ''}>Sakit</option>
                        <option value="Izin" ${currentStatus === 'Izin' ? 'selected' : ''}>Izin</option>
                        <option value="Alpha" ${currentStatus === 'Alpha' ? 'selected' : ''}>Alpha</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-bold text-slate-700">Waktu Kedatangan (HH:MM)</label>
                    <input type="time" id="corrTime" value="${currentTime}" class="w-full mt-1 border border-slate-300 rounded p-2 focus:ring-blue-500 outline-none">
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Simpan Koreksi',
        preConfirm: () => {
            return {
                status: document.getElementById('corrStatus').value,
                time: document.getElementById('corrTime').value
            }
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            const vals = result.value;
            Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading() });
            
            try {
                if (existingAtt) {
                    await db.collection('attendance').doc(existingAtt.id).update({
                        status: vals.status,
                        time: vals.time,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    await db.collection('attendance').add({
                        studentId: studentId,
                        studentName: studentName,
                        class: TEACHER_DATA.homeroomClass,
                        date: todayStr,
                        time: vals.time,
                        status: vals.status,
                        type: 'Gerbang', 
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                Swal.fire('Berhasil', 'Absen hari ini telah dikoreksi', 'success');
            } catch (e) {
                Swal.fire('Gagal', e.message, 'error');
            }
        }
    });
}

function promoteStudent(studentId, studentName, currentClass) { let nextClass = ""; let actionText = ""; if (currentClass === "VII") { nextClass = "VIII"; actionText = "Naik ke Kelas VIII"; } else if (currentClass === "VIII") { nextClass = "IX"; actionText = "Naik ke Kelas IX"; } else if (currentClass === "IX") { nextClass = "Lulus"; actionText = "Lulus (Menjadi Alumni)"; } else { return Swal.fire('Informasi', 'Siswa ini sudah lulus atau status kelas tidak valid.', 'info'); } Swal.fire({ title: 'Validasi Kenaikan Kelas?', html: `Apakah Anda yakin nilai <b>${studentName}</b> memenuhi syarat untuk <b class="text-green-600">${actionText}</b>?<br><br><span class="text-xs text-red-500 font-bold"><i data-lucide="alert-triangle" class="inline w-3 h-3"></i> Peringatan: Siswa ini akan dipindahkan dari kelas Anda setelah divalidasi.</span>`, icon: 'question', showCancelButton: true, confirmButtonColor: '#16a34a', confirmButtonText: 'Ya, Validasi!', cancelButtonText: 'Batal' }).then(async (result) => { if (result.isConfirmed) { Swal.fire({ title: 'Memproses...', didOpen: () => Swal.showLoading(), allowOutsideClick: false }); try { await db.collection("students").doc(studentId).update({ kelas: nextClass, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); Swal.fire('Berhasil!', `${studentName} telah divalidasi: ${actionText}.`, 'success'); } catch (error) { Swal.fire('Gagal', error.message, 'error'); } } }); }

function viewAttendanceHistory(studentId, studentName) { 
    currentTab = 'attendance-history'; 
    activeAttStudentId = studentId; 
    activeAttStudentName = studentName; 
    document.getElementById('page-title').innerText = `Rekap Absensi`; 
    const container = document.getElementById('main-content'); 

    // Ambil semua data absen siswa ini, urutkan dari yang terbaru
    const studentAtt = allAttendance.filter(a => a.studentId === studentId).sort((a,b) => new Date(b.date) - new Date(a.date)); 

    let rows = studentAtt.map((a, index) => { 
        let statusColor = a.status === 'Hadir' ? 'text-green-700 bg-green-100' : a.status === 'Sakit' ? 'text-orange-700 bg-orange-100' : a.status === 'Izin' ? 'text-blue-700 bg-blue-100' : 'text-red-700 bg-red-100'; 
        return `<tr class="hover:bg-slate-50 transition border-b border-slate-100"><td class="p-4 text-center text-slate-500">${index + 1}</td><td class="p-4 font-medium text-slate-800">${new Date(a.date).toLocaleDateString('id-ID', {weekday: 'long', day:'numeric', month:'long', year:'numeric'})}</td><td class="p-4 font-mono text-sm text-slate-600 font-bold">${a.time || '-'} WIB</td><td class="p-4"><span class="px-3 py-1 rounded-md text-xs font-bold ${statusColor}">${a.status}</span></td><td class="p-4 text-slate-500 text-sm">${a.type === 'Gerbang' ? '<i data-lucide="scan-line" class="inline w-4 h-4 mr-1"></i> Scan Gerbang' : '<i data-lucide="user-cog" class="inline w-4 h-4 mr-1"></i> Manual Guru'}</td></tr>`; 
    }).join(''); 

    if(studentAtt.length === 0) rows = `<tr><td colspan="5" class="p-8 text-center text-slate-500">Belum ada riwayat absensi untuk siswa ini.</td></tr>`; 

    container.innerHTML = `<div class="space-y-6 animate-fade-in"><div class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200"><div><h2 class="text-xl font-bold text-slate-800">Detail Riwayat Absensi</h2><p class="text-slate-500 text-sm">Siswa: <span class="font-bold text-purple-600">${studentName}</span></p></div><button onclick="setTab('homeroom')" class="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 transition flex items-center gap-2"><i data-lucide="arrow-left" width="16"></i> Kembali</button></div><div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><table class="w-full text-left border-collapse"><thead class="bg-slate-50 text-slate-500 text-xs uppercase font-semibold"><tr><th class="p-4 border-b border-slate-100 w-12 text-center">No</th><th class="p-4 border-b border-slate-100">Hari, Tanggal</th><th class="p-4 border-b border-slate-100">Waktu Kedatangan</th><th class="p-4 border-b border-slate-100">Status</th><th class="p-4 border-b border-slate-100">Metode Absen</th></tr></thead><tbody class="text-sm divide-y divide-slate-100">${rows}</tbody></table></div></div>`; 
    lucide.createIcons(); 
}
function printRapor(studentId) { const student = allStudents.find(s => s.id === studentId); if(!student) return; const studentGrades = allGrades.filter(g => g.studentId === studentId); const subjectAverages = {}; studentGrades.forEach(g => { if(!subjectAverages[g.subject]) subjectAverages[g.subject] = { total: 0, count: 0 }; subjectAverages[g.subject].total += g.score; subjectAverages[g.subject].count += 1; }); let tableRows = ''; let i = 1; for (const [subject, data] of Object.entries(subjectAverages)) { const avg = Math.round(data.total / data.count); let predicate = avg >= 90 ? 'A' : avg >= 80 ? 'B' : avg >= 70 ? 'C' : 'D'; let desc = ""; const relevantSyllabus = allSyllabus.find(s => s.subject === subject && s.class === student.kelas); if (relevantSyllabus) { desc = avg >= 80 ? `Tuntas. ${relevantSyllabus.desc}` : `Perlu bimbingan dalam ${relevantSyllabus.desc}`; } else { desc = avg >= 80 ? 'Tuntas dengan baik sesuai kriteria capaian.' : 'Perlu bimbingan lebih lanjut pada mata pelajaran ini.'; } tableRows += `<tr><td style="border: 1px solid #000; padding: 8px; text-align: center;">${i++}</td><td style="border: 1px solid #000; padding: 8px;">${subject}</td><td style="border: 1px solid #000; padding: 8px; text-align: center;">75</td><td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">${avg}</td><td style="border: 1px solid #000; padding: 8px; text-align: center;">${predicate}</td><td style="border: 1px solid #000; padding: 8px; font-size: 11pt;">${desc}</td></tr>`; } if (Object.keys(subjectAverages).length === 0) { tableRows = `<tr><td colspan="6" style="border: 1px solid #000; padding: 15px; text-align: center;">Belum ada nilai yang masuk pada semester ini.</td></tr>`; } const printWindow = window.open('', '', 'height=800,width=800'); printWindow.document.write(`<html><head><title>Cetak Rapor - ${student.fullName}</title><style>@page { size: 215.9mm 330.2mm; margin: 15mm; } body { font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.5; font-size: 12pt; } .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 20px; } .header h1, .header h2 { margin: 0; } .info-table { width: 100%; margin-bottom: 20px; } .info-table td { padding: 4px 0; } .grades-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; } .grades-table th { border: 1px solid #000; padding: 10px; background-color: #f0f0f0; } .footer { width: 100%; margin-top: 50px; } .footer-box { width: 33%; display: inline-block; text-align: center; } .signature { margin-top: 60px; font-weight: bold; text-decoration: underline; }</style></head><body><div class="header"><h2>LAPORAN HASIL BELAJAR PESERTA DIDIK</h2><h1>${SCHOOL_SETTINGS.schoolName.toUpperCase()}</h1></div><table class="info-table"><tr><td width="20%">Nama Siswa</td><td width="30%">: <b>${student.fullName}</b></td><td width="20%">Kelas</td><td width="30%">: <b>${student.kelas}</b></td></tr><tr><td>NISN</td><td>: ${student.nisn}</td><td>Semester</td><td>: <b>${SCHOOL_SETTINGS.semester}</b></td></tr><tr><td>Nama Orang Tua</td><td>: ${student.parentName || '-'}</td><td>Tahun Ajaran</td><td>: <b>${SCHOOL_SETTINGS.academicYear}</b></td></tr></table><table class="grades-table"><thead><tr><th width="5%">No</th><th width="30%">Mata Pelajaran</th><th width="10%">KKM</th><th width="15%">Nilai Akhir</th><th width="10%">Predikat</th><th width="30%">Deskripsi Ketercapaian</th></tr></thead><tbody>${tableRows}</tbody></table><div class="footer"><div class="footer-box">Mengetahui,<br>Orang Tua / Wali<div class="signature">.......................................</div></div><div class="footer-box"><br>Wali Kelas<div class="signature">${TEACHER_DATA.fullName}</div></div><div class="footer-box">Sidoarjo, ${new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}<br>Kepala Sekolah<div class="signature">${SCHOOL_SETTINGS.headmaster}</div></div></div></body></html>`); printWindow.document.close(); printWindow.focus(); setTimeout(() => { printWindow.print(); printWindow.close(); }, 500); }

// --- FUNGSI LAINNYA (Silabus, Input Nilai, Surat, Dll) ---
function renderSyllabusTable() { const classFilter = document.getElementById('syllabusClassFilter')?.value || "VII"; const tbody = document.getElementById('syllabusTableBody'); if (!tbody) return; const filtered = allSyllabus.filter(s => s.class === classFilter).sort((a,b) => a.code.localeCompare(b.code)); if (filtered.length === 0) { tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500">Belum ada data KD/TP untuk kelas ini.</td></tr>`; return; } tbody.innerHTML = filtered.map((s) => `<tr class="hover:bg-slate-50 transition border-b border-slate-100"><td class="p-4"><span class="font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded text-xs">${s.code}</span></td><td class="p-4 font-bold text-slate-800">${s.subject}</td><td class="p-4 text-sm text-slate-700 font-medium">${s.topic}</td><td class="p-4 text-xs text-slate-500 leading-relaxed max-w-xs truncate" title="${s.desc}">${s.desc}</td><td class="p-4 text-right"><div class="flex justify-end gap-2"><button onclick="editSyllabus('${s.id}')" class="p-1 text-slate-400 hover:text-amber-600 transition"><i data-lucide="edit" width="16"></i></button><button onclick="deleteSyllabus('${s.id}')" class="p-1 text-slate-400 hover:text-red-600 transition"><i data-lucide="trash-2" width="16"></i></button></div></td></tr>`).join(''); lucide.createIcons(); }
function getSubjectOptions() { const subjects = TEACHER_DATA.subject ? TEACHER_DATA.subject.split(',').map(s => s.trim()) : ['Umum']; return subjects.map(s => `<option value="${s}">${s}</option>`).join(''); }
function openSyllabusModal(id = null) { document.getElementById('syllabusModal').classList.remove('hidden'); document.getElementById('syllabusSubject').innerHTML = getSubjectOptions(); if (id) { const s = allSyllabus.find(x => x.id === id); document.getElementById('syllabusModalTitle').innerText = "Edit Kompetensi Dasar (KD/TP)"; document.getElementById('syllabusId').value = s.id; document.getElementById('syllabusSubject').value = s.subject; document.getElementById('syllabusClass').value = s.class; document.getElementById('syllabusSemester').value = s.semester; document.getElementById('syllabusCode').value = s.code; document.getElementById('syllabusTopic').value = s.topic; document.getElementById('syllabusDesc').value = s.desc; } else { document.getElementById('syllabusModalTitle').innerText = "Tambah Kompetensi Dasar (KD/TP)"; document.getElementById('syllabusForm').reset(); document.getElementById('syllabusId').value = ""; document.getElementById('syllabusClass').value = document.getElementById('syllabusClassFilter').value; } }
function closeSyllabusModal() { document.getElementById('syllabusModal').classList.add('hidden'); }
async function saveSyllabus() { const id = document.getElementById('syllabusId').value; const data = { teacherId: TEACHER_DOC_ID, subject: document.getElementById('syllabusSubject').value, class: document.getElementById('syllabusClass').value, semester: document.getElementById('syllabusSemester').value, code: document.getElementById('syllabusCode').value, topic: document.getElementById('syllabusTopic').value, desc: document.getElementById('syllabusDesc').value, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }; if (!data.code || !data.desc) return Swal.fire('Peringatan', 'Kode dan Deskripsi KD wajib diisi!', 'warning'); Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading(), allowOutsideClick: false }); try { if (id) await db.collection("syllabus").doc(id).update(data); else { data.createdAt = firebase.firestore.FieldValue.serverTimestamp(); await db.collection("syllabus").add(data); } Swal.fire('Sukses', 'Data Silabus/RPP berhasil disimpan', 'success'); closeSyllabusModal(); } catch (e) { Swal.fire('Gagal', e.message, 'error'); } }
function deleteSyllabus(id) { Swal.fire({ title: 'Hapus Data?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then((r) => { if (r.isConfirmed) db.collection("syllabus").doc(id).delete().then(() => Swal.fire('Terhapus', '', 'success')); }); }
function editSyllabus(id) { openSyllabusModal(id); }

function renderGradesTable() { const classFilter = document.getElementById('gradeClassFilter')?.value || "VII"; const tbody = document.getElementById('gradesTableBody'); if (!tbody) return; const filteredStudents = allStudents.filter(s => s.kelas === classFilter); if (filteredStudents.length === 0) return tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500">Tidak ada data siswa di kelas ini.</td></tr>`; const subjectOptions = getSubjectOptions(); tbody.innerHTML = filteredStudents.map((s, index) => { const studentGrades = allGrades.filter(g => g.studentId === s.id && g.teacherId === TEACHER_DOC_ID).sort((a,b) => b.createdAt - a.createdAt); const lastGrade = studentGrades.length > 0 ? `<span class="text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">Terakhir: ${studentGrades[0].subject} - ${studentGrades[0].score}</span>` : ''; return `<tr class="hover:bg-slate-50 transition border-b border-slate-100"><td class="p-4 font-medium text-slate-500 w-10 text-center">${index + 1}</td><td class="p-4"><div class="font-bold text-slate-800">${s.fullName}</div><div class="text-xs text-slate-500 mb-1">NISN: ${s.nisn}</div>${lastGrade}</td><td class="p-4"><select id="subject_${s.id}" class="w-full border border-slate-300 rounded-md py-1.5 px-2 text-sm focus:ring-purple-500 outline-none mb-2 font-bold text-purple-700 bg-purple-50">${subjectOptions}</select><select id="type_${s.id}" class="w-full border border-slate-300 rounded-md py-1.5 px-2 text-sm focus:ring-purple-500 outline-none"><option value="Tugas Harian">Tugas Harian</option><option value="Ulangan Harian">Ulangan Harian</option><option value="Keaktifan">Keaktifan / Diskusi</option><option value="Keterampilan">Praktik / Keterampilan</option></select></td><td class="p-4"><input type="number" id="score_${s.id}" min="0" max="100" placeholder="0-100" class="w-20 border border-slate-300 rounded-md py-1.5 px-2 text-sm focus:ring-purple-500 outline-none font-bold text-center"></td><td class="p-4 text-right"><div class="flex flex-col gap-2"><button onclick="saveStudentGrade('${s.id}', '${s.fullName.replace(/'/g, "\\'")}')" class="px-3 py-1.5 bg-purple-600 text-white font-bold text-xs rounded hover:bg-purple-700 transition flex items-center justify-center gap-1"><i data-lucide="save" width="14"></i> Simpan</button><button onclick="viewGradeHistory('${s.id}', '${s.fullName.replace(/'/g, "\\'")}')" class="px-3 py-1.5 bg-slate-100 text-slate-700 font-bold text-xs rounded hover:bg-slate-200 transition flex items-center justify-center gap-1"><i data-lucide="history" width="14"></i> Riwayat</button></div></td></tr>` }).join(''); lucide.createIcons(); }
async function saveStudentGrade(studentId, studentName) { const scoreInput = document.getElementById(`score_${studentId}`).value; const typeValue = document.getElementById(`type_${studentId}`).value; const subjectValue = document.getElementById(`subject_${studentId}`).value; const classValue = document.getElementById('gradeClassFilter').value; if (!scoreInput || scoreInput < 0 || scoreInput > 100) return Swal.fire('Peringatan', 'Masukkan nilai antara 0 - 100!', 'warning'); const data = { studentId: studentId, studentName: studentName, class: classValue, subject: subjectValue, teacherId: TEACHER_DOC_ID, type: typeValue, score: parseInt(scoreInput), createdAt: firebase.firestore.FieldValue.serverTimestamp() }; try { await db.collection("grades").add(data); document.getElementById(`score_${studentId}`).value = ''; Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 }).fire({ icon: 'success', title: `Nilai tersimpan!` }); } catch (error) { Swal.fire('Gagal', 'Terjadi kesalahan: ' + error.message, 'error'); } }
function viewGradeHistory(studentId, studentName) { currentTab = 'grade-history'; activeGradeStudentId = studentId; activeGradeStudentName = studentName; document.getElementById('page-title').innerText = `Riwayat Nilai`; const container = document.getElementById('main-content'); const studentGrades = allGrades.filter(g => g.studentId === studentId && g.teacherId === TEACHER_DOC_ID).sort((a,b) => b.createdAt - a.createdAt); let rows = studentGrades.map((g, index) => `<tr class="hover:bg-slate-50 transition border-b border-slate-100"><td class="p-4 text-center text-slate-500">${index + 1}</td><td class="p-4 font-bold text-purple-700">${g.subject}</td><td class="p-4 font-medium text-slate-800">${g.type}</td><td class="p-4 font-bold text-purple-600 text-center text-lg">${g.score}</td><td class="p-4 text-sm text-slate-500">${g.createdAt ? new Date(g.createdAt.seconds * 1000).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) : '-'}</td><td class="p-4 text-right"><div class="flex justify-end gap-2"><button onclick="editGrade('${g.id}', ${g.score})" class="px-3 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold hover:bg-amber-200 transition"><i data-lucide="edit" width="14"></i></button><button onclick="deleteGrade('${g.id}')" class="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-bold hover:bg-red-200 transition"><i data-lucide="trash-2" width="14"></i></button></div></td></tr>`).join(''); if(studentGrades.length === 0) rows = `<tr><td colspan="6" class="p-8 text-center text-slate-500">Belum ada riwayat nilai untuk siswa ini.</td></tr>`; container.innerHTML = `<div class="space-y-6 animate-fade-in"><div class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200"><div><h2 class="text-xl font-bold text-slate-800">Buku Nilai Detail</h2><p class="text-slate-500 text-sm">Siswa: <span class="font-bold text-purple-600">${studentName}</span></p></div><button onclick="setTab('grades')" class="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 transition flex items-center gap-2"><i data-lucide="arrow-left" width="16"></i> Kembali</button></div><div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><table class="w-full text-left border-collapse"><thead class="bg-slate-50 text-slate-500 text-xs uppercase font-semibold"><tr><th class="p-4 border-b border-slate-100 w-12 text-center">No</th><th class="p-4 border-b border-slate-100">Mapel</th><th class="p-4 border-b border-slate-100">Jenis Penilaian</th><th class="p-4 border-b border-slate-100 text-center w-24">Skor</th><th class="p-4 border-b border-slate-100">Tanggal Input</th><th class="p-4 border-b border-slate-100 text-right">Aksi</th></tr></thead><tbody class="text-sm divide-y divide-slate-100">${rows}</tbody></table></div></div>`; lucide.createIcons(); }
function editGrade(gradeId, currentScore) { Swal.fire({ title: 'Koreksi Nilai', input: 'number', inputValue: currentScore, showCancelButton: true, confirmButtonColor: '#9333ea', inputValidator: (value) => { if (!value || value < 0 || value > 100) return 'Nilai harus 0-100!' } }).then(async (result) => { if (result.isConfirmed) { try { await db.collection("grades").doc(gradeId).update({ score: parseInt(result.value), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); Swal.fire('Tersimpan!', 'Nilai berhasil dikoreksi.', 'success'); } catch(e) { Swal.fire('Gagal', e.message, 'error'); } } }); }
function deleteGrade(gradeId) { Swal.fire({ title: 'Hapus Nilai?', text: 'Tindakan ini tidak dapat dibatalkan.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then(async (result) => { if (result.isConfirmed) { await db.collection("grades").doc(gradeId).delete(); Swal.fire('Terhapus', 'Nilai dihapus.', 'success'); } }); }

// Manajemen Ujian & Bank Soal (PENGAMPU & PENGAWAS)
function renderExams() { 
    const container = document.getElementById('cbtExamsContainer'); if(!container) return; 
    let html = '';

    // --- SEKSI 1: UJIAN DIAMPU (PENGAMPU) ---
    html += `<div class="col-span-full mb-1"><h3 class="font-bold text-lg text-slate-800 border-b pb-2 border-slate-200 flex items-center gap-2"><i data-lucide="edit-3" class="text-blue-600"></i> Ujian Diampu (Kelola Soal)</h3></div>`;
    if(myExams.length === 0) {
        html += `<div class="col-span-full p-6 text-center text-slate-500 bg-white rounded-xl border border-slate-200 border-dashed mb-6">Tidak ada ujian yang diampu.</div>`;
    } else {
        html += myExams.map(e => `<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition mb-4"><div class="flex justify-between items-start mb-3"><div><span class="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase rounded">${e.type}</span><h3 class="font-bold text-lg text-slate-800 mt-2">${e.subject}</h3><p class="text-sm text-slate-500">Kelas ${e.class}</p></div><div class="text-right"><div class="text-xs font-bold text-slate-400">TANGGAL</div><div class="text-sm font-semibold text-slate-700">${new Date(e.date).toLocaleDateString('id-ID')}</div></div></div><div class="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 mb-4 font-mono flex justify-between"><span>Jam: ${e.startTime}</span> <span>Durasi: ${e.duration} Menit</span></div><button onclick="manageQuestions('${e.id}', '${e.subject}')" class="w-full py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition flex items-center justify-center gap-2"><i data-lucide="database" width="16"></i> Kelola Bank Soal</button></div>`).join('');
    }

    // --- SEKSI 2: JADWAL PENGAWASAN ---
    html += `<div class="col-span-full mt-4 mb-1"><h3 class="font-bold text-lg text-slate-800 border-b pb-2 border-slate-200 flex items-center gap-2"><i data-lucide="eye" class="text-orange-600"></i> Tugas Pengawasan Ujian</h3></div>`;
    if(myInvigilations.length === 0) {
        html += `<div class="col-span-full p-6 text-center text-slate-500 bg-white rounded-xl border border-slate-200 border-dashed">Tidak ada jadwal pengawasan.</div>`;
    } else {
        html += myInvigilations.map(e => `<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition border-l-4 border-l-orange-500"><div class="flex justify-between items-start mb-3"><div><span class="px-2 py-1 bg-orange-100 text-orange-700 text-[10px] font-bold uppercase rounded">Jadwal Mengawas</span><h3 class="font-bold text-lg text-slate-800 mt-2">${e.subject}</h3><p class="text-sm text-slate-500">Kelas ${e.class}</p></div><div class="text-right"><div class="text-xs font-bold text-slate-400">RUANG</div><div class="text-sm font-bold text-orange-600">${e.room || 'Belum diatur'}</div></div></div><div class="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 font-mono flex flex-col gap-1.5"><div class="flex justify-between border-b border-slate-100 pb-1"><span>Tanggal:</span> <strong>${new Date(e.date).toLocaleDateString('id-ID')}</strong></div><div class="flex justify-between border-b border-slate-100 pb-1"><span>Waktu:</span> <strong>${e.startTime} (${e.duration} Mnt)</strong></div><div class="flex justify-between text-blue-600"><span>Pengampu:</span> <strong>${e.teacherName}</strong></div></div></div>`).join('');
    }
    
    container.innerHTML = html;
    lucide.createIcons(); 
}
function manageQuestions(examId, subject) { currentTab = 'cbt-questions'; document.getElementById('page-title').innerText = `Bank Soal: ${subject}`; const container = document.getElementById('main-content'); container.innerHTML = `<div class="space-y-6 animate-fade-in"><div class="flex justify-between items-center"><button onclick="setTab('cbt')" class="text-slate-500 hover:text-slate-800 flex items-center gap-2 text-sm font-bold"><i data-lucide="arrow-left" width="16"></i> Kembali</button><button onclick="openQuestionModal('${examId}')" class="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 flex items-center gap-2 text-sm"><i data-lucide="plus" width="16"></i> Tambah Soal</button></div><div id="questionsList" class="space-y-4"><div class="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200 animate-pulse">Memuat soal...</div></div></div>`; lucide.createIcons(); db.collection("exams").doc(examId).collection("questions").orderBy("createdAt", "asc").onSnapshot((snap) => { currentExamQuestions = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); renderQuestionsList(examId); }); }
function renderQuestionsList(examId) { const list = document.getElementById('questionsList'); if(!list) return; if(currentExamQuestions.length === 0) return list.innerHTML = `<div class="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200 border-dashed">Belum ada soal. Klik Tambah Soal di pojok kanan atas.</div>`; list.innerHTML = currentExamQuestions.map((q, index) => `<div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm relative pr-20"><div class="absolute top-4 right-4 flex gap-1"><button onclick="editQuestion('${examId}', '${q.id}')" class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"><i data-lucide="edit" width="18"></i></button><button onclick="deleteQuestion('${examId}', '${q.id}')" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"><i data-lucide="trash-2" width="18"></i></button></div><div class="flex gap-4"><div class="font-bold text-slate-400 text-lg">${index + 1}.</div><div class="flex-1"><p class="font-medium text-slate-800 mb-3">${q.text}</p>${q.mediaType === 'image' ? `<img src="${q.mediaUrl}" class="h-32 object-contain border border-slate-200 rounded mb-3">` : ''}${q.mediaType === 'video' ? `<a href="${q.mediaUrl}" target="_blank" class="text-blue-500 text-xs flex items-center gap-1 mb-3"><i data-lucide="youtube" width="14"></i> Lihat Video Referensi</a>` : ''}<div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm"><div class="p-2 rounded border ${q.correctOpt === 'A' ? 'border-green-500 bg-green-50 text-green-800 font-bold' : 'border-slate-100 bg-slate-50 text-slate-600'}">A. ${q.options.A}</div><div class="p-2 rounded border ${q.correctOpt === 'B' ? 'border-green-500 bg-green-50 text-green-800 font-bold' : 'border-slate-100 bg-slate-50 text-slate-600'}">B. ${q.options.B}</div><div class="p-2 rounded border ${q.correctOpt === 'C' ? 'border-green-500 bg-green-50 text-green-800 font-bold' : 'border-slate-100 bg-slate-50 text-slate-600'}">C. ${q.options.C}</div><div class="p-2 rounded border ${q.correctOpt === 'D' ? 'border-green-500 bg-green-50 text-green-800 font-bold' : 'border-slate-100 bg-slate-50 text-slate-600'}">D. ${q.options.D}</div></div></div></div></div>`).join(''); lucide.createIcons(); }
function toggleMediaInput() { const type = document.getElementById('qMediaType').value, container = document.getElementById('mediaInputContainer'), label = document.getElementById('mediaLabel'), inputImg = document.getElementById('qMediaImage'), inputVid = document.getElementById('qMediaVideo'), preview = document.getElementById('qImagePreviewBox'); if(type === 'none') { container.classList.add('hidden'); } else { container.classList.remove('hidden'); if(type === 'image') { label.innerText = "Upload Gambar"; inputImg.classList.remove('hidden'); inputVid.classList.add('hidden'); if(qCompressedImageBase64) preview.classList.remove('hidden'); } else { label.innerText = "Link YouTube (Embed URL)"; inputImg.classList.add('hidden'); inputVid.classList.remove('hidden'); preview.classList.add('hidden'); } } }
function handleQuestionImage(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = function (e) { const img = new Image(); img.src = e.target.result; img.onload = function () { const canvas = document.createElement('canvas'); let width = img.width, height = img.height; const MAX = 600; if (width > height) { if (width > MAX) { height *= MAX / width; width = MAX; } } else { if (height > MAX) { width *= MAX / height; height = MAX; } } canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height); let quality = 0.9, dataUrl = canvas.toDataURL('image/jpeg', quality); while (dataUrl.length > 100000 && quality > 0.1) { quality -= 0.1; dataUrl = canvas.toDataURL('image/jpeg', quality); } qCompressedImageBase64 = dataUrl; document.getElementById('qImagePreview').src = dataUrl; document.getElementById('qImagePreviewBox').classList.remove('hidden'); } } }
function openQuestionModal(examId) { document.getElementById('questionModal').classList.remove('hidden'); document.getElementById('questionModalTitle').innerText = "Tambah Soal CBT"; document.getElementById('questionForm').reset(); document.getElementById('qExamId').value = examId; document.getElementById('qId').value = ""; qCompressedImageBase64 = null; document.getElementById('qImagePreviewBox').classList.add('hidden'); toggleMediaInput(); }
function editQuestion(examId, qId) { const q = currentExamQuestions.find(x => x.id === qId); if (!q) return; document.getElementById('questionModal').classList.remove('hidden'); document.getElementById('questionModalTitle').innerText = "Edit Soal CBT"; document.getElementById('qExamId').value = examId; document.getElementById('qId').value = q.id; document.getElementById('qText').value = q.text; document.getElementById('qMediaType').value = q.mediaType; if (q.mediaType === 'image') { qCompressedImageBase64 = q.mediaUrl; document.getElementById('qImagePreview').src = q.mediaUrl; document.getElementById('qImagePreviewBox').classList.remove('hidden'); document.getElementById('qMediaVideo').value = ""; } else if (q.mediaType === 'video') { qCompressedImageBase64 = null; document.getElementById('qMediaVideo').value = q.mediaUrl; document.getElementById('qImagePreviewBox').classList.add('hidden'); } else { qCompressedImageBase64 = null; document.getElementById('qMediaVideo').value = ""; document.getElementById('qImagePreviewBox').classList.add('hidden'); } toggleMediaInput(); document.getElementById('qOptA').value = q.options.A; document.getElementById('qOptB').value = q.options.B; document.getElementById('qOptC').value = q.options.C; document.getElementById('qOptD').value = q.options.D; document.getElementById('qCorrectOpt').value = q.correctOpt; }
function closeQuestionModal() { document.getElementById('questionModal').classList.add('hidden'); }
async function saveQuestion() { const examId = document.getElementById('qExamId').value; const qId = document.getElementById('qId').value; const text = document.getElementById('qText').value; const mediaType = document.getElementById('qMediaType').value; let mediaUrl = ""; if (mediaType === 'image') { if (!qCompressedImageBase64) return Swal.fire('Error', 'Anda memilih media gambar namun belum mengunggah gambar!', 'error'); mediaUrl = qCompressedImageBase64; } else if (mediaType === 'video') { mediaUrl = document.getElementById('qMediaVideo').value; if (!mediaUrl) return Swal.fire('Error', 'Masukkan URL Video!', 'error'); } const data = { text: text, mediaType: mediaType, mediaUrl: mediaUrl, options: { A: document.getElementById('qOptA').value, B: document.getElementById('qOptB').value, C: document.getElementById('qOptC').value, D: document.getElementById('qOptD').value }, correctOpt: document.getElementById('qCorrectOpt').value }; Swal.fire({ title: 'Menyimpan Soal...', didOpen: () => Swal.showLoading(), allowOutsideClick: false }); try { if (qId) { data.updatedAt = firebase.firestore.FieldValue.serverTimestamp(); await db.collection("exams").doc(examId).collection("questions").doc(qId).update(data); Swal.fire('Sukses', 'Soal berhasil diperbarui', 'success'); } else { data.createdAt = firebase.firestore.FieldValue.serverTimestamp(); await db.collection("exams").doc(examId).collection("questions").add(data); Swal.fire('Sukses', 'Soal berhasil ditambahkan', 'success'); } closeQuestionModal(); } catch (e) { Swal.fire('Gagal', e.message, 'error'); } }
function deleteQuestion(examId, qId) { Swal.fire({ title: 'Hapus Soal?', icon: 'warning', showCancelButton: true }).then((r) => { if (r.isConfirmed) db.collection("exams").doc(examId).collection("questions").doc(qId).delete(); }); }


function renderLettersTable() {
    const tbody = document.getElementById('lettersTableBody'); if (!tbody) return;
    const sortedLetters = myLetters.sort((a,b) => {
        const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
    });

    if (sortedLetters.length === 0) return tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500">Anda belum pernah mengajukan surat / izin.</td></tr>`;

    tbody.innerHTML = sortedLetters.map((l, index) => {
        let statusBadge = l.status === 'Disetujui' ? '<span class="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold">Disetujui</span>' : l.status === 'Ditolak' ? '<span class="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold">Ditolak</span>' : '<span class="px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-xs font-bold animate-pulse">Menunggu</span>';
        const dateStr = l.createdAt ? new Date(l.createdAt.seconds * 1000).toLocaleDateString('id-ID') : '-';
        const deleteBtn = l.status === 'Menunggu' ? `<button onclick="deleteLetter('${l.id}')" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Batalkan Pengajuan"><i data-lucide="trash-2" width="16"></i></button>` : '';

        return `<tr class="hover:bg-slate-50 transition border-b border-slate-100"><td class="p-4 font-medium text-slate-500 w-10 text-center">${index + 1}</td><td class="p-4"><div class="font-bold text-slate-800">${l.type}</div><div class="text-xs text-slate-500 mt-1 line-clamp-1">${l.description}</div></td><td class="p-4 text-sm text-slate-600">${dateStr}</td><td class="p-4">${statusBadge} ${l.adminNote ? `<div class="text-[10px] text-blue-600 mt-1 bg-blue-50 p-1 rounded inline-block w-full"><b>Admin:</b> ${l.adminNote}</div>` : ''}</td><td class="p-4 text-right">${deleteBtn}</td></tr>`;
    }).join('');
    lucide.createIcons();
}
function openLetterModal() { document.getElementById('letterModal').classList.remove('hidden'); document.getElementById('letterForm').reset(); }
function closeLetterModal() { document.getElementById('letterModal').classList.add('hidden'); }
async function submitLetter() { const type = document.getElementById('letterType').value; const desc = document.getElementById('letterDesc').value; if (!desc) return Swal.fire('Peringatan', 'Keterangan alasan wajib diisi!', 'warning'); const data = { senderId: TEACHER_DOC_ID, senderName: TEACHER_DATA.fullName, senderRole: 'teacher', type: type, description: desc, status: 'Menunggu', adminNote: '', createdAt: firebase.firestore.FieldValue.serverTimestamp() }; Swal.fire({ title: 'Mengirim Pengajuan...', didOpen: () => Swal.showLoading(), allowOutsideClick: false }); try { await db.collection("letters").add(data); Swal.fire('Berhasil', 'Pengajuan berhasil dikirim ke Admin.', 'success'); closeLetterModal(); } catch (e) { Swal.fire('Gagal', e.message, 'error'); } }
function deleteLetter(id) { Swal.fire({ title: 'Batalkan Pengajuan?', text: 'Pengajuan ini akan ditarik kembali.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then((r) => { if (r.isConfirmed) db.collection("letters").doc(id).delete().then(() => Swal.fire('Dibatalkan', '', 'success')); }); }

// --- 7. HTML GENERATORS ---
function getDashboardHTML() { return `<div class="space-y-6 animate-fade-in"><div class="bg-gradient-to-br from-purple-700 to-indigo-800 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden"><div class="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4"><i data-lucide="graduation-cap" width="150" height="150"></i></div><h2 class="text-3xl font-bold mb-2">Selamat Datang, ${TEACHER_DATA ? TEACHER_DATA.fullName.split(',')[0] : 'Guru'}!</h2><p class="text-purple-100">Mata Pelajaran: <strong>${TEACHER_DATA ? TEACHER_DATA.subject : '-'}</strong></p></div><div class="grid grid-cols-1 md:grid-cols-3 gap-6"><div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between hover:shadow-md transition cursor-pointer" onclick="setTab('schedule')"><div><p class="text-slate-500 font-medium mb-1">Kelas Diampu</p><h3 class="text-3xl font-bold text-slate-800" id="dash-schedules">-</h3></div><div class="p-4 bg-orange-100 text-orange-600 rounded-xl"><i data-lucide="calendar-clock" width="32"></i></div></div><div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between hover:shadow-md transition cursor-pointer" onclick="setTab('grades')"><div><p class="text-slate-500 font-medium mb-1">Input Nilai</p><h3 class="text-3xl font-bold text-slate-800"><i data-lucide="check-square" width="28"></i></h3></div><div class="p-4 bg-green-100 text-green-600 rounded-xl"><i data-lucide="clipboard-list" width="32"></i></div></div><div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between hover:shadow-md transition cursor-pointer" onclick="setTab('cbt')"><div><p class="text-slate-500 font-medium mb-1">Ujian (CBT)</p><h3 class="text-3xl font-bold text-slate-800" id="dash-exams">-</h3></div><div class="p-4 bg-blue-100 text-blue-600 rounded-xl"><i data-lucide="monitor-check" width="32"></i></div></div></div></div>`; }
function getScheduleHTML() { return `<div class="space-y-6 animate-fade-in"><div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div><h2 class="text-2xl font-bold text-slate-800">Jadwal & Jurnal Kelas</h2><p class="text-slate-500">Mulai kelas, isi absensi, dan nilai harian siswa</p></div></div><div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><table class="w-full text-left border-collapse"><thead class="bg-slate-50 text-slate-600 text-xs uppercase font-semibold"><tr><th class="p-4 border-b border-slate-100">Hari</th><th class="p-4 border-b border-slate-100">Waktu</th><th class="p-4 border-b border-slate-100">Mata Pelajaran & Kelas</th><th class="p-4 border-b border-slate-100">Ruangan</th><th class="p-4 border-b border-slate-100 text-right">Aksi</th></tr></thead><tbody id="mySchedulesBody" class="text-sm divide-y divide-slate-100"><tr><td colspan="5" class="p-8 text-center text-slate-500">Memuat jadwal...</td></tr></tbody></table></div></div>`; }
function getActiveClassHTML() { return `<div class="space-y-6 animate-fade-in"><div class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200"><div><h2 class="text-xl font-bold text-slate-800">Jurnal Kelas: ${activeClassId}</h2><p class="text-slate-500 text-sm">Mata Pelajaran: <span class="font-bold text-purple-600">${activeClassSubject}</span></p></div><div class="flex gap-2"><button onclick="setTab('schedule')" class="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 transition">Batal</button><button onclick="saveClassSession()" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition flex items-center gap-2"><i data-lucide="save" width="16"></i> Simpan Sesi</button></div></div><div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead class="bg-slate-50 text-slate-500 text-xs uppercase font-semibold"><tr><th class="p-4 border-b border-slate-100 w-10 text-center">No</th><th class="p-4 border-b border-slate-100">Nama Siswa</th><th class="p-4 border-b border-slate-100 w-48">Kehadiran</th><th class="p-4 border-b border-slate-100 w-32">Skor (0-100)</th><th class="p-4 border-b border-slate-100">Keterangan</th></tr></thead><tbody id="activeClassBody" class="text-sm divide-y divide-slate-100"><tr><td colspan="5" class="p-8 text-center text-slate-500">Memuat data siswa...</td></tr></tbody></table></div></div></div>`; }
function getGradesHTML() { return `<div class="space-y-6 animate-fade-in"><div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div><h2 class="text-2xl font-bold text-slate-800">Input Nilai Akademik</h2><p class="text-slate-500">Mata Pelajaran: <span class="font-bold text-purple-600">${TEACHER_DATA ? TEACHER_DATA.subject : '-'}</span></p></div><div class="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-xs font-bold border border-blue-100"><i data-lucide="info" class="inline w-4 h-4 mr-1"></i> Nilai CBT otomatis tersinkron</div></div><div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><div class="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-4"><span class="text-sm font-bold text-slate-600">Pilih Kelas:</span><select id="gradeClassFilter" onchange="renderGradesTable()" class="border border-slate-300 rounded-lg px-4 py-1.5 text-sm focus:ring-purple-500 focus:border-purple-500 font-bold text-slate-800"><option value="VII">Kelas VII</option><option value="VIII">Kelas VIII</option><option value="IX">Kelas IX</option></select></div><div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead class="bg-white text-slate-500 text-xs uppercase font-semibold"><tr><th class="p-4 border-b border-slate-100 w-10 text-center">No</th><th class="p-4 border-b border-slate-100">Nama Siswa</th><th class="p-4 border-b border-slate-100">Mata Pelajaran & Jenis</th><th class="p-4 border-b border-slate-100 w-24 text-center">Skor</th><th class="p-4 border-b border-slate-100 text-right">Aksi</th></tr></thead><tbody id="gradesTableBody" class="text-sm divide-y divide-slate-100"><tr><td colspan="5" class="p-8 text-center text-slate-500">Memuat data siswa...</td></tr></tbody></table></div></div></div>`; }
function getSyllabusHTML() { return `<div class="space-y-6 animate-fade-in"><div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div><h2 class="text-2xl font-bold text-slate-800">Silabus & RPP</h2><p class="text-slate-500">Kelola Kompetensi Dasar (KD/TP) yang akan tampil di Rapor</p></div><div class="flex gap-2 w-full sm:w-auto"><select id="syllabusClassFilter" onchange="renderSyllabusTable()" class="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-purple-500 outline-none"><option value="VII">Kelas VII</option><option value="VIII">Kelas VIII</option><option value="IX">Kelas IX</option></select><button onclick="openSyllabusModal()" class="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition flex items-center gap-2"><i data-lucide="plus" width="18"></i> Tambah KD/TP</button></div></div><div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead class="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200"><tr><th class="p-4 w-20">Kode</th><th class="p-4 w-40">Mata Pelajaran</th><th class="p-4">Materi Pokok</th><th class="p-4">Deskripsi (Di Rapor)</th><th class="p-4 text-right">Aksi</th></tr></thead><tbody id="syllabusTableBody" class="text-sm divide-y divide-slate-100"><tr><td colspan="5" class="p-8 text-center text-slate-500">Memuat data...</td></tr></tbody></table></div></div></div>`; }
function getHomeroomHTML() { return `<div class="space-y-6 animate-fade-in"><div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div><h2 class="text-2xl font-bold text-slate-800">Panel Wali Kelas</h2><p class="text-slate-500">Kelas Perwalian: <span class="font-bold text-purple-600">${TEACHER_DATA.homeroomClass}</span></p></div><div class="bg-purple-50 text-purple-600 px-4 py-2 rounded-lg text-xs font-bold border border-purple-100"><i data-lucide="star" class="inline w-4 h-4 mr-1"></i> Tampilan khusus Wali Kelas</div></div><div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead class="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200"><tr><th class="p-4 w-10 text-center">No</th><th class="p-4">Nama Siswa</th><th class="p-4 text-center">Rata-Rata Seluruh Mapel</th><th class="p-4 text-center">Rekap Absensi</th><th class="p-4 text-right">Laporan & Kenaikan Kelas</th></tr></thead><tbody id="homeroomTableBody" class="text-sm divide-y divide-slate-100"><tr><td colspan="5" class="p-8 text-center text-slate-500">Memuat data kelas...</td></tr></tbody></table></div></div></div>`; }
function getAnnouncementsHTML() { return `<div class="space-y-6 animate-fade-in"><div><h2 class="text-2xl font-bold text-slate-800">Papan Pengumuman Sekolah</h2><p class="text-slate-500">Informasi terbaru dari administrator</p></div><div id="announcementsContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><div class="col-span-full p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">Memuat pengumuman...</div></div></div>`; }
function getCbtHTML() { return `<div class="space-y-6 animate-fade-in"><div><h2 class="text-2xl font-bold text-slate-800">Manajemen Ujian & Bank Soal</h2><p class="text-slate-500">Kelola soal ujian atau lihat jadwal pengawasan Anda</p></div><div id="cbtExamsContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><div class="col-span-full p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">Memuat data ujian...</div></div></div>`; }
function getLettersHTML() { return `<div class="space-y-6 animate-fade-in"><div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div><h2 class="text-2xl font-bold text-slate-800">Surat & Izin</h2><p class="text-slate-500">Ajukan permohonan izin atau keterangan tugas ke Admin</p></div><button onclick="openLetterModal()" class="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition flex items-center gap-2 text-sm"><i data-lucide="plus" width="16"></i> Buat Pengajuan</button></div><div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead class="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200"><tr><th class="p-4 w-10 text-center">No</th><th class="p-4">Jenis & Keterangan</th><th class="p-4">Tanggal Dibuat</th><th class="p-4">Status & Respon Admin</th><th class="p-4 text-right">Aksi</th></tr></thead><tbody id="lettersTableBody" class="text-sm divide-y divide-slate-100"><tr><td colspan="5" class="p-8 text-center text-slate-500">Memuat pengajuan...</td></tr></tbody></table></div></div></div>`; }
function getProfileHTML() { const phoneStr = TEACHER_DATA.phone || 'Belum ditambahkan'; const educationStr = TEACHER_DATA.education || 'Belum ada data riwayat pendidikan.'; const achievementStr = TEACHER_DATA.achievements || 'Belum ada data prestasi/sertifikasi.'; const avatarSrc = TEACHER_DATA.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${TEACHER_DATA.email}&backgroundColor=e9d5ff`; const homeroomBadge = TEACHER_DATA.homeroomClass ? `<span class="px-4 py-2 bg-orange-50 text-orange-700 font-bold text-sm rounded-xl border border-orange-100 flex items-center gap-2 transition hover:bg-orange-100"><i data-lucide="star" width="18"></i> Wali Kelas ${TEACHER_DATA.homeroomClass}</span>` : ''; return `<div class="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10"><div class="relative w-full h-48 md:h-64 rounded-[2rem] bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 overflow-hidden shadow-2xl"><div class="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/4"></div><div class="absolute bottom-0 left-0 w-48 h-48 bg-purple-500 opacity-20 rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/4"></div><i data-lucide="award" class="absolute top-4 right-4 text-white/10 w-40 h-40 transform rotate-12"></i><div class="absolute top-6 left-6 md:top-8 md:left-8"><span class="px-4 py-1.5 bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-widest rounded-full shadow-lg">Identitas Digital Pendidik</span></div></div><div class="relative bg-white rounded-[2rem] shadow-sm border border-slate-100 px-6 md:px-10 pb-10 -mt-24 mx-4 md:mx-8 z-10"><div class="absolute -top-16 left-1/2 transform -translate-x-1/2"><div class="relative group"><img src="${avatarSrc}" class="w-32 h-32 rounded-full border-[6px] border-white bg-slate-50 shadow-xl object-cover transition-transform duration-300 group-hover:scale-105"><div class="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-white rounded-full shadow-sm" title="Status Aktif"></div></div></div><div class="text-center pt-24 mb-10"><h2 class="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">${TEACHER_DATA.fullName}</h2><div class="mt-2 flex items-center justify-center gap-2"><p class="text-slate-600 font-mono text-sm bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg shadow-inner">NIP/NUPTK: ${TEACHER_DATA.nip}</p></div><div class="mt-5 flex flex-wrap justify-center gap-3"><span class="px-4 py-2 bg-purple-50 text-purple-700 font-bold text-sm rounded-xl border border-purple-100 flex items-center gap-2"><i data-lucide="book-open" width="18"></i> ${TEACHER_DATA.subject || 'Umum'}</span>${homeroomBadge}</div></div><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-6"><div><div class="flex items-center gap-4 mb-4 pb-4 border-b border-slate-200/60"><div class="p-3 bg-white rounded-xl shadow-sm text-purple-600"><i data-lucide="graduation-cap"></i></div><h3 class="font-bold text-slate-800 text-lg">Capaian & Pendidikan</h3></div><div class="space-y-4"><div><p class="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">Riwayat Pendidikan</p><p class="font-medium text-slate-800 text-sm md:text-base leading-relaxed">${educationStr}</p></div><div><p class="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">Prestasi / Sertifikasi</p><p class="font-medium text-slate-800 text-sm md:text-base leading-relaxed">${achievementStr}</p></div></div></div></div><div class="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between"><div><div class="flex items-center gap-4 mb-4 pb-4 border-b border-slate-200/60"><div class="p-3 bg-white rounded-xl shadow-sm text-indigo-600"><i data-lucide="shield-check"></i></div><h3 class="font-bold text-slate-800 text-lg">Keamanan & Kedinasan</h3></div><div class="space-y-4 mb-8"><div><p class="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">Email Kedinasan (Login)</p><p class="font-bold text-indigo-700 text-sm md:text-base">${TEACHER_DATA.email}</p></div><div><p class="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">No. Kontak / WhatsApp</p><p class="font-medium text-slate-800 text-sm md:text-base">${phoneStr}</p></div><div><p class="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Kata Sandi Akses</p><p class="font-mono text-slate-600 bg-slate-200/50 px-3 py-1.5 rounded border border-slate-200 inline-block text-sm tracking-widest shadow-inner">••••••••</p></div></div></div><button onclick="Swal.fire('Informasi', 'Permintaan perubahan data CV dan Sandi diajukan ke Admin.', 'info')" class="w-full py-3.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-all flex items-center justify-center gap-2 shadow-sm"><i data-lucide="edit" width="18"></i> Ajukan Perubahan Data</button></div></div></div></div>`; }