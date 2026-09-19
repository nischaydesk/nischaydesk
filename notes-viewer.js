/* ==========================================================================
   NischayDesk Dynamic Role-Based Notes Controller (v5.0 - Absolute Zero Gmail Leak)
   Rule 1: Guest (Not Logged In) -> All Classes (10th, 11th, 12th) Fully Visible
   Rule 2: Logged In -> Strictly Filter to Student's Selected Class
   Rule 3: Clean In-App Viewer via Docs Engine (No Drive Menus, No Gmail Exposure)
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

  // इन-ऐप लोडिंग इंडिकेटर (Iframe लोड होते वक्त)
  let frameLoader = null;
  if (pdfFrameStage) {
    frameLoader = document.createElement('div');
    frameLoader.id = 'pdfInternalLoader';
    frameLoader.style.cssText = 'position:absolute; inset:0; display:none; align-items:center; justify-content:center; flex-direction:column; background:rgba(11,19,41,0.9); z-index:10; color:#38bdf8; font-family:inherit;';
    frameLoader.innerHTML = '<div style="width:36px; height:36px; border:3.5px solid rgba(56,189,248,0.2); border-top-color:#38bdf8; border-radius:50%; animation:spinLoader 0.8s linear infinite; margin-bottom:12px;"></div><span style="font-size:0.85rem; font-weight:700;">सुरक्षित नोट्स लोड हो रहे हैं...</span><style>@keyframes spinLoader{to{transform:rotate(360deg)}}</style>';
    pdfFrameStage.style.position = 'relative';
    pdfFrameStage.appendChild(frameLoader);
  }

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

  // ड्राइव आईडी निकालकर 100% सुरक्षित और बिना Gmail वाले लिंक तैयार करना
  function extractDriveId(url) {
    if (!url) return null;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];
    const matchParam = url.match(/id=([a-zA-Z0-9_-]+)/);
    return (matchParam && matchParam[1]) ? matchParam[1] : null;
  }

  // ZERO GMAIL LEAK: Docs Viewer एम्बेड इंजन (कोई गूगल ड्राइव मेनू या ओनर डिटेल नहीं दिखती)
  function getSafePreviewUrl(rawUrl) {
    const fileId = extractDriveId(rawUrl);
    if (fileId) {
      const directSource = encodeURIComponent(`https://drive.google.com/uc?export=view&id=${fileId}`);
      return `https://docs.google.com/viewer?url=${directSource}&embedded=true`;
    }
    return rawUrl;
  }

  // सुरक्षित डायरेक्ट डाउनलोड लिंक
  function getSafeDownloadUrl(rawUrl) {
    const fileId = extractDriveId(rawUrl);
    if (fileId) {
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    return rawUrl;
  }

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
        <div style="grid-column: 1 / -1; padding: 50px 20px; text-align: center; color: var(--text-secondary);">
          <div style="font-size: 2.5rem; margin-bottom: 10px;">📋</div>
          <h3 style="color: var(--text-pure); font-size: 1.1rem; margin-bottom: 6px;">कोई नोट्स नहीं मिले</h3>
          <p style="font-size: 0.85rem;">कृपया दूसरा विषय चुनें या सर्च बॉक्स में दूसरा नाम लिखें।</p>
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

      const directDownloadUrl = hasPdf ? getSafeDownloadUrl(note.pdfUrl) : 'javascript:void(0)';
      const downloadAction = hasPdf
        ? `href="${directDownloadUrl}" target="_blank" download`
        : `onclick="alert('PDF डाउनलोड लिंक जल्द उपलब्ध होगा!')"`;

      htmlBuffer += `
        <div class="note-item-card" style="background: var(--surface-card, #0c1633); border: 1px solid var(--border-strong, #1e366a); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.2s ease, border-color 0.2s ease;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 4px;">${note.subjectTitle}</span>
              <span style="font-size: 0.72rem; color: var(--text-secondary); font-weight: 600;">अध्याय ${note.no}</span>
            </div>
            <h3 style="font-size: 0.95rem; margin: 4px 0 8px; color: var(--text-pure); font-weight: 700; line-height: 1.35;">${note.name}</h3>
            <p style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.45; margin-bottom: 14px;">${note.desc}</p>
          </div>

          <div style="display: flex; gap: 8px;">
            <button class="btn-read-note" ${readAction} style="flex: 1; background: #0284c7; color: #fff; border: none; padding: 8px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
              📖 <span>नोट्स पढ़ें</span>
            </button>
            <a class="btn-download-note" ${downloadAction} style="background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 8px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; text-decoration: none; display: flex; align-items: center; gap: 4px;">
              📥 <span>PDF</span>
            </a>
          </div>
        </div>
      `;
    });

    notesCatalogGrid.innerHTML = htmlBuffer;
  }

  window.openNoteModal = function (classTitle, title, pdfUrl) {
    if (!pdfStudioModal || !studioPdfFrame) return;

    if (modalDocBadge) modalDocBadge.innerText = classTitle;
    if (modalDocTitle) modalDocTitle.innerText = title;
    
    // लोडर दिखाएं जब तक सुरक्षित डॉक्स व्यूअर लोड हो
    if (frameLoader) frameLoader.style.display = 'flex';

    // सुरक्षित URL लोड करें (Docs Viewer इंजन)
    const cleanPreview = getSafePreviewUrl(pdfUrl);
    studioPdfFrame.src = cleanPreview;

    studioPdfFrame.onload = function () {
      if (frameLoader) frameLoader.style.display = 'none';
    };

    if (modalDirectDownloadBtn) {
      modalDirectDownloadBtn.href = getSafeDownloadUrl(pdfUrl);
      modalDirectDownloadBtn.setAttribute('target', '_blank');
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

  // कीबोर्ड 'Esc' बटन दबाते ही मोडल बंद करने का नया फीचर
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pdfStudioModal && pdfStudioModal.classList.contains('active')) {
      closeNoteModal();
    }
  });

  // फुल-स्क्रीन टॉगल
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

