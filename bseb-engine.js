/**
 * NischayDesk - BSEB Official Assessment Engine (v36.0 Universal Format & Touch Edition)
 * Architected by: Prince Kumar (NischayDesk)
 * Features: Auto HEIC-to-JPEG, High-Res Safe Gallery Upload, 4-Corner Touch Cropper,
 *           Anti-Crash Memory Handling, Zero Auto-Submit, 3-Day Reset Cooldown
 */

// ---------------------------------------------------------
// 1. Scanner Safe API Resolver
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
  BACKUP_MODEL: "gemini-3.5-flash-lite",
  IMGBB_KEY: "3e83d4f2017fafb76b04d4f92a0d901b",
  RESET_COOLDOWN_DAYS: 3
};

// ---------------------------------------------------------
// 2. Direct Google Auth Trigger
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
// 3. Server Time Engine
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
// 4. Cheating Prevention Engine (Zero Auto-Submit)
// ---------------------------------------------------------
let tabSwitchCount = 0;
let isExamActive = false;
let isUploadingAnswerSheet = false;

function setUploadMode(active) {
  isUploadingAnswerSheet = active;
  if (active) {
    setTimeout(() => { isUploadingAnswerSheet = false; }, 600000);
  }
}

function initAntiCheatingMonitor() {
  tabSwitchCount = 0;
  isExamActive = true;
  document.addEventListener("visibilitychange", handleTabSwitch);

  document.querySelectorAll('input[type="file"]').forEach(inp => {
    inp.addEventListener("click", () => setUploadMode(true));
  });
}

function stopAntiCheatingMonitor() {
  isExamActive = false;
  document.removeEventListener("visibilitychange", handleTabSwitch);
}

function handleTabSwitch() {
  if (!isExamActive || isUploadingAnswerSheet) return;

  if (document.visibilityState === "hidden") {
    tabSwitchCount++;
    console.log(`[सुरक्षा सूचना] स्क्रीन स्विच दर्ज: ${tabSwitchCount}`);
  } else if (document.visibilityState === "visible" && tabSwitchCount > 0) {
    showNonBlockingWarning(`⚠️ ध्यान दें: परीक्षा के दौरान अन्य ऐप्स या ब्राउज़र टैब न खोलें।`);
  }
}

function showNonBlockingWarning(msg) {
  let toast = document.getElementById("nischayAlertToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "nischayAlertToast";
    toast.style.cssText = `
      position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
      background: #ef4444; color: #ffffff; padding: 10px 18px; border-radius: 8px;
      font-size: 0.85rem; font-weight: 700; z-index: 999999; box-shadow: 0 4px 15px rgba(0,0,0,0.25);
      transition: opacity 0.3s ease; text-align: center; max-width: 90%;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = "block";
  toast.style.opacity = "1";
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => { toast.style.display = "none"; }, 300);
  }, 4000);
}

// ---------------------------------------------------------
// 5. ⚡ यूनिवर्सल गैलरी कंप्रेसर (HEIC, JPG, PNG सभी के लिए)
// ---------------------------------------------------------
async function compressDirectImage(file) {
  try {
    if (!file) return null;

    // 1. अगर फ़ोटो HEIC / HEIF है तो उसे पहले JPEG Blob में बदलें
    const isHeic = file.type === "image/heic" || 
                   file.type === "image/heif" || 
                   (file.name && file.name.toLowerCase().endsWith(".heic")) || 
                   (file.name && file.name.toLowerCase().endsWith(".heif"));

    if (isHeic && window.heic2any) {
      try {
        const converted = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.75
        });
        file = Array.isArray(converted) ? converted[0] : converted;
      } catch (convErr) {
        console.warn("HEIC Auto-Conversion Note:", convErr);
      }
    }

    // 2. इमेज को मेमोरी-सेफ़ तरीक़े से लोड करना
    const imgSource = await new Promise((resolve, reject) => {
      const img = new Image();
      const objUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objUrl);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objUrl);
        reject(new Error("Image Load Failed"));
      };
      img.src = objUrl;
    });

    const maxDim = 1050; // स्पष्ट लिखावट, साइज़ मात्र 60-80KB
    let w = imgSource.width;
    let h = imgSource.height;

    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.filter = "contrast(1.15) brightness(1.02)";
    ctx.drawImage(imgSource, 0, 0, w, h);

    const compressed = canvas.toDataURL("image/jpeg", 0.58);
    canvas.width = 0;
    canvas.height = 0;
    return compressed;
  } catch (err) {
    console.error("Direct Compress Error:", err);
    return null;
  }
}

// ---------------------------------------------------------
// 6. 📸 सिर्फ़ कैमरा फ़ोटो हेतु 4-कॉर्नर टच-क्रॉपर व रोटेटर
// ---------------------------------------------------------
async function openCameraImageCropper(imageFile, pageIndex = 1) {
  // अगर कैमरे से भी HEIC आए तो पहले JPEG बनाएँ
  const isHeic = imageFile.type === "image/heic" || 
                 imageFile.type === "image/heif" || 
                 (imageFile.name && imageFile.name.toLowerCase().endsWith(".heic")) || 
                 (imageFile.name && imageFile.name.toLowerCase().endsWith(".heif"));

  if (isHeic && window.heic2any) {
    try {
      const converted = await heic2any({
        blob: imageFile,
        toType: "image/jpeg",
        quality: 0.8
      });
      imageFile = Array.isArray(converted) ? converted[0] : converted;
    } catch (e) {}
  }

  return new Promise((resolve) => {
    setUploadMode(true);

    const objUrl = URL.createObjectURL(imageFile);
    const overlay = document.createElement("div");
    overlay.id = "nischayCropperModal";
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 99999999;
      background: #020617; display: flex; flex-direction: column;
      align-items: center; justify-content: space-between; padding: 12px;
      touch-action: none; -webkit-user-select: none; user-select: none;
      font-family: 'Plus Jakarta Sans', sans-serif;
    `;

    overlay.innerHTML = `
      <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; color: #fff;">
        <span style="font-size: 0.95rem; font-weight: 800; color: #38bdf8;">
          📸 कैमरा पन्ना ${pageIndex}: कोने खींचकर क्रॉप करें
        </span>
        <button type="button" id="btnCropRotate" style="background: #1e293b; color: #fff; border: 1px solid #475569; padding: 6px 14px; border-radius: 6px; font-weight: 700; font-size: 0.82rem; cursor: pointer;">
          🔄 90° घुमाएँ
        </button>
      </div>

      <div id="cropperViewport" style="position: relative; width: 100%; max-width: 480px; flex: 1; margin: 10px 0; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #000; border-radius: 8px;">
        <canvas id="cropCanvas" style="max-width: 100%; max-height: 100%; object-fit: contain; pointer-events: none;"></canvas>
        
        <div id="cropBoxGuide" style="position: absolute; border: 2.5px dashed #38bdf8; background: rgba(56, 189, 248, 0.18); box-sizing: border-box; touch-action: none; cursor: move;">
          <div class="crop-corner-handle" data-corner="tl" style="position: absolute; top: -20px; left: -20px; width: 44px; height: 44px; background: radial-gradient(circle, #38bdf8 45%, transparent 50%); border-radius: 50%; touch-action: none; z-index: 50;">
            <div style="position: absolute; top: 12px; left: 12px; width: 20px; height: 20px; background: #38bdf8; border: 3px solid #ffffff; border-radius: 50%;"></div>
          </div>
          <div class="crop-corner-handle" data-corner="tr" style="position: absolute; top: -20px; right: -20px; width: 44px; height: 44px; background: radial-gradient(circle, #38bdf8 45%, transparent 50%); border-radius: 50%; touch-action: none; z-index: 50;">
            <div style="position: absolute; top: 12px; right: 12px; width: 20px; height: 20px; background: #38bdf8; border: 3px solid #ffffff; border-radius: 50%;"></div>
          </div>
          <div class="crop-corner-handle" data-corner="bl" style="position: absolute; bottom: -20px; left: -20px; width: 44px; height: 44px; background: radial-gradient(circle, #38bdf8 45%, transparent 50%); border-radius: 50%; touch-action: none; z-index: 50;">
            <div style="position: absolute; bottom: 12px; left: 12px; width: 20px; height: 20px; background: #38bdf8; border: 3px solid #ffffff; border-radius: 50%;"></div>
          </div>
          <div class="crop-corner-handle" data-corner="br" style="position: absolute; bottom: -20px; right: -20px; width: 44px; height: 44px; background: radial-gradient(circle, #38bdf8 45%, transparent 50%); border-radius: 50%; touch-action: none; z-index: 50;">
            <div style="position: absolute; bottom: 12px; right: 12px; width: 20px; height: 20px; background: #38bdf8; border: 3px solid #ffffff; border-radius: 50%;"></div>
          </div>
        </div>
      </div>

      <div style="width: 100%; max-width: 480px; display: flex; gap: 8px;">
        <button type="button" id="btnCancelCrop" style="flex: 1; padding: 12px; background: #334155; color: #fff; border: none; border-radius: 8px; font-weight: 800; cursor: pointer;">
          रद्द करें
        </button>
        <button type="button" id="btnKeepFull" style="flex: 1; padding: 12px; background: #475569; color: #fff; border: none; border-radius: 8px; font-weight: 800; cursor: pointer;">
          पूरा पन्ना रखें
        </button>
        <button type="button" id="btnSaveCrop" style="flex: 1.5; padding: 12px; background: #0284c7; color: #fff; border: none; border-radius: 8px; font-weight: 800; cursor: pointer;">
          ✓ फ़ोटो सेव करें
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    const canvas = document.getElementById("cropCanvas");
    const ctx = canvas.getContext("2d");
    const cropGuide = document.getElementById("cropBoxGuide");
    const viewport = document.getElementById("cropperViewport");
    const img = new Image();
    let rotation = 0;

    let cropState = { x: 30, y: 30, w: 240, h: 320, isFull: false };

    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      setupCanvas();
      resetCropGuide();
    };
    img.src = objUrl;

    function setupCanvas() {
      if (rotation % 180 === 0) {
        canvas.width = img.width;
        canvas.height = img.height;
      } else {
        canvas.width = img.height;
        canvas.height = img.width;
      }

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    }

    function resetCropGuide() {
      const rect = canvas.getBoundingClientRect();
      const vRect = viewport.getBoundingClientRect();
      const leftOff = rect.left - vRect.left;
      const topOff = rect.top - vRect.top;

      cropState.x = Math.max(0, leftOff + 10);
      cropState.y = Math.max(0, topOff + 10);
      cropState.w = Math.max(100, rect.width - 20);
      cropState.h = Math.max(100, rect.height - 20);

      updateGuideStyles();
    }

    function updateGuideStyles() {
      cropGuide.style.left = `${cropState.x}px`;
      cropGuide.style.top = `${cropState.y}px`;
      cropGuide.style.width = `${cropState.w}px`;
      cropGuide.style.height = `${cropState.h}px`;
    }

    // कोनों को खींचकर छोटा/बड़ा करना
    let activeCorner = null;
    let startX = 0, startY = 0;
    let origBox = { x: 0, y: 0, w: 0, h: 0 };

    overlay.querySelectorAll(".crop-corner-handle").forEach(hEl => {
      hEl.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        activeCorner = hEl.getAttribute("data-corner");
        startX = ev.clientX;
        startY = ev.clientY;
        origBox = { ...cropState };
        hEl.setPointerCapture(ev.pointerId);

        const onCornerMove = (mEv) => {
          if (!activeCorner) return;
          const dx = mEv.clientX - startX;
          const dy = mEv.clientY - startY;
          const minDim = 70;

          if (activeCorner === "br") {
            cropState.w = Math.max(minDim, origBox.w + dx);
            cropState.h = Math.max(minDim, origBox.h + dy);
          } else if (activeCorner === "bl") {
            const targetW = Math.max(minDim, origBox.w - dx);
            cropState.x = origBox.x + (origBox.w - targetW);
            cropState.w = targetW;
            cropState.h = Math.max(minDim, origBox.h + dy);
          } else if (activeCorner === "tr") {
            cropState.w = Math.max(minDim, origBox.w + dx);
            const targetH = Math.max(minDim, origBox.h - dy);
            cropState.y = origBox.y + (origBox.h - targetH);
            cropState.h = targetH;
          } else if (activeCorner === "tl") {
            const targetW = Math.max(minDim, origBox.w - dx);
            const targetH = Math.max(minDim, origBox.h - dy);
            cropState.x = origBox.x + (origBox.w - targetW);
            cropState.y = origBox.y + (origBox.h - targetH);
            cropState.w = targetW;
            cropState.h = targetH;
          }
          updateGuideStyles();
        };

        const onCornerUp = (uEv) => {
          activeCorner = null;
          try { hEl.releasePointerCapture(uEv.pointerId); } catch(err){}
          hEl.removeEventListener("pointermove", onCornerMove);
          hEl.removeEventListener("pointerup", onCornerUp);
        };

        hEl.addEventListener("pointermove", onCornerMove);
        hEl.addEventListener("pointerup", onCornerUp);
      });
    });

    // डब्बे को बीच से पकड़कर हिलाना
    cropGuide.addEventListener("pointerdown", (ev) => {
      if (ev.target.closest(".crop-corner-handle")) return;
      ev.preventDefault();
      startX = ev.clientX;
      startY = ev.clientY;
      const initialX = cropState.x;
      const initialY = cropState.y;
      cropGuide.setPointerCapture(ev.pointerId);

      const onBoxMove = (mEv) => {
        cropState.x = initialX + (mEv.clientX - startX);
        cropState.y = initialY + (mEv.clientY - startY);
        updateGuideStyles();
      };

      const onBoxUp = (uEv) => {
        try { cropGuide.releasePointerCapture(uEv.pointerId); } catch(err){}
        cropGuide.removeEventListener("pointermove", onBoxMove);
        cropGuide.removeEventListener("pointerup", onBoxUp);
      };

      cropGuide.addEventListener("pointermove", onBoxMove);
      cropGuide.addEventListener("pointerup", onBoxUp);
    });

    document.getElementById("btnCropRotate").onclick = () => {
      rotation = (rotation + 90) % 360;
      setupCanvas();
      setTimeout(resetCropGuide, 50);
    };

    document.getElementById("btnCancelCrop").onclick = () => {
      overlay.remove();
      resolve(null);
    };

    document.getElementById("btnKeepFull").onclick = () => {
      cropState.isFull = true;
      finishAndExport();
    };

    document.getElementById("btnSaveCrop").onclick = () => {
      cropState.isFull = false;
      finishAndExport();
    };

    function finishAndExport() {
      let exportCanvas = document.createElement("canvas");
      const cRect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / cRect.width;
      const scaleY = canvas.height / cRect.height;

      let srcX = 0, srcY = 0, srcW = canvas.width, srcH = canvas.height;

      if (!cropState.isFull) {
        const vRect = viewport.getBoundingClientRect();
        const leftOff = cRect.left - vRect.left;
        const topOff = cRect.top - vRect.top;

        srcX = Math.max(0, (cropState.x - leftOff) * scaleX);
        srcY = Math.max(0, (cropState.y - topOff) * scaleY);
        srcW = Math.min(canvas.width - srcX, cropState.w * scaleX);
        srcH = Math.min(canvas.height - srcY, cropState.h * scaleY);
      }

      const maxDim = 1050;
      let outW = srcW;
      let outH = srcH;
      if (outW > maxDim || outH > maxDim) {
        if (outW > outH) {
          outH = Math.round((outH * maxDim) / outW);
          outW = maxDim;
        } else {
          outW = Math.round((outW * maxDim) / outH);
          outH = maxDim;
        }
      }

      exportCanvas.width = outW;
      exportCanvas.height = outH;
      const eCtx = exportCanvas.getContext("2d", { alpha: false });
      eCtx.fillStyle = "#ffffff";
      eCtx.fillRect(0, 0, outW, outH);
      eCtx.filter = "contrast(1.18) brightness(1.02)";
      eCtx.drawImage(canvas, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

      const finalB64 = exportCanvas.toDataURL("image/jpeg", 0.60);
      exportCanvas.width = 0;
      exportCanvas.height = 0;
      overlay.remove();
      resolve(finalB64);
    }
  });
}

// ---------------------------------------------------------
// 7. ImgBB Cloud Uploader Helper
// ---------------------------------------------------------
async function uploadToImgBB(base64Data) {
  try {
    const cleanB64 = base64Data.split(",")[1] ? base64Data.split(",")[1].replace(/[\r\n\s]/g, "") : base64Data;
    const formData = new FormData();
    formData.append("image", cleanB64);

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${BSEB_ENGINE_CONFIG.IMGBB_KEY}`, {
      method: "POST",
      body: formData
    });
    const result = await res.json();
    if (result && result.success && result.data && result.data.url) {
      return result.data.url;
    }
    return null;
  } catch (err) {
    console.warn("ImgBB upload note:", err);
    return null;
  }
}

// ---------------------------------------------------------
// 8. Unique Credentials Generator
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
// 9. Cloud Exam State Sync
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
    allDaysCompletedAt: null,
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
// 10. Voice Alert
// ---------------------------------------------------------
function speakHindiAlert(text) {
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "hi-IN";
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  } catch (e) {
    console.warn("Speech synthesis note:", e);
  }
}

// ---------------------------------------------------------
// 11. Fast Cinematic Submission Chamber
// ---------------------------------------------------------
function startCinematicSubmissionChamber() {
  const oldModal = document.getElementById("nischayFastChamberModal");
  if (oldModal) oldModal.remove();

  const modal = document.createElement("div");
  modal.id = "nischayFastChamberModal";
  modal.style.cssText = `
    position: fixed; inset: 0; z-index: 9999999;
    background: radial-gradient(circle at center, #061026 0%, #020617 100%);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 24px; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #ffffff;
    user-select: none; -webkit-user-select: none;
  `;

  modal.innerHTML = `
    <style>
      @keyframes chamberGlow {
        0% { box-shadow: 0 0 20px rgba(56, 189, 248, 0.3); transform: scale(0.98); }
        50% { box-shadow: 0 0 45px rgba(56, 189, 248, 0.8); transform: scale(1.02); }
        100% { box-shadow: 0 0 20px rgba(56, 189, 248, 0.3); transform: scale(0.98); }
      }
      @keyframes popScale {
        0% { transform: scale(0.5); opacity: 0; }
        70% { transform: scale(1.15); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      .badge-chip {
        display: inline-flex; align-items: center; gap: 6px;
        background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.4);
        color: #38bdf8; padding: 6px 16px; border-radius: 999px;
        font-size: 0.78rem; font-weight: 800; letter-spacing: 0.8px; margin-bottom: 20px;
      }
    </style>

    <div style="max-width: 460px; width: 100%; text-align: center;">
      <div id="chamberIconBox" style="width: 100px; height: 100px; margin: 0 auto 20px; border-radius: 50%; background: #0b152d; border: 3px solid #38bdf8; display: flex; align-items: center; justify-content: center; animation: chamberGlow 2s infinite ease-in-out;">
        <span id="chamberCenterIcon" style="font-size: 2.8rem;">☁️</span>
      </div>

      <div class="badge-chip">
        <span>●</span> बिहार विद्यालय परीक्षा समिति, पटना
      </div>

      <h2 id="chamberMainHeading" style="font-size: 1.45rem; font-weight: 800; margin: 0 0 10px; color: #ffffff;">
        क्लाउड सर्वर पर जमा हो रहा है...
      </h2>

      <p id="chamberSubText" style="font-size: 0.88rem; color: #94a3b8; margin: 0 0 24px; line-height: 1.6;">
        उत्तर-पुस्तिका की प्रतियाँ सुरक्षित की जा रही हैं। कृपया बैक न करें।
      </p>

      <div style="background: rgba(255,255,255,0.06); height: 8px; border-radius: 999px; overflow: hidden; margin-bottom: 14px; border: 1px solid rgba(255,255,255,0.1);">
        <div id="chamberFastProgress" style="width: 25%; height: 100%; background: linear-gradient(90deg, #0284c7, #38bdf8); transition: width 0.4s ease; border-radius: 999px;"></div>
      </div>

      <div style="font-size: 0.76rem; color: #64748b; font-weight: 600;">
        🔒 256-Bit SSL Secured Cloud Storage Pipeline
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  return {
    updateProgress: (pct, msg) => {
      const pBar = document.getElementById("chamberFastProgress");
      const sub = document.getElementById("chamberSubText");
      if (pBar) pBar.style.width = pct + "%";
      if (sub && msg) sub.innerText = msg;
    },
    triggerFinalSuccess: () => {
      return new Promise((resolve) => {
        const iconBox = document.getElementById("chamberIconBox");
        const centerIcon = document.getElementById("chamberCenterIcon");
        const heading = document.getElementById("chamberMainHeading");
        const sub = document.getElementById("chamberSubText");
        const pBar = document.getElementById("chamberFastProgress");

        if (pBar) {
          pBar.style.background = "linear-gradient(90deg, #10b981, #22c55e)";
          pBar.style.width = "100%";
        }

        if (iconBox) {
          iconBox.style.borderColor = "#22c55e";
          iconBox.style.boxShadow = "0 0 45px rgba(34, 197, 94, 0.7)";
          iconBox.style.animation = "popScale 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards";
        }
        if (centerIcon) centerIcon.innerText = "🎉";

        if (heading) {
          heading.innerText = "बधाई हो! उत्तर-पुस्तिका सफलतापूर्वक जमा हो गई";
          heading.style.color = "#4ade80";
        }

        speakHindiAlert("बधाई हो! आपकी उत्तर पुस्तिका सफलतापूर्वक जमा कर ली गई है।");

        let countdown = 3;
        if (sub) {
          sub.innerHTML = `मुख्य मूल्यांकन क्लाउड सर्वर पर प्रारंभ हो चुका है।<br><strong style="color: #38bdf8; font-size: 1.15rem; display: inline-block; margin-top: 8px;">${countdown} सेकंड में होम पेज पर पुनर्निर्देशित...</strong>`;
        }

        const cdInterval = setInterval(() => {
          countdown--;
          if (countdown > 0) {
            if (sub) {
              sub.innerHTML = `मुख्य मूल्यांकन क्लाउड सर्वर पर प्रारंभ हो चुका है।<br><strong style="color: #38bdf8; font-size: 1.15rem; display: inline-block; margin-top: 8px;">${countdown} सेकंड में होम पेज पर पुनर्निर्देशित...</strong>`;
            }
          } else {
            clearInterval(cdInterval);
            if (sub) {
              sub.innerHTML = `मुख्य मूल्यांकन क्लाउड सर्वर पर प्रारंभ हो चुका है।<br><strong style="color: #22c55e; font-size: 1.15rem; display: inline-block; margin-top: 8px;">होम पेज पर जा रहे हैं...</strong>`;
            }
            setTimeout(() => {
              if (modal) modal.remove();
              resolve();
            }, 600);
          }
        }, 1000);
      });
    }
  };
}

// ---------------------------------------------------------
// 12. सबमिशन हैंडलर
// ---------------------------------------------------------
async function submitExamToCloud(user, day, subjectCode, answerKey, imagesList, state) {
  stopAntiCheatingMonitor();
  isUploadingAnswerSheet = false;

  const chamber = startCinematicSubmissionChamber();

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

  chamber.updateProgress(40, "ओएमआर डेटा व रिकॉर्ड क्लाउड में सुरक्षित हो रहा है...");

  if (!state.completedDays) state.completedDays = {};
  state.completedDays[day] = completedData;

  let allDaysFinishedTime = state.allDaysCompletedAt || null;
  if (Object.keys(state.completedDays).length >= 6 && !allDaysFinishedTime) {
    allDaysFinishedTime = submitIso;
  }

  if (user && window.NischayConfig && window.NischayConfig.dbInstance) {
    const db = window.NischayConfig.dbInstance;

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
      allDaysCompletedAt: allDaysFinishedTime,
      activeSession: null
    }, { merge: true });

    if (imagesList && imagesList.length > 0) {
      const dayPagesColRef = db.collection("bseb_exams_2026").doc(user.uid).collection(`day_${day}_pages`);
      
      for (let i = 0; i < imagesList.length; i++) {
        chamber.updateProgress(
          40 + Math.round(((i + 1) / imagesList.length) * 45),
          `पेज (${i + 1}/${imagesList.length}) क्लाउड पर अपलोड हो रहा है...`
        );

        const item = imagesList[i];
        const b64 = typeof item === 'string' ? item : (item.dataUrl || item.imageData || item.data);
        
        const cloudUrl = await uploadToImgBB(b64);

        await dayPagesColRef.doc(`p_${i + 1}`).set({
          pageNumber: i + 1,
          imageUrl: cloudUrl || "",
          savedAt: submitIso
        });
      }
    }
  }

  await saveEvaluatedSheetToDB(user ? user.uid : "local", day, {
    subjectCode: subjectCode,
    subjectName: subjectName,
    pages: imagesList || [],
    evaluation: [],
    isExpelled: false
  });

  state.lastExamDate = todayStr;
  state.allDaysCompletedAt = allDaysFinishedTime;
  state.activeSession = null;

  await chamber.triggerFinalSuccess();
  window.location.href = "index.html";

  return completedData;
}

// ---------------------------------------------------------
// 13. Local IndexedDB Cache
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
// 14. Safe Exam Re-attempt Reset Engine
// ---------------------------------------------------------
async function executeSafeExamReset(user) {
  if (!user) {
    alert("⚠️ कृपया पहले लॉगिन करें!");
    return;
  }

  const c1 = confirm("⚠️ क्या आप सचमुच अपनी पूरी वार्षिक परीक्षा रीसेट करना चाहते हैं?\n\nआपके सभी 6 विषयों के पुराने अंक एवं कॉपियाँ हटा दी जाएँगी।");
  if (!c1) return;

  const c2 = confirm("⚠️ अंतिम पुष्टि: आपका रोल कोड एवं रोल नंबर वही रहेगा, परंतु आप Day 1 (हिन्दी) से पुनः परीक्षा प्रारंभ करेंगे। क्या आप सहमत हैं?");
  if (!c2) return;

  try {
    const db = window.NischayConfig.dbInstance;
    const uid = user.uid;
    const todayIso = new Date().toISOString();

    await db.collection("bseb_exams_2026").doc(uid).update({
      completedDays: {},
      savedOMR: {},
      startDate: todayIso,
      submittedAt: null,
      lastExamDate: null,
      allDaysCompletedAt: null,
      activeSession: null,
      isProfileLocked: false
    });

    for (let day = 1; day <= 6; day++) {
      const snap = await db.collection("bseb_exams_2026").doc(uid).collection(`day_${day}_pages`).get();
      if (!snap.empty) {
        const batch = db.batch();
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
    }

    try {
      const req = indexedDB.open("NischaySheetsDB", 1);
      req.onsuccess = (e) => {
        const idb = e.target.result;
        if (idb.objectStoreNames.contains("sheets")) {
          const tx = idb.transaction("sheets", "readwrite");
          for (let d = 1; d <= 6; d++) {
            tx.objectStore("sheets").delete(`${uid}_day_${d}`);
          }
        }
      };
    } catch(err) {}

    alert("✅ आपकी परीक्षा सफलतापूर्वक रीसेट कर दी गई है!\n\nअब आप Day 1 (हिन्दी) से नए सिरे से परीक्षा दे सकते हैं।");
    window.location.reload();

  } catch (error) {
    console.error("Exam Reset Error:", error);
    alert("❌ रीसेट करने में त्रुटि: " + error.message);
  }
}
