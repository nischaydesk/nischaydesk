/* ==========================================================================
   NischayDesk Authentication & User Session Manager
   Firebase Auth Engine: Prince Kumar
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  const headerAuthBtn = document.getElementById('headerAuthBtn');
  const userProfileWidget = document.getElementById('userProfileWidget');
  const userAvatarImg = document.getElementById('userAvatarImg');
  const userDisplayName = document.getElementById('userDisplayName');
  const logoutBtn = document.getElementById('logoutBtn');
  const drawerUserCard = document.getElementById('drawerUserCard');
  const cloudLockerFeed = document.getElementById('cloudLockerFeed');

  // config.js द्वारा तैयार किया गया Auth इंस्टेंस प्राप्त करें
  const auth = (window.NischayConfig && window.NischayConfig.authInstance) 
               ? window.NischayConfig.authInstance 
               : (typeof firebase !== 'undefined' && firebase.auth ? firebase.auth() : null);

  if (!auth) {
    console.error("❌ [NischayDesk] Firebase Auth लोड नहीं हो पाया। config.js चेक करें।");
    return;
  }

  const provider = new firebase.auth.GoogleAuthProvider();

  // 1. Google Sign-In बटन क्लिक इवेंट
  if (headerAuthBtn) {
    headerAuthBtn.addEventListener('click', function () {
      auth.signInWithPopup(provider)
        .then((result) => {
          console.log("⚡ [NischayDesk] लॉगिन सफल:", result.user.displayName);
        })
        .catch((error) => {
          console.error("❌ [NischayDesk] लॉगिन एरर:", error.code, error.message);
          if (error.code === 'auth/unauthorized-domain') {
            alert("Firebase Console में Authorized Domain (nischaydesk.github.io) जोड़ना बाकी है!");
          } else if (error.code !== 'auth/popup-closed-by-user') {
            alert("लॉगिन में समस्या आई: " + error.message);
          }
        });
    });
  }

  // 2. लॉगआउट बटन क्लिक इवेंट
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      auth.signOut()
        .then(() => {
          console.log("⚡ [NischayDesk] सफलतापूर्वक लॉगआउट हो गया।");
        })
        .catch((error) => {
          console.error("❌ [NischayDesk] लॉगआउट एरर:", error);
        });
    });
  }

  // 3. रियल-टाइम यूजर स्टेट लिसनर
  auth.onAuthStateChanged((user) => {
    if (user) {
      // यूजर लॉगिन है: लॉगिन बटन छिपाएं, प्रोफाइल विजेट दिखाएं
      if (headerAuthBtn) headerAuthBtn.style.display = 'none';
      if (userProfileWidget) userProfileWidget.style.display = 'flex';

      const displayName = user.displayName || "छात्र";
      const photoURL = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0284c7&color=fff`;

      if (userDisplayName) userDisplayName.innerText = displayName;
      if (userAvatarImg) {
        userAvatarImg.src = photoURL;
        userAvatarImg.alt = displayName;
      }

      // साइड ड्रॉवर में प्रोफाइल अपडेट
      if (drawerUserCard) {
        drawerUserCard.innerHTML = `
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${photoURL}" style="width:36px; height:36px; border-radius:50%; border:1.5px solid var(--brand-accent);" alt="${displayName}">
            <div>
              <div style="font-size:0.88rem; font-weight:700; color:var(--text-pure);">${displayName}</div>
              <div style="font-size:0.72rem; color:var(--success);">● क्लाउड सिंक एक्टिव</div>
            </div>
          </div>
        `;
      }

      // क्लाउड लॉकर कार्ड अपडेट
      if (cloudLockerFeed) {
        cloudLockerFeed.innerHTML = `
          <div style="padding:12px; font-size:0.82rem; color:var(--text-secondary); text-align:center; background:rgba(2, 132, 199, 0.08); border-radius:8px; border:1px solid rgba(56, 189, 248, 0.2);">
            स्वागत है, <b style="color:var(--brand-accent);">${displayName}</b>! आपका क्लाउड लॉकर एक्टिव है।
          </div>
        `;
      }

    } else {
      // यूजर लॉगआउट है: प्रोफाइल छिपाएं, लॉगिन बटन दिखाएं
      if (headerAuthBtn) headerAuthBtn.style.display = 'inline-flex';
      if (userProfileWidget) userProfileWidget.style.display = 'none';

      if (drawerUserCard) {
        drawerUserCard.innerHTML = `<p class="drawer-user-prompt">क्लाउड सिंक और टेस्ट ट्रैकिंग के लिए लॉगिन करें।</p>`;
      }

      if (cloudLockerFeed) {
        cloudLockerFeed.innerHTML = `
          <div class="empty-feed-placeholder">
            <span>डेटा सिंक करने के लिए Google से साइन इन करें।</span>
          </div>
        `;
      }
    }
  });

});
