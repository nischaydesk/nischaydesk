/* ==========================================================================
   NischayDesk User Auth & Class-Lock Personalization Engine
   Supports: Class 10th Matric, 11th Science & 12th Science
   Architected by: Prince Kumar
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  // DOM Elements
  const headerAuthBtn = document.getElementById('headerAuthBtn');
  const userProfileWidget = document.getElementById('userProfileWidget');
  const userAvatarImg = document.getElementById('userAvatarImg');
  const userDisplayName = document.getElementById('userDisplayName');
  const userSessionBadge = document.getElementById('userSessionBadge');
  const logoutBtn = document.getElementById('logoutBtn');
  const drawerUserCard = document.getElementById('drawerUserCard');
  const cloudLockerFeed = document.getElementById('cloudLockerFeed');

  // Hero Welcome Elements
  const personalizedWelcomeCard = document.getElementById('personalizedWelcomeCard');
  const welcomeUserName = document.getElementById('welcomeUserName');
  const displayStudentClass = document.getElementById('displayStudentClass');
  const displayStudentStream = document.getElementById('displayStudentStream');

  // Onboarding Modal Elements
  const onboardingModal = document.getElementById('onboardingModal');
  const onboardingForm = document.getElementById('onboardingForm');
  const obName = document.getElementById('obName');
  const obClass = document.getElementById('obClass');
  const obStream = document.getElementById('obStream');
  const obGoal = document.getElementById('obGoal');
  const obHobby = document.getElementById('obHobby');

  // Class Section Blocks on Dashboard
  const sectionClass10 = document.getElementById('sectionClass10');
  const sectionClass11 = document.getElementById('sectionClass11');

  // Firebase Instances
  const auth = (window.NischayConfig && window.NischayConfig.authInstance) 
               ? window.NischayConfig.authInstance 
               : (typeof firebase !== 'undefined' && firebase.auth ? firebase.auth() : null);

  const db = (window.NischayConfig && window.NischayConfig.firestoreInstance)
             ? window.NischayConfig.firestoreInstance
             : (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);

  if (!auth) {
    console.warn("⚠️ [NischayDesk] Firebase Auth लोड नहीं हो सका।");
    return;
  }

  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  // 1. Google Sign-In Action
  if (headerAuthBtn) {
    headerAuthBtn.addEventListener('click', function () {
      headerAuthBtn.disabled = true;
      headerAuthBtn.style.opacity = '0.7';

      auth.signInWithPopup(provider)
        .catch((error) => {
          console.error("❌ लॉगिन एरर:", error);
          if (error.code !== 'auth/popup-closed-by-user') {
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

  // 2. Logout Action
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      if (confirm("क्या आप वाकई लॉगआउट करना चाहते हैं?")) {
        auth.signOut().then(() => {
          localStorage.removeItem('nischay_user_name');
          localStorage.removeItem('nischay_user_profile');
          location.reload();
        });
      }
    });
  }

  // 3. User State Change Listener
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      // Header UI Sync
      if (headerAuthBtn) headerAuthBtn.style.display = 'none';
      if (userProfileWidget) userProfileWidget.style.display = 'flex';

      const displayName = user.displayName || "छात्र";
      const photoURL = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0284c7&color=fff`;

      localStorage.setItem('nischay_user_name', displayName);
      if (userDisplayName) userDisplayName.innerText = displayName;
      if (userAvatarImg) userAvatarImg.src = photoURL;

      // Drawer Sync
      if (drawerUserCard) {
        drawerUserCard.innerHTML = `
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${photoURL}" style="width:38px; height:38px; border-radius:50%; border:1.5px solid var(--brand-accent);" alt="${displayName}">
            <div>
              <div style="font-size:0.9rem; font-weight:700; color:var(--text-pure);">${displayName}</div>
              <div style="font-size:0.72rem; color:var(--success); font-weight:600;">● क्लाउड प्रोफाइल सक्रिय</div>
            </div>
          </div>
        `;
      }

      // Check Profile in Firestore / LocalStorage
      await checkAndLoadUserProfile(user);

    } else {
      // Guest State
      if (headerAuthBtn) headerAuthBtn.style.display = 'inline-flex';
      if (userProfileWidget) userProfileWidget.style.display = 'none';
      if (personalizedWelcomeCard) personalizedWelcomeCard.style.display = 'none';

      // Default: Show both sections for guest visitors
      if (sectionClass10) sectionClass10.style.display = 'block';
      if (sectionClass11) sectionClass11.style.display = 'block';
    }
  });

  // 4. Check & Load Profile Data
  async function checkAndLoadUserProfile(user) {
    let profileData = null;

    // A. LocalStorage Check (Instant)
    const localProfile = localStorage.getItem('nischay_user_profile');
    if (localProfile) {
      try { profileData = JSON.parse(localProfile); } catch (e) {}
    }

    // B. Firestore Check
    if (!profileData && db) {
      try {
        const docRef = db.collection('students').doc(user.uid);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          profileData = docSnap.data();
          localStorage.setItem('nischay_user_profile', JSON.stringify(profileData));
        }
      } catch (err) {
        console.warn("Firestore fetch warning:", err);
      }
    }

    // C. If First-Time User ➔ Open Onboarding Modal
    if (!profileData) {
      openOnboardingModal(user);
    } else {
      applyUserProfile(profileData);
    }
  }

  // 5. Open Onboarding Modal
  function openOnboardingModal(user) {
    if (!onboardingModal) return;
    if (obName) obName.value = user.displayName || "";
    onboardingModal.classList.add('active');
  }

  // Window helper to switch class anytime
  window.openClassSwitchModal = function () {
    const user = auth.currentUser;
    if (user) openOnboardingModal(user);
  };

  // 6. Save Onboarding Form Data
  if (onboardingForm) {
    onboardingForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) return;

      const profilePayload = {
        uid: user.uid,
        name: obName ? obName.value.trim() : user.displayName,
        studentClass: obClass ? obClass.value : "11",
        stream: obStream ? obStream.value : "PCM",
        goal: obGoal ? obGoal.value : "Bihar Board Topper",
        hobby: obHobby ? obHobby.value.trim() : "",
        updatedAt: new Date().toISOString()
      };

      // Save Local
      localStorage.setItem('nischay_user_profile', JSON.stringify(profilePayload));
      localStorage.setItem('nischay_student_class', profilePayload.studentClass);

      // Save Firestore
      if (db) {
        try {
          await db.collection('students').doc(user.uid).set(profilePayload, { merge: true });
        } catch (err) {
          console.error("Firestore Save Error:", err);
        }
      }

      onboardingModal.classList.remove('active');
      applyUserProfile(profilePayload);
    });
  }

  // 7. Apply Profile & Class-Lock Filter to UI
  function applyUserProfile(profile) {
    if (!profile) return;

    const sClass = String(profile.studentClass || "11");
    const sName = profile.name || "छात्र";
    const sStream = profile.stream || "Science";
    const sGoal = profile.goal || "BSEB Topper";

    // Save class key for notes-viewer.js & quiz-engine.js
    localStorage.setItem('nischay_student_class', sClass);

    // Update Welcome Card
    if (personalizedWelcomeCard) {
      personalizedWelcomeCard.style.display = 'block';
      if (welcomeUserName) welcomeUserName.innerText = sName.split(' ')[0];
      if (displayStudentClass) displayStudentClass.innerText = `Class ${sClass}th`;
      if (displayStudentStream) displayStudentStream.innerText = `${sStream} • लक्ष्य: ${sGoal}`;
    }

    if (userSessionBadge) {
      userSessionBadge.innerText = `Class ${sClass}th ▾`;
    }

    // ==========================================
    // CLASS LOCK FILTER ENGINE (10th vs 11th/12th)
    // ==========================================
    if (sClass === "10") {
      // छात्र 10वीं का है ➔ 11th/12th पूरी तरह छिपाएं
      if (sectionClass10) sectionClass10.style.display = 'block';
      if (sectionClass11) sectionClass11.style.display = 'none';
    } else if (sClass === "11" || sClass === "12") {
      // छात्र 11वीं या 12वीं का है ➔ 10वीं मैट्रिक पूरी तरह छिपाएं
      if (sectionClass10) sectionClass10.style.display = 'none';
      if (sectionClass11) sectionClass11.style.display = 'block';

      // 12वीं के लिए हेडलाइन अपडेट
      const s11Headline = sectionClass11 ? sectionClass11.querySelector('.section-headline') : null;
      if (s11Headline) {
        s11Headline.innerText = (sClass === "12") 
          ? "कक्षा 12वीं साइंस सम्पूर्ण हब (बोर्ड स्पेशल)" 
          : "कक्षा 11वीं साइंस हब (NCERT & फाउंडेशन)";
      }
    }

    // Cloud Locker Sync Box Update
    if (cloudLockerFeed) {
      cloudLockerFeed.innerHTML = `
        <div style="padding:10px 14px; font-size:0.84rem; color:var(--text-secondary); text-align:center; background:rgba(2, 132, 199, 0.08); border-radius:var(--radius-md); border:1px solid rgba(56, 189, 248, 0.2);">
          स्वागत है, <b style="color:var(--brand-accent);">${sName}</b>! आपकी कक्षा: <b>Class ${sClass}th (${sStream})</b> लॉक है।
        </div>
      `;
    }
  }

});
