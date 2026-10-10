/**
 * NischayDesk - Official Cloud AI Evaluator Worker
 * BSEB Class 10 Strict Step-by-Step Evaluation Engine (Zero Global Rejection Edition)
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
  const models = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-1.5-pro"];
  
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
Evaluate this Class 10th Board subjective answer sheet based on the official BSEB blueprint.

TARGET EXAM: "${subjectName}" (Code: ${paperKey}).
MAX SUBJECTIVE MARKS: 50.

OFFICIAL QUESTIONS BLUEPRINT FOR THIS EXAM:
${blueprint}

ABSOLUTE EVALUATION RULES (MUST FOLLOW STRICTLY):
1. INDEPENDENT PAGE EVALUATION (DO NOT REJECT THE WHOLE SCRIPT):
   - You will evaluate each page (starting from pageIndex 0) completely INDEPENDENTLY.
   - If a page contains notes from another subject/class (e.g. Mathematics/Sets notes on a Hindi paper, blank page, or doodles), assign marksOnThisPage: 0 FOR THAT SPECIFIC PAGE ONLY.
   - DO NOT reject the entire exam or set status to "MISMATCH_REJECTED" if ANY valid answers exist.
   - On valid pages, match the student's handwritten answers to the blueprint. Award generous step marks for all legitimate attempts from the blueprint (e.g., Unseen Passage, Essay, Letter, Textbook Qs).

2. TOTAL SCORE:
   - "totalSubjectiveMarks" MUST be the exact sum of marks from all individual pages in "pagesEvaluation".

3. STRICT JSON OUTPUT FORMAT (NO MARKDOWN WRAPPERS):
{
  "totalSubjectiveMarks": 35,
  "stepBreakdown": "P0: 0m (अमान्य विषय), P1: 8m (गद्यांश), P2: 5m (पत्र), P3: 10m (निबंध), P4: 12m (लघु/दीर्घ प्रश्न), P5: 0m (अमान्य विषय)",
  "overallRemarks": "मान्य उत्तरों का निष्पक्ष मूल्यांकन संपन्न। अप्रासंगिक पृष्ठों को शून्य अंक दिए गए।",
  "status": "EVALUATED",
  "pagesEvaluation": [
    {"pageIndex": 0, "marksOnThisPage": 0, "reason": "Out of blueprint/irrelevant subject"},
    {"pageIndex": 1, "marksOnThisPage": 8, "reason": "Unseen passage answers"},
    {"pageIndex": 2, "marksOnThisPage": 5, "reason": "Letter writing"},
    {"pageIndex": 3, "marksOnThisPage": 10, "reason": "Essay writing"},
    {"pageIndex": 4, "marksOnThisPage": 12, "reason": "Short and long textbook questions"},
    {"pageIndex": 5, "marksOnThisPage": 0, "reason": "Out of blueprint/irrelevant subject"}
  ]
}`;

          console.log(`Sending ${imageParts.length} pages to Gemini for step-by-step evaluation...`);
          const aiResponse = await callGemini(prompt, imageParts);
          
          if (aiResponse) {
            try {
              const cleanJson = aiResponse.replace(/```json|```/g, "").trim();
              const parsed = JSON.parse(cleanJson);
              
              // पन्नों के अंकों का सुरक्षित जोड़ (Never 0 if valid pages have marks)
              let pagesEval = Array.isArray(parsed.pagesEvaluation) ? parsed.pagesEvaluation : [];
              let calculatedMarks = 0;
              
              if (pagesEval.length > 0) {
                calculatedMarks = pagesEval.reduce((sum, p) => sum + (Number(p.marksOnThisPage) || 0), 0);
              } else {
                calculatedMarks = parseInt(parsed.totalSubjectiveMarks, 10) || 0;
              }

              const total = (exam.objectiveMarks || 0) + calculatedMarks;
              const feedback = parsed.overallRemarks || "मूल्यांकन संपन्न।";

              // Always EVALUATED — कभी भी पूरे पेपर को MISMATCH_REJECTED नहीं करना
              await db.collection("bseb_exams_2026").doc(doc.id).set({
                completedDays: {
                  [day]: {
                    subjectiveMarks: calculatedMarks,
                    totalMarks: total,
                    aiFeedback: feedback,
                    stepBreakdown: parsed.stepBreakdown || "",
                    pagesEvaluation: pagesEval,
                    status: "EVALUATED",
                    needsAiEvaluation: false,
                    evaluatedByServerAt: new Date().toISOString()
                  }
                }
              }, { merge: true });

              console.log(`✓ Result Saved: UID ${doc.id}, Day ${day} -> Sub: ${calculatedMarks}, Total: ${total}, Status: EVALUATED`);
            } catch (err) {
              console.error("JSON parse error from Gemini response:", err);
              console.error("Raw Response:", aiResponse);
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
