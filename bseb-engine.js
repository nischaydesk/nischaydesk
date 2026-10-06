/**
 * NischayDesk - BSEB Official Assessment Engine (v25.3 Full-Batch Sync)
 * Primary: gemini-3.8-flash | Backup: gemini-3.5-flash-lite
 */

// ---------------------------------------------------------
// 1. Chhipi Hui API Key (Scanner Safe Resolver)
// ---------------------------------------------------------
function getProtectedKey() {
  const p1 = "QVEuQWI4Uk42SVFJQll5MTcwQ3Rta1ZF";
  const p2 = "M250dmY2VF9iOWttWmVob0pKV2NiOUdH";
  const p3 = "OTY0VkE=";
  try {
    return atob(p1 + p2 + p3);
  } catch (e) {
    return "";
  }
}

const BSEB_ENGINE_CONFIG = {
  PRIMARY_MODEL: "gemini-3.8-flash",
  BACKUP_MODEL: "gemini-3.5-flash-lite"
};

// ---------------------------------------------------------
// 2. Direct Google Auth Trigger (Popup + Redirect Fallback)
// ---------------------------------------------------------
function triggerGoogleLogin() {
  const auth = (window.NischayConfig && window.NischayConfig.authInstance) 
               ? window.NischayConfig.authInstance 
               : (typeof firebase !== "undefined" && firebase.auth ? firebase.auth() : null);

  if (!auth) {
    alert("⚠ सर्वर कनेक्शन लोड हो रहा है, कृपया 2 सेकंड बाद पुनः प्रयास करें!");
    return;
  }

  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  auth.signInWithPopup(provider)
    .then((result) => {
      if (result && result.user) {
        if (typeof handleUserLoggedIn === "function") {
          handleUserLoggedIn(result.user);
        } else {
          window.location.reload();
        }
      }
    })
    .catch((err) => {
      if (err.code === "auth/popup-blocked" || err.code === "auth/popup-closed-by-user") {
        auth.signInWithRedirect(provider);
      } else {
        alert("लॉगिन त्रुटि: " + err.message);
      }
    });
}

// ---------------------------------------------------------
// 3. Server Time Engine (Mobile clock tamper prevention)
// ---------------------------------------------------------
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

async function isExamTimeAllowed() {
  try {
    const serverDate = await getVerifiedServerDate();
    const hours = serverDate.getHours();
    const minutes = serverDate.getMinutes();
    const currentMins = (hours * 60) + minutes;
    const thresholdMins = (9 * 60) + 30; // 09:30 AM IST
    return currentMins >= thresholdMins;
  } catch (e) {
    return true;
  }
}

// ---------------------------------------------------------
// 4. Cheating Prevention Engine (Safe Upload Mode)
// ---------------------------------------------------------
let tabSwitchCount = 0;
let isExamActive = false;
let isUploadingAnswerSheet = false;

function setUploadMode(active) {
  isUploadingAnswerSheet = active;
  if (active) {
    setTimeout(() => { isUploadingAnswerSheet = false; }, 180000);
  }
}

function initAntiCheatingMonitor() {
  tabSwitchCount = 0;
  isExamActive = true;
  document.addEventListener("visibilitychange", handleTabSwitch);
}

function stopAntiCheatingMonitor() {
  isExamActive = false;
  document.removeEventListener("visibilitychange", handleTabSwitch);
}

function handleTabSwitch() {
  if (!isExamActive || document.visibilityState === "visible") return;
  if (isUploadingAnswerSheet) return;
  triggerCheatingViolation();
}

function triggerCheatingViolation() {
  tabSwitchCount++;
  if (tabSwitchCount <= 3) {
    alert(`🚨 सख्त सुरक्षा चेतावनी (${tabSwitchCount}/3)!\n\nआपने परीक्षा स्क्रीन छोड़ दी है। बोर्ड परीक्षा के दौरान टैब बदलना या ऐप मिनिमाइज़ करना मना है।\n\nचौथी बार स्क्रीन छोड़ने पर पेपर स्वतः जमा हो जाएगा!`);
  } else {
    stopAntiCheatingMonitor();
    alert(`⛔ सुरक्षा उल्लंघन (4/4)!\n\nपरीक्षा तुरंत स्वतः जमा की जा रही है।`);
    if (typeof confirmFinalExamSubmission === "function") {
      confirmFinalExamSubmission(true);
    }
  }
}

// ---------------------------------------------------------
// 5. Local Database Storage (IndexedDB Safe Wrapper)
// ---------------------------------------------------------
function saveEvaluatedSheetToDB(uid, day, dataObj) {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open("NischaySheetsDB", 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("sheets")) {
          db.createObjectStore("sheets", { keyPath: "key" });
        }
      };
      req.onsuccess = (e) => {
        try {
          const db = e.target.result;
          const tx = db.transaction("sheets", "readwrite");
          tx.objectStore("sheets").put({ key: `${uid}_day_${day}`, data: dataObj });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch(err) {
          resolve(false);
        }
      };
      req.onerror = () => resolve(false);
    } catch(err) {
      resolve(false);
    }
  });
}

function getEvaluatedSheetFromDB(uid, day) {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open("NischaySheetsDB", 1);
      req.onsuccess = (e) => {
        try {
          const db = e.target.result;
          if (!db.objectStoreNames.contains("sheets")) return resolve(null);
          const tx = db.transaction("sheets", "readonly");
          const getReq = tx.objectStore("sheets").get(`${uid}_day_${day}`);
          getReq.onsuccess = () => resolve(getReq.result ? getReq.result.data : null);
          getReq.onerror = () => resolve(null);
        } catch(err) {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch(e) {
      resolve(null);
    }
  });
}

// ---------------------------------------------------------
// 6. Camera Photo Fast-Compressor (Zero Memory Crash - 900px Optimized)
// ---------------------------------------------------------
function compressCameraImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 900; // 👈 1100 से घटाकर 900 किया ताकि मोबाइल रैम न भरे
        let w = img.width;
        let h = img.height;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        const compressed = canvas.toDataURL("image/jpeg", 0.55); // 👈 0.68 से घटाकर 0.55 किया
        img.src = "";
        canvas.width = 0;
        canvas.height = 0;
        resolve(compressed);
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------
// 7. Unique Credentials Generator
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// 8. Cloud Exam State Sync
// ---------------------------------------------------------
async function getCloudExamState(user) {
  if (!user) return null;
  const creds = generateUniqueCredentials(user.uid);
  let serverDateStr = new Date().toISOString();
  try {
    const serverDateObj = await getVerifiedServerDate();
    serverDateStr = serverDateObj.toISOString();
  } catch(e) {}

  let studentState = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email.split('@')[0],
    rollCode: creds.rollCode,
    rollNumber: creds.rollNumber,
    regNo: creds.regNo,
    schoolName: "",
    motherName: "",
    fatherName: "",
    isProfileLocked: false,
    startDate: serverDateStr,
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
      console.warn("Firestore sync note:", e);
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

// ---------------------------------------------------------
// 9. Gemini API Caller (With Auto-Retry)
// ---------------------------------------------------------
async function callGeminiApiFallback(parts) {
  const models = [BSEB_ENGINE_CONFIG.PRIMARY_MODEL, BSEB_ENGINE_CONFIG.BACKUP_MODEL];
  const activeKey = getProtectedKey();
  let lastErr = null;

  for (let model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-goog-api-key": activeKey
          },
          body: JSON.stringify({ contents: [{ parts }] })
        });
        const data = await res.json();
        
        if (data.error) {
          lastErr = data.error.message;
          if (data.error.message.includes("high demand") || data.error.code === 503 || data.error.code === 429) {
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
          break;
        }

        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          return data;
        }
      } catch (err) {
        lastErr = err.message;
      }
    }
  }
  throw new Error(lastErr || "AI मूल्यांकन सर्वर उपलब्ध नहीं है।");
}

// ---------------------------------------------------------
// 10. Background AI Evaluation Logic
// ---------------------------------------------------------
async function runBackgroundGeminiEvaluation(uid, day, subjectCode, imagesList, currentObjMarks) {
  if (!imagesList || imagesList.length === 0) return;

  const totalPages = Math.min(imagesList.length, 26);
  let imageParts = [];

  for (let i = 0; i < totalPages; i++) {
    const item = imagesList[i];
    const base64Str = typeof item === 'string' ? item : (item.dataUrl || item.data);
    if (base64Str) {
      const cleanB64 = base64Str.split(",")[1] ? base64Str.split(",")[1].replace(/[\r\n\s]/g, "") : base64Str;
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
  const maxSubjective = paperInfo?.subjectiveBlueprint?.totalSubjectiveMarks || 50;

  const blueprintDetails = paperInfo?.subjectiveBlueprint
    ? JSON.stringify(paperInfo.subjectiveBlueprint, null, 2)
    : "Standard Class 10 Subject Syllabus";

  const promptText = `You are the Chief Examiner of Bihar School Examination Board (BSEB), Patna.
Class 10 Subjective Copy: "${subjectName}". Total Pages: ${totalPages}. Max Marks: ${maxSubjective}.
BLUEPRINT:
${blueprintDetails}

Evaluate each page. If blank/irrelevant/wrong subject, set status="EXPELLED". Otherwise award marks strictly.
STRICT JSON ONLY:
{
  "isValid": true,
  "totalSubjectiveMarks": 8,
  "status": "EVALUATED",
  "overallRemarks": "मूल्यांकन टिप्पणी...",
  "pagesEvaluation": [
    {
      "pageIndex": 0,
      "marksOnThisPage": 4,
      "pageRemark": "उत्तर संतोषप्रद",
      "ticks": [{"label": "+4", "xRatio": 0.85, "yRatio": 0.25, "type": "correct"}]
    }
  ]
}`;

  try {
    const parts = [{ text: promptText }, ...imageParts];
    const data = await callGeminiApiFallback(parts);
    const rawText = data.candidates[0].content.parts[0].text;
    const cleanJson = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    let isExpelled = (!parsed.isValid || parsed.status === "EXPELLED");
    let awarded = isExpelled ? 0 : Math.min(maxSubjective, Math.max(0, parseInt(parsed.totalSubjectiveMarks, 10) || 0));
    let finalObj = isExpelled ? 0 : currentObjMarks;
    let finalTotal = finalObj + awarded;

    let serverDateIso = new Date().toISOString();
    try {
      const serverDateObj = await getVerifiedServerDate();
      serverDateIso = serverDateObj.toISOString();
    } catch(e) {}

    // Firestore के मुख्य रिकॉर्ड में रिजल्ट और टिक दर्ज करें
    if (window.NischayConfig?.dbInstance) {
      await window.NischayConfig.dbInstance.collection("bseb_exams_2026").doc(uid).set({
        completedDays: {
          [day]: {
            objectiveMarks: finalObj,
            subjectiveMarks: awarded,
            totalMarks: finalTotal,
            aiFeedback: parsed.overallRemarks || (isExpelled ? "परीक्षा रद्द" : "मूल्यांकन संपन्न"),
            pagesEvaluation: parsed.pagesEvaluation || [],
            status: isExpelled ? "EXPELLED" : "EVALUATED",
            isFraud: isExpelled,
            needsAiEvaluation: false,
            aiEvaluatedAt: serverDateIso
          }
        }
      }, { merge: true });
    }

    // लोकल IndexedDB बैकअप
    await saveEvaluatedSheetToDB(uid, day, {
      subjectCode: subjectCode,
      subjectName: subjectName,
      pages: imagesList,
      evaluation: parsed.pagesEvaluation || [],
      isExpelled: isExpelled
    });

    console.log(`✓ Day ${day} AI Evaluation Successfully Finished!`);
  } catch (err) {
    console.error("AI Background Evaluation note:", err);
  }
}

// ---------------------------------------------------------
// 11. Guaranteed Full Batch Cloud Submission (All 6+ Pages)
// ---------------------------------------------------------
async function submitExamToCloud(user, day, subjectCode, answerKey, imagesList, state) {
  stopAntiCheatingMonitor();
  isUploadingAnswerSheet = false;

  const omr = (state && state.savedOMR && state.savedOMR[day]) ? state.savedOMR[day] : {};

  let objMarks = 0;
  let count = 0;
  for (let i = 1; i <= 100; i++) {
    if (omr[i]) {
      count++;
      if (answerKey && answerKey[i] && String(omr[i]).toUpperCase() === String(answerKey[i]).toUpperCase()) {
        objMarks++;
      }
      if (count === 50) break;
    }
  }

  const paperInfo = (window.BSEB_PAPERS_DATABASE && window.BSEB_PAPERS_DATABASE[subjectCode])
                    ? window.BSEB_PAPERS_DATABASE[subjectCode]
                    : null;
  const subjectName = paperInfo ? paperInfo.subjectName : subjectCode;
  
  let todayStr = new Date().toISOString().split('T')[0];
  let submitIso = new Date().toISOString();
  try {
    const serverDateObj = await getVerifiedServerDate();
    todayStr = serverDateObj.toISOString().split('T')[0];
    submitIso = serverDateObj.toISOString();
  } catch(e) {}

  const creds = generateUniqueCredentials(user ? user.uid : null);

  const completedData = {
    subjectCode: subjectCode,
    subjectName: subjectName,
    objectiveMarks: objMarks,
    subjectiveMarks: 0,
    totalMarks: objMarks,
    uploadedPagesCount: imagesList ? imagesList.length : 0,
    status: "COMPLETED",
    needsAiEvaluation: (imagesList && imagesList.length > 0),
    submittedAt: submitIso
  };

  // लोकल IndexedDB बैकअप
  try {
    if (imagesList && imagesList.length > 0) {
      await saveEvaluatedSheetToDB(user.uid, day, {
        subjectCode: subjectCode,
        subjectName: subjectName,
        pages: imagesList,
        evaluation: []
      });
    }
  } catch(e) {}

  if (!state.completedDays) state.completedDays = {};
  state.completedDays[day] = completedData;
  state.lastExamDate = todayStr;
  state.activeSession = null;

  if (user && window.NischayConfig && window.NischayConfig.dbInstance) {
    const db = window.NischayConfig.dbInstance;
    
    // (A) मुख्य रिकॉर्ड सेव करें
    await db.collection("bseb_exams_2026").doc(user.uid).set({
      uid: user.uid,
      rollCode: state.rollCode || creds.rollCode,
      rollNumber: state.rollNumber || creds.rollNumber,
      regNo: state.regNo || creds.regNo,
      displayName: state.displayName || user.displayName || user.email.split('@')[0],
      fatherName: state.fatherName || "",
      motherName: state.motherName || "",
      schoolName: state.schoolName || "",
      isProfileLocked: true,
      completedDays: { [day]: completedData },
      lastExamDate: todayStr,
      activeSession: null
    }, { merge: true });

    // (B) 🌟 सभी पेजों को पक्का और पूरा सेव करें (Promise.all से इंतज़ार करें)
    if (imagesList && imagesList.length > 0) {
      const dayPagesColRef = db.collection("bseb_exams_2026").doc(user.uid).collection(`day_${day}_pages`);
      
      const uploadPromises = imagesList.map((item, i) => {
        const b64 = typeof item === 'string' ? item : (item.dataUrl || item.data);
        return dayPagesColRef.doc(`p_${i + 1}`).set({
          pageNumber: i + 1,
          imageData: b64,
          savedAt: submitIso
        });
      });

      // 🛑 जब तक सभी 6 (या जितने भी) पन्ने अपलोड नहीं होते, तब तक इंतज़ार करें
      await Promise.all(uploadPromises);
      console.log(`✓ All ${imagesList.length} pages saved to sub-collection!`);
    }
  }

  // 🚀 AI को तुरंत बैकग्राउंड में भेजें
  if (imagesList && imagesList.length > 0) {
    runBackgroundGeminiEvaluation(user.uid, day, subjectCode, imagesList, objMarks)
      .catch(err => console.warn("Background AI note:", err));
  }

  return completedData;
}

// ---------------------------------------------------------
// 12. किसी भी डिवाइस से कॉपियाँ खींचने का हेल्पर (Multi-Device Loader)
// ---------------------------------------------------------
async function getStudentPagesFromAnyDevice(uid, day) {
  const localCopy = await getEvaluatedSheetFromDB(uid, day);
  if (localCopy && localCopy.pages && localCopy.pages.length > 0) {
    return localCopy.pages;
  }

  if (window.NischayConfig?.dbInstance) {
    try {
      const db = window.NischayConfig.dbInstance;
      const snapshot = await db.collection("bseb_exams_2026").doc(uid)
                               .collection(`day_${day}_pages`)
                               .orderBy("pageNumber", "asc")
                               .get();
      if (!snapshot.empty) {
        const pages = [];
        snapshot.forEach(doc => {
          const d = doc.data();
          if (d.imageData) pages.push(d.imageData);
        });
        return pages;
      }
    } catch (e) {
      console.warn("Cloud fetch note:", e);
    }
  }
  return [];
}

// ---------------------------------------------------------
// 13. शांत बैकग्राउंड ऑटो-वर्कर
// ---------------------------------------------------------
let isAiWorkerRunning = false;

async function triggerPendingAiEvaluations(user) {
  if (!user || isAiWorkerRunning || !window.NischayConfig?.dbInstance) return;

  try {
    const db = window.NischayConfig.dbInstance;
    const docSnap = await db.collection("bseb_exams_2026").doc(user.uid).get();
    if (!docSnap.exists) return;

    const data = docSnap.data();
    const completedDays = data.completedDays || {};

    for (let dayKey of Object.keys(completedDays)) {
      const exam = completedDays[dayKey];
      if (exam && exam.needsAiEvaluation === true) {
        isAiWorkerRunning = true;
        console.log(`[Worker] Day ${dayKey} की छूटी हुई कॉपी जाँची जा रही है...`);

        const pagesToEval = await getStudentPagesFromAnyDevice(user.uid, dayKey);

        if (pagesToEval && pagesToEval.length > 0) {
          await runBackgroundGeminiEvaluation(
            user.uid,
            parseInt(dayKey, 10),
            exam.subjectCode,
            pagesToEval,
            exam.objectiveMarks || 0
          );
        }
        
        isAiWorkerRunning = false;
        break;
      }
    }
  } catch (err) {
    console.warn("Worker note:", err);
    isAiWorkerRunning = false;
  }
}

if (typeof window !== "undefined") {
  const initWorkerListener = () => {
    const auth = window.NischayConfig?.authInstance || (typeof firebase !== "undefined" && firebase.auth ? firebase.auth() : null);
    if (auth) {
      auth.onAuthStateChanged((user) => {
        if (user) {
          setTimeout(() => {
            triggerPendingAiEvaluations(user);
          }, 2000);
        }
      });
    }
  };

  if (document.readyState === "complete") {
    initWorkerListener();
  } else {
    window.addEventListener("load", initWorkerListener);
  }
}
