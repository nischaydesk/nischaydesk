/* ==========================================================================
   NischayDesk Unified Profile & Class Lock Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  const headerAuthBtn = document.getElementById('headerAuthBtn');
  const userProfileWidget = document.getElementById('userProfileWidget');
  const userAvatarImg = document.getElementById('userAvatarImg');
  const userDisplayName = document.getElementById('userDisplayName');
  const userSessionBadge = document.getElementById('userSessionBadge');
  const logoutBtn = document.getElementById('logoutBtn');
  const drawerUserCard = document.getElementById('drawerUserCard');

  const personalizedWelcomeCard = document.getElementById('personalizedWelcomeCard');
  const welcomeUserName = document.getElementById('welcomeUserName');
  const displayStudentClass = document.getElementById('displayStudentClass');
  const displayStudentStream = document.getElementById('displayStudentStream');

  const onboardingModal = document.getElementById('onboardingModal');
  const onboardingForm = document.getElementById('onboardingForm');
  const obName = document.getElementById('obName');
  const obClass = document.getElementById('obClass');
  const obStream = document.getElementById('obStream');
  const obGoal = document.getElementById('obGoal');
  const obHobby = document.getElementById('obHobby');
  const saveProfileBtn = document.getElementById('saveProfileBtn');

  const sectionClass10 = document.getElementById('sectionClass10');
  const sectionClass11 = document.getElementById('sectionClass11');
  const sectionClass12 = document.getElementById('sectionClass12');

  const auth = (window.NischayConfig && window.NischayConfig.authInstance) 
               ? window.NischayConfig.authInstance 
               : (typeof firebase !== 'undefined' && firebase.auth ? firebase.auth() : null);

  const db = (window.NischayConfig && window.NischayConfig.firestoreInstance)
             ? window.NischayConfig.firestoreInstance
             : (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);

  if (!auth) return;

  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  if (headerAuthBtn) {
    headerAuthBtn.addEventListener('click', function () {
      auth.signInWithPopup(provider).catch(err => {
        if (err.code !== 'auth/popup-closed-by-user') alert("लॉगिन एरर: " + err.message);
      });
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      if (confirm("क्या आप लॉगआउट करना चाहते हैं?")) {
        auth.signOut().then(() => {
          localStorage.clear();
          location.reload();
        });
      }
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
    if (obClass && data?.studentClass) obClass.value = data.studentClass;
    if (obStream && data?.stream) obStream.value = data.stream;
    if (obGoal && data?.goal) obGoal.value = data.goal;

    onboardingModal.classList.add('active');
  }

  if (onboardingForm) {
    onboardingForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const user = auth.currentUser;
      const targetUid = user ? user.uid : "guest";
      const finalName = obName ? obName.value.trim() : (user?.displayName || "छात्र");
      const selectedClass = obClass ? obClass.value : "10";
      const selectedStream = obStream ? obStream.value : "PCM";
      const selectedGoal = obGoal ? obGoal.value : "Bihar Board Topper";
      const selectedHobby = obHobby ? obHobby.value.trim() : "";

      const profilePayload = {
        uid: targetUid,
        name: finalName,
        studentClass: selectedClass,
        stream: selectedStream,
        goal: selectedGoal,
        hobby: selectedHobby,
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem('nischay_user_profile', JSON.stringify(profilePayload));
      localStorage.setItem('nischay_user_name', finalName);
      localStorage.setItem('nischay_student_class', selectedClass);

      if (db && user) {
        db.collection('students').doc(user.uid).set(profilePayload, { merge: true }).catch(() => {});
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

      // जो नाम प्रोफ़ाइल में है, वही अंतिम सत्य है
      const activeName = (profileData && profileData.name) ? profileData.name : (user.displayName || "छात्र");
      const activeClass = (profileData && profileData.studentClass) ? profileData.studentClass : (localStorage.getItem('nischay_student_class') || "10");
      const photoURL = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeName)}&background=0284c7&color=fff`;

      localStorage.setItem('nischay_user_name', activeName);

      if (userDisplayName) userDisplayName.innerText = activeName;
      if (userSessionBadge) userSessionBadge.innerText = `Class ${activeClass}th ▾`;
      if (userAvatarImg) userAvatarImg.src = photoURL;

      if (drawerUserCard) {
        drawerUserCard.innerHTML = `
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${photoURL}" style="width:38px; height:38px; border-radius:50%; border:1.5px solid var(--brand-accent);" alt="${activeName}">
            <div style="min-width:0; overflow:hidden;">
              <div class="drawer-user-name" style="font-size:0.92rem; font-weight:800; line-height:1.2;">${activeName}</div>
              <div style="font-size:0.72rem; color:var(--success); font-weight:700; margin-top:2px;">● प्रोफ़ाइल सक्रिय</div>
            </div>
          </div>
        `;
      }

      if (!profileData) {
        openOnboardingModal(user);
      } else {
        applyClassFilter(profileData);
      }

    } else {
      if (headerAuthBtn) headerAuthBtn.style.display = 'inline-flex';
      if (userProfileWidget) userProfileWidget.style.display = 'none';
      if (personalizedWelcomeCard) personalizedWelcomeCard.style.display = 'none';

      if (sectionClass10) sectionClass10.style.display = 'block';
      if (sectionClass11) sectionClass11.style.display = 'block';
      if (sectionClass12) sectionClass12.style.display = 'block';
    }
  });

  function applyClassFilter(profile) {
    const sClass = String(profile.studentClass || "10");
    const sName = profile.name || "छात्र";
    const sStream = profile.stream || "General";
    const sGoal = profile.goal || "Bihar Board Topper";

    localStorage.setItem('nischay_student_class', sClass);

    if (personalizedWelcomeCard) {
      personalizedWelcomeCard.style.display = 'block';
      if (welcomeUserName) welcomeUserName.innerText = sName.split(' ')[0];
      if (displayStudentClass) displayStudentClass.innerText = `Class ${sClass}th`;
      if (displayStudentStream) displayStudentStream.innerText = `${sStream} • लक्ष्य: ${sGoal}`;
    }

    if (sectionClass10) sectionClass10.style.display = (sClass === "10") ? 'block' : 'none';
    if (sectionClass11) sectionClass11.style.display = (sClass === "11") ? 'block' : 'none';
    if (sectionClass12) sectionClass12.style.display = (sClass === "12") ? 'block' : 'none';
  }
});
