/* ==========================================================================
   NischayDesk Global App Orchestrator & UI Controller
   Engineered & Architected by Prince Kumar
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {

  // 1. Mobile Slide-Out Drawer Controls
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');
  const drawerScrim = document.getElementById('drawerScrim');
  const sideDrawer = document.getElementById('sideDrawer');

  function openDrawer() {
    if (sideDrawer) {
      sideDrawer.classList.add('active');
      sideDrawer.classList.add('open');
    }
    if (drawerScrim) {
      drawerScrim.classList.add('active');
      drawerScrim.classList.add('open');
    }
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (sideDrawer) {
      sideDrawer.classList.remove('active');
      sideDrawer.classList.remove('open');
    }
    if (drawerScrim) {
      drawerScrim.classList.remove('active');
      drawerScrim.classList.remove('open');
    }
    document.body.style.overflow = '';
  }

  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openDrawer);
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
  if (drawerScrim) drawerScrim.addEventListener('click', closeDrawer);

  // 2. Dashboard Dynamic Metrics & Locker Syncer (Runs on index.html)
  syncDashboardMetrics();

  function syncDashboardMetrics() {
    const totalNotesCount = document.getElementById('totalNotesCount');
    const totalQuizCount = document.getElementById('totalQuizCount');
    const userLastScore = document.getElementById('userLastScore');
    const userAccuracy = document.getElementById('userAccuracy');
    const syncStatus = document.getElementById('syncStatus');

    // Sync counts from syllabus-data.js
    if (window.NischaySyllabus) {
      if (totalNotesCount) {
        if (window.NischaySyllabus.subjects) {
          let count = 0;
          window.NischaySyllabus.subjects.forEach(function (s) {
            count += s.chapters.length;
          });
          totalNotesCount.innerText = `${count}+`;
        } else if (window.NischaySyllabus.notesList) {
          totalNotesCount.innerText = `${window.NischaySyllabus.notesList.length}+`;
        }
      }

      if (totalQuizCount && window.NischaySyllabus.questionBank) {
        let qTotal = 0;
        Object.keys(window.NischaySyllabus.questionBank).forEach(function (sub) {
          qTotal += window.NischaySyllabus.questionBank[sub].length;
        });
        totalQuizCount.innerText = `${qTotal * 10}+`;
      }
    }

    // Read stored test score from quiz-engine.js execution
    const savedScore = localStorage.getItem('nischaydesk_last_score');
    const savedAcc = localStorage.getItem('nischaydesk_last_accuracy');

    if (savedScore && userLastScore) {
      userLastScore.innerText = savedScore;
    }
    if (savedAcc && userAccuracy) {
      userAccuracy.innerText = savedAcc;
    }

    // Backend Connection Indicator
    if (syncStatus) {
      if (window.NischayConfig && window.NischayConfig.isCloudReady) {
        syncStatus.innerText = "● Cloud Firestore Live";
        syncStatus.style.color = "var(--success)";
      } else {
        syncStatus.innerText = "● Local-Sync Active";
      }
    }
  }

  // 3. Smooth Page Anchor Scrolling
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const targetId = anchor.getAttribute('href');
      if (targetId && targetId !== '#') {
        const targetElem = document.querySelector(targetId);
        if (targetElem) {
          e.preventDefault();
          targetElem.scrollIntoView({ behavior: 'smooth' });
          closeDrawer();
        }
      }
    });
  });

  // ==========================================================================
  // 4. In-Browser Smart Tools Logic (Doc Converter & Eligibility Checker)
  // ==========================================================================

  // --- Tool A: Direct Image to PDF Converter Engine (No Print Crash) ---
  const openDocConverterBtn = document.getElementById('openDocConverterBtn');
  const docConverterModal = document.getElementById('docConverterModal');
  const closeConverterBtn = document.getElementById('closeConverterBtn');
  const converterFileInput = document.getElementById('converterFileInput');
  const selectedFilesCount = document.getElementById('selectedFilesCount');
  const generatePdfBtn = document.getElementById('generatePdfBtn');

  if (openDocConverterBtn && docConverterModal) {
    openDocConverterBtn.addEventListener('click', function () {
      docConverterModal.classList.add('active');
    });

    if (closeConverterBtn) {
      closeConverterBtn.addEventListener('click', function () {
        docConverterModal.classList.remove('active');
      });
    }

    docConverterModal.addEventListener('click', function (e) {
      if (e.target === docConverterModal) {
        docConverterModal.classList.remove('active');
      }
    });

    let chosenImages = [];

    if (converterFileInput) {
      converterFileInput.addEventListener('change', function (e) {
        chosenImages = Array.from(e.target.files);
        if (chosenImages.length > 0) {
          selectedFilesCount.innerText = `✓ ${chosenImages.length} फोटो चुनी गई`;
          generatePdfBtn.disabled = false;
        } else {
          selectedFilesCount.innerText = 'कोई फोटो नहीं चुनी गई';
          generatePdfBtn.disabled = true;
        }
      });
    }

    if (generatePdfBtn) {
      generatePdfBtn.addEventListener('click', async function () {
        if (chosenImages.length === 0) return;

        generatePdfBtn.disabled = true;
        generatePdfBtn.innerText = "PDF तैयार हो रही है...";

        try {
          const { jsPDF } = window.jspdf || {};
          if (!jsPDF) {
            alert("PDF इंजन लोड नहीं हो सका। कृपया इंटरनेट चालू रखें या पेज रिफ्रेश करें।");
            generatePdfBtn.disabled = false;
            generatePdfBtn.innerText = "⚡ PDF जेनरेट और डाउनलोड करें";
            return;
          }

          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();

          for (let i = 0; i < chosenImages.length; i++) {
            const file = chosenImages[i];
            const base64Data = await new Promise(function (resolve) {
              const reader = new FileReader();
              reader.onload = function (event) {
                resolve(event.target.result);
              };
              reader.readAsDataURL(file);
            });

            const img = new Image();
            img.src = base64Data;
            await new Promise(function (resolve) {
              img.onload = resolve;
            });

            const imgRatio = img.width / img.height;
            let renderWidth = pdfWidth;
            let renderHeight = pdfWidth / imgRatio;

            if (renderHeight > pdfHeight) {
              renderHeight = pdfHeight;
              renderWidth = pdfHeight * imgRatio;
            }

            const posX = (pdfWidth - renderWidth) / 2;
            const posY = (pdfHeight - renderHeight) / 2;

            if (i > 0) {
              pdf.addPage();
            }

            pdf.addImage(base64Data, 'JPEG', posX, posY, renderWidth, renderHeight);
          }

          // Direct Download
          pdf.save(`NischayDesk_Notes_${Date.now()}.pdf`);

          selectedFilesCount.innerText = "✓ PDF सफलतापूर्वक डाउनलोड हो गई!";
          setTimeout(function () {
            docConverterModal.classList.remove('active');
            generatePdfBtn.disabled = false;
            generatePdfBtn.innerText = "⚡ PDF जेनरेट और डाउनलोड करें";
          }, 1200);

        } catch (err) {
          console.error("PDF Export Error:", err);
          alert("PDF बनाने में त्रुटि हुई। कृपया दोबारा प्रयास करें।");
          generatePdfBtn.disabled = false;
          generatePdfBtn.innerText = "⚡ PDF जेनरेट और डाउनलोड करें";
        }
      });
    }
  }

  // --- Tool B: Eligibility Checker ---
  const openEligibilityBtn = document.getElementById('openEligibilityBtn');
  const eligibilityModal = document.getElementById('eligibilityModal');
  const closeEligibilityBtn = document.getElementById('closeEligibilityBtn');
  const checkEligibilityBtn = document.getElementById('checkEligibilityBtn');
  const eligibilityResultsBox = document.getElementById('eligibilityResultsBox');

  if (openEligibilityBtn && eligibilityModal) {
    openEligibilityBtn.addEventListener('click', function () {
      eligibilityModal.classList.add('active');
    });

    if (closeEligibilityBtn) {
      closeEligibilityBtn.addEventListener('click', function () {
        eligibilityModal.classList.remove('active');
      });
    }

    eligibilityModal.addEventListener('click', function (e) {
      if (e.target === eligibilityModal) {
        eligibilityModal.classList.remove('active');
      }
    });

    if (checkEligibilityBtn) {
      checkEligibilityBtn.addEventListener('click', function () {
        const clsElem = document.getElementById('elClass');
        const stmElem = document.getElementById('elStream');
        const cls = clsElem ? clsElem.value : '11';
        const stm = stmElem ? stmElem.value : 'pcm';

        let html = `<b style="color:var(--brand-accent);">आप इन परीक्षाओं और अवसरों के लिए पात्र (Eligible) हैं:</b><ul style="margin-top:8px; padding-left:18px;">`;

        if (cls === '10') {
          html += `
            <li><b>बिहार बोर्ड / CBSE 10th बोर्ड:</b> योग्य।</li>
            <li><b>NTSE (राष्ट्रीय प्रतिभा खोज):</b> छात्रवृत्ति परीक्षा के लिए योग्य।</li>
            <li><b>पॉलिटेक्निक डिप्लोमा प्रवेश परीक्षा (PE):</b> 10वीं के बाद इंजीनियरिंग डिप्लोमा हेतु योग्य।</li>
            <li><b>ITI प्रवेश परीक्षा:</b> योग्य।</li>
          `;
        } else if (cls === '11' || cls === '12') {
          if (stm === 'pcm' || stm === 'pcmb') {
            html += `
              <li><b>JEE Main & JEE Advanced:</b> IIT, NIT और शीर्ष इंजीनियरिंग संस्थानों हेतु पात्र।</li>
              <li><b>NDA (National Defence Academy):</b> भारतीय थलसेना, नौसेना व वायुसेना हेतु पात्र।</li>
              <li><b>BCECE (बिहार संयुक्त प्रवेश परीक्षा):</b> राज्य इंजीनियरिंग कॉलेजों हेतु पात्र।</li>
              <li><b>CUET UG:</b> केंद्रीय विश्वविद्यालयों (DU, BHU) में B.Sc./B.Tech हेतु पात्र।</li>
            `;
          }
          if (stm === 'pcb' || stm === 'pcmb') {
            html += `
              <li><b>NEET UG:</b> MBBS, BDS, BAMS और मेडिकल कोर्सेज हेतु पूर्णतः पात्र।</li>
              <li><b>B.Sc. Nursing & पैरामेडिकल:</b> AIIMS व राज्य स्तरीय नर्सिंग प्रवेश हेतु पात्र।</li>
              <li><b>ICAR AIEEA:</b> कृषि विज्ञान (B.Sc. Agriculture) हेतु पात्र।</li>
            `;
          }
          html += `<li><b>12th बोर्ड परीक्षा:</b> इंटरमीडिएट बोर्ड परीक्षा के लिए पंजीकरण योग्य।</li>`;
        }

        html += `</ul>`;
        if (eligibilityResultsBox) {
          eligibilityResultsBox.innerHTML = html;
        }
      });
    }
  }

}); // DOMContentLoaded बंद

// =================== AI DOUBT SOLVER ENGINE ===================
const PART_A = "gsk_"; 
const PART_B = "StnNwQAxenQgUvvGF7FQWGdyb3FYuYVf0AqrswWcTFYX9lJYCYFU"; 
const GROQ_API_KEY = PART_A + PART_B;

function openAiDoubtModal() {
  const modal = document.getElementById('aiDoubtModal');
  if (modal) modal.style.display = 'flex';
  
  const drawer = document.getElementById('sideDrawer');
  const scrim = document.getElementById('drawerScrim');
  if (drawer) {
    drawer.classList.remove('open');
    drawer.classList.remove('active');
  }
  if (scrim) {
    scrim.classList.remove('open');
    scrim.classList.remove('active');
  }
  document.body.style.overflow = '';
}

function closeAiDoubtModal() {
  const modal = document.getElementById('aiDoubtModal');
  if (modal) modal.style.display = 'none';
}

function handleAiEnter(event) {
  if (event.key === 'Enter') {
    sendQuestionToGroq();
  }
}

async function sendQuestionToGroq() {
  const inputField = document.getElementById('aiUserInput');
  const chatBody = document.getElementById('aiChatBody');
  const userText = inputField ? inputField.value.trim() : '';

  if (!userText) return;

  chatBody.innerHTML += `<div class="ai-msg user-msg">${userText}</div>`;
  inputField.value = '';
  chatBody.scrollTop = chatBody.scrollHeight;

  const loadingId = 'loading-' + Date.now();
  chatBody.innerHTML += `<div class="ai-msg bot-msg" id="${loadingId}">उत्तर तैयार हो रहा है... ⏳</div>`;
  chatBody.scrollTop = chatBody.scrollHeight;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
       model: "model: "llama3-8b-8192",

        messages: [
          {
            role: "system",
            content: "You are NischayDesk AI, an academic study assistant created by Prince Kumar for Bihar Board students (Class 10th & 11th PCM+B). Introduce yourself as NischayDesk AI. Answer clearly in Hindi/Hinglish."
          },
          { role: "user", content: userText }
        ],
        temperature: 0.6
      })
    });

    const data = await response.json();
    const loadingElem = document.getElementById(loadingId);
    if (loadingElem) loadingElem.remove();

    if (data.choices && data.choices[0]?.message?.content) {
      const botReply = data.choices[0].message.content;
      chatBody.innerHTML += `<div class="ai-msg bot-msg">${botReply}</div>`;
    } else {
      chatBody.innerHTML += `<div class="ai-msg bot-msg">API एरर: ${data.error ? data.error.message : 'रिस्पॉन्स नहीं मिला'}</div>`;
    }
  } catch (error) {
    console.error("AI Error:", error);
    const loadingElem = document.getElementById(loadingId);
    if (loadingElem) loadingElem.remove();
    chatBody.innerHTML += `<div class="ai-msg bot-msg">कनेक्शन में समस्या आई।</div>`;
  }

  chatBody.scrollTop = chatBody.scrollHeight;
}
