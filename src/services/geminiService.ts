import { GoogleGenAI, Type } from "@google/genai";

function getAI(): GoogleGenAI {
  const userKey = typeof window !== "undefined" ? localStorage.getItem("aistudio_api_key") : null;
  const apiKey = userKey || process.env.GEMINI_API_KEY || "";
  return new GoogleGenAI({ apiKey });
}

export interface CompanyResearch {
  companyIntelligence: {
    recentNews: string;
    strategicPriorities: string;
    productLaunches: string;
    cultureSignals: string;
    leadershipInterviews: string;
    annualReportHighlights: string;
  };
  roleIntelligence: {
    coreResponsibilities: string;
    businessChallenges: string;
    successMetrics: string;
    crossFunctionalInteractions: string;
  };
}

export interface CoverLetterRequest {
  companyName: string;
  roleTitle: string;
  resumeText: string;
  jobDescription: string;
  userMotivation?: string;
  additionalContext?: string;
}

export interface FitIntelligence {
  experienceMapping: string;
  relevantAchievements: string;
  uniquePerspective: string;
}

export async function analyzeFit(
  resumeText: string,
  research: CompanyResearch,
  jobDescription: string
): Promise<FitIntelligence> {
  const prompt = `Perform a "Fit Intelligence" analysis based on the following data:
  
  RESUME: ${resumeText}
  
  COMPANY INTELLIGENCE:
  - Strategic Priorities: ${research.companyIntelligence.strategicPriorities}
  - Culture: ${research.companyIntelligence.cultureSignals}
  
  ROLE INTELLIGENCE:
  - Challenges: ${research.roleIntelligence.businessChallenges}
  
  JOB DESCRIPTION: ${jobDescription}
  
  Identify:
  1. EXPERIENCE MAPPING: Which specific parts of the user's background best map to the company's current challenges?
  2. RELEVANT ACHIEVEMENTS: Which 2-3 achievements from the resume are most critical for this specific role?
  3. UNIQUE PERSPECTIVE: What unique value or perspective does this candidate bring that others might not?
  
  Provide the analysis for an MBA student to see their strategic alignment.`;

  const response = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          experienceMapping: { type: Type.STRING },
          relevantAchievements: { type: Type.STRING },
          uniquePerspective: { type: Type.STRING },
        },
        required: ["experienceMapping", "relevantAchievements", "uniquePerspective"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}

export async function researchCompany(companyName: string, roleTitle: string): Promise<CompanyResearch> {
  const prompt = `Research the company "${companyName}" and the role of "${roleTitle}" in depth. 
  Provide a detailed intelligence report with exactly the following structure:
  
  1. COMPANY INTELLIGENCE:
     - Recent News (last 6-12 months): Key announcements, funding, or pivots.
     - Strategic Priorities: What is their main focus right now?
     - Product Launches: Recent or upcoming innovations.
     - Culture Signals: Employer branding themes, values in action.
     - Leadership Interviews: Recent quotes or visions from C-suite/leadership.
     - Annual Report Highlights: Key financial or growth metrics/statements from the latest report.

  2. ROLE INTELLIGENCE:
     - Core Responsibilities: Beyond the generic, what does this role actually do?
     - Likely Business Challenges: What is the person in this role trying to solve?
     - Success Metrics: How is performance measured in this role?
     - Cross-functional Interactions: Who do they work with (departments/teams)?

  Focus on information that would help an MBA student write a world-class, highly personalized application.`;

  const response = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          companyIntelligence: {
            type: Type.OBJECT,
            properties: {
              recentNews: { type: Type.STRING },
              strategicPriorities: { type: Type.STRING },
              productLaunches: { type: Type.STRING },
              cultureSignals: { type: Type.STRING },
              leadershipInterviews: { type: Type.STRING },
              annualReportHighlights: { type: Type.STRING },
            },
            required: ["recentNews", "strategicPriorities", "productLaunches", "cultureSignals", "leadershipInterviews", "annualReportHighlights"],
          },
          roleIntelligence: {
            type: Type.OBJECT,
            properties: {
              coreResponsibilities: { type: Type.STRING },
              businessChallenges: { type: Type.STRING },
              successMetrics: { type: Type.STRING },
              crossFunctionalInteractions: { type: Type.STRING },
            },
            required: ["coreResponsibilities", "businessChallenges", "successMetrics", "crossFunctionalInteractions"],
          },
        },
        required: ["companyIntelligence", "roleIntelligence"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}

export async function generateCoverLetter(
  request: CoverLetterRequest,
  research: CompanyResearch
): Promise<string> {
  const prompt = `
    You are an elite career strategist and cover letter expert with deep understanding of recruiter psychology, ATS systems, and the modern job market.

    TASK: Write a tailored, high-impact cover letter that gets shortlisted in the top 5% of applicants.

    CRITICAL WRITING CONSTRAINTS:
    - BOLD, SHARP HOOK: Start with an attention-grabbing opening in the first two lines. No "I am writing to apply".
    - DEEP MOTIVATION: Focus on your "WHY". Connect your mindset and motivation to the company's mission and culture (${research.companyIntelligence.cultureSignals}). Talk about why this specific move matters to you.
    - THINKING PROCESS: Explain how you think. How would you approach their specific challenges (${research.roleIntelligence.businessChallenges})? Show them your strategic reasoning, not just your history.
    - BEYOND THE RESUME: Share perspectives, stories, or "behind the scenes" thinking that isn't captured in your resume bullets (${request.resumeText}).
    - HUMAN AUTHENTICITY: Write in a natural, conversational flow. Use simple but impactful vocabulary. Absolutely NO HYPHENS or dashes. No AI filler words. Include small, negligible grammatical quirks (like starting a sentence with 'And' or 'But') so it feels drafted by a thoughtful human.
    - CONFIDENT CLOSING: A professional end with a soft but clear CTA.
    - ATS OPTIMIZATION: Natural integration of keywords from the job description.

    STRICT PROHIBITION:
    - NO NEWS REPORTER MODE: Do not tell the company what is in their own news. They know it. Focus on your motivation instead.
    - NO ROBOT SPEAK: No "ideal candidate," "synergy," "leveraging," or "fast-paced world."
    - NO HYPHENS: Use only periods and commas for punctuation.

    INPUT DATA:
    - Job: ${request.jobDescription}
    - User Story: ${request.resumeText} | Motivation Spark: ${request.userMotivation || "Not provided"}
    - Role Context & Needs: ${research.roleIntelligence.coreResponsibilities} | ${research.roleIntelligence.businessChallenges}
    - Extra User Context: ${request.additionalContext || "None"}

    OUTPUT: A complete, modern cover letter.
  `;

  const response = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      temperature: 0.75,
    },
  });

  return response.text || "Failed to generate cover letter.";
}

export async function refineCoverLetter(
  currentLetter: string,
  feedback: string,
  research: CompanyResearch,
  request: CoverLetterRequest
): Promise<string> {
  const prompt = `
    You are an elite career strategist refining a cover letter based on candidate feedback.
    
    ORIGINAL COVER LETTER:
    ${currentLetter}
    
    CANDIDATE FEEDBACK:
    "${feedback}"
    
    REFINEMENT RULES:
    1. PRIORITIZE THINKING PROCESS: Ensure the letter shows how the candidate solves problems, not just what they did.
    2. STRENGTHEN MOTIVATION: Ground the excitement in the candidate's personal "Why".
    3. REMOVE NEWS RECITALS: If the draft still sounds like a news report, strip that out.
    4. HUMAN FLOW: Keep it conversational, simple words, NO HYPHENS, and small human quirks.
    5. ADDRESS FEEDBACK: "${feedback}"
    
    CONTEXT:
    - Role Needs: ${research.roleIntelligence.businessChallenges}
    - User Background: ${request.resumeText}
    
    Return ONLY the refined text.
  `;

  const response = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      temperature: 0.7,
    },
  });

  return response.text || currentLetter;
}
