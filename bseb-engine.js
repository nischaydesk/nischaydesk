/**
 * NischayDesk - BSEB Engine (Fast Developer Testing Mode v17.0)
 * Features:
 *   1. Zero Wait Submission (तुरंत पर्चा सील और जमा)
 *   2. Silent Background AI Checking (बैकग्राउंड में शांत मूल्यांकन, हॉल में कोई नंबर नहीं)
 *   3. IndexedDB Answer Copy Preservation (रिजल्ट पोर्टल पर लाल पेन कॉपी के लिए)
 *   4. Zero Auto-Restore Bug (Firestore खाली तो फ्रेश टेस्ट)
 */

function getProtectedKey() {
  const parts = [
    [65, 81, 46, 65],
    [98, 56, 82, 78],
    [54, 73, 81, 73],
    [66, 89, 121, 49],
    [55, 48, 67, 116],
    [109, 107, 86, 69],
    [51, 110, 116, 118],
    [102, 54, 84, 95],
    [98, 57, 107, 109],
    [90, 101, 104, 111],
    [74, 74, 87, 99],
    [98, 57, 71, 71],
    [57, 54, 52, 86],
    [65]
  ];
  return parts.map(chunk => String.fromCharCode(...chunk)).join("");
}

const BSEB_CONFIG = {
  EXAM_DURATION_MINUTES: 195,
  PRIMARY_MODEL: "gemini-2.5-flash",
  BACKUP_MODEL: "gemini-1.5-flash"
};

// 📦 IndexedDB में उत्तर-पुस्तिका सुरक्षित रखने का इंजन
function saveEvaluatedSheetToDB(uid, day, dataObj) {
  return new Promise((resolve) => {
    const req = indexedDB.open("NischaySheetsDB", 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("sheets")) {
        db.createObjectStore("sheets", { keyPath: "key" });
      }
    };
    req.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction("sheets", "readwrite");
      tx.objectStore("sheets").put({ key: `${uid}_day_${day}`, data: dataObj });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    };
    req.onerror = () => resolve(false);
  });
}

let cachedServerOffset = null;
async function getVerifiedServerTimestamp() {
  if (cachedServerOffset !== null) return Date.now() + cachedServerOffset;
  try {
    const res = await fetch("https://worldtimeapi.org/api/timezone/Asia/Kolkata", { cache: "no-store" });
    const data = await res.json();
    const serverMs = new Date(data.datetime).getTime();
    cachedServerOffset = serverMs - Date.now();
    return serverMs;
  } catch (e) {
    cachedServerOffset = 0;
    return Date.now();
  }
}

async function getVerifiedServerDate() {
  const ts = await getVerifiedServerTimestamp();
  return new Date(ts);
}

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

function generateUniqueCredentials(uid) {
  if (!uid) return { rollCode: "33193", rollNumber: "26017186", regNo: "R-33010189-26" };
  let hash1 = 0, hash2 = 0;
  for (let i = 0; i < uid.length; i++) {
    const char = uid.charCodeAt(i);
    hash1 = ((hash1 << 5) - hash1) + char;
    hash1 |= 0;
    hash2 = ((hash2 << 7) + hash2) ^ char;
    hash2 |= 0;
  }
  const abs1 = Math.abs(hash1);
  const abs2 = Math.abs(hash2);
  const rollCode = "33" + String(100 + (abs1 % 899));
  const rollNumber = "2601" + String(1000 + (abs2 % 8999));
  const regNo = "R-330" + String(10000000 + ((abs1 + abs2) % 89999999)) + "-26";
  return { rollCode, rollNumber, regNo };
}

/* ==========================================================================
   🔄 छात्र सत्र प्रबंधन (सटीक सिंक, कोई पुराना कचरा नहीं)
   ========================================================================== */
async function getCloudExamState(user) {
  if (!user) return null;
  const creds = generateUniqueCredentials(user.uid);
  const initialClass = localStorage.getItem("nd_selected_class") || "10th";
  const serverDateObj = await getVerifiedServerDate();

  // फ़ोन की पुरानी मेमोरी साफ़ करें ताकि पुराना डेटा दोबारा न बने
  localStorage.removeItem(`nischay_exam_state_${creds.rollCode}_${creds.rollNumber}`);
  localStorage.removeItem("nischay_student_session");

  let studentState = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email.split('@')[0],
    selectedClass: initialClass,
    rollCode: creds.rollCode,
    rollNumber: creds.rollNumber,
    regNo: creds.regNo,
    schoolName: "",
    motherName: "",
    fatherName: "",
    startDate: serverDateObj.toISOString(),
    completedDays: {},
    savedOMR: {},
    lastExamDate: null,
    activeSession: null
  };

  if (window.NischayConfig && window.NischayConfig.dbInstance) {
    try {
      const db = window.NischayConfig.dbInstance;
      const docRef = db.collection("bseb_exams_2026").doc(user.uid);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        const cloudData = docSnap.data();
        studentState = {
          ...studentState,
          ...cloudData,
          completedDays: cloudData.completedDays || {},
          savedOMR: cloudData.savedOMR || {}
        };
      }
    } catch (e) {
      console.warn("Firestore sync error:", e);
    }
  }

  return studentState;
}

async function syncBubbleToCloud(user, day, qNum, opt, state) {
  if (!state) return;
  if (!state.savedOMR) state.savedOMR = {};
  if (!state.savedOMR[day]) state.savedOMR[day] = {};

  if (opt) {
    state.savedOMR[day][qNum] = opt;
  } else {
    delete state.savedOMR[day][qNum];
  }

  if (user && window.NischayConfig && window.NischayConfig.dbInstance) {
    try {
      await window.NischayConfig.dbInstance.collection("bseb_exams_2026").doc(user.uid).set({
        savedOMR: { [day]: state.savedOMR[day] }
      }, { merge: true });
    } catch (e) {}
  }
}

async function callGeminiApiFallback(parts) {
  const key = getProtectedKey();
  const models = [BSEB_CONFIG.PRIMARY_MODEL, BSEB_CONFIG.BACKUP_MODEL];

  for (let model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts }] })
      });
      const data = await res.json();
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return data;
      }
    } catch (err) {}
  }
  throw new Error("AI मूल्यांकन सर्वर उपलब्ध नहीं है।");
}

/* ==========================================================================
   🤫 2. शांत बैकग्राउंड AI चेकिंग (Background Silent Grading)
   छात्र को सबमिट करते समय इंतज़ार नहीं करना पड़ेगा। यह पीछे अपने आप जाँचेगा!
   ========================================================================== */
async function runBackgroundGeminiEvaluation(uid, day, subjectCode, imagesList, currentObjMarks) {
  if (!imagesList || imagesList.length === 0) return;

  const totalPages = Math.min(imagesList.length, 24);
  let imageParts = [];

  for (let i = 0; i < totalPages; i++) {
    const item = imagesList[i];
    const base64Str = typeof item === 'string' ? item : item.dataUrl;
    if (base64Str) {
      const cleanB64 = base64Str.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
      imageParts.push({
        inline_data: { mime_type: "image/jpeg", data: cleanB64 }
      });
    }
  }

  if (imageParts.length === 0) return;

  const paperInfo = (window.BSEB_PAPERS_DATABASE && window.BSEB_PAPERS_DATABASE[subjectCode])
                    ? window.BSEB_PAPERS_DATABASE[subjectCode]
                    : null;

  const subjectName = paperInfo ? paperInfo.subjectName : subjectCode;
  const blueprintText = paperInfo && paperInfo.subjectiveBlueprint
    ? JSON.stringify(paperInfo.subjectiveBlueprint.sections, null, 2)
    : "Standard BSEB Scheme: Short questions 2 marks each, Long questions 5 marks each.";

  const maxSubjective = paperInfo?.subjectiveBlueprint?.totalSubjectiveMarks || 50;

  const promptText = `You are the Chief Examiner of Bihar School Examination Board (BSEB) Patna evaluating Class 10 Subjective Answer Sheets for "${subjectName}".
Total Pages submitted: ${totalPages}.
Maximum Subjective Marks allowed: ${maxSubjective}.

OFFICIAL MARKING BLUEPRINT FOR THIS PAPER:
${blueprintText}

STRICT EVALUATION INSTRUCTIONS:
1. Examine every page carefully according to the blueprint.
2. Step-marking for Mathematics and science problem derivations.
3. If pages are blank, irrelevant, selfies, songs, or not related to Class 10 ${subjectName}, strictly mark "isValid": false, status: "REJECTED", and 0 marks.
4. Total subjective marks MUST NOT exceed ${maxSubjective}.
5. Provide tick coordinates for visual annotations (xRatio 0.72-0.85, yRatio near answers).
6. Output STRICT JSON ONLY:
{
  "isValid": true,
  "totalSubjectiveMarks": <0 to ${maxSubjective}>,
  "status": "<EVALUATED or REJECTED>",
  "overallRemarks": "<1-2 पंक्ति में हिंदी में संक्षिप्त टिप्पणी>",
  "pagesEvaluation": [
    {
      "pageIndex": 0,
      "marksOnThisPage": 4,
      "pageRemark": "चरणबद्ध उत्तर सही",
      "ticks": [
        {"label": "Q1: 2/2", "xRatio": 0.80, "yRatio": 0.30, "type": "correct"}
      ]
    }
  ]
}`;

  try {
    const parts = [{ text: promptText }, ...imageParts];
    const data = await callGeminiApiFallback(parts);
    const rawText = data.candidates[0].content.parts[0].text;
    const cleanJson = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    let awarded = 0;
    if (parsed.isValid && parsed.status !== "REJECTED") {
      awarded = Math.min(maxSubjective, Math.max(0, parseInt(parsed.totalSubjectiveMarks, 10) || 0));
    }

    const finalTotal = currentObjMarks + awarded;
    const serverDateObj = await getVerifiedServerDate();

    // 1. Firestore में अंक और टिप्पणी अपडेट करें (रिजल्ट पोर्टल के लिए)
    if (window.NischayConfig?.dbInstance) {
      await window.NischayConfig.dbInstance.collection("bseb_exams_2026").doc(uid).set({
        completedDays: {
          [day]: {
            subjectiveMarks: awarded,
            totalMarks: finalTotal,
            aiFeedback: parsed.overallRemarks || "मूल्यांकन संपन्न",
            pagesEvaluation: parsed.pagesEvaluation || [],
            status: "EVALUATED",
            aiEvaluatedAt: serverDateObj.toISOString()
          }
        }
      }, { merge: true });
    }

    // 2. IndexedDB में जाँची हुई प्रति का डेटा सिंक करें (ताकि PDF में लाल टिक दिखें)
    await saveEvaluatedSheetToDB(uid, day, {
      subjectCode: subjectCode,
      subjectName: subjectName,
      pages: imagesList,
      evaluation: parsed.pagesEvaluation || []
    });

  } catch (err) {
    console.error("AI Background Evaluation error:", err);
  }
}

/* ==========================================================================
   ⚡ 3. सुपरफास्ट सबमिशन (परीक्षा हॉल में तुरंत सील, कोई नंबर नहीं)
   ========================================================================== */
async function submitExamToCloud(user, day, subjectCode, answerKey, imagesList, state) {
  const omr = (state && state.savedOMR && state.savedOMR[day]) ? state.savedOMR[day] : {};

  // OMR का मिलान
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

  const paperInfo = (window.BSEB_PAPERS_DATABASE && window.BSEB_PAPERS_DATABASE[subjectCode])
                    ? window.BSEB_PAPERS_DATABASE[subjectCode]
                    : null;
  const subjectName = paperInfo ? paperInfo.subjectName : subjectCode;
  const serverDateObj = await getVerifiedServerDate();
  const todayStr = serverDateObj.toISOString().split('T')[0];

  // सबमिट करते वक्त केवल बेसिक डेटा जमा होगा (कोई नंबर हॉल में नहीं दिखेगा)
  const completedData = {
    subjectCode: subjectCode,
    subjectName: subjectName,
    objectiveMarks: objMarks,
    subjectiveMarks: 0,
    totalMarks: objMarks,
    uploadedPagesCount: imagesList ? imagesList.length : 0,
    status: "COMPLETED",
    submittedAt: serverDateObj.toISOString()
  };

  // कॉपियों को IndexedDB में तुरंत सुरक्षित करें (PDF के लिए)
  if (imagesList && imagesList.length > 0) {
    await saveEvaluatedSheetToDB(user.uid, day, {
      subjectCode: subjectCode,
      subjectName: subjectName,
      pages: imagesList,
      evaluation: []
    });
  }

  if (!state.completedDays) state.completedDays = {};
  state.completedDays[day] = completedData;
  state.lastExamDate = todayStr;
  state.activeSession = null;

  // Firestore में सुरक्षित जमा
  if (user && window.NischayConfig && window.NischayConfig.dbInstance) {
    const db = window.NischayConfig.dbInstance;
    await db.collection("bseb_exams_2026").doc(user.uid).set({
      completedDays: { [day]: completedData },
      lastExamDate: todayStr,
      activeSession: null
    }, { merge: true });

    // 🚀 शांत बैकग्राउंड चेकिंग चालू (छात्र को बिना रोके पीछे AI काम करेगा)
    runBackgroundGeminiEvaluation(user.uid, day, subjectCode, imagesList, objMarks);
  }

  return completedData;
}

document.addEventListener("DOMContentLoaded", initThemeEngine);
