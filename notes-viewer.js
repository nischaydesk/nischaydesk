/* ==========================================================================
   NischayDesk Complete Notes Controller (v7.0 - In-App Pinch-to-Zoom Edition)
   Architected by: Prince Kumar (NischayDesk)
   Features: Dedicated Class 10th Matric, Native Pinch-to-Zoom PDF.js Reader,
             Play Store Style Snake Loader, Zero Link Changes Required
   ========================================================================== */

// 1. यहाँ अपना Google Apps Script वाला Web App URL पेस्ट करें
const NISCHAY_APPS_SCRIPT_URL = 'यहाँ_अपना_APPS_SCRIPT_URL_पेस्ट_करें';

// PDF.js लाइब्रेरी को अपने आप लोड करने वाला हेल्पर
function ensurePdfJsLoaded() {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  const notesCatalogGrid = document.getElementById('notesCatalogGrid');
  const notesSearchInput = document.getElementById('notesSearchInput');
  const filterPillContainer = document.getElementById('filterPillContainer');

  const pdfStudioModal = document.getElementById('pdfStudioModal');
  const modalDocBadge = document.getElementById('modalDocBadge');
  const modalDocTitle = document.getElementById('modalDocTitle');
  const studioPdfFrame = document.getElementById('studioPdfFrame');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalFullscreenBtn = document.getElementById('modalFullscreenBtn');
  const modalDirectDownloadBtn = document.getElementById('modalDirectDownloadBtn');

  let allChaptersMaster = [];
  let currentFilterSubject = 'all';
  let searchQuery = '';

  // ज़ूम कंटेनर को मोडल के अंदर तैयार करना (HTML को बिना छुए)
  let customZoomViewport = null;
  let customZoomCanvasWrap = null;
  let currentZoomScale = 1;
  let initialPinchDist = null;
  let initialZoomScale = 1;

  function setupCustomZoomContainer() {
    if (customZoomViewport || !studioPdfFrame) return;

    const parentStage = studioPdfFrame.parentElement;
    customZoomViewport = document.createElement('div');
    customZoomViewport.id = 'nischayZoomViewport';
    customZoomViewport.style.cssText = `
      width: 100%;
      height: 100%;
      overflow: auto;
      background: #ffffff;
      display: none;
      position: relative;
      touch-action: pan-x pan-y pinch-zoom;
      -webkit-overflow-scrolling: touch;
    `;

    customZoomCanvasWrap = document.createElement('div');
    customZoomCanvasWrap.id = 'nischayZoomCanvasWrap';
    customZoomCanvasWrap.style.cssText = `
      width: 100%;
      max-width: 850px;
      margin: 0 auto;
      transform-origin: 0 0;
    `;

    // फ्लोटिंग ज़ूम कंट्रोल पिल (नीचे दाईं तरफ)
    const zoomPill = document.createElement('div');
    zoomPill.style.cssText = `
      position: fixed;
      bottom: 18px;
      right: 18px;
      background: rgba(15, 23, 42, 0.88);
      color: #fff;
      padding: 6px 12px;
      border-radius: 99px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      font-weight: 700;
      z-index: 99999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    zoomPill.innerHTML = `
      <button type="button" id="nZoomOut" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;padding:0 4px;">−</button>
      <span id="nZoomLabel">100%</span>
      <button type="button" id="nZoomIn" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;padding:0 4px;">+</button>
      <button type="button" id="nZoomReset" style="background:none;border:none;border-left:1px solid #475569;color:#38bdf8;font-size:11px;cursor:pointer;padding-left:8px;">Reset</button>
    `;

    customZoomViewport.appendChild(customZoomCanvasWrap);
    customZoomViewport.appendChild(zoomPill);
    parentStage.appendChild(customZoomViewport);

    // ज़ूम अपडेट हेल्पर
    const updateZoomUI = () => {
      customZoomCanvasWrap.style.width = (currentZoomScale * 100) + '%';
      const lbl = document.getElementById('nZoomLabel');
      if (lbl) lbl.innerText = Math.round(currentZoomScale * 100) + '%';
    };

    document.getElementById('nZoomIn').onclick = () => {
      currentZoomScale = Math.min(3.5, currentZoomScale + 0.25);
      updateZoomUI();
    };
    document.getElementById('nZoomOut').onclick = () => {
      currentZoomScale = Math.max(1, currentZoomScale - 0.25);
      updateZoomUI();
    };
    document.getElementById('nZoomReset').onclick = () => {
      currentZoomScale = 1;
      updateZoomUI();
    };

    // मोबाइल पर दो उंगलियों से हाथ से ज़ूम (Pinch-to-Zoom)
    customZoomCanvasWrap.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        initialPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialZoomScale = currentZoomScale;
      }
    }, { passive: false });

    customZoomCanvasWrap.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && initialPinchDist) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        currentZoomScale = Math.min(Math.max(1, initialZoomScale * (dist / initialPinchDist)), 3.5);
        updateZoomUI();
      }
    }, { passive: false });

    customZoomCanvasWrap.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) initialPinchDist = null;
    });
  }

  // डेटा इनिशियलाइजेशन (सिर्फ Class 10th)
  initClass10Notes();

  function extractDriveId(url) {
    if (!url) return null;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];
    const matchParam = url.match(/id=([a-zA-Z0-9_-]+)/);
    return (matchParam && matchParam[1]) ? matchParam[1] : null;
  }

  function getSafePreviewUrl(rawUrl) {
    const fileId = extractDriveId(rawUrl);
    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    if (rawUrl && rawUrl.includes('drive.google.com/file/d/')) {
      return rawUrl.replace(/\/view.*$/, '/preview');
    }
    return rawUrl;
  }

  // 📥 डायरेक्ट डाउनलोड लिंक
  window.downloadPdfDirectly = function (rawUrl) {
    const fileId = extractDriveId(rawUrl);
    if (!fileId) {
      alert("डाउनलोड लिंक उपलब्ध नहीं है!");
      return;
    }
    const directUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
    const tempLink = document.createElement('a');
    tempLink.href = directUrl;
    tempLink.target = '_blank';
    tempLink.setAttribute('download', '');
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
  };

  function initClass10Notes() {
    if (!window.NischaySyllabus || !window.NischaySyllabus.subjects) {
      setTimeout(initClass10Notes, 200);
      return;
    }

    allChaptersMaster = [];
    window.NischaySyllabus.subjects.forEach(function (subject) {
      if (!subject.id.startsWith('10-')) return;

      if (subject.chapters && Array.isArray(subject.chapters)) {
        subject.chapters.forEach(function (ch) {
          allChaptersMaster.push({
            subjectId: subject.id,
            classTitle: "Class 10th",
            subjectTitle: subject.subjectTitle || "विषय",
            no: ch.no,
            name: ch.name,
            pdfUrl: ch.pdfUrl || '',
            pages: ch.pages || 'हैंडनोट्स',
            desc: ch.desc || 'बिहार बोर्ड मैट्रिक परीक्षा हेतु महत्वपूर्ण हस्तलिखित नोट्स।'
          });
        });
      }
    });

    const urlParams = new URLSearchParams(window.location.search);
    const requestedFilter = urlParams.get('filter') || urlParams.get('subject');

    currentFilterSubject = requestedFilter ? requestedFilter : 'all';

    adjustClass10FilterPills(currentFilterSubject);
    renderNotesGrid();
  }

  function adjustClass10FilterPills(selectedFilter) {
    if (!filterPillContainer) return;
    const filterButtons = filterPillContainer.querySelectorAll('.filter-btn');
    let matchedButton = null;

    filterButtons.forEach(btn => {
      const filterVal = btn.getAttribute('data-filter');
      btn.classList.remove('active');

      if (filterVal === selectedFilter) {
        btn.classList.add('active');
        matchedButton = btn;
      }
    });

    if (matchedButton) {
      matchedButton.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    } else if (selectedFilter === 'all') {
      const allBtn = filterPillContainer.querySelector('[data-filter="all"]');
      if (allBtn) allBtn.classList.add('active');
    }
  }

  function renderNotesGrid() {
    if (!notesCatalogGrid) return;

    let filtered = allChaptersMaster.filter(function (item) {
      let matchSubject = false;
      if (currentFilterSubject === 'all') {
        matchSubject = true;
      } else if (currentFilterSubject === '10-sst-all') {
        matchSubject = ['10-history', '10-geography', '10-civics', '10-economics', '10-disaster'].includes(item.subjectId);
      } else {
        matchSubject = (item.subjectId === currentFilterSubject);
      }

      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        item.name.toLowerCase().includes(q) || 
        item.subjectTitle.toLowerCase().includes(q) ||
        String(item.no).includes(q);

      return matchSubject && matchSearch;
    });

    if (filtered.length === 0) {
      notesCatalogGrid.innerHTML = `
        <div class="loading-state-box" style="text-align:center; padding:40px 16px; width:100%; grid-column:1/-1;">
          <div style="font-size: 2.8rem; margin-bottom: 10px;">📚</div>
          <h3 class="card-title" style="font-size: 1.2rem; margin-bottom: 6px; color: var(--text-main, #0f172a);">कोई नोट्स नहीं मिले</h3>
          <p class="card-desc" style="color: var(--text-muted, #64748b); font-size: 0.88rem;">कृपया दूसरा विषय चुनें या सर्च बॉक्स में दूसरा नाम लिखें।</p>
        </div>
      `;
      return;
    }

    const isLight = document.documentElement.classList.contains('light-mode') || document.documentElement.getAttribute('data-theme') === 'light';
    const titleColor = isLight ? '#0f172a' : '#f8fafc';
    const descColor = isLight ? '#475569' : '#94a3b8';

    let htmlBuffer = '';
    filtered.forEach(function (note) {
      const hasPdf = note.pdfUrl && note.pdfUrl.trim() !== '' && note.pdfUrl !== '#' && !note.pdfUrl.includes('xxxx');
      
      const readAction = hasPdf 
        ? `onclick="window.openNoteModal('${note.classTitle}', '${escapeHtml(note.name)}', '${note.pdfUrl}')"`
        : `onclick="alert('अध्याय ${note.no} के नोट्स जल्द अपलोड किए जा रहे हैं!')"`;

      const downloadAction = hasPdf
        ? `onclick="window.downloadPdfDirectly('${note.pdfUrl}')"`
        : `onclick="alert('PDF डाउनलोड लिंक जल्द उपलब्ध होगा!')"`;

      htmlBuffer += `
        <div class="note-item-card">
          <div>
            <div class="note-badge-row" style="display:flex; justify-content:space-between; margin-bottom:10px;">
              <span class="note-badge-class" style="background:rgba(2,132,199,0.12); color:#0284c7; padding:3px 10px; border-radius:6px; font-weight:800; font-size:0.75rem; border:1px solid rgba(2,132,199,0.25);">
                ${note.subjectTitle}
              </span>
              <span class="note-badge-pages" style="color:${descColor}; font-weight:700; font-size:0.78rem;">
                📄 ${note.pages || 'हैंडनोट्स'}
              </span>
            </div>

            <div style="display: flex; gap: 10px; align-items: flex-start; margin-bottom: 8px;">
              <div style="background: rgba(2, 132, 199, 0.12); color: #0284c7; min-width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.88rem; flex-shrink: 0; border: 1px solid rgba(2, 132, 199, 0.3);">
                ${note.no}
              </div>
              <h3 style="font-size: 1.05rem; margin: 0; font-weight: 800; line-height: 1.4; color: ${titleColor} !important;">
                ${note.name}
              </h3>
            </div>

            <p class="note-desc" style="padding-left: 42px; font-size: 0.82rem; color: ${descColor} !important; line-height: 1.45; margin-bottom: 14px;">
              ${note.desc}
            </p>
          </div>

          <div class="note-btn-group" style="padding-top: 12px; border-top: 1px solid rgba(128,128,128,0.15); display:flex; gap:8px;">
            <button class="btn-read-note" ${readAction} style="flex:1; padding:9px 12px; border-radius:8px; font-weight:700; font-size:0.85rem; background:#0284c7; color:#fff; border:none; cursor:pointer;">
              📖 <span>नोट्स पढ़ें</span>
            </button>
            <button class="btn-download-note" ${downloadAction} style="flex:1; padding:9px 12px; border-radius:8px; font-weight:700; font-size:0.85rem; background:rgba(2,132,199,0.1); color:#0284c7; border:1px solid rgba(2,132,199,0.3); cursor:pointer;">
              📥 <span>डाउनलोड</span>
            </button>
          </div>
        </div>
      `;
    });

    notesCatalogGrid.innerHTML = htmlBuffer;
  }

  // 🌟 मोडल ओपन होने पर HD Pinch-to-Zoom रीडर लोड करना
  window.openNoteModal = async function (classTitle, title, pdfUrl) {
    if (!pdfStudioModal || !studioPdfFrame) return;

    setupCustomZoomContainer();

    if (modalDocBadge) modalDocBadge.innerText = classTitle;
    if (modalDocTitle) modalDocTitle.innerText = title;

    if (window.triggerNotesViewerLoader) {
      window.triggerNotesViewerLoader(title);
    }

    if (modalDirectDownloadBtn) {
      modalDirectDownloadBtn.onclick = function (e) {
        e.preventDefault();
        window.downloadPdfDirectly(pdfUrl);
      };
    }

    pdfStudioModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    const fileId = extractDriveId(pdfUrl);
    const hasValidScript = NISCHAY_APPS_SCRIPT_URL && NISCHAY_APPS_SCRIPT_URL.startsWith('https://script.google.com');

    // यदि Apps Script सेटअप है, तो PDF.js ज़ूम रीडर चलाएं
    if (fileId && hasValidScript) {
      studioPdfFrame.style.display = 'none';
      customZoomViewport.style.display = 'block';
      customZoomCanvasWrap.innerHTML = '<div style="text-align:center;padding:50px 20px;color:#0f172a;font-weight:700;">नोट्स लोड हो रहे हैं... ⏳</div>';
      currentZoomScale = 1;
      customZoomCanvasWrap.style.width = '100%';
      const lbl = document.getElementById('nZoomLabel');
      if (lbl) lbl.innerText = '100%';

      try {
        const pdfjsLib = await ensurePdfJsLoaded();
        const response = await fetch(`${NISCHAY_APPS_SCRIPT_URL}?id=${fileId}`);
        const base64Data = await response.text();

        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        customZoomCanvasWrap.innerHTML = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2.2 });

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.cssText = 'width:100%; height:auto; display:block; margin:0; padding:0;';

          await page.render({ canvasContext: ctx, viewport: viewport }).promise;
          customZoomCanvasWrap.appendChild(canvas);
        }
      } catch (err) {
        console.error("PDF.js लोड एरर, फॉलबैक पर स्विच हो रहा है:", err);
        // किसी कारणवश नेटवर्क फेल हो तो पुराना Google Drive व्यूअर अपने आप खुल जाएगा
        customZoomViewport.style.display = 'none';
        studioPdfFrame.style.display = 'block';
        studioPdfFrame.removeAttribute('sandbox');
        studioPdfFrame.src = getSafePreviewUrl(pdfUrl);
      }
    } else {
      // फॉलबैक: पुराना Google Drive प्रीव्यू
      if (customZoomViewport) customZoomViewport.style.display = 'none';
      studioPdfFrame.style.display = 'block';
      studioPdfFrame.removeAttribute('sandbox');
      studioPdfFrame.src = getSafePreviewUrl(pdfUrl);
    }
  };

  function closeNoteModal() {
    if (!pdfStudioModal || !studioPdfFrame) return;
    pdfStudioModal.classList.remove('active');
    studioPdfFrame.src = '';
    if (customZoomCanvasWrap) customZoomCanvasWrap.innerHTML = '';
    document.body.style.overflow = '';
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeNoteModal);
  if (pdfStudioModal) {
    pdfStudioModal.addEventListener('click', function (e) {
      if (e.target === pdfStudioModal) closeNoteModal();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pdfStudioModal && pdfStudioModal.classList.contains('active')) {
      closeNoteModal();
    }
  });

  if (modalFullscreenBtn) {
    modalFullscreenBtn.addEventListener('click', function() {
      const stage = document.getElementById('pdfFrameStage') || customZoomViewport || studioPdfFrame;
      if (!document.fullscreenElement) {
        if (stage.requestFullscreen) stage.requestFullscreen();
        else if (stage.webkitRequestFullscreen) stage.webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    });
  }

  if (filterPillContainer) {
    filterPillContainer.addEventListener('click', function (e) {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;

      filterPillContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      currentFilterSubject = btn.getAttribute('data-filter');
      renderNotesGrid();
    });
  }

  if (notesSearchInput) {
    notesSearchInput.addEventListener('input', function () {
      searchQuery = this.value;
      renderNotesGrid();
    });
  }

  const themeObserver = new MutationObserver(renderNotesGrid);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }
});
