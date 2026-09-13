/* ==========================================================================
   NischayDesk Chapter-Wise Real-Time Test Simulation Engine (v4.0 Dynamic JSON)
   Supports: Dynamic Fetch from data/*.json, Strict Chapter Filter & Negative Marking
   Architected by: Prince Kumar
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  // Screen Panels
  const testLobbyScreen = document.getElementById('testLobbyScreen');
  const testRunningScreen = document.getElementById('testRunningScreen');
  const testResultScreen = document.getElementById('testResultScreen');

  // Lobby Inputs
  const testClassSelect = document.getElementById('testClassSelect');
  const testSubjectSelect = document.getElementById('testSubjectSelect');
  const testChapterSelect = document.getElementById('testChapterSelect');
  const testPatternSelect = document.getElementById('testPatternSelect');
  const startExamBtn = document.getElementById('startExamBtn');

  // Running Exam Elements
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

  // Result Elements
  const resultSubMeta = document.getElementById('resultSubMeta');
  const resTotalMarks = document.getElementById('resTotalMarks');
  const resAccuracy = document.getElementById('resAccuracy');
  const resCorrectCount = document.getElementById('resCorrectCount');
  const resWrongCount = document.getElementById('resWrongCount');
  const solutionsAccordionList = document.getElementById('solutionsAccordionList');
  const restartTestBtn = document.getElementById('restartTestBtn');

  // Internal State
  let currentQuestions = [];
  let currentQIndex = 0;
  let userResponses = {}; // { qIndex: selectedOptionIndex }
  let timerInterval = null;
  let timeRemaining = 900; // in seconds

  // Helper: विषय के अनुसार सही JSON फाइल का नाम तय करना
  function resolveJsonFileName(sClass, sSubject) {
    let sub = sSubject.toLowerCase();
    
    // अगर विषय में पहले से क्लास प्रीफिक्स (उदा. 10-physics) है
    if (sub.startsWith('10-') || sub.startsWith('11-') || sub.startsWith('12-')) {
      if (sub === '10-science-phy') return '10-physics.json';
      if (sub === '10-science-chem') return '10-chemistry.json';
      if (sub === '10-science-bio') return '10-biology.json';
      if (['10-history', '10-geography', '10-civics', '10-economics', '10-disaster'].includes(sub)) {
        return '10-sst.json';
      }
      return `${sub}.json`;
    }

    // सामान्य ड्रॉपडाउन वैल्यूज
    if (sClass === '10') {
      if (sub.includes('phy') || sub.includes('भौतिकी')) return '10-physics.json';
      if (sub.includes('chem') || sub.includes('रसायन')) return '10-chemistry.json';
      if (sub.includes('bio') || sub.includes('जीव')) return '10-biology.json';
      if (sub.includes('math') || sub.includes('गणित')) return '10-math.json';
      if (sub.includes('sans') || sub.includes('संस्कृत')) return '10-sanskrit.json';
      if (sub.includes('sst') || sub.includes('इतिहास') || sub.includes('भूगोल') || sub.includes('सामाजिक')) return '10-sst.json';
    }

    return `${sClass}-${sub}.json`;
  }

  // 1. Dynamic Question Loader with Chapter Filter
  async function loadSelectedQuestions() {
    const sClass = testClassSelect ? testClassSelect.value : "10";
    const sSubject = testSubjectSelect ? testSubjectSelect.value : "physics";
    const sChapter = testChapterSelect ? testChapterSelect.value : "all";

    const jsonFile = resolveJsonFileName(sClass, sSubject);

    try {
      const response = await fetch(`data/${jsonFile}?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`फ़ाइल लोड नहीं हो सकी: data/${jsonFile}`);
      }

      const rawQuestions = await response.json();

      // डेटा नॉर्मलाइज़ेशन (q vs question, correct vs correctIndex)
      const normalizedList = rawQuestions.map(item => ({
        id: item.id || '',
        chapter: parseInt(item.chapter) || 1,
        q: item.q || item.question || 'प्रश्न अनुपलब्ध',
        options: item.options || [],
        correct: (item.correct !== undefined) ? item.correct : (item.correctIndex !== undefined ? item.correctIndex : 0),
        exp: item.exp || item.explanation || 'इस प्रश्न की व्याख्या शीघ्र जोड़ी जाएगी।'
      }));

      // स्ट्रिक्ट चैप्टर फ़िल्टरिंग
      if (sChapter === 'all' || sChapter.includes('संपूर्ण') || sChapter.includes('फुल')) {
        currentQuestions = normalizedList;
      } else {
        // अध्याय संख्या निकालना (जैसे 'ch1', '1', या 'अध्याय 1')
        const chMatch = String(sChapter).match(/\d+/);
        const targetChapter = chMatch ? parseInt(chMatch[0]) : null;

        if (targetChapter) {
          currentQuestions = normalizedList.filter(item => item.chapter === targetChapter);
        } else {
          currentQuestions = normalizedList;
        }
      }

    } catch (err) {
      console.warn("JSON fetch error, fallback active:", err);
      currentQuestions = [];
    }

    // अगर उस चैप्टर में अभी कोई सवाल न हो
    if (currentQuestions.length === 0) {
      currentQuestions = [
        {
          q: `चयनित अध्याय के प्रश्न बैंक को अपडेट किया जा रहा है। टेस्ट इंजन जाँचने हेतु डेमो प्रश्न: प्रकाश का निर्वात में वेग कितना होता है?`,
          options: ["3 × 10⁸ m/s", "3 × 10⁶ m/s", "3 × 10⁵ km/s", "A और C दोनों"],
          correct: 3,
          exp: "प्रकाश का वेग निर्वात में 3 × 10⁸ मीटर/सेकंड अथवा 3 × 10⁵ किमी/सेकंड होता है।"
        }
      ];
    } else {
      // प्रश्नों को शफल (Shuffle) करना
      currentQuestions.sort(() => Math.random() - 0.5);
    }
  }

  // 2. Start Exam Trigger
  if (startExamBtn) {
    startExamBtn.addEventListener('click', async function () {
      startExamBtn.disabled = true;
      startExamBtn.innerText = "प्रश्न लोड हो रहे हैं...";

      await loadSelectedQuestions();

      startExamBtn.disabled = false;
      startExamBtn.innerText = "⚡ टेस्ट शुरू करें";

      userResponses = {};
      currentQIndex = 0;

      // Timer duration setting
      const pattern = testPatternSelect ? testPatternSelect.value : "speed";
      timeRemaining = (pattern === "board") ? 1800 : 900; // 30 min vs 15 min

      // Switch Panels
      if (testLobbyScreen) testLobbyScreen.classList.remove('active');
      if (testResultScreen) testResultScreen.classList.remove('active');
      if (testRunningScreen) testRunningScreen.classList.add('active');

      const cls = testClassSelect ? testClassSelect.value : "10";
      const subName = testSubjectSelect ? testSubjectSelect.options[testSubjectSelect.selectedIndex].text : "विषय";
      if (liveExamBadge) liveExamBadge.innerText = `Class ${cls}th • ${subName.split(' ')[0]}`;

      startTimer();
      renderPalette();
      renderQuestion(0);
    });
  }

  // 3. Render Question on Workspace Stage
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

    // Render Options
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

  // 4. Render NTA / BSEB Style OMR Palette
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

  // 5. Question Stage Actions
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

  // 6. Live Timer
  function startTimer() {
    clearInterval(timerInterval);
    updateTimerDisplay();

    timerInterval = setInterval(() => {
      timeRemaining--;
      updateTimerDisplay();

      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        alert("समय समाप्त हो गया है! आपका टेस्ट स्वतः सबमिट हो रहा है।");
        finishAndSubmitExam();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    if (timerDigits) timerDigits.innerText = formatted;

    if (examTimerBox) {
      if (timeRemaining <= 120) {
        examTimerBox.classList.add('timer-warning');
      } else {
        examTimerBox.classList.remove('timer-warning');
      }
    }
  }

  // 7. Finish Exam & Calculate Score (with -1.0 Negative Marking)
  function finishAndSubmitExam() {
    clearInterval(timerInterval);

    let correctCount = 0;
    let wrongCount = 0;
    let unattempted = 0;

    currentQuestions.forEach((q, idx) => {
      const userAns = userResponses[idx];
      if (userAns === undefined) {
        unattempted++;
      } else if (userAns === q.correct) {
        correctCount++;
      } else {
        wrongCount++;
      }
    });

    const totalQuestions = currentQuestions.length;
    // Marking Scheme: +4 for correct, -1 for wrong
    const totalScore = (correctCount * 4) - (wrongCount * 1);
    const maxMarks = totalQuestions * 4;
    const accuracyVal = (correctCount + wrongCount > 0)
      ? Math.round((correctCount / (correctCount + wrongCount)) * 100)
      : 0;

    // Update Result UI
    if (resTotalMarks) resTotalMarks.innerText = `${totalScore} / ${maxMarks}`;
    if (resAccuracy) resAccuracy.innerText = `${accuracyVal}%`;
    if (resCorrectCount) resCorrectCount.innerText = correctCount;
    if (resWrongCount) resWrongCount.innerText = wrongCount;

    if (resultSubMeta) {
      const cls = testClassSelect ? testClassSelect.value : "10";
      resultSubMeta.innerText = `कक्षा ${cls}वीं • कुल प्रश्न: ${totalQuestions} • हल किए: ${correctCount + wrongCount}`;
    }

    // Build Solutions Review Section
    if (solutionsAccordionList) {
      solutionsAccordionList.innerHTML = '';
      const letters = ['A', 'B', 'C', 'D'];

      currentQuestions.forEach((q, idx) => {
        const userAns = userResponses[idx];
        const isCorrect = (userAns === q.correct);
        const isAttempted = (userAns !== undefined);

        const solBox = document.createElement('div');
        solBox.className = 'sol-item';

        let statusText = '';
        if (!isAttempted) {
          statusText = `<span style="color:var(--text-muted); font-weight:700;">छोड़ा गया (Unattempted)</span>`;
        } else if (isCorrect) {
          statusText = `<span class="sol-ans-row correct">✓ सही उत्तर (+4 अंक)</span>`;
        } else {
          statusText = `<span class="sol-ans-row wrong">✗ गलत उत्तर (-1 अंक) • आपका उत्तर: (${letters[userAns]}) ${q.options[userAns]}</span>`;
        }

        solBox.innerHTML = `
          <div class="sol-q-title">Q.${idx + 1}: ${q.q}</div>
          <div style="margin-bottom: 6px;">${statusText}</div>
          <div style="font-size:0.84rem; color:var(--success); font-weight:700; margin-bottom:4px;">
            सटीक उत्तर: (${letters[q.correct]}) ${q.options[q.correct]}
          </div>
          <div class="sol-explanation">
            <strong>व्याख्या (Explanation):</strong> ${q.exp}
          </div>
        `;
        solutionsAccordionList.appendChild(solBox);
      });
    }

    // Switch to Result Screen
    if (testRunningScreen) testRunningScreen.classList.remove('active');
    if (testResultScreen) testResultScreen.classList.add('active');
  }

  // 8. Restart / Try Another Exam
  if (restartTestBtn) {
    restartTestBtn.addEventListener('click', () => {
      if (testResultScreen) testResultScreen.classList.remove('active');
      if (testLobbyScreen) testLobbyScreen.classList.add('active');
    });
  }
});
