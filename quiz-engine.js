/* ==========================================================================
   NischayDesk Chapter-Wise Real-Time Test Simulation Engine (Master Fix v5.1)
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

  // सभी विषयों की अचूक मैपिंग (Math, Chem, Bio, Sanskrit, SST, Physics)
  function getTargetJsonFile() {
    const cls = testClassSelect ? testClassSelect.value.trim() : "10";

    if (cls !== "10") {
      return "CLASS_NOT_READY";
    }

    let subVal = "";
    let subText = "";
    let sylId = "";

    if (testSubjectSelect && testSubjectSelect.selectedIndex >= 0) {
      const opt = testSubjectSelect.options[testSubjectSelect.selectedIndex];
      subVal = (opt.value || "").toLowerCase().trim();
      subText = (opt.text || "").toLowerCase().trim();
      sylId = (opt.getAttribute('data-sylid') || "").toLowerCase().trim();
    }

    const checkStr = `${subVal} ${subText} ${sylId}`;

    if (checkStr.includes('math') || checkStr.includes('गणित')) {
      return '10-math.json';
    }
    if (checkStr.includes('chem') || checkStr.includes('रसायन')) {
      return '10-chemistry.json';
    }
    if (checkStr.includes('bio') || checkStr.includes('जीव')) {
      return '10-biology.json';
    }
    if (checkStr.includes('sans') || checkStr.includes('संस्कृत')) {
      return '10-sanskrit.json';
    }
    if (checkStr.includes('sst') || checkStr.includes('सामाजिक') || checkStr.includes('इतिहास') || checkStr.includes('भूगोल') || checkStr.includes('नागरिक') || checkStr.includes('अर्थशास्त्र')) {
      return '10-sst.json';
    }
    if (checkStr.includes('phy') || checkStr.includes('भौतिकी')) {
      return '10-physics.json';
    }

    return '10-physics.json';
  }

  async function loadSelectedQuestions() {
    const jsonFile = getTargetJsonFile();
    const chapterVal = testChapterSelect ? testChapterSelect.value : "all";

    if (jsonFile === "CLASS_NOT_READY") {
      currentQuestions = [
        {
          chapter: 1,
          q: "🚀 कक्षा 11वीं और 12वीं का प्रश्न बैंक अभी तैयार किया जा रहा है! यह सेक्शन बहुत जल्द लाइव होगा। तब तक आप क्लास 10वीं के सभी 6 विषयों का टेस्ट दे सकते हैं।",
          options: ["ठीक है, समझ गया", "क्लास 10वीं का टेस्ट दें", "होम पेज पर जाएं", "बाद में आऊंगा"],
          correct: 0,
          exp: "11वीं-12वीं का पूरा सिलेबस जल्द अपलोड किया जाएगा।"
        }
      ];
      return;
    }

    // GitHub Pages और लोकल दोनों के लिए सभी सटीक पाथ्स
    const pathsToTry = [
      `data/${jsonFile}`,
      `./data/${jsonFile}`,
      `/nischaydesk/data/${jsonFile}`,
      `${window.location.origin}/nischaydesk/data/${jsonFile}`
    ];

    let rawData = null;
    let fetchErrorDetail = "";

    for (const p of pathsToTry) {
      try {
        const res = await fetch(`${p}?t=${Date.now()}`);
        if (res.ok) {
          try {
            rawData = await res.json();
            break;
          } catch (jsonErr) {
            fetchErrorDetail = `फ़ाइल मिल गई लेकिन JSON में Syntax Error है (${jsonErr.message})। फ़ाइल में // कमेंट्स या गलत कॉमा चेक करें!`;
            break;
          }
        } else {
          fetchErrorDetail = `फ़ाइल नहीं मिली (Status: ${res.status})`;
        }
      } catch (networkErr) {
        fetchErrorDetail = networkErr.message;
      }
    }

    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
      alert(`⚠️ '${jsonFile}' लोड नहीं हो सकी!\nवजह: ${fetchErrorDetail}`);
      currentQuestions = [
        {
          chapter: 1,
          q: `डेमो प्रश्न: '${jsonFile}' लोड नहीं हो पाई।`,
          options: ["ऑप्शन A", "ऑप्शन B", "ऑप्शन C", "ऑप्शन D"],
          correct: 0,
          exp: "फ़ाइल का सिंटैक्स या पाथ चेक करें।"
        }
      ];
      return;
    }

    // डेटा नॉर्मलाइज़ेशन
    const allQs = rawData.map(item => ({
      chapter: parseInt(item.chapter) || 1,
      q: item.q || item.question || 'प्रश्न उपलब्ध नहीं है',
      options: item.options || [],
      correct: (item.correct !== undefined) ? item.correct : (item.correctIndex !== undefined ? item.correctIndex : 0),
      exp: item.exp || item.explanation || 'व्याख्या शीघ्र उपलब्ध होगी।'
    }));

    // अध्याय फ़िल्टरिंग
    const chStr = String(chapterVal).toLowerCase();
    if (chStr === 'all' || chStr.includes('संपूर्ण') || chStr.includes('फुल')) {
      currentQuestions = allQs;
    } else {
      const match = chStr.match(/\d+/);
      const targetCh = match ? parseInt(match[0]) : null;

      if (targetCh) {
        currentQuestions = allQs.filter(q => q.chapter === targetCh);
      } else {
        currentQuestions = allQs;
      }
    }

    if (currentQuestions.length === 0) {
      currentQuestions = allQs;
    }

    currentQuestions.sort(() => Math.random() - 0.5);
  }

  // 2. Start Exam Trigger
  if (startExamBtn) {
    startExamBtn.addEventListener('click', async function () {
      startExamBtn.disabled = true;
      startExamBtn.innerText = "लोड हो रहा है...";

      await loadSelectedQuestions();

      startExamBtn.disabled = false;
      startExamBtn.innerText = "⚡ टेस्ट शुरू करें (Start Exam)";

      userResponses = {};
      currentQIndex = 0;
      timeRemaining = 900;

      if (testLobbyScreen) testLobbyScreen.classList.remove('active');
      if (testResultScreen) testResultScreen.classList.remove('active');
      if (testRunningScreen) testRunningScreen.classList.add('active');

      const cls = testClassSelect ? testClassSelect.value : "10";
      const subTxt = testSubjectSelect && testSubjectSelect.selectedIndex >= 0 ? testSubjectSelect.options[testSubjectSelect.selectedIndex].text : "विषय";
      if (liveExamBadge) liveExamBadge.innerText = `Class ${cls}th • ${subTxt.split(' ')[0]}`;

      startTimer();
      renderPalette();
      renderQuestion(0);
    });
  }

  // 3. Render Question
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

  // 4. Palette Logic
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

  // 5. Controls
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

  // 6. Timer
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

  // 7. Results
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
