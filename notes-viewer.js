/* ==========================================================================
   NischayDesk Notes Catalog Explorer & In-App PDF Studio
   Architecture & Logic: Prince Kumar
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {

  const notesCatalogGrid = document.getElementById('notesCatalogGrid');
  const notesSearchInput = document.getElementById('notesSearchInput');
  const filterPillContainer = document.getElementById('filterPillContainer');

  // Modal Elements
  const pdfStudioModal = document.getElementById('pdfStudioModal');
  const studioPdfFrame = document.getElementById('studioPdfFrame');
  const modalDocBadge = document.getElementById('modalDocBadge');
  const modalDocTitle = document.getElementById('modalDocTitle');
  const modalDirectDownloadBtn = document.getElementById('modalDirectDownloadBtn');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalFullscreenBtn = document.getElementById('modalFullscreenBtn');

  // Guard: Only execute on notes.html
  if (!notesCatalogGrid) return;

  let allChaptersMaster = [];
  let currentFilter = 'all';

  // 1. Flatten Chapters from syllabus-data.js into a clean array
  function extractAllChapters() {
    allChaptersMaster = [];
    if (!window.NischaySyllabus || !window.NischaySyllabus.subjects) return;

    window.NischaySyllabus.subjects.forEach(function (subject) {
      if (subject.chapters && Array.isArray(subject.chapters)) {
        subject.chapters.forEach(function (ch) {
          allChaptersMaster.push({
            subjectId: subject.id,
            classTitle: subject.classTitle,
            subjectTitle: subject.subjectTitle,
            no: ch.no,
            name: ch.name,
            status: ch.status || 'pending',
            pdfUrl: ch.pdfUrl || '',
            pages: ch.pages || 'हैंडनोट्स',
            desc: ch.desc || ''
          });
        });
      }
    });
  }

  // 2. Render Note Cards in Catalog Grid
  function renderNotes(chapters) {
    notesCatalogGrid.innerHTML = '';

    if (!chapters || chapters.length === 0) {
      notesCatalogGrid.innerHTML = `
        <div class="loading-state-box" style="grid-column: 1 / -1; padding: 40px 10px; text-align: center;">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">📭</div>
          <h3 style="color: var(--text-pure); font-size: 1.1rem; margin-bottom: 4px;">कोई नोट्स नहीं मिले!</h3>
          <p style="color: var(--text-secondary); font-size: 0.85rem;">कृपया दूसरा विषय चुनें या सर्च में सही कीवर्ड टाइप करें।</p>
        </div>
      `;
      return;
    }

    chapters.forEach(function (ch) {
      const card = document.createElement('div');
      card.className = 'note-item-card';

      const isReady = (ch.status === 'ready' && ch.pdfUrl && ch.pdfUrl.trim() !== '');

      card.innerHTML = `
        <div>
          <div class="note-badge-row">
            <span class="note-badge-class">${ch.classTitle} • ${ch.subjectTitle}</span>
            <span class="note-badge-pages">${ch.pages}</span>
          </div>
          <h3>अध्याय ${ch.no}: ${ch.name}</h3>
          <p>${ch.desc || 'बोर्ड परीक्षा 2026-2028 के लिए टॉपर्स एवं अनुभवी शिक्षकों द्वारा तैयार सटीक नोट्स।'}</p>
        </div>
        <div class="note-btn-group">
          ${isReady 
            ? `<button type="button" class="btn-read-note" data-url="${ch.pdfUrl}" data-title="${ch.name}" data-badge="${ch.classTitle} • ${ch.subjectTitle}">📖 नोट्स पढ़ें</button>`
            : `<button type="button" class="btn-read-note" style="opacity:0.6; cursor:not-allowed;" disabled>⏳ जल्द आ रहा है</button>`
          }
          ${isReady 
            ? `<a href="${ch.pdfUrl}" target="_blank" rel="noopener noreferrer" class="btn-download-note" download title="डाउनलोड करें">📥 डाउनलोड</a>`
            : `<span class="btn-download-note" style="opacity:0.5; pointer-events:none;">🔒 लॉक्ड</span>`
          }
        </div>
      `;

      notesCatalogGrid.appendChild(card);
    });

    // Attach Click Events to "Read Note" buttons
    document.querySelectorAll('.btn-read-note').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const pdfUrl = this.getAttribute('data-url');
        const docTitle = this.getAttribute('data-title');
        const docBadge = this.getAttribute('data-badge');
        if (pdfUrl) {
          openPdfStudio(pdfUrl, docTitle, docBadge);
        }
      });
    });
  }

  // 3. Filter and Search Combined Engine
  function applyFilterAndSearch() {
    const query = notesSearchInput ? notesSearchInput.value.toLowerCase().trim() : '';

    const filtered = allChaptersMaster.filter(function (ch) {
      // Filter Match
      const matchesFilter = (currentFilter === 'all') || 
                            (ch.subjectId === currentFilter) ||
                            (currentFilter === '10-science' && ch.subjectId.startsWith('10-science')) ||
                            (currentFilter === '10-math' && ch.subjectId === '10-math') ||
                            (currentFilter === '10-sst' && ch.subjectId === '10-sst') ||
                            (currentFilter === '10-sanskrit' && ch.subjectId === '10-sanskrit');

      // Search Match
      const matchesSearch = !query || 
                            ch.name.toLowerCase().includes(query) ||
                            ch.subjectTitle.toLowerCase().includes(query) ||
                            ch.desc.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });

    renderNotes(filtered);
  }

  // 4. In-Built Studio PDF Viewer Controls
  function openPdfStudio(url, title, badge) {
    if (!pdfStudioModal || !studioPdfFrame) return;

    if (modalDocTitle) modalDocTitle.innerText = title || 'अध्याय नोट्स';
    if (modalDocBadge) modalDocBadge.innerText = badge || 'NischayDesk Verified';
    if (modalDirectDownloadBtn) modalDirectDownloadBtn.href = url;

    studioPdfFrame.src = url;
    pdfStudioModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closePdfStudio() {
    if (!pdfStudioModal || !studioPdfFrame) return;
    studioPdfFrame.src = '';
    pdfStudioModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closePdfStudio);
  }

  if (pdfStudioModal) {
    pdfStudioModal.addEventListener('click', function (e) {
      if (e.target === pdfStudioModal) {
        closePdfStudio();
      }
    });
  }

  if (modalFullscreenBtn) {
    modalFullscreenBtn.addEventListener('click', function () {
      if (!document.fullscreenElement) {
        pdfStudioModal.requestFullscreen().catch(function (err) {
          console.warn("Fullscreen Error:", err);
        });
      } else {
        document.exitFullscreen();
      }
    });
  }

  // 5. Setup Filter Pill Button Clicks
  if (filterPillContainer) {
    filterPillContainer.querySelectorAll('.filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterPillContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.getAttribute('data-filter') || 'all';
        applyFilterAndSearch();
      });
    });
  }

  // 6. Setup Search Input Event
  if (notesSearchInput) {
    notesSearchInput.addEventListener('input', applyFilterAndSearch);
  }

  // 7. Initial Catalog Extraction & Render
  extractAllChapters();
  renderNotes(allChaptersMaster);

});
