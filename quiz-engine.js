/* ==========================================================================
   NischayDesk Real-Time Test Simulation & Scoring Engine
   Architecture & Logic: Prince Kumar
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {

  // Screen Panels
  const testLobbyScreen = document.getElementById('testLobbyScreen');
  const testRunningScreen = document.getElementById('testRunningScreen');
  const testResultScreen = document.getElementById('testResultScreen');

  // Lobby Controls
  const startExamBtn = document.getElementById('startExamBtn');
  const testSubjectSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('testSubjectSelect'));
  const testPatternSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('testPatternSelect'));
  const testClassSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('testClassSelect'));

  // Live Exam Stage Elements
  const liveExamBadge = document.getElementById('liveExamBadge');
  const liveQuestionCounter = document.getElementById('liveQuestionCounter');
  const timerDigits = document.getElementById('timerDigits');
  const examTimerBox = document.getElementById('examTimerBox');
  const submitExamEarlyBtn = document.getElementById('submitExamEarlyBtn');

  const displayQNumber = document.getElementById('displayQNumber');
  const displayQText = document.getElementById('displayQText');
  const displayOptionsGroup = document.getElementById('displayOptionsGroup');
  const prevQBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById('prevQBtn'));
  const nextQBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById('nextQBtn'));
  const clearSelectionBtn = document.getElementById('clearSelectionBtn');
  const paletteButtonsGrid = document.getElementById('paletteButtonsGrid');

  // Result Elements
  const resTotalMarks = document.getElementById('resTotalMarks');
  const resAccuracy = document.getElementById('resAccuracy');
  const resCorrectCount = document.getElementById('resCorrectCount');
  const resWrongCount = document.getElementById('resWrongCount');
  const resultSubMeta = document.getElementById('resultSubMeta');
  const solutionsAccordionList = document.getElementById('solutionsAccordionList');
  const restartTestBtn = document.getElementById('restartTestBtn');

  // Guard: Only run if on test.html
  if (!startExamBtn || !testRunningScreen) return;

  // Exam State Container
  /** @type {Array<{id: string, question: string, options: string[], correctIndex: number, explanation: string}>} */
  let activeQuestions = [];
  /** @type {number[]} */
  let userResponses = []; // stores selected option index or -1
  let currentQuestionIndex = 0;
  let remainingSeconds = 600; // default 10 mins
  let timerInterval = null;
  let currentSubjectName = "";

  // 1. Initialize & Start Exam (JSON Loader Integrated)
  startExamBtn.addEventListener('click', async function () {
    const selectedSubject = testSubjectSelect ? testSubjectSelect.value : "physics";
    const selectedPattern = testPatternSelect ? testPatternSelect.value : "speed";
    const selectedClass = testClassSelect ? testClassSelect.value : "10";

    const fileName = `${selectedClass}-${selectedSubject}.json`;
    const jsonPath = `./data/${fileName}`;

    let rawBank = [];

    // 1. JSON फाइल से फेच करने का प्रयास
    try {
      const response = await fetch(jsonPath);
      if (response.ok) {
        rawBank = await response.json();
      }
    } catch (e) {
      console.log("JSON लोड नहीं हुआ, लोकल बैकअप चेक कर रहे हैं...");
    }

    // 2. अगर JSON न मिले तो syllabus-data.js से बैकअप डेटा उठाना
    if (rawBank.length === 0 && window.NischaySyllabus && window.NischaySyllabus.questionBank) {
      const classSubjectKey = `${selectedClass}-${selectedSubject}`;
      rawBank = window.NischaySyllabus.questionBank[classSubjectKey] || 
                window.NischaySyllabus.questionBank[selectedSubject] || [];
    }

    if (rawBank.length === 0) {
      alert(`कक्षा ${selectedClass} के ${selectedSubject.toUpperCase()} विषय के लिए प्रश्न जल्द ही जोड़े जा रहे हैं!`);
      return;
    }

    // Set Questions & Timer Duration
    activeQuestions = [...rawBank];
    userResponses = new Array(activeQuestions.length).fill(-1);
    currentQuestionIndex = 0;
    remainingSeconds = (selectedPattern === 'board') ? 1200 : (activeQuestions.length * 60);

    currentSubjectName = `Class ${selectedClass}th - ${selectedSubject.toUpperCase()}`;
    if (liveExamBadge) liveExamBadge.innerText = currentSubjectName;

    // Switch to Exam Screen
    testLobbyScreen.classList.remove('active');
    testResultScreen.classList.remove('active');
    testRunningScreen.classList.add('active');

    // Build Palette, Render First Question & Start Timer
    renderPaletteButtons();
    loadQuestion(0);
    startCountdownTimer();
  });

  // 2. Countdown Timer
  function startCountdownTimer() {
    clearInterval(timerInterval);
    updateTimerDisplay();

    timerInterval = setInterval(function () {
      remainingSeconds--;
      updateTimerDisplay();

      if (remainingSeconds <= 120 && examTimerBox) {
        examTimerBox.classList.add('timer-warning');
      }

      if (remainingSeconds <= 0) {
        clearInterval(timerInterval);
        alert("समय समाप्त हो गया है! आपका टेस्ट स्वतः सबमिट किया जा रहा है। ⏱️");
        finalizeAndEvaluateTest();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    if (!timerDigits) return;
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    timerDigits.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // 3. Render Question Palette (1, 2, 3...)
  function renderPaletteButtons() {
    if (!paletteButtonsGrid) return;
    paletteButtonsGrid.innerHTML = '';

    activeQuestions.forEach(function (_, idx) {
      const pBtn = document.createElement('button');
      pBtn.className = 'palette-btn';
      pBtn.innerText = String(idx + 1);
      pBtn.id = `palette_btn_${idx}`;
      pBtn.addEventListener('click', function () {
        loadQuestion(idx);
      });
      paletteButtonsGrid.appendChild(pBtn);
    });
  }

  // 4. Load & Display Question
  function loadQuestion(index) {
    if (index < 0 || index >= activeQuestions.length) return;
    currentQuestionIndex = index;

    const qData = activeQuestions[index];

    // Meta & Text
    if (displayQNumber) displayQNumber.innerText = `Q.${index + 1}`;
    if (displayQText) displayQText.innerText = qData.question;
    if (liveQuestionCounter) liveQuestionCounter.innerText = `प्रश्न ${index + 1} / ${activeQuestions.length}`;

    // Render Options
    if (displayOptionsGroup) {
      displayOptionsGroup.innerHTML = '';
      const letters = ['A', 'B', 'C', 'D'];

      qData.options.forEach(function (optText, optIdx) {
        const isSelected = userResponses[currentQuestionIndex] === optIdx;
        const optDiv = document.createElement('div');
        optDiv.className = `option-choice-item ${isSelected ? 'selected' : ''}`;
        optDiv.innerHTML = `
          <span class="option-letter">${letters[optIdx]}</span>
          <span class="option-label-text">${optText}</span>
        `;
        optDiv.addEventListener('click', function () {
          selectOption(optIdx);
        });
        displayOptionsGroup.appendChild(optDiv);
      });
    }

    // Prev / Next button states
    if (prevQBtn) prevQBtn.disabled = (currentQuestionIndex === 0);
    if (nextQBtn) {
      if (currentQuestionIndex === activeQuestions.length - 1) {
        nextQBtn.innerText = "समीक्षा / सबमिट ✓";
      } else {
        nextQBtn.innerText = "अगला प्रश्न →";
      }
    }

    // Highlight active in palette
    document.querySelectorAll('.palette-btn').forEach(function (b, i) {
      b.classList.remove('active');
      if (i === currentQuestionIndex) b.classList.add('active');
    });
  }

  // 5. Select & Clear Option Handler
  function selectOption(optionIndex) {
    userResponses[currentQuestionIndex] = optionIndex;
    loadQuestion(currentQuestionIndex);
    updatePaletteStatus(currentQuestionIndex, true);
  }

  if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener('click', function () {
      userResponses[currentQuestionIndex] = -1;
      loadQuestion(currentQuestionIndex);
      updatePaletteStatus(currentQuestionIndex, false);
    });
  }

  function updatePaletteStatus(index, isAnswered) {
    const pBtn = document.getElementById(`palette_btn_${index}`);
    if (!pBtn) return;
    if (isAnswered) {
      pBtn.classList.add('answered');
    } else {
      pBtn.classList.remove('answered');
    }
  }

  // Stage Navigation Buttons
  if (prevQBtn) {
    prevQBtn.addEventListener('click', function () {
      if (currentQuestionIndex > 0) loadQuestion(currentQuestionIndex - 1);
    });
  }

  if (nextQBtn) {
    nextQBtn.addEventListener('click', function () {
      if (currentQuestionIndex < activeQuestions.length - 1) {
        loadQuestion(currentQuestionIndex + 1);
      } else {
        if (confirm("क्या आप अपना टेस्ट फाइनल सबमिट करना चाहते हैं?")) {
          finalizeAndEvaluateTest();
        }
      }
    });
  }

  if (submitExamEarlyBtn) {
    submitExamEarlyBtn.addEventListener('click', function () {
      if (confirm("क्या आप समय से पहले टेस्ट सबमिट करना चाहते हैं?")) {
        finalizeAndEvaluateTest();
      }
    });
  }

  // 6. Test Evaluation & 3D Result Rendering
  function finalizeAndEvaluateTest() {
    clearInterval(timerInterval);

    let correct = 0;
    let wrong = 0;
    let unattempted = 0;

    activeQuestions.forEach(function (q, idx) {
      const resp = userResponses[idx];
      if (resp === -1) {
        unattempted++;
      } else if (resp === q.correctIndex) {
        correct++;
      } else {
        wrong++;
      }
    });

    // NTA Marking: +4, -1
    const totalMarks = (correct * 4) - (wrong * 1);
    const maxMarks = activeQuestions.length * 4;
    const attemptedCount = correct + wrong;
    const accuracy = attemptedCount > 0 ? Math.round((correct / attemptedCount) * 100) : 0;

    // Display Results in DOM
    if (resTotalMarks) resTotalMarks.innerText = `${totalMarks} / ${maxMarks}`;
    if (resAccuracy) resAccuracy.innerText = `${accuracy}%`;
    if (resCorrectCount) resCorrectCount.innerText = String(correct);
    if (resWrongCount) resWrongCount.innerText = String(wrong);
    if (resultSubMeta) resultSubMeta.innerText = `${currentSubjectName} - स्कोर रिपोर्ट`;

    // Render Solutions & Explanations
    if (solutionsAccordionList) {
      let solHtml = '';
      activeQuestions.forEach(function (q, idx) {
        const userAns = userResponses[idx];
        const isCorrect = (userAns === q.correctIndex);
        const letters = ['A', 'B', 'C', 'D'];
        const statusClass = (userAns === -1) ? 'color:var(--text-muted);' : (isCorrect ? 'correct' : 'wrong');
        const statusText = (userAns === -1) ? 'छोड़ दिया' : (isCorrect ? 'सही (+4)' : 'गलत (-1)');

        solHtml += `
          <div class="sol-item">
            <div class="sol-q-title">Q.${idx + 1}: ${q.question}</div>
            <div class="sol-ans-row ${statusClass}">
              आपका उत्तर: <b>${userAns === -1 ? 'कुछ नहीं' : letters[userAns] + ') ' + q.options[userAns]}</b> (${statusText})
            </div>
            <div class="sol-ans-row correct">
              सही उत्तर: <b>${letters[q.correctIndex]}) ${q.options[q.correctIndex]}</b>
            </div>
            <div class="sol-explanation">
              💡 <b>हल/व्याख्या:</b> ${q.explanation}
            </div>
          </div>
        `;
      });
      solutionsAccordionList.innerHTML = solHtml;
    }

    // Switch to Result View
    testRunningScreen.classList.remove('active');
    testResultScreen.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Sync to Cloud Locker / Dashboard
    if (window.NischayAuth && typeof window.NischayAuth.saveToCloudLocker === 'function') {
      window.NischayAuth.saveToCloudLocker('मॉक टेस्ट पूर्ण', `${currentSubjectName}: ${totalMarks}/${maxMarks} (${accuracy}% सटीकता)`);
    }

    // Update Local Dashboard Metrics
    localStorage.setItem('nischaydesk_last_score', `${totalMarks}/${maxMarks}`);
    localStorage.setItem('nischaydesk_last_accuracy', `${accuracy}%`);
  }

  // Restart Button
  if (restartTestBtn) {
    restartTestBtn.addEventListener('click', function () {
      testResultScreen.classList.remove('active');
      testLobbyScreen.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

});
