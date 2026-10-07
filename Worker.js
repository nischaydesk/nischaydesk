/**
 * NischayDesk - Cloud AI Evaluator Worker
 * Runs on GitHub Cloud / Server
 */
const admin = require("firebase-admin");

// 1. Firebase Admin Init
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const GEMINI_KEY = process.env.GEMINI_API_KEY;

async function callGeminiWithRetry(prompt, imageParts) {
  let success = false;
  let attempts = 0;
  
  while (!success && attempts < 5) {
    attempts++;
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }, ...imageParts]
          }]
        })
      });
      
      const data = await res.json();
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
      console.log(`AI busy, retry attempt ${attempts}...`);
      await new Promise(r => setTimeout(r, 4000));
    } catch (e) {
      console.log(`Network retry ${attempts}...`);
      await new Promise(r => setTimeout(r, 4000));
    }
  }
  return null;
}

async function startEvaluationProcess() {
  console.log("Checking Firestore for pending evaluations...");
  const snapshot = await db.collection("bseb_exams_2026").get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const completedDays = data.completedDays || {};

    for (const day of Object.keys(completedDays)) {
      const exam = completedDays[day];

      // अगर कॉपी चेक होना बाकी है
      if (exam && exam.needsAiEvaluation === true) {
        console.log(`Evaluating UID: ${doc.id}, Day: ${day}`);

        // सब-कलेक्शन से इमेज लिंक्स निकालना
        const pagesSnap = await db.collection("bseb_exams_2026")
          .doc(doc.id)
          .collection(`day_${day}_pages`)
          .orderBy("pageNumber", "asc")
          .get();

        let imageParts = [];
        for (const pDoc of pagesSnap.docs) {
          const imgUrl = pDoc.data().imageUrl;
          if (imgUrl) {
            const imgRes = await fetch(imgUrl);
            const arrayBuffer = await imgRes.arrayBuffer();
            const b64 = Buffer.from(arrayBuffer).toString("base64");
            imageParts.push({
              inline_data: { mime_type: "image/jpeg", data: b64 }
            });
          }
        }

        if (imageParts.length > 0) {
          const prompt = `You are Bihar School Examination Board (BSEB) Chief Examiner.
Evaluate this Class 10 copy strictly. Award subjective marks out of 50.
Output STRICT JSON ONLY:
{
  "totalSubjectiveMarks": 18,
  "overallRemarks": "संतोषप्रद उत्तर...",
  "status": "EVALUATED"
}`;

          const aiResponse = await callGeminiWithRetry(prompt, imageParts);
          if (aiResponse) {
            try {
              const cleanJson = aiResponse.replace(/```json|```/g, "").trim();
              const parsed = JSON.parse(cleanJson);
              const marks = parseInt(parsed.totalSubjectiveMarks, 10) || 0;
              const total = (exam.objectiveMarks || 0) + marks;

              // Firestore में फाइनल रिज़ल्ट लॉक करें
              await db.collection("bseb_exams_2026").doc(doc.id).set({
                completedDays: {
                  [day]: {
                    subjectiveMarks: marks,
                    totalMarks: total,
                    aiFeedback: parsed.overallRemarks,
                    status: "EVALUATED",
                    needsAiEvaluation: false,
                    evaluatedByServerAt: new Date().toISOString()
                  }
                }
              }, { merge: true });

              console.log(`✓ Successfully Evaluated & Saved: UID ${doc.id}, Day ${day}`);
            } catch (err) {
              console.error("JSON parse error:", err);
            }
          }
        }
      }
    }
  }
}

startEvaluationProcess().then(() => {
  console.log("Evaluation run completed.");
  process.exit(0);
});
