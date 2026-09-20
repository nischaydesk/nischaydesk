  // =========================================================================
  // 3. SMART TOOL: ULTIMATE DOC SCANNER & PDF STUDIO (v5.0 PRO)
  // Architected by: Prince Kumar (NischayDesk)
  // Features: Live Camera, Rotation, Delete, Magic Filter, Custom Name, Anti-Crash
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

  let scannedPages = []; // हर फोटो का डेटा: { id, originalDataUrl, rotation: 0 }
  let cameraStream = null;

  // 1. मोडल खोलना और बंद करना
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

  // 2. लाइव बैक कैमरा शुरू करना (Environment Cam)
  if (openLiveCameraBtn) {
    openLiveCameraBtn.addEventListener('click', async () => {
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false
        });
        cameraVideo.srcObject = cameraStream;
        cameraContainer.style.display = 'flex';
      } catch (err) {
        alert("कैमरा एक्सेस नहीं मिला! कृपया ब्राउज़र परमिशन की जाँच करें या गैलरी बटन का उपयोग करें।");
      }
    });
  }

  if (stopCameraBtn) stopCameraBtn.addEventListener('click', stopLiveCamera);

  // 3. कैमरे से फोटो खींचना
  if (capturePhotoBtn) {
    capturePhotoBtn.addEventListener('click', () => {
      if (!cameraVideo.videoWidth) return;
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
      // हल्का वाइब्रेशन (क्लिक फील)
      if (navigator.vibrate) navigator.vibrate(60);
    });
  }

  // 4. गैलरी से फ़ाइलें चुनना
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

  // फाइल को हल्का और मेमोरी-फ्रेंडली बनाने वाला फंक्शन
  function readFileAsCompressedDataUrl(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1500;
          let w = img.width, h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
            else { w = Math.round((w * maxDim) / h); h = maxDim; }
          }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // 5. फोटो ग्रिड को स्क्रीन पर सजाना (Preview, Rotate, Delete)
  function renderPagesGrid() {
    pagesGridContainer.innerHTML = '';
    const total = scannedPages.length;

    if (total === 0) {
      selectedFilesCount.innerText = "कोई फोटो नहीं जोड़ी गई";
      clearAllPagesBtn.style.display = 'none';
      generatePdfBtn.disabled = true;
      generatePdfBtn.innerText = "⚡ HD PDF डाउनलोड करें (0 पेज)";
      return;
    }

    selectedFilesCount.innerText = `✓ कुल ${total} पेज तैयार`;
    clearAllPagesBtn.style.display = 'inline-block';
    generatePdfBtn.disabled = false;
    generatePdfBtn.innerText = `⚡ HD PDF डाउनलोड करें (${total} पेज)`;

    scannedPages.forEach((page, index) => {
      const card = document.createElement('div');
      card.className = 'page-thumb-card';
      card.innerHTML = `
        <span class="badge">P.${index + 1}</span>
        <img src="${page.dataUrl}" style="transform: rotate(${page.rotation}deg);" alt="Page ${index + 1}">
        <div class="thumb-actions">
          <button class="btn-rot" title="90° घुमाएं" onclick="rotatePage(${index})">🔄 घुमाएं</button>
          <button class="btn-del" title="पेज हटाएं" onclick="deletePage(${index})">🗑️ हटाएं</button>
        </div>
      `;
      pagesGridContainer.appendChild(card);
    });
  }

  // ग्लोबल रोटेट और डिलीट फंक्शन्स
  window.rotatePage = function (index) {
    scannedPages[index].rotation = (scannedPages[index].rotation + 90) % 360;
    renderPagesGrid();
  };

  window.deletePage = function (index) {
    scannedPages.splice(index, 1);
    renderPagesGrid();
  };

  if (clearAllPagesBtn) {
    clearAllPagesBtn.addEventListener('click', () => {
      if (confirm("क्या आप सभी पन्ने हटाना चाहते हैं?")) {
        scannedPages = [];
        renderPagesGrid();
      }
    });
  }

  // 6. मैजिक फिल्टर और रोटेशन लागू करके फाइनल कैनवास तैयार करना
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

        // फिल्टर लागू करें
        if (filterType === 'magic') {
          // मैजिक व्हाइट फिल्टर: डार्क लिखावट को उभारता है और बैकग्राउंड साफ करता है
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            let v = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
            v = v > 155 ? Math.min(255, v * 1.25) : v * 0.85; // कंट्रास्ट बूस्ट
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

  // 7. सुपर PDF जनरेशन (वाटरमार्क व नो-क्रैश A4 लेआउट)
  if (generatePdfBtn) {
    generatePdfBtn.addEventListener('click', async function () {
      if (scannedPages.length === 0) return;

      const jsPDF = window.jspdf ? window.jspdf.jsPDF : null;
      if (!jsPDF) {
        alert("PDF इंजन लोड हो रहा है, कृपया 2 सेकंड बाद दबाएं।");
        return;
      }

      stopLiveCamera();
      generatePdfBtn.disabled = true;
      generatePdfBtn.innerText = "⏳ HD PDF बन रहा है...";

      try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
        const pageWidth = 210, pageHeight = 297, margin = 8;
        const printW = pageWidth - (margin * 2);
        const printH = pageHeight - (margin * 2) - 6; // नीचे वाटरमार्क की जगह
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

          // 🌟 हर पन्ने पर ब्रांडिंग वाटरमार्क
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(`NischayDesk Smart Notes • Page ${i + 1} of ${scannedPages.length}`, pageWidth / 2, pageHeight - 4, { align: 'center' });
        }

        const rawFileName = customPdfNameInput && customPdfNameInput.value.trim() !== '' 
          ? customPdfNameInput.value.trim() 
          : 'NischayDesk_Notes';
        
        doc.save(`${rawFileName.replace(/[^a-zA-Z0-9_\-]/g, '_')}.pdf`);
        alert("🎉 बधाई! आपकी सम्पूर्ण HD PDF तैयार होकर डाउनलोड हो चुकी है!");
        closeConverterModal();
      } catch (err) {
        console.error("PDF Generate Error:", err);
        alert("PDF बनाने में रुकावट आई। कृपया दोबारा प्रयास करें।");
      } finally {
        generatePdfBtn.disabled = false;
        generatePdfBtn.innerText = `⚡ HD PDF डाउनलोड करें (${scannedPages.length} पेज)`;
      }
    });
  }
