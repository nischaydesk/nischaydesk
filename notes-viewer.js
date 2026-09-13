/* ==========================================================================
   NischayDesk Dynamic Role-Based Notes Controller (v4.2)
   Rule 1: Guest (Not Logged In) -> All Classes (10th, 11th, 12th) Fully Visible
   Rule 2: Logged In -> Strictly Filter to Student's Selected Class
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

  const auth = (window.NischayConfig && window.NischayConfig.authInstance) 
               ? window.NischayConfig.authInstance 
               : (typeof firebase !== 'undefined' && firebase.auth ? firebase.auth() : null);

  // ऑथेंटिकेशन स्टेट को ध्यान में रखकर इनिशियलाइज करें
  if (auth) {
    auth.onAuthStateChanged(function (user) {
      initNotes(user);
    });
  } else {
    initNotes(null);
  }

  function initNotes(currentUser) {
    if (!window.NischaySyllabus || !window.NischaySyllabus.subjects) {
      setTimeout(() => initNotes(currentUser), 200);
      return;
    }

    // चेक करें कि यूजर लॉग इन है या गेस्ट
    const isUserLoggedIn = !!currentUser;
    let studentClass = null;

    if (isUserLoggedIn) {
      // लॉग इन यूजर की सेव्ड क्लास निकालें
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

    // 1. फ़िल्टर बटन (Pills) को यूजर रोल के अनुसार टॉगल करें
    adjustFilterPills(isUserLoggedIn, studentClass);

    // 2. मास्टर लिस्ट तैयार करें
    allChaptersMaster = [];
    window.NischaySyllabus.subjects.forEach(function (subject) {
      // अगर यूजर लॉग इन है, तो सिर्फ उसकी क्लास का डेटा लोड होगा
      if (isUserLoggedIn && studentClass) {
        if (!subject.id.startsWith(studentClass + '-')) return;
      }
      // अगर गेस्ट है (लॉग इन नहीं है), तो तीनों क्लास का डेटा लोड होगा

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

  // फ़िल्टर बटनों का विजिबिलिटी कंट्रोल
  function adjustFilterPills(isLoggedIn, sClass) {
    if (!filterPillContainer) return;
    const filterButtons = filterPillContainer.querySelectorAll('.filter-btn');

    filterButtons.forEach(btn => {
      const filterVal = btn.getAttribute('data-filter');

      // 'सभी विषय' हमेशा दिखेगा
      if (filterVal === 'all') {
        btn.style.display = 'inline-block';
        return;
      }

      if (!isLoggedIn) {
        // गेस्ट मोड: 10th, 11th, 12th के सारे बटन दिखेंगे
        btn.style.display = 'inline-block';
      } else {
        // लॉग इन मोड: सिर्फ और सिर्फ चुनी हुई क्लास वाले बटन दिखेंगे
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
});
