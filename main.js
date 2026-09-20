/* ==========================================================================
   NischayDesk Core Controller, Theme & Smart Utilities Engine (v5.0 PRO)
   Architected by: Prince Kumar
   Features: Live Camera, Rotate, Delete, Magic Filter, Custom Watermark & Anti-Crash
   ========================================================================== */

// ग्लोबल वैरिएबल्स (रोटेट और डिलीट के लिए)
let scannedPages = [];
let renderPagesGridGlobal = null;

window.rotatePage = function (index) {
  if (scannedPages[index]) {
    scannedPages[index].rotation = (scannedPages[index].rotation + 90) % 360;
    if (typeof renderPagesGridGlobal === 'function') renderPagesGridGlobal();
  }
};

window.deletePage = function (index) {
  if (scannedPages[index] !== undefined) {
    scannedPages.splice(index, 1);
    if (typeof renderPagesGridGlobal === 'function') renderPagesGridGlobal();
  }
};

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
  // 3. SMART TOOL: ULTIMATE DOC SCANNER & PDF STUDIO
  // =========================================================================
  const openDocConverterBtn = document.getElementById('openDocConverterBtn');
  const docConverterModal = document.getElementById('docConverterModal');
  const closeConverterBtn = document.getElementById('closeConverterBtn');
  const converterFileInput = document.getElementById('converterFileInput');
  const openLiveCameraBtn = document.getElementById('openLiveCameraBtn');
  const cameraContainer = document.getElementById('cameraContainer');
  const cameraVideo = document.getElementById('cameraVideo');
  const capturePhotoBtn = document.getElementById('capturePhotoBtn');
  const stopCameraBtn = document.getElementById('stopCameraBtn');
  const cameraCaptureCanvas = document.getElementById('cameraCaptureCanvas');
  const pagesGridContainer = document.getElementById('pagesGridContainer');
  const selectedFilesCount = document.getElementById('selectedFilesCount');
  const clearAllPagesBtn = document.getElementById('clearAllPagesBtn');
  const generatePdfBtn = document.getElementById('generatePdfBtn');
  const imageFilterSelect = document.getElementById('imageFilterSelect');
  const customPdfNameInput = document.getElementById('customPdfNameInput');

  let cameraStream = null;

  // 1. मोडल ओपन / क्लोज़
  if (openDocConverterBtn && docConverterModal) {
    openDocConverterBtn.addEventListener('click', () => {
      docConverterModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  }

  function stopLiveCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
    if (cameraContainer) cameraContainer.style.display = 'none';
  }

  function closeConverterModal() {
    if (!docConverterModal) return;
    stopLiveCamera();
    docConverterModal.classList.remove('active');
    document.body.style.overflow = '';
    scannedPages = [];
    renderPagesGrid();
    if (converterFileInput) converterFileInput.value = '';
  }

  if (closeConverterBtn) closeConverterBtn.addEventListener('click', closeConverterModal);
  if (docConverterModal) {
    docConverterModal.addEventListener('click', (e) => {
      if (e.target === docConverterModal) closeConverterModal();
    });
  }

  // 2. लाइव कैमरा ऑन
  if (openLiveCameraBtn) {
    openLiveCameraBtn.addEventListener('click', async () => {
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        if (cameraVideo) {
          cameraVideo.srcObject = cameraStream;
          cameraContainer.style.display = 'flex';
        }
      } catch (err) {
        alert("कैमरा परमिशन नहीं मिली! कृपया गैलरी बटन का इस्तेमाल करें।");
      }
    });
  }

  if (stopCameraBtn) stopCameraBtn.addEventListener('click', stopLiveCamera);

  // 3. फ़ोटो कैप्चर
  if (capturePhotoBtn) {
    capturePhotoBtn.addEventListener('click', () => {
      if (!cameraVideo || !cameraVideo.videoWidth) return;
      if (!cameraCaptureCanvas) return;

      cameraCaptureCanvas.width = cameraVideo.videoWidth;
      cameraCaptureCanvas.height = cameraVideo.videoHeight;
      const ctx = cameraCaptureCanvas.getContext('2d');
      ctx.drawImage(cameraVideo, 0, 0);

      const capturedUrl = cameraCaptureCanvas.toDataURL('image/jpeg', 0.85);
      scannedPages.push({
        id: Date.now() + Math.random(),
        dataUrl: capturedUrl,
        rotation: 0
      });

      renderPagesGrid();
      if (navigator.vibrate) navigator.vibrate(50);
    });
  }

  // 4. गैलरी से फ़ोटो लोड
  if (converterFileInput) {
    converterFileInput.addEventListener('change', async function () {
      const files = Array.from(this.files).filter(f => f.type.startsWith('image/'));
      for (const file of files) {
        const compressedBase64 = await readFileAsCompressedDataUrl(file);
        scannedPages.push({
          id: Date.now() + Math.random(),
          dataUrl: compressedBase64,
          rotation: 0
        });
      }
      renderPagesGrid();
      this.value = '';
    });
  }

  function readFileAsCompressedDataUrl(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1400;
          let w = img.width, h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
            else { w = Math.round((w * maxDim) / h); h = maxDim; }
          }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.80));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // 5. ग्रिड रेंडर
  function renderPagesGrid() {
    if (!pagesGridContainer) return;
    pagesGridContainer.innerHTML = '';
    const total = scannedPages.length;

    if (total === 0) {
      if (selectedFilesCount) selectedFilesCount.innerText = "कोई फोटो नहीं जोड़ी गई";
      if (clearAllPagesBtn) clearAllPagesBtn.style.display = 'none';
      if (generatePdfBtn) {
        generatePdfBtn.disabled = true;
        generatePdfBtn.innerText = "⚡ HD PDF डाउनलोड करें (0 पेज)";
      }
      return;
    }

    if (selectedFilesCount) selectedFilesCount.innerText = `✓ कुल ${total} पेज तैयार`;
    if (clearAllPagesBtn) clearAllPagesBtn.style.display = 'inline-block';
    if (generatePdfBtn) {
      generatePdfBtn.disabled = false;
      generatePdfBtn.innerText = `⚡ HD PDF डाउनलोड करें (${total} पेज)`;
    }

    scannedPages.forEach((page, index) => {
      const card = document.createElement('div');
      card.style.cssText = "position:relative; background:#fff; border:1px solid #cbd5e1; border-radius:8px; padding:4px; display:flex; flex-direction:column;";
      card.innerHTML = `
        <span style="position:absolute; top:6px; left:6px; background:rgba(15,23,42,0.85); color:#fff; font-size:0.65rem; padding:2px 6px; border-radius:4px;">P.${index + 1}</span>
        <img src="${page.dataUrl}" style="width:100%; height:85px; object-fit:contain; background:#f1f5f9; border-radius:4px; transform:rotate(${page.rotation}deg);" alt="Page">
        <div style="display:flex; justify-content:space-between; gap:4px; margin-top:6px;">
          <button type="button" style="flex:1; background:#e0f2fe; color:#0284c7; border:none; border-radius:4px; padding:4px 0; font-size:0.7rem; font-weight:bold; cursor:pointer;" onclick="window.rotatePage(${index})">🔄</button>
          <button type="button" style="flex:1; background:#fee2e2; color:#dc2626; border:none; border-radius:4px; padding:4px 0; font-size:0.7rem; font-weight:bold; cursor:pointer;" onclick="window.deletePage(${index})">🗑️</button>
        </div>
      `;
      pagesGridContainer.appendChild(card);
    });
  }

  renderPagesGridGlobal = renderPagesGrid;

  if (clearAllPagesBtn) {
    clearAllPagesBtn.addEventListener('click', () => {
      scannedPages = [];
      renderPagesGrid();
    });
  }

  // 6. इमेज प्रोसेस (फिल्टर + रोटेशन)
  function processFinalImage(page, filterType) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const rot = page.rotation;

        if (rot === 90 || rot === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rot * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        if (filterType === 'magic') {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            let v = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
            v = v > 150 ? Math.min(255, v * 1.22) : v * 0.85;
            d[i] = v; d[i + 1] = v; d[i + 2] = v;
          }
          ctx.putImageData(imgData, 0, 0);
        } else if (filterType === 'grayscale') {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            let avg = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
            d[i] = avg; d[i + 1] = avg; d[i + 2] = avg;
          }
          ctx.putImageData(imgData, 0, 0);
        }

        resolve({
          dataUrl: canvas.toDataURL('image/jpeg', 0.82),
          width: canvas.width,
          height: canvas.height
        });
      };
      img.src = page.dataUrl;
    });
  }

  // 7. PDF जनरेशन
  if (generatePdfBtn) {
    generatePdfBtn.addEventListener('click', async function () {
      if (scannedPages.length === 0) return;

      const jsPDF = window.jspdf ? window.jspdf.jsPDF : null;
      if (!jsPDF) {
        alert("PDF लाइब्रेरी लोड हो रही है, 2 सेकंड बाद दबाएं।");
        return;
      }

      stopLiveCamera();
      generatePdfBtn.disabled = true;
      generatePdfBtn.innerText = "⏳ PDF तैयार हो रहा है...";

      try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
        const pageWidth = 210, pageHeight = 297, margin = 8;
        const printW = pageWidth - (margin * 2);
        const printH = pageHeight - (margin * 2) - 6;
        const selectedFilter = imageFilterSelect ? imageFilterSelect.value : 'original';

        for (let i = 0; i < scannedPages.length; i++) {
          if (i > 0) doc.addPage();

          const finalImg = await processFinalImage(scannedPages[i], selectedFilter);
          const ratio = finalImg.width / finalImg.height;
          let rW = printW;
          let rH = printW / ratio;

          if (rH > printH) {
            rH = printH;
            rW = printH * ratio;
          }

          const pX = margin + ((printW - rW) / 2);
          const pY = margin + ((printH - rH) / 2);

          doc.addImage(finalImg.dataUrl, 'JPEG', pX, pY, rW, rH, undefined, 'FAST');

          doc.setFontSize(8);
          doc.setTextColor(140, 140, 140);
          doc.text(`NischayDesk • Page ${i + 1} of ${scannedPages.length}`, pageWidth / 2, pageHeight - 4, { align: 'center' });
        }

        const rawFileName = customPdfNameInput && customPdfNameInput.value.trim() !== '' 
          ? customPdfNameInput.value.trim() 
          : 'NischayDesk_Notes';

        doc.save(`${rawFileName.replace(/[^a-zA-Z0-9_\-]/g, '_')}.pdf`);
        alert("✓ PDF डाउनलोड हो चुकी है!");
        closeConverterModal();
      } catch (err) {
        console.error(err);
        alert("PDF बनाने में रुकावट आई। कृपया दोबारा प्रयास करें।");
      } finally {
        generatePdfBtn.disabled = false;
        generatePdfBtn.innerText = `⚡ HD PDF डाउनलोड करें (${scannedPages.length} पेज)`;
      }
    });
  }

}); // DOMContentLoaded का क्लोजिंग ब्रैकेट (यह छूटा हुआ था)
