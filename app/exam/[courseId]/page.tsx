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
  Volume2,
  Download,
  AlertCircle,
  ArrowLeft,
  Settings,
  Users,
  FileText,
  Headphones,
  Activity,
} from "lucide-react";

// --- Types ---
interface Question {
  id: string;
  question: string;
  options: string[];
  order: number;
  difficulty?: "easy" | "medium" | "hard";
  timeLimit?: number;
  category?: string;
}

interface ExamSession {
  id: string;
  courseId: string;
  courseName: string;
  status: "ACTIVE" | "COMPLETED" | "TERMINATED";
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
  screenRecording: boolean;
  virtualMachine: boolean;
}

interface SEBInfo {
  version?: string;
  configKey?: string;
  browserExamKey?: string;
  isConfigured?: boolean;
}

interface ViolationRecord {
  type: string;
  details: string;
  timestamp: string;
  severity: "low" | "medium" | "high";
}

// --- Custom Hooks ---
function useSafeExamBrowser() {
  const [isSEB, setIsSEB] = useState(false);
  const [sebInfo, setSebInfo] = useState<SEBInfo>({});
  const [sebReady, setSebReady] = useState(false);
  const [sebVersion, setSebVersion] = useState<string>("");

  useEffect(() => {
    const detectSEB = () => {
      const userAgent = navigator.userAgent;
      const sebPatterns = [/SEB[\s\/][\d\.]+/i, /SafeExamBrowser/i, /SEB\//i];
      const isSEBByUserAgent = sebPatterns.some((pattern) => pattern.test(userAgent));
      const isSEBByWindow = (window as any).SafeExamBrowser !== undefined || (window as any).seb !== undefined;
      const isSEBByMedia = window.matchMedia("(seb)").matches;
      const hasSEBHeaders = document.cookie.includes("seb-session") || sessionStorage.getItem("seb-active") === "true";
      const detected = isSEBByUserAgent || isSEBByWindow || isSEBByMedia || hasSEBHeaders;

      setIsSEB(detected);

      if ((window as any).SafeExamBrowser) {
        const info: SEBInfo = {
          version: (window as any).SafeExamBrowser.version,
          configKey: (window as any).SafeExamBrowser.configKey,
          browserExamKey: (window as any).SafeExamBrowser.browserExamKey,
          isConfigured: true,
        };
        setSebInfo(info);
        setSebVersion(info.version || "Unknown");
      } else if (detected) {
        const versionMatch = userAgent.match(/SEB[\s\/]([\d\.]+)/i);
        setSebVersion(versionMatch ? versionMatch[1] : "Detected");
        setSebInfo({ isConfigured: true });
      }
      setSebReady(detected);
    };

    detectSEB();
    const timer = setTimeout(detectSEB, 1000);
    const intervalTimer = setInterval(detectSEB, 5000);

    return () => {
      clearTimeout(timer);
      clearInterval(intervalTimer);
    };
  }, []);

  return { isSEB, sebInfo, sebReady, sebVersion };
}

// --- SEB Config Download Component ---
function SEBConfigDownload({ courseId, examSessionId }: { courseId: string; examSessionId?: string }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const generateSEBConfig = () => {
    const baseURL = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const sessionParam = examSessionId ? `?session=${examSessionId}` : "";
    const sebParam = sessionParam ? "&seb=true" : "?seb=true";
    const examURL = `${baseURL}/exam/${courseId}${sessionParam}${sebParam}`;
    const quitURL = `${baseURL}/courses/${courseId}`;
    const timestamp = Date.now();
    const sebConfigKey = btoa(`course_${courseId}_${timestamp}`).substring(0, 16);
    const browserExamKey = btoa(`session_${examSessionId || "default"}_${timestamp}`).substring(0, 16);
    const adminPassword = "admin123";
    const hashedPassword = btoa(adminPassword);

    return {
      startURL: examURL,
      quitURL: quitURL,
      sendBrowserExamKey: true,
      examKeySalt: sebConfigKey,
      browserExamKey: browserExamKey,
      allowQuit: true,
      quitExamPasswordHash: hashedPassword,
      quitExamText: "Enter administrator password to quit exam:",
      restartExamPasswordHash: hashedPassword,
      restartExamText: "Enter administrator password to restart exam:",
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
      enableAltMouseWheel: false,
      enableEsc: false,
      enableCtrlAltDel: false,
      allowBrowsingBackForward: false,
      allowReload: false,
      showReloadButton: false,
      allowAddressBar: false,
      allowNavigationBar: false,
      showNavigationButtons: false,
      newBrowserWindowByLinkPolicy: 0,
      newBrowserWindowByScriptPolicy: 0,
      blockPopUpWindows: true,
      allowWindowsUpdate: false,
      enablePrivateClipboard: true,
      allowPasteFromClipboard: false,
      allowCopy: false,
      allowCut: false,
      allowPaste: false,
      allowSpellCheck: false,
      allowDictation: false,
      enableLogging: true,
      logLevel: 2,
      allowApplicationLog: true,
      allowWindowCapture: false,
      detectVirtualMachine: true,
      allowVirtualMachine: false,
      allowScreenSharing: false,
      forceAppFolderInstall: true,
      URLFilterEnable: true,
      URLFilterEnableContentFilter: true,
      urlFilterRules: [
        { action: 1, active: true, expression: examURL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') },
        { action: 1, active: true, expression: `${baseURL}/api/*` },
        { action: 0, active: true, expression: "*" },
      ],
      prohibitedProcesses: [
        { active: true, currentUser: true, description: "Block screen recording", executable: "obs", windowHandling: 1 },
        { active: true, currentUser: true, description: "Block TeamViewer", executable: "TeamViewer", windowHandling: 1 },
        { active: true, currentUser: true, description: "Block Zoom", executable: "zoom", windowHandling: 1 },
        { active: true, currentUser: true, description: "Block Discord", executable: "Discord", windowHandling: 1 },
        { active: true, currentUser: true, description: "Block Skype", executable: "Skype", windowHandling: 1 },
        { active: true, currentUser: true, description: "Block Chrome", executable: "chrome", windowHandling: 1 },
        { active: true, currentUser: true, description: "Block Firefox", executable: "firefox", windowHandling: 1 },
        { active: true, currentUser: true, description: "Block Safari", executable: "Safari", windowHandling: 1 },
      ],
      allowSiri: false,
      // allowDictation: false,
      allowRemoteAppConnection: false,
      enableTouchExit: false,
      touchOptimized: false,
      allowPreferencesWindow: false,
      showBackToStartButton: false,
      showInputLanguage: false,
      showTime: true,
      allowDisplayMirroring: false,
      allowedDisplaysMaxNumber: 1,
      examSessionClearCookiesOnStart: true,
      examSessionClearCookiesOnEnd: true,
      restartExamUseStartURL: true,
      // restartExamText: "Click to restart exam",
      allowAudioCapture: false,
      allowVideoCapture: false,
      allowCamera: false,
      allowMicrophone: false,
    };
  };

  const downloadSEBConfig = async () => {
    setIsDownloading(true);
    try {
      const sebConfig = generateSEBConfig();
      const blob = new Blob([JSON.stringify(sebConfig, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `secure_exam_${courseId}_config.seb`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setTimeout(() => {
        alert(`SEB configuration downloaded successfully!\n\nNext steps:\n1. Close all browser windows\n2. Double-click the .seb file\n3. Safe Exam Browser will launch automatically\n4. Your exam will load in secure mode\n\nAdmin password: admin123 (for emergencies only)`);
      }, 500);
    } catch (error) {
      console.error("Error generating SEB config:", error);
      alert("Failed to generate SEB configuration. Please try again.");
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
      <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
        <strong>Setup Instructions:</strong>
        <ol className="mt-2 ml-4 list-decimal space-y-1">
          <li>Install Safe Exam Browser from the official website above</li>
          <li>Download the exam configuration file using the button above</li>
          <li>Close ALL browser windows and applications</li>
          <li>Double-click the downloaded .seb file</li>
          <li>Safe Exam Browser will open and load your exam automatically</li>
          <li>Complete your exam in the secure environment</li>
        </ol>
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
          <strong>Emergency Access:</strong> Admin password is "admin123" - only use if you need to exit SEB due to technical issues.
        </div>
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
  const { isSEB, sebInfo, sebVersion } = useSafeExamBrowser();

  // --- State ---
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [examSession, setExamSession] = useState<ExamSession | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [showSystemCheck, setShowSystemCheck] = useState(true);
  const [systemChecks, setSystemChecks] = useState<SystemCheck>({
    camera: false,
    microphone: false,
    fullscreen: false,
    connection: true,
    browser: true,
    seb: false,
    screenRecording: false,
    virtualMachine: false,
  });
  const [isProctoring, setIsProctoring] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"stable" | "unstable" | "disconnected">("stable");
  const [initError, setInitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [showViolations, setShowViolations] = useState(false);

  // --- Refs ---
  const timerRef = useRef<NodeJS.Timeout>();
  const monitoringRef = useRef<NodeJS.Timeout>();
  const questionStartTime = useRef<number>(Date.now());
  const heartbeatRef = useRef<NodeJS.Timeout>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const violationTimeoutRef = useRef<NodeJS.Timeout>();

  // --- Functions ---
  const performSystemChecks = async () => {
    const checks: Partial<SystemCheck> = {
      seb: isSEB,
      camera: false,
      microphone: false,
      fullscreen: !!document.fullscreenElement,
      connection: navigator.onLine,
      browser: /Chrome|Chromium/.test(navigator.userAgent),
      screenRecording: false,
      virtualMachine: false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      checks.camera = true;
    } catch (error) {
      checks.camera = false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      checks.microphone = true;
    } catch (error) {
      checks.microphone = false;
    }

    setSystemChecks((prev) => ({ ...prev, ...checks }));
  };

  const recordViolation = useCallback(
    async (type: string, details: string, severity: "low" | "medium" | "high" = "medium") => {
      if (!examSession?.id) return;
      const violation: ViolationRecord = {
        type,
        details,
        timestamp: new Date().toISOString(),
        severity,
      };
      const newViolations = [...violations, violation];
      setViolations(newViolations);

      try {
        await fetch("/api/exam/violation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: examSession.id, violation }),
        });

        const highSeverityViolations = newViolations.filter((v) => v.severity === "high").length;
        const totalViolations = newViolations.length;

        if (highSeverityViolations >= 2 || totalViolations >= 5) {
          alert(`FINAL WARNING: ${highSeverityViolations} high-severity and ${totalViolations} total security violations detected. Next violation will terminate the exam.`);
        } else if (severity === "high" || totalViolations >= 3) {
          alert(`WARNING: Security violation detected - ${details}. You have ${5 - totalViolations} violations remaining before exam termination.`);
        }

        if (highSeverityViolations >= 3 || totalViolations >= 6) {
          violationTimeoutRef.current = setTimeout(() => {
            alert("Too many security violations detected. Exam will be terminated.");
            handleSubmitExam("SECURITY_VIOLATION");
          }, 2000);
        }
      } catch (error) {
        console.error("Error recording violation:", error);
      }
    },
    [violations, examSession?.id]
  );

  const setupSecurityMonitoring = useCallback(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && examStarted) {
        recordViolation("TAB_SWITCH", "User switched away from exam tab", "high");
      }
    };

    const handleBlur = () => {
      if (examStarted && !isSEB) {
        recordViolation("WINDOW_BLUR", "Exam window lost focus", "medium");
      }
    };

    const handleFocus = () => {
      lastActivityRef.current = Date.now();
    };

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      if (!isCurrentlyFullscreen && examStarted && !isSEB) {
        recordViolation("FULLSCREEN_EXIT", "User exited fullscreen mode", "high");
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!examStarted) return;
      lastActivityRef.current = Date.now();
      const forbiddenKeys = [
        { keys: ["F12"], desc: "Developer Tools" },
        { keys: ["F11"], desc: "Fullscreen Toggle" },
        { keys: ["F5"], desc: "Refresh" },
        { keys: ["F1"], desc: "Help" },
        { keys: ["PrintScreen"], desc: "Screenshot" },
        { keys: ["Insert"], desc: "Insert Key" },
      ];

      const forbiddenCombos = [
        { keys: ["Control", "c"], desc: "Copy" },
        { keys: ["Control", "v"], desc: "Paste" },
        { keys: ["Control", "a"], desc: "Select All" },
        { keys: ["Control", "f"], desc: "Find" },
        { keys: ["Control", "s"], desc: "Save" },
        { keys: ["Control", "r"], desc: "Refresh" },
        { keys: ["Control", "n"], desc: "New Window" },
        { keys: ["Control", "t"], desc: "New Tab" },
        { keys: ["Control", "w"], desc: "Close Tab" },
        { keys: ["Control", "Shift", "i"], desc: "Developer Tools" },
        { keys: ["Control", "Shift", "j"], desc: "Console" },
        { keys: ["Control", "u"], desc: "View Source" },
        { keys: ["Alt", "Tab"], desc: "Switch Applications" },
        { keys: ["Alt", "F4"], desc: "Close Application" },
        { keys: ["Control", "Alt", "Delete"], desc: "Task Manager" },
      ];

      forbiddenKeys.forEach(({ keys, desc }) => {
        if (keys.includes(e.key)) {
          e.preventDefault();
          recordViolation("FORBIDDEN_KEY", `Attempted to use ${desc} (${e.key})`, "medium");
        }
      });

      forbiddenCombos.forEach(({ keys, desc }) => {
        const isMatch = keys.every((key) => {
          switch (key) {
            case "Control":
              return e.ctrlKey;
            case "Alt":
              return e.altKey;
            case "Shift":
              return e.shiftKey;
            default:
              return e.key.toLowerCase() === key.toLowerCase();
          }
        });
        if (isMatch && keys.length === (e.ctrlKey ? 1 : 0) + (e.altKey ? 1 : 0) + (e.shiftKey ? 1 : 0) + 1) {
          e.preventDefault();
          recordViolation("FORBIDDEN_SHORTCUT", `Attempted to use ${desc} (${keys.join("+")})`, "high");
        }
      });
    };

    const handleMouseMove = () => {
      lastActivityRef.current = Date.now();
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (examStarted) {
        e.preventDefault();
        recordViolation("CONTEXT_MENU_ATTEMPT", "Attempted to open context menu", "medium");
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (examStarted && !isSubmitting) {
        e.preventDefault();
        e.returnValue = "Are you sure you want to leave the exam? Your progress may be lost.";
        recordViolation("NAVIGATION_ATTEMPT", "Attempted to navigate away from exam", "high");
      }
    };

    const handleResize = () => {
      if (examStarted && !isSEB) {
        recordViolation("WINDOW_RESIZE", "Browser window was resized", "low");
      }
    };

    const handleOnline = () => setConnectionStatus("stable");
    const handleOffline = () => {
      setConnectionStatus("disconnected");
      if (examStarted) {
        recordViolation("CONNECTION_LOST", "Internet connection lost", "medium");
      }
    };

    const checkInactivity = () => {
      const inactiveTime = Date.now() - lastActivityRef.current;
      if (inactiveTime > 300000 && examStarted) {
        recordViolation("EXTENDED_INACTIVITY", `No user activity detected for ${Math.round(inactiveTime / 60000)} minutes`, "medium");
      }
    };

    const monitorNetworkStability = async () => {
      if (!navigator.onLine) {
        setConnectionStatus("disconnected");
        return;
      }
      try {
        const startTime = Date.now();
        const response = await fetch("/api/ping", { method: "HEAD", cache: "no-cache" });
        const latency = Date.now() - startTime;
        setConnectionStatus(latency > 2000 ? "unstable" : "stable");
      } catch {
        setConnectionStatus("unstable");
      }
    };

    const checkSecurityStatus = async () => {
      try {
        const response = await fetch(`/api/exam/validate/${examSession?.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            browserData: {
              userAgent: navigator.userAgent,
              screen: { width: screen.width, height: screen.height, colorDepth: screen.colorDepth, pixelDepth: screen.pixelDepth },
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              language: navigator.language,
              languages: navigator.languages,
              platform: navigator.platform,
              cookieEnabled: navigator.cookieEnabled,
              onLine: navigator.onLine,
              isSEB,
              sebInfo,
              timestamp: Date.now(),
            },
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          recordViolation("SECURITY_CHECK_FAILED", errorData.message || "Security validation failed", "high");
          if (response.status === 403) {
            handleSubmitExam("SECURITY_VIOLATION");
          }
        }
      } catch (error) {
        console.error("Security check failed:", error);
        recordViolation("SECURITY_CHECK_ERROR", "Failed to validate security status", "medium");
      }
    };

    const sendHeartbeat = async () => {
      try {
        await fetch("/api/exam/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: examSession?.id,
            timestamp: Date.now(),
            violations: violations.length,
            currentQuestion: currentQuestion + 1,
            answered: Object.keys(answers).length,
          }),
        });
      } catch (error) {
        console.error("Heartbeat failed:", error);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("resize", handleResize);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    monitoringRef.current = setInterval(() => {
      if (examStarted) {
        checkSecurityStatus();
        checkInactivity();
        monitorNetworkStability();
      }
    }, 10000);

    heartbeatRef.current = setInterval(() => {
      if (examStarted && examSession) {
        sendHeartbeat();
      }
    }, 30000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (monitoringRef.current) clearInterval(monitoringRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (violationTimeoutRef.current) clearTimeout(violationTimeoutRef.current);
    };
  }, [examStarted, examSession, isSubmitting, recordViolation, isSEB, sebInfo, violations, currentQuestion, answers]);

  const handleSubmitExam = useCallback(
    async (reason: string = "USER_SUBMIT") => {
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
            timeSpent: examSession ? examSession.duration * 60 - timeRemaining : 0,
          }),
        });
        if (response.ok) {
          if (document.exitFullscreen && document.fullscreenElement) {
            await document.exitFullscreen().catch(() => {});
          }
          if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach((track) => track.stop());
          }
          router.push(`/exam/results/${examSession?.id}`);
        } else {
          throw new Error("Failed to submit exam");
        }
      } catch (error) {
        console.error("Error submitting exam:", error);
        alert("Failed to submit exam. Please try again or contact support.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, examSession?.id, answers, violations, timeRemaining, router]
  );

  const startExam = async () => {
    if (!examSession || !questions.length) return;
    try {
      if (!isSEB && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
      if (!isSEB && systemChecks.camera && videoRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
      }
      setExamStarted(true);
      setShowSystemCheck(false);
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
    } catch (error) {
      console.error("Error starting exam:", error);
      alert("Failed to start exam. Please ensure camera/microphone access is granted.");
    }
  };

  const handleAnswerChange = (questionId: string, selectedOption: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: selectedOption }));
  };

  const navigateToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestion(index);
      questionStartTime.current = Date.now();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimeColor = () => {
    if (timeRemaining < 300) return "text-red-500";
    if (timeRemaining < 600) return "text-yellow-500";
    return "text-white";
  };

  const getViolationSeverityColor = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "high":
        return "text-red-400";
      case "medium":
        return "text-yellow-400";
      default:
        return "text-gray-400";
    }
  };

  // --- Initialization ---
  useEffect(() => {
    const initializeExam = async () => {
      try {
        setLoading(true);
        const [sessionRes, questionsRes] = await Promise.all([
          fetch(`/api/exam/session/${courseId}`),
          fetch(`/api/exam/questions/${courseId}`),
        ]);
        if (!sessionRes.ok || !questionsRes.ok) {
          throw new Error("Failed to load exam data");
        }
        const sessionData: ExamSession = await sessionRes.json();
        const questionsData: Question[] = await questionsRes.json();
        setExamSession(sessionData);
        setQuestions(questionsData);
        setTimeRemaining(sessionData.duration * 60);
        await performSystemChecks();
        const cleanupMonitoring = setupSecurityMonitoring();
        setInitialized(true);
      } catch (error) {
        console.error("Initialization error:", error);
        setInitError("Failed to load exam. Please refresh or contact support.");
      } finally {
        setLoading(false);
      }
    };
    if (!initialized && courseId && !loading) {
      initializeExam();
    }
    return () => {
      if (monitoringRef.current) clearInterval(monitoringRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (violationTimeoutRef.current) clearTimeout(violationTimeoutRef.current);
    };
  }, [courseId, initialized, loading, setupSecurityMonitoring]);

  // --- Render ---
  if (showSystemCheck) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#001e62] to-[#003a8c] flex items-center justify-center p-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-[#001e62] text-white p-8 text-center">
              <Shield className="w-16 h-16 mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-2">Secure Exam Environment</h1>
              <p className="text-blue-100">System Security Verification Required</p>
              {isSEB && (
                <div className="mt-4 bg-green-600 rounded-lg p-3">
                  <div className="flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    <span className="font-medium">Safe Exam Browser Detected - Version {sebVersion}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="p-8">
              {isSEB ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-medium text-green-800">Safe Exam Browser Active</h3>
                      <p className="text-sm text-green-700 mt-1">Secure environment is properly configured and running</p>
                      {sebInfo && (
                        <div className="text-xs text-green-600 mt-2 font-mono">
                          {sebInfo.version && <div>Version: {sebInfo.version}</div>}
                          {sebInfo.configKey && <div>Config: {sebInfo.configKey.substring(0, 8)}...</div>}
                          {sebInfo.browserExamKey && <div>Exam Key: {sebInfo.browserExamKey.substring(0, 8)}...</div>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mr-3 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-medium text-amber-800">Safe Exam Browser Recommended</h3>
                      <p className="text-sm text-amber-700 mb-3">For maximum security, download and use Safe Exam Browser with the configuration below.</p>
                      <SEBConfigDownload courseId={courseId} examSessionId={examSession?.id} />
                    </div>
                  </div>
                </div>
              )}
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
                        <span className="font-medium">{examSession.courseName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Questions:</span>
                        <span className="font-medium">{examSession.totalQuestions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">{examSession.duration} minutes</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Passing Score:</span>
                        <span className="font-medium">{examSession.passingScore}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Attempts:</span>
                        <span className="font-medium">
                          {examSession.currentAttempt}/{examSession.allowedAttempts}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className="font-medium text-green-600">{examSession.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-[#001e62] mb-6 flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  System Requirements Check
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div
                    className={`p-4 rounded-lg border-2 transition-all ${
                      systemChecks.seb ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Shield
                        className={`w-6 h-6 ${systemChecks.seb ? "text-green-600" : "text-yellow-600"}`}
                      />
                      {systemChecks.seb ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>
                    <div className="font-medium">Safe Exam Browser</div>
                    <div className="text-sm text-gray-600">
                      {isSEB ? "Active and secured" : "Recommended for security"}
                    </div>
                  </div>
                  <div
                    className={`p-4 rounded-lg border-2 transition-all ${
                      systemChecks.camera || isSEB ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Camera
                        className={`w-6 h-6 ${
                          systemChecks.camera || isSEB ? "text-green-600" : "text-red-600"
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
                      {isSEB ? "Managed by SEB" : systemChecks.camera ? "Connected" : "Required for proctoring"}
                    </div>
                  </div>
                  <div
                    className={`p-4 rounded-lg border-2 transition-all ${
                      systemChecks.microphone || isSEB ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Volume2
                        className={`w-6 h-6 ${
                          systemChecks.microphone || isSEB ? "text-green-600" : "text-red-600"
                        }`}
                      />
                      {systemChecks.microphone || isSEB ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="font-medium">Microphone Access</div>
                    <div className="text-sm text-gray-600">
                      {isSEB ? "Managed by SEB" : systemChecks.microphone ? "Connected" : "Required for monitoring"}
                    </div>
                  </div>
                  <div
                    className={`p-4 rounded-lg border-2 transition-all ${
                      systemChecks.browser || isSEB ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Monitor
                        className={`w-6 h-6 ${
                          systemChecks.browser || isSEB ? "text-green-600" : "text-red-600"
                        }`}
                      />
                      {systemChecks.browser || isSEB ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="font-medium">Compatible Browser</div>
                    <div className="text-sm text-gray-600">
                      {isSEB ? "SEB Browser" : systemChecks.browser ? "Chrome compatible" : "Chrome recommended"}
                    </div>
                  </div>
                  <div
                    className={`p-4 rounded-lg border-2 transition-all ${
                      systemChecks.connection ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Wifi
                        className={`w-6 h-6 ${systemChecks.connection ? "text-green-600" : "text-red-600"}`}
                      />
                      {systemChecks.connection ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="font-medium">Internet Connection</div>
                    <div className="text-sm text-gray-600">
                      {connectionStatus === "stable"
                        ? "Connected and stable"
                        : connectionStatus === "unstable"
                        ? "Unstable connection"
                        : "Disconnected"}
                    </div>
                  </div>
                  <div
                    className={`p-4 rounded-lg border-2 transition-all ${
                      !systemChecks.virtualMachine ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Activity
                        className={`w-6 h-6 ${
                          !systemChecks.virtualMachine ? "text-green-600" : "text-yellow-600"
                        }`}
                      />
                      {!systemChecks.virtualMachine ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>
                    <div className="font-medium">System Environment</div>
                    <div className="text-sm text-gray-600">
                      {systemChecks.virtualMachine ? "Virtual machine detected" : "Physical system detected"}
                    </div>
                  </div>
                </div>
              </div>
              {systemChecks.camera && !isSEB && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-[#001e62] mb-4 flex items-center">
                    <Eye className="w-5 h-5 mr-2" />
                    Camera Preview
                  </h3>
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden max-w-md mx-auto">
                    <video ref={videoRef} autoPlay muted className="w-full h-64 object-cover" />
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded text-sm flex items-center">
                      <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                      MONITORING ACTIVE
                    </div>
                  </div>
                </div>
              )}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-amber-800 mb-4 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Academic Integrity Agreement
                </h3>
                <div className="text-sm text-amber-700 space-y-3">
                  <p className="font-medium">By starting this exam, I agree to the following terms:</p>
                  <ul className="space-y-2 ml-4">
                    <li>• I will not use any external resources, materials, or assistance during this exam</li>
                    <li>• I understand this exam session is monitored and may be recorded for security purposes</li>
                    <li>• I will remain in the exam environment and not switch applications or browser tabs</li>
                    <li>• I will maintain the required system setup throughout the entire exam duration</li>
                    <li>• I understand that security violations may result in immediate exam termination</li>
                    <li>• I acknowledge that this exam represents my own individual knowledge and abilities</li>
                  </ul>
                  <div className="bg-red-50 border border-red-200 rounded p-3 mt-4">
                    <p className="font-medium text-red-800">Warning:</p>
                    <p className="text-red-700 text-xs">
                      Violations are automatically detected and recorded. Multiple violations will result in exam termination and may affect your final score.
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <button
                  onClick={startExam}
                  disabled={!isSEB && !Object.values(systemChecks).every((check) => check)}
                  className="px-8 py-4 bg-[#001e62] text-white rounded-lg text-lg font-semibold hover:bg-[#003a8c] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center mx-auto shadow-lg"
                >
                  <Lock className="w-5 h-5 mr-2" />
                  Begin Secure Exam
                </button>
                <p className="text-sm text-gray-500 mt-4">
                  {isSEB
                    ? "Safe Exam Browser detected - ready to start"
                    : systemChecks.seb
                    ? "All requirements met - ready to proceed"
                    : "Complete all system checks to enable exam start"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-4">No Exam Questions Available</h2>
          <p className="text-gray-600 mb-6">This course does not have any exam questions configured yet. Please contact your instructor.</p>
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
  const highViolations = violations.filter((v) => v.severity === "high").length;
  const totalViolations = violations.length;

  return (
    <div className="min-h-screen bg-[#001e62] text-white relative">
      {!isSEB && !isFullscreen && examStarted && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-3 text-center z-50 animate-pulse">
          <AlertTriangle className="w-5 h-5 inline mr-2" />
          CRITICAL SECURITY ALERT: Return to fullscreen mode immediately or exam will be terminated
        </div>
      )}
      {connectionStatus !== "stable" && (
        <div
          className={`fixed ${!isSEB && !isFullscreen ? "top-12" : "top-0"} left-0 right-0 ${
            connectionStatus === "disconnected" ? "bg-red-600" : "bg-yellow-600"
          } text-white p-2 text-center z-40`}
        >
          <Wifi className="w-4 h-4 inline mr-2" />
          {connectionStatus === "disconnected" ? "CONNECTION LOST - Reconnecting..." : "UNSTABLE CONNECTION - Performance may be affected"}
        </div>
      )}
      {isSEB && (
        <div className="fixed top-0 left-0 right-0 bg-green-600 text-white p-2 text-center z-30">
          <Shield className="w-4 h-4 inline mr-2" />
          Safe Exam Browser Active - Secure Environment Enabled
        </div>
      )}
      {totalViolations > 0 && (
        <div className={`fixed ${isSEB ? "top-12" : "top-0"} right-4 bg-red-600 text-white p-3 rounded-lg z-30 animate-pulse`}>
          <div className="flex items-center text-sm">
            <AlertTriangle className="w-4 h-4 mr-2" />
            <span>
              {totalViolations} violation{totalViolations > 1 ? "s" : ""} detected
            </span>
          </div>
        </div>
      )}
      <div className="p-6" style={{ paddingTop: isSEB ? "3rem" : "1.5rem" }}>
        <div className="bg-white/10 backdrop-blur rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold flex items-center mb-2">
                <Shield className="w-6 h-6 mr-3" />
                {examSession?.courseName}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-blue-200">
                <span>Question {currentQuestion + 1} of {questions.length}</span>
                <span>Progress: {Math.round(progress)}%</span>
                <span>Answered: {answeredCount}/{questions.length}</span>
                {currentQ.difficulty && (
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      currentQ.difficulty === "easy"
                        ? "bg-green-500/30"
                        : currentQ.difficulty === "medium"
                        ? "bg-yellow-500/30"
                        : "bg-red-500/30"
                    }`}
                  >
                    {currentQ.difficulty.toUpperCase()}
                  </span>
                )}
                {currentQ.category && (
                  <span className="bg-blue-500/30 px-2 py-1 rounded text-xs">{currentQ.category}</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-mono font-bold ${getTimeColor()}`}>{formatTime(timeRemaining)}</div>
              <div className="text-sm text-blue-200">Time Remaining</div>
              {timeRemaining < 600 && (
                <div className="text-xs text-red-300 animate-pulse mt-1">⚠ Less than 10 minutes left!</div>
              )}
            </div>
          </div>
          <div className="bg-white/20 rounded-full h-3 mb-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-400 to-white h-3 rounded-full transition-all duration-500 relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center">
              <Eye className="w-4 h-4 mr-2" />
              <span>{isProctoring || isSEB ? "Monitored" : "Not Monitored"}</span>
            </div>
            <div className="flex items-center">
              <Wifi className="w-4 h-4 mr-2" />
              <span className={connectionStatus === "stable" ? "text-green-300" : "text-yellow-300"}>
                {connectionStatus}
              </span>
            </div>
            <div className="flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              <span className={isSEB ? "text-green-300" : "text-yellow-300"}>{isSEB ? "SEB Active" : "Browser Mode"}</span>
            </div>
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              <span className={totalViolations > 0 ? "text-red-300" : "text-green-300"}>
                {totalViolations === 0 ? "No Violations" : `${totalViolations} Violation${totalViolations > 1 ? "s" : ""}`}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-lg p-8 mb-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-semibold leading-relaxed flex-1 pr-4">{currentQ.question}</h2>
            <div className="flex flex-col gap-2">
              {currentQ.difficulty && (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    currentQ.difficulty === "easy"
                      ? "bg-green-500/20 text-green-300"
                      : currentQ.difficulty === "medium"
                      ? "bg-yellow-500/20 text-yellow-300"
                      : "bg-red-500/20 text-red-300"
                  }`}
                >
                  {currentQ.difficulty.toUpperCase()}
                </span>
              )}
              {currentQ.timeLimit && (
                <span className="px-3 py-1 rounded-full text-xs bg-blue-500/20 text-blue-300">
                  {currentQ.timeLimit}s limit
                </span>
              )}
            </div>
          </div>
          <div className="space-y-4">
            {currentQ.options.map((option, index) => (
              <label
                key={index}
                className={`block p-5 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:scale-[1.01] ${
                  answers[currentQ.id] === index
                    ? "border-white bg-white/20 transform scale-[1.02] shadow-lg"
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
                      answers[currentQ.id] === index ? "border-white bg-white scale-110" : "border-white/50 hover:border-white/70"
                    }`}
                  >
                    {answers[currentQ.id] === index && <div className="w-3 h-3 rounded-full bg-[#001e62]"></div>}
                  </div>
                  <span className="text-lg leading-relaxed">{option}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={handlePreviousQuestion}
            disabled={currentQuestion === 0}
            className="px-6 py-3 bg-white/20 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/30 transition-colors flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </button>
          <div className="flex-1 mx-8">
            <div className="text-center mb-3">
              <span className="text-blue-200 text-sm font-medium">Question Navigation</span>
            </div>
            <div className="flex justify-center flex-wrap gap-2 max-w-2xl mx-auto">
              {questions.slice(0, Math.min(20, questions.length)).map((_, index) => (
                <button
                  key={index}
                  onClick={() => navigateToQuestion(index)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-all hover:scale-110 ${
                    index === currentQuestion
                      ? "bg-white text-[#001e62] shadow-lg scale-110"
                      : answers[questions[index].id] !== undefined
                      ? "bg-green-500/30 text-white hover:bg-green-500/40"
                      : "bg-white/20 text-white/70 hover:bg-white/30"
                  }`}
                  title={`Question ${index + 1}${answers[questions[index].id] !== undefined ? " (Answered)" : ""}`}
                >
                  {index + 1}
                </button>
              ))}
              {questions.length > 20 && (
                <div className="flex items-center text-white/50 px-2 text-sm">+{questions.length - 20} more</div>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            {currentQuestion === questions.length - 1 ? (
              <button
                onClick={() => handleSubmitExam("USER_SUBMIT")}
                disabled={isSubmitting}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center shadow-lg"
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
        <div className="fixed bottom-6 left-6 bg-black/60 backdrop-blur text-white p-4 rounded-lg text-sm max-w-xs z-20">
          <h4 className="font-semibold mb-3 flex items-center">
            <Shield className="w-4 h-4 mr-2" />
            Security Status
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Environment:</span>
              <span className={isSEB ? "text-green-400" : "text-yellow-400"}>{isSEB ? "SEB" : "Browser"}</span>
            </div>
            <div className="flex justify-between">
              <span>Monitoring:</span>
              <span className={isProctoring || isSEB ? "text-green-400" : "text-red-400"}>
                {isProctoring || isSEB ? "Active" : "Inactive"}
              </span>
            </div>
            {!isSEB && (
              <div className="flex justify-between">
                <span>Fullscreen:</span>
                <span className={isFullscreen ? "text-green-400" : "text-red-400"}>{isFullscreen ? "Yes" : "No"}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Violations:</span>
              <span className={totalViolations > 0 ? "text-red-400" : "text-green-400"}>
                {totalViolations}/6 ({highViolations} high)
              </span>
            </div>
            <div className="flex justify-between">
              <span>Connection:</span>
              <span
                className={
                  connectionStatus === "stable"
                    ? "text-green-400"
                    : connectionStatus === "unstable"
                    ? "text-yellow-400"
                    : "text-red-400"
                }
              >
                {connectionStatus}
              </span>
            </div>
          </div>
          {totalViolations > 0 && (
            <button
              onClick={() => setShowViolations(!showViolations)}
              className="mt-3 text-xs text-blue-300 hover:text-blue-200 underline"
            >
              {showViolations ? "Hide" : "Show"} Violations
            </button>
          )}
        </div>
        {showViolations && violations.length > 0 && (
          <div className="fixed bottom-6 left-80 bg-black/80 backdrop-blur text-white p-4 rounded-lg text-xs max-w-sm z-20 max-h-64 overflow-y-auto">
            <h4 className="font-semibold mb-2 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Security Violations
            </h4>
            <div className="space-y-2">
              {violations.slice(-5).map((violation, index) => (
                <div key={index} className="border-l-2 border-red-400 pl-2 py-1">
                  <div className={`font-medium ${getViolationSeverityColor(violation.severity)}`}>
                    {violation.type}
                  </div>
                  <div className="text-gray-300">{violation.details}</div>
                  <div className="text-gray-500 text-xs">{new Date(violation.timestamp).toLocaleTimeString()}</div>
                </div>
              ))}
              {violations.length > 5 && (
                <div className="text-gray-400 text-center">... and {violations.length - 5} more</div>
              )}
            </div>
          </div>
        )}
        <div className="fixed bottom-6 right-6 bg-black/60 backdrop-blur text-white p-4 rounded-lg text-sm z-20">
          <h4 className="font-semibold mb-3 flex items-center">
            <Activity className="w-4 h-4 mr-2" />
            Progress Summary
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Answered:</span>
              <span className="text-green-400">
                {answeredCount}/{questions.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Remaining:</span>
              <span className="text-yellow-400">{questions.length - answeredCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Current:</span>
              <span className="text-blue-400">Q{currentQuestion + 1}</span>
            </div>
            <div className="flex justify-between">
              <span>Time Used:</span>
              <span className="text-gray-300">
                {formatTime((examSession?.duration || 0) * 60 - timeRemaining)}
              </span>
            </div>
            <div className="mt-3 pt-2 border-t border-gray-600">
              <div className="text-xs text-gray-400 mb-1">Completion Rate</div>
              <div className="bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                ></div>
              </div>
              <div className="text-xs text-center mt-1 text-gray-300">
                {Math.round((answeredCount / questions.length) * 100)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
