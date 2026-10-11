/**
 * NischayDesk - Official Cloud AI Evaluator Worker
 * BSEB Class 10 Step-by-Step Evaluation Engine (100% Bulletproof & Deep Micro-Checking Edition)
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

function safeParseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text.trim());
  } catch (e) {}

  const matchBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (matchBlock && matchBlock[1]) {
    try {
      return JSON.parse(matchBlock[1].trim());
    } catch (e) {}
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    } catch (e) {}
  }

  return null;
}

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
  console.log("Checking Firestore for pending or unindexed evaluations...");
  const snapshot = await db.collection("bseb_exams_2026").get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const completedDays = data.completedDays || {};

    for (const day of Object.keys(completedDays)) {
      const exam = completedDays[day];

      const isMissingPagesEval = !Array.isArray(exam?.pagesEvaluation) || exam.pagesEvaluation.length === 0;
      const shouldEvaluate = exam && (exam.needsAiEvaluation === true || exam.status === "MISMATCH_REJECTED" || isMissingPagesEval);

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

        const totalPagesCount = pagesSnap.docs.length;
        console.log(`Found ${totalPagesCount} uploaded pages for Day ${day} (${subjectName}).`);

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
          const prompt = `You are the Official Strict Chief Examiner of Bihar School Examination Board (BSEB, Patna).
Evaluate this Class 10th Board subjective answer sheet page-by-page with surgical, step-by-step precision.

TARGET EXAM: "${subjectName}" (Code: ${paperKey}).
MAX SUBJECTIVE MARKS: ${maxSubjective}.
TOTAL ATTACHED PAGES: ${imageParts.length}.

OFFICIAL QUESTIONS BLUEPRINT FOR THIS EXAM:
${blueprint}

STRICT EVALUATION INSTRUCTIONS:
1. PAGE-BY-PAGE INDEPENDENT EVALUATION:
   - There are exactly ${imageParts.length} pages attached, indexed from 0 to ${imageParts.length - 1}.
   - You MUST evaluate each page INDEPENDENTLY.
   - If a page contains out-of-blueprint content (e.g. Class 11 sets/maths on Hindi paper, registration forms, personal photos, QR codes, blank sheets): assign "marksOnThisPage": 0, "errorNote": "ब्लूप्रिंट से बाहर / अमान्य पृष्ठ", and "remarks": "अमान्य सामग्री पर 0 अंक".
   - CRITICAL: DO NOT reject valid pages! Award legitimate step marks on correct pages.

2. SURGICAL STEP-BY-STEP CHECKING & ERROR IDENTIFICATION:
   - For every question attempt, check every single line, step, equation, sign (+/-), and factual detail.
   - For Mathematics: Check each step. If there is a calculation mistake, wrong formula, or sign error (e.g., (-) instead of (+)), specify it explicitly in "errorNote" (e.g., "चरण 2 में चिह्न त्रुटि: (-) की जगह (+) लिखा (-1 अंक)").
   - For Hindi/Language: Check question facts, grammar, and format. If an answer is factually wrong (e.g. wrong character description) or word count is deficient, explicitly report it in "errorNote" (e.g., "प्र० 5(घ) तथ्यात्मक त्रुटि (-2 अंक)").
   - If a page's answers are 100% correct without errors, set "errorNote": "".

3. SHORT HINDI DESCRIPTIONS (REQUIRED):
   - "remarks": Clear reason for marks awarded (max 60 characters). E.g., "गद्यांश 1 के सभी 5 उत्तर पूर्णतः शुद्ध (+10 अंक)"
   - "errorNote": Specific mistake or deficiency (max 50 characters). E.g., "प्र० 5(घ) में तथ्यात्मक गलती (-2 अंक)"

4. TOTAL SUM:
   - "totalSubjectiveMarks" MUST be the exact sum of all "marksOnThisPage" values (Max: ${maxSubjective}).

OUTPUT MUST BE VALID JSON ONLY (NO EXTRA TEXT):
{
  "totalSubjectiveMarks": 35,
  "maxSubjective": ${maxSubjective},
  "overallRemarks": "मूल्यांकन संपन्न। अमान्य पृष्ठों पर शून्य एवं वैध चरणों पर नियमानुसार अंक प्रदान किए गए।",
  "status": "EVALUATED",
  "pagesEvaluation": [
    {
      "pageIndex": 0,
      "pageNumber": 1,
      "marksOnThisPage": 10,
      "errorNote": "",
      "remarks": "गद्यांश 1 के सभी 5 उत्तर पूर्णतः शुद्ध (+10 अंक)"
    },
    {
      "pageIndex": 1,
      "pageNumber": 2,
      "marksOnThisPage": 0,
      "errorNote": "कक्षा 11वीं समुच्चय नोट्स (आउट ऑफ सिलेबस)",
      "remarks": "अमान्य सामग्री / 0 अंक"
    }
  ]
}`;

          console.log(`Sending ${imageParts.length} pages to Gemini for step-by-step evaluation...`);
          const aiResponse = await callGemini(prompt, imageParts);
          
          if (aiResponse) {
            const parsed = safeParseJson(aiResponse);
            
            if (parsed) {
              let rawPagesList = parsed.pagesEvaluation || parsed.pages || parsed.pageEvaluations || [];
              if (!Array.isArray(rawPagesList) && typeof rawPagesList === "object") {
                rawPagesList = Object.values(rawPagesList);
              }

              let finalPagesEvaluation = [];

              for (let idx = 0; idx < imageParts.length; idx++) {
                let match = null;
                if (Array.isArray(rawPagesList)) {
                  match = rawPagesList.find(p => p && (Number(p.pageIndex) === idx || Number(p.pageNumber) === (idx + 1)));
                  if (!match && rawPagesList[idx]) match = rawPagesList[idx];
                }

                if (match) {
                  finalPagesEvaluation.push({
                    pageIndex: idx,
                    pageNumber: idx + 1,
                    marksOnThisPage: Number(match.marksOnThisPage != null ? match.marksOnThisPage : (match.marks || 0)) || 0,
                    errorNote: String(match.errorNote || match.error || ""),
                    remarks: String(match.remarks || match.reason || "")
                  });
                } else {
                  finalPagesEvaluation.push({
                    pageIndex: idx,
                    pageNumber: idx + 1,
                    marksOnThisPage: 0,
                    errorNote: "पेज का विवरण अनुपलब्ध",
                    remarks: "0 अंक"
                  });
                }
              }

              let calculatedMarks = finalPagesEvaluation.reduce((sum, p) => sum + (Number(p.marksOnThisPage) || 0), 0);
              
              if (calculatedMarks === 0 && parsed.totalSubjectiveMarks > 0) {
                calculatedMarks = Number(parsed.totalSubjectiveMarks) || 0;
                finalPagesEvaluation[0].marksOnThisPage = calculatedMarks;
              }

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
                    pagesEvaluation: finalPagesEvaluation,
                    status: "EVALUATED",
                    needsAiEvaluation: false,
                    evaluatedByServerAt: new Date().toISOString()
                  }
                }
              }, { merge: true });

              console.log(`✓ Result Saved: UID ${doc.id}, Day ${day} -> Sub: ${calculatedMarks}/${maxSubjective}, Pages: ${finalPagesEvaluation.length}, Status: EVALUATED`);
            } else {
              console.error("Failed to parse Gemini JSON. Raw text:", aiResponse);
            }
          } else {
            console.error("Gemini failed to return response.");
          }
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
