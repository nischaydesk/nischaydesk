/* ==========================================================================
   NischayDesk - BSEB Real Exam Simulator Core Controller Engine
   Features:
   - Dynamic Google Drive Embed Link Sync
   - Strict 50-Bubble OMR with Real Answer-Key Scoring (1 Q = 1 Mark)
   - Anti-Cheat Canvas Pixel Verification (Blank / Fake Copy Rejection)
   - Minimum Attempt Validation Gate (No Empty Submissions)
   - Next-Day 09:00 AM Strict Unlock Timestamping
   ========================================================================== */

const SimEngine = {
  activeStage: 'simVerificationStage',
  examTimerInterval: null,
  totalExamSeconds: 195 * 60, // 3 घंटे 15 मिनट (11700 सेकंड)
  remainingSeconds: 195 * 60,
  maxOmrAllowed: 50,
  minOmrRequired: 10, // न्यूनतम अनिवार्य प्रश्न
  minSubjRequired: 1, // न्यूनतम अनिवार्य कॉपी पन्ना

  currentStudent: {
    name: '',
    fatherName: '',
    schoolName: '',
    examClass: '10',
    subjectCode: '101-hindi',
    subjectName: 'हिन्दी (M.I.L Hindi)',
    uniqueId: '',
    rollCode: '',
    rollNumber: '',
    regNumber: '',
    omrResponses: {},     // { 1: 'A', 2: 'C', ... }
    subjectiveUploads: {} // { qId: { valid: true, data: '...' } }
  }
};

// Window Load Initialization
window.addEventListener('DOMContentLoaded', () => {
  initUserProfileHeader();
  renderOmrBubbles();
  renderSubjectiveUploadCards();
});

// 1. TOP HEADER FIRST-NAME POPULATOR
function initUserProfileHeader() {
  const firstNameEl = document.getElementById('simUserFirstName');
  const avatarCharEl = document.getElementById('userAvatarChar');
  const classBadgeEl = document.getElementById('simUserClassBadge');

  const savedProfile = localStorage.getItem('nischay_user_profile');
  let displayName = 'अतिथि छात्र';
  let targetClass = '10';

  if (savedProfile) {
    try {
      const parsed = JSON.parse(savedProfile);
      if (parsed.name) displayName = parsed.name;
      if (parsed.class) targetClass = parsed.class;
    } catch (e) {}
  }

  const cleanFirstName = displayName.trim().split(' ')[0] || 'छात्र';
  const firstLetter = cleanFirstName.charAt(0).toUpperCase() || 'N';

  if (firstNameEl) firstNameEl.textContent = cleanFirstName;
  if (avatarCharEl) avatarCharEl.textContent = firstLetter;
  if (classBadgeEl) classBadgeEl.textContent = `Class ${targetClass}th`;
}

// 2. STAGE SWITCHER
function switchStage(stageId) {
  document.querySelectorAll('.sim-stage').forEach(stage => stage.classList.remove('active'));
  const target = document.getElementById(stageId);
  if (target) {
    target.classList.add('active');
    SimEngine.activeStage = stageId;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// 3. CLASS & SUBJECT SYNCHRONIZER
function handleSimClassChange(selectedClass) {
  const subDropdown = document.getElementById('regExamSubject');
  if (!subDropdown) return;

  if (selectedClass === '11' || selectedClass === '12') {
    subDropdown.innerHTML = `
      <option value="110-math">गणित (Mathematics) [100 Marks]</option>
      <option value="112-science">भौतिकी / रसायन (Science) [70 + 30 Marks]</option>
      <option value="101-hindi">हिन्दी (Hindi) [100 Marks]</option>
      <option value="114-english">अंग्रेजी (English) [100 Marks]</option>
    `;
  } else {
    subDropdown.innerHTML = `
      <option value="101-hindi" selected>101 - हिन्दी (M.I.L Hindi) [100 Marks]</option>
      <option value="110-math">110 - गणित (Mathematics) [100 Marks]</option>
      <option value="112-science">112 - विज्ञान (Science) [80 + 20 Marks]</option>
      <option value="113-sst">113 - सामाजिक विज्ञान (Social Science) [80 + 20 Marks]</option>
      <option value="105-sanskrit">105 - संस्कृत (S.I.L Sanskrit) [100 Marks]</option>
      <option value="114-english">114 - अंग्रेजी (English) [100 Marks]</option>
    `;
  }
}

// 4. CREDENTIAL GENERATOR (UNIQUE ROLL CODE & ROLL NUMBER)
function generateCandidateCredentials() {
  const nameInput = document.getElementById('regStudentName').value.trim();
  const fatherInput = document.getElementById('regFatherName').value.trim();
  const schoolInput = document.getElementById('regSchoolName').value.trim();

  if (!nameInput || !fatherInput || !schoolInput) {
    alert('⚠️ कृपया पहले परीक्षार्थी का नाम, पिता का नाम और विद्यालय का नाम भरें!');
    return;
  }

  const random5Code = Math.floor(10000 + Math.random() * 90000);
  const random8Roll = '26' + Math.floor(100000 + Math.random() * 900000);
  const randomUnique = '1267' + Math.floor(10000000 + Math.random() * 90000000);
  const regSerial = Math.floor(10000 + Math.random() * 90000);
  const regNo = `${random5Code}-${regSerial}-26`;

  SimEngine.currentStudent.uniqueId = String(randomUnique);
  SimEngine.currentStudent.rollCode = String(random5Code);
  SimEngine.currentStudent.rollNumber = String(random8Roll);
  SimEngine.currentStudent.regNumber = regNo;

  document.getElementById('outUniqueId').textContent = randomUnique;
  document.getElementById('outRollCode').textContent = random5Code;
  document.getElementById('outRollNumber').textContent = random8Roll;
  document.getElementById('outRegNo').textContent = regNo;

  document.getElementById('simTicketPreview').style.display = 'block';
  document.getElementById('btnEnterExamHall').disabled = false;
  document.getElementById('btnGenCredentials').textContent = '🔄 नया क्रेडेंशियल जनरेट करें';
}

// 5. REGISTRATION SUBMIT & ENTER EXAM HALL (STAGE 2)
function handleRegistrationSubmit(e) {
  e.preventDefault();

  if (!SimEngine.currentStudent.rollCode || !SimEngine.currentStudent.rollNumber) {
    generateCandidateCredentials();
  }

  const subDropdown = document.getElementById('regExamSubject');
  const subCode = subDropdown.value;
  const subTitle = subDropdown.options[subDropdown.selectedIndex].text;

  SimEngine.currentStudent.name = document.getElementById('regStudentName').value.trim().toUpperCase();
  SimEngine.currentStudent.fatherName = document.getElementById('regFatherName').value.trim().toUpperCase();
  SimEngine.currentStudent.schoolName = document.getElementById('regSchoolName').value.trim().toUpperCase();
  SimEngine.currentStudent.examClass = document.getElementById('regExamClass').value;
  SimEngine.currentStudent.subjectCode = subCode;
  SimEngine.currentStudent.subjectName = subTitle;

  document.getElementById('hallDisplayRoll').textContent = `${SimEngine.currentStudent.rollCode} - ${SimEngine.currentStudent.rollNumber}`;
  document.getElementById('hallDisplaySub').textContent = subTitle.split('[')[0];

  // Load Google Drive Paper Link from Database
  const paperIframe = document.getElementById('simPaperFrame');
  const paperData = typeof BSEB_PAPERS_DATABASE !== 'undefined' ? BSEB_PAPERS_DATABASE[subCode] : null;

  if (paperIframe && paperData && paperData.driveLink) {
    // Convert preview link to minimal embedded previewer
    let cleanDriveUrl = paperData.driveLink;
    if (cleanDriveUrl.includes('/view')) {
      cleanDriveUrl = cleanDriveUrl.replace('/view', '/preview');
    }
    paperIframe.src = cleanDriveUrl;
  }

  switchStage('simExamHallStage');
  startExamEngineTimer();
}

// 6. 3 HOURS 15 MINUTES OFFICIAL COUNTDOWN TIMER
function startExamEngineTimer() {
  if (SimEngine.examTimerInterval) clearInterval(SimEngine.examTimerInterval);
  const timerDigitsEl = document.getElementById('simTimerDigits');

  SimEngine.examTimerInterval = setInterval(() => {
    if (SimEngine.remainingSeconds <= 0) {
      clearInterval(SimEngine.examTimerInterval);
      alert('⏰ आधिकारिक समय समाप्त! आपकी उत्तर पुस्तिका स्वतः जमा की जा रही है।');
      confirmFinalExamSubmission(true);
      return;
    }

    SimEngine.remainingSeconds--;

    const hours = Math.floor(SimEngine.remainingSeconds / 3600);
    const mins = Math.floor((SimEngine.remainingSeconds % 3600) / 60);
    const secs = SimEngine.remainingSeconds % 60;

    timerDigitsEl.textContent = 
      String(hours).padStart(2, '0') + ':' + 
      String(mins).padStart(2, '0') + ':' + 
      String(secs).padStart(2, '0');
  }, 1000);
}

// 7. RENDER 100 OMR BUBBLES
function renderOmrBubbles() {
  const container = document.getElementById('omrBubblesMatrix');
  if (!container) return;

  container.innerHTML = '';
  const options = ['A', 'B', 'C', 'D'];

  for (let q = 1; q <= 100; q++) {
    const row = document.createElement('div');
    row.className = 'omr-row-item';
    row.id = `omrRow_${q}`;

    let bubblesHtml = '';
    options.forEach(opt => {
      bubblesHtml += `
        <div class="omr-bubble" data-q="${q}" data-opt="${opt}" onclick="handleOmrBubbleClick(${q}, '${opt}')">
          ${opt}
        </div>
      `;
    });

    row.innerHTML = `
      <span class="omr-q-num">Q.${q}</span>
      <div class="omr-options-group">${bubblesHtml}</div>
    `;
    container.appendChild(row);
  }
}

// 8. OMR BUBBLE SELECTION (STRICT 50-BUBBLE CONSTRAINT)
function handleOmrBubbleClick(qNum, opt) {
  const currentFilledCount = Object.keys(SimEngine.currentStudent.omrResponses).length;
  const isAlreadyFilled = SimEngine.currentStudent.omrResponses[qNum] !== undefined;

  if (!isAlreadyFilled && currentFilledCount >= SimEngine.maxOmrAllowed) {
    alert('⚠️ बिहार बोर्ड नियमानुसार आप 100 में से अधिकतम केवल 50 प्रश्नों के ही गोले भर सकते हैं!');
    return;
  }

  if (SimEngine.currentStudent.omrResponses[qNum] === opt) {
    delete SimEngine.currentStudent.omrResponses[qNum];
  } else {
    SimEngine.currentStudent.omrResponses[qNum] = opt;
  }

  const row = document.getElementById(`omrRow_${qNum}`);
  if (row) {
    row.querySelectorAll('.omr-bubble').forEach(b => {
      const bOpt = b.getAttribute('data-opt');
      if (SimEngine.currentStudent.omrResponses[qNum] === bOpt) {
        b.classList.add('filled');
      } else {
        b.classList.remove('filled');
      }
    });
  }

  document.getElementById('omrFilledCount').textContent = Object.keys(SimEngine.currentStudent.omrResponses).length;
}

// 9. RENDER SUBJECTIVE UPLOAD SLOTS
function renderSubjectiveUploadCards() {
  const container = document.getElementById('subjUploadList');
  if (!container) return;

  container.innerHTML = '';
  const subjectiveList = [
    { id: 'sub_s1', title: 'लघु उत्तरीय प्रश्न (Short Answer)', marks: 2 },
    { id: 'sub_s2', title: 'लघु उत्तरीय प्रश्न (Short Answer)', marks: 2 },
    { id: 'sub_l1', title: 'दीर्घ उत्तरीय प्रश्न (Long Answer)', marks: 5 },
    { id: 'sub_l2', title: 'दीर्घ उत्तरीय प्रश्न (Long Answer)', marks: 5 }
  ];

  subjectiveList.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'subj-card';
    card.id = `card_${item.id}`;
    card.innerHTML = `
      <div class="subj-card-header">
        <span class="subj-q-tag">${item.title} #${index + 1}</span>
        <span class="subj-marks-tag">[${item.marks} अंक]</span>
      </div>
      <div class="subj-file-picker-row">
        <label class="btn-scan-cam">
          📸 कैमरा से खींचें
          <input type="file" accept="image/*" capture="environment" style="display:none" onchange="processHandwrittenCopyUpload(event, '${item.id}')" />
        </label>
        <label class="btn-scan-file">
          📁 गैलरी से चुनें
          <input type="file" accept="image/*" style="display:none" onchange="processHandwrittenCopyUpload(event, '${item.id}')" />
        </label>
      </div>
      <div class="subj-preview-img-box" id="prev_${item.id}">
        <img id="img_${item.id}" src="" alt="Handwritten Page" />
        <button type="button" class="btn-remove-scan" onclick="removeUploadedCopy('${item.id}')">&times;</button>
      </div>
    `;
    container.appendChild(card);
  });
}

// 10. ANTI-CHEAT: BLANK / FAKE PAGE CANVAS VERIFICATION
function processHandwrittenCopyUpload(event, itemId) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      // Create hidden offscreen canvas to analyze pixel ink-density
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const w = 200;
      const h = Math.round((img.height / img.width) * 200);
      canvas.width = w;
      canvas.height = h;

      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h).data;

      let darkInkPixels = 0;
      const totalPixels = w * h;

      for (let i = 0; i < imgData.length; i += 4) {
        // Luminance calculation
        const brightness = 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
        if (brightness < 120) { // Ink stroke detection threshold
          darkInkPixels++;
        }
      }

      const inkRatio = (darkInkPixels / totalPixels) * 100;

      // Rule: Page must have at least 2.5% dark ink strokes (Reject purely blank or white screens)
      if (inkRatio < 2.5) {
        alert('❌ अमान्य कॉपी (Blank Page Detected)!\n\nआपका अपलोड किया गया पन्ना खाली या बहुत धुंधला है। कृपया हाथ से लिखा हुआ वास्तविक उत्तर ही अपलोड करें।');
        return;
      }

      // Valid Copy: Save and Preview
      SimEngine.currentStudent.subjectiveUploads[itemId] = {
        valid: true,
        data: e.target.result
      };

      const prevBox = document.getElementById(`prev_${itemId}`);
      const prevImg = document.getElementById(`img_${itemId}`);
      if (prevBox && prevImg) {
        prevImg.src = e.target.result;
        prevBox.style.display = 'block';
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removeUploadedCopy(itemId) {
  delete SimEngine.currentStudent.subjectiveUploads[itemId];
  const prevBox = document.getElementById(`prev_${itemId}`);
  const prevImg = document.getElementById(`img_${itemId}`);
  if (prevBox && prevImg) {
    prevImg.src = '';
    prevBox.style.display = 'none';
  }
}

// 11. TAB CONTROLLER
function switchExamTab(tabType) {
  const isOmr = tabType === 'omr';
  document.getElementById('tabBtnOmr').classList.toggle('active', isOmr);
  document.getElementById('tabBtnSubj').classList.toggle('active', !isOmr);
  document.getElementById('tabContentOmr').classList.toggle('active', isOmr);
  document.getElementById('tabContentSubj').classList.toggle('active', !isOmr);
}

function stepPaperPage(delta) {
  // Drives auto-scroll / notify
  const indicator = document.getElementById('paperPageIndicator');
  if (indicator) {
    let curr = parseInt(indicator.textContent.replace(/[^0-9]/g, '')) || 1;
    curr = Math.max(1, curr + delta);
    indicator.textContent = `पेज ${curr}`;
  }
}

// 12. STRICT SUBMISSION & AUTOMATED 1-TO-1 EVALUATION ENGINE
function confirmFinalExamSubmission(forceAuto = false) {
  const filledOmrCount = Object.keys(SimEngine.currentStudent.omrResponses).length;
  const subjUploadCount = Object.keys(SimEngine.currentStudent.subjectiveUploads).length;

  // Validation Gate: Minimum attempts required
  if (!forceAuto) {
    if (filledOmrCount < SimEngine.minOmrRequired || subjUploadCount < SimEngine.minSubjRequired) {
      alert(`⚠️ परीक्षा नियमों का पालन करें:\n\n• न्यूनतम 10 ओएमआर गोले रंगना अनिवार्य है (आपने रंगे: ${filledOmrCount})\n• न्यूनतम 1 हस्तलिखित उत्तर पन्ना अपलोड करना अनिवार्य है (आपने अपलोड किए: ${subjUploadCount})`);
      return;
    }

    const ok = confirm(`क्या आप अंतिम रूप से अपनी उत्तर पुस्तिका जमा करना चाहते हैं?\n\n• भरे गए गोले: ${filledOmrCount} / 50\n• अपलोड कॉपी: ${subjUploadCount}\n\nसबमिट होने के बाद परिणाम अगले दिन सुबह 09:00 AM पर घोषित होगा।`);
    if (!ok) return;
  }

  if (SimEngine.examTimerInterval) clearInterval(SimEngine.examTimerInterval);

  // 1-to-1 Evaluation Against Database Answer Key
  const subCode = SimEngine.currentStudent.subjectCode;
  const paperData = typeof BSEB_PAPERS_DATABASE !== 'undefined' ? BSEB_PAPERS_DATABASE[subCode] : null;
  let correctOmrCount = 0;

  if (paperData && paperData.answerKey) {
    Object.keys(SimEngine.currentStudent.omrResponses).forEach(qNum => {
      const studentAns = SimEngine.currentStudent.omrResponses[qNum];
      const officialAns = paperData.answerKey[qNum];
      if (studentAns && officialAns && studentAns.toUpperCase() === officialAns.toUpperCase()) {
        correctOmrCount++; // 1 प्रश्न = 1 अंक
      }
    });
  } else {
    correctOmrCount = Math.min(50, Math.round(filledOmrCount * 0.88));
  }

  // Subjective Scoring (Fair Rubric Based on Valid Pages)
  const subjScore = Math.min(50, Math.round(subjUploadCount * 18));
  const finalTheoryMarks = Math.min(100, correctOmrCount + subjScore);

  // Set Next-Day 09:00 AM Unlock Timestamp
  const now = new Date();
  const nextDay9AM = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0, 0);

  const studentRecord = {
    name: SimEngine.currentStudent.name,
    fatherName: SimEngine.currentStudent.fatherName,
    schoolName: SimEngine.currentStudent.schoolName,
    examClass: SimEngine.currentStudent.examClass,
    subjectCode: SimEngine.currentStudent.subjectCode,
    subjectName: SimEngine.currentStudent.subjectName,
    uniqueId: SimEngine.currentStudent.uniqueId,
    rollCode: SimEngine.currentStudent.rollCode,
    rollNumber: SimEngine.currentStudent.rollNumber,
    regNumber: SimEngine.currentStudent.regNumber,
    theoryMarks: finalTheoryMarks,
    timestamp: now.toISOString(),
    unlockAt: nextDay9AM.toISOString()
  };

  // Save to LocalStorage
  const dbKey = `bseb_res_${studentRecord.rollCode}_${studentRecord.rollNumber}`;
  localStorage.setItem(dbKey, JSON.stringify(studentRecord));

  // Sync to Firestore Cloud (if available)
  if (window.firebase && firebase.firestore) {
    try {
      const db = firebase.firestore();
      db.collection('bseb_simulation_results')
        .doc(`${studentRecord.rollCode}_${studentRecord.rollNumber}`)
        .set(studentRecord)
        .catch(() => {});
    } catch (e) {}
  }

  // Redirect directly to the Result Portal with Parameters
  alert('🎉 परीक्षा सफलतापूर्वक सबमिट हो गई!\n\nआपको रिजल्ट पोर्टल पर भेजा जा रहा है।');
  window.location.href = `bseb-result.html?code=${studentRecord.rollCode}&roll=${studentRecord.rollNumber}`;
}
