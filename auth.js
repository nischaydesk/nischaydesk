/* ==========================================================================
   NischayDesk User Auth & Profile State Management Engine (v4.0)
   Features:
   - Synchronized with Modal-based Smooth Logout (No browser confirm alert)
   - 16 Career Goals Integration
   - Independent Class, Stream & Goal Display Binding
   - Drawer & Navbar Widget Two-Way State Sync
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  const headerAuthBtn = document.getElementById('headerAuthBtn');
  const userProfileWidget = document.getElementById('userProfileWidget');
  const userAvatarImg = document.getElementById('userAvatarImg');
  const userDisplayName = document.getElementById('userDisplayName');
  const userSessionBadge = document.getElementById('userSessionBadge');
  const drawerUserCard = document.getElementById('drawerUserCard');

  // वेलकम कार्ड के एलिमेंट्स
  const personalizedWelcomeCard = document.getElementById('personalizedWelcomeCard');
  const welcomeUserName = document.getElementById('welcomeUserName');
  const displayStudentClass = document.getElementById('displayStudentClass');
  const displayStudentStream = document.getElementById('displayStudentStream');
  const displayStudentGoal = document.getElementById('displayStudentGoal');

  // ऑनबोर्डिंग / क्लास स्विच मोडल एलिमेंट्स
  const onboardingModal = document.getElementById('onboardingModal');
  const onboardingForm = document.getElementById('onboardingForm');
  const obName = document.getElementById('obName');
  const obClass = document.getElementById('obClass');
  const obStream = document.getElementById('obStream');
  const obGoal = document.getElementById('obGoal');
  const obHobby = document.getElementById('obHobby');

  // तीनों मुख्य क्लास सेक्शन्स (होमपेज)
  const sectionClass10 = document.getElementById('sectionClass10');
  const sectionClass11 = document.getElementById('sectionClass11');
  const sectionClass12 = document.getElementById('sectionClass12');

  const auth = (window.NischayConfig && window.NischayConfig.authInstance) 
               ? window.NischayConfig.authInstance 
               : (typeof firebase !== 'undefined' && firebase.auth ? firebase.auth() : null);

  const db = (window.NischayConfig && window.NischayConfig.firestoreInstance)
             ? window.NischayConfig.firestoreInstance
             : (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);

  // डिफ़ॉल्ट रूप से तीनों सेक्शन्स को दिखाएं (गेस्ट मोड)
  showAllClasses();

  function showAllClasses() {
    if (sectionClass10) sectionClass10.style.setProperty('display', 'block', 'important');
    if (sectionClass11) sectionClass11.style.setProperty('display', 'block', 'important');
    if (sectionClass12) sectionClass12.style.setProperty('display', 'block', 'important');
    if (personalizedWelcomeCard) personalizedWelcomeCard.style.setProperty('display', 'none', 'important');
  }

  if (!auth) return;

  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  // 1. Google Sign-In Action
  if (headerAuthBtn) {
    headerAuthBtn.addEventListener('click', function () {
      auth.signInWithPopup(provider).catch(err => {
        if (err.code !== 'auth/popup-closed-by-user') {
          alert("लॉगिन त्रुटि: " + err.message);
        }
      });
    });
  }

  // 2. Class Switch Modal Global Trigger
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

  // 3. Profile Onboarding Form Submit
  if (onboardingForm) {
    onboardingForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const user = auth.currentUser;
      const targetUid = user ? user.uid : "local_user";
      const finalName = obName ? obName.value.trim() : (user?.displayName || "छात्र");
      const selectedClass = obClass ? obClass.value : "10";
      const selectedStream = obStream ? obStream.value : "PCM";
      const selectedGoal = obGoal ? obGoal.value : "बिहार बोर्ड टॉपर (State Rank)";
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

  // 4. User Authentication State Listener
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

      const activeName = (profileData && profileData.name) ? profileData.name : (user.displayName || "छात्र");
      const activeClass = (profileData && profileData.studentClass) ? profileData.studentClass : (localStorage.getItem('nischay_student_class') || "11");
      const photoURL = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeName)}&background=0284c7&color=fff`;

      localStorage.setItem('nischay_user_name', activeName);

      if (userDisplayName) userDisplayName.innerText = activeName;
      if (userSessionBadge) userSessionBadge.innerText = `Class ${activeClass}th ▾`;
      if (userAvatarImg) userAvatarImg.src = photoURL;

      // साइडबार में प्रीमियम प्रोफाइल कार्ड
      if (drawerUserCard) {
        drawerUserCard.innerHTML = `
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${photoURL}" style="width:38px; height:38px; border-radius:50%; border:2px solid #0284c7; object-fit:cover;" alt="${activeName}">
            <div style="min-width:0; overflow:hidden;">
              <div style="font-size:0.92rem; font-weight:700; color:#0f172a; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${activeName}</div>
              <div style="font-size:0.75rem; color:#16a34a; font-weight:600; margin-top:2px;">● Class ${activeClass}th सक्रिय (बदलें ▾)</div>
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
      // गेस्ट मोड
      if (headerAuthBtn) headerAuthBtn.style.display = 'inline-flex';
      if (userProfileWidget) userProfileWidget.style.display = 'none';

      if (drawerUserCard) {
        drawerUserCard.innerHTML = `
          <p class="drawer-user-prompt" style="margin: 0; font-size: 0.84rem; color: #0284c7; font-weight: 600;">⚡ प्रोफ़ाइल एवं क्लास बदलें ▾</p>
        `;
      }

      showAllClasses();
    }
  });

  // क्लास और गोल डिस्प्ले बाइंडिंग
  function applyClassLock(profile) {
    const sClass = String(profile.studentClass || "11");
    const sName = profile.name || "छात्र";
    const sStream = profile.stream || "PCM";
    const sGoal = profile.goal || "बिहार बोर्ड टॉपर (State Rank)";

    localStorage.setItem('nischay_student_class', sClass);

    if (personalizedWelcomeCard) {
      personalizedWelcomeCard.style.setProperty('display', 'block', 'important');
      if (welcomeUserName) welcomeUserName.innerText = sName.split(' ')[0];
      if (displayStudentClass) displayStudentClass.innerText = `Class ${sClass}th`;
      if (displayStudentStream) displayStudentStream.innerText = sStream;
      if (displayStudentGoal) displayStudentGoal.innerText = sGoal;
    }

    if (sectionClass10) {
      sectionClass10.style.setProperty('display', (sClass === "10" ? 'block' : 'none'), 'important');
    }
    if (sectionClass11) {
      sectionClass11.style.setProperty('display', (sClass === "11" ? 'block' : 'none'), 'important');
    }
    if (sectionClass12) {
      sectionClass12.style.setProperty('display', (sClass === "12" ? 'block' : 'none'), 'important');
    }
  }
});
