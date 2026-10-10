/**
 * NischayDesk - Official Cloud AI Evaluator Worker
 * BSEB Class 10 Strict Step-by-Step Evaluation Engine (Auto-Recover & Zero Rejection Edition)
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
  console.log("Checking Firestore for pending or rejected evaluations...");
  const snapshot = await db.collection("bseb_exams_2026").get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const completedDays = data.completedDays || {};

    for (const day of Object.keys(completedDays)) {
      const exam = completedDays[day];

      // 🌟 जादू: पेंडिंग हो या गलती से MISMATCH_REJECTED हुआ हो, यह दोनों को तुरंत उठाएगा!
      const shouldEvaluate = exam && (exam.needsAiEvaluation === true || exam.status === "MISMATCH_REJECTED");

      if (shouldEvaluate) {
        console.log(`Processing Copy for UID: ${doc.id}, Day: ${day}`);

        const paperKey = exam.subjectKey || DAY_TO_KEY[String(day)] || "101-hindi";
        const paperData = BSEB_PAPERS_DATABASE[paperKey] || {};
        const subjectName = paperData.subjectName || exam.subjectName || "बिहार बोर्ड मैट्रिक परीक्षा";
        const blueprint = JSON.stringify(paperData.subjectiveBlueprint || {});

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
1. INDEPENDENT PAGE EVALUATION (ZERO GLOBAL REJECTION):
   - Evaluate each page from pageIndex 0 to ${imageParts.length - 1} independently.
   - If ANY page contains out-of-syllabus notes (e.g., Sets/Maths on a Hindi paper), personal photos, or irrelevant pages, assign "marksOnThisPage": 0 and "errorNote": "अप्रासंगिक / ब्लूप्रिंट से बाहर".
   - CRITICAL: DO NOT reject valid pages! Legitimate answers must be awarded step marks according to the blueprint.

2. STEP-BY-STEP CHECKING:
   - For valid answers, check step-by-step.
   - If an answer has mistakes or missing steps, mention the specific issue in "errorNote" and award partial marks.
   - If completely correct, leave "errorNote": "".

3. MARKS SUM:
   - "totalSubjectiveMarks" MUST be the exact sum of all "marksOnThisPage" values. It CANNOT exceed ${maxSubjective}.

4. STRICT JSON FORMAT ONLY (NO MARKDOWN WRAPPERS):
{
  "totalSubjectiveMarks": 35,
  "maxSubjective": ${maxSubjective},
  "overallRemarks": "मान्य उत्तरों का निष्पक्ष मूल्यांकन संपन्न। अप्रासंगिक पृष्ठों को शून्य अंक दिए गए।",
  "status": "EVALUATED",
  "pagesEvaluation": [
    {
      "pageIndex": 0,
      "pageNumber": 1,
      "marksOnThisPage": 8,
      "errorNote": "",
      "remarks": "गद्यांश उत्तर सही हैं"
    },
    {
      "pageIndex": 1,
      "pageNumber": 2,
      "marksOnThisPage": 0,
      "errorNote": "समुच्चय के नोट्स (आउट ऑफ सिलेबस)",
      "remarks": "अप्रासंगिक सामग्री पर 0 अंक"
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

              calculatedMarks = Math.min(calculatedMarks, maxSubjective);
              const total = (exam.objectiveMarks || 0) + calculatedMarks;
              const feedback = parsed.overallRemarks || "मूल्यांकन संपन्न।";

              // 🌟 यहाँ हमेशा status: "EVALUATED" सेव होगा!
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
