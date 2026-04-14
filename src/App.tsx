import React, { useState, useRef, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, 
  Search, 
  Building2, 
  Briefcase, 
  Loader2, 
  CheckCircle2, 
  ArrowRight, 
  Upload, 
  Sparkles,
  Copy,
  Download,
  RefreshCw,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { extractTextFromPDF } from "@/src/lib/pdfUtils";
import { researchCompany, generateCoverLetter, type CompanyResearch } from "@/src/services/geminiService";

type Step = "resume" | "target" | "researching" | "research_result" | "writing" | "result";

export default function App() {
  const [step, setStep] = useState<Step>("resume");
  const [resumeText, setResumeText] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [userMotivation, setUserMotivation] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [research, setResearch] = useState<CompanyResearch | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      if (file.type === "application/pdf") {
        const text = await extractTextFromPDF(file);
        setResumeText(text);
      } else {
        const text = await file.text();
        setResumeText(text);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to parse file. Please try pasting the text instead.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartResearch = async () => {
    if (!companyName || !roleTitle || !jobDescription) return;
    
    setStep("researching");
    setIsGenerating(true);
    setError(null);

    try {
      const researchData = await researchCompany(companyName);
      setResearch(researchData);
      setStep("research_result");
    } catch (err) {
      console.error(err);
      setError("Failed to research company. Please try again.");
      setStep("target");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateLetter = async () => {
    setStep("writing");
    setIsGenerating(true);
    setError(null);

    try {
      if (!research) throw new Error("Research data missing");
      const letter = await generateCoverLetter(
        { 
          companyName, 
          roleTitle, 
          resumeText, 
          jobDescription,
          userMotivation,
          additionalContext 
        },
        research
      );
      setCoverLetter(letter);
      setStep("result");
    } catch (err) {
      console.error(err);
      setError("Failed to generate cover letter. Please try again.");
      setStep("research_result");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(coverLetter);
  };

  const handleNewRole = () => {
    setCompanyName("");
    setRoleTitle("");
    setJobDescription("");
    setUserMotivation("");
    setAdditionalContext("");
    setResearch(null);
    setCoverLetter("");
    setStep("target");
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Sparkles size={18} />
            </div>
            <h1 className="font-bold text-xl tracking-tight">Bewerbung AI</h1>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-medium">
              MBA Edition
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {/* Step 1: Resume Upload */}
          {step === "resume" && (
            <motion.div
              key="resume"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">Start with your profile</h2>
                <p className="text-gray-500 text-lg">Upload your resume to help the AI understand your background and experience.</p>
              </div>

              <Card className="border-gray-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                  <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={16} />
                    Resume Upload
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center gap-4 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      className="hidden" 
                      accept=".pdf,.txt"
                    />
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      {isUploading ? <Loader2 className="animate-spin text-blue-600" size={32} /> : <Upload className="text-gray-400 group-hover:text-blue-600" size={32} />}
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-xl text-gray-900">
                        {resumeText ? "Resume uploaded successfully" : "Click to upload or drag and drop"}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">PDF or TXT (Max 5MB)</p>
                    </div>
                    {resumeText && (
                      <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-medium">
                        <CheckCircle2 size={14} />
                        Ready to process
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="bg-gray-50/50 border-t border-gray-100 p-4 flex justify-end">
                  <Button 
                    disabled={!resumeText || isUploading} 
                    onClick={() => setStep("target")}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-11"
                  >
                    Continue
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Target Company & JD */}
          {step === "target" && (
            <motion.div
              key="target"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-2 text-blue-600 cursor-pointer hover:underline mb-4" onClick={() => setStep("resume")}>
                <ChevronLeft size={16} />
                <span className="text-sm font-medium">Back to resume</span>
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">Where are you applying?</h2>
                <p className="text-gray-500 text-lg">Tell us about the company and the role you're chasing.</p>
              </div>

              <Card className="border-gray-200 shadow-sm">
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-sm font-semibold text-gray-700">Company Name</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-3 text-gray-400" size={18} />
                        <Input 
                          id="company"
                          placeholder="e.g. Siemens, Zalando, SAP" 
                          className="pl-10 border-gray-200 focus:ring-blue-500"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-sm font-semibold text-gray-700">Role Title</Label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-3 text-gray-400" size={18} />
                        <Input 
                          id="role"
                          placeholder="e.g. Product Manager, Strategy Associate" 
                          className="pl-10 border-gray-200 focus:ring-blue-500"
                          value={roleTitle}
                          onChange={(e) => setRoleTitle(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jd" className="text-sm font-semibold text-gray-700">Job Description</Label>
                    <Textarea 
                      id="jd"
                      placeholder="Paste the full job description here..." 
                      className="min-h-[200px] border-gray-200 focus:ring-blue-500"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                    />
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">
                      {error}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="p-8 pt-0 flex justify-center">
                  <Button 
                    disabled={!companyName || !roleTitle || !jobDescription || isGenerating} 
                    onClick={handleStartResearch}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg font-medium shadow-lg shadow-blue-200"
                  >
                    Research Company
                    <Search size={18} className="ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Researching */}
          {step === "researching" && (
            <motion.div
              key="researching"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 space-y-8"
            >
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Search className="text-blue-600 animate-pulse" size={32} />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-gray-900">Researching {companyName}...</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Our AI is browsing the web to understand {companyName}'s mission, values, and current challenges.
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 4: Research Result & Motivation */}
          {step === "research_result" && (
            <motion.div
              key="research_result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">Research Insights</h2>
                <p className="text-gray-500 text-lg">Here's what we found about {companyName}. How do you relate to this?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {research && (
                    <>
                      <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-2 shadow-sm">
                        <h4 className="font-bold text-sm text-blue-600 flex items-center gap-2">
                          <Search size={14} />
                          Problem Solving
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed">{research.problemSolving}</p>
                      </div>
                      <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-2 shadow-sm">
                        <h4 className="font-bold text-sm text-blue-600 flex items-center gap-2">
                          <Building2 size={14} />
                          Value Creation
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed">{research.valueCreation}</p>
                      </div>
                      <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-2 shadow-sm">
                        <h4 className="font-bold text-sm text-blue-600 flex items-center gap-2">
                          <Sparkles size={14} />
                          Culture Fit
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed">{research.cultureAndValues}</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-6">
                  <Card className="border-blue-100 bg-blue-50/30 shadow-sm sticky top-24">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold text-blue-900">Your Connection</CardTitle>
                      <CardDescription className="text-blue-700/70">
                        Tell us why you're specifically motivated to join {companyName}. What part of their mission resonates with you?
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea 
                        placeholder="e.g. I've always admired their commitment to sustainability, and my previous project in..." 
                        className="min-h-[150px] border-blue-200 focus:ring-blue-500 bg-white"
                        value={userMotivation}
                        onChange={(e) => setUserMotivation(e.target.value)}
                      />
                      <div className="space-y-2">
                        <Label htmlFor="context" className="text-xs font-semibold text-gray-500 uppercase">Additional Context</Label>
                        <Input 
                          id="context"
                          placeholder="Any other specific details?" 
                          className="border-blue-200 focus:ring-blue-500 bg-white"
                          value={additionalContext}
                          onChange={(e) => setAdditionalContext(e.target.value)}
                        />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        onClick={handleGenerateLetter}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
                      >
                        Write My Cover Letter
                        <ArrowRight size={18} className="ml-2" />
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 5: Writing */}
          {step === "writing" && (
            <motion.div
              key="writing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 space-y-8"
            >
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="text-blue-600 animate-pulse" size={32} />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-gray-900">Drafting your narrative...</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Combining your background, the job requirements, and your personal motivation into a standout cover letter.
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 6: Result */}
          {step === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold tracking-tight text-gray-900">Your Cover Letter</h2>
                  <p className="text-gray-500">Personalized for {companyName} • {roleTitle}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setStep("research_result")} className="gap-2">
                    <RefreshCw size={14} />
                    Regenerate
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                <Card className="border-gray-200 shadow-xl overflow-hidden bg-white">
                  <CardHeader className="bg-gray-50/50 border-b border-gray-100 flex flex-row items-center justify-between py-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">Draft</Badge>
                      <span className="text-xs text-gray-400 font-mono">EN-DE Market Optimized</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={copyToClipboard} className="h-8 w-8 text-gray-500 hover:text-blue-600">
                        <Copy size={16} />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-gray-800">
                        {coverLetter}
                      </div>
                    </ScrollArea>
                  </CardContent>
                  <CardFooter className="bg-gray-50/50 border-t border-gray-100 p-4 flex justify-between gap-4">
                    <p className="text-xs text-gray-400 italic max-w-[200px]">Tip: Review and adjust the bracketed placeholders if any.</p>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={handleNewRole} className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                        <RefreshCw size={16} />
                        Another Role
                      </Button>
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                        <Download size={16} />
                        Export PDF
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-gray-200 py-12 bg-white">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <Sparkles size={16} />
            <span className="text-sm font-medium">Bewerbung AI • Built for MBA Students</span>
          </div>
          <div className="flex gap-8 text-sm text-gray-400">
            <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Terms</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
