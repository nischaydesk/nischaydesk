/**
 * NischayDesk - Official Cloud AI Evaluator Worker
 * BSEB Class 10 Strict Step-by-Step Evaluation Engine (Updated for Blueprint Validation)
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

      // केवल वे कॉपियाँ जो चेकिंग के लिए पेंडिंग हैं
      if (exam && exam.needsAiEvaluation === true) {
        console.log(`Processing Copy for UID: ${doc.id}, Day:${day}`);

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
Evaluate this Class 10th Board subjective answer sheet STRICTLY based on the official BSEB blueprint provided below.

TARGET EXAM: "${subjectName}" (Code: ${paperKey}).
MAX SUBJECTIVE MARKS: 50.

OFFICIAL QUESTIONS BLUEPRINT FOR THIS EXAM:
${blueprint}

CRITICAL RULES FOR EVALUATION (READ CAREFULLY):
1. STRICT BLUEPRINT MATCHING:
   - Only award marks if the student's answer corresponds to a question present in the provided blueprint.
   - If the student attempts a question from the blueprint but the answer is partially incorrect, incomplete, or has spelling mistakes, BE LENIENT and award legitimate step-marks (e.g., 2 out of 5, or 1 out of 2). DO NOT give 0 if they genuinely tried to answer a blueprint question.
   - REJECTION RULE: If a page contains answers to questions NOT in the blueprint, out-of-syllabus content (like Class 11/12 notes, e.g., 'Sets/समुच्चय'), irrelevant text, songs, or blank spaces, you MUST assign EXACTLY 0 marks to that specific page. Do not reject the entire sheet, just reject that invalid page.

2. PAGE-BY-PAGE BREAKDOWN REQUIRED:
   - You will receive multiple images representing pages. Page index starts at 0.
   - You MUST output the marks awarded for each page individually in the "pagesEvaluation" array.

3. FINAL OUTPUT FORMAT (STRICT JSON ONLY, NO MARKDOWN):
   - Output valid JSON only, without \`\`\`json wrappers.
{
  "isValid": true,
  "totalSubjectiveMarks": 15,
  "stepBreakdown": "Q1: 2/2, Q2: 1.5/2, Q31: 3/5",
  "overallRemarks": "कुछ उत्तर सही हैं, लेकिन अन्य पन्नों पर अप्रासंगिक/अमान्य सामग्री होने के कारण उन पन्नों को 0 अंक दिए गए हैं।",
  "status": "EVALUATED",
  "pagesEvaluation": [
    {"pageIndex": 0, "marksOnThisPage": 0, "reason": "Irrelevant/Out of blueprint content rejected."},
    {"pageIndex": 1, "marksOnThisPage": 5, "reason": "Attempted Q1 and Q2 from blueprint with partial correctness."},
    {"pageIndex": 2, "marksOnThisPage": 10, "reason": "Correct answers for Q31 and Q32."}
  ]
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
                    pagesEvaluation: parsed.pagesEvaluation || [], // <-- New array for page-wise marks
                    status: finalStatus,
                    needsAiEvaluation: false,
                    evaluatedByServerAt: new Date().toISOString()
                  }
                }
              }, { merge: true });

              console.log(`✓ Result Saved: UID ${doc.id}, Day ${day} -> Sub: ${marks}, Total: ${total}, Status: ${finalStatus}`);
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
