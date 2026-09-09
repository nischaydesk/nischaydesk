/* ==========================================================================
   NischayDesk Global App Orchestrator & UI Controller
   Engineered & Architected by Prince Kumar
   ========================================================================== */

// 0. सबसे पहले सुरक्षित थीम लोड (पेज लोड होने से पहले फ्लैशिंग रोकने के लिए)
(function () {
  try {
    const savedTheme = localStorage.getItem('nischay_theme');
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  } catch (e) {
    console.warn("Theme storage access warning:", e);
  }
})();

document.addEventListener('DOMContentLoaded', function () {

  // 1. Mobile Slide-Out Drawer Controls
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');
  const drawerScrim = document.getElementById('drawerScrim');
  const sideDrawer = document.getElementById('sideDrawer');

  function openDrawer() {
    if (sideDrawer) sideDrawer.classList.add('active', 'open');
    if (drawerScrim) drawerScrim.classList.add('active', 'open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (sideDrawer) sideDrawer.classList.remove('active', 'open');
    if (drawerScrim) drawerScrim.classList.remove('active', 'open');
    document.body.style.overflow = '';
  }

  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openDrawer);
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
  if (drawerScrim) drawerScrim.addEventListener('click', closeDrawer);

  // 2. iOS Switch Theme Controller
  const themeSwitch = document.getElementById('themeSwitch');
  const savedTheme = localStorage.getItem('nischay_theme');

  if (themeSwitch) {
    themeSwitch.checked = (savedTheme === 'light');
    themeSwitch.addEventListener('change', function () {
      if (this.checked) {
        document.documentElement.classList.add('light-mode');
        localStorage.setItem('nischay_theme', 'light');
      } else {
        document.documentElement.classList.remove('light-mode');
        localStorage.setItem('nischay_theme', 'dark');
      }
    });
  }

  // 3. Dashboard Dynamic Metrics & Locker Syncer (Runs safely on index.html)
  syncDashboardMetrics();

  function syncDashboardMetrics() {
    const totalNotesCount = document.getElementById('totalNotesCount');
    const totalQuizCount = document.getElementById('totalQuizCount');
    const userLastScore = document.getElementById('userLastScore');
    const userAccuracy = document.getElementById('userAccuracy');
    const syncStatus = document.getElementById('syncStatus');

    // Sync counts from syllabus-data.js
    if (window.NischaySyllabus) {
      if (totalNotesCount && window.NischaySyllabus.subjects) {
        let count = 0;
        window.NischaySyllabus.subjects.forEach(function (s) {
          if (s.chapters && Array.isArray(s.chapters)) {
            count += s.chapters.length;
          }
        });
        totalNotesCount.innerText = `${count}+`;
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

  // 4. Smooth Page Anchor Scrolling
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
  // 5. In-Browser Smart Tools Logic (Doc Converter & Eligibility Checker)
  // ==========================================================================

  // --- Tool A: Direct Image to PDF Converter Engine ---
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
            alert("PDF इंजन लोड नहीं हो सका। कृपया पेज रिफ्रेश करें।");
            generatePdfBtn.disabled = false;
            generatePdfBtn.innerText = "⚡ PDF डाउनलोड करें";
            return;
          }

          const pdf = new jsPDF('p', 'mm', 'a4');
          const pageWidth = pdf.internal.pageSize.getWidth();   // 210 mm
          const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm

          for (let i = 0; i < chosenImages.length; i++) {
            const file = chosenImages[i];

            const img = await new Promise((resolve, reject) => {
              const image = new Image();
              image.onload = () => resolve(image);
              image.onerror = reject;
              image.src = URL.createObjectURL(file);
            });

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const maxDim = 1600;
            let targetW = img.naturalWidth || img.width;
            let targetH = img.naturalHeight || img.height;

            if (targetW > maxDim || targetH > maxDim) {
              if (targetW > targetH) {
                targetH = Math.round((targetH * maxDim) / targetW);
                targetW = maxDim;
              } else {
                targetW = Math.round((targetW * maxDim) / targetH);
                targetH = maxDim;
              }
            }

            canvas.width = targetW;
            canvas.height = targetH;
            ctx.drawImage(img, 0, 0, targetW, targetH);

            const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            URL.revokeObjectURL(img.src);

            const imgRatio = targetW / targetH;
            let finalW = pageWidth - 20; // 10mm Margin
            let finalH = finalW / imgRatio;

            if (finalH > (pageHeight - 20)) {
              finalH = pageHeight - 20;
              finalW = finalH * imgRatio;
            }

            const posX = (pageWidth - finalW) / 2;
            const posY = (pageHeight - finalH) / 2;

            if (i > 0) {
              pdf.addPage();
            }

            pdf.addImage(optimizedDataUrl, 'JPEG', posX, posY, finalW, finalH, undefined, 'FAST');
          }

          // File Save
          pdf.save(`NischayDesk_Notes_${Date.now()}.pdf`);

          selectedFilesCount.innerText = "✓ PDF सफलतापूर्वक डाउनलोड हो गई!";
          setTimeout(function () {
            docConverterModal.classList.remove('active');
            generatePdfBtn.disabled = false;
            generatePdfBtn.innerText = "⚡ PDF डाउनलोड करें";
          }, 1200);

        } catch (err) {
          console.error("PDF Export Error:", err);
          alert("PDF बनाने में समस्या आई। कृपया पुनः प्रयास करें।");
          generatePdfBtn.disabled = false;
          generatePdfBtn.innerText = "⚡ PDF डाउनलोड करें";
        }
      });
    }
  }

  // --- Tool B: Full Career & Exam Eligibility Checker ---
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

        let html = `<b style="color:var(--brand-accent); font-size: 0.95rem;">🎯 आपके चुने गए विवरण अनुसार उपलब्ध अवसर:</b><ul style="margin-top:10px; padding-left:18px; display:flex; flex-direction:column; gap:8px;">`;

        if (cls === '10') {
          html += `
            <li><b>BSEB / CBSE 10th बोर्ड:</b> वार्षिक मैट्रिक परीक्षा हेतु योग्य।</li>
            <li><b>11वीं साइंस स्ट्रीम (PCM/PCB):</b> इंजीनियरिंग व मेडिकल फाउंडेशन हेतु प्रवेश योग्य।</li>
            <li><b>बिहार पॉलिटेक्निक प्रवेश परीक्षा (DCECE - PE):</b> 3-वर्षीय जूनियर इंजीनियरिंग डिप्लोमा।</li>
            <li><b>ITI प्रवेश परीक्षा (ITICAT):</b> तकनीकी एवं वोकेशनल ट्रेड्स में सरकारी डिप्लोमा।</li>
            <li><b>NTSE एवं NMMS छात्रवृत्ति परीक्षा:</b> मेधा छात्रवृत्ति योजना।</li>
            <li><b>डिफेंस भर्ती (Army Agniveer / Navy MR):</b> 10वीं पास शारीरिक व लिखित परीक्षा।</li>
          `;
        } else if (cls === '11' || cls === '12') {
          html += `<li><b>BSEB इंटरमीडिएट वार्षिक परीक्षा:</b> 12वीं बोर्ड पंजीकरण योग्य।</li>`;

          if (stm === 'pcm' || stm === 'pcmb') {
            html += `
              <li><b>NTA JEE (Main & Advanced):</b> IIT, NIT, IIIT में B.Tech/इंजीनियरिंग प्रवेश।</li>
              <li><b>NDA & NA (UPSC):</b> भारतीय थलसेना, नौसेना व वायुसेना में सीधे ऑफिसर रैंक (लेफ्टिनेंट)।</li>
              <li><b>BCECE इंजीनियरिंग:</b> बिहार राज्य के सरकारी इंजीनियरिंग कॉलेजों में प्रवेश।</li>
              <li><b>CUET (UG):</b> DU, BHU, JNU जैसी केंद्रीय यूनिवर्सिटीज में B.Sc./B.Tech कोर्सेज।</li>
              <li><b>Airforce Agniveer (X-Group):</b> भारतीय वायुसेना टेक्निकल भर्ती।</li>
            `;
          }
          if (stm === 'pcb' || stm === 'pcmb') {
            html += `
              <li><b>NTA NEET (UG):</b> MBBS, BDS, BAMS, BHMS मेडिकल कोर्सेज हेतु अखिल भारतीय परीक्षा।</li>
              <li><b>AIIMS & State B.Sc. Nursing:</b> सरकारी मेडिकल कॉलेजों में 4-वर्षीय नर्सिंग डिग्री।</li>
              <li><b>ICAR AIEEA:</b> B.Sc. एग्रीकल्चर, हॉर्टिकल्चर एवं डेयरी साइंस।</li>
              <li><b>पैरामेडिकल डिप्लोमा (DCECE - PM):</b> लैब तकनीशियन, ओटी असिस्टेंट, फार्मेसी।</li>
            `;
          }
          if (stm === 'gen') {
            html += `
              <li><b>CUET (UG) - जनरल टेस्ट:</b> टॉप यूनिवर्सिटीज में BA, B.Com, BBA एडमिशन।</li>
              <li><b>SSC CHSL / MTS:</b> 12वीं स्तर पर केंद्र सरकार के मंत्रालयों में क्लर्क भर्ती।</li>
              <li><b>बिहार पुलिस कांस्टेबल भर्ती:</b> 12वीं उत्तीर्ण अभ्यर्थियों के लिए।</li>
            `;
          }
        }

        html += `</ul>`;
        if (eligibilityResultsBox) {
          eligibilityResultsBox.innerHTML = html;
        }
      });
    }
  }

}); // DOMContentLoaded End
