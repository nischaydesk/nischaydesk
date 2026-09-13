/* ==========================================================================
   NischayDesk Strict Class-Based Notes Viewer & In-App PDF Studio (v3.9)
   Supports: 10th (with Complete SST breakdown), 11th Science & 12th Science
   Architected by: Prince Kumar
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  const notesCatalogGrid = document.getElementById('notesCatalogGrid');
  const notesSearchInput = document.getElementById('notesSearchInput');
  const filterPillContainer = document.getElementById('filterPillContainer');

  // Modal Studio Elements
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

  let studentClass = localStorage.getItem('nischay_student_class') || '10';

  function extractAllChapters() {
    allChaptersMaster = [];
    if (!window.NischaySyllabus || !window.NischaySyllabus.subjects) {
      setTimeout(extractAllChapters, 150);
      return;
    }

    studentClass = localStorage.getItem('nischay_student_class') || '10';

    window.NischaySyllabus.subjects.forEach(function (subject) {
      // 10th वाले छात्र को केवल 10- से शुरू होने वाले विषय दिखेंगे
      if (studentClass === '10' && !subject.id.startsWith('10-')) return;
      // 11th वाले को केवल 11- वाले
      if (studentClass === '11' && !subject.id.startsWith('11-')) return;
      // 12th वाले को केवल 12- वाले
      if (studentClass === '12' && !subject.id.startsWith('12-')) return;

      if (subject.chapters && Array.isArray(subject.chapters)) {
        subject.chapters.forEach(function (ch) {
          allChaptersMaster.push({
            subjectId: subject.id,
            classTitle: subject.classTitle || `Class ${studentClass}th`,
            subjectTitle: subject.subjectTitle || "सामान्य",
            no: ch.no,
            name: ch.name,
            status: ch.status || 'available',
            pdfUrl: ch.pdfUrl || '',
            pages: ch.pages || 'हैंडनोट्स',
            desc: ch.desc || 'बोर्ड परीक्षा एवं गहन कॉन्सेप्ट्स के लिए तैयार हस्तलिखित नोट्स।'
          });
        });
      }
    });

    renderPillFilters();
    renderNotesGrid();
  }

  // फ़िल्टर बटन केवल चालू क्लास के हिसाब से दिखाएँ
  function renderPillFilters() {
    if (!filterPillContainer) return;

    const filterButtons = filterPillContainer.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      const filterVal = btn.getAttribute('data-filter');
      if (filterVal === 'all') {
        btn.style.display = 'inline-block';
      } else if (filterVal.startsWith(studentClass + '-')) {
        btn.style.display = 'inline-block';
      } else {
        btn.style.display = 'none';
      }
    });
  }

  // नोट्स कार्ड्स ग्रिड
  function renderNotesGrid() {
    if (!notesCatalogGrid) return;

    let filtered = allChaptersMaster.filter(function (item) {
      let matchSubject = false;
      if (currentFilterSubject === 'all') {
        matchSubject = true;
      } else if (currentFilterSubject === '10-sst-all') {
        // अगर छात्र "पूरा सामाजिक विज्ञान" चुने
        matchSubject = item.subjectId.startsWith('10-') && 
          ['10-history', '10-geography', '10-civics', '10-economics', '10-disaster'].includes(item.subjectId);
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
        <div class="loading-state-box" style="grid-column: 1 / -1; padding: 40px 16px; text-align: center;">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">📚</div>
          <h3 style="color: var(--text-pure); font-size: 1.1rem; margin-bottom: 4px;">कोई नोट्स नहीं मिले</h3>
          <p style="font-size: 0.84rem; color: var(--text-secondary);">
            कक्षा ${studentClass}वीं के इस फ़िल्टर के लिए कंटेंट संकलित किया जा रहा है।
          </p>
        </div>
      `;
      return;
    }

    let htmlBuffer = '';
    filtered.forEach(function (note) {
      const hasPdf = note.pdfUrl && note.pdfUrl.trim() !== '' && note.pdfUrl !== '#';
      const readAction = hasPdf 
        ? `onclick="window.openNoteModal('${note.classTitle}', '${escapeHtml(note.name)}', '${note.pdfUrl}')"`
        : `onclick="alert('अध्याय ${note.no} के हस्तलिखित नोट्स पीडीएफ शीघ्र जोड़ी जा रही है!')"`;

      const downloadAction = hasPdf
        ? `href="${note.pdfUrl}" target="_blank" download`
        : `href="javascript:void(0)" onclick="alert('PDF डाउनलोड लिंक जल्द सक्रिय होगा!')"`;

      htmlBuffer += `
        <div class="note-item-card">
          <div>
            <div class="note-badge-row">
              <span class="note-badge-class">${note.subjectTitle}</span>
              <span class="note-badge-pages">अध्याय ${note.no} • ${note.pages}</span>
            </div>
            <h3 style="font-size: 1rem; margin: 6px 0; color: var(--text-pure); line-height: 1.35;">${note.name}</h3>
            <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.45; margin-bottom: 12px;">${note.desc}</p>
          </div>

          <div class="note-btn-group">
            <button class="btn-read-note" ${readAction}>
              📖 नोट्स पढ़ें
            </button>
            <a class="btn-download-note" ${downloadAction}>
              📥 PDF
            </a>
          </div>
        </div>
      `;
    });

    notesCatalogGrid.innerHTML = htmlBuffer;
  }

  // इन-ऐप पीडीएफ मोडल
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

  if (modalFullscreenBtn) {
    modalFullscreenBtn.addEventListener('click', function () {
      const stage = document.getElementById('pdfFrameStage');
      if (!document.fullscreenElement) {
        if (stage.requestFullscreen) stage.requestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    });
  }

  // फ़िल्टर बटन क्लिक
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

  // लाइव सर्च
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

  extractAllChapters();
});
