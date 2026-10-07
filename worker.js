/**
 * NischayDesk - Official Cloud AI Evaluator Worker
 * BSEB Class 10 Strict Step-by-Step Evaluation Engine
 */
const admin = require("firebase-admin");

// 1. Firebase Admin Initialization
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (e) {
  console.error("CRITICAL: FIREBASE_SERVICE_ACCOUNT secret is missing or invalid JSON!");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const GEMINI_KEY = process.env.GEMINI_API_KEY;

// 2. Load BSEB Questions Blueprint
let BSEB_PAPERS_DATABASE = {};
try {
  const paperModule = require("./bseb-papers.js");
  BSEB_PAPERS_DATABASE = paperModule.BSEB_PAPERS_DATABASE || paperModule;
  console.log("✓ Successfully loaded official BSEB Question Blueprint.");
} catch (err) {
  console.warn("Notice: bseb-papers.js direct import fallback:", err.message);
}

// बिहार बोर्ड 6-दिवसीय परीक्षा मैपिंग
const DAY_TO_KEY = {
  "1": "101-hindi",
  "2": "105-sanskrit",
  "3": "110-math",
  "4": "112-science",
  "5": "113-sst",
  "6": "114-english"
};

async function callGemini(prompt, imageParts) {
  // Flash 3.8 प्राथमिक और Flash 3.5 बैकअप
  const models = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
  
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
      console.log(`API response note on ${model}:`, data.error ? data.error.message : "No content returned");
    } catch (e) {
      console.log(`Network error calling ${model}:`, e.message);
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

      // केवल वे कॉपियाँ जो चेकिंग के लिए पेंडिंग हैं
      if (exam && exam.needsAiEvaluation === true) {
        console.log(`Processing Copy for UID: ${doc.id}, Day: ${day}`);

        const paperKey = exam.subjectKey || DAY_TO_KEY[String(day)] || "101-hindi";
        const paperData = BSEB_PAPERS_DATABASE[paperKey] || {};
        const subjectName = paperData.subjectName || exam.subjectName || "बिहार बोर्ड मैट्रिक परीक्षा";
        const blueprint = JSON.stringify(paperData.subjectiveBlueprint || {});

        const pagesSnap = await db.collection("bseb_exams_2026")
          .doc(doc.id)
          .collection(`day_${day}_pages`)
          .orderBy("pageNumber", "asc")
          .get();

        console.log(`Found ${pagesSnap.docs.length} uploaded pages for Day ${day} (${subjectName}).`);

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
          const prompt = `You are the Official Chief Examiner of Bihar School Examination Board (BSEB, Patna).
Evaluate this Class 10th Board subjective answer sheet strictly based on official BSEB marking schemes.

TARGET EXAM: "${subjectName}" (Code: ${paperKey}).
MAX SUBJECTIVE MARKS: 50.

OFFICIAL QUESTIONS BLUEPRINT FOR THIS EXAM:
${blueprint}

STRICT STEP-BY-STEP EVALUATION RULES:
1. SUBJECT INTEGRITY CHECK:
   - Check if the answers in the images match the target subject ("${subjectName}").
   - If the student uploaded answers of a DIFFERENT subject (e.g. Mathematics uploaded for Hindi, or blank/irrelevant pages), set "isValid": false, "totalSubjectiveMarks": 0, "status": "MISMATCH_REJECTED", and "overallRemarks": "अमान्य विषय: निर्धारित विषय की जगह अन्य विषय की उत्तर पुस्तिका अपलोड की गई है।"

2. STEP-BY-STEP MARKING CRITERIA (If Valid):
   - Award marks per step. For Math/Science: formula step (1m), calculation step (1m), final answer with unit (1m).
   - For Language/Social Science: introduction (1m), core points/grammar (2-3m), neat conclusion (1m).
   - Deduct marks for missing steps, wrong formulas, or incomplete explanations.
   - Do NOT award generic or free marks. If an answer is half-correct, award only partial step marks.

3. FINAL OUTPUT FORMAT:
   - You must output STRICT JSON ONLY. Do not enclose in markdown blocks if possible, no preamble.
{
  "isValid": true,
  "totalSubjectiveMarks": 24,
  "stepBreakdown": "Q1: 2/2, Q2: 1.5/2 (गणना अधूरी), Q3: 3/5...",
  "overallRemarks": "हैंडराइटिंग अच्छी है, लेकिन दीर्घ उत्तरीय प्रश्नों में स्टेप्स पूरे लिखें।",
  "status": "EVALUATED"
}`;

          console.log(`Sending ${imageParts.length} pages to Gemini for step-by-step evaluation...`);
          const aiResponse = await callGemini(prompt, imageParts);
          
          if (aiResponse) {
            try {
              const cleanJson = aiResponse.replace(/```json|```/g, "").trim();
              const parsed = JSON.parse(cleanJson);
              
              let marks = 0;
              let finalStatus = "EVALUATED";
              
              if (parsed.isValid === false || parsed.status === "MISMATCH_REJECTED") {
                marks = 0;
                finalStatus = "MISMATCH_REJECTED";
                console.log(`⚠ Rejected: Subject Mismatch for UID: ${doc.id}`);
              } else {
                marks = parseInt(parsed.totalSubjectiveMarks, 10) || 0;
              }

              const total = (exam.objectiveMarks || 0) + marks;
              const feedback = parsed.overallRemarks || "मूल्यांकन संपन्न";

              await db.collection("bseb_exams_2026").doc(doc.id).set({
                completedDays: {
                  [day]: {
                    subjectiveMarks: marks,
                    totalMarks: total,
                    aiFeedback: feedback,
                    stepBreakdown: parsed.stepBreakdown || "",
                    status: finalStatus,
                    needsAiEvaluation: false,
                    evaluatedByServerAt: new Date().toISOString()
                  }
                }
              }, { merge: true });

              console.log(`✓ Result Saved: UID ${doc.id}, Day ${day} -> Sub: ${marks}, Total: ${total}, Status: ${finalStatus}`);
            } catch (err) {
              console.error("JSON parse error from Gemini response:", err);
            }
          } else {
            console.error("Gemini failed to return response.");
          }
        } else {
          console.log("No valid images found for this candidate.");
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
