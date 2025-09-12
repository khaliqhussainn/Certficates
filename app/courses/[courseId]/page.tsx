// app/exam/[courseId]/page.tsx - FIXED VERSION
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
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
  Volume2,
  Download,
  AlertCircle,
  ArrowLeft,
  Settings,
  Users,
  FileText,
  Activity,
  Play,
} from "lucide-react";

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

// --- SEB Detection Hook ---
function useSafeExamBrowser() {
  const [isSEB, setIsSEB] = useState(false);
  const [sebVersion, setSebVersion] = useState<string>("");

  useEffect(() => {
    const detectSEB = () => {
      const userAgent = navigator.userAgent;
      const sebPatterns = [/SEB[\s\/][\d\.]+/i, /SafeExamBrowser/i, /SEB\//i];
      const isSEBByUserAgent = sebPatterns.some((pattern) =>
        pattern.test(userAgent)
      );
      const isSEBByWindow =
        (window as any).SafeExamBrowser !== undefined ||
        (window as any).seb !== undefined;

      const detected = isSEBByUserAgent || isSEBByWindow;
      setIsSEB(detected);

      if ((window as any).SafeExamBrowser?.version) {
        setSebVersion((window as any).SafeExamBrowser.version);
      } else if (detected) {
        const versionMatch = userAgent.match(/SEB[\s\/]([\d\.]+)/i);
        setSebVersion(versionMatch ? versionMatch[1] : "Detected");
      }
    };

    detectSEB();
    const timer = setInterval(detectSEB, 5000);
    return () => clearInterval(timer);
  }, []);

  return { isSEB, sebVersion };
}

// --- SEB Config Download Component ---
function SEBConfigDownload({ courseId }: { courseId: string }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const generateSEBConfig = () => {
    const baseURL = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const examURL = `${baseURL}/exam/${courseId}?seb=true`;
    const quitURL = `${baseURL}/courses/${courseId}`;

    return {
      startURL: examURL,
      quitURL: quitURL,
      sendBrowserExamKey: true,
      allowQuit: true,
      quitExamPasswordHash: btoa("admin123"),
      quitExamText: "Enter administrator password to quit exam:",
      // Disable dangerous shortcuts
      ignoreExitKeys: true,
      enableF3: false,
      enableF1: false,
      enableF12: false,
      enableCtrlEsc: false,
      enableAltEsc: false,
      enableAltTab: false,
      enableAltF4: false,
      enableRightMouse: false,
      enablePrintScreen: false,
      enableEsc: false,
      enableCtrlAltDel: false,
      // Browser restrictions
      allowBrowsingBackForward: false,
      allowReload: false,
      showReloadButton: false,
      allowAddressBar: false,
      allowNavigationBar: false,
      showNavigationButtons: false,
      newBrowserWindowByLinkPolicy: 0,
      newBrowserWindowByScriptPolicy: 0,
      blockPopUpWindows: true,
      // Content restrictions
      allowCopy: false,
      allowCut: false,
      allowPaste: false,
      allowSpellCheck: false,
      allowDictation: false,
      // Security settings
      enableLogging: true,
      logLevel: 2,
      detectVirtualMachine: true,
      allowVirtualMachine: false,
      forceAppFolderInstall: true,
      // URL filtering
      URLFilterEnable: true,
      URLFilterEnableContentFilter: true,
      urlFilterRules: [
        {
          action: 1,
          active: true,
          expression: examURL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        },
        { action: 1, active: true, expression: `${baseURL}/api/*` },
        { action: 0, active: true, expression: "*" },
      ],
    };
  };

  const downloadSEBConfig = async () => {
    setIsDownloading(true);
    try {
      const sebConfig = generateSEBConfig();
      const blob = new Blob([JSON.stringify(sebConfig, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `secure_exam_${courseId}_config.seb`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setTimeout(() => {
        alert(
          `Configuration downloaded successfully!\n\nNext steps:\n1. Install Safe Exam Browser\n2. Close all applications\n3. Double-click the .seb file\n4. Your exam will load automatically\n\nAdmin password: admin123`
        );
      }, 500);
    } catch (error) {
      console.error("Error generating SEB config:", error);
      alert("Failed to generate configuration. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={downloadSEBConfig}
          disabled={isDownloading}
          className="inline-flex items-center px-4 py-2 bg-[#001e62] text-white rounded-lg hover:bg-[#001e62]/90 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {isDownloading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          {isDownloading ? "Generating..." : "Download SEB Config"}
        </button>
        <a
          href="https://safeexambrowser.org/download_en.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
        >
          <Monitor className="w-4 h-4 mr-2" />
          Download SEB Browser
        </a>
      </div>
    </div>
  );
}

// --- Main Component ---
export default function SecureExamPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const { isSEB, sebVersion } = useSafeExamBrowser();

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

  // --- Refs ---
  const timerRef = useRef<NodeJS.Timeout>();
  const videoRef = useRef<HTMLVideoElement>(null);

  // --- Functions ---
  const performSystemChecks = async () => {
    const checks: Partial<SystemCheck> = {
      seb: isSEB,
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

  const initializeExam = async () => {
    try {
      setLoading(true);
      console.log("Initializing exam for course:", courseId);

      // Step 1: Get or create exam session
      const sessionResponse = await fetch(
        `/api/exam/session?courseId=${courseId}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json();
        throw new Error(errorData.error || "Failed to get exam session");
      }

      const sessionData: ExamSession = await sessionResponse.json();
      console.log("Exam session created/retrieved:", sessionData);
      setExamSession(sessionData);
      setTimeRemaining(sessionData.duration * 60);

      // Step 2: Get exam questions
      const questionsResponse = await fetch(
        `/api/exam/questions/${courseId}?sessionId=${sessionData.id}`
      );

      if (!questionsResponse.ok) {
        throw new Error("Failed to load exam questions");
      }

      const questionsData = await questionsResponse.json();
      console.log("Questions loaded:", questionsData.questions?.length || 0);
      setQuestions(questionsData.questions || []);

      // Step 3: Perform system checks
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

  const startExam = async () => {
    if (!examSession || !questions.length) {
      alert("Exam session or questions not ready. Please refresh the page.");
      return;
    }

    try {
      console.log("Starting exam session:", examSession.id);

      // Start the exam session on the server
      const response = await fetch(`/api/exam/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: examSession.id,
          browserData: {
            userAgent: navigator.userAgent,
            screen: { width: screen.width, height: screen.height },
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to start exam");
      }

      console.log("Exam started successfully:", result);

      // Enter fullscreen if not using SEB
      if (!isSEB && document.documentElement.requestFullscreen) {
        try {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        } catch (error) {
          console.warn("Could not enter fullscreen:", error);
        }
      }

      // Start camera monitoring if available and not using SEB
      if (!isSEB && systemChecks.camera && videoRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          videoRef.current.srcObject = stream;
        } catch (error) {
          console.warn("Could not start camera monitoring:", error);
        }
      }

      // Start the timer
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

  const handleAnswerChange = (questionId: string, selectedOption: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: selectedOption }));
  };

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
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
    };
  }, []);

  // --- Loading State ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#001e62] border-t-transparent mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-900">Loading Exam...</p>
          <p className="text-sm text-gray-500 mt-2">
            Preparing your secure exam environment
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

  // --- System Check Screen ---
  if (showSystemCheck) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#001e62] to-[#003a8c] flex items-center justify-center p-4">
        <div className="max-w-4xl mx-auto w-full">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-[#001e62] text-white p-8 text-center">
              <Shield className="w-16 h-16 mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-2">
                Secure Exam Environment
              </h1>
              <p className="text-blue-100">System Security Verification</p>
              {isSEB && (
                <div className="mt-4 bg-green-600 rounded-lg p-3">
                  <div className="flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    <span className="font-medium">
                      Safe Exam Browser Detected - Version {sebVersion}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8">
              {/* SEB Status */}
              {isSEB ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-medium text-green-800">
                        Safe Exam Browser Active
                      </h3>
                      <p className="text-sm text-green-700 mt-1">
                        Secure environment is properly configured and running
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mr-3 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-medium text-amber-800">
                        Safe Exam Browser Recommended
                      </h3>
                      <p className="text-sm text-amber-700 mb-3">
                        For maximum security, use Safe Exam Browser with the
                        configuration below.
                      </p>
                      <SEBConfigDownload courseId={courseId} />
                    </div>
                  </div>
                </div>
              )}

              {/* Exam Information */}
              {examSession && (
                <div className="bg-gray-50 rounded-lg p-6 mb-8">
                  <h2 className="text-xl font-bold text-[#001e62] mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Exam Information
                  </h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Course:</span>
                        <span className="font-medium">
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
                        <span className="text-gray-600">Session ID:</span>
                        <span className="font-mono text-xs">
                          {examSession.id.substring(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* System Requirements */}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-[#001e62] mb-6 flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  System Requirements Check
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div
                    className={`p-4 rounded-lg border-2 ${
                      systemChecks.seb
                        ? "border-green-200 bg-green-50"
                        : "border-yellow-200 bg-yellow-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Shield
                        className={`w-6 h-6 ${
                          systemChecks.seb
                            ? "text-green-600"
                            : "text-yellow-600"
                        }`}
                      />
                      {systemChecks.seb ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>
                    <div className="font-medium">Safe Exam Browser</div>
                    <div className="text-sm text-gray-600">
                      {isSEB ? `Active (v${sebVersion})` : "Recommended"}
                    </div>
                  </div>

                  <div
                    className={`p-4 rounded-lg border-2 ${
                      systemChecks.camera || isSEB
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Camera
                        className={`w-6 h-6 ${
                          systemChecks.camera || isSEB
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      />
                      {systemChecks.camera || isSEB ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="font-medium">Camera Access</div>
                    <div className="text-sm text-gray-600">
                      {isSEB
                        ? "Managed by SEB"
                        : systemChecks.camera
                        ? "Available"
                        : "Permission needed"}
                    </div>
                  </div>

                  <div
                    className={`p-4 rounded-lg border-2 ${
                      systemChecks.browser
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Monitor
                        className={`w-6 h-6 ${
                          systemChecks.browser
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      />
                      {systemChecks.browser ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="font-medium">Compatible Browser</div>
                    <div className="text-sm text-gray-600">
                      {systemChecks.browser
                        ? "Supported browser"
                        : "Unsupported browser"}
                    </div>
                  </div>

                  <div
                    className={`p-4 rounded-lg border-2 ${
                      systemChecks.connection
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Wifi
                        className={`w-6 h-6 ${
                          systemChecks.connection
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      />
                      {systemChecks.connection ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="font-medium">Internet Connection</div>
                    <div className="text-sm text-gray-600">
                      {systemChecks.connection ? "Connected" : "Disconnected"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Camera Preview (non-SEB only) */}
              {systemChecks.camera && !isSEB && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-[#001e62] mb-4 flex items-center">
                    <Eye className="w-5 h-5 mr-2" />
                    Camera Preview
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

              {/* Academic Integrity Agreement */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-amber-800 mb-4 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Academic Integrity Agreement
                </h3>
                <div className="text-sm text-amber-700 space-y-3">
                  <p className="font-medium">
                    By starting this exam, I agree that:
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li>
                      • I will not use external resources or assistance during
                      this exam
                    </li>
                    <li>
                      • I understand this session may be monitored for security
                      purposes
                    </li>
                    <li>
                      • I will not switch applications, tabs, or leave the exam
                      environment
                    </li>
                    <li>
                      • Security violations may result in immediate exam
                      termination
                    </li>
                    <li>
                      • This exam represents my individual knowledge and
                      abilities
                    </li>
                  </ul>
                </div>
              </div>

              {/* Start Button */}
              <div className="text-center">
                <button
                  onClick={startExam}
                  disabled={!examSession || questions.length === 0}
                  className="px-8 py-4 bg-[#001e62] text-white rounded-lg text-lg font-semibold hover:bg-[#003a8c] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center mx-auto shadow-lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Begin Secure Exam
                </button>
                <p className="text-sm text-gray-500 mt-4">
                  {examSession && questions.length > 0
                    ? `Ready to start - ${questions.length} questions loaded`
                    : "Loading exam data..."}
                </p>
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
      {!isSEB && !isFullscreen && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-3 text-center z-50 animate-pulse">
          <AlertTriangle className="w-5 h-5 inline mr-2" />
          SECURITY ALERT: Return to fullscreen mode immediately
        </div>
      )}

      {/* Main Content */}
      <div
        className="p-6"
        style={{ paddingTop: !isSEB && !isFullscreen ? "4rem" : "1.5rem" }}
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
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-mono font-bold text-white">
                {formatTime(timeRemaining)}
              </div>
              <div className="text-sm text-blue-200">Time Remaining</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white/20 rounded-full h-3 mb-4">
            <div
              className="bg-gradient-to-r from-blue-400 to-white h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="bg-white/10 backdrop-blur rounded-lg p-8 mb-6">
          <h2 className="text-xl font-semibold leading-relaxed mb-6">
            {currentQ.question}
          </h2>

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
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
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
          Progress
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
            <span className={isSEB ? "text-green-400" : "text-yellow-400"}>
              {isSEB ? "SEB" : "Browser"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
