/* ==========================================================================
   NischayDesk Real-Time Test Simulation Engine (Exact Logic Fix v6.3)
   Architected by: Prince Kumar
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

  // 1. डायरेक्ट होम बटन
  const headerBrand = document.querySelector('.header-brand, .brand, nav, header');
  if (headerBrand && !document.getElementById('quickHomeNavBtn')) {
    const homeBtn = document.createElement('a');
    homeBtn.id = 'quickHomeNavBtn';
    homeBtn.href = 'index.html';
    homeBtn.innerHTML = '🏠 होम';
    homeBtn.setAttribute('style', `
      margin-left: 10px;
      padding: 4px 10px;
      background: rgba(255, 255, 255, 0.15);
      color: inherit;
      text-decoration: none;
      font-size: 0.82rem;
      font-weight: 600;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      display: inline-flex;
      align-items: center;
    `);
    headerBrand.appendChild(homeBtn);
  }

  // 2. 11th और 12th चुनते ही अलर्ट
  if (testClassSelect) {
    testClassSelect.addEventListener('change', function () {
      const selectedClass = this.value.trim();
      if (selectedClass === '11' || selectedClass === '12') {
        alert(`📢 सूचना:\n\nकक्षा ${selectedClass}वीं का टेस्ट अभी उपलब्ध नहीं है!\nइस पर काम चल रहा है, जल्द ही लाइव होगा। तब तक आप 10वीं का टेस्ट दें।`);
        this.value = '10';
      }
    });
  }

  // केवल चुने हुए विषय की ही JSON फाइल उठाना (ताकि कोई दूसरा विषय मिक्स न हो)
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
      alert(`⚠️ '${jsonFile}' लोड नहीं हो सकी!\n${fetchError}`);
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
      // फुल सिलेबस: उसी विषय के सारे के सारे सवाल (जैसे फ़िज़िक्स के पूरे 100 सवाल)
      currentQuestions = [...allQs];
    } else {
      // चैप्टर वाइज: केवल चुने हुए चैप्टर के सवाल
      const val = testChapterSelect.value;
      const text = testChapterSelect.options[testChapterSelect.selectedIndex].text;
      const match = (val + " " + text).match(/\d+/);
      const targetCh = match ? parseInt(match[0]) : 1;

      currentQuestions = allQs.filter(q => q.chapter === targetCh);
      if (currentQuestions.length === 0) {
        currentQuestions = allQs;
      }
    }

    // प्रश्नों को शफल करना
    currentQuestions.sort(() => Math.random() - 0.5);

    // ★ नियम: सिर्फ चैप्टर वाइज में 20 प्रश्न होंगे, फुल सिलेबस में जितने भी हैं सारे (पूरे 100) आएँगे!
    if (!isFull && currentQuestions.length > 20) {
      currentQuestions = currentQuestions.slice(0, 20);
    }

    return true;
  }

  // 3. स्टार्ट बटन और टाइमर
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

      // टाइमर: फुल सिलेबस = 30 मिनट (1800s), चैप्टर वाइज = 15 मिनट (900s)
      const isFull = isFullSyllabusSelected();
      if (isFull) {
        timeRemaining = 30 * 60; // 30 मिनट
      } else {
        timeRemaining = 15 * 60; // 15 मिनट
      }

      if (testLobbyScreen) testLobbyScreen.classList.remove('active');
      if (testResultScreen) testResultScreen.classList.remove('active');
      if (testRunningScreen) testRunningScreen.classList.add('active');

      const subTxt = testSubjectSelect && testSubjectSelect.selectedIndex >= 0 ? testSubjectSelect.options[testSubjectSelect.selectedIndex].text : "विषय";
      if (liveExamBadge) liveExamBadge.innerText = `Class ${cls}th • ${subTxt.split(' ')[0]}`;

      startTimer();
      renderPalette();
      renderQuestion(0);
    });
  }

  // 4. सवाल दिखाना
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
        optCard.className = `option-choice-item ${isSelected ? 'selected' : ''}`;
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

  // 5. पैलेट
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

  // 6. टाइमर
  function startTimer() {
    clearInterval(timerInterval);
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      timeRemaining--;
      updateTimerDisplay();
      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        alert("समय समाप्त हो गया है!");
        finishAndSubmitExam();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    if (timerDigits) timerDigits.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // 7. रिजल्ट
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

    if (resTotalMarks) resTotalMarks.innerText = `${totalScore} / ${totalQuestions * 4}`;
    if (resAccuracy) resAccuracy.innerText = `${Math.round((correctCount / (correctCount + wrongCount || 1)) * 100)}%`;
    if (resCorrectCount) resCorrectCount.innerText = correctCount;
    if (resWrongCount) resWrongCount.innerText = wrongCount;

    if (solutionsAccordionList) {
      solutionsAccordionList.innerHTML = '';
      const letters = ['A', 'B', 'C', 'D'];
      currentQuestions.forEach((q, idx) => {
        const userAns = userResponses[idx];
        const solBox = document.createElement('div');
        solBox.className = 'sol-item';
        solBox.innerHTML = `
          <div class="sol-q-title">Q.${idx + 1}: ${q.q}</div>
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
  }

  if (restartTestBtn) {
    restartTestBtn.addEventListener('click', () => {
      if (testResultScreen) testResultScreen.classList.remove('active');
      if (testLobbyScreen) testLobbyScreen.classList.add('active');
    });
  }
});
