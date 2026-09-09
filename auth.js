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

  // config.js द्वारा तैयार किया गया Auth इंस्टेंस सुरक्षित तरीके से प्राप्त करें
  const auth = (window.NischayConfig && window.NischayConfig.authInstance) 
               ? window.NischayConfig.authInstance 
               : (typeof firebase !== 'undefined' && firebase.auth ? firebase.auth() : null);

  if (!auth) {
    console.warn("⚠️ [NischayDesk] Firebase Auth लोड नहीं हो पाया। config.js चेक करें।");
    return;
  }

  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  // 1. Google Sign-In बटन क्लिक इवेंट (सुपरफास्ट पॉपअप)
  if (headerAuthBtn) {
    headerAuthBtn.addEventListener('click', function () {
      headerAuthBtn.disabled = true;
      headerAuthBtn.style.opacity = '0.7';

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
        })
        .finally(() => {
          if (headerAuthBtn) {
            headerAuthBtn.disabled = false;
            headerAuthBtn.style.opacity = '1';
          }
        });
    });
  }

  // 2. लॉगआउट बटन क्लिक इवेंट
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      if (confirm("क्या आप वाकई लॉगआउट करना चाहते हैं?")) {
        auth.signOut()
          .then(() => {
            localStorage.removeItem('nischay_user_name');
            console.log("⚡ [NischayDesk] सफलतापूर्वक लॉगआउट हो गया।");
          })
          .catch((error) => {
            console.error("❌ [NischayDesk] लॉगआउट एरर:", error);
          });
      }
    });
  }

  // 3. रियल-टाइम यूजर स्टेट लिसनर (तुरंत UI अपडेट)
  auth.onAuthStateChanged((user) => {
    if (user) {
      // यूजर लॉगिन है: लॉगिन बटन छिपाएं, प्रोफाइल विजेट दिखाएं
      if (headerAuthBtn) headerAuthBtn.style.display = 'none';
      if (userProfileWidget) userProfileWidget.style.display = 'flex';

      const displayName = user.displayName || "छात्र";
      const photoURL = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0284c7&color=fff`;

      // लोकल कैश में सेव करें ताकि AI डेस्क और अन्य पेज तुरंत नाम पढ़ सकें
      localStorage.setItem('nischay_user_name', displayName);

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
              <div style="font-size:0.88rem; font-weight:700; color:var(--text-pure); line-height:1.2;">${displayName}</div>
              <div style="font-size:0.72rem; color:var(--success); font-weight:600; margin-top:2px;">● क्लाउड सिंक एक्टिव</div>
            </div>
          </div>
        `;
      }

      // क्लाउड लॉकर कार्ड अपडेट (यदि index.html पर मौजूद हो)
      if (cloudLockerFeed) {
        cloudLockerFeed.innerHTML = `
          <div style="padding:10px 14px; font-size:0.82rem; color:var(--text-secondary); text-align:center; background:rgba(2, 132, 199, 0.08); border-radius:var(--radius-md); border:1px solid rgba(56, 189, 248, 0.2);">
            स्वागत है, <b style="color:var(--brand-accent);">${displayName}</b>! आपका टेस्ट और नोट्स प्रोग्रेस सिंक हो रहा है।
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
            <span>डेटा सिंक और टेस्ट ट्रैकिंग के लिए Google से साइन इन करें।</span>
          </div>
        `;
      }
    }
  });

});
