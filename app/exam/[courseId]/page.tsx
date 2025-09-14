// app/exam/[courseId]/page.tsx - Complete SEB-Integrated Exam Page
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Lock,
  Monitor,
  Camera,
  Wifi,
  Download,
  AlertCircle,
  ArrowLeft,
  Settings,
  Play,
  Loader2,
  XCircle,
  RefreshCw,
  Target,
  Activity,
  Award
} from "lucide-react";
import { useSafeExamBrowser, getSEBStatusColor, getSEBStatusMessage, isSEBProperlyConfigured } from "@/hooks/useSafeExamBrowser";

// --- Types ---
interface Question {
  id: string;
  question: string;
  options: string[];
  order: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
}

interface ExamSession {
  id: string;
  courseId: string;
  courseName: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "TERMINATED";
  startedAt: string;
  expiresAt: string;
  violations: number;
  duration: number;
  totalQuestions: number;
  passingScore: number;
  allowedAttempts: number;
  currentAttempt: number;
}

interface SystemCheck {
  camera: boolean;
  microphone: boolean;
  fullscreen: boolean;
  connection: boolean;
  browser: boolean;
  seb: boolean;
}

// --- SEB Configuration Download Component ---
function SEBConfigDownload({ courseId, sessionId, onConfigDownloaded }: { 
  courseId: string; 
  sessionId?: string;
  onConfigDownloaded?: () => void;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { downloadSEBConfig } = useSafeExamBrowser();

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadSEBConfig(courseId, sessionId);
      onConfigDownloaded?.();
      
      // Show detailed setup instructions
      setTimeout(() => {
        alert(`✅ SEB Configuration Downloaded Successfully!

📋 SETUP INSTRUCTIONS:

1️⃣ INSTALL SAFE EXAM BROWSER:
   • Visit: https://safeexambrowser.org/download_en.html
   • Download the latest version for your operating system
   • Install with administrator privileges

2️⃣ CLOSE ALL APPLICATIONS:
   • Close ALL browser windows completely
   • Exit messaging apps (WhatsApp, Discord, Telegram, etc.)
   • Stop screen recording software (OBS, Bandicam, etc.)
   • Close remote access tools (TeamViewer, AnyDesk, etc.)
   • Exit video conferencing apps (Zoom, Teams, Skype)

3️⃣ START SECURE EXAM:
   • Double-click the downloaded .seb file
   • SEB will launch automatically in secure mode
   • Your exam will load in the locked environment
   • DO NOT try to open other applications after starting SEB

🔐 EMERGENCY ACCESS:
   Admin Password: admin123
   (Only use if you encounter technical issues)

⚠️ CRITICAL: The exam will NOT start without SEB running properly!`);
      }, 500);
    } catch (error) {
      console.error('Error downloading SEB config:', error);
      alert('Failed to download configuration. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="inline-flex items-center px-6 py-3 bg-[#001e62] text-white rounded-lg hover:bg-[#001e62]/90 transition-colors font-medium disabled:opacity-50"
      >
        {isDownloading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Download className="w-4 h-4 mr-2" />
        )}
        {isDownloading ? "Generating..." : "Download SEB Config"}
      </button>
      
      <div className="text-sm text-gray-600">
        <p className="font-medium mb-2">After downloading:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Install Safe Exam Browser if not already installed</li>
          <li>Close all applications and browsers</li>
          <li>Double-click the .seb file to start your secure exam</li>
        </ol>
      </div>
    </div>
  );
}

// --- Main Component ---
export default function SecureExamPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.courseId as string;
  const isFromSEB = searchParams.get('seb') === 'true';
  
  const { sebInfo, validateSEBWithServer, refresh: refreshSEB } = useSafeExamBrowser();

  // --- State ---
  const [examSession, setExamSession] = useState<ExamSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [showSystemCheck, setShowSystemCheck] = useState(true);
  const [systemChecks, setSystemChecks] = useState<SystemCheck>({
    camera: false,
    microphone: false,
    fullscreen: false,
    connection: true,
    browser: true,
    seb: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [violations, setViolations] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [configDownloaded, setConfigDownloaded] = useState(false);

  // --- Refs ---
  const timerRef = useRef<NodeJS.Timeout>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const monitoringRef = useRef<NodeJS.Timeout>();

  // --- Security Monitoring ---
  const startSecurityMonitoring = useCallback(() => {
    // Monitor fullscreen changes
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      
      if (!isCurrentlyFullscreen && !sebInfo.isSEB && examStarted) {
        recordViolation({
          type: 'FULLSCREEN_EXIT',
          details: 'User exited fullscreen mode',
          timestamp: new Date().toISOString()
        });
      }
    };

    // Monitor tab visibility
    const handleVisibilityChange = () => {
      if (document.hidden && examStarted) {
        recordViolation({
          type: 'TAB_SWITCH',
          details: 'User switched tabs or minimized window',
          timestamp: new Date().toISOString()
        });
      }
    };

    // Monitor window focus
    const handleWindowBlur = () => {
      if (examStarted && !sebInfo.isSEB) {
        recordViolation({
          type: 'WINDOW_BLUR',
          details: 'Browser window lost focus',
          timestamp: new Date().toISOString()
        });
      }
    };

    // Block copy/paste and shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (examStarted && !sebInfo.isSEB) {
        // Block common shortcuts
        if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a', 's', 'p', 'f'].includes(e.key.toLowerCase())) {
          e.preventDefault();
          recordViolation({
            type: 'KEYBOARD_SHORTCUT',
            details: `Attempted keyboard shortcut: ${e.key}`,
            timestamp: new Date().toISOString()
          });
        }
        
        // Block F-keys
        if (e.key.startsWith('F') && e.key.length <= 3) {
          e.preventDefault();
          recordViolation({
            type: 'FUNCTION_KEY',
            details: `Attempted function key: ${e.key}`,
            timestamp: new Date().toISOString()
          });
        }
      }
    };

    // Block right-click
    const handleContextMenu = (e: MouseEvent) => {
      if (examStarted && !sebInfo.isSEB) {
        e.preventDefault();
        recordViolation({
          type: 'RIGHT_CLICK',
          details: 'Attempted right-click context menu',
          timestamp: new Date().toISOString()
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [sebInfo.isSEB, examStarted]);

  const recordViolation = async (violation: any) => {
    try {
      setViolations(prev => [...prev, violation]);
      
      if (examSession?.id) {
        await fetch('/api/exam/violation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: examSession.id,
            violation
          })
        });
      }
    } catch (error) {
      console.error('Error recording violation:', error);
    }
  };

  // --- System Checks ---
  const performSystemChecks = async () => {
    const checks: Partial<SystemCheck> = {
      seb: sebInfo.isSEB,
      connection: navigator.onLine,
      browser: /Chrome|Chromium|Safari|Edge/.test(navigator.userAgent),
      fullscreen: !!document.fullscreenElement,
    };

    // Camera check
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      checks.camera = true;
    } catch (error) {
      checks.camera = false;
    }

    // Microphone check
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      checks.microphone = true;
    } catch (error) {
      checks.microphone = false;
    }

    setSystemChecks((prev) => ({ ...prev, ...checks }));
  };

  // --- Initialize Exam ---
  const initializeExam = async () => {
    try {
      setLoading(true);
      console.log("Initializing secure exam for course:", courseId);

      // Create or get exam session
      const sessionResponse = await fetch(
        `/api/exam/session?courseId=${courseId}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json();
        throw new Error(errorData.error || "Failed to create exam session");
      }

      const sessionData: ExamSession = await sessionResponse.json();
      console.log("Secure exam session created:", sessionData);
      setExamSession(sessionData);
      setTimeRemaining(sessionData.duration * 60);

      // Get exam questions
      const questionsResponse = await fetch(
        `/api/exam/questions/${courseId}?sessionId=${sessionData.id}`
      );

      if (!questionsResponse.ok) {
        const errorData = await questionsResponse.json();
        throw new Error(errorData.error || "Failed to load exam questions");
      }

      const questionsData = await questionsResponse.json();
      console.log("Questions loaded:", questionsData.questions?.length || 0);
      setQuestions(questionsData.questions || []);

      // Perform system checks
      await performSystemChecks();
      
    } catch (error) {
      console.error("Exam initialization error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to initialize exam"
      );
    } finally {
      setLoading(false);
    }
  };

  // --- Start Exam ---
  const startExam = async () => {
    if (!examSession || !questions.length) {
      alert("Exam session not ready. Please refresh the page.");
      return;
    }

    // CRITICAL: Check if SEB is running (production mode)
    if (process.env.NODE_ENV === 'production' && !sebInfo.isSEB) {
      alert(`🔒 Safe Exam Browser Required!

This is a secure certificate exam that MUST be taken using Safe Exam Browser.

What you need to do:
1. Download and install SEB from: https://safeexambrowser.org
2. Download the exam configuration file (.seb)
3. Close ALL applications and browsers
4. Double-click the .seb file to start your secure exam

Your exam cannot begin without SEB running properly.`);
      return;
    }

    // Additional security check for enhanced SEB
    if (sebInfo.isSEB && !isSEBProperlyConfigured(sebInfo)) {
      const proceed = confirm(`⚠️ SEB Configuration Warning

Your Safe Exam Browser is detected but may not be properly configured.
Security Level: ${sebInfo.securityLevel}

Do you want to proceed anyway? For maximum security, it's recommended to download and use the proper configuration file.`);
      
      if (!proceed) {
        return;
      }
    }

    try {
      console.log("Starting secure exam:", examSession.id);

      // Validate SEB with server if running
      if (sebInfo.isSEB) {
        const validation = await validateSEBWithServer(examSession.id);
        console.log("SEB validation result:", validation);
      }

      // Start the exam session
      const response = await fetch(`/api/exam/session/${examSession.id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          browserData: {
            userAgent: navigator.userAgent,
            screen: { width: screen.width, height: screen.height },
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to start exam");
      }

      console.log("Secure exam started successfully");

      // Enter fullscreen if not using SEB
      if (!sebInfo.isSEB && document.documentElement.requestFullscreen) {
        try {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        } catch (error) {
          console.warn("Could not enter fullscreen:", error);
        }
      }

      // Start camera monitoring if available and not using SEB
      if (!sebInfo.isSEB && systemChecks.camera && videoRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          videoRef.current.srcObject = stream;
        } catch (error) {
          console.warn("Could not start camera monitoring:", error);
        }
      }

      // Start security monitoring
      startSecurityMonitoring();

      // Start the exam timer
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmitExam("TIME_EXPIRED");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start periodic monitoring
      monitoringRef.current = setInterval(() => {
        performSecurityCheck();
      }, 30000); // Check every 30 seconds

      setExamStarted(true);
      setShowSystemCheck(false);
    } catch (error) {
      console.error("Error starting exam:", error);
      alert(
        `Failed to start exam: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  // --- Periodic Security Check ---
  const performSecurityCheck = async () => {
    if (!examSession?.id) return;

    try {
      await fetch('/api/exam/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: examSession.id,
          browserData: {
            userAgent: navigator.userAgent,
            screen: { width: screen.width, height: screen.height },
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }
        })
      });
    } catch (error) {
      console.error('Security check failed:', error);
    }
  };

  // --- Submit Exam ---
  const handleSubmitExam = async (reason: string = "USER_SUBMIT") => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/exam/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: examSession?.id,
          reason,
          answers,
          violations,
          timeSpent: examSession
            ? examSession.duration * 60 - timeRemaining
            : 0,
        }),
      });

      if (response.ok) {
        // Stop video stream
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
        }

        // Exit fullscreen
        if (document.exitFullscreen && document.fullscreenElement) {
          await document.exitFullscreen().catch(() => {});
        }

        // Clear monitoring
        if (monitoringRef.current) {
          clearInterval(monitoringRef.current);
        }

        router.push(`/exam/results/${examSession?.id}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit exam");
      }
    } catch (error) {
      console.error("Error submitting exam:", error);
      alert("Failed to submit exam. Please try again or contact support.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Answer Handling ---
  const handleAnswerChange = (questionId: string, selectedOption: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: selectedOption }));
    
    // Auto-save answer
    saveAnswer(questionId, selectedOption);
  };

  const saveAnswer = async (questionId: string, selectedAnswer: number) => {
    try {
      await fetch("/api/exam/submit-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: examSession?.id,
          questionId,
          selectedAnswer,
          timeSpent: 30
        }),
      });
    } catch (error) {
      console.error("Error saving answer:", error);
    }
  };

  // --- Navigation ---
  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  // --- Utility Functions ---
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const getSystemCheckIcon = (status: boolean) => {
    return status ? (
      <CheckCircle2 className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  // --- Effects ---
  useEffect(() => {
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    if (courseId) {
      initializeExam();
    }
  }, [courseId, session]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (monitoringRef.current) {
        clearInterval(monitoringRef.current);
      }
    };
  }, []);

  // Update system checks when SEB status changes
  useEffect(() => {
    setSystemChecks(prev => ({ ...prev, seb: sebInfo.isSEB }));
  }, [sebInfo.isSEB]);

  // --- Loading State ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#001e62] mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">Initializing Secure Exam...</p>
          <p className="text-sm text-gray-500 mt-2">
            Preparing your secure examination environment
          </p>
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Unable to Load Exam
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#001e62] text-white py-2 px-4 rounded-lg hover:bg-[#001e62]/90 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push(`/courses/${courseId}`)}
              className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Course
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Pre-Exam Security Check Screen ---
  if (showSystemCheck) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#001e62] to-[#003a8c] flex items-center justify-center p-4">
        <div className="max-w-5xl mx-auto w-full">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-[#001e62] text-white p-8 text-center">
              <Shield className="w-16 h-16 mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-2">
                Secure Examination Environment
              </h1>
              <p className="text-blue-100">Professional Certificate Exam</p>
              
              {/* SEB Status Banner */}
              <div className="mt-6">
                {sebInfo.isSEB ? (
                  <div className="bg-green-600 rounded-lg p-4">
                    <div className="flex items-center justify-center mb-2">
                      <CheckCircle2 className="w-6 h-6 mr-3" />
                      <span className="font-medium text-lg">
                        Safe Exam Browser Detected!
                      </span>
                    </div>
                    <div className="text-sm text-green-100 space-y-1">
                      <div>Security Level: <span className="font-medium">{sebInfo.securityLevel}</span></div>
                      <div>Detection Method: <span className="font-medium">{sebInfo.detectionMethod}</span></div>
                      {sebInfo.version && <div>Version: <span className="font-medium">{sebInfo.version}</span></div>}
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-600 rounded-lg p-4">
                    <div className="flex items-center justify-center mb-2">
                      <XCircle className="w-6 h-6 mr-3" />
                      <span className="font-medium text-lg">
                        Safe Exam Browser Required
                      </span>
                    </div>
                    <div className="text-sm text-red-100">
                      {process.env.NODE_ENV === 'development' ? 
                        'Development Mode: SEB requirement relaxed for testing' :
                        'Production Mode: SEB is mandatory for this exam'
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8">
              {/* SEB Setup Section */}
              {!sebInfo.isSEB && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
                  <div className="flex items-start">
                    <AlertTriangle className="w-6 h-6 text-amber-600 mr-3 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-medium text-amber-800 mb-2">
                        Safe Exam Browser Setup Required
                      </h3>
                      <p className="text-sm text-amber-700 mb-4">
                        This is a secure certificate exam that requires Safe Exam Browser (SEB) 
                        to ensure exam integrity and prevent unauthorized assistance.
                      </p>
                      
                      {process.env.NODE_ENV === 'development' ? (
                        <div className="bg-blue-100 border border-blue-300 rounded p-3 mb-4">
                          <p className="text-blue-800 text-sm font-medium">
                            🔧 Development Mode: You can proceed without SEB for testing purposes.
                            In production, SEB will be strictly required.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <SEBConfigDownload 
                            courseId={courseId} 
                            sessionId={examSession?.id}
                            onConfigDownloaded={() => setConfigDownloaded(true)}
                          />
                          
                          <div className="flex gap-3">
                            <a
                              href="https://safeexambrowser.org/download_en.html"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                            >
                              <Monitor className="w-4 h-4 mr-2" />
                              Download SEB Browser
                            </a>
                            
                            <button
                              onClick={refreshSEB}
                              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Check SEB Status
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Exam Information */}
              {examSession && (
                <div className="bg-gray-50 rounded-lg p-6 mb-8">
                  <h2 className="text-xl font-bold text-[#001e62] mb-4 flex items-center">
                    <Award className="w-5 h-5 mr-2" />
                    Exam Information
                  </h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Course:</span>
                        <span className="font-medium text-right">
                          {examSession.courseName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Questions:</span>
                        <span className="font-medium">
                          {questions.length || examSession.totalQuestions}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">
                          {examSession.duration} minutes
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Passing Score:</span>
                        <span className="font-medium">
                          {examSession.passingScore}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className="font-medium text-green-600">
                          {examSession.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Security:</span>
                        <span className={`font-medium ${getSEBStatusColor(sebInfo)}`}>
                          {sebInfo.isSEB ? `SEB ${sebInfo.securityLevel}` : 'Browser Only'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* System Requirements Check */}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-[#001e62] mb-6 flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  System Security Check
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border-2 border-gray-200 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <Shield className="w-6 h-6 text-[#001e62]" />
                      {getSystemCheckIcon(sebInfo.isSEB || process.env.NODE_ENV === 'development')}
                    </div>
                    <div className="font-medium">Safe Exam Browser</div>
                    <div className="text-sm text-gray-600">
                      {sebInfo.isSEB ? `Active (${sebInfo.version || 'Detected'})` : 
                       process.env.NODE_ENV === 'development' ? 'Dev Mode' : 'Not Detected'}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border-2 border-gray-200 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <Camera className="w-6 h-6 text-[#001e62]" />
                      {getSystemCheckIcon(systemChecks.camera || sebInfo.isSEB)}
                    </div>
                    <div className="font-medium">Camera Access</div>
                    <div className="text-sm text-gray-600">
                      {sebInfo.isSEB ? 'Managed by SEB' : systemChecks.camera ? 'Available' : 'Permission needed'}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border-2 border-gray-200 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <Monitor className="w-6 h-6 text-[#001e62]" />
                      {getSystemCheckIcon(systemChecks.browser)}
                    </div>
                    <div className="font-medium">Browser Compatibility</div>
                    <div className="text-sm text-gray-600">
                      {systemChecks.browser ? 'Supported' : 'Unsupported'}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border-2 border-gray-200 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <Wifi className="w-6 h-6 text-[#001e62]" />
                      {getSystemCheckIcon(systemChecks.connection)}
                    </div>
                    <div className="font-medium">Internet Connection</div>
                    <div className="text-sm text-gray-600">
                      {systemChecks.connection ? 'Connected' : 'Disconnected'}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border-2 border-gray-200 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <Eye className="w-6 h-6 text-[#001e62]" />
                      {getSystemCheckIcon(isFullscreen || sebInfo.isSEB)}
                    </div>
                    <div className="font-medium">Display Mode</div>
                    <div className="text-sm text-gray-600">
                      {sebInfo.isSEB ? 'SEB Controlled' : isFullscreen ? 'Fullscreen' : 'Windowed'}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border-2 border-gray-200 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <Lock className="w-6 h-6 text-[#001e62]" />
                      {getSystemCheckIcon(sebInfo.isVerified || process.env.NODE_ENV === 'development')}
                    </div>
                    <div className="font-medium">Security Validation</div>
                    <div className="text-sm text-gray-600">
                      {process.env.NODE_ENV === 'development' ? 'Dev Mode' : 
                       sebInfo.isVerified ? 'Validated' : 'Pending'}
                    </div>
                  </div>
                </div>

                {/* System Check Actions */}
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={performSystemChecks}
                    className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh System Check
                  </button>
                </div>
              </div>

              {/* Camera Preview (non-SEB only) */}
              {systemChecks.camera && !sebInfo.isSEB && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-[#001e62] mb-4 flex items-center">
                    <Eye className="w-5 h-5 mr-2" />
                    Proctoring Preview
                  </h3>
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden max-w-md mx-auto">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded text-sm flex items-center">
                      <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                      MONITORING
                    </div>
                  </div>
                </div>
              )}

              {/* Security Agreement */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Academic Integrity Agreement
                </h3>
                <div className="text-sm text-red-700 space-y-3">
                  <p className="font-medium">By starting this exam, I acknowledge that:</p>
                  <ul className="space-y-2 ml-4">
                    <li>• This exam session will be monitored for security purposes</li>
                    <li>• I will not use external resources, assistance, or unauthorized materials</li>
                    <li>• I will not attempt to circumvent security measures</li>
                    <li>• Security violations may result in immediate exam termination</li>
                    <li>• This exam represents my individual knowledge and abilities</li>
                    <li>• I understand the consequences of academic dishonesty</li>
                  </ul>
                  <div className="mt-4 p-3 bg-red-100 rounded">
                    <p className="font-medium text-red-900">
                      Current Security Level: {sebInfo.isSEB ? `Maximum (SEB ${sebInfo.securityLevel})` : 'Standard (Browser)'}
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      Active monitoring: {sebInfo.isSEB ? 'Full system lockdown and monitoring' : 
                        'Browser monitoring' + (systemChecks.camera ? ', camera surveillance' : '')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <div className="text-center">
                <button
                  onClick={startExam}
                  disabled={!examSession || questions.length === 0 || 
                           (process.env.NODE_ENV === 'production' && !sebInfo.isSEB)}
                  className="px-8 py-4 bg-[#001e62] text-white rounded-lg text-lg font-semibold hover:bg-[#003a8c] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center mx-auto shadow-lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Begin Secure Exam
                </button>
                <p className="text-sm text-gray-500 mt-4">
                  {examSession && questions.length > 0
                    ? process.env.NODE_ENV === 'production' && !sebInfo.isSEB
                      ? "⚠️ Safe Exam Browser required to start in production mode"
                      : `✅ Ready to start - ${questions.length} questions loaded`
                    : "Loading exam data..."}
                </p>
                
                {/* Development Mode Notice */}
                {process.env.NODE_ENV === 'development' && !sebInfo.isSEB && (
                  <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                    <p className="text-yellow-800 text-sm">
                      🔧 <strong>Development Mode:</strong> SEB requirement is relaxed for testing. 
                      In production, SEB will be mandatory.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Main Exam Interface ---
  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            No Questions Available
          </h2>
          <p className="text-gray-600 mb-6">
            This exam doesn't have any questions configured yet.
          </p>
          <button
            onClick={() => router.push(`/courses/${courseId}`)}
            className="w-full bg-[#001e62] text-white py-2 px-4 rounded-lg hover:bg-[#001e62]/90 transition-colors flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-[#001e62] text-white">
      {/* Security Warnings */}
      {!sebInfo.isSEB && !isFullscreen && process.env.NODE_ENV === 'production' && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-3 text-center z-50 animate-pulse">
          <AlertTriangle className="w-5 h-5 inline mr-2" />
          SECURITY ALERT: Safe Exam Browser required - exam may be terminated
        </div>
      )}

      {!sebInfo.isSEB && !isFullscreen && process.env.NODE_ENV !== 'production' && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-600 text-white p-2 text-center z-50">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          DEV MODE: Return to fullscreen mode recommended
        </div>
      )}

      {violations.length >= 2 && (
        <div className="fixed top-12 left-0 right-0 bg-orange-600 text-white p-2 text-center z-40">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          WARNING: {violations.length} security violations detected
        </div>
      )}

      {/* Main Content */}
      <div
        className="p-6"
        style={{ 
          paddingTop: (!sebInfo.isSEB && (!isFullscreen || violations.length >= 2)) ? "4rem" : "1.5rem" 
        }}
      >
        {/* Header */}
        <div className="bg-white/10 backdrop-blur rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold flex items-center mb-2">
                <Shield className="w-6 h-6 mr-3" />
                {examSession?.courseName}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-blue-200">
                <span>
                  Question {currentQuestion + 1} of {questions.length}
                </span>
                <span>Progress: {Math.round(progress)}%</span>
                <span>
                  Answered: {answeredCount}/{questions.length}
                </span>
                <span>
                  Violations: {violations.length}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-mono font-bold text-white">
                {formatTime(timeRemaining)}
              </div>
              <div className="text-sm text-blue-200">Time Remaining</div>
              {violations.length > 0 && (
                <div className="text-xs text-red-300 mt-1">
                  ⚠️ {violations.length} violations
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white/20 rounded-full h-3 mb-4">
            <div
              className="bg-gradient-to-r from-blue-400 to-white h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Security Status */}
          <div className="flex items-center text-sm text-blue-200">
            <Shield className="w-4 h-4 mr-2" />
            <span>
              Security: {sebInfo.isSEB ? `SEB Protected (${sebInfo.securityLevel})` : 'Browser Monitored'} | 
              Monitoring: {systemChecks.camera ? 'Camera Active' : 'Camera Off'} |
              Session: {examSession?.id.substring(0, 8)}...
            </span>
          </div>
        </div>

        {/* Question */}
        <div className="bg-white/10 backdrop-blur rounded-lg p-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              Question {currentQuestion + 1}
            </h2>
            {currentQ.difficulty && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                currentQ.difficulty === 'EASY' ? 'bg-green-500/20 text-green-300' :
                currentQ.difficulty === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300' :
                'bg-red-500/20 text-red-300'
              }`}>
                {currentQ.difficulty}
              </span>
            )}
          </div>
          
          <h3 className="text-lg leading-relaxed mb-6">
            {currentQ.question}
          </h3>

          <div className="space-y-4">
            {currentQ.options.map((option, index) => (
              <label
                key={index}
                className={`block p-5 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:scale-[1.01] ${
                  answers[currentQ.id] === index
                    ? "border-white bg-white/20 scale-[1.02] shadow-lg"
                    : "border-white/30 hover:border-white/50 hover:bg-white/10"
                }`}
              >
                <input
                  type="radio"
                  name={`question-${currentQ.id}`}
                  value={index}
                  checked={answers[currentQ.id] === index}
                  onChange={() => handleAnswerChange(currentQ.id, index)}
                  className="sr-only"
                />
                <div className="flex items-center">
                  <div
                    className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-all ${
                      answers[currentQ.id] === index
                        ? "border-white bg-white scale-110"
                        : "border-white/50 hover:border-white/70"
                    }`}
                  >
                    {answers[currentQ.id] === index && (
                      <div className="w-3 h-3 rounded-full bg-[#001e62]"></div>
                    )}
                  </div>
                  <span className="text-lg leading-relaxed">{option}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePreviousQuestion}
            disabled={currentQuestion === 0}
            className="px-6 py-3 bg-white/20 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/30 transition-colors flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </button>

          <div className="flex gap-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestion(index)}
                className={`w-8 h-8 rounded text-sm font-medium transition-all ${
                  index === currentQuestion
                    ? "bg-white text-[#001e62] shadow-lg"
                    : answers[questions[index].id] !== undefined
                    ? "bg-green-500/30 text-white hover:bg-green-500/40"
                    : "bg-white/20 text-white/70 hover:bg-white/30"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            {currentQuestion === questions.length - 1 ? (
              <button
                onClick={() => handleSubmitExam("USER_SUBMIT")}
                disabled={isSubmitting}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Submit Exam
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-6 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors flex items-center"
              >
                Next
                <ArrowLeft className="w-4 h-4 ml-2 transform rotate-180" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Panel */}
      <div className="fixed bottom-6 right-6 bg-black/60 backdrop-blur text-white p-4 rounded-lg text-sm z-20">
        <h4 className="font-semibold mb-3 flex items-center">
          <Activity className="w-4 h-4 mr-2" />
          Exam Status
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Answered:</span>
            <span className="text-green-400">
              {answeredCount}/{questions.length}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Current:</span>
            <span className="text-blue-400">Q{currentQuestion + 1}</span>
          </div>
          <div className="flex justify-between">
            <span>Environment:</span>
            <span className={sebInfo.isSEB ? "text-green-400" : "text-yellow-400"}>
              {sebInfo.isSEB ? `SEB (${sebInfo.securityLevel})` : "Browser"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Violations:</span>
            <span className={violations.length > 0 ? "text-red-400" : "text-green-400"}>
              {violations.length}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Time:</span>
            <span className={timeRemaining < 300 ? "text-red-400" : "text-white"}>
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>
      </div>

      {/* Camera Monitor (non-SEB only) */}
      {!sebInfo.isSEB && systemChecks.camera && (
        <div className="fixed bottom-6 left-6 w-48 h-36 bg-black rounded-lg overflow-hidden z-20">
          <video
            ref={videoRef}
            autoPlay
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs flex items-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse"></div>
            REC
          </div>
        </div>
      )}
    </div>
  );
}