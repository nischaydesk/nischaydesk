/* ==========================================================================
   NischayDesk - BSEB Question Papers, Answer Keys & Subjective Blueprint
   Curated for: Class 10th (Matric) Board Real Simulation
   ========================================================================== */

const BSEB_PAPERS_DATABASE = {
  // 1. मातृभाषा हिन्दी (Code: 101)
  "101-hindi": {
    subjectCode: "101",
    subjectName: "हिन्दी (M.I.L Hindi)",
    fullMarks: 100,
    passMarks: 30,
    hasPractical: false,
    totalPages: 23,
    driveLink: "https://drive.google.com/file/d/10tq2M_1xREn-wB0JHBxr1iPkAFxenqI6/preview",
    subjectiveBlueprint: {
      totalSubjectiveMarks: 50,
      sections: [
        { name: "गद्यांश (Comprehension)", maxMarks: 20, rule: "दो गद्यांश (10 + 10 अंक), प्रत्येक में 2-2 अंक के 5 प्रश्न।" },
        { name: "निबंध लेखन (Essay Writing)", maxMarks: 10, rule: "दिए गए विषयों में से किसी एक पर लगभग 250-300 शब्दों में निबंध (10 अंक)।" },
        { name: "पत्र / संवाद लेखन (Letter / Dialogue)", maxMarks: 5, rule: "आवेदन पत्र या दो व्यक्तियों के बीच संवाद (5 अंक)।" },
        { name: "लघु उत्तरीय प्रश्न (Short Questions)", maxMarks: 10, rule: "किन्हीं 5 प्रश्नों के उत्तर 20-30 शब्दों में (5 x 2 अंक = 10 अंक)।" },
        { name: "दीर्घ उत्तरीय व्याख्या (Long Question)", maxMarks: 5, rule: "किसी एक काव्यांश/गद्यांश का भावार्थ/व्याख्या (5 अंक)।" }
      ]
    },
    answerKey: {
      1: "A", 2: "A", 3: "B", 4: "A", 5: "B",
      6: "C", 7: "D", 8: "C", 9: "A", 10: "B",
      11: "D", 12: "A", 13: "A", 14: "C", 15: "D",
      16: "A", 17: "D", 18: "A", 19: "B", 20: "B",
      21: "B", 22: "C", 23: "D", 24: "C", 25: "C",
      26: "A", 27: "C", 28: "A", 29: "C", 30: "C",
      31: "D", 32: "C", 33: "B", 34: "D", 35: "A",
      36: "B", 37: "A", 38: "C", 39: "A", 40: "B",
      41: "B", 42: "B", 43: "C", 44: "B", 45: "B",
      46: "A", 47: "C", 48: "C", 49: "A", 50: "C",
      51: "C", 52: "D", 53: "A", 54: "C", 55: "C",
      56: "C", 57: "A", 58: "B", 59: "C", 60: "B",
      61: "C", 62: "B", 63: "C", 64: "B", 65: "A",
      66: "B", 67: "C", 68: "C", 69: "B", 70: "A",
      71: "C", 72: "A", 73: "A", 74: "A", 75: "A",
      76: "C", 77: "C", 78: "A", 79: "D", 80: "C",
      81: "C", 82: "A", 83: "C", 84: "A", 85: "A",
      86: "C", 87: "A", 88: "B", 89: "A", 90: "C",
      91: "D", 92: "B", 93: "D", 94: "D", 95: "C",
      96: "B", 97: "A", 98: "A", 99: "C", 100: "B"
    }
  },

  // 2. संस्कृत (Code: 105)
  "105-sanskrit": {
    subjectCode: "105",
    subjectName: "संस्कृत (S.I.L Sanskrit)",
    fullMarks: 100,
    passMarks: 30,
    hasPractical: false,
    totalPages: 20,
    driveLink: "https://drive.google.com/file/d/1m_Gvjc5BFg-Gq8cInuVcpJwdesy3jcSX/preview",
    subjectiveBlueprint: {
      totalSubjectiveMarks: 50,
      sections: [
        { name: "अपठित गद्यांश (Unseen Passage)", maxMarks: 13, rule: "दो अपठित गद्यांश (7 + 6 अंक)।" },
        { name: "संस्कृत पत्र लेखन (Letter Writing)", maxMarks: 8, rule: "किन्हीं दो पत्रों का लेखन (2 x 4 अंक = 8 अंक)।" },
        { name: "अनुच्छेद लेखन (Sanskrit Paragraph)", maxMarks: 7, rule: "किसी एक विषय पर 7 वाक्यों में संस्कृत अनुच्छेद (7 अंक)।" },
        { name: "संस्कृत अनुवाद (Translation)", maxMarks: 6, rule: "किन्हीं 6 वाक्यों का संस्कृत में अनुवाद (6 x 1 अंक = 6 अंक)।" },
        { name: "लघु उत्तरीय प्रश्न (Textbook Qs)", maxMarks: 16, rule: "पाठ्यपुस्तक से किन्हीं 8 प्रश्नों के उत्तर हिन्दी में (8 x 2 अंक = 16 अंक)।" }
      ]
    },
    answerKey: {
      1: "D", 2: "B", 3: "C", 4: "D", 5: "A", 6: "B", 7: "B", 8: "D", 9: "A", 10: "A",
      11: "B", 12: "A", 13: "A", 14: "B", 15: "A", 16: "B", 17: "A", 18: "C", 19: "C", 20: "B",
      21: "A", 22: "B", 23: "A", 24: "B", 25: "C", 26: "B", 27: "B", 28: "C", 29: "A", 30: "C",
      31: "C", 32: "A", 33: "B", 34: "A", 35: "A", 36: "D", 37: "A", 38: "B", 39: "C", 40: "D",
      41: "C", 42: "D", 43: "A", 44: "A", 45: "B", 46: "D", 47: "C", 48: "B", 49: "A", 50: "B",
      51: "A", 52: "C", 53: "D", 54: "C", 55: "A", 56: "A", 57: "A", 58: "A", 59: "C", 60: "A",
      61: "C", 62: "A", 63: "C", 64: "B", 65: "D", 66: "A", 67: "C", 68: "A", 69: "B", 70: "B",
      71: "A", 72: "A", 73: "B", 74: "B", 75: "D", 76: "D", 77: "C", 78: "D", 79: "B", 80: "B",
      81: "B", 82: "C", 83: "D", 84: "A", 85: "C", 86: "D", 87: "A", 88: "A", 89: "D", 90: "D",
      91: "B", 92: "C", 93: "D", 94: "B", 95: "C", 96: "B", 97: "B", 98: "B", 99: "C", 100: "A"
    }
  },

  // 3. गणित (Code: 110)
  "110-math": {
    subjectCode: "110",
    subjectName: "गणित (Mathematics)",
    fullMarks: 100,
    passMarks: 30,
    hasPractical: false,
    totalPages: 32,
    driveLink: "https://drive.google.com/file/d/1w78O_KDgZq3foKaLEv3xhP4vRTOyq02b/preview",
    subjectiveBlueprint: {
      totalSubjectiveMarks: 50,
      sections: [
        { name: "लघु उत्तरीय प्रश्न (Short Answer)", maxMarks: 30, rule: "कुल 30 में से किन्हीं 15 प्रश्नों के उत्तर दें। प्रत्येक प्रश्न 2 अंक का (15 x 2 = 30 अंक)। स्टेप्स पर अंक दें।" },
        { name: "दीर्घ उत्तरीय प्रश्न (Long Answer)", maxMarks: 20, rule: "कुल 8 में से किन्हीं 4 प्रश्नों के उत्तर दें। प्रत्येक प्रश्न 5 अंक का (4 x 5 = 20 अंक)। ग्राफ, प्रमेय और गणना स्टेप-वाइज जाँचें।" }
      ]
    },
    answerKey: {
      1: "D", 2: "B", 3: "C", 4: "C", 5: "C", 6: "D", 7: "B", 8: "B", 9: "A", 10: "B",
      11: "B", 12: "A", 13: "A", 14: "D", 15: "B", 16: "D", 17: "B", 18: "D", 19: "D", 20: "D",
      21: "C", 22: "A", 23: "D", 24: "C", 25: "B", 26: "C", 27: "A", 28: "B", 29: "B", 30: "B",
      31: "B", 32: "C", 33: "B", 34: "B", 35: "B", 36: "B", 37: "D", 38: "B", 39: "B", 40: "B",
      41: "D", 42: "A", 43: "B", 44: "B", 45: "C", 46: "B", 47: "B", 48: "D", 49: "C", 50: "B",
      51: "A", 52: "C", 53: "C", 54: "C", 55: "A", 56: "D", 57: "D", 58: "B", 59: "A", 60: "C",
      61: "B", 62: "C", 63: "B", 64: "A", 65: "C", 66: "D", 67: "C", 68: "C", 69: "B", 70: "C",
      71: "D", 72: "B", 73: "B", 74: "B", 75: "B", 76: "A", 77: "C", 78: "B", 79: "C", 80: "A",
      81: "B", 82: "A", 83: "D", 84: "B", 85: "B", 86: "B", 87: "B", 88: "B", 89: "B", 90: "C",
      91: "B", 92: "B", 93: "D", 94: "B", 95: "B", 96: "A", 97: "B", 98: "A", 99: "B", 100: "A"
    }
  },

  // 4. विज्ञान (Code: 112)
  "112-science": {
    subjectCode: "112",
    subjectName: "विज्ञान (Science)",
    fullMarks: 100,
    passMarks: 30,
    hasPractical: true,
    practicalMarks: 20,
    totalPages: 24,
    driveLink: "https://drive.google.com/file/d/1S0CRy6LT8wE7yByQN1Rx4JOgrIk5QD1Y/preview",
    subjectiveBlueprint: {
      totalSubjectiveMarks: 40,
      sections: [
        { name: "भौतिक विज्ञान (Physics)", maxMarks: 13, rule: "लघु उत्तरीय (4 x 2 = 8 अंक) + 1 दीर्घ उत्तरीय (6 अंक में से हल या 5 अंक)। कुल 13 अंक।" },
        { name: "रसायन विज्ञान (Chemistry)", maxMarks: 13, rule: "लघु उत्तरीय (4 x 2 = 8 अंक) + 1 दीर्घ उत्तरीय (5 अंक)। कुल 13 अंक।" },
        { name: "जीव विज्ञान (Biology)", maxMarks: 14, rule: "लघु उत्तरीय (4 x 2 = 8 अंक) + 1 दीर्घ उत्तरीय (6/5 अंक)। कुल 14 अंक।" }
      ]
    },
    answerKey: {
      1: "B", 2: "B", 3: "A", 4: "C", 5: "C", 6: "D", 7: "B", 8: "B", 9: "D", 10: "B",
      11: "C", 12: "C", 13: "B", 14: "C", 15: "A", 16: "C", 17: "A", 18: "B", 19: "D", 20: "B",
      21: "A", 22: "D", 23: "B", 24: "C", 25: "A", 26: "C", 27: "D", 28: "B", 29: "B", 30: "B",
      31: "C", 32: "B", 33: "B", 34: "C", 35: "A", 36: "D", 37: "C", 38: "D", 39: "A", 40: "C",
      41: "C", 42: "B", 43: "C", 44: "A", 45: "A", 46: "B", 47: "C", 48: "C", 49: "D", 50: "B",
      51: "A", 52: "B", 53: "B", 54: "C", 55: "C", 56: "B", 57: "C", 58: "D", 59: "B", 60: "D",
      61: "C", 62: "A", 63: "D", 64: "B", 65: "A", 66: "C", 67: "D", 68: "कोई सही विकल्प नहीं", 69: "B", 70: "A",
      71: "A", 72: "B", 73: "C", 74: "A", 75: "D", 76: "B", 77: "D", 78: "C", 79: "A", 80: "B"
    }
  },

  // 5. सामाजिक विज्ञान (Code: 113)
  "113-sst": {
    subjectCode: "113",
    subjectName: "सामाजिक विज्ञान (Social Science)",
    fullMarks: 100,
    passMarks: 30,
    hasPractical: true,
    practicalMarks: 20,
    totalPages: 24,
    driveLink: "https://drive.google.com/file/d/1hg-uLvcYQx9yVB2QFxYMuywt2F9hH2Ly/preview",
    subjectiveBlueprint: {
      totalSubjectiveMarks: 40,
      sections: [
        { name: "इतिहास (History)", maxMarks: 10, rule: "लघु उत्तरीय (3 x 2 = 6 अंक) + 1 दीर्घ उत्तरीय (4 अंक)।" },
        { name: "भूगोल व आपदा (Geography)", maxMarks: 12, rule: "लघु उत्तरीय (3 x 2 = 6 अंक) + आपदा प्रबंधन (2 x 2 = 4 अंक) + 1 दीर्घ उत्तरीय (4 अंक)।" },
        { name: "राजनीति विज्ञान (Pol. Science)", maxMarks: 9, rule: "लघु उत्तरीय (2 x 2 = 4 अंक) + 1 दीर्घ उत्तरीय (4/5 अंक)।" },
        { name: "अर्थशास्त्र (Economics)", maxMarks: 9, rule: "लघु उत्तरीय (2 x 2 = 4 अंक) + 1 दीर्घ उत्तरीय (4/5 अंक)।" }
      ]
    },
    answerKey: {
      1: "C", 2: "D", 3: "A", 4: "D", 5: "B", 6: "A", 7: "D", 8: "D", 9: "C", 10: "D",
      11: "A", 12: "B", 13: "B", 14: "C", 15: "C", 16: "A", 17: "C", 18: "B", 19: "C", 20: "B",
      21: "A", 22: "B", 23: "C", 24: "A", 25: "A", 26: "B", 27: "D", 28: "B", 29: "C", 30: "B",
      31: "C", 32: "D", 33: "A", 34: "C", 35: "B", 36: "A", 37: "A", 38: "B", 39: "A", 40: "D",
      41: "C", 42: "B", 43: "A", 44: "B", 45: "C", 46: "B", 47: "A", 48: "A", 49: "C", 50: "A",
      51: "A", 52: "A", 53: "D", 54: "B", 55: "A", 56: "C", 57: "C", 58: "D", 59: "D", 60: "A",
      61: "C", 62: "A", 63: "A", 64: "B", 65: "B", 66: "B", 67: "A", 68: "C", 69: "A", 70: "C",
      71: "C", 72: "C", 73: "C", 74: "A", 75: "B", 76: "D", 77: "A", 78: "A", 79: "B", 80: "A"
    }
  },

  // 6. अंग्रेजी (Code: 114)
  "114-english": {
    subjectCode: "114",
    subjectName: "अंग्रेजी (English)",
    fullMarks: 100,
    passMarks: 30,
    hasPractical: false,
    totalPages: 22,
    driveLink: "https://drive.google.com/file/d/1rDlSyvoHPxlc_eObIV5ZZFPrqI0vXW0l/preview",
    subjectiveBlueprint: {
      totalSubjectiveMarks: 50,
      sections: [
        { name: "Comprehension Passages", maxMarks: 20, rule: "Unseen prose & poetry passages with short answers (20 Marks)." },
        { name: "Writing Skills", maxMarks: 15, rule: "Notice/Message/Letter/Paragraph writing (15 Marks)." },
        { name: "Short Questions (Textbook)", maxMarks: 10, rule: "Any 5 questions from textbook (5 x 2 = 10 Marks)." },
        { name: "Long Explanation / Summary", maxMarks: 5, rule: "Summary or theme-based long answer (5 Marks)." }
      ]
    },
    answerKey: {
      1: "A", 2: "C", 3: "B", 4: "B", 5: "B", 6: "C", 7: "A", 8: "A", 9: "B", 10: "C",
      11: "C", 12: "B", 13: "B", 14: "C", 15: "A", 16: "D", 17: "A", 18: "C", 19: "C", 20: "C",
      21: "A", 22: "B", 23: "A", 24: "A", 25: "B", 26: "C", 27: "A", 28: "B", 29: "C", 30: "A",
      31: "B", 32: "D", 33: "C", 34: "B", 35: "B", 36: "D", 37: "A", 38: "C", 39: "B", 40: "D",
      41: "B", 42: "B", 43: "D", 44: "C", 45: "A", 46: "B", 47: "A", 48: "A", 49: "C", 50: "B",
      51: "B", 52: "C", 53: "C", 54: "B", 55: "B", 56: "D", 57: "A", 58: "C", 59: "D", 60: "A",
      61: "C", 62: "D", 63: "D", 64: "B", 65: "A", 66: "B", 67: "A", 68: "A", 69: "C", 70: "B",
      71: "C", 72: "B", 73: "C", 74: "B", 75: "C", 76: "D", 77: "C", 78: "C", 79: "C", 80: "A",
      81: "C", 82: "B", 83: "B", 84: "C", 85: "A", 86: "D", 87: "B", 88: "C", 89: "A", 90: "C",
      91: "C", 92: "A", 93: "A", 94: "A", 95: "A", 96: "B", 97: "B", 98: "C", 99: "C", 100: "C"
    }
  }
};
// ग्लोबल विंडो से जोड़ना ताकि iframe को डेटा 100% मिले
window.BSEB_PAPERS_DATABASE = BSEB_PAPERS_DATABASE;

