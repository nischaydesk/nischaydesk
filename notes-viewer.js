/* ==========================================================================
   NischayDesk Complete Notes Controller (v5.0 Strict Class-Filter Edition)
   Architected by: Prince Kumar (NischayDesk)
   Features: Strict Class Separation (10th/11th/12th), Dynamic Pills,
             In-App HD Google Drive Previewer & Universal Theme Contrast
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

  let frameLoader = null;
  if (pdfFrameStage) {
    frameLoader = document.createElement('div');
    frameLoader.id = 'pdfInternalLoader';
    frameLoader.style.cssText = 'position:absolute; inset:0; display:none; align-items:center; justify-content:center; flex-direction:column; background:rgba(8,15,36,0.92); z-index:15; color:#38bdf8; font-family:inherit;';
    frameLoader.innerHTML = `
      <div style="width:40px; height:40px; border:3.5px solid rgba(56,189,248,0.2); border-top-color:#38bdf8; border-radius:50%; animation:spinDesk 0.75s linear infinite; margin-bottom:12px;"></div>
      <span style="font-size:0.88rem; font-weight:700; color:#ffffff;">नोट्स लोड हो रहे हैं...</span>
      <style>@keyframes spinDesk{to{transform:rotate(360deg)}}</style>
    `;
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
    return rawUrl;
  }

  window.downloadPdfDirectly = function (rawUrl) {
    const fileId = extractDriveId(rawUrl);
    if (!fileId) {
      alert("डाउनलोड लिंक उपलब्ध नहीं है!");
      return;
    }
    window.open(`https://drive.google.com/uc?export=download&id=${fileId}`, '_blank');
  };

  // 🎯 छात्र की सक्रिय कक्षा के अनुसार सिर्फ़ उसी क्लास का डेटा लोड करना
  function getActiveStudentClass() {
    const rawClass = localStorage.getItem('nd_selected_class') || 
                     localStorage.getItem('nischay_student_class') || 
                     localStorage.getItem('nischay_user_class') || '10th';
    const numOnly = String(rawClass).replace(/[^0-9]/g, '');
    return (numOnly === '11' || numOnly === '12') ? numOnly : '10';
  }

  function initNotes(currentUser) {
    if (!window.NischaySyllabus || !window.NischaySyllabus.subjects) {
      setTimeout(() => initNotes(currentUser), 200);
      return;
    }

    const activeClass = getActiveStudentClass();

    // 1. फ़िल्टर पिल्स (बटनों) को चुनी गई क्लास के अनुसार एडजस्ट करें
    adjustFilterPills(activeClass);

    // 2. मास्टर लिस्ट में सिर्फ़ सक्रिय क्लास के चैप्टर्स डालें
    allChaptersMaster = [];
    window.NischaySyllabus.subjects.forEach(function (subject) {
      // यदि सब्जेक्ट आईडी उस क्लास से शुरू नहीं होती, तो पूरी तरह छोड़ दें
      if (!subject.id.startsWith(activeClass + '-')) return;

      if (subject.chapters && Array.isArray(subject.chapters)) {
        subject.chapters.forEach(function (ch) {
          allChaptersMaster.push({
            subjectId: subject.id,
            classTitle: subject.classTitle || `Class ${activeClass}th`,
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

    currentFilterSubject = 'all';
    renderNotesGrid();
  }

  function adjustFilterPills(sClass) {
    if (!filterPillContainer) return;
    const filterButtons = filterPillContainer.querySelectorAll('.filter-btn');

    filterButtons.forEach(btn => {
      const filterVal = btn.getAttribute('data-filter');
      
      // "सभी विषय" का बटन हमेशा दिखेगा
      if (filterVal === 'all') {
        btn.style.display = 'inline-block';
        btn.classList.add('active');
        return;
      }

      btn.classList.remove('active');

      // केवल उसी क्लास के विषय बटन दिखेंगे जो छात्र ने चुनी है
      if (filterVal.startsWith(sClass + '-')) {
        btn.style.display = 'inline-block';
      } else {
        btn.style.display = 'none';
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
        <div class="loading-state-box" style="text-align:center; padding:40px 16px; width:100%; grid-column:1/-1;">
          <div style="font-size: 2.8rem; margin-bottom: 10px;">📚</div>
          <h3 class="card-title" style="font-size: 1.2rem; margin-bottom: 6px; color: var(--text-pure);">कोई नोट्स नहीं मिले</h3>
          <p class="card-desc" style="color: var(--text-secondary); font-size: 0.88rem;">कृपया दूसरा विषय चुनें या सर्च बॉक्स में दूसरा नाम लिखें।</p>
        </div>
      `;
      return;
    }

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
            <div class="note-badge-row">
              <span class="note-badge-class">
                ${note.subjectTitle}
              </span>
              <span class="note-badge-pages">
                📄 ${note.pages || 'हैंडनोट्स'}
              </span>
            </div>

            <div style="display: flex; gap: 10px; align-items: flex-start; margin-bottom: 8px;">
              <div style="background: rgba(56, 189, 248, 0.14); color: var(--brand-accent); min-width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem; flex-shrink: 0; border: 1px solid var(--border-subtle);">
                ${note.no}
              </div>
              <h3 style="font-size: 1rem; margin: 0; font-weight: 800; line-height: 1.4; color: var(--text-pure);">
                ${note.name}
              </h3>
            </div>

            <p class="note-desc" style="padding-left: 42px; font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 14px;">
              ${note.desc}
            </p>
          </div>

          <div class="note-btn-group" style="padding-top: 12px; border-top: 1px solid var(--border-subtle);">
            <button class="btn-read-note" ${readAction}>
              📖 <span>नोट्स पढ़ें</span>
            </button>
            <button class="btn-download-note" ${downloadAction}>
              📥 <span>डाउनलोड</span>
            </button>
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
    
    if (frameLoader) frameLoader.style.display = 'flex';

    studioPdfFrame.src = getSafePreviewUrl(pdfUrl);

    studioPdfFrame.onload = function () {
      if (frameLoader) frameLoader.style.display = 'none';
    };

    if (modalDirectDownloadBtn) {
      modalDirectDownloadBtn.onclick = function (e) {
        e.preventDefault();
        window.downloadPdfDirectly(pdfUrl);
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

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pdfStudioModal && pdfStudioModal.classList.contains('active')) {
      closeNoteModal();
    }
  });

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
