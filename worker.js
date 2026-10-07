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
  console.error("FIREBASE_SERVICE_ACCOUNT secret is missing or invalid JSON!");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const GEMINI_KEY = process.env.GEMINI_API_KEY;

async function callGemini(prompt, imageParts) {
  // Google के निर्देशानुसार gemini-3.8-flash और बैकअप gemini-3.5-flash
  const models = ["gemini-3.8-flash", "gemini-3.5-flash"];
  
  for (const model of models) {
    try {
      console.log(`Calling Gemini Model: ${model}...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
      
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
      
      console.log(`API response on ${model}:`, data.error ? data.error.message : "No content");
    } catch (e) {
      console.log(`Error calling ${model}:`, e.message);
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

      if (exam && exam.needsAiEvaluation === true) {
        console.log(`Evaluating UID: ${doc.id}, Day: ${day}`);

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
          const aiResponse = await callGemini(prompt, imageParts);
          
          if (aiResponse) {
            try {
              const cleanJson = aiResponse.replace(/```json|```/g, "").trim();
              const parsed = JSON.parse(cleanJson);
              const marks = parseInt(parsed.totalSubjectiveMarks, 10) || 0;
              const total = (exam.objectiveMarks || 0) + marks;

              await db.collection("bseb_exams_2026").doc(doc.id).set({
                completedDays: {
                  [day]: {
                    subjectiveMarks: marks,
                    totalMarks: total,
                    aiFeedback: parsed.overallRemarks || "मूल्यांकन संपन्न",
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
