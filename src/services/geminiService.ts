import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface CompanyResearch {
  problemSolving: string;
  valueCreation: string;
  cultureAndValues: string;
  recentNews: string;
}

export interface CoverLetterRequest {
  companyName: string;
  roleTitle: string;
  resumeText: string;
  jobDescription: string;
  userMotivation?: string;
  additionalContext?: string;
}

export async function researchCompany(companyName: string): Promise<CompanyResearch> {
  const prompt = `Research the company "${companyName}". 
  Provide a detailed analysis of:
  1. What core problems are they solving?
  2. How do they create value for their customers?
  3. What is their company culture and core values?
  4. Any significant recent news or strategic shifts.
  
  Focus on information relevant for a job applicant (MBA student) to show deep motivation.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          problemSolving: { type: Type.STRING },
          valueCreation: { type: Type.STRING },
          cultureAndValues: { type: Type.STRING },
          recentNews: { type: Type.STRING },
        },
        required: ["problemSolving", "valueCreation", "cultureAndValues", "recentNews"],
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
    You are an expert career consultant specializing in the German job market.
    Write a highly personalized, "out-of-the-box" cover letter for an MBA student.
    
    CRITICAL PHILOSOPHY:
    - Chase the COMPANY first, then the ROLE.
    - Show deep motivation based on the research provided and the user's personal connection.
    - Connect the student's past experience and MBA skills to the company's value creation and the specific requirements in the Job Description.
    - Tone: Professional yet natural, authentic, and passionate. Avoid generic AI-sounding phrases.
    - Language: English (standard for many international MBA roles in Germany) unless specified otherwise.
    
    INPUT DATA:
    Company: ${request.companyName}
    Role: ${request.roleTitle}
    
    JOB DESCRIPTION:
    ${request.jobDescription}
    
    USER'S PERSONAL CONNECTION/MOTIVATION:
    ${request.userMotivation || "Not provided"}
    
    COMPANY RESEARCH:
    - Problems Solved: ${research.problemSolving}
    - Value Creation: ${research.valueCreation}
    - Culture/Values: ${research.cultureAndValues}
    - Recent News: ${research.recentNews}
    
    RESUME SUMMARY:
    ${request.resumeText}
    
    ADDITIONAL CONTEXT:
    ${request.additionalContext || "None"}
    
    STRUCTURE:
    1. Hook: Why THIS company? (Based on research/news/mission and user's motivation)
    2. The "Why Me" (Company Fit): How my background aligns with their problems/values and my personal connection.
    3. The "Why Me" (Role Fit): How my MBA skills add specific value to the requirements in the Job Description.
    4. Call to Action: Professional and eager.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      temperature: 0.8,
    },
  });

  return response.text || "";
}
