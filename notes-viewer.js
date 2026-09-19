/* ==========================================================================
   NischayDesk Ultra-Modern EdTech Notes Controller (v7.0 - Pro Design & Direct Download)
   Rule 1: Direct Background Device Download (Saves straight to phone storage)
   Rule 2: Modern Dark-Glass Morphic UI Cards (Physics Wallah / Unacademy style)
   Rule 3: Absolute Privacy (No Drive native menu, zero account leak)
   ========================================================================== */

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
  const pdfFrameStage = document.getElementById('pdfFrameStage');

  let allChaptersMaster = [];
  let currentFilterSubject = 'all';
  let searchQuery = '';

  // 1. मोडल के अंदर अल्ट्रा-स्मूथ लोडिंग स्क्रीन
  let frameLoader = null;
  if (pdfFrameStage) {
    frameLoader = document.createElement('div');
    frameLoader.id = 'pdfInternalLoader';
    frameLoader.style.cssText = 'position:absolute; inset:0; display:none; align-items:center; justify-content:center; flex-direction:column; background:#070d1e; z-index:15; color:#38bdf8; font-family:inherit;';
    frameLoader.innerHTML = `
      <div style="width:42px; height:42px; border:3.5px solid rgba(56,189,248,0.15); border-top-color:#38bdf8; border-radius:50%; animation:spinDeskLoader 0.75s linear infinite; margin-bottom:14px;"></div>
      <span style="font-size:0.9rem; font-weight:800; color:#f8fafc; letter-spacing:0.3px;">सुरक्षित HD नोट्स खुल रहे हैं...</span>
      <span style="font-size:0.75rem; color:#94a3b8; margin-top:4px;">NischayDesk In-App Smart Reader</span>
      <style>@keyframes spinDeskLoader{to{transform:rotate(360deg)}}</style>
    `;
    pdfFrameStage.style.position = 'relative';
    pdfFrameStage.appendChild(frameLoader);
  }

  // 2. ऑथेंटिकेशन और क्लास डिटेक्शन
  const auth = (window.NischayConfig && window.NischayConfig.authInstance) 
               ? window.NischayConfig.authInstance 
               : (typeof firebase !== 'undefined' && firebase.auth ? firebase.auth() : null);

  if (auth) {
    auth.onAuthStateChanged(function (user) {
      initNotes(user);
    });
  } else {
    initNotes(null);
  }

  // 3. गूगल ड्राइव आईडी एक्सट्रैक्टर
  function extractDriveId(url) {
    if (!url) return null;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];
    const matchParam = url.match(/id=([a-zA-Z0-9_-]+)/);
    return (matchParam && matchParam[1]) ? matchParam[1] : null;
  }

  // सुरक्षित इन-ऐप प्रीव्यू (थ्री-डॉट और ऐप रीडायरेक्शन रोकने के लिए minimal मोड)
  function getSafePreviewUrl(rawUrl) {
    const fileId = extractDriveId(rawUrl);
    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/preview?rm=minimal`;
    }
    return rawUrl;
  }

  // 4. 🔥 डिवाइस में सीधे PDF डाउनलोड कराने वाला इंजन (Direct Mobile Storage Download)
  window.downloadPdfDirectly = async function (rawUrl, fileName, triggerBtn) {
    const fileId = extractDriveId(rawUrl);
    if (!fileId) {
      alert("डाउनलोड लिंक उपलब्ध नहीं है!");
      return;
    }

    const originalText = triggerBtn ? triggerBtn.innerHTML : '';
    if (triggerBtn) {
      triggerBtn.disabled = true;
      triggerBtn.innerHTML = '⏳ डाउनलोडिंग...';
    }

    // डायरेक्ट फ़ाइल डाउनलोड ट्रिगर
    const directDownloadEndpoint = `https://drive.google.com/uc?export=download&id=${fileId}`;
    
    const hiddenLink = document.createElement('a');
    hiddenLink.href = directDownloadEndpoint;
    hiddenLink.setAttribute('download', `${fileName || 'NischayDesk_Notes'}.pdf`);
    hiddenLink.setAttribute('target', '_blank');
    document.body.appendChild(hiddenLink);
    hiddenLink.click();
    document.body.removeChild(hiddenLink);

    setTimeout(() => {
      if (triggerBtn) {
        triggerBtn.disabled = false;
        triggerBtn.innerHTML = originalText;
      }
    }, 2000);
  };

  function initNotes(currentUser) {
    if (!window.NischaySyllabus || !window.NischaySyllabus.subjects) {
      setTimeout(() => initNotes(currentUser), 200);
      return;
    }

    const isUserLoggedIn = !!currentUser;
    let studentClass = null;

    if (isUserLoggedIn) {
      const profile = localStorage.getItem('nischay_user_profile');
      if (profile) {
        try {
          const parsed = JSON.parse(profile);
          studentClass = parsed.studentClass;
        } catch (e) {}
      }
      if (!studentClass) {
        studentClass = localStorage.getItem('nischay_student_class') || '10';
      }
    }

    adjustFilterPills(isUserLoggedIn, studentClass);

    allChaptersMaster = [];
    window.NischaySyllabus.subjects.forEach(function (subject) {
      if (isUserLoggedIn && studentClass) {
        if (!subject.id.startsWith(studentClass + '-')) return;
      }

      if (subject.chapters && Array.isArray(subject.chapters)) {
        subject.chapters.forEach(function (ch) {
          allChaptersMaster.push({
            subjectId: subject.id,
            classTitle: subject.classTitle || "NischayDesk",
            subjectTitle: subject.subjectTitle || "विषय",
            no: ch.no,
            name: ch.name,
            pdfUrl: ch.pdfUrl || '',
            pages: ch.pages || 'हैंडनोट्स',
            desc: ch.desc || 'बोर्ड परीक्षा के लिए महत्वपूर्ण हस्तलिखित नोट्स।'
          });
        });
      }
    });

    renderNotesGrid();
  }

  function adjustFilterPills(isLoggedIn, sClass) {
    if (!filterPillContainer) return;
    const filterButtons = filterPillContainer.querySelectorAll('.filter-btn');

    filterButtons.forEach(btn => {
      const filterVal = btn.getAttribute('data-filter');
      if (filterVal === 'all') {
        btn.style.display = 'inline-block';
        return;
      }

      if (!isLoggedIn) {
        btn.style.display = 'inline-block';
      } else {
        if (filterVal.startsWith(sClass + '-')) {
          btn.style.display = 'inline-block';
        } else {
          btn.style.display = 'none';
        }
      }
    });
  }

  // 5. मॉडर्न और अट्रैक्टिव कार्ड्स रेंडरर (Brand New Look)
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
        <div style="grid-column: 1 / -1; padding: 60px 20px; text-align: center; background: #0c1633; border: 1.5px dashed #1e3a8a; border-radius: 18px;">
          <div style="font-size: 2.8rem; margin-bottom: 12px;">📑</div>
          <h3 style="color: #ffffff; font-size: 1.2rem; margin-bottom: 6px; font-weight: 800;">कोई नोट्स नहीं मिले</h3>
          <p style="font-size: 0.88rem; color: #94a3b8; margin: 0;">कृपया दूसरा विषय फ़िल्टर चुनें या कोई अन्य अध्याय खोजें।</p>
        </div>
      `;
      return;
    }

    let htmlBuffer = '';
    filtered.forEach(function (note) {
      const hasPdf = note.pdfUrl && note.pdfUrl.trim() !== '' && note.pdfUrl !== '#';
      
      const readAction = hasPdf 
        ? `onclick="window.openNoteModal('${note.classTitle}', '${escapeHtml(note.name)}', '${note.pdfUrl}')"`
        : `onclick="alert('अध्याय ${note.no} (${escapeHtml(note.name)}) के नोट्स जल्द जोड़े जा रहे हैं!')"`;

      const downloadAction = hasPdf
        ? `onclick="window.downloadPdfDirectly('${note.pdfUrl}', '${escapeHtml(note.name)}', this)"`
        : `onclick="alert('PDF डाउनलोड लिंक जल्द उपलब्ध होगा!')"`;

      htmlBuffer += `
        <div class="note-pro-card" style="background: linear-gradient(145deg, #0e1938, #091126); border: 1.5px solid rgba(56, 189, 248, 0.2); border-radius: 18px; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 10px 25px rgba(0,0,0,0.35); position: relative; overflow: hidden; transition: all 0.25s ease;">
          
          <!-- टॉप ग्रेडिएंट हाइलाइटर -->
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 3.5px; background: linear-gradient(90deg, #0284c7, #38bdf8, #818cf8);"></div>

          <div>
            <!-- सब्जेक्ट और पेज काउंट रो -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <span style="background: rgba(56, 189, 248, 0.12); color: #38bdf8; font-size: 0.74rem; font-weight: 800; padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(56, 189, 248, 0.25); letter-spacing: 0.3px;">
                ${note.subjectTitle}
              </span>
              <span style="font-size: 0.72rem; color: #cbd5e1; font-weight: 700; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); padding: 3px 8px; border-radius: 6px;">
                📄 ${note.pages || 'हैंडनोट्स'}
              </span>
            </div>

            <!-- चैप्टर नंबर और नाम -->
            <div style="display: flex; gap: 12px; align-items: flex-start; margin-bottom: 10px;">
              <div style="background: rgba(2, 132, 199, 0.2); color: #38bdf8; min-width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem; border: 1px solid rgba(56, 189, 248, 0.4); flex-shrink: 0;">
                ${note.no}
              </div>
              <h3 style="font-size: 1.02rem; margin: 0; color: #ffffff; font-weight: 800; line-height: 1.42; letter-spacing: 0.2px;">
                ${note.name}
              </h3>
            </div>

            <!-- विवरण -->
            <p style="font-size: 0.8rem; color: #94a3b8; line-height: 1.55; margin: 0 0 18px; padding-left: 46px;">
              ${note.desc}
            </p>
          </div>

          <!-- एक्शन बटन्स (प्रीमियम डुअल बटन्स) -->
          <div style="display: flex; gap: 10px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.08);">
            <button class="btn-read-note" ${readAction} style="flex: 1.4; background: linear-gradient(135deg, #0284c7, #2563eb); color: #ffffff; border: none; padding: 11px; border-radius: 10px; font-size: 0.84rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);">
              📖 <span>नोट्स पढ़ें</span>
            </button>
            <button class="btn-download-note" ${downloadAction} style="flex: 1; background: rgba(56, 189, 248, 0.08); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 11px; border-radius: 10px; font-size: 0.84rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
              📥 <span>PDF</span>
            </button>
          </div>
        </div>
      `;
    });

    notesCatalogGrid.innerHTML = htmlBuffer;
  }

  // 6. मोडल ओपन और क्लोज
  window.openNoteModal = function (classTitle, title, pdfUrl) {
    if (!pdfStudioModal || !studioPdfFrame) return;

    if (modalDocBadge) modalDocBadge.innerText = classTitle;
    if (modalDocTitle) modalDocTitle.innerText = title;
    
    if (frameLoader) frameLoader.style.display = 'flex';

    const cleanPreview = getSafePreviewUrl(pdfUrl);
    studioPdfFrame.src = cleanPreview;

    studioPdfFrame.onload = function () {
      if (frameLoader) frameLoader.style.display = 'none';
    };

    if (modalDirectDownloadBtn) {
      modalDirectDownloadBtn.onclick = function (e) {
        e.preventDefault();
        window.downloadPdfDirectly(pdfUrl, title, modalDirectDownloadBtn);
      };
    }

    pdfStudioModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  function closeNoteModal() {
    if (!pdfStudioModal || !studioPdfFrame) return;
    pdfStudioModal.classList.remove('active');
    studioPdfFrame.src = '';
    if (frameLoader) frameLoader.style.display = 'none';
    document.body.style.overflow = '';
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeNoteModal);
  if (pdfStudioModal) {
    pdfStudioModal.addEventListener('click', function (e) {
      if (e.target === pdfStudioModal) closeNoteModal();
    });
  }

  // Escape key से बंद होना
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pdfStudioModal && pdfStudioModal.classList.contains('active')) {
      closeNoteModal();
    }
  });

  // फुलस्क्रीन टॉगल
  if (modalFullscreenBtn) {
    modalFullscreenBtn.addEventListener('click', function() {
      const stage = document.getElementById('pdfFrameStage') || studioPdfFrame;
      if (!document.fullscreenElement) {
        if (stage.requestFullscreen) stage.requestFullscreen();
        else if (stage.webkitRequestFullscreen) stage.webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    });
  }

  // फ़िल्टर और सर्च
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

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }
});
