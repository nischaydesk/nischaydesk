/* ==========================================================================
   NischayDesk Authentication & Cloud Session Manager
   Google Sign-In & User Identity Engine
   Architect: Prince Kumar
   ========================================================================== */

(function () {
  // Global User State Container
  window.NischayAuth = {
    currentUser: null,
    isLoggedIn: false,
    
    // Core Methods
    loginWithGoogle: handleGoogleSignIn,
    logout: handleSignOut,
    saveToCloudLocker: saveRecordToUserLocker,
    fetchCloudLocker: fetchUserLockerRecords
  };

  document.addEventListener('DOMContentLoaded', initAuthSystem);

  function initAuthSystem() {
    const headerAuthBtn = document.getElementById('headerAuthBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (headerAuthBtn) {
      headerAuthBtn.addEventListener('click', handleGoogleSignIn);
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleSignOut);
    }

    // 1. If Real Firebase Cloud is active, attach listener
    if (window.NischayConfig && window.NischayConfig.isCloudReady && window.NischayConfig.authInstance) {
      window.NischayConfig.authInstance.onAuthStateChanged(function (firebaseUser) {
        if (firebaseUser) {
          setupActiveUser({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'छात्र',
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL || getDefaultAvatar(firebaseUser.displayName)
          });
        } else {
          clearActiveUser();
        }
      });
    } else {
      // 2. Local-Sync Mode: Restore offline saved session if available
      const savedLocalUser = localStorage.getItem('nischaydesk_active_user');
      if (savedLocalUser) {
        try {
          const parsed = JSON.parse(savedLocalUser);
          setupActiveUser(parsed);
        } catch (e) {
          setupActiveUser({
            uid: 'local_guest_101',
            name: savedLocalUser,
            email: 'student@nischaydesk.local',
            photoURL: getDefaultAvatar(savedLocalUser)
          });
        }
      } else {
        clearActiveUser();
      }
    }
  }

  /**
   * Triggers Google Sign-In or Intelligent Fallback
   */
  async function handleGoogleSignIn() {
    // Mode A: Production Google Firebase Auth
    if (window.NischayConfig && window.NischayConfig.isCloudReady && window.NischayConfig.authInstance) {
      try {
        // @ts-ignore
        const provider = new firebase.auth.GoogleAuthProvider();
        await window.NischayConfig.authInstance.signInWithPopup(provider);
      } catch (err) {
        console.error("Firebase Login Error:", err);
        alert("Google लॉगिन में समस्या आई: " + err.message);
      }
      return;
    }

    // Mode B: Fast Local-Sync Mock Auth
    const studentName = prompt("NischayDesk VIP लॉकर में आपका स्वागत है!\nकृपया अपना नाम दर्ज करें:");
    if (!studentName || studentName.trim() === "") return;

    const mockUser = {
      uid: 'uid_' + Date.now(),
      name: studentName.trim(),
      email: studentName.trim().toLowerCase().replace(/\s+/g, '') + '@student.in',
      photoURL: getDefaultAvatar(studentName.trim())
    };

    localStorage.setItem('nischaydesk_active_user', JSON.stringify(mockUser));
    setupActiveUser(mockUser);
    alert(`नमस्ते ${mockUser.name}! आपका VIP स्टूडेंट अकाउंट सक्रिय हो गया है। 🚀`);
  }

  /**
   * Handles user sign-out
   */
  async function handleSignOut() {
    if (!confirm("क्या आप अपने अकाउंट से लॉगआउट करना चाहते हैं?")) return;

    if (window.NischayConfig && window.NischayConfig.isCloudReady && window.NischayConfig.authInstance) {
      await window.NischayConfig.authInstance.signOut();
    } else {
      localStorage.removeItem('nischaydesk_active_user');
      clearActiveUser();
    }
  }

  /**
   * Updates Header UI & Global State when user is active
   */
  function setupActiveUser(userObj) {
    window.NischayAuth.currentUser = userObj;
    window.NischayAuth.isLoggedIn = true;

    // Header buttons
    const headerAuthBtn = document.getElementById('headerAuthBtn');
    const userProfileWidget = document.getElementById('userProfileWidget');
    const userDisplayName = document.getElementById('userDisplayName');
    const userAvatarImg = /** @type {HTMLImageElement|null} */ (document.getElementById('userAvatarImg'));

    if (headerAuthBtn) headerAuthBtn.style.display = 'none';
    if (userProfileWidget) userProfileWidget.style.display = 'flex';
    if (userDisplayName) userDisplayName.innerText = userObj.name;
    if (userAvatarImg) userAvatarImg.src = userObj.photoURL;

    // Mobile drawer update
    const drawerUserCard = document.getElementById('drawerUserCard');
    if (drawerUserCard) {
      drawerUserCard.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="${userObj.photoURL}" style="width:36px; height:36px; border-radius:50%; border:1.5px solid var(--brand-accent);" />
          <div>
            <b style="color:var(--text-pure); font-size:0.9rem; display:block;">${userObj.name}</b>
            <small style="color:var(--brand-accent);">VIP एक्टिव मेम्बर</small>
          </div>
        </div>
      `;
    }

    // Refresh Dashboard Locker Feed if present
    refreshDashboardLockerUI();
  }

  /**
   * Clears session and restores default login buttons
   */
  function clearActiveUser() {
    window.NischayAuth.currentUser = null;
    window.NischayAuth.isLoggedIn = false;

    const headerAuthBtn = document.getElementById('headerAuthBtn');
    const userProfileWidget = document.getElementById('userProfileWidget');

    if (headerAuthBtn) headerAuthBtn.style.display = 'inline-flex';
    if (userProfileWidget) userProfileWidget.style.display = 'none';

    const drawerUserCard = document.getElementById('drawerUserCard');
    if (drawerUserCard) {
      drawerUserCard.innerHTML = `<p class="drawer-user-prompt">क्लाउड सिंक और टेस्ट ट्रैकिंग के लिए लॉगिन करें।</p>`;
    }

    refreshDashboardLockerUI();
  }

  /**
   * Helper: Generate clean SVG Avatar if user photo is absent
   */
  function getDefaultAvatar(name) {
    const initial = (name && name.charAt(0)) ? name.charAt(0).toUpperCase() : 'N';
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%230284c7"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="28" fill="%23ffffff">${initial}</text></svg>`;
  }

  /**
   * Save action or test result into Firestore or LocalStorage
   */
  async function saveRecordToUserLocker(title, detail) {
    if (!window.NischayAuth.isLoggedIn || !window.NischayAuth.currentUser) return;

    const recordItem = {
      title: title,
      detail: detail,
      timestamp: new Date().toISOString(),
      timeStr: new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })
    };

    // Firebase Firestore Sync
    if (window.NischayConfig && window.NischayConfig.isCloudReady && window.NischayConfig.dbInstance) {
      try {
        const uid = window.NischayAuth.currentUser.uid;
        await window.NischayConfig.dbInstance.collection('users').doc(uid).collection('locker').add(recordItem);
      } catch (e) {
        console.warn("Cloud write failed, saving locally:", e);
      }
    }

    // LocalStorage Mirror Sync
    const existing = JSON.parse(localStorage.getItem('nischaydesk_cloud_records') || '[]');
    existing.unshift(recordItem);
    if (existing.length > 15) existing.pop();
    localStorage.setItem('nischaydesk_cloud_records', JSON.stringify(existing));

    refreshDashboardLockerUI();
  }

  /**
   * Read records
   */
  function fetchUserLockerRecords() {
    return JSON.parse(localStorage.getItem('nischaydesk_cloud_records') || '[]');
  }

  /**
   * Update feed in index.html dashboard card
   */
  function refreshDashboardLockerUI() {
    const feed = document.getElementById('cloudLockerFeed');
    if (!feed) return;

    if (!window.NischayAuth.isLoggedIn) {
      feed.innerHTML = `<div class="empty-feed-placeholder"><span>डेटा सिंक करने के लिए Google से साइन इन करें।</span></div>`;
      return;
    }

    const records = fetchUserLockerRecords();
    if (records.length === 0) {
      feed.innerHTML = `<div class="empty-feed-placeholder"><span>लॉकर सक्रिय है। जब आप टेस्ट देंगे या नोट्स पढ़ेंगे, रिकॉर्ड्स यहाँ सुरक्षित दिखेंगे।</span></div>`;
      return;
    }

    let html = `<ul style="list-style:none; padding:0; display:flex; flex-direction:column; gap:8px;">`;
    records.slice(0, 3).forEach(function (rec) {
      html += `
        <li style="background:var(--bg-secondary); padding:8px 12px; border-radius:6px; border:1px solid var(--border-subtle); display:flex; justify-content:space-between; align-items:center;">
          <div>
            <b style="font-size:0.82rem; color:var(--text-pure); display:block;">${rec.title}</b>
            <small style="color:var(--text-secondary); font-size:0.75rem;">${rec.detail}</small>
          </div>
          <span style="font-size:0.72rem; color:var(--brand-accent); font-weight:600;">${rec.timeStr}</span>
        </li>
      `;
    });
    html += `</ul>`;
    feed.innerHTML = html;
  }

})();
