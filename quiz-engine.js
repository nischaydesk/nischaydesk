/* ==========================================================================
   NischayDesk Chapter-Wise Real-Time Test Simulation Engine (v3.5)
   Supports: Class 10th, 11th & 12th Chapter Assessments & Negative Marking
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

  // Comprehensive Question Bank (Categorized strictly by Class, Subject & Chapter)
  const masterQuestionBank = {
    // -------------------------------------------------------------
    // CLASS 10TH QUESTIONS
    // -------------------------------------------------------------
    "10": {
      "physics": {
        "ch1": [
          {
            q: "प्रकाश की किरणें हमेशा किस रेखा में गमन करती हैं?",
            options: ["सीधी रेखा में", "टेढ़ी-मेढ़ी रेखा में", "वृत्ताकार रेखा में", "अनिश्चित मार्ग में"],
            correct: 0,
            exp: "प्रकाश एक सरल रेखीय (सीधी) रेखा में संचरित होता है जिसे प्रकाश का ऋजुरेखीय संचरण कहते हैं।"
          },
          {
            q: "समतल दर्पण द्वारा बना प्रतिबिम्ब हमेशा कैसा होता है?",
            options: ["वास्तविक", "काल्पनिक (आभासी) एवं सीधा", "उल्टा", "वास्तविक एवं आवर्धित"],
            correct: 1,
            exp: "समतल दर्पण सदैव आभासी (काल्पनिक), सीधा और वस्तु के बराबर आकार का प्रतिबिम्ब बनाता है।"
          },
          {
            q: "गोलीय दर्पण की फोकस दूरी (f) और वक्रता त्रिज्या (R) में क्या सम्बंध है?",
            options: ["f = 2R", "f = R / 2", "f = R + 2", "R = f / 2"],
            correct: 1,
            exp: "गोलीय दर्पण की फोकस दूरी उसकी वक्रता त्रिज्या की आधी होती है, अर्थात् f = R/2।"
          },
          {
            q: "दाढ़ी बनाने (हजामत) के लिए किस दर्पण का उपयोग किया जाता है?",
            options: ["उत्तल दर्पण", "समतल दर्पण", "अवतल दर्पण", "उत्तल लेंस"],
            correct: 2,
            exp: "अवतल दर्पण वस्तु को ध्रुव और फोकस के बीच रखने पर उसका सीधा और आवर्धित (बड़ा) प्रतिबिम्ब बनाता है।"
          },
          {
            q: "मोटर गाड़ी के चालक के सामने (साइड मिरर) कौन-सा दर्पण लगा रहता है?",
            options: ["समतल दर्पण", "उत्तल दर्पण", "अवतल दर्पण", "उत्तल लेंस"],
            correct: 1,
            exp: "उत्तल दर्पण का दृष्टि क्षेत्र (Field of view) बहुत विस्तृत होता है और यह सीधा प्रतिबिम्ब बनाता है।"
          }
        ],
        "ch2": [
          {
            q: "मानव नेत्र के किस भाग पर किसी वस्तु का प्रतिबिम्ब बनता है?",
            options: ["कॉर्निया", "परितारिका", "पुतली", "रेटिना या दृष्टिपटल"],
            correct: 3,
            exp: "मानव नेत्र में प्रवेश करने वाला प्रकाश रेटिना पर वास्तविक और उल्टा प्रतिबिम्ब बनाता है।"
          },
          {
            q: "सामान्य दृष्टि के वयस्क के लिए सुस्पष्ट दर्शन की अल्पतम (न्यूनतम) दूरी कितनी होती है?",
            options: ["25 मीटर", "2.5 सेंटीमीटर", "25 सेंटीमीटर", "2.5 मीटर"],
            correct: 2,
            exp: "स्पष्ट दृष्टि की न्यूनतम दूरी 25 cm होती है, जबकि दूर बिंदु अनंत होता है।"
          }
        ]
      },
      "chemistry": {
        "ch1": [
          {
            q: "लोहे पर जंग लगना किस प्रकार की रासायनिक अभिक्रिया का उदाहरण है?",
            options: ["अपचयन", "संक्षारण (ऑक्सीकरण)", "विस्थापन", "द्वि-विस्थापन"],
            correct: 1,
            exp: "लोहा नमी और ऑक्सीजन की उपस्थिति में फेरिक ऑक्साइड बनाता है जिसे संक्षारण कहते हैं।"
          },
          {
            q: "श्वसन किस प्रकार की अभिक्रिया है?",
            options: ["ऊष्माशोषी", "ऊष्माक्षेपी", "संयोजन", "अपघटन"],
            correct: 1,
            exp: "श्वसन में ग्लूकोज के विखंडन से ऊर्जा (ऊष्मा) मुक्त होती है, इसलिए यह ऊष्माक्षेपी अभिक्रिया है।"
          }
        ]
      },
      "math": {
        "ch1": [
          {
            q: "संख्या π (पाई) किस प्रकार की संख्या है?",
            options: ["परिमेय संख्या", "अपरिमेय संख्या", "पूर्णांक संख्या", "प्राकृत संख्या"],
            correct: 1,
            exp: "π एक अपरिमेय संख्या है क्योंकि इसका दशमलव प्रसार अशांत और अनावर्ती होता है।"
          },
          {
            q: "यदि दो संख्याओं का गुणनफल 2166 है एवं उनका म०स० 19 है, तो ल०स० क्या होगा?",
            options: ["38", "57", "114", "190"],
            correct: 2,
            exp: "दो संख्याओं का गुणनफल = ल०स० × म०स० ⇒ ल०स० = 2166 / 19 = 114।"
          }
        ]
      }
    },

    // -------------------------------------------------------------
    // CLASS 11TH QUESTIONS
    // -------------------------------------------------------------
    "11": {
      "physics": {
        "ch1": [
          {
            q: "SI पद्धति में मूल भौतिक राशियों (Fundamental Quantities) की संख्या कितनी है?",
            options: ["5", "6", "7", "9"],
            correct: 2,
            exp: "SI मात्रक प्रणाली में 7 मूल राशियां हैं: लंबाई, द्रव्यमान, समय, विद्युत धारा, ताप, ज्योति तीव्रता और पदार्थ की मात्रा।"
          },
          {
            q: "गुरुत्वाकर्षण स्थिरांक (G) की विमीय सूत्र (Dimensional Formula) क्या है?",
            options: ["[M^-1 L^3 T^-2]", "[M^1 L^2 T^-2]", "[M^-1 L^2 T^-1]", "[M^0 L^3 T^-2]"],
            correct: 0,
            exp: "F = G(m1*m2)/r^2 ⇒ G = F*r^2 / m^2 = [M L T^-2][L^2] / [M^2] = [M^-1 L^3 T^-2]।"
          }
        ],
        "ch2": [
          {
            q: "यदि किसी वस्तु का विस्थापन समय के वर्ग के समानुपाती है, तो वस्तु किस प्रकार गति कर रही है?",
            options: ["एकसमान वेग से", "एकसमान त्वरण से", "परिवर्ती त्वरण से", "विरामावस्था में"],
            correct: 1,
            exp: "s ∝ t^2 ⇒ s = k*t^2 ⇒ v = ds/dt = 2kt ⇒ a = dv/dt = 2k (स्थिर अर्थात् एकसमान त्वरण)।"
          },
          {
            q: "अधिकतम परास (Maximum Range) प्राप्त करने के लिए प्रक्षेप्य कोण (θ) कितना होना चाहिए?",
            options: ["30°", "45°", "60°", "90°"],
            correct: 1,
            exp: "R = (u^2 * sin 2θ) / g; जब θ = 45° होगा, तब sin(90°) = 1 (अधिकतम)।"
          }
        ]
      },
      "chemistry": {
        "ch1": [
          {
            q: "आवोग्रादो संख्या (Avogadro's Number, NA) का सही मान क्या है?",
            options: ["6.022 × 10^23 mol^-1", "6.022 × 10^22 mol^-1", "1.602 × 10^-19 mol^-1", "3.00 × 10^8 mol^-1"],
            correct: 0,
            exp: "1 मोल में कणों की संख्या 6.02214 × 10^23 होती है।"
          }
        ]
      },
      "math": {
        "ch1": [
          {
            q: "यदि किसी समुच्चय A में n अवयव हैं, तो A के उपसमुच्चयों (Subsets) की कुल संख्या कितनी होगी?",
            options: ["n^2", "2n", "2^n", "2^(n-1)"],
            correct: 2,
            exp: "n अवयवों वाले किसी भी समुच्चय के उपसमुच्चयों की कुल संख्या 2^n होती है।"
          }
        ]
      }
    },

    // -------------------------------------------------------------
    // CLASS 12TH QUESTIONS
    // -------------------------------------------------------------
    "12": {
      "physics": {
        "ch1": [
          {
            q: "मुक्त आकाश की परावैद्युता (ε0) का मात्रक क्या होता है?",
            options: ["N m^2 C^-2", "C^2 N^-1 m^-2", "N m C^-1", "C N m^-2"],
            correct: 1,
            exp: "F = (1 / 4πε0) * (q1*q2 / r^2) ⇒ ε0 = q1*q2 / (F*r^2) = C^2 N^-1 m^-2 (या F/m)।"
          },
          {
            q: "विद्युत द्विध्रुव आघूर्ण (Electric Dipole Moment, p) की दिशा क्या होती है?",
            options: ["धनावेश से ऋणावेश की ओर", "ऋणावेश से धनावेश की ओर", "केंद्र से लंबवत", "दिशाहीन"],
            correct: 1,
            exp: "विद्युत द्विध्रुव आघूर्ण एक सदिश राशि है जिसकी दिशा ऋण आवेश (-q) से धन आवेश (+q) की ओर होती है।"
          }
        ]
      },
      "chemistry": {
        "ch1": [
          {
            q: "ताप बढ़ाने पर निम्नलिखित में से किसकी सांद्रता परिवर्तित नहीं होती है?",
            options: ["मोलरता (Molarity)", "मोललता (Molality)", "सामान्यतया (Normality)", "फॉर्मलता"],
            correct: 1,
            exp: "मोललता विलायक के द्रव्यमान पर निर्भर करती है और द्रव्यमान ताप से स्वतंत्र होता है।"
          }
        ]
      }
    }
  };

  // 1. Gather Questions based on User Selection
  function loadSelectedQuestions() {
    const sClass = testClassSelect ? testClassSelect.value : "10";
    const sSubject = testSubjectSelect ? testSubjectSelect.value : "physics";
    const sChapter = testChapterSelect ? testChapterSelect.value : "all";

    const classBank = masterQuestionBank[sClass] || {};
    const subjectBank = classBank[sSubject] || {};

    currentQuestions = [];

    if (sChapter === "all") {
      // Gather all chapters under this subject
      Object.keys(subjectBank).forEach(chKey => {
        currentQuestions = currentQuestions.concat(subjectBank[chKey]);
      });
    } else {
      // Load selected chapter only
      if (subjectBank[sChapter]) {
        currentQuestions = subjectBank[sChapter].slice();
      }
    }

    // Fallback if no questions are added for a new chapter yet
    if (currentQuestions.length === 0) {
      currentQuestions = [
        {
          q: `कक्षा ${sClass}वीं (${sSubject}) के इस चयनित अध्याय के अभ्यास प्रश्न तैयार किए जा रहे हैं। अभ्यास हेतु डेमो प्रश्न: कार्य का मात्रक क्या है?`,
          options: ["जूल (Joule)", "वाट (Watt)", "न्यूटन (Newton)", "पास्कल (Pascal)"],
          correct: 0,
          exp: "कार्य और ऊर्जा का SI मात्रक जूल (Joule) होता है।"
        }
      ];
    }

    // Shuffle questions slightly for dynamic experience
    currentQuestions.sort(() => Math.random() - 0.5);
  }

  // 2. Start Exam Trigger
  if (startExamBtn) {
    startExamBtn.addEventListener('click', function () {
      loadSelectedQuestions();
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
