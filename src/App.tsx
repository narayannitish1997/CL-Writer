import React, { useState, useRef, useEffect, type ChangeEvent } from "react";
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
  ChevronLeft,
  Moon,
  Sun
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
import { researchCompany, generateCoverLetter, refineCoverLetter, analyzeFit, type CompanyResearch, type FitIntelligence } from "@/src/services/geminiService";

type Step = "target" | "researching" | "research_result" | "resume" | "writing" | "result";

export default function App() {
  const [step, setStep] = useState<Step>("target");
  const [darkMode, setDarkMode] = useState(true);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showClearSuccess, setShowClearSuccess] = useState(false);

  // Load state on mount
  useEffect(() => {
    const saved = localStorage.getItem("bewerbung_ai_state");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.resumeText) setResumeText(parsed.resumeText);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.roleTitle) setRoleTitle(parsed.roleTitle);
        if (parsed.jobDescription) setJobDescription(parsed.jobDescription);
        if (parsed.userMotivation) setUserMotivation(parsed.userMotivation);
        if (parsed.additionalContext) setAdditionalContext(parsed.additionalContext);
        if (parsed.darkMode !== undefined) setDarkMode(parsed.darkMode);
        if (parsed.research) setResearch(parsed.research);
        if (parsed.fit) setFit(parsed.fit);
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const [resumeText, setResumeText] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [userMotivation, setUserMotivation] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [research, setResearch] = useState<CompanyResearch | null>(null);
  const [fit, setFit] = useState<FitIntelligence | null>(null);
  const [isAnalyzingFit, setIsAnalyzingFit] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [refinementText, setRefinementText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Save state on change
  useEffect(() => {
    const state = {
      resumeText,
      companyName,
      roleTitle,
      jobDescription,
      userMotivation,
      additionalContext,
      darkMode,
      research,
      fit
    };
    localStorage.setItem("bewerbung_ai_state", JSON.stringify(state));
  }, [resumeText, companyName, roleTitle, jobDescription, userMotivation, additionalContext, darkMode, research, fit]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      let text = "";
      if (file.type === "application/pdf") {
        text = await extractTextFromPDF(file);
      } else {
        text = await file.text();
      }
      setResumeText(text);
      
      // Trigger Fit Intelligence automatically if research is available
      if (research && jobDescription) {
        setIsAnalyzingFit(true);
        try {
          const fitData = await analyzeFit(text, research, jobDescription);
          setFit(fitData);
        } catch (fitErr) {
          console.error("Fit analysis failed", fitErr);
        } finally {
          setIsAnalyzingFit(false);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to parse file. Please try again.");
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
      // Add a 120-second timeout to the research call
      const researchData = await Promise.race([
        researchCompany(companyName, roleTitle),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout: Research is taking too long. Please try again.")), 120000)
        )
      ]) as CompanyResearch;

      setResearch(researchData);
      setStep("research_result");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to research company. Please try again.");
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
      const letter = await Promise.race([
        generateCoverLetter(
          { 
            companyName, 
            roleTitle, 
            resumeText, 
            jobDescription,
            userMotivation,
            additionalContext 
          },
          research
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout: Writing is taking longer than expected. Please try again.")), 60000)
        )
      ]) as string;

      setCoverLetter(letter);
      setStep("result");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate cover letter. Please try again.");
      setStep("resume");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(coverLetter);
  };

  const handleRefine = async () => {
    if (!refinementText || !research) return;
    
    setIsRefining(true);
    setError(null);
    try {
      const refined = await refineCoverLetter(
        coverLetter,
        refinementText,
        research,
        { 
          companyName, 
          roleTitle, 
          resumeText, 
          jobDescription,
          userMotivation,
          additionalContext 
        }
      );
      setCoverLetter(refined);
      setRefinementText("");
    } catch (err: any) {
      console.error(err);
      setError("Failed to refine cover letter. Please try again.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleNewRole = () => {
    setCompanyName("");
    setRoleTitle("");
    setJobDescription("");
    setResumeText("");
    setFit(null);
    setUserMotivation("");
    setAdditionalContext("");
    setResearch(null);
    setCoverLetter("");
    setStep("target");
  };

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAll = () => {
    localStorage.removeItem("bewerbung_ai_state");
    setResumeText("");
    setFit(null);
    setDarkMode(true);
    handleNewRole();
    setShowClearConfirm(false);
    setShowClearSuccess(true);
    setTimeout(() => setShowClearSuccess(false), 5000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-blue-100 selection:text-blue-900 transition-colors duration-700">
      {/* Clear Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-6"
            >
              <div className="space-y-2 text-center">
                <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
                  <RefreshCw size={24} />
                </div>
                <h3 className="text-xl font-bold">Clear Session?</h3>
                <p className="text-sm text-muted-foreground">
                  This will permanently delete all your input data, research results, and draft letters.
                </p>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setShowClearConfirm(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1" 
                  onClick={confirmClearAll}
                >
                  Clear Data
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear Success Message */}
      <AnimatePresence>
        {showClearSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-6"
          >
            <div className="bg-blue-600 text-white rounded-2xl p-6 shadow-2xl border border-blue-500 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Session Reset Successful</h4>
                  <p className="text-[10px] text-blue-100 uppercase tracking-widest font-bold">AI Recalibration Report</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-blue-700/50 rounded-xl p-3 border border-blue-500/30">
                  <p className="text-[10px] text-blue-200/70 font-bold uppercase mb-1">Context Memory</p>
                  <p className="text-lg font-mono font-bold">0.0 MB</p>
                </div>
                <div className="bg-blue-700/50 rounded-xl p-3 border border-blue-500/30">
                  <p className="text-[10px] text-blue-200/70 font-bold uppercase mb-1">Accuracy Potential</p>
                  <p className="text-lg font-mono font-bold">100%</p>
                </div>
                <div className="bg-blue-700/50 rounded-xl p-3 border border-blue-500/30 col-span-2">
                  <p className="text-[10px] text-blue-200/70 font-bold uppercase mb-1">Status</p>
                  <p className="text-sm font-semibold">Fresh Start: AI will now respond more accurately without stale context.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-linear-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
              <Sparkles size={18} />
            </div>
            <h1 className="font-bold text-xl tracking-tight">Bewerbung AI</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
              className="rounded-full w-10 h-10 text-muted-foreground hover:text-foreground"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </Button>
            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800 font-medium">
              MBA Edition
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {/* Step 1: Target Company & JD */}
          {step === "target" && (
            <motion.div
              key="target"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Where are you applying?</h2>
                <p className="text-muted-foreground text-lg">Tell us about the company and the role you're chasing.</p>
              </div>

              <Card className="border-border shadow-sm bg-card">
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-sm font-semibold text-foreground/80">Company Name</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-3 text-muted-foreground" size={18} />
                        <Input 
                          id="company"
                          placeholder="e.g. Siemens, Zalando, SAP" 
                          className="pl-10 border-input focus:ring-blue-500 bg-background"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-sm font-semibold text-foreground/80">Role Title</Label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-3 text-muted-foreground" size={18} />
                        <Input 
                          id="role"
                          placeholder="e.g. Product Manager, Strategy Associate" 
                          className="pl-10 border-input focus:ring-blue-500 bg-background"
                          value={roleTitle}
                          onChange={(e) => setRoleTitle(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jd" className="text-sm font-semibold text-foreground/80">Job Description</Label>
                    <Textarea 
                      id="jd"
                      placeholder="Paste the full job description here..." 
                      className="min-h-[200px] border-input focus:ring-blue-500 bg-background"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                    />
                  </div>

                  {error && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                      {error}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="p-8 pt-0 flex justify-center">
                  <Button 
                    disabled={!companyName || !roleTitle || !jobDescription || isGenerating} 
                    onClick={handleStartResearch}
                    className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-12 text-lg font-medium shadow-lg shadow-blue-200 dark:shadow-none border-none"
                  >
                    Research Company & Role
                    <Search size={18} className="ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Researching */}
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
                <h3 className="text-2xl font-bold text-foreground">Researching {companyName}...</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Our AI is browsing the web to understand {companyName}'s mission and the {roleTitle} role.
                </p>
                <div className="pt-4">
                  <Button variant="ghost" size="sm" onClick={() => setStep("target")} className="text-muted-foreground hover:text-foreground">
                    Cancel Research
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Research Result */}
          {step === "research_result" && (
            <motion.div
              key="research_result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-2 text-blue-600 cursor-pointer hover:underline mb-4" onClick={() => setStep("target")}>
                <ChevronLeft size={16} />
                <span className="text-sm font-medium">Back to target</span>
              </div>

              <div className="space-y-2 text-center md:text-left">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Intelligence Reports</h2>
                <p className="text-muted-foreground text-lg">We've gathered deep insights to power your narrative.</p>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {/* Company Intelligence Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                    <Building2 className="text-blue-600" size={24} />
                    <h3 className="text-2xl font-bold text-foreground">Company Intelligence</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-4 p-6 bg-card border border-border rounded-2xl shadow-sm hover:border-blue-500/50 transition-colors">
                      <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Recent News & Pivot</p>
                      <p className="text-base text-foreground/90 leading-relaxed">{research?.companyIntelligence.recentNews}</p>
                    </div>
                    <div className="space-y-4 p-6 bg-card border border-border rounded-2xl shadow-sm hover:border-blue-500/50 transition-colors">
                      <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Strategic Priorities</p>
                      <p className="text-base text-foreground/90 leading-relaxed">{research?.companyIntelligence.strategicPriorities}</p>
                    </div>
                    <div className="space-y-4 p-6 bg-card border border-border rounded-2xl shadow-sm hover:border-blue-500/50 transition-colors">
                      <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Product & Innovation</p>
                      <p className="text-base text-foreground/90 leading-relaxed">{research?.companyIntelligence.productLaunches}</p>
                    </div>
                    <div className="space-y-4 p-6 bg-card border border-border rounded-2xl shadow-sm hover:border-blue-500/50 transition-colors">
                      <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Cultural Signals</p>
                      <p className="text-base text-foreground/90 leading-relaxed">{research?.companyIntelligence.cultureSignals}</p>
                    </div>
                    <div className="space-y-4 p-6 bg-card border border-border rounded-2xl shadow-sm hover:border-blue-500/50 transition-colors">
                      <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Leadership Vision</p>
                      <p className="text-base text-foreground/90 leading-relaxed">{research?.companyIntelligence.leadershipInterviews}</p>
                    </div>
                    <div className="space-y-4 p-6 bg-card border border-border rounded-2xl shadow-sm hover:border-blue-500/50 transition-colors">
                      <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Annual Report Highlights</p>
                      <p className="text-base text-foreground/90 leading-relaxed">{research?.companyIntelligence.annualReportHighlights}</p>
                    </div>
                  </div>
                </div>

                {/* Role Intelligence Section */}
                <div className="space-y-6 pt-6">
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                    <Briefcase className="text-indigo-600" size={24} />
                    <h3 className="text-2xl font-bold text-foreground">Role Intelligence</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-4 p-8 bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl">
                      <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Core Responsibilities</p>
                      <p className="text-base text-foreground/90 leading-relaxed">{research?.roleIntelligence.coreResponsibilities}</p>
                    </div>
                    <div className="space-y-4 p-8 bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl">
                      <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Business Challenges</p>
                      <p className="text-base text-foreground/90 leading-relaxed">{research?.roleIntelligence.businessChallenges}</p>
                    </div>
                    <div className="space-y-4 p-8 bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl">
                      <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Success Metrics</p>
                      <p className="text-base text-foreground/90 leading-relaxed">{research?.roleIntelligence.successMetrics}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-8 flex justify-center">
                  <Button 
                    onClick={() => setStep("resume")}
                    className="w-full max-w-md bg-linear-to-r from-blue-600 via-indigo-600 to-blue-600 hover:scale-[1.02] transition-transform text-white h-16 text-xl font-bold shadow-2xl shadow-blue-500/20 rounded-2xl"
                  >
                    Continue to Resume
                    <ArrowRight size={22} className="ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Resume & Motivation */}
          {step === "resume" && (
            <motion.div
              key="resume"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-2 text-blue-600 cursor-pointer hover:underline mb-4" onClick={() => setStep("research_result")}>
                <ChevronLeft size={16} />
                <span className="text-sm font-medium">Back to insights</span>
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Final Step: CV & Motivation</h2>
                <p className="text-muted-foreground text-lg">Upload your tailored resume and tell us why you're the perfect fit.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border-border shadow-sm overflow-hidden h-fit bg-card group">
                  <CardHeader className="bg-muted/50 border-b border-border py-4">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <FileText size={16} />
                      Resume & Fit Intelligence
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {resumeText ? (
                      <div className="space-y-6">
                        <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-center">
                          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <CheckCircle2 size={24} />
                          </div>
                          <div className="space-y-0.5">
                            <p className="font-bold text-sm text-foreground uppercase tracking-tight">Resume Ready</p>
                            <Button 
                              variant="link" 
                              size="sm" 
                              onClick={() => fileInputRef.current?.click()}
                              className="text-[10px] text-blue-600 h-auto p-0"
                            >
                              Replace File
                            </Button>
                          </div>
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                            className="hidden" 
                            accept=".pdf,.txt"
                          />
                        </div>

                        {isAnalyzingFit ? (
                          <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 animate-pulse">
                              <RefreshCw size={12} className="animate-spin" />
                              Analyzing Personalization Intelligence...
                            </div>
                            <Skeleton className="h-20 w-full rounded-xl" />
                            <Skeleton className="h-24 w-full rounded-xl" />
                          </div>
                        ) : fit ? (
                          <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1.5">
                                <Sparkles size={12} />
                                Fit Intelligence
                              </h4>
                              <div className="grid grid-cols-1 gap-3">
                                <div className="p-3 bg-muted/30 rounded-lg border border-border/50 text-[13px] leading-relaxed">
                                  <span className="font-bold text-foreground block mb-1">Mapped Experience</span>
                                  <p className="text-muted-foreground">{fit.experienceMapping}</p>
                                </div>
                                <div className="p-3 bg-muted/30 rounded-lg border border-border/50 text-[13px] leading-relaxed">
                                  <span className="font-bold text-foreground block mb-1">Relevant Achievements</span>
                                  <p className="text-muted-foreground">{fit.relevantAchievements}</p>
                                </div>
                                <div className="p-3 bg-muted/30 rounded-lg border border-border/50 text-[13px] leading-relaxed">
                                  <span className="font-bold text-foreground block mb-1">Unique Perspective</span>
                                  <p className="text-muted-foreground">{fit.uniquePerspective}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center gap-4 hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all cursor-pointer group"
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileUpload} 
                          className="hidden" 
                          accept=".pdf,.txt"
                        />
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                          {isUploading ? (
                            <Loader2 className="animate-spin text-blue-600" size={32} />
                          ) : (
                            <Upload className="text-muted-foreground group-hover:text-blue-600" size={32} />
                          )}
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-lg text-foreground">Click to upload your CV</p>
                          <p className="text-sm text-muted-foreground mt-1">PDF or Plain Text files only</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-semibold mt-2">Max size 5MB</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-blue-900 dark:text-blue-400">Your Connection</CardTitle>
                    <CardDescription className="text-blue-700/70 dark:text-blue-400/70">
                      What part of their mission or the {roleTitle} role resonates with you?
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea 
                      placeholder="e.g. I've always admired their commitment to sustainability, and my previous project in..." 
                      className="min-h-[150px] border-blue-200 dark:border-blue-800 focus:ring-blue-500 bg-background"
                      value={userMotivation}
                      onChange={(e) => setUserMotivation(e.target.value)}
                    />
                    <div className="space-y-2">
                      <Label htmlFor="context" className="text-xs font-semibold text-muted-foreground uppercase">Additional Context (Optional)</Label>
                      <Input 
                        id="context"
                        placeholder="Any other specific details?" 
                        className="border-blue-200 dark:border-blue-800 focus:ring-blue-500 bg-background"
                        value={additionalContext}
                        onChange={(e) => setAdditionalContext(e.target.value)}
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={handleGenerateLetter}
                      disabled={!resumeText || !userMotivation || isGenerating || isUploading}
                      className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-12 text-lg font-medium shadow-lg shadow-blue-200 dark:shadow-none border-none"
                    >
                      Generate My Cover Letter
                      <Sparkles size={18} className="ml-2" />
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </motion.div>
          )}

          {/* Step 6: Writing */}
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
                <h3 className="text-2xl font-bold text-foreground">Drafting your narrative...</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Combining your background, the job requirements, and your personal motivation into a standout cover letter.
                </p>
                <div className="pt-4">
                  <Button variant="ghost" size="sm" onClick={() => setStep("resume")} className="text-muted-foreground hover:text-foreground">
                    Cancel Writing
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 7: Result */}
          {step === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold tracking-tight text-foreground">Your Cover Letter</h2>
                  <p className="text-muted-foreground">Personalized for {companyName} • {roleTitle}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setStep("resume")} className="gap-2 border-border text-foreground hover:bg-muted">
                    <RefreshCw size={14} />
                    Regenerate
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                <Card className="border-border shadow-xl overflow-hidden bg-card">
                  <CardHeader className="bg-muted/50 border-b border-border flex flex-row items-center justify-between py-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">Draft</Badge>
                      <span className="text-xs text-muted-foreground font-mono">EN-DE Market Optimized</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={copyToClipboard} className="h-8 w-8 text-muted-foreground hover:text-blue-600">
                        <Copy size={16} />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 min-h-[400px]">
                    <ScrollArea className="h-[600px] pr-4">
                      {isRefining ? (
                        <div className="space-y-4 animate-pulse">
                          <Skeleton className="h-4 w-[90%]" />
                          <Skeleton className="h-4 w-[85%]" />
                          <Skeleton className="h-4 w-[95%]" />
                          <Skeleton className="h-4 w-[80%]" />
                          <Skeleton className="h-4 w-[90%]" />
                          <Skeleton className="h-4 w-[85%]" />
                          <div className="pt-4 flex items-center gap-2 text-blue-500 font-medium text-sm">
                            <Loader2 className="animate-spin" size={16} />
                            <span>Refining your narrative...</span>
                          </div>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-foreground/90">
                          {coverLetter}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                  <CardFooter className="bg-muted/50 border-t border-border p-4 flex justify-between gap-4">
                    <p className="text-xs text-muted-foreground italic max-w-[200px]">Tip: Review and adjust the bracketed placeholders if any.</p>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={handleNewRole} className="gap-2 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                        <RefreshCw size={16} />
                        Another Role
                      </Button>
                      <Button className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white gap-2 border-none">
                        <Download size={16} />
                        Export PDF
                      </Button>
                    </div>
                  </CardFooter>
                </Card>

                {/* Refinement Chat Box */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 px-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <h3 className="text-sm font-bold text-foreground">Refine your narrative</h3>
                  </div>
                  <Card className="border-blue-100 dark:border-blue-900/30 bg-blue-50/20 dark:bg-blue-900/10 shadow-lg border-2">
                    <CardContent className="p-4 flex gap-3">
                      <div className="flex-1">
                        <Textarea 
                          placeholder="Tell us what to change... e.g. 'Make it more humble' or 'Emphasize my leadership in the second paragraph'"
                          className="min-h-[80px] bg-background border-blue-100 dark:border-blue-800 focus:ring-blue-500 resize-none text-sm"
                          value={refinementText}
                          onChange={(e) => setRefinementText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey && refinementText && !isRefining) {
                              e.preventDefault();
                              handleRefine();
                            }
                          }}
                        />
                      </div>
                      <Button 
                        size="icon" 
                        disabled={!refinementText || isRefining} 
                        onClick={handleRefine}
                        className="self-end h-10 w-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all active:scale-95"
                      >
                        {isRefining ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-border py-12 bg-card">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 opacity-50">
              <Sparkles size={16} />
              <span className="text-sm font-medium text-foreground">Bewerbung AI</span>
            </div>
            <Button 
              variant="link" 
              size="sm" 
              onClick={handleClearAll}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors h-auto p-0"
            >
              Clear All Session Data
            </Button>
          </div>
          <div className="flex gap-8 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
