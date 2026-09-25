/**
 * NischayDesk - BSEB Official Cloud Engine (v10.0 Hard-Lock Architecture)
 * Model: gemini-3.6-flash
 */

const _p1 = "QVEuQWI4Uk42SVFJQll5MTcwQ3Rta1ZFM250";
const _p2 = "dmY2VF9iOWttWmVob0pKV2NiOUdHOTY0VkE=";

function getProtectedKey() {
  try {
    return atob(_p1) + atob(_p2);
  } catch (e) {
    return "";
  }
}

const BSEB_CONFIG = {
  EXAM_DURATION_MINUTES: 195,
  GEMINI_MODEL: "gemini-3.6-flash"
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

// 🎯 हर Gmail UID के लिए स्थायी यूनिक रोल कोड एवं नंबर
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

// स्टेट लोड: क्लाउड और लोकल दोनों का सख्त मिलान
async function getCloudExamState(user) {
  if (!user) return null;
  const creds = generateUniqueCredentials(user.uid);
  const initialClass = localStorage.getItem("nd_selected_class") || "10th";

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
    startDate: new Date().toISOString(),
    completedDays: {},
    savedOMR: {},
    activeSession: null
  };

  // 1. सबसे पहले लोकल स्टोरेज से लॉक रिकॉर्ड्स उठाएं
  const localKey = `nischay_exam_state_${studentState.rollCode}_${studentState.rollNumber}`;
  const localCache = localStorage.getItem(localKey);
  if (localCache) {
    try {
      const parsedLocal = JSON.parse(localCache);
      studentState = { ...studentState, ...parsedLocal };
    } catch(e) {}
  }

  // 2. फ़ायरबेस से डेटा मर्ज करें
  if (window.NischayConfig && window.NischayConfig.dbInstance) {
    try {
      const db = window.NischayConfig.dbInstance;
      const docRef = db.collection("bseb_exams_2026").doc(user.uid);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        const cloudData = docSnap.data();
        // अगर क्लाउड या लोकल किसी एक में भी सबमिट है तो लॉक ही माना जाएगा
        studentState = {
          ...studentState,
          ...cloudData,
          completedDays: {
            ...(studentState.completedDays || {}),
            ...(cloudData.completedDays || {})
          }
        };
      } else {
        await docRef.set(studentState);
      }
    } catch (e) {
      console.warn("Firestore sync fallback:", e);
    }
  }

  localStorage.setItem("nischay_student_session", JSON.stringify(studentState));
  localStorage.setItem(localKey, JSON.stringify(studentState));

  return studentState;
}

// OMR ऑटो सिंक
async function syncBubbleToCloud(user, day, qNum, opt, state) {
  if (!state) return;
  if (!state.savedOMR) state.savedOMR = {};
  if (!state.savedOMR[day]) state.savedOMR[day] = {};
  state.savedOMR[day][qNum] = opt;

  const localKey = `nischay_exam_state_${state.rollCode}_${state.rollNumber}`;
  localStorage.setItem(localKey, JSON.stringify(state));

  if (user && window.NischayConfig && window.NischayConfig.dbInstance) {
    try {
      const db = window.NischayConfig.dbInstance;
      await db.collection("bseb_exams_2026").doc(user.uid).set({
        savedOMR: { [day]: { [qNum]: opt } }
      }, { merge: true });
    } catch (e) {}
  }
}

// 🤖 बैकग्राउंड में AI चेकिंग (Firestore को हैंग किए बिना)
async function runBackgroundGeminiEvaluation(uid, day, subjectName, imagesList, currentObjMarks) {
  if (!imagesList || imagesList.length === 0) return;

  let imageParts = [];
  imagesList.slice(0, 24).forEach(item => {
    const base64Str = typeof item === 'string' ? item : item.dataUrl;
    if (base64Str) {
      const cleanBase64 = base64Str.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
      imageParts.push({
        inline_data: { mime_type: "image/jpeg", data: cleanBase64 }
      });
    }
  });

  if (imageParts.length === 0) return;

  const promptText = `आप बिहार विद्यालय परीक्षा समिति (BSEB) पटना के मुख्य परीक्षक हैं।
विषय: ${subjectName} (Subjective Part 'B', पूर्णांक: 50 अंक)।
जाँचें: यदि कोई फालतू/गैर-शैक्षणिक फोटो हो तो isValid: false दें और 0 अंक दें। सही उत्तरों पर स्टेप मार्किंग करें।
शुद्ध JSON में उत्तर दें:
{"isValid": true, "totalSubjectiveMarks": 38, "overallFeedback": "उत्तर सही हैं", "pageEvaluations": [{"page": 1, "marksAwarded": 4, "maxMarks": 5, "remark": "सही सूत्र"}]}`;

  try {
    const key = getProtectedKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${BSEB_CONFIG.GEMINI_MODEL}:generateContent?key=${key}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: promptText }, ...imageParts]
        }]
      })
    });

    const data = await response.json();
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      const rawText = data.candidates[0].content.parts[0].text;
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);

      if (jsonMatch && window.NischayConfig?.dbInstance) {
        const parsed = JSON.parse(jsonMatch[0]);
        let awardedMarks = parsed.isValid ? Math.min(50, Math.max(0, parseInt(parsed.totalSubjectiveMarks, 10) || 0)) : 0;
        let finalTotal = currentObjMarks + awardedMarks;

        const db = window.NischayConfig.dbInstance;
        await db.collection("bseb_exams_2026").doc(uid).set({
          completedDays: {
            [day]: {
              subjectiveMarks: awardedMarks,
              totalMarks: finalTotal,
              aiFeedback: parsed.overallFeedback || "समीक्षा पूर्ण",
              pageEvaluations: parsed.pageEvaluations || [],
              isDisqualified: !parsed.isValid,
              aiEvaluatedAt: new Date().toISOString()
            }
          }
        }, { merge: true });

        console.log(`✓ Day ${day} AI Evaluation Recorded: ${awardedMarks}/50`);
      }
    }
  } catch (err) {
    console.warn("AI grading notice:", err);
  }
}

// 🔒 सख्त सबमिशन: लोकल और क्लाउड दोनों जगह तुरंत ताला
async function submitExamToCloud(user, day, subjectName, answerKey, imagesList, state) {
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

  const completedData = {
    subjectName: subjectName,
    objectiveMarks: objMarks,
    subjectiveMarks: 35,
    totalMarks: objMarks + 35,
    uploadedPagesCount: imagesList ? imagesList.length : 0,
    status: "COMPLETED",
    submittedAt: new Date().toISOString()
  };

  // 1. स्टेट को लोकल में परमानेंट लॉक करें
  if (!state.completedDays) state.completedDays = {};
  state.completedDays[day] = completedData;
  state.activeSession = null;

  const localKey = `nischay_exam_state_${state.rollCode}_${state.rollNumber}`;
  localStorage.setItem(localKey, JSON.stringify(state));
  localStorage.setItem("nischay_student_session", JSON.stringify(state));

  // 2. टाइमर की मेमोरी पूरी तरह खत्म करें ताकि दोबारा न चले
  localStorage.removeItem(`exam_started_at_${user.uid}_day_${day}`);
  localStorage.removeItem(`draft_pages_${user.uid}_day_${day}`);

  // 3. फ़ायरबेस में तुरंत लॉक दर्ज करें
  if (user && window.NischayConfig && window.NischayConfig.dbInstance) {
    const db = window.NischayConfig.dbInstance;
    await db.collection("bseb_exams_2026").doc(user.uid).set({
      completedDays: { [day]: completedData },
      activeSession: null
    }, { merge: true });

    // बैकग्राउंड में AI चेकिंग
    runBackgroundGeminiEvaluation(user.uid, day, subjectName, imagesList, objMarks);
  }

  return completedData;
}

document.addEventListener("DOMContentLoaded", initThemeEngine);
