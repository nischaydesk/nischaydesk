/**
 * NischayDesk - Official Cloud AI Evaluator Worker
 * BSEB Class 10 Strict Step-by-Step Evaluation Engine (Dynamic Marks & Error-Tracking Edition)
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

        // विज्ञान और सामाजिक विज्ञान में 40 अंक, बाकी में 50 अंक
        const maxSubjective = (paperKey === "112-science" || paperKey === "113-sst") ? 40 : 50;

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
Evaluate this Class 10th Board subjective answer sheet page-by-page.

TARGET EXAM: "${subjectName}" (Code: ${paperKey}).
MAX SUBJECTIVE MARKS: ${maxSubjective}.
TOTAL ATTACHED PAGES: ${imageParts.length}.

OFFICIAL QUESTIONS BLUEPRINT FOR THIS EXAM:
${blueprint}

STRICT EVALUATION INSTRUCTIONS:
1. PAGE-BY-PAGE INDEPENDENT EVALUATION:
   - There are exactly ${imageParts.length} pages attached, indexed from 0 to ${imageParts.length - 1}.
   - Evaluate each page INDEPENDENTLY.
   - DO NOT dump all marks onto pageIndex 0. Marks must belong to the exact page where the answer is written.
   - If a page contains out-of-syllabus notes (e.g. Class 11 sets/maths on Hindi paper), non-exam images, or irrelevant text, set "marksOnThisPage": 0 and "errorNote": "अप्रासंगिक सामग्री / ब्लूप्रिंट से बाहर". DO NOT reject the valid pages.

2. STEP-BY-STEP CHECKING & SPECIFIC MISTAKE REPORTING:
   - For legitimate answers from the blueprint, evaluate step-by-step.
   - If an answer has a calculation error, incorrect formula, spelling mistake, or incomplete conclusion, award fair partial marks and EXPLICITLY state the exact issue in "errorNote" (e.g., "चरण 2 में गणना गलत है (-1 अंक)" or "निष्कर्ष अधूरा छोड़ा गया").
   - If an answer is completely correct, set "errorNote": "".

3. MARKS SUM:
   - "totalSubjectiveMarks" MUST be the exact sum of all "marksOnThisPage" values. It CANNOT exceed ${maxSubjective}.

4. STRICT JSON FORMAT ONLY (NO MARKDOWN BLOCKS):
{
  "totalSubjectiveMarks": 32,
  "maxSubjective": ${maxSubjective},
  "overallRemarks": "गद्यांश और पत्र लेखन उत्कृष्ट है। व्याकरण में कुछ अशुद्धियाँ पाई गईं।",
  "status": "EVALUATED",
  "pagesEvaluation": [
    {
      "pageIndex": 0,
      "pageNumber": 1,
      "marksOnThisPage": 8,
      "errorNote": "प्र० 1(घ) में उत्तर अधूरा है (-2 अंक)",
      "remarks": "गद्यांश आधारित उत्तर संतोषजनक"
    },
    {
      "pageIndex": 1,
      "pageNumber": 2,
      "marksOnThisPage": 5,
      "errorNote": "",
      "remarks": "पत्र लेखन का प्रारूप पूर्णतः शुद्ध"
    }
  ]
}`;

          console.log(`Sending ${imageParts.length} pages to Gemini for step-by-step evaluation...`);
          const aiResponse = await callGemini(prompt, imageParts);
          
          if (aiResponse) {
            try {
              const cleanJson = aiResponse.replace(/```json|```/g, "").trim();
              const parsed = JSON.parse(cleanJson);
              
              let pagesEval = Array.isArray(parsed.pagesEvaluation) ? parsed.pagesEvaluation : [];
              let calculatedMarks = 0;
              
              if (pagesEval.length > 0) {
                calculatedMarks = pagesEval.reduce((sum, p) => sum + (Number(p.marksOnThisPage) || 0), 0);
              } else {
                calculatedMarks = parseInt(parsed.totalSubjectiveMarks, 10) || 0;
              }

              // कुल अंक अधिकतम सीमा (40 या 50) से अधिक न हों
              calculatedMarks = Math.min(calculatedMarks, maxSubjective);

              const total = (exam.objectiveMarks || 0) + calculatedMarks;
              const feedback = parsed.overallRemarks || "मूल्यांकन संपन्न।";

              await db.collection("bseb_exams_2026").doc(doc.id).set({
                completedDays: {
                  [day]: {
                    subjectiveMarks: calculatedMarks,
                    maxSubjectiveMarks: maxSubjective,
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

              console.log(`✓ Result Saved: UID ${doc.id}, Day ${day} -> Sub: ${calculatedMarks}/${maxSubjective}, Total: ${total}, Status: EVALUATED`);
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
