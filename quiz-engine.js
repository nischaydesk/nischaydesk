/* ==========================================================================
   NischayDesk Real-Time Test Simulation Engine (v6.1 Ultimate Pro)
   Architected by: Prince Kumar (NischayDesk)
   Features: 50-Q Chapter Wise (30m), 1-Hour Full Syllabus, 
             Zero-Error In-Memory Top 50 Leaderboard
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  const testLobbyScreen = document.getElementById('testLobbyScreen');
  const testRunningScreen = document.getElementById('testRunningScreen');
  const testResultScreen = document.getElementById('testResultScreen');

  const testClassSelect = document.getElementById('testClassSelect');
  const testSubjectSelect = document.getElementById('testSubjectSelect');
  const testChapterSelect = document.getElementById('testChapterSelect');
  const startExamBtn = document.getElementById('startExamBtn');

  const liveExamBadge = document.getElementById('liveExamBadge');
  const liveQuestionCounter = document.getElementById('liveQuestionCounter');
  const timerDigits = document.getElementById('timerDigits');
  const submitExamEarlyBtn = document.getElementById('submitExamEarlyBtn');

  const displayQNumber = document.getElementById('displayQNumber');
  const displayQText = document.getElementById('displayQText');
  const displayOptionsGroup = document.getElementById('displayOptionsGroup');
  const prevQBtn = document.getElementById('prevQBtn');
  const nextQBtn = document.getElementById('nextQBtn');
  const clearSelectionBtn = document.getElementById('clearSelectionBtn');
  const paletteButtonsGrid = document.getElementById('paletteButtonsGrid');

  const resTotalMarks = document.getElementById('resTotalMarks');
  const resAccuracy = document.getElementById('resAccuracy');
  const resCorrectCount = document.getElementById('resCorrectCount');
  const resWrongCount = document.getElementById('resWrongCount');
  const solutionsAccordionList = document.getElementById('solutionsAccordionList');
  const restartTestBtn = document.getElementById('restartTestBtn');

  let currentQuestions = [];
  let currentQIndex = 0;
  let userResponses = {};
  let timerInterval = null;
  let timeRemaining = 1800; // डिफ़ॉल्ट 30 मिनट
  let totalTestDuration = 1800;

  // 1. 11th और 12th अलर्ट
  if (testClassSelect) {
    testClassSelect.addEventListener('change', function () {
      const selectedClass = this.value.trim();
      if (selectedClass === '11' || selectedClass === '12') {
        alert(`📢 सूचना:\n\nकक्षा ${selectedClass}वीं का टेस्ट मॉड्यूल अभी तैयार हो रहा है!\nबहुत जल्द लाइव होगा। तब तक आप 10वीं का संपूर्ण अभ्यास कर सकते हैं।`);
        this.value = '10';
        if (typeof updateSubjects === 'function') updateSubjects();
      }
    });
  }

  // केवल चुने हुए विषय की ही JSON फाइल उठाना
  function getTargetJsonFile() {
    const cls = testClassSelect ? testClassSelect.value.trim() : "10";
    if (cls !== "10") return "CLASS_NOT_READY";

    let checkStr = "";
    if (testSubjectSelect && testSubjectSelect.selectedIndex >= 0) {
      const opt = testSubjectSelect.options[testSubjectSelect.selectedIndex];
      checkStr = `${opt.value || ""} ${opt.text || ""} ${opt.getAttribute('data-sylid') || ""}`.toLowerCase();
    }

    if (checkStr.includes('math') || checkStr.includes('गणित')) return '10-math.json';
    if (checkStr.includes('chem') || checkStr.includes('रसायन')) return '10-chemistry.json';
    if (checkStr.includes('bio') || checkStr.includes('जीव')) return '10-biology.json';
    if (checkStr.includes('sans') || checkStr.includes('संस्कृत')) return '10-sanskrit.json';
    if (checkStr.includes('sst') || checkStr.includes('सामाजिक') || checkStr.includes('इतिहास') || checkStr.includes('भूगोल') || checkStr.includes('नागरिक') || checkStr.includes('अर्थशास्त्र')) return '10-sst.json';
    return '10-physics.json';
  }

  // फुल सिलेबस चेक
  function isFullSyllabusSelected() {
    if (!testChapterSelect) return true;
    const val = (testChapterSelect.value || "").trim().toLowerCase();
    const text = testChapterSelect.selectedIndex >= 0 ? (testChapterSelect.options[testChapterSelect.selectedIndex].text || "").trim().toLowerCase() : "";
    
    if (val === 'all' || val === '' || val === '0' || text.includes('संपूर्ण') || text.includes('फुल') || text.includes('सभी')) {
      return true;
    }
    return false;
  }

  // प्रश्न लोड करना
  async function loadSelectedQuestions() {
    const jsonFile = getTargetJsonFile();
    if (jsonFile === "CLASS_NOT_READY") {
      alert("कक्षा 11वीं-12वीं का टेस्ट अभी तैयार हो रहा है!");
      return false;
    }

    const pathsToTry = [
      `data/${jsonFile}`,
      `./data/${jsonFile}`,
      `/nischaydesk/data/${jsonFile}`,
      `https://nischaydesk.github.io/nischaydesk/data/${jsonFile}`
    ];

    let rawData = null;
    for (const p of pathsToTry) {
      try {
        const res = await fetch(`${p}?t=${Date.now()}`);
        if (res.ok) {
          rawData = await res.json();
          break;
        }
      } catch (e) {}
    }

    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
      alert(`⚠️ प्रश्न बैंक डेटा लोड नहीं हो सका!\nकृपया इंटरनेट कनेक्शन जांचें।`);
      return false;
    }

    const allQs = rawData.map(item => ({
      chapter: parseInt(item.chapter) || 1,
      q: item.q || item.question || 'प्रश्न लोड नहीं हुआ',
      options: item.options || [],
      correct: (item.correct !== undefined) ? item.correct : (item.correctIndex !== undefined ? item.correctIndex : 0),
      exp: item.exp || item.explanation || 'व्याख्या उपलब्ध नहीं है।'
    }));

    const isFull = isFullSyllabusSelected();

    if (isFull) {
      currentQuestions = [...allQs];
    } else {
      const val = testChapterSelect.value;
      const text = testChapterSelect.options[testChapterSelect.selectedIndex].text;
      const match = (val + " " + text).match(/\d+/);
      const targetCh = match ? parseInt(match[0]) : 1;

      currentQuestions = allQs.filter(q => q.chapter === targetCh);
      if (currentQuestions.length === 0) {
        currentQuestions = allQs;
      }
    }

    // प्रश्नों को रैंडमाइज़ करना
    currentQuestions.sort(() => Math.random() - 0.5);

    // चैप्टर-वाइज में अधिकतम 50 प्रश्न
    if (!isFull && currentQuestions.length > 50) {
      currentQuestions = currentQuestions.slice(0, 50);
    }

    return true;
  }

  // 2. स्टार्ट बटन और टाइमर
  if (startExamBtn) {
    startExamBtn.addEventListener('click', async function () {
      const cls = testClassSelect ? testClassSelect.value.trim() : "10";
      if (cls === '11' || cls === '12') {
        alert(`📢 सूचना:\n\nकक्षा ${cls}वीं का टेस्ट अभी उपलब्ध नहीं है!`);
        return;
      }

      startExamBtn.disabled = true;
      startExamBtn.innerText = "लोड हो रहा है...";

      const isSuccess = await loadSelectedQuestions();

      startExamBtn.disabled = false;
      startExamBtn.innerText = "⚡ टेस्ट शुरू करें (Start Exam)";

      if (!isSuccess) return;

      userResponses = {};
      currentQIndex = 0;

      const isFull = isFullSyllabusSelected();
      // फुल सिलेबस: 60 मिनट (3600s), चैप्टर वाइज: 30 मिनट (1800s)
      timeRemaining = isFull ? (60 * 60) : (30 * 60);
      totalTestDuration = timeRemaining;

      if (testLobbyScreen) testLobbyScreen.classList.remove('active');
      if (testResultScreen) testResultScreen.classList.remove('active');
      if (testRunningScreen) testRunningScreen.classList.add('active');

      const subTxt = testSubjectSelect && testSubjectSelect.selectedIndex >= 0 ? testSubjectSelect.options[testSubjectSelect.selectedIndex].text : "विषय";
      if (liveExamBadge) liveExamBadge.innerText = `Class ${cls}th • ${subTxt.split(' ')[0]} • ${isFull ? 'फुल सिलेबस (60m)' : 'चैप्टर टेस्ट (30m)'}`;

      startTimer();
      renderPalette();
      renderQuestion(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // 3. सवाल व विकल्प रेंडरिंग
  function renderQuestion(index) {
    if (index < 0 || index >= currentQuestions.length) return;
    currentQIndex = index;
    const qData = currentQuestions[index];

    if (displayQNumber) displayQNumber.innerText = `Q.${index + 1}`;
    if (liveQuestionCounter) liveQuestionCounter.innerText = `प्रश्न ${index + 1} / ${currentQuestions.length}`;
    if (displayQText) displayQText.innerText = qData.q;

    if (prevQBtn) prevQBtn.disabled = (index === 0);
    if (nextQBtn) {
      nextQBtn.innerText = (index === currentQuestions.length - 1) ? "सबमिट करें ✓" : "अगला प्रश्न →";
    }

    if (displayOptionsGroup) {
      displayOptionsGroup.innerHTML = '';
      const letters = ['A', 'B', 'C', 'D'];

      qData.options.forEach((optText, optIdx) => {
        const isSelected = (userResponses[index] === optIdx);
        const optCard = document.createElement('div');
        optCard.className = `option-choice-item ${isSelected ? 'selected active' : ''}`;
        optCard.innerHTML = `
          <span class="option-letter">${letters[optIdx]}</span>
          <span class="option-label-text">${optText}</span>
        `;
        optCard.addEventListener('click', () => {
          userResponses[index] = optIdx;
          renderQuestion(index);
          updatePaletteStatus();
        });
        displayOptionsGroup.appendChild(optCard);
      });
    }
    updatePaletteStatus();
  }

  // 4. OMR पैलेट
  function renderPalette() {
    if (!paletteButtonsGrid) return;
    paletteButtonsGrid.innerHTML = '';
    currentQuestions.forEach((_, idx) => {
      const pBtn = document.createElement('button');
      pBtn.className = 'palette-btn';
      pBtn.id = `palette-btn-${idx}`;
      pBtn.innerText = idx + 1;
      pBtn.addEventListener('click', () => renderQuestion(idx));
      paletteButtonsGrid.appendChild(pBtn);
    });
    updatePaletteStatus();
  }

  function updatePaletteStatus() {
    currentQuestions.forEach((_, idx) => {
      const pBtn = document.getElementById(`palette-btn-${idx}`);
      if (!pBtn) return;
      pBtn.classList.remove('active', 'answered');
      if (idx === currentQIndex) pBtn.classList.add('active');
      if (userResponses[idx] !== undefined) pBtn.classList.add('answered');
    });
  }

  if (prevQBtn) {
    prevQBtn.addEventListener('click', () => {
      if (currentQIndex > 0) renderQuestion(currentQIndex - 1);
    });
  }

  if (nextQBtn) {
    nextQBtn.addEventListener('click', () => {
      if (currentQIndex < currentQuestions.length - 1) {
        renderQuestion(currentQIndex + 1);
      } else {
        if (confirm("क्या आप अपना टेस्ट समाप्त और सबमिट करना चाहते हैं?")) {
          finishAndSubmitExam();
        }
      }
    });
  }

  if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener('click', () => {
      delete userResponses[currentQIndex];
      renderQuestion(currentQIndex);
      updatePaletteStatus();
    });
  }

  if (submitExamEarlyBtn) {
    submitExamEarlyBtn.addEventListener('click', () => {
      if (confirm("क्या आप वाकई समय से पहले टेस्ट सबमिट करना चाहते हैं?")) {
        finishAndSubmitExam();
      }
    });
  }

  // 5. टाइमर इंजन
  function startTimer() {
    clearInterval(timerInterval);
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      timeRemaining--;
      updateTimerDisplay();
      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        alert("परीक्षा का समय समाप्त हो गया है! आपका टेस्ट स्वतः सबमिट किया जा रहा है।");
        finishAndSubmitExam();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    if (timerDigits) {
      timerDigits.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      const timerBox = document.getElementById('examTimerBox');
      if (timerBox) {
        if (timeRemaining <= 180) timerBox.classList.add('timer-warning');
        else timerBox.classList.remove('timer-warning');
      }
    }
  }

  // 6. रिजल्ट और लीडरबोर्ड सिंक
  function finishAndSubmitExam() {
    clearInterval(timerInterval);
    let correctCount = 0, wrongCount = 0;

    currentQuestions.forEach((q, idx) => {
      const userAns = userResponses[idx];
      if (userAns !== undefined) {
        if (userAns === q.correct) correctCount++;
        else wrongCount++;
      }
    });

    const totalQuestions = currentQuestions.length;
    const totalScore = (correctCount * 4) - (wrongCount * 1);
    const maxScore = totalQuestions * 4;
    const accuracyVal = Math.round((correctCount / (correctCount + wrongCount || 1)) * 100);
    const timeTakenSec = Math.max(1, totalTestDuration - timeRemaining);

    localStorage.setItem('nischay_last_test_score', `${totalScore} / ${maxScore}`);
    localStorage.setItem('nischay_last_test_accuracy', `${accuracyVal}%`);

    if (resTotalMarks) resTotalMarks.innerText = `${totalScore} / ${maxScore}`;
    if (resAccuracy) resAccuracy.innerText = `${accuracyVal}%`;
    if (resCorrectCount) resCorrectCount.innerText = correctCount;
    if (resWrongCount) resWrongCount.innerText = wrongCount;

    if (solutionsAccordionList) {
      solutionsAccordionList.innerHTML = '';
      const letters = ['A', 'B', 'C', 'D'];
      currentQuestions.forEach((q, idx) => {
        const userAns = userResponses[idx];
        const isCorrect = (userAns === q.correct);
        const solBox = document.createElement('div');
        solBox.className = 'sol-item';
        solBox.innerHTML = `
          <div class="sol-q-title">Q.${idx + 1}: ${q.q}</div>
          <div class="sol-ans-row ${isCorrect ? 'correct' : 'wrong'}">
            ${userAns !== undefined ? `आपका उत्तर: (${letters[userAns]})${q.options[userAns]}` : 'आपने यह प्रश्न छोड़ दिया था'}
          </div>
          <div style="font-size:0.84rem; color:var(--success); font-weight:700; margin-bottom:4px;">
            सटीक उत्तर: (${letters[q.correct]}) ${q.options[q.correct]}
          </div>
          <div class="sol-explanation"><strong>व्याख्या:</strong> ${q.exp}</div>
        `;
        solutionsAccordionList.appendChild(solBox);
      });
    }

    // 🏆 टॉप 50 लीडरबोर्ड कॉल
    syncAndDisplayLeaderboard(totalScore, maxScore, accuracyVal, timeTakenSec);

    if (testRunningScreen) testRunningScreen.classList.remove('active');
    if (testResultScreen) testResultScreen.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 🏆 सुरक्षित टॉप 50 लीडरबोर्ड (No-Crash Bulletproof)
  async function syncAndDisplayLeaderboard(score, maxMarks, accuracy, timeTakenSec) {
    let boardContainer = document.getElementById('leaderboardTop50Box');
    
    if (!boardContainer && testResultScreen) {
      boardContainer = document.createElement('div');
      boardContainer.id = 'leaderboardTop50Box';
      boardContainer.style.cssText = "margin-top: 24px; background: #0b1329; border: 1.5px solid #0284c7; border-radius: 14px; padding: 18px; color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.4);";
      testResultScreen.appendChild(boardContainer);
    }

    if (!boardContainer) return;

    boardContainer.innerHTML = `
      <div style="text-align:center; padding: 16px;">
        <h3 style="color:#38bdf8; font-size:1.15rem; margin-bottom:6px;">🏆 टॉप 50 मेधावी छात्र (Live Leaderboard)</h3>
        <p style="font-size:0.82rem; color:#94a3b8;">रैंकिंग लोड हो रही है...</p>
      </div>
    `;

    const subName = testSubjectSelect && testSubjectSelect.selectedIndex >= 0 ? testSubjectSelect.options[testSubjectSelect.selectedIndex].text.split(' ')[0] : "विषय";
    const testId = `${getTargetJsonFile()}_${isFullSyllabusSelected() ? 'full' : 'ch'}`;

    try {
      const db = (window.NischayConfig && window.NischayConfig.dbInstance) || (window.firebase && firebase.firestore && firebase.firestore());
      
      if (!db) {
        boardContainer.innerHTML = `<p style="text-align:center; color:#94a3b8; font-size:0.85rem; padding: 12px;">डेटाबेस कनेक्ट नहीं हो सका।</p>`;
        return;
      }

      // ऑथेंटिकेशन चेक
      let currentUser = null;
      if (window.firebase && firebase.auth) {
        currentUser = firebase.auth().currentUser;
      }

      // स्कोर Firestore में जोड़ना
      if (currentUser) {
        const studentName = currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : "छात्र");
        await db.collection("chapter_test_scores").add({
          uid: currentUser.uid,
          userName: studentName,
          userPhoto: currentUser.photoURL || "",
          testId: testId,
          subject: subName,
          score: Number(score),
          maxMarks: Number(maxMarks),
          accuracy: Number(accuracy),
          timeTakenSec: Number(timeTakenSec),
          submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(e => console.warn("Score save:", e));
      }

      // केवल testId से सीधे 100 रिकॉर्ड्स लाना (बिना इंडेक्स एरर के)
      const snap = await db.collection("chapter_test_scores")
        .where("testId", "==", testId)
        .limit(100)
        .get();

      if (snap.empty) {
        boardContainer.innerHTML = `
          <h3 style="color:#38bdf8; font-size:1.15rem; text-align:center; margin-bottom:6px;">🏆 टॉप 50 मेधावी छात्र (${subName})</h3>
          <p style="text-align:center; color:#94a3b8; font-size:0.85rem; padding: 14px;">आप इस टेस्ट के पहले प्रतिभागी हैं! बहुत शानदार प्रदर्शन। 🎯</p>
        `;
        return;
      }

      let students = [];
      snap.forEach(doc => {
        students.push(doc.data());
      });

      // ब्राउज़र में सॉर्टिंग: सबसे ज्यादा स्कोर ऊपर, बराबर होने पर कम समय वाला ऊपर
      students.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return (a.timeTakenSec || 0) - (b.timeTakenSec || 0);
      });

      students = students.slice(0, 50);

      let rankHtml = `
        <h3 style="color:#38bdf8; font-size:1.2rem; text-align:center; margin-bottom:14px; font-weight:800;">🏆 टॉप 50 मेधावी छात्र (${subName})</h3>
        <div style="max-height: 400px; overflow-y: auto; border: 1px solid #1e293b; border-radius: 8px;">
          <table style="width:100%; border-collapse:collapse; font-size:0.84rem; text-align:left;">
            <thead>
              <tr style="background:#1e293b; color:#94a3b8; border-bottom:1px solid #334155;">
                <th style="padding:10px; width:15%;">रैंक</th>
                <th style="padding:10px; width:45%;">छात्र</th>
                <th style="padding:10px; width:20%;">स्कोर</th>
                <th style="padding:10px; width:20%;">समय</th>
              </tr>
            </thead>
            <tbody>
      `;

      students.forEach((d, idx) => {
        const currentRank = idx + 1;
        let rankBadge = `${currentRank}`;
        if (currentRank === 1) rankBadge = "🥇 1";
        else if (currentRank === 2) rankBadge = "🥈 2";
        else if (currentRank === 3) rankBadge = "🥉 3";

        const mins = Math.floor((d.timeTakenSec || 0) / 60);
        const secs = (d.timeTakenSec || 0) % 60;
        const timeStr = `${mins}m ${secs}s`;

        rankHtml += `
          <tr style="border-bottom:1px solid rgba(255,255,255,0.06); background:${currentRank % 2 === 0 ? 'rgba(30, 41, 59, 0.45)' : 'transparent'};">
            <td style="padding:9px 10px; font-weight:800; color:${currentRank <= 3 ? '#fbbf24' : '#94a3b8'};">${rankBadge}</td>
            <td style="padding:9px 10px; font-weight:700; color:#fff;">${d.userName || 'छात्र'}</td>
            <td style="padding:9px 10px; font-weight:800; color:#22c55e;">${d.score}</td>
            <td style="padding:9px 10px; color:#cbd5e1;">${timeStr}</td>
          </tr>
        `;
      });

      rankHtml += `</tbody></table></div>`;

      if (!currentUser) {
        rankHtml += `<p style="text-align:center; font-size:0.75rem; color:#f59e0b; margin-top:10px;">💡 अपना स्कोर इस लिस्ट में जोड़ने के लिए ऊपर Google से लॉगिन करें।</p>`;
      }

      boardContainer.innerHTML = rankHtml;

    } catch (err) {
      console.error("Leaderboard Error:", err);
      boardContainer.innerHTML = `
        <h3 style="color:#38bdf8; font-size:1.1rem; text-align:center;">🏆 टॉप 50 मेधावी छात्र</h3>
        <p style="text-align:center; color:#f87171; font-size:0.8rem; padding: 10px;">लोड करने में समस्या: ${err.message}</p>
      `;
    }
  }

  if (restartTestBtn) {
    restartTestBtn.addEventListener('click', () => {
      if (testResultScreen) testResultScreen.classList.remove('active');
      if (testLobbyScreen) testLobbyScreen.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
});
