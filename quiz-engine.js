/* ==========================================================================
   NischayDesk Chapter-Wise Real-Time Test Simulation Engine (v4.3 Debug Edition)
   Architected by: Prince Kumar
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  const testLobbyScreen = document.getElementById('testLobbyScreen');
  const testRunningScreen = document.getElementById('testRunningScreen');
  const testResultScreen = document.getElementById('testResultScreen');

  const testClassSelect = document.getElementById('testClassSelect');
  const testSubjectSelect = document.getElementById('testSubjectSelect');
  const testChapterSelect = document.getElementById('testChapterSelect');
  const testPatternSelect = document.getElementById('testPatternSelect');
  const startExamBtn = document.getElementById('startExamBtn');

  const liveExamBadge = document.getElementById('liveExamBadge');
  const liveQuestionCounter = document.getElementById('liveQuestionCounter');
  const examTimerBox = document.getElementById('examTimerBox');
  const timerDigits = document.getElementById('timerDigits');
  const submitExamEarlyBtn = document.getElementById('submitExamEarlyBtn');

  const displayQNumber = document.getElementById('displayQNumber');
  const displayQText = document.getElementById('displayQText');
  const displayOptionsGroup = document.getElementById('displayOptionsGroup');
  const prevQBtn = document.getElementById('prevQBtn');
  const nextQBtn = document.getElementById('nextQBtn');
  const clearSelectionBtn = document.getElementById('clearSelectionBtn');
  const paletteButtonsGrid = document.getElementById('paletteButtonsGrid');

  const resultSubMeta = document.getElementById('resultSubMeta');
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

  // विषय की पहचान को शत-प्रतिशत सटीक बनाने वाला फंक्शन
  function getTargetJsonFile() {
    let val = testSubjectSelect ? testSubjectSelect.value.toLowerCase() : "";
    let txt = "";
    if (testSubjectSelect && testSubjectSelect.selectedIndex >= 0) {
      txt = testSubjectSelect.options[testSubjectSelect.selectedIndex].text.toLowerCase();
    }
    let combined = val + " " + txt;

    if (combined.includes('phy') || combined.includes('भौतिकी')) return '10-physics.json';
    if (combined.includes('chem') || combined.includes('रसायन')) return '10-chemistry.json';
    if (combined.includes('bio') || combined.includes('जीव')) return '10-biology.json';
    if (combined.includes('math') || combined.includes('गणित')) return '10-math.json';
    if (combined.includes('sans') || combined.includes('संस्कृत')) return '10-sanskrit.json';
    if (combined.includes('sst') || combined.includes('इतिहास') || combined.includes('भूगोल') || combined.includes('सामाजिक') || combined.includes('नागरिक') || combined.includes('अर्थशास्त्र') || combined.includes('आपदा')) return '10-sst.json';

    return '10-physics.json'; // डिफ़ॉल्ट
  }

  async function loadSelectedQuestions() {
    const jsonFile = getTargetJsonFile();
    const chapterVal = testChapterSelect ? testChapterSelect.value : "all";
    
    // हम अलग-अलग पाथ ट्राई करेंगे ताकि 404 न आए
    const pathsToTry = [
      `./data/${jsonFile}`,
      `data/${jsonFile}`,
      `/nischaydesk/data/${jsonFile}`
    ];

    let rawData = null;
    let successPath = "";

    for (let p of pathsToTry) {
      try {
        let res = await fetch(`${p}?t=${Date.now()}`);
        if (res.ok) {
          rawData = await res.json();
          successPath = p;
          break;
        }
      } catch (err) {
        // اگلا پاتھ چیک کرے گا
      }
    }

    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
      alert(`⚠️ एरर: '${jsonFile}' फ़ाइल लोड नहीं हो पाई! कृपया जाँचें कि GitHub के data फ़ोल्डर में यह फ़ाइल मौजूद है या नहीं।`);
      currentQuestions = [
        {
          q: `डेमो प्रश्न: ${jsonFile} लोड नहीं हो पाई।`,
          options: ["ऑप्शन A", "ऑप्शन B", "ऑप्शन C", "ऑप्शन D"],
          correct: 0,
          exp: "फ़ाइल पाथ या JSON फॉर्मेट चेक करें।"
        }
      ];
      return;
    }

    // डेटा को सही फॉर्मेट में ढालना
    const allQs = rawData.map(item => ({
      chapter: parseInt(item.chapter) || 1,
      q: item.q || item.question || 'प्रश्न नहीं मिला',
      options: item.options || [],
      correct: (item.correct !== undefined) ? item.correct : (item.correctIndex !== undefined ? item.correctIndex : 0),
      exp: item.exp || item.explanation || 'व्याख्या उपलब्ध नहीं है।'
    }));

    // चैप्टर फ़िल्टर करना
    let chStr = String(chapterVal).toLowerCase();
    if (chStr === 'all' || chStr.includes('संपूर्ण') || chStr.includes('फुल')) {
      currentQuestions = allQs;
    } else {
      let match = chStr.match(/\d+/);
      let targetCh = match ? parseInt(match[0]) : null;

      if (targetCh) {
        currentQuestions = allQs.filter(q => q.chapter === targetCh);
      } else {
        currentQuestions = allQs;
      }
    }

    // अगर उस चैप्टर में एक भी सवाल न मिले
    if (currentQuestions.length === 0) {
      alert(`⚠️ सूचना: '${jsonFile}' में 'अध्याय ${targetCh}' के प्रश्न नहीं मिले! (कुल प्रश्न: ${allQs.length})`);
      currentQuestions = allQs; // पूरा विषय दिखा दो ताकि खाली न रहे
    }

    currentQuestions.sort(() => Math.random() - 0.5);
  }

  if (startExamBtn) {
    startExamBtn.addEventListener('click', async function () {
      startExamBtn.disabled = true;
      startExamBtn.innerText = "लोड हो रहा है...";

      await loadSelectedQuestions();

      startExamBtn.disabled = false;
      startExamBtn.innerText = "⚡ टेस्ट शुरू करें";

      userResponses = {};
      currentQIndex = 0;
      timeRemaining = 900;

      if (testLobbyScreen) testLobbyScreen.classList.remove('active');
      if (testResultScreen) testResultScreen.classList.remove('active');
      if (testRunningScreen) testRunningScreen.classList.add('active');

      const cls = testClassSelect ? testClassSelect.value : "10";
      let subTxt = testSubjectSelect && testSubjectSelect.selectedIndex >= 0 ? testSubjectSelect.options[testSubjectSelect.selectedIndex].text : "विषय";
      if (liveExamBadge) liveExamBadge.innerText = `Class ${cls}th • ${subTxt.split(' ')[0]}`;

      startTimer();
      renderPalette();
      renderQuestion(0);
    });
  }

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

  function finishAndSubmitExam() {
    clearInterval(timerInterval);
    let correctCount = 0, wrongCount = 0;

    currentQuestions.forEach((q, idx) => {
      let userAns = userResponses[idx];
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
        let userAns = userResponses[idx];
        let solBox = document.createElement('div');
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
