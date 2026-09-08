/* ==========================================================================
   NischayDesk Direct Render Notes Engine (Instant Fix)
   ========================================================================== */

(function initNotesViewer() {
  function startEngine() {
    const notesCatalogGrid = document.getElementById('notesCatalogGrid');
    const notesSearchInput = document.getElementById('notesSearchInput');
    const filterPillContainer = document.getElementById('filterPillContainer');
    
    const pdfStudioModal = document.getElementById('pdfStudioModal');
    const studioPdfFrame = document.getElementById('studioPdfFrame');
    const modalDocTitle = document.getElementById('modalDocTitle');
    const modalDocBadge = document.getElementById('modalDocBadge');
    const modalDirectDownloadBtn = document.getElementById('modalDirectDownloadBtn');
    const modalFullscreenBtn = document.getElementById('modalFullscreenBtn');
    const modalCloseBtn = document.getElementById('modalCloseBtn');

    if (!notesCatalogGrid) return;

    let activeFilter = 'all';
    let searchQuery = '';

    // Data Checker
    const subjects = (window.NischaySyllabus && window.NischaySyllabus.subjects) ? window.NischaySyllabus.subjects : [];

    if (subjects.length === 0) {
      notesCatalogGrid.innerHTML = `
        <div class="loading-state-box">
          <p style="color:var(--danger); font-weight:700;">⚠️ 'syllabus-data.js' लोड नहीं हुई।</p>
        </div>
      `;
      return;
    }

    // 1. Build Filter Pills (No duplicates)
    if (filterPillContainer) {
      let pillsHtml = `<button class="filter-btn active" data-filter="all">सभी विषय</button>`;
      subjects.forEach(function (sub) {
        const cleanName = sub.subjectTitle.startsWith(sub.classTitle.replace('Class ', ''))
          ? sub.subjectTitle
          : `${sub.classTitle.replace('Class ', '')} ${sub.subjectTitle}`;

        pillsHtml += `<button class="filter-btn" data-filter="${sub.id}">${cleanName}</button>`;
      });

      filterPillContainer.innerHTML = pillsHtml;

      filterPillContainer.querySelectorAll('.filter-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          filterPillContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeFilter = btn.getAttribute('data-filter') || 'all';
          renderAllCards();
        });
      });
    }

    // 2. Direct Render Cards Function
    function renderAllCards() {
      const q = searchQuery.toLowerCase();
      let displayList = subjects;

      if (activeFilter !== 'all') {
        displayList = displayList.filter(s => s.id === activeFilter);
      }

      let html = '';
      let matchFound = 0;

      displayList.forEach(function (subject) {
        const matchingChapters = subject.chapters.filter(function (ch) {
          return ch.name.toLowerCase().includes(q) || (ch.desc && ch.desc.toLowerCase().includes(q));
        });

        if (matchingChapters.length === 0) return;
        matchFound += matchingChapters.length;

        const pureSubjectName = subject.subjectTitle.replace(/^10th\s*|^11th\s*|^12th\s*/i, '').trim();

        html += `
          <div style="grid-column: 1 / -1; margin-top: 24px; margin-bottom: 8px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="background:var(--brand-primary); color:#fff; font-size:0.75rem; font-weight:800; padding:4px 10px; border-radius:4px;">${subject.classTitle}</span>
              <h2 style="font-size:1.25rem; color:var(--text-pure); font-weight:800;">${pureSubjectName}</h2>
            </div>
          </div>
        `;

        matchingChapters.forEach(function (ch) {
          const isReady = (ch.status === 'ready' && ch.pdfUrl && ch.pdfUrl.trim() !== "");

          html += `
            <div class="note-item-card">
              <div>
                <div class="note-badge-row">
                  <span class="note-badge-class">अध्याय ${ch.no}</span>
                  <span class="note-badge-pages" style="${isReady ? 'color:var(--success); font-weight:700;' : 'color:var(--warning);'}">
                    ${isReady ? '● उपलब्ध' : '⏳ जल्द आ रहा है'}
                  </span>
                </div>
                <h3 style="margin-bottom:8px;">${ch.name}</h3>
                <p style="font-size:0.84rem; color:var(--text-secondary); line-height:1.45; margin-bottom:18px;">${ch.desc || ''}</p>
              </div>

              <div class="note-btn-group">
                ${isReady ? `
                  <button class="btn-read-note" data-sub="${subject.id}" data-chno="${ch.no}">📖 नोट्स खोलें</button>
                  <a href="${ch.pdfUrl}" target="_blank" class="btn-download-note" download>📥 PDF</a>
                ` : `
                  <button class="btn-stage-secondary" style="grid-column: 1 / -1; width:100%; opacity:0.6; cursor:not-allowed;" disabled>
                    अपलोडिंग जारी है...
                  </button>
                `}
              </div>
            </div>
          `;
        });
      });

      if (matchFound === 0) {
        html = `
          <div class="loading-state-box">
            <div style="font-size:2rem; margin-bottom:8px;">🔍</div>
            <p>कोई चैप्टर नहीं मिला।</p>
          </div>
        `;
      }

      // Force Overwrite (Removes the stuck loading text instantly)
      notesCatalogGrid.innerHTML = html;

      // Attach Click events to PDF buttons
      notesCatalogGrid.querySelectorAll('.btn-read-note').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const subId = btn.getAttribute('data-sub');
          const chNo = parseInt(btn.getAttribute('data-chno') || '0', 10);
          openPdf(subId, chNo);
        });
      });
    }

    // 3. Open In-App PDF Studio
    function openPdf(subId, chNo) {
      const sub = subjects.find(s => s.id === subId);
      if (!sub) return;
      const ch = sub.chapters.find(c => c.no === chNo);
      if (!ch || !ch.pdfUrl) return;

      const pureSubName = sub.subjectTitle.replace(/^10th\s*|^11th\s*|^12th\s*/i, '').trim();

      if (modalDocTitle) modalDocTitle.innerText = ch.name;
      if (modalDocBadge) modalDocBadge.innerText = `${sub.classTitle} - ${pureSubName}`;
      if (modalDirectDownloadBtn) modalDirectDownloadBtn.href = ch.pdfUrl;

      if (studioPdfFrame) studioPdfFrame.src = ch.pdfUrl;
      if (pdfStudioModal) pdfStudioModal.classList.add('active');
      document.body.style.overflow = 'hidden';

      if (window.NischayAuth && typeof window.NischayAuth.saveToCloudLocker === 'function') {
        window.NischayAuth.saveToCloudLocker('नोट्स पढ़े', `${pureSubName}: ${ch.name}`);
      }
    }

    // Modal Close Events
    function closePdf() {
      if (!pdfStudioModal || !studioPdfFrame) return;
      pdfStudioModal.classList.remove('active');
      studioPdfFrame.src = '';
      document.body.style.overflow = '';
    }

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closePdf);
    if (pdfStudioModal) {
      pdfStudioModal.addEventListener('click', function (e) {
        if (e.target === pdfStudioModal) closePdf();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePdf();
    });

    if (modalFullscreenBtn) {
      modalFullscreenBtn.addEventListener('click', function () {
        const stage = document.getElementById('pdfFrameStage');
        if (!stage) return;
        if (!document.fullscreenElement) {
          stage.requestFullscreen().catch(err => alert("फुल स्क्रीन एरर: " + err.message));
        } else {
          document.exitFullscreen();
        }
      });
    }

    // Search Input Event
    if (notesSearchInput) {
      notesSearchInput.addEventListener('input', function () {
        searchQuery = notesSearchInput.value.trim();
        renderAllCards();
      });
    }

    // Direct Instant Render Call
    renderAllCards();
  }

  // Double check execution for DOM Readiness
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startEngine);
  } else {
    startEngine();
  }
})();
