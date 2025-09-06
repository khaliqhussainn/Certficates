// app/exam/[courseId]/page.tsx - Enhanced Secure Exam Interface with SEB Integration
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
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
  ArrowLeft
} from 'lucide-react'

interface Question {
  id: string
  question: string
  options: string[]
  order: number
  difficulty?: 'easy' | 'medium' | 'hard'
}

interface ExamSession {
  id: string
  courseId: string
  courseName: string
  status: 'ACTIVE' | 'COMPLETED' | 'TERMINATED'
  startedAt: string
  expiresAt: string
  violations: number
  duration: number
  totalQuestions: number
  passingScore: number
}

interface SystemCheck {
  camera: boolean
  microphone: boolean
  fullscreen: boolean
  connection: boolean
  browser: boolean
  seb: boolean
}

// Safe Exam Browser Detection Hook
function useSafeExamBrowser() {
  const [isSEB, setIsSEB] = useState(false)
  const [sebInfo, setSebInfo] = useState<any>(null)

  useEffect(() => {
    const detectSEB = () => {
      const userAgent = navigator.userAgent
      const isSEBDetected = userAgent.includes('SEB') || 
                           userAgent.includes('SafeExamBrowser') ||
                           (window as any).SafeExamBrowser !== undefined

      setIsSEB(isSEBDetected)

      if ((window as any).SafeExamBrowser) {
        setSebInfo({
          version: (window as any).SafeExamBrowser.version,
          configKey: (window as any).SafeExamBrowser.configKey,
          browserExamKey: (window as any).SafeExamBrowser.browserExamKey
        })
      }
    }

    detectSEB()
  }, [])

  return { isSEB, sebInfo }
}

// SEB Configuration Download Component
function SEBConfigDownload({ courseId, examSessionId }: { courseId: string, examSessionId?: string }) {
  const downloadSEBConfig = () => {
    const baseURL = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const sessionParam = examSessionId ? `?session=${examSessionId}` : ''
    
    const sebConfig = {
      // Basic SEB Settings
      "startURL": `${baseURL}/exam/${courseId}${sessionParam}&seb=true`,
      "quitURL": `${baseURL}/courses/${courseId}`,
      "sendBrowserExamKey": true,
      "examKeySalt": btoa(`course_${courseId}_${Date.now()}`).substring(0, 16),
      "browserExamKey": btoa(`session_${examSessionId || 'default'}_${Date.now()}`).substring(0, 16),
      
      // Security Settings
      "allowQuit": false,
      "ignoreExitKeys": true,
      "enableF3": false,
      "enableF1": false,
      "enableCtrlEsc": false,
      "enableAltEsc": false,
      "enableAltTab": false,
      "enableAltF4": false,
      "enableRightMouse": false,
      "enablePrintScreen": false,
      "enableAltMouseWheel": false,
      
      // Browser Settings
      "allowBrowsingBackForward": false,
      "allowReload": false,
      "showReloadButton": false,
      "allowAddressBar": false,
      "allowNavigationBar": false,
      "newBrowserWindowByLinkPolicy": 0,
      "newBrowserWindowByScriptPolicy": 0,
      
      // Exam Settings
      "restartExamPasswordHash": btoa('admin123'),
      "restartExamText": "Enter administrator password to restart exam:",
      "quitExamPasswordHash": btoa('admin123'),
      "quitExamText": "Enter administrator password to quit exam:",
      
      // Monitoring
      "enableLogging": true,
      "logLevel": 2,
      "allowApplicationLog": true,
      "allowWindowCapture": false,
      
      // Additional Security
      "detectVirtualMachine": true,
      "allowVirtualMachine": false,
      "allowScreenSharing": false,
      "allowSiri": false,
      "allowDictation": false,
      "allowSpellCheck": false,
      "allowRemoteAppConnection": false
    }

    const blob = new Blob([JSON.stringify(sebConfig, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `exam_${courseId}_config.seb`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={downloadSEBConfig}
      className="inline-flex items-center px-4 py-2 bg-[#001e62] text-white rounded-lg hover:bg-[#001e62]/90 transition-colors text-sm font-medium"
    >
      <Download className="w-4 h-4 mr-2" />
      Download SEB Config
    </button>
  )
}

export default function SecureExamPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const courseId = params.courseId as string
  const { isSEB, sebInfo } = useSafeExamBrowser()
  
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [examSession, setExamSession] = useState<ExamSession | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [violations, setViolations] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [examStarted, setExamStarted] = useState(false)
  const [showSystemCheck, setShowSystemCheck] = useState(true)
  const [systemChecks, setSystemChecks] = useState<SystemCheck>({
    camera: false,
    microphone: false,
    fullscreen: false,
    connection: true,
    browser: true,
    seb: false
  })
  const [isProctoring, setIsProctoring] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'stable' | 'unstable' | 'disconnected'>('stable')
  const [initError, setInitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  const timerRef = useRef<NodeJS.Timeout>()
  const monitoringRef = useRef<NodeJS.Timeout>()
  const questionStartTime = useRef<number>(Date.now())
  const heartbeatRef = useRef<NodeJS.Timeout>()
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastActivityRef = useRef<number>(Date.now())

  // Enhanced security monitoring
  const setupSecurityMonitoring = useCallback(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && examStarted) {
        recordViolation('TAB_SWITCH', 'User switched away from exam tab')
      }
    }

    const handleBlur = () => {
      if (examStarted) {
        recordViolation('WINDOW_BLUR', 'Window lost focus')
      }
    }

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement
      setIsFullscreen(isCurrentlyFullscreen)
      
      if (!isCurrentlyFullscreen && examStarted) {
        recordViolation('FULLSCREEN_EXIT', 'User exited fullscreen mode')
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!examStarted) return
      lastActivityRef.current = Date.now()

      // Prevent common cheating shortcuts
      if (e.ctrlKey && ['c', 'v', 'a', 'f', 's', 'r'].includes(e.key.toLowerCase())) {
        e.preventDefault()
        recordViolation('FORBIDDEN_SHORTCUT', `Attempted to use Ctrl+${e.key.toUpperCase()}`)
      }
      
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault()
        recordViolation('DEV_TOOLS_ATTEMPT', 'Attempted to open developer tools')
      }

      if (e.altKey && e.key === 'Tab') {
        e.preventDefault()
        recordViolation('ALT_TAB_ATTEMPT', 'Attempted to switch applications')
      }

      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault()
        recordViolation('CLOSE_ATTEMPT', 'Attempted to close browser tab')
      }
    }

    const handleMouseMove = () => {
      lastActivityRef.current = Date.now()
    }

    const handleContextMenu = (e: MouseEvent) => {
      if (examStarted) {
        e.preventDefault()
        recordViolation('CONTEXT_MENU_ATTEMPT', 'Attempted to open context menu')
      }
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (examStarted && !isSubmitting) {
        e.preventDefault()
        e.returnValue = 'Are you sure you want to leave the exam? Your progress may be lost.'
      }
    }

    // Network monitoring
    const handleOnline = () => setConnectionStatus('stable')
    const handleOffline = () => setConnectionStatus('disconnected')

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Enhanced monitoring
    monitoringRef.current = setInterval(() => {
      if (examStarted) {
        checkSecurityStatus()
        checkInactivity()
        monitorNetworkStability()
      }
    }, 3000)

    // Heartbeat
    heartbeatRef.current = setInterval(() => {
      if (examStarted && examSession) {
        sendHeartbeat()
      }
    }, 15000)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      
      if (monitoringRef.current) clearInterval(monitoringRef.current)
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [examStarted, examSession, isSubmitting])

  // System checks
  const performSystemChecks = async () => {
    const checks: Partial<SystemCheck> = {}

    // SEB check
    checks.seb = isSEB

    // Camera check
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      checks.camera = true
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsProctoring(true)
      }
    } catch {
      checks.camera = false
    }

    // Microphone check
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      checks.microphone = true
    } catch {
      checks.microphone = false
    }

    // Browser check
    checks.browser = !!(document.fullscreenEnabled && navigator.userAgent.includes('Chrome'))
    
    // Connection check
    checks.connection = navigator.onLine

    setSystemChecks(prev => ({ ...prev, ...checks }))
  }

  const checkInactivity = () => {
    const inactiveTime = Date.now() - lastActivityRef.current
    if (inactiveTime > 120000 && examStarted) { // 2 minutes
      recordViolation('INACTIVITY', 'No user activity detected for extended period')
    }
  }

  const monitorNetworkStability = () => {
    if (!navigator.onLine) {
      setConnectionStatus('disconnected')
    } else {
      // Simple ping test
      fetch('/api/ping', { method: 'HEAD' })
        .then(() => setConnectionStatus('stable'))
        .catch(() => setConnectionStatus('unstable'))
    }
  }

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin')
      return
    }

    performSystemChecks()
    initializeExam()
    const cleanup = setupSecurityMonitoring()

    return () => {
      cleanup()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [session, setupSecurityMonitoring])

  useEffect(() => {
    if (timeRemaining > 0 && examStarted) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(prev => prev - 1)
      }, 1000)
    } else if (timeRemaining === 0 && examStarted) {
      handleSubmitExam('TIME_EXPIRED')
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [timeRemaining, examStarted])

  const initializeExam = async () => {
    try {
      setLoading(true)
      console.log('Initializing exam for course:', courseId)
      
      const sessionResponse = await fetch('/api/exam/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      })
      
      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json().catch(() => ({ error: 'Failed to parse error response' }))
        throw new Error(errorData.error || `Failed to create exam session (${sessionResponse.status})`)
      }

      const sessionData = await sessionResponse.json()
      console.log('Exam session created:', sessionData)
      setExamSession(sessionData.session)
      setTimeRemaining(sessionData.session.duration * 60)

      const questionsResponse = await fetch(`/api/exam/questions/${courseId}`, {
        headers: {
          'X-Exam-Session': sessionData.session.id
        }
      })
      
      if (!questionsResponse.ok) {
        const errorData = await questionsResponse.json().catch(() => ({ error: 'Failed to parse error response' }))
        throw new Error(errorData.error || `Failed to load exam questions (${questionsResponse.status})`)
      }

      const questionsData = await questionsResponse.json()
      console.log('Questions loaded:', questionsData)
      setQuestions(questionsData.questions)
      
    } catch (error) {
      console.error('Error initializing exam:', error)
      setInitError(error instanceof Error ? error.message : 'Failed to initialize exam')
    } finally {
      setLoading(false)
    }
  }

  const startExam = async () => {
    // For SEB, we only require SEB + connection. For regular browsers, require all checks
    const requiredChecks = isSEB 
      ? ['seb', 'connection'] 
      : ['camera', 'microphone', 'browser', 'connection']
    
    const checksPass = requiredChecks.every(check => systemChecks[check as keyof SystemCheck])
    
    if (!checksPass) {
      alert('Please complete all required system checks before starting the exam.')
      return
    }

    try {
      if (!isSEB && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      }

      await fetch('/api/exam/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: examSession?.id }),
      })

      setExamStarted(true)
      setShowSystemCheck(false)
      questionStartTime.current = Date.now()
      lastActivityRef.current = Date.now()
    } catch (error) {
      console.error('Error starting exam:', error)
    }
  }

  const recordViolation = async (type: string, details: string) => {
    const newViolationCount = violations + 1
    setViolations(newViolationCount)
    
    try {
      await fetch('/api/exam/violation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: examSession?.id,
          violation: { type, details, timestamp: new Date().toISOString() },
        }),
      })

      if (newViolationCount >= 3) {
        alert('Too many security violations detected. Exam will be terminated.')
        handleSubmitExam('SECURITY_VIOLATION')
      }
    } catch (error) {
      console.error('Error recording violation:', error)
    }
  }

  const checkSecurityStatus = async () => {
    try {
      const response = await fetch(`/api/exam/validate/${examSession?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          browserData: {
            userAgent: navigator.userAgent,
            screen: { width: screen.width, height: screen.height },
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            isSEB: isSEB,
            sebInfo: sebInfo
          },
        }),
      })

      if (!response.ok) {
        handleSubmitExam('SECURITY_VIOLATION')
      }
    } catch (error) {
      console.error('Security check failed:', error)
    }
  }

  const sendHeartbeat = async () => {
    try {
      await fetch('/api/exam/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: examSession?.id }),
      })
    } catch (error) {
      console.error('Heartbeat failed:', error)
    }
  }

  const handleAnswerChange = async (questionId: string, selectedAnswer: number) => {
    const timeSpent = Math.round((Date.now() - questionStartTime.current) / 1000)
    
    setAnswers(prev => ({ ...prev, [questionId]: selectedAnswer }))

    try {
      await fetch('/api/exam/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: examSession?.id,
          questionId,
          selectedAnswer,
          timeSpent,
        }),
      })
    } catch (error) {
      console.error('Error submitting answer:', error)
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
      questionStartTime.current = Date.now()
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
      questionStartTime.current = Date.now()
    }
  }

  const handleSubmitExam = async (reason: string = 'USER_SUBMIT') => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/exam/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: examSession?.id,
          reason,
          answers 
        }),
      })

      if (response.ok) {
        if (document.exitFullscreen && document.fullscreenElement) {
          await document.exitFullscreen()
        }
        
        router.push(`/exam/results/${examSession?.id}`)
      }
    } catch (error) {
      console.error('Error submitting exam:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getTimeColor = () => {
    if (timeRemaining < 300) return 'text-red-400' // Last 5 minutes
    if (timeRemaining < 900) return 'text-yellow-400' // Last 15 minutes
    return 'text-white'
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#001e62] border-t-transparent mx-auto"></div>
          <p className="mt-3 text-sm text-gray-600">Initializing exam...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Failed to Load Exam</h2>
          <p className="text-gray-600 mb-6">{initError}</p>
          
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
    )
  }

  // System check screen
  if (showSystemCheck) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#001e62] to-[#003a8c] flex items-center justify-center">
        <div className="max-w-4xl mx-auto p-8">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-[#001e62] text-white p-8 text-center">
              <Shield className="w-16 h-16 mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-2">Secure Exam Environment</h1>
              <p className="text-blue-100">System Security Check Required</p>
            </div>

            <div className="p-8">
              {/* SEB Status */}
              {isSEB ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mr-2" />
                    <div>
                      <h3 className="font-medium text-green-800">Safe Exam Browser Detected</h3>
                      <p className="text-sm text-green-700">Secure environment is active</p>
                      {sebInfo && (
                        <p className="text-xs text-green-600 mt-1">
                          Version: {sebInfo.version} | Config Key: {sebInfo.configKey?.substring(0, 8)}...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mr-2 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-medium text-amber-800">Safe Exam Browser Recommended</h3>
                      <p className="text-sm text-amber-700 mb-3">
                        For maximum security, use Safe Exam Browser. Download the configuration file below.
                      </p>
                      <SEBConfigDownload courseId={courseId} examSessionId={examSession?.id} />
                    </div>
                  </div>
                </div>
              )}

              {/* Exam Info */}
              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-bold text-[#001e62] mb-4">Exam Information</h2>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Course:</span>
                    <span className="font-medium">{examSession?.courseName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Questions:</span>
                    <span className="font-medium">{examSession?.totalQuestions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{examSession?.duration} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Passing Score:</span>
                    <span className="font-medium">{examSession?.passingScore}%</span>
                  </div>
                </div>
              </div>

              {/* System Checks */}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-[#001e62] mb-6">System Requirements Check</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* SEB Check */}
                  <div className={`flex items-center p-4 rounded-lg border-2 ${
                    systemChecks.seb ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'
                  }`}>
                    <Shield className={`w-6 h-6 mr-3 ${systemChecks.seb ? 'text-green-600' : 'text-yellow-600'}`} />
                    <div className="flex-1">
                      <div className="font-medium">Safe Exam Browser</div>
                      <div className="text-sm text-gray-600">Recommended for security</div>
                    </div>
                    {systemChecks.seb ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    )}
                  </div>

                  {/* Camera Check - Only required if not using SEB */}
                  <div className={`flex items-center p-4 rounded-lg border-2 ${
                    systemChecks.camera || isSEB ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}>
                    <Camera className={`w-6 h-6 mr-3 ${systemChecks.camera || isSEB ? 'text-green-600' : 'text-red-600'}`} />
                    <div className="flex-1">
                      <div className="font-medium">Camera Access</div>
                      <div className="text-sm text-gray-600">
                        {isSEB ? 'Not required with SEB' : 'Required for proctoring'}
                      </div>
                    </div>
                    {systemChecks.camera || isSEB ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    )}
                  </div>

                  {/* Microphone Check - Only required if not using SEB */}
                  <div className={`flex items-center p-4 rounded-lg border-2 ${
                    systemChecks.microphone || isSEB ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}>
                    <Volume2 className={`w-6 h-6 mr-3 ${systemChecks.microphone || isSEB ? 'text-green-600' : 'text-red-600'}`} />
                    <div className="flex-1">
                      <div className="font-medium">Microphone Access</div>
                      <div className="text-sm text-gray-600">
                        {isSEB ? 'Not required with SEB' : 'Audio monitoring'}
                      </div>
                    </div>
                    {systemChecks.microphone || isSEB ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    )}
                  </div>

                  {/* Browser Check */}
                  <div className={`flex items-center p-4 rounded-lg border-2 ${
                    systemChecks.browser ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}>
                    <Monitor className={`w-6 h-6 mr-3 ${systemChecks.browser ? 'text-green-600' : 'text-red-600'}`} />
                    <div className="flex-1">
                      <div className="font-medium">Compatible Browser</div>
                      <div className="text-sm text-gray-600">Chrome recommended</div>
                    </div>
                    {systemChecks.browser ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    )}
                  </div>

                  {/* Connection Check */}
                  <div className={`flex items-center p-4 rounded-lg border-2 ${
                    systemChecks.connection ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}>
                    <Wifi className={`w-6 h-6 mr-3 ${systemChecks.connection ? 'text-green-600' : 'text-red-600'}`} />
                    <div className="flex-1">
                      <div className="font-medium">Internet Connection</div>
                      <div className="text-sm text-gray-600">Stable connection required</div>
                    </div>
                    {systemChecks.connection ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </div>
              </div>

              {/* Camera Preview - Only show if not using SEB and camera is available */}
              {systemChecks.camera && !isSEB && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-[#001e62] mb-4">Camera Preview</h3>
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-2 py-1 rounded text-sm flex items-center">
                      <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                      RECORDING
                    </div>
                  </div>
                </div>
              )}

              {/* Security Agreement */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-amber-800 mb-4 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Security Agreement
                </h3>
                <ul className="text-sm text-amber-700 space-y-2">
                  <li>• I understand this exam is monitored and recorded</li>
                  <li>• I will not use external resources or assistance</li>
                  <li>• I will remain in fullscreen mode throughout the exam (if not using SEB)</li>
                  <li>• I will not switch tabs or applications</li>
                  <li>• I understand violations may result in exam termination</li>
                </ul>
              </div>

              {/* Start Button */}
              <div className="text-center">
                <button
                  onClick={startExam}
                  disabled={!isSEB && !Object.values(systemChecks).every(check => check)}
                  className="px-8 py-4 bg-[#001e62] text-white rounded-lg text-lg font-semibold hover:bg-[#003a8c] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center mx-auto"
                >
                  <Lock className="w-5 h-5 mr-2" />
                  Begin Secure Exam
                </button>
                <p className="text-sm text-gray-500 mt-4">
                  {isSEB ? 'Safe Exam Browser detected - ready to start' : 'Ensure all checks pass before starting'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#001e62]">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Initializing secure exam environment...</p>
        </div>
      </div>
    )
  }

  const currentQ = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100
  const answeredCount = Object.keys(answers).length

  return (
    <div className="min-h-screen bg-[#001e62] text-white relative">
      {/* Security Alerts */}
      {!isSEB && !isFullscreen && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-3 text-center z-50 animate-pulse">
          <AlertTriangle className="w-5 h-5 inline mr-2" />
          SECURITY ALERT: Return to fullscreen mode immediately
        </div>
      )}

      {connectionStatus !== 'stable' && (
        <div className="fixed top-12 left-0 right-0 bg-yellow-600 text-white p-2 text-center z-40">
          <Wifi className="w-4 h-4 inline mr-2" />
          {connectionStatus === 'disconnected' ? 'Connection lost' : 'Unstable connection'}
        </div>
      )}

      {/* SEB Status Indicator */}
      {isSEB && (
        <div className="fixed top-0 left-0 right-0 bg-green-600 text-white p-2 text-center z-30">
          <Shield className="w-4 h-4 inline mr-2" />
          Safe Exam Browser Active
        </div>
      )}

      <div className="p-6" style={{ paddingTop: isSEB ? '3rem' : '1.5rem' }}>
        {/* Enhanced Header */}
        <div className="bg-white/10 backdrop-blur rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <Shield className="w-6 h-6 mr-3" />
                {examSession?.courseName}
              </h1>
              <p className="text-blue-200 mt-1">
                Question {currentQuestion + 1} of {questions.length} • 
                Progress: {Math.round(progress)}%
              </p>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-mono ${getTimeColor()}`}>
                {formatTime(timeRemaining)}
              </div>
              <div className="text-sm text-blue-200">Time Remaining</div>
            </div>
          </div>

          {/* Enhanced Progress Bar */}
          <div className="bg-white/20 rounded-full h-3 mb-4">
            <div 
              className="bg-gradient-to-r from-blue-400 to-white h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Status Indicators */}
          <div className="flex justify-between items-center text-sm">
            <div className="flex space-x-4">
              <span className="flex items-center">
                <Eye className="w-4 h-4 mr-1" />
                {isProctoring || isSEB ? 'Monitored' : 'Not Monitored'}
              </span>
              <span className="flex items-center">
                <Wifi className="w-4 h-4 mr-1" />
                {connectionStatus}
              </span>
              {isSEB && (
                <span className="flex items-center text-green-300">
                  <Shield className="w-4 h-4 mr-1" />
                  SEB Active
                </span>
              )}
            </div>
            <div className="flex space-x-4">
              <span>Answered: {answeredCount}/{questions.length}</span>
              {violations > 0 && (
                <span className="text-red-300 font-semibold">
                  Violations: {violations}/3
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Question Container */}
        <div className="bg-white/10 backdrop-blur rounded-lg p-8 mb-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-semibold leading-relaxed flex-1 pr-4">
              {currentQ.question}
            </h2>
            {currentQ.difficulty && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                currentQ.difficulty === 'easy' ? 'bg-green-500/20 text-green-300' :
                currentQ.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                'bg-red-500/20 text-red-300'
              }`}>
                {currentQ.difficulty.toUpperCase()}
              </span>
            )}
          </div>
          
          <div className="space-y-4">
            {currentQ.options.map((option, index) => (
              <label
                key={index}
                className={`block p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  answers[currentQ.id] === index
                    ? 'border-white bg-white/20 transform scale-[1.02]'
                    : 'border-white/30 hover:border-white/50 hover:bg-white/10'
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
                  <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-all ${
                    answers[currentQ.id] === index ? 'border-white bg-white' : 'border-white/50'
                  }`}>
                    {answers[currentQ.id] === index && (
                      <div className="w-3 h-3 rounded-full bg-[#001e62]" />
                    )}
                  </div>
                  <span className="text-lg">{option}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Enhanced Navigation */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={handlePreviousQuestion}
            disabled={currentQuestion === 0}
            className="px-6 py-3 bg-white/20 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/30 transition-colors"
          >
            Previous
          </button>

          {/* Question Grid Navigation */}
          <div className="flex-1 mx-8">
            <div className="text-center mb-2">
              <span className="text-blue-200 text-sm">Question Navigation</span>
            </div>
            <div className="flex justify-center space-x-1 flex-wrap">
              {questions.slice(0, Math.min(15, questions.length)).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestion(index)}
                  className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                    index === currentQuestion
                      ? 'bg-white text-[#001e62]'
                      : answers[questions[index].id] !== undefined
                      ? 'bg-green-500/30 text-white'
                      : 'bg-white/20 text-white/70 hover:bg-white/30'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
              {questions.length > 15 && (
                <span className="text-white/50 px-2 text-sm">+{questions.length - 15}</span>
              )}
            </div>
          </div>

          <div className="flex space-x-4">
            {currentQuestion === questions.length - 1 ? (
              <button
                onClick={() => handleSubmitExam('USER_SUBMIT')}
                disabled={isSubmitting}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                {isSubmitting ? 'Submitting...' : 'Submit Exam'}
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-6 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
              >
                Next
              </button>
            )}
          </div>
        </div>

        {/* Fixed Status Panels */}
        <div className="fixed bottom-6 left-6 bg-black/50 backdrop-blur text-white p-4 rounded-lg text-sm max-w-xs">
          <h4 className="font-semibold mb-2 flex items-center">
            <Shield className="w-4 h-4 mr-2" />
            Security Status
          </h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Environment:</span>
              <span className={isSEB ? 'text-green-400' : 'text-yellow-400'}>
                {isSEB ? 'SEB' : 'Browser'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Monitoring:</span>
              <span className={isProctoring || isSEB ? 'text-green-400' : 'text-red-400'}>
                {isProctoring || isSEB ? 'Active' : 'Inactive'}
              </span>
            </div>
            {!isSEB && (
              <div className="flex justify-between">
                <span>Fullscreen:</span>
                <span className={isFullscreen ? 'text-green-400' : 'text-red-400'}>
                  {isFullscreen ? 'Yes' : 'No'}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Violations:</span>
              <span className={violations > 0 ? 'text-red-400' : 'text-green-400'}>
                {violations}/3
              </span>
            </div>
          </div>
        </div>

        <div className="fixed bottom-6 right-6 bg-black/50 backdrop-blur text-white p-4 rounded-lg text-sm">
          <h4 className="font-semibold mb-2">Progress Summary</h4>
          <div className="space-y-1">
            <div>Answered: {answeredCount}/{questions.length}</div>
            <div>Remaining: {questions.length - answeredCount}</div>
            <div>Current: Question {currentQuestion + 1}</div>
          </div>
        </div>
      </div>
    </div>
  )
}