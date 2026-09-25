/* ==========================================================================
   NischayDesk User Auth & Profile State Management Engine (v5.0 Unified)
   Fixed: Sidebar Dark/Light Name Visibility & Cloud Firestore Key Sync
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  const headerAuthBtn = document.getElementById('headerAuthBtn');
  const userProfileWidget = document.getElementById('userProfileWidget');
  const userAvatarImg = document.getElementById('userAvatarImg');
  const userDisplayName = document.getElementById('userDisplayName');
  const userSessionBadge = document.getElementById('userSessionBadge');
  const drawerUserCard = document.getElementById('drawerUserCard');

  const personalizedWelcomeCard = document.getElementById('personalizedWelcomeCard');
  const welcomeUserName = document.getElementById('welcomeUserName');
  const displayStudentClass = document.getElementById('displayStudentClass');
  const displayStudentStream = document.getElementById('displayStudentStream');
  const displayStudentGoal = document.getElementById('displayStudentGoal');

  const onboardingModal = document.getElementById('onboardingModal');
  const onboardingForm = document.getElementById('onboardingForm');
  const obName = document.getElementById('obName');
  const obClass = document.getElementById('obClass');
  const obStream = document.getElementById('obStream');
  const obGoal = document.getElementById('obGoal');
  const obHobby = document.getElementById('obHobby');

  const sectionClass10 = document.getElementById('sectionClass10');
  const sectionClass11 = document.getElementById('sectionClass11');
  const sectionClass12 = document.getElementById('sectionClass12');

  const auth = (window.NischayConfig && window.NischayConfig.authInstance) 
               ? window.NischayConfig.authInstance 
               : (typeof firebase !== 'undefined' && firebase.auth ? firebase.auth() : null);

  const db = (window.NischayConfig && window.NischayConfig.dbInstance)
             ? window.NischayConfig.dbInstance
             : (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);

  const savedClass = localStorage.getItem('nd_selected_class') || localStorage.getItem('nischay_student_class') || '10th';
  applyClassLockToDOM(savedClass);

  function applyClassLockToDOM(cls) {
    const cleanCls = String(cls).replace(/[^0-9]/g, '') || '10';
    if (sectionClass10) sectionClass10.style.display = (cleanCls === '10' ? 'block' : 'none');
    if (sectionClass11) sectionClass11.style.display = (cleanCls === '11' ? 'block' : 'none');
    if (sectionClass12) sectionClass12.style.display = (cleanCls === '12' ? 'block' : 'none');
  }

  if (!auth) return;

  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  if (headerAuthBtn) {
    headerAuthBtn.addEventListener('click', function () {
      auth.signInWithPopup(provider).catch(err => {
        if (err.code !== 'auth/popup-closed-by-user') {
          alert("लॉगिन त्रुटि: " + err.message);
        }
      });
    });
  }

  window.openClassSwitchModal = function () {
    openOnboardingModal(auth.currentUser);
  };

  function openOnboardingModal(user) {
    if (!onboardingModal) return;
    const saved = localStorage.getItem('nischay_user_profile');
    let data = null;
    if (saved) {
      try { data = JSON.parse(saved); } catch (e) {}
    }

    if (obName) obName.value = (data && data.name) ? data.name : (user?.displayName || "");
    if (obClass) obClass.value = (data && (data.studentClass || data.class)) ? String(data.studentClass || data.class).replace(/[^0-9]/g, '') : "10";
    if (obStream && data?.stream) obStream.value = data.stream;
    if (obGoal && data?.goal) obGoal.value = data.goal;

    onboardingModal.classList.add('active');
  }

  if (onboardingForm) {
    onboardingForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const user = auth.currentUser;
      const targetUid = user ? user.uid : "local_user";
      const finalName = obName ? obName.value.trim() : (user?.displayName || "छात्र");
      const numClass = obClass ? obClass.value : "10";
      const fullClassStr = `${numClass}th`;
      const selectedStream = obStream ? obStream.value : "PCM";
      const selectedGoal = obGoal ? obGoal.value : "बिहार बोर्ड टॉपर (State Rank)";
      const selectedHobby = obHobby ? obHobby.value.trim() : "";

      const profilePayload = {
        uid: targetUid,
        name: finalName,
        studentClass: fullClassStr,
        class: numClass,
        stream: selectedStream,
        goal: selectedGoal,
        hobby: selectedHobby,
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem('nischay_user_profile', JSON.stringify(profilePayload));
      localStorage.setItem('nischay_user_name', finalName);
      localStorage.setItem('nd_selected_class', fullClassStr);
      localStorage.setItem('nischay_student_class', numClass);
      localStorage.setItem('user_class', fullClassStr);

      if (db && user) {
        db.collection('students').doc(user.uid).set(profilePayload, { merge: true }).catch(() => {});
        db.collection('bseb_exams_2026').doc(user.uid).set({ selectedClass: fullClassStr }, { merge: true }).catch(() => {});
      }

      onboardingModal.classList.remove('active');
      location.reload();
    });
  }

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      if (headerAuthBtn) headerAuthBtn.style.display = 'none';
      if (userProfileWidget) userProfileWidget.style.display = 'flex';

      let profileData = null;
      const localProfile = localStorage.getItem('nischay_user_profile');
      if (localProfile) {
        try { profileData = JSON.parse(localProfile); } catch (e) {}
      }

      if (!profileData && db) {
        try {
          const docSnap = await db.collection('students').doc(user.uid).get();
          if (docSnap.exists) {
            profileData = docSnap.data();
            localStorage.setItem('nischay_user_profile', JSON.stringify(profileData));
          }
        } catch (err) {}
      }

      const activeName = (profileData && profileData.name) ? profileData.name : (user.displayName || user.email.split('@')[0]);
      const rawClass = (profileData && (profileData.studentClass || profileData.class)) || localStorage.getItem('nd_selected_class') || "10th";
      const cleanNum = String(rawClass).replace(/[^0-9]/g, '') || "10";
      const fullClass = `${cleanNum}th`;
      const photoURL = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeName)}&background=0284c7&color=fff`;

      localStorage.setItem('nischay_user_name', activeName);
      localStorage.setItem('nd_selected_class', fullClass);
      localStorage.setItem('nischay_student_class', cleanNum);

      if (userDisplayName) userDisplayName.innerText = activeName.split(' ')[0];
      if (userSessionBadge) userSessionBadge.innerText = `Class ${fullClass} ▾`;
      if (userAvatarImg) userAvatarImg.src = photoURL;

      if (drawerUserCard) {
        const isLight = document.documentElement.classList.contains('light-mode');
        const nameColor = isLight ? '#0f172a' : '#ffffff';
        const subColor = isLight ? '#0284c7' : '#38bdf8';

        drawerUserCard.innerHTML = `
          <div style="display:flex; align-items:center; gap:12px;">
            <img src="${photoURL}" style="width:42px; height:42px; border-radius:50%; border:2px solid #0284c7; object-fit:cover;" alt="${activeName}">
            <div style="min-width:0; overflow:hidden;">
              <div style="font-size:0.98rem; font-weight:800; color:${nameColor}; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${activeName}</div>
              <div style="font-size:0.78rem; color:${subColor}; font-weight:700; margin-top:3px;">● Class ${fullClass} सक्रिय (बदलें ▾)</div>
            </div>
          </div>
        `;
      }

      if (!profileData) {
        openOnboardingModal(user);
      } else {
        applyClassLock(profileData);
      }

    } else {
      if (headerAuthBtn) headerAuthBtn.style.display = 'inline-flex';
      if (userProfileWidget) userProfileWidget.style.display = 'none';

      if (drawerUserCard) {
        drawerUserCard.innerHTML = `
          <p class="drawer-user-prompt" style="margin: 0; font-size: 0.84rem; color: #0284c7; font-weight: 700;">⚡ प्रोफ़ाइल एवं क्लास बदलें ▾</p>
        `;
      }

      const guestClass = localStorage.getItem('nd_selected_class') || '10th';
      applyClassLockToDOM(guestClass);
    }
  });

  function applyClassLock(profile) {
    const rawClass = profile.studentClass || profile.class || "10";
    const cleanNum = String(rawClass).replace(/[^0-9]/g, '') || "10";
    const fullClass = `${cleanNum}th`;
    const sName = profile.name || "छात्र";
    const sStream = profile.stream || "PCM";
    const sGoal = profile.goal || "बिहार बोर्ड टॉपर (State Rank)";

    if (personalizedWelcomeCard) {
      personalizedWelcomeCard.style.display = 'block';
      if (welcomeUserName) welcomeUserName.innerText = sName.split(' ')[0];
      if (displayStudentClass) displayStudentClass.innerText = `Class ${fullClass}`;
      if (displayStudentStream) displayStudentStream.innerText = sStream;
      if (displayStudentGoal) displayStudentGoal.innerText = sGoal;
    }

    applyClassLockToDOM(cleanNum);
  }
});
