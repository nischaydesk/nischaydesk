/* ==========================================================================
   NischayDesk Chapter-Wise Real-Time Test Simulation Engine (v4.2 Bulletproof JSON Fetch)
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

  // Helper: विषय के नाम या वैल्यू से बिल्कुल सही JSON फाइल ढूंढना
  function resolveJsonFileName(sClass, sSubject) {
    let subVal = (sSubject || "").toLowerCase().trim();
    let subText = "";
    
    if (testSubjectSelect && testSubjectSelect.selectedIndex >= 0) {
      subText = (testSubjectSelect.options[testSubjectSelect.selectedIndex].text || "").toLowerCase().trim();
    }

    let combined = subVal + " " + subText;

    // 1. भौतिकी (Physics)
    if (combined.includes('phy') || combined.includes('भौतिकी') || combined.includes('संबंधित')) {
      return '10-physics.json';
    }
    // 2. रसायन विज्ञान (Chemistry)
    if (combined.includes('chem') || combined.includes('रसायन')) {
      return '10-chemistry.json';
    }
    // 3. जीव विज्ञान (Biology)
    if (combined.includes('bio') || combined.includes('जीव')) {
      return '10-biology.json';
    }
    // 4. गणित (Math)
    if (combined.includes('math') || combined.includes('गणित')) {
      return '10-math.json';
    }
    // 5. संस्कृत (Sanskrit)
    if (combined.includes('sans') || combined.includes('संस्कृत')) {
      return '10-sanskrit.json';
    }
    // 6. सामाजिक विज्ञान / इतिहास / भूगोल आदि (SST)
    if (combined.includes('sst') || combined.includes('इतिहास') || combined.includes('भूगोल') || combined.includes('सामाजिक') || combined.includes('नागरिक') || combined.includes('अर्थशास्त्र') || combined.includes('आपदा') || combined.includes('history') || combined.includes('geo') || combined.includes('civic') || combined.includes('eco') || combined.includes('disaster')) {
      return '10-sst.json';
    }

    // डिफ़ॉल्ट फॉलबैक
    return `${sClass}-physics.json`;
  }

  // 1. Dynamic Question Loader with Robust Path & Fallback
  async function loadSelectedQuestions() {
    const sClass = testClassSelect ? testClassSelect.value : "10";
    
    let sSubject = "physics";
    if (testSubjectSelect) {
      sSubject = testSubjectSelect.value || "physics";
    }

    let sChapter = "all";
    if (testChapterSelect) {
      sChapter = testChapterSelect.value || "all";
    }

    const jsonFileName = resolveJsonFileName(sClass, sSubject);

    // अलग-अलग संभावित रिलेटिव पाथ्स ताकि GitHub Pages पर कभी 404 न आए
    const possiblePaths = [
      `data/${jsonFileName}`,
      `./data/${jsonFileName}`,
      `/nischaydesk/data/${jsonFileName}`,
      `../data/${jsonFileName}`
    ];

    let rawQuestions = null;

    for (const path of possiblePaths) {
      try {
        const response = await fetch(`${path}?t=${Date.now()}`);
        if (response.ok) {
          rawQuestions = await response.json();
          break; // फाइल मिल गई
        }
      } catch (e) {
        // अगला पाथ ट्राई करेगा
      }
    }

    if (!rawQuestions || !Array.isArray(rawQuestions)) {
      console.error("JSON फ़ाइल लोड नहीं हो सकी:", jsonFileName);
      currentQuestions = [];
    } else {
      // डेटा नॉर्मलाइज़ेशन (प्रॉपर्टी नाम की किसी भी भिन्नता को संभालना)
      const normalizedList = rawQuestions.map(item => ({
        id: item.id || '',
        chapter: parseInt(item.chapter) || 1,
        q: item.q || item.question || 'प्रश्न उपलब्ध नहीं है',
        options: item.options || [],
        correct: (item.correct !== undefined) ? item.correct : (item.correctIndex !== undefined ? item.correctIndex : 0),
        exp: item.exp || item.explanation || 'व्याख्या शीघ्र जोड़ी जाएगी।'
      }));

      // स्ट्रिक्ट चैप्टर फ़िल्टरिंग
      const chString = String(sChapter).toLowerCase();
      if (chString === 'all' || chString.includes('संपूर्ण') || chString.includes('फुल')) {
        currentQuestions = normalizedList;
      } else {
        const chMatch = chString.match(/\d+/);
        const targetChapter = chMatch ? parseInt(chMatch[0]) : null;

        if (targetChapter) {
          currentQuestions = normalizedList.filter(item => item.chapter === targetChapter);
        } else {
          currentQuestions = normalizedList;
        }
      }
    }

    // अगर उस चैप्टर में प्रश्न न मिलें तो फॉलबैक
    if (currentQuestions.length === 0) {
      currentQuestions = [
        {
          q: `चयनित अध्याय (${jsonFileName}) के प्रश्न लोड हो रहे हैं या अभी अपडेट हो रहे हैं। जाँच हेतु डेमो प्रश्न: प्रकाश का निर्वात में वेग कितना होता है?`,
          options: ["3 × 10⁸ m/s", "3 × 10⁶ m/s", "3 × 10⁵ km/s", "A और C दोनों"],
          correct: 3,
          exp: "प्रकाश का वेग निर्वात में 3 × 10⁸ मीटर/सेकंड होता है।"
        }
      ];
    } else {
      // प्रश्नों को शफल करना
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
      let subText = "विषय";
      if (testSubjectSelect && testSubjectSelect.selectedIndex >= 0) {
        subText = testSubjectSelect.options[testSubjectSelect.selectedIndex].text;
      }
      if (liveExamBadge) liveExamBadge.innerText = `Class ${cls}th • ${subText.split(' ')[0]}`;

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
