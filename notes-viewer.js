/* ==========================================================================
   NischayDesk Safe & Fast Notes Viewer Engine (v4.0)
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

  let allChaptersMaster = [];
  let currentFilterSubject = 'all';
  let searchQuery = '';

  function initNotes() {
    if (!window.NischaySyllabus || !window.NischaySyllabus.subjects) {
      // अगर डेटा लोड होने में 1 सेकंड लगे तो दोबारा प्रयास करें
      setTimeout(initNotes, 200);
      return;
    }

    const studentClass = localStorage.getItem('nischay_student_class') || '10';
    allChaptersMaster = [];

    window.NischaySyllabus.subjects.forEach(function (subject) {
      // अगर यूजर 10वीं में है तो सिर्फ 10वीं के विषय लें
      if (studentClass === '10' && !subject.id.startsWith('10-')) return;
      if (studentClass === '11' && !subject.id.startsWith('11-')) return;
      if (studentClass === '12' && !subject.id.startsWith('12-')) return;

      if (subject.chapters && Array.isArray(subject.chapters)) {
        subject.chapters.forEach(function (ch) {
          allChaptersMaster.push({
            subjectId: subject.id,
            classTitle: subject.classTitle || `Class ${studentClass}th`,
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
        item.subjectTitle.toLowerCase().includes(q);

      return matchSubject && matchSearch;
    });

    if (filtered.length === 0) {
      notesCatalogGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 50px 20px; text-align: center; color: var(--text-secondary);">
          <div style="font-size: 2.5rem; margin-bottom: 10px;">📋</div>
          <h3 style="color: var(--text-pure); font-size: 1.1rem; margin-bottom: 6px;">कोई नोट्स नहीं मिले</h3>
          <p style="font-size: 0.85rem;">कृपया दूसरा विषय चुनें या सर्च बदलें।</p>
        </div>
      `;
      return;
    }

    let htmlBuffer = '';
    filtered.forEach(function (note) {
      const hasPdf = note.pdfUrl && note.pdfUrl.trim() !== '' && note.pdfUrl !== '#';
      const readAction = hasPdf 
        ? `onclick="window.openNoteModal('${note.classTitle}', '${escapeHtml(note.name)}', '${note.pdfUrl}')"`
        : `onclick="alert('अध्याय ${note.no} के नोट्स जल्द जोड़े जा रहे हैं!')"`;

      const downloadAction = hasPdf
        ? `href="${note.pdfUrl}" target="_blank"`
        : `href="javascript:void(0)" onclick="alert('PDF डाउनलोड लिंक जल्द उपलब्ध होगा!')"`;

      htmlBuffer += `
        <div class="note-item-card" style="background: var(--surface-card, #0c1633); border: 1px solid var(--border-strong, #1e366a); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 4px;">${note.subjectTitle}</span>
              <span style="font-size: 0.72rem; color: var(--text-secondary); font-weight: 600;">अध्याय ${note.no}</span>
            </div>
            <h3 style="font-size: 0.95rem; margin: 4px 0 8px; color: var(--text-pure); font-weight: 700; line-height: 1.35;">${note.name}</h3>
            <p style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.45; margin-bottom: 14px;">${note.desc}</p>
          </div>

          <div style="display: flex; gap: 8px;">
            <button class="btn-read-note" ${readAction} style="flex: 1; background: #0284c7; color: #fff; border: none; padding: 8px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer;">
              📖 नोट्स पढ़ें
            </button>
            <a class="btn-download-note" ${downloadAction} style="background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 8px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; text-decoration: none; display: flex; align-items: center;">
              📥 PDF
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
    
    let secureUrl = pdfUrl;
    if (secureUrl.includes('drive.google.com/file/d/')) {
      secureUrl = secureUrl.replace('/view?usp=sharing', '/preview')
                           .replace('/view?usp=drivesdk', '/preview')
                           .replace('/view', '/preview');
    }

    studioPdfFrame.src = secureUrl;
    if (modalDirectDownloadBtn) modalDirectDownloadBtn.href = pdfUrl;

    pdfStudioModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  function closeNoteModal() {
    if (!pdfStudioModal || !studioPdfFrame) return;
    pdfStudioModal.classList.remove('active');
    studioPdfFrame.src = '';
    document.body.style.overflow = '';
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeNoteModal);
  if (pdfStudioModal) {
    pdfStudioModal.addEventListener('click', function (e) {
      if (e.target === pdfStudioModal) closeNoteModal();
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

  initNotes();
});
