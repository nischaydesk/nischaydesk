/* ==========================================================================
   NischayDesk Real-Time Test Simulation Engine (v5.0 Ultimate Pro)
   Architected by: Prince Kumar (NischayDesk)
   Features: Robust JSON Fetch, Bulletproof Option Highlighting,
             Dashboard Score Sync, Negative Marking & Zero DOM Collision
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
  let timeRemaining = 900;

  // 1. 11th और 12th चुनते ही अलर्ट
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
    let fetchError = "";

    for (const p of pathsToTry) {
      try {
        const res = await fetch(`${p}?t=${Date.now()}`);
        if (res.ok) {
          rawData = await res.json();
          break;
        } else {
          fetchError = `Status: ${res.status}`;
        }
      } catch (e) {
        fetchError = e.message;
      }
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

    currentQuestions.sort(() => Math.random() - 0.5);

    if (!isFull && currentQuestions.length > 20) {
      currentQuestions = currentQuestions.slice(0, 20);
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
      timeRemaining = isFull ? (30 * 60) : (15 * 60);

      if (testLobbyScreen) testLobbyScreen.classList.remove('active');
      if (testResultScreen) testResultScreen.classList.remove('active');
      if (testRunningScreen) testRunningScreen.classList.add('active');

      const subTxt = testSubjectSelect && testSubjectSelect.selectedIndex >= 0 ? testSubjectSelect.options[testSubjectSelect.selectedIndex].text : "विषय";
      if (liveExamBadge) liveExamBadge.innerText = `Class ${cls}th • ${subTxt.split(' ')[0]}`;

      startTimer();
      renderPalette();
      renderQuestion(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // 3. सवाल व विकल्प रेंडरिंग (100% कंट्रास्ट और नो-झबना लॉजिक)
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

  // 4. NTA OMR पैलेट
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
        if (timeRemaining <= 120) timerBox.classList.add('timer-warning');
        else timerBox.classList.remove('timer-warning');
      }
    }
  }

  // 6. रिजल्ट व डैशबोर्ड सिंक
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

    // डैशबोर्ड के लिए स्कोर सुरक्षित करना
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

    if (testRunningScreen) testRunningScreen.classList.remove('active');
    if (testResultScreen) testResultScreen.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (restartTestBtn) {
    restartTestBtn.addEventListener('click', () => {
      if (testResultScreen) testResultScreen.classList.remove('active');
      if (testLobbyScreen) testLobbyScreen.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
});
