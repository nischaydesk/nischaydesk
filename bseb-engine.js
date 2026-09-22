/**
 * NischayDesk - BSEB Official Cloud Engine
 * Unique Per-Gmail Roll Generation & Instant Submit
 */

const BSEB_CONFIG = {
  EXAM_DURATION_MINUTES: 195,
  SUBJECTS: [
    { day: 1, code: "101", name: "हिन्दी (M.I.L Hindi)", fullMarks: 100, passMarks: 30 },
    { day: 2, code: "105", name: "संस्कृत (S.I.L Sanskrit)", fullMarks: 100, passMarks: 30 },
    { day: 3, code: "110", name: "गणित (Mathematics)", fullMarks: 100, passMarks: 30 },
    { day: 4, code: "112", name: "विज्ञान (Science)", fullMarks: 100, passMarks: 30 },
    { day: 5, code: "113", name: "सामाजिक विज्ञान (Social Science)", fullMarks: 100, passMarks: 30 },
    { day: 6, code: "114", name: "अंग्रेजी (English)", fullMarks: 100, passMarks: 30 }
  ]
};

function initThemeEngine() {
  const savedTheme = localStorage.getItem("nischay_theme") || "dark";
  applyTheme(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(currentTheme === "dark" ? "light" : "dark");
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("nischay_theme", theme);
  const btn = document.getElementById("themeToggleBtn");
  if (btn) btn.innerHTML = theme === "dark" ? "☀️ लाइट मोड" : "🌙 डार्क मोड";
}

function triggerGoogleLogin() {
  if (!window.NischayConfig || !window.NischayConfig.authInstance) return;
  const provider = new firebase.auth.GoogleAuthProvider();
  window.NischayConfig.authInstance.signInWithPopup(provider)
    .then(() => location.reload())
    .catch((err) => alert("लॉगिन असफल: " + err.message));
}

// UID से यूनिक नंबर जनरेटर (ताकि हर Gmail को अलग नंबर मिले)
function generateUniqueCredentials(uid) {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash << 5) - hash + uid.charCodeAt(i);
    hash |= 0;
  }
  const posHash = Math.abs(hash);
  const rollCode = "33" + String(100 + (posHash % 899));
  const rollNumber = "2601" + String(1000 + (Math.floor(posHash / 10) % 8999));
  const regNo = "R-330" + String(10000000 + (Math.floor(posHash / 7) % 89999999)) + "-26";
  return { rollCode, rollNumber, regNo };
}

// 1 Gmail = 1 यूनिक स्थायी रोल कोड और रोल नंबर
async function getCloudExamState(user) {
  if (!window.NischayConfig || !window.NischayConfig.dbInstance) return null;

  const db = window.NischayConfig.dbInstance;
  const docRef = db.collection("bseb_exams_2026").doc(user.uid);
  const docSnap = await docRef.get();

  if (docSnap.exists) {
    return docSnap.data();
  }

  // अगर नया यूजर है, तो सिर्फ उसकी UID से यूनिक रोल नंबर बनाएँ
  const creds = generateUniqueCredentials(user.uid);
  const now = new Date();
  const resultDate = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
  resultDate.setHours(9, 0, 0, 0);

  const initialClass = localStorage.getItem("nd_selected_class") || "10th";

  const permanentStudentState = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email.split('@')[0],
    selectedClass: initialClass,
    rollCode: creds.rollCode,
    rollNumber: creds.rollNumber,
    regNo: creds.regNo,
    schoolName: "HIGH SCHOOL TELWA, JHAJHA",
    fatherName: "SURESH SHARMA",
    startDate: now.toISOString(),
    resultUnlockTime: resultDate.toISOString(),
    currentActiveDay: 1,
    completedDays: {},
    savedOMR: {},
    activeSession: null
  };

  await docRef.set(permanentStudentState);
  return permanentStudentState;
}

async function updateCloudExamState(user, patchData) {
  if (!window.NischayConfig || !window.NischayConfig.dbInstance || !user) return;
  const db = window.NischayConfig.dbInstance;
  await db.collection("bseb_exams_2026").doc(user.uid).set(patchData, { merge: true });
}

async function enforceCloudAbsence(user, state) {
  if (!state || !state.startDate) return state;
  const startDayTime = new Date(state.startDate).getTime();
  const nowTime = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const daysPassed = Math.floor((nowTime - startDayTime) / oneDayMs) + 1;

  let hasChanged = false;
  if (!state.completedDays) state.completedDays = {};

  for (let d = 1; d <= 6; d++) {
    if (d < daysPassed) {
      if (!state.completedDays[d] || state.completedDays[d].status !== "COMPLETED") {
        state.completedDays[d] = {
          subjectName: `Day ${d} Exam`,
          objectiveMarks: 0,
          subjectiveMarks: 0,
          totalMarks: 0,
          status: "ABSENT",
          submittedAt: null
        };
        hasChanged = true;
      }
    }
  }

  state.currentActiveDay = Math.min(daysPassed, 7);
  if (hasChanged && user) {
    await updateCloudExamState(user, {
      completedDays: state.completedDays,
      currentActiveDay: state.currentActiveDay
    });
  }
  return state;
}

let examTimerRef = null;

function runCloudExamTimer(user, day, onTimeUp) {
  const timerKey = `timer_end_${user ? user.uid : 'guest'}_day_${day}`;
  let endTime = localStorage.getItem(timerKey);

  if (!endTime) {
    endTime = Date.now() + BSEB_CONFIG.EXAM_DURATION_MINUTES * 60 * 1000;
    localStorage.setItem(timerKey, endTime);
  } else {
    endTime = parseInt(endTime, 10);
  }

  const clockEl = document.getElementById("examTimerClock");
  clearInterval(examTimerRef);

  examTimerRef = setInterval(() => {
    const diff = endTime - Date.now();
    if (diff <= 0) {
      clearInterval(examTimerRef);
      if (clockEl) clockEl.textContent = "00:00:00 (समय समाप्त)";
      alert("⚠️ 3 घंटे 15 मिनट समाप्त! परीक्षा स्वतः जमा हो रही है।");
      if (typeof onTimeUp === "function") onTimeUp();
      return;
    }

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    if (clockEl) {
      clockEl.textContent = `⏳ ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
  }, 1000);
}

async function syncBubbleToCloud(user, day, qNum, opt, state) {
  if (!state) return;
  if (!state.savedOMR) state.savedOMR = {};
  if (!state.savedOMR[day]) state.savedOMR[day] = {};
  state.savedOMR[day][qNum] = opt;

  if (user && window.NischayConfig && window.NischayConfig.dbInstance) {
    try {
      const db = window.NischayConfig.dbInstance;
      await db.collection("bseb_exams_2026").doc(user.uid).set({
        savedOMR: {
          [day]: {
            [qNum]: opt
          }
        }
      }, { merge: true });
    } catch (e) {
      console.warn("Cloud OMR sync error:", e);
    }
  }
}

async function submitExamToCloud(user, day, subjectName, answerKey, imagesDict, state) {
  const omr = (state && state.savedOMR && state.savedOMR[day]) ? state.savedOMR[day] : {};
  
  let objMarks = 0;
  let count = 0;
  for (let i = 1; i <= 100; i++) {
    if (omr[i]) {
      count++;
      if (answerKey && answerKey[i] && omr[i].toUpperCase() === answerKey[i].toUpperCase()) {
        objMarks++;
      }
      if (count === 50) break;
    }
  }

  let totalUploadedPages = 0;
  if (imagesDict) {
    for (const key in imagesDict) {
      if (Array.isArray(imagesDict[key])) totalUploadedPages += imagesDict[key].length;
    }
  }

  const completedData = {
    subjectName: subjectName,
    objectiveMarks: objMarks,
    subjectiveMarks: 35,
    totalMarks: objMarks + 35,
    uploadedPagesCount: totalUploadedPages,
    status: "COMPLETED",
    submittedAt: new Date().toISOString()
  };

  if (state) {
    if (!state.completedDays) state.completedDays = {};
    state.completedDays[day] = completedData;
    state.activeSession = null;
  }

  if (user && window.NischayConfig && window.NischayConfig.dbInstance) {
    const db = window.NischayConfig.dbInstance;
    await db.collection("bseb_exams_2026").doc(user.uid).set({
      completedDays: {
        [day]: completedData
      },
      activeSession: null
    }, { merge: true });
  }

  return completedData;
}

document.addEventListener("DOMContentLoaded", initThemeEngine);
