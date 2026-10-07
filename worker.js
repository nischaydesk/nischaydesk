/**
 * NischayDesk - Cloud AI Evaluator Worker
 * Runs on GitHub Cloud / Server
 */
const admin = require("firebase-admin");

// 1. Firebase Admin Init (Safe Parse)
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (e) {
  console.error("FIREBASE_SERVICE_ACCOUNT सीक्रेट खाली है या अमान्य JSON है!");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const GEMINI_KEY = process.env.GEMINI_API_KEY;

async function callGeminiWithRetry(prompt, imageParts) {
  let attempts = 0;
  
  while (attempts < 3) {
    attempts++;
    try {
      console.log(`Calling Gemini API (Attempt ${attempts})...`);
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
      console.log(`AI Response error/busy:`, JSON.stringify(data));
      await new Promise(r => setTimeout(r, 3000));
    } catch (e) {
      console.log(`Network retry error:`, e.message);
      await new Promise(r => setTimeout(r, 3000));
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

        console.log(`Found ${pagesSnap.docs.length} uploaded pages for Day ${day}.`);

        let imageParts = [];
        for (const pDoc of pagesSnap.docs) {
          const imgUrl = pDoc.data().imageUrl;
          if (imgUrl) {
            try {
              console.log(`Downloading page image: ${imgUrl}`);
              const imgRes = await fetch(imgUrl);
              const arrayBuffer = await imgRes.arrayBuffer();
              const b64 = Buffer.from(arrayBuffer).toString("base64");
              
              // Gemini API expects "inlineData" with camelCase
              imageParts.push({
                inlineData: { mimeType: "image/jpeg", data: b64 }
              });
            } catch (err) {
              console.error(`Failed to download image ${imgUrl}:`, err.message);
            }
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

          console.log(`Sending ${imageParts.length} pages to Gemini AI...`);
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

              console.log(`✓ Successfully Evaluated & Saved: UID ${doc.id}, Day ${day}, Subjective Marks: ${marks}, Total: ${total}`);
            } catch (err) {
              console.error("JSON parse error:", err);
            }
          } else {
            console.error("Gemini failed to return valid evaluation response.");
          }
        } else {
          console.log("No valid images found to evaluate.");
        }
      }
    }
  }
}

startEvaluationProcess().then(() => {
  console.log("Evaluation run completed.");
  process.exit(0);
}).catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
