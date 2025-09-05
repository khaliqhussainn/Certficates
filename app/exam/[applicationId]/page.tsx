'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Shield,
  Clock,
  AlertTriangle,
  Eye,
  EyeOff,
  Camera,
  Mic,
  MicOff,
  Monitor,
  Lock,
  CheckCircle,
  XCircle,
  Flag,
  ArrowLeft,
  ArrowRight,
  Save,
  AlertCircle,
  Loader2,
  Activity
} from 'lucide-react'

interface ExamQuestion {
  id: string
  question: string
  options: string[]
  category?: string
  difficulty: string
  points: number
}

interface ExamSession {
  id: string
  applicationId: string
  courseId: string
  courseName: string
  duration: number
  totalQuestions: number
  passingScore: number
  status: string
  startedAt?: string
  questions: ExamQuestion[]
}

interface ExamResponse {
  questionId: string
  selectedAnswer?: number
  flaggedForReview: boolean
  timeSpent: number
}

interface SecurityMonitor {
  webcamEnabled: boolean
  microphoneEnabled: boolean
  screenRecording: boolean
  fullscreenActive: boolean
  violations: string[]
  suspiciousActivity: number
}

export default function SecureExamSystem({ 
  params 
}: { 
  params: { applicationId: string } 
}) {
  const { data: session } = useSession()
  const router = useRouter()
  
  // Exam state
  const [examSession, setExamSession] = useState<ExamSession | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [responses, setResponses] = useState<Map<string, ExamResponse>>(new Map())
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [examStarted, setExamStarted] = useState(false)
  const [examCompleted, setExamCompleted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Security state
  const [securityMonitor, setSecurityMonitor] = useState<SecurityMonitor>({
    webcamEnabled: false,
    microphoneEnabled: false,
    screenRecording: false,
    fullscreenActive: false,
    violations: [],
    suspiciousActivity: 0
  })
  
  // Proctoring elements
  const webcamRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunks = useRef<Blob[]>([])
  
  // Timer ref
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<Date | null>(null)
  const questionStartTimeRef = useRef<Date>(new Date())

  useEffect(() => {
    if (!session?.user?.id) {
      router.push('/auth/signin')
      return
    }
    
    initializeExam()
    setupSecurityMonitoring()
    
    return () => {
      cleanup()
    }
  }, [session, params.applicationId])

  const initializeExam = async () => {
    try {
      const response = await fetch(`/api/certificate/exam/${params.applicationId}`)
      if (response.ok) {
        const data = await response.json()
        setExamSession(data)
        setTimeRemaining(data.duration * 60) // Convert minutes to seconds
        
        // Initialize responses map
        const initialResponses = new Map<string, ExamResponse>()
        data.questions.forEach((q: ExamQuestion) => {
          initialResponses.set(q.id, {
            questionId: q.id,
            selectedAnswer: undefined,
            flaggedForReview: false,
            timeSpent: 0
          })
        })
        setResponses(initialResponses)
      } else {
        router.push('/certificate/dashboard')
      }
    } catch (error) {
      console.error('Failed to initialize exam:', error)
      router.push('/certificate/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const setupSecurityMonitoring = async () => {
    try {
      // Request fullscreen
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
        setSecurityMonitor(prev => ({ ...prev, fullscreenActive: true }))
      }

      // Setup webcam
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      })

      if (webcamRef.current) {
        webcamRef.current.srcObject = stream
        setSecurityMonitor(prev => ({ 
          ...prev, 
          webcamEnabled: true,
          microphoneEnabled: true 
        }))
      }

      // Setup screen recording
      setupScreenRecording()
      
      // Setup event listeners for security violations
      setupSecurityEventListeners()
      
    } catch (error) {
      console.error('Security setup failed:', error)
      addSecurityViolation('Failed to enable security monitoring')
    }
  }

  const setupScreenRecording = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true
      })

      const mediaRecorder = new MediaRecorder(displayStream, {
        mimeType: 'video/webm;codecs=vp9'
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunks.current.push(event.data)
        }
      }

      mediaRecorderRef.current = mediaRecorder
      setSecurityMonitor(prev => ({ ...prev, screenRecording: true }))
      
    } catch (error) {
      console.error('Screen recording setup failed:', error)
    }
  }

  const setupSecurityEventListeners = () => {
    // Fullscreen exit detection
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) {
        addSecurityViolation('Exited fullscreen mode')
        setSecurityMonitor(prev => ({ ...prev, fullscreenActive: false }))
      }
    })

    // Window blur/focus detection
    window.addEventListener('blur', () => {
      addSecurityViolation('Window lost focus - possible tab switching')
    })

    // Copy/paste prevention
    document.addEventListener('copy', (e) => {
      e.preventDefault()
      addSecurityViolation('Attempted to copy content')
    })

    document.addEventListener('paste', (e) => {
      e.preventDefault()
      addSecurityViolation('Attempted to paste content')
    })

    // Right-click prevention
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      addSecurityViolation('Attempted right-click')
    })

    // Keyboard shortcuts prevention
    document.addEventListener('keydown', (e) => {
      // Prevent common shortcuts
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'a' || e.key === 't' || e.key === 'w')) ||
        (e.altKey && e.key === 'Tab') ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I')
      ) {
        e.preventDefault()
        addSecurityViolation(`Blocked keyboard shortcut: ${e.key}`)
      }
    })

    // Print prevention
    window.addEventListener('beforeprint', (e) => {
      e.preventDefault()
      addSecurityViolation('Attempted to print page')
    })
  }

  const addSecurityViolation = useCallback((violation: string) => {
    setSecurityMonitor(prev => ({
      ...prev,
      violations: [...prev.violations, violation],
      suspiciousActivity: prev.suspiciousActivity + 1
    }))

    // Auto-submit if too many violations
    if (securityMonitor.suspiciousActivity >= 5) {
      handleSubmitExam(true) // Force submit due to violations
    }
  }, [securityMonitor.suspiciousActivity])

  const startExam = async () => {
    if (!examSession) return

    try {
      const response = await fetch(`/api/certificate/exam/${params.applicationId}/start`, {
        method: 'POST'
      })

      if (response.ok) {
        setExamStarted(true)
        startTimeRef.current = new Date()
        
        // Start timer
        timerRef.current = setInterval(() => {
          setTimeRemaining(prev => {
            if (prev <= 1) {
              handleSubmitExam(true) // Auto-submit when time is up
              return 0
            }
            return prev - 1
          })
        }, 1000)

        // Start screen recording
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.start(5000) // Record in 5-second chunks
        }
      }
    } catch (error) {
      console.error('Failed to start exam:', error)
    }
  }

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    const now = new Date()
    const timeSpent = questionStartTimeRef.current ? 
      Math.round((now.getTime() - questionStartTimeRef.current.getTime()) / 1000) : 0

    setResponses(prev => {
      const newMap = new Map(prev)
      const currentResponse = newMap.get(questionId) || {
        questionId,
        selectedAnswer: undefined,
        flaggedForReview: false,
        timeSpent: 0
      }
      
      newMap.set(questionId, {
        ...currentResponse,
        selectedAnswer: answerIndex,
        timeSpent: timeSpent
      })
      
      return newMap
    })
  }

  const toggleFlag = (questionId: string) => {
    setResponses(prev => {
      const newMap = new Map(prev)
      const currentResponse = newMap.get(questionId)
      if (currentResponse) {
        newMap.set(questionId, {
          ...currentResponse,
          flaggedForReview: !currentResponse.flaggedForReview
        })
      }
      return newMap
    })
  }

  const navigateQuestion = (direction: 'prev' | 'next' | number) => {
    if (!examSession) return
    
    let newIndex: number
    if (typeof direction === 'number') {
      newIndex = direction
    } else {
      newIndex = direction === 'next' 
        ? Math.min(currentQuestionIndex + 1, examSession.questions.length - 1)
        : Math.max(currentQuestionIndex - 1, 0)
    }
    
    setCurrentQuestionIndex(newIndex)
    questionStartTimeRef.current = new Date()
  }

  const saveProgress = async () => {
    if (!examSession) return

    try {
      const responsesArray = Array.from(responses.values())
      await fetch(`/api/certificate/exam/${params.applicationId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses: responsesArray,
          securityViolations: securityMonitor.violations
        })
      })
    } catch (error) {
      console.error('Failed to save progress:', error)
    }
  }

  const handleSubmitExam = async (forced = false) => {
    if (!examSession || submitting) return

    setSubmitting(true)

    try {
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }

      const endTime = new Date()
      const actualDuration = startTimeRef.current ? 
        Math.round((endTime.getTime() - startTimeRef.current.getTime()) / 1000 / 60) : 0

      const responsesArray = Array.from(responses.values())
      
      const response = await fetch(`/api/certificate/exam/${params.applicationId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses: responsesArray,
          actualDuration,
          forced,
          securityViolations: securityMonitor.violations,
          suspiciousActivityCount: securityMonitor.suspiciousActivity
        })
      })

      if (response.ok) {
        const result = await response.json()
        setExamCompleted(true)
        
        // Redirect to results page
        setTimeout(() => {
          router.push(`/certificate/exam/${params.applicationId}/results`)
        }, 3000)
      }
    } catch (error) {
      console.error('Failed to submit exam:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
    }

    // Stop webcam
    if (webcamRef.current?.srcObject) {
      const stream = webcamRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
    }

    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen()
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Initializing secure exam environment...</p>
        </div>
      </div>
    )
  }

  if (!examSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Exam Not Found</h2>
            <p className="text-gray-600 mb-4">
              The exam session could not be loaded or has expired.
            </p>
            <Button onClick={() => router.push('/certificate/dashboard')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (examCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Exam Submitted Successfully</h2>
            <p className="text-gray-600 mb-4">
              Your exam has been submitted and is being processed. Results will be available shortly.
            </p>
            <div className="animate-pulse">
              <p className="text-sm text-gray-500">Redirecting to results...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!examStarted) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-2xl text-center text-white">
                {examSession.courseName} - Certificate Exam
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Security Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-blue-400" />
                    Security Status
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Camera className={`w-4 h-4 mr-2 ${securityMonitor.webcamEnabled ? 'text-green-400' : 'text-red-400'}`} />
                      <span className="text-sm">
                        Webcam: {securityMonitor.webcamEnabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Mic className={`w-4 h-4 mr-2 ${securityMonitor.microphoneEnabled ? 'text-green-400' : 'text-red-400'}`} />
                      <span className="text-sm">
                        Microphone: {securityMonitor.microphoneEnabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Monitor className={`w-4 h-4 mr-2 ${securityMonitor.fullscreenActive ? 'text-green-400' : 'text-red-400'}`} />
                      <span className="text-sm">
                        Fullscreen: {securityMonitor.fullscreenActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Activity className={`w-4 h-4 mr-2 ${securityMonitor.screenRecording ? 'text-green-400' : 'text-red-400'}`} />
                      <span className="text-sm">
                        Screen Recording: {securityMonitor.screenRecording ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Exam Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Duration:</strong> {examSession.duration} minutes</p>
                    <p><strong>Questions:</strong> {examSession.totalQuestions}</p>
                    <p><strong>Passing Score:</strong> {examSession.passingScore}%</p>
                    <p><strong>Security Level:</strong> High (Proctored)</p>
                  </div>
                </div>
              </div>

              {/* Webcam Preview */}
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">Webcam Preview</h3>
                <div className="relative inline-block">
                  <video
                    ref={webcamRef}
                    autoPlay
                    muted
                    className="w-64 h-48 bg-gray-700 rounded-lg"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  {securityMonitor.webcamEnabled && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
                      RECORDING
                    </div>
                  )}
                </div>
              </div>

              {/* Important Instructions */}
              <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-yellow-400" />
                  Important Exam Rules
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>• You must remain in fullscreen mode throughout the exam</li>
                  <li>• Your webcam and microphone will be monitored</li>
                  <li>• Screen recording is active for security purposes</li>
                  <li>• Do not switch tabs, applications, or exit fullscreen</li>
                  <li>• No copy/paste, right-click, or keyboard shortcuts allowed</li>
                  <li>• You have {examSession.duration} minutes to complete {examSession.totalQuestions} questions</li>
                  <li>• The exam will auto-submit when time expires</li>
                  <li>• Excessive security violations will result in automatic submission</li>
                </ul>
              </div>

              {/* Start Button */}
              <div className="text-center">
                <Button
                  onClick={startExam}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={!securityMonitor.webcamEnabled || !securityMonitor.fullscreenActive}
                >
                  <Shield className="w-5 h-5 mr-2" />
                  Start Secure Exam
                </Button>
                {(!securityMonitor.webcamEnabled || !securityMonitor.fullscreenActive) && (
                  <p className="text-sm text-red-400 mt-2">
                    Please enable webcam and fullscreen mode to start the exam
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Main Exam Interface
  const currentQuestion = examSession.questions[currentQuestionIndex]
  const currentResponse = responses.get(currentQuestion.id)
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Security Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <Shield className="w-5 h-5 text-green-400 mr-2" />
              <span className="text-sm font-medium">SECURE EXAM MODE</span>
            </div>
            
            <div className="flex items-center">
              <Clock className="w-4 h-4 text-blue-400 mr-2" />
              <span className={`text-sm font-mono ${timeRemaining < 300 ? 'text-red-400' : 'text-green-400'}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            
            <div className="flex items-center">
              <Eye className="w-4 h-4 text-green-400 mr-2" />
              <span className="text-sm">Monitoring Active</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              onClick={saveProgress}
              variant="outline"
              size="sm"
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
            
            <Badge className="bg-red-900 text-red-200">
              Violations: {securityMonitor.violations.length}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-12 gap-6">
        {/* Question Panel */}
        <div className="col-span-9">
          <Card className="bg-gray-800 border-gray-700 min-h-96">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">
                  Question {currentQuestionIndex + 1} of {examSession.questions.length}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge className={`
                    ${currentQuestion.difficulty === 'easy' ? 'bg-green-900 text-green-200' : 
                      currentQuestion.difficulty === 'medium' ? 'bg-yellow-900 text-yellow-200' : 
                      'bg-red-900 text-red-200'}
                  `}>
                    {currentQuestion.difficulty}
                  </Badge>
                  <Badge className="bg-blue-900 text-blue-200">
                    {currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Question Text */}
              <div className="text-lg leading-relaxed">
                {currentQuestion.question}
              </div>

              {/* Answer Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <label
                    key={index}
                    className={`
                      flex items-start p-4 rounded-lg border-2 cursor-pointer transition-colors
                      ${currentResponse?.selectedAnswer === index 
                        ? 'border-blue-500 bg-blue-900 bg-opacity-30' 
                        : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={index}
                      checked={currentResponse?.selectedAnswer === index}
                      onChange={() => handleAnswerSelect(currentQuestion.id, index)}
                      className="mt-1 mr-3 text-blue-500"
                    />
                    <span className="flex-1">{option}</span>
                  </label>
                ))}
              </div>

              {/* Question Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-600">
                <Button
                  onClick={() => toggleFlag(currentQuestion.id)}
                  variant="outline"
                  size="sm"
                  className={currentResponse?.flaggedForReview ? 'bg-yellow-900 border-yellow-600' : ''}
                >
                  <Flag className="w-4 h-4 mr-2" />
                  {currentResponse?.flaggedForReview ? 'Unflag' : 'Flag for Review'}
                </Button>

                <div className="flex space-x-2">
                  <Button
                    onClick={() => navigateQuestion('prev')}
                    variant="outline"
                    disabled={currentQuestionIndex === 0}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  
                  {currentQuestionIndex === examSession.questions.length - 1 ? (
                    <Button
                      onClick={() => handleSubmitExam(false)}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Submit Exam
                    </Button>
                  ) : (
                    <Button
                      onClick={() => navigateQuestion('next')}
                      variant="outline"
                    >
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="col-span-3 space-y-4">
          {/* Progress Overview */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-sm text-white">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Answered:</span>
                  <span>{Array.from(responses.values()).filter(r => r.selectedAnswer !== undefined).length}/{examSession.questions.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Flagged:</span>
                  <span>{Array.from(responses.values()).filter(r => r.flaggedForReview).length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Question Navigator */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-sm text-white">Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-1">
                {examSession.questions.map((_, index) => {
                  const response = responses.get(examSession.questions[index].id)
                  const isAnswered = response?.selectedAnswer !== undefined
                  const isFlagged = response?.flaggedForReview || false
                  const isCurrent = index === currentQuestionIndex
                  
                  return (
                    <button
                      key={index}
                      onClick={() => navigateQuestion(index)}
                      className={`
                        w-8 h-8 text-xs rounded border-2 transition-colors
                        ${isCurrent ? 'border-blue-500 bg-blue-600' :
                          isAnswered ? 'border-green-500 bg-green-600' :
                          isFlagged ? 'border-yellow-500 bg-yellow-600' :
                          'border-gray-500 bg-gray-600 hover:bg-gray-500'
                        }
                      `}
                    >
                      {index + 1}
                    </button>
                  )
                })}
              </div>
              
              <div className="mt-4 space-y-1 text-xs">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-600 rounded mr-2"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-600 rounded mr-2"></div>
                  <span>Flagged</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-600 rounded mr-2"></div>
                  <span>Current</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-600 rounded mr-2"></div>
                  <span>Not answered</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Monitor */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-sm text-white flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Security Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {securityMonitor.violations.length > 0 && (
                  <div className="text-xs">
                    <div className="text-red-400 mb-1">Recent Violations:</div>
                    <div className="max-h-20 overflow-y-auto space-y-1">
                      {securityMonitor.violations.slice(-3).map((violation, index) => (
                        <div key={index} className="text-xs text-red-300">
                          • {violation}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-gray-400">
                  Total violations: {securityMonitor.violations.length}
                </div>
                
                {securityMonitor.violations.length >= 3 && (
                  <div className="text-xs text-yellow-400">
                    ⚠️ High violation count detected
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Webcam Monitor */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-sm text-white">Monitor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <video
                  ref={webcamRef}
                  autoPlay
                  muted
                  className="w-full rounded bg-gray-700"
                />
                <div className="absolute top-1 right-1 bg-red-500 text-white px-1 text-xs rounded">
                  REC
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Warning Modal for Multiple Violations */}
      {securityMonitor.violations.length >= 5 && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <Card className="max-w-md bg-red-900 border-red-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <AlertCircle className="w-6 h-6 mr-2" />
                Security Alert
              </CardTitle>
            </CardHeader>
            <CardContent className="text-white">
              <p className="mb-4">
                Multiple security violations detected. Your exam will be submitted automatically.
              </p>
              <div className="text-center">
                <Button 
                  onClick={() => handleSubmitExam(true)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Submit Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}