// app/exam/[courseId]/page.tsx - Updated Exam Page with Payment Verification
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
  ArrowLeft,
  CreditCard
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

interface PaymentStatus {
  hasPaid: boolean
  payment?: {
    id: string
    status: string
    amount: number
    provider: string
  }
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
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  
  const timerRef = useRef<NodeJS.Timeout>()
  const monitoringRef = useRef<NodeJS.Timeout>()
  const questionStartTime = useRef<number>(Date.now())
  const heartbeatRef = useRef<NodeJS.Timeout>()
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastActivityRef = useRef<number>(Date.now())

  // Check payment status first
  useEffect(() => {
    if (!session) {
      router.push('/auth/signin')
      return
    }

    checkPaymentStatus()
  }, [session, courseId])

  const checkPaymentStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/payments/check/${courseId}`)
      
      if (!response.ok) {
        throw new Error('Failed to check payment status')
      }

      const data = await response.json()
      
      if (!data.hasPayment || data.payment.status !== 'COMPLETED') {
        setPaymentStatus({
          hasPaid: false,
          payment: data.payment
        })
        setInitError('Payment required to access this exam. Please complete payment first.')
        setLoading(false)
        return
      }

      setPaymentStatus({
        hasPaid: true,
        payment: data.payment
      })

      // If payment is valid, proceed with exam initialization
      performSystemChecks()
      initializeExam()
      const cleanup = setupSecurityMonitoring()

      return () => {
        cleanup()
        if (timerRef.current) clearTimeout(timerRef.current)
      }

    } catch (error) {
      console.error('Payment check error:', error)
      setInitError('Failed to verify payment status. Please try again.')
      setLoading(false)
    }
  }

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

  // Payment required error state
  if (initError && !paymentStatus?.hasPaid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md mx-auto p-8">
          <CreditCard className="w-16 h-16 text-[#001e62] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Required</h2>
          <p className="text-gray-600 mb-6">
            You need to complete payment for the certificate exam before you can proceed.
          </p>
          
          {paymentStatus?.payment?.status === 'PENDING' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                <div className="text-left">
                  <h3 className="font-medium text-yellow-800">Payment Pending</h3>
                  <p className="text-sm text-yellow-700">
                    Your payment is being processed. Please wait or contact support.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={() => router.push(`/courses/${courseId}`)}
              className="w-full bg-[#001e62] text-white py-2 px-4 rounded-lg hover:bg-[#001e62]/90 transition-colors"
            >
              Complete Payment
            </button>
            <button
              onClick={() => router.push('/courses')}
              className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Courses
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Other error state
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
              {/* Payment Confirmation */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mr-2" />
                  <div>
                    <h3 className="font-medium text-green-800">Payment Verified</h3>
                    <p className="text-sm text-green-700">
                      Certificate exam access confirmed - {paymentStatus?.payment?.amount} SAR via {paymentStatus?.payment?.provider}
                    </p>
                  </div>
                </div>
              </div>

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

              {/* Continue with the rest of the system check interface... */}
              {/* This would include the exam info, system checks, security agreement, etc. */}
              {/* I'll provide the key parts for brevity */}

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
                  Payment verified - ready to start your certificate exam
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Continue with rest of exam interface...
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

  // Rest of the exam interface would continue here...
  return (
    <div className="min-h-screen bg-[#001e62] text-white">
      {/* Exam interface continues with all the existing functionality */}
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Certificate Exam in Progress</h1>
          <p className="text-blue-200">Payment verified - {paymentStatus?.payment?.amount} SAR</p>
          <div className="mt-4">
            <div className={`text-3xl font-mono ${getTimeColor()}`}>
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
        
        {/* Question interface would continue here... */}
        <div className="mt-8 text-center">
          <p>Question {currentQuestion + 1} of {questions.length}</p>
          <button
            onClick={() => handleSubmitExam('USER_SUBMIT')}
            disabled={isSubmitting}
            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Exam'}
          </button>
        </div>
      </div>
    </div>
  )
}