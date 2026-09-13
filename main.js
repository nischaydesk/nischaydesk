/* ==========================================================================
   NischayDesk Core Controller, Theme & Smart Utilities Engine (v3.5)
   Architected by: Prince Kumar
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {

  // =========================================================================
  // 1. MOBILE SLIDE-OUT DRAWER ENGINE
  // =========================================================================
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sideDrawer = document.getElementById('sideDrawer');
  const drawerScrim = document.getElementById('drawerScrim');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');

  function openDrawer() {
    if (sideDrawer) sideDrawer.classList.add('active');
    if (drawerScrim) drawerScrim.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (sideDrawer) sideDrawer.classList.remove('active');
    if (drawerScrim) drawerScrim.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openDrawer);
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
  if (drawerScrim) drawerScrim.addEventListener('click', closeDrawer);

  // =========================================================================
  // 2. UNIVERSAL DARK / LIGHT THEME ENGINE
  // =========================================================================
  const themeSwitch = document.getElementById('themeSwitch');

  function applySavedTheme() {
    const savedTheme = localStorage.getItem('nischay_theme');
    const isLight = (savedTheme === 'light');

    if (isLight) {
      document.documentElement.classList.add('light-mode');
      if (themeSwitch) themeSwitch.checked = true;
    } else {
      document.documentElement.classList.remove('light-mode');
      if (themeSwitch) themeSwitch.checked = false;
    }
  }

  if (themeSwitch) {
    themeSwitch.addEventListener('change', function () {
      const willBeLight = this.checked;
      localStorage.setItem('nischay_theme', willBeLight ? 'light' : 'dark');
      applySavedTheme();
    });
  }

  applySavedTheme();

  // =========================================================================
  // 3. SMART TOOL: IMAGE TO PDF CONVERTER
  // =========================================================================
  const openDocConverterBtn = document.getElementById('openDocConverterBtn');
  const docConverterModal = document.getElementById('docConverterModal');
  const closeConverterBtn = document.getElementById('closeConverterBtn');
  const converterFileInput = document.getElementById('converterFileInput');
  const selectedFilesCount = document.getElementById('selectedFilesCount');
  const generatePdfBtn = document.getElementById('generatePdfBtn');

  let selectedImageFiles = [];

  if (openDocConverterBtn && docConverterModal) {
    openDocConverterBtn.addEventListener('click', () => {
      docConverterModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  }

  function closeConverterModal() {
    if (!docConverterModal) return;
    docConverterModal.classList.remove('active');
    document.body.style.overflow = '';
    selectedImageFiles = [];
    if (converterFileInput) converterFileInput.value = '';
    if (selectedFilesCount) selectedFilesCount.innerText = "कोई फोटो नहीं चुनी गई";
    if (generatePdfBtn) generatePdfBtn.disabled = true;
  }

  if (closeConverterBtn) closeConverterBtn.addEventListener('click', closeConverterModal);
  if (docConverterModal) {
    docConverterModal.addEventListener('click', (e) => {
      if (e.target === docConverterModal) closeConverterModal();
    });
  }

  if (converterFileInput) {
    converterFileInput.addEventListener('change', function () {
      selectedImageFiles = Array.from(this.files);
      if (selectedImageFiles.length > 0) {
        if (selectedFilesCount) {
          selectedFilesCount.innerText = `✓ ${selectedImageFiles.length} फोटो चुनी गईं`;
        }
        if (generatePdfBtn) generatePdfBtn.disabled = false;
      } else {
        if (selectedFilesCount) selectedFilesCount.innerText = "कोई फोटो नहीं चुनी गई";
        if (generatePdfBtn) generatePdfBtn.disabled = true;
      }
    });
  }

  if (generatePdfBtn) {
    generatePdfBtn.addEventListener('click', async function () {
      if (!selectedImageFiles || selectedImageFiles.length === 0) return;

      const { jsPDF } = window.jspdf || {};
      if (!jsPDF) {
        alert("PDF लाइब्रेरी लोड हो रही है, कृपया 2 सेकंड बाद पुनः प्रयास करें।");
        return;
      }

      generatePdfBtn.disabled = true;
      generatePdfBtn.innerText = "PDF तैयार हो रही है...";

      try {
        const doc = new jsPDF();

        for (let i = 0; i < selectedImageFiles.length; i++) {
          const file = selectedImageFiles[i];
          const imgData = await readFileAsDataURL(file);

          if (i > 0) doc.addPage();
          doc.addImage(imgData, 'JPEG', 10, 10, 190, 270);
        }

        doc.save(`NischayDesk_Notes_${Date.now()}.pdf`);
        alert("✓ PDF सफलतापूर्वक बन गई और डाउनलोड हो चुकी है!");
        closeConverterModal();
      } catch (err) {
        console.error(err);
        alert("PDF बनाने में त्रुटि आई। कृपया फ़ोटो दोबारा चुनें।");
      } finally {
        generatePdfBtn.disabled = false;
        generatePdfBtn.innerText = "⚡ PDF डाउनलोड करें";
      }
    });
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // =========================================================================
  // 4. SMART TOOL: CAREER & EXAM ELIGIBILITY CHECKER
  // =========================================================================
  const openEligibilityBtn = document.getElementById('openEligibilityBtn');
  const eligibilityModal = document.getElementById('eligibilityModal');
  const closeEligibilityBtn = document.getElementById('closeEligibilityBtn');
  const checkEligibilityBtn = document.getElementById('checkEligibilityBtn');
  const elClass = document.getElementById('elClass');
  const elStream = document.getElementById('elStream');
  const eligibilityResultsBox = document.getElementById('eligibilityResultsBox');

  if (openEligibilityBtn && eligibilityModal) {
    openEligibilityBtn.addEventListener('click', () => {
      eligibilityModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  }

  function closeEligibilityModal() {
    if (!eligibilityModal) return;
    eligibilityModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (closeEligibilityBtn) closeEligibilityBtn.addEventListener('click', closeEligibilityModal);
  if (eligibilityModal) {
    eligibilityModal.addEventListener('click', (e) => {
      if (e.target === eligibilityModal) closeEligibilityModal();
    });
  }

  if (checkEligibilityBtn) {
    checkEligibilityBtn.addEventListener('click', function () {
      const cls = elClass ? elClass.value : "11";
      const stream = elStream ? elStream.value : "pcm";

      let reportHtml = "";

      if (cls === "10") {
        reportHtml = `
          <h4 style="color:var(--brand-accent); margin-bottom:6px;">🎯 कक्षा 10वीं के बाद प्रमुख विकल्प:</h4>
          <p>• <strong>बिहार बोर्ड 11वीं साइंस (PCM/PCB):</strong> इंजीनियरिंग, मेडिकल या डिफेंस के लिए।</p>
          <p>• <strong>पॉलिटेक्निक (DCECE):</strong> 3-वर्षीय डिप्लोमा इन इंजीनियरिंग।</p>
          <p>• <strong>ITI कोर्सेज:</strong> तकनीकी ट्रेड्स में शीघ्र रोजगार हेतु।</p>
          <p>• <strong>NTSE एवं ओलंपियाड्स:</strong> स्कॉलरशिप और राष्ट्रीय स्तर की पहचान।</p>
        `;
      } else {
        if (stream === "pcm" || stream === "pcmb") {
          reportHtml = `
            <h4 style="color:var(--brand-accent); margin-bottom:6px;">🎯 PCM (गणित) के लिए राष्ट्रीय परीक्षाएं:</h4>
            <p>• <strong>JEE Main & Advanced:</strong> IITs, NITs और शीर्ष इंजीनियरिंग कॉलेज।</p>
            <p>• <strong>NDA (UPSC):</strong> भारतीय सेना, वायुसेना एवं नौसेना में राजपत्रित अधिकारी।</p>
            <p>• <strong>BCECE (बिहार संयुक्त प्रवेश):</strong> राज्य के सरकारी इंजीनियरिंग कॉलेज।</p>
            <p>• <strong>CUET UG:</strong> दिल्ली विश्वविद्यालय, BHU व शीर्ष सेंट्रल यूनिवर्सिटी।</p>
          `;
        } else if (stream === "pcb") {
          reportHtml = `
            <h4 style="color:var(--brand-accent); margin-bottom:6px;">🎯 PCB (बायोलॉजी) के लिए राष्ट्रीय परीक्षाएं:</h4>
            <p>• <strong>NEET UG:</strong> MBBS, BDS, BAMS, BHMS सरकारी मेडिकल कॉलेज।</p>
            <p>• <strong>B.Sc नर्सिंग / पैरामेडिकल:</strong> AIIMS एवं राज्य स्तरीय स्वास्थ्य विभाग।</p>
            <p>• <strong>ICAR AIEEA:</strong> कृषि विज्ञान एवं फॉरेस्ट्री डिग्री कोर्सेज।</p>
            <p>• <strong>CUET UG:</strong> बायोटेक्नोलॉजी, माइक्रोबायोलॉजी और लाइफ साइंसेज।</p>
          `;
        } else {
          reportHtml = `
            <h4 style="color:var(--brand-accent); margin-bottom:6px;">🎯 सामान्य व अन्य स्ट्रीम विकल्प:</h4>
            <p>• <strong>CUET UG:</strong> आर्ट्स, कॉमर्स एवं सामान्य स्नातक कोर्सेज।</p>
            <p>• <strong>CLAT:</strong> राष्ट्रीय लॉ यूनिवर्सिटीज (NLUs) में वकालत व कानून की पढ़ाई।</p>
            <p>• <strong>NDA (आर्मी विंग):</strong> 12वीं के बाद डिफेंस सेवा।</p>
          `;
        }
      }

      if (eligibilityResultsBox) {
        eligibilityResultsBox.innerHTML = reportHtml;
      }
    });
  }

});
