/* ==========================================================================
   NischayDesk User Auth & Instant Class-Lock Personalization Engine (v3.5)
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
  const saveProfileBtn = document.getElementById('saveProfileBtn');

  // Dashboard Section Blocks
  const sectionClass10 = document.getElementById('sectionClass10');
  const sectionClass11 = document.getElementById('sectionClass11');
  const sectionClass12 = document.getElementById('sectionClass12');

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
          localStorage.removeItem('nischay_student_class');
          location.reload();
        });
      }
    });
  }

  // 3. Global Modal Switcher Function
  window.openClassSwitchModal = function () {
    const user = auth.currentUser;
    openOnboardingModal(user);
  };

  function openOnboardingModal(user) {
    if (!onboardingModal) return;
    
    // Fill current user data if available
    const savedProfile = localStorage.getItem('nischay_user_profile');
    let currentData = null;
    if (savedProfile) {
      try { currentData = JSON.parse(savedProfile); } catch (e) {}
    }

    if (obName) {
      obName.value = (currentData && currentData.name) 
                     ? currentData.name 
                     : ((user && user.displayName) ? user.displayName : "");
    }
    if (obClass && currentData && currentData.studentClass) {
      obClass.value = currentData.studentClass;
    }
    if (obStream && currentData && currentData.stream) {
      obStream.value = currentData.stream;
    }
    if (obGoal && currentData && currentData.goal) {
      obGoal.value = currentData.goal;
    }

    onboardingModal.classList.add('active');
  }

  // 4. Save Onboarding Form Data (Instant Response Engine)
  if (onboardingForm) {
    onboardingForm.addEventListener('submit', function (e) {
      e.preventDefault();
      
      const user = auth.currentUser;
      const targetUid = user ? user.uid : "local_user";
      const studentName = obName ? obName.value.trim() : (user ? user.displayName : "छात्र");
      const selectedClass = obClass ? obClass.value : "11";
      const selectedStream = obStream ? obStream.value : "PCM";
      const selectedGoal = obGoal ? obGoal.value : "Bihar Board Topper";
      const selectedHobby = obHobby ? obHobby.value.trim() : "";

      if (saveProfileBtn) {
        saveProfileBtn.disabled = true;
        saveProfileBtn.innerText = "सेव हो रहा है...";
      }

      const profilePayload = {
        uid: targetUid,
        name: studentName,
        studentClass: selectedClass,
        stream: selectedStream,
        goal: selectedGoal,
        hobby: selectedHobby,
        updatedAt: new Date().toISOString()
      };

      // 1. तुरंत LocalStorage में सेव
      localStorage.setItem('nischay_user_profile', JSON.stringify(profilePayload));
      localStorage.setItem('nischay_student_class', selectedClass);
      localStorage.setItem('nischay_user_name', studentName);

      // 2. मोडल बंद और UI अपडेट
      onboardingModal.classList.remove('active');
      applyUserProfile(profilePayload);

      // 3. बैकग्राउंड में Firestore पर अपडेट
      if (db && user) {
        db.collection('students').doc(user.uid).set(profilePayload, { merge: true })
          .catch((err) => console.warn("Firestore sync background warning:", err));
      }

      if (saveProfileBtn) {
        saveProfileBtn.disabled = false;
        saveProfileBtn.innerText = "✓ प्रोफ़ाइल सेव करें";
      }

      // पेज को रीलोड करके नए क्लास के साथ रीफ्रेश कर दें
      location.reload();
    });
  }

  // 5. User State Change Listener
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      if (headerAuthBtn) headerAuthBtn.style.display = 'none';
      if (userProfileWidget) userProfileWidget.style.display = 'flex';

      const displayName = user.displayName || "छात्र";
      const photoURL = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0284c7&color=fff`;

      localStorage.setItem('nischay_user_name', displayName);
      if (userDisplayName) userDisplayName.innerText = displayName;
      if (userAvatarImg) userAvatarImg.src = photoURL;

      if (drawerUserCard) {
        drawerUserCard.innerHTML = `
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${photoURL}" style="width:38px; height:38px; border-radius:50%; border:1.5px solid var(--brand-accent);" alt="${displayName}">
            <div>
              <div style="font-size:0.9rem; font-weight:700; color:var(--text-pure);">${displayName}</div>
              <div style="font-size:0.72rem; color:var(--success); font-weight:600;">● प्रोफ़ाइल सक्रिय</div>
            </div>
          </div>
        `;
      }

      await checkAndLoadUserProfile(user);

    } else {
      // Guest State (बिना लॉगिन)
      if (headerAuthBtn) headerAuthBtn.style.display = 'inline-flex';
      if (userProfileWidget) userProfileWidget.style.display = 'none';
      if (personalizedWelcomeCard) personalizedWelcomeCard.style.display = 'none';

      // बिना लॉगिन तीनों सेक्शन्स साफ़-साफ़ दिखेंगे
      if (sectionClass10) sectionClass10.style.display = 'block';
      if (sectionClass11) sectionClass11.style.display = 'block';
      if (sectionClass12) sectionClass12.style.display = 'block';
    }
  });

  // 6. Check & Load Profile Data
  async function checkAndLoadUserProfile(user) {
    let profileData = null;

    const localProfile = localStorage.getItem('nischay_user_profile');
    if (localProfile) {
      try { profileData = JSON.parse(localProfile); } catch (e) {}
    }

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

    if (!profileData) {
      openOnboardingModal(user);
    } else {
      applyUserProfile(profileData);
    }
  }

  // 7. Apply Profile & Class-Lock Filter to UI
  function applyUserProfile(profile) {
    if (!profile) return;

    const sClass = String(profile.studentClass || "11");
    const sName = profile.name || "छात्र";
    const sStream = profile.stream || "Science";
    const sGoal = profile.goal || "BSEB Topper";

    localStorage.setItem('nischay_student_class', sClass);

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
    // PRECISE CLASS LOCK FILTER (10th vs 11th vs 12th)
    // ==========================================
    if (sClass === "10") {
      if (sectionClass10) sectionClass10.style.display = 'block';
      if (sectionClass11) sectionClass11.style.display = 'none';
      if (sectionClass12) sectionClass12.style.display = 'none';
    } else if (sClass === "11") {
      if (sectionClass10) sectionClass10.style.display = 'none';
      if (sectionClass11) sectionClass11.style.display = 'block';
      if (sectionClass12) sectionClass12.style.display = 'none';
    } else if (sClass === "12") {
      if (sectionClass10) sectionClass10.style.display = 'none';
      if (sectionClass11) sectionClass11.style.display = 'none';
      if (sectionClass12) sectionClass12.style.display = 'block';
    }

    if (cloudLockerFeed) {
      cloudLockerFeed.innerHTML = `
        <div style="padding:10px 14px; font-size:0.84rem; color:var(--text-secondary); text-align:center; background:rgba(2, 132, 199, 0.08); border-radius:var(--radius-md); border:1px solid rgba(56, 189, 248, 0.2);">
          स्वागत है, <b style="color:var(--brand-accent);">${sName}</b>! आपकी कक्षा: <b>Class ${sClass}th (${sStream})</b> सेट है।
        </div>
      `;
    }
  }

});
