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

// --- 2. STATE MANAGEMENT ---
let STUDENT_DATA = null;
let STUDENT_DOC_ID = null;

let EXAM_ID = null;
let EXAM_META = null; // Menyimpan info ujian (judul, durasi, dll)
let EXAM_QUESTIONS = []; // Array soal

let currentIndex = 0;
let answers = {}; 
let violations = 0; 
let timerInterval;
let timeRemaining = 0;

// --- 3. INISIALISASI & AUTENTIKASI ---
lucide.createIcons();

// Cek status login saat halaman dibuka
auth.onAuthStateChanged((user) => {
    if (user) {
        db.collection("students").where("uid", "==", user.uid).get().then((querySnapshot) => {
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                STUDENT_DOC_ID = doc.id;
                STUDENT_DATA = doc.data();
                document.getElementById('student-name').innerText = STUDENT_DATA.fullName;
                
                prepareExam(); // Lanjut siapkan ujian
            } else {
                alert("Akses Ditolak. Anda bukan siswa.");
                window.location.href = "student.html";
            }
        });
    } else {
        window.location.href = "student.html";
    }
});

async function prepareExam() {
    // Ambil examId dari URL
    const urlParams = new URLSearchParams(window.location.search);
    EXAM_ID = urlParams.get('examId');

    if (!EXAM_ID) {
        alert("ID Ujian tidak ditemukan!");
        window.location.href = "student.html";
        return;
    }

    document.getElementById('loading-text').innerText = "Mengunduh Soal...";

    try {
        // Ambil Meta Data Ujian
        const examDoc = await db.collection("exams").doc(EXAM_ID).get();
        if (!examDoc.exists) throw new Error("Ujian tidak ditemukan di database.");
        EXAM_META = examDoc.data();

        // Ambil Daftar Soal
        const questionsSnap = await db.collection("exams").doc(EXAM_ID).collection("questions").get();
        if (questionsSnap.empty) throw new Error("Guru belum memasukkan soal ke ujian ini.");
        
        EXAM_QUESTIONS = questionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Tampilkan Tombol Mulai
        document.getElementById('loading-overlay').innerHTML = `
            <div class="text-center">
                <i data-lucide="check-circle" width="64" height="64" class="text-green-500 mb-4 mx-auto"></i>
                <h2 class="text-2xl font-bold mb-2 text-white">Soal Siap Dikerjakan</h2>
                <p class="text-slate-300 mb-6">${EXAM_META.subject} - ${EXAM_QUESTIONS.length} Soal</p>
                <button onclick="startCBT()" class="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg">
                    Klik Untuk Memulai
                </button>
            </div>
        `;
        lucide.createIcons();

    } catch (error) {
        alert(error.message);
        window.location.href = "student.html";
    }
}

// --- 4. MEMULAI UJIAN ---
async function startCBT() {
    document.getElementById('loading-overlay').classList.add('hidden');
    
    // Set Header UI
    document.getElementById('exam-title').innerText = EXAM_META.type;
    document.getElementById('exam-subject').innerText = EXAM_META.subject;

    // Load state tersimpan (jika mati lampu/refresh)
    timeRemaining = EXAM_META.duration * 60; // Default waktu
    loadSavedState();

    // Start Pengawasan
    await startWebcam();
    setupAntiCheat();
    requestFullScreen();
    
    // Mulai Ujian
    renderQuestionNavigation();
    loadQuestion(currentIndex);
    startTimer();
}

// --- 5. RENDER SOAL ---
function loadQuestion(index) {
    if (index < 0 || index >= EXAM_QUESTIONS.length) return;
    
    currentIndex = index;
    const q = EXAM_QUESTIONS[index];
    
    document.getElementById('current-question-num').innerText = index + 1;
    document.getElementById('question-text').innerText = q.text;
    
    // Render Media
    const mediaContainer = document.getElementById('media-container');
    mediaContainer.innerHTML = ''; 
    
    if (q.mediaType === 'image' && q.mediaUrl) {
        mediaContainer.classList.remove('hidden');
        mediaContainer.innerHTML = `<img src="${q.mediaUrl}" alt="Soal Gambar" class="rounded-lg max-h-64 object-contain mx-auto border border-slate-200">`;
    } else if (q.mediaType === 'video' && q.mediaUrl) {
        mediaContainer.classList.remove('hidden');
        mediaContainer.innerHTML = `<div class="aspect-video w-full max-w-lg mx-auto rounded-lg overflow-hidden border border-slate-200"><iframe width="100%" height="100%" src="${q.mediaUrl}" frameborder="0" allowfullscreen></iframe></div>`;
    } else {
        mediaContainer.classList.add('hidden');
    }

    // Render Pilihan (A, B, C, D)
    const optionsArray = [
        { id: "A", text: q.options.A },
        { id: "B", text: q.options.B },
        { id: "C", text: q.options.C },
        { id: "D", text: q.options.D }
    ];

    const optionsHtml = optionsArray.map(opt => {
        const isSelected = answers[q.id] === opt.id;
        return `
        <label class="flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-white hover:border-blue-200'}">
            <input type="radio" name="answer" value="${opt.id}" class="w-5 h-5 text-blue-600" onchange="saveAnswer('${q.id}', '${opt.id}')" ${isSelected ? 'checked' : ''}>
            <span class="font-semibold text-slate-700 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">${opt.id}</span>
            <span class="text-slate-700">${opt.text}</span>
        </label>`;
    }).join('');
    
    document.getElementById('options-container').innerHTML = optionsHtml;

    document.getElementById('btn-prev').disabled = currentIndex === 0;
    document.getElementById('btn-next').disabled = currentIndex === EXAM_QUESTIONS.length - 1;

    updateNavigationHighlight();
}

function saveAnswer(questionId, optionId) {
    answers[questionId] = optionId;
    localStorage.setItem(`exam_answers_${EXAM_ID}`, JSON.stringify(answers));
    updateNavigationHighlight();
}

function nextQuestion() { if (currentIndex < EXAM_QUESTIONS.length - 1) loadQuestion(currentIndex + 1); }
function prevQuestion() { if (currentIndex > 0) loadQuestion(currentIndex - 1); }

function renderQuestionNavigation() {
    const navContainer = document.getElementById('question-navigation');
    navContainer.innerHTML = EXAM_QUESTIONS.map((q, i) => `<button id="nav-btn-${i}" onclick="loadQuestion(${i})" class="w-10 h-10 rounded-lg font-bold text-sm transition-colors border border-slate-200 text-slate-600 hover:bg-slate-100">${i + 1}</button>`).join('');
}

function updateNavigationHighlight() {
    EXAM_QUESTIONS.forEach((q, i) => {
        const btn = document.getElementById(`nav-btn-${i}`);
        btn.className = "w-10 h-10 rounded-lg font-bold text-sm transition-colors border";
        if (i === currentIndex) btn.classList.add("border-blue-600", "ring-2", "ring-blue-200", "text-blue-600");
        else if (answers[q.id]) btn.classList.add("bg-blue-600", "border-blue-600", "text-white"); 
        else btn.classList.add("border-slate-200", "text-slate-600", "hover:bg-slate-100"); 
    });
}

// --- 6. PENGAWASAN (WEBCAM & ANTI CHEAT) ---
async function startWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        document.getElementById('webcam').srcObject = stream;
    } catch (err) {
        alert("Akses kamera wajib diizinkan untuk ujian!");
    }
}
function requestFullScreen() { const elem = document.documentElement; if (elem.requestFullscreen) elem.requestFullscreen().catch(e => console.log(e)); }

function setupAntiCheat() {
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === 'hidden') triggerViolation(); });
    document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement) triggerViolation(); });
}

function triggerViolation() {
    violations++;
    document.getElementById('violation-count').innerText = violations;
    localStorage.setItem(`exam_violations_${EXAM_ID}`, violations);
    document.getElementById('cheat-warning').classList.remove('hidden');
    if (violations >= 3) {
        Swal.fire('Diskualifikasi', 'Anda telah melanggar aturan maksimal 3 kali. Ujian diakhiri otomatis.', 'error').then(()=> executeFinish(true));
    }
}
function resumeExam() { document.getElementById('cheat-warning').classList.add('hidden'); requestFullScreen(); }

// --- 7. TIMER & STATE RECOVERY ---
function startTimer() {
    timerInterval = setInterval(() => {
        timeRemaining--;
        localStorage.setItem(`exam_time_${EXAM_ID}`, timeRemaining);

        const hours = Math.floor(timeRemaining / 3600);
        const minutes = Math.floor((timeRemaining % 3600) / 60);
        const seconds = timeRemaining % 60;
        
        document.getElementById('timer-display').innerText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            Swal.fire('Waktu Habis!', 'Jawaban Anda akan dikirim otomatis.', 'info').then(() => executeFinish(false));
        }
    }, 1000);
}

function loadSavedState() {
    const savedAnswers = localStorage.getItem(`exam_answers_${EXAM_ID}`);
    if (savedAnswers) answers = JSON.parse(savedAnswers);
    const savedTime = localStorage.getItem(`exam_time_${EXAM_ID}`);
    if (savedTime) timeRemaining = parseInt(savedTime);
    const savedViolations = localStorage.getItem(`exam_violations_${EXAM_ID}`);
    if (savedViolations) { violations = parseInt(savedViolations); document.getElementById('violation-count').innerText = violations; }
}

// --- 8. PENILAIAN OTOMATIS & SELESAI ---
function confirmFinishExam() {
    const answeredCount = Object.keys(answers).length;
    Swal.fire({
        title: 'Yakin Ingin Selesai?',
        text: `Anda telah menjawab ${answeredCount} dari ${EXAM_QUESTIONS.length} soal.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Kumpulkan Jawaban',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) executeFinish(false);
    });
}

async function executeFinish(isDisqualified) {
    clearInterval(timerInterval);

    // Matikan kamera & keluar fullscreen
    const videoElem = document.getElementById('webcam');
    if (videoElem && videoElem.srcObject) videoElem.srcObject.getTracks().forEach(track => track.stop());
    if (document.fullscreenElement) document.exitFullscreen();

    Swal.fire({ title: 'Menghitung Skor...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

    // HItung Skor Otomatis
    let correctCount = 0;
    EXAM_QUESTIONS.forEach(q => {
        if(answers[q.id] && answers[q.id] === q.correctOpt) correctCount++;
    });

    let finalScore = isDisqualified ? 0 : Math.round((correctCount / EXAM_QUESTIONS.length) * 100);

    // Format penyimpanan ke koleksi Grades
    const gradeData = {
        studentId: STUDENT_DOC_ID,
        studentName: STUDENT_DATA.fullName,
        class: STUDENT_DATA.kelas,
        subject: EXAM_META.subject,
        teacherId: EXAM_META.teacherId, // NIlai ini akan masuk ke Dashboard Guru pembuat soal
        type: EXAM_META.type, // e.g., "Penilaian Tengah Semester"
        score: finalScore,
        isCBT: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("grades").add(gradeData);
        
        // Hapus sesi lokal agar bersih
        localStorage.removeItem(`exam_answers_${EXAM_ID}`);
        localStorage.removeItem(`exam_time_${EXAM_ID}`);
        localStorage.removeItem(`exam_violations_${EXAM_ID}`);

        Swal.fire({
            title: 'Ujian Selesai!',
            text: isDisqualified ? 'Nilai Anda 0 karena pelanggaran.' : `Tersimpan! Skor Anda: ${finalScore}`,
            icon: isDisqualified ? 'error' : 'success'
        }).then(() => {
            window.location.href = "student.html"; // Kembali ke Rapor Siswa
        });

    } catch (error) {
        Swal.fire('Gagal Menyimpan', error.message, 'error');
    }
}