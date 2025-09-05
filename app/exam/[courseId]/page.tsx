// app/exam/[courseId]/page.tsx - Secure Exam Interface
'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Question {
  id: string
  question: string
  options: string[]
  order: number
}

export default function SecureExamPage({ params }: { params: { courseId: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session')
  
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [timeRemaining, setTimeRemaining] = useState(7200) // 2 hours in seconds
  const [examAttemptId, setExamAttemptId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [violations, setViolations] = useState(0)
  
  const timerRef = useRef<NodeJS.Timeout>()
  const monitoringRef = useRef<NodeJS.Timeout>()
  const questionStartTime = useRef<number>(Date.now())

  useEffect(() => {
    if (!session || !sessionId) {
      router.push('/auth/signin')
      return
    }

    initializeExam()
    setupSecurityMonitoring()
    enableFullscreen()

    return () => {
      cleanup()
    }
  }, [session, sessionId])

  useEffect(() => {
    // Timer countdown
    if (timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(prev => prev - 1)
      }, 1000)
    } else {
      handleSubmitExam()
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [timeRemaining])

  const initializeExam = async () => {
    try {
      // Get exam questions
      const questionsResponse = await fetch(`/api/exam/questions/${params.courseId}`)
      const questionsData = await questionsResponse.json()
      setQuestions(questionsData)

      // Set exam attempt ID from session storage or create new one
      const storedAttemptId = sessionStorage.getItem('examAttemptId')
      if (storedAttemptId) {
        setExamAttemptId(storedAttemptId)
      }
    } catch (error) {
      console.error('Error initializing exam:', error)
    }
  }

  const setupSecurityMonitoring = () => {
    // Monitor for security violations
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation('TAB_SWITCH', 'User switched away from exam tab')
      }
    }

    const handleBlur = () => {
      recordViolation('WINDOW_BLUR', 'Window lost focus')
    }

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        recordViolation('FULLSCREEN_EXIT', 'User exited fullscreen mode')
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent common cheating shortcuts
      if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'a' || e.key === 'f')) {
        e.preventDefault()
        recordViolation('COPY_PASTE_ATTEMPT', 'Attempted to use forbidden shortcuts')
      }
      
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault()
        recordViolation('DEV_TOOLS_ATTEMPT', 'Attempted to open developer tools')
      }
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      recordViolation('CONTEXT_MENU_ATTEMPT', 'Attempted to open context menu')
    }

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('contextmenu', handleContextMenu)

    // Periodic monitoring
    monitoringRef.current = setInterval(() => {
      checkSecurityStatus()
    }, 5000)

    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('contextmenu', handleContextMenu)
      if (monitoringRef.current) clearInterval(monitoringRef.current)
    }
  }

  const enableFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen()
    }
  }

  const recordViolation = async (type: string, details: string) => {
    setViolations(prev => prev + 1)
    
    try {
      await fetch('/api/exam/violation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          violation: { type, details },
        }),
      })

      if (violations >= 2) {
        alert('Multiple security violations detected. Exam will be terminated.')
        router.push('/exam/terminated')
      }
    } catch (error) {
      console.error('Error recording violation:', error)
    }
  }

  const checkSecurityStatus = async () => {
    try {
      const response = await fetch(`/api/exam/validate/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          browserData: {
            userAgent: navigator.userAgent,
            screen: { width: screen.width, height: screen.height },
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }),
      })

      if (!response.ok) {
        router.push('/exam/terminated')
      }
    } catch (error) {
      console.error('Security check failed:', error)
    }
  }

  const handleAnswerChange = async (questionId: string, selectedAnswer: number) => {
    const timeSpent = Math.round((Date.now() - questionStartTime.current) / 1000)
    
    setAnswers(prev => ({ ...prev, [questionId]: selectedAnswer }))

    // Submit answer immediately
    try {
      await fetch('/api/exam/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examAttemptId,
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

  const handleSubmitExam = async () => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/exam/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examAttemptId }),
      })

      if (response.ok) {
        const results = await response.json()
        sessionStorage.setItem('examResults', JSON.stringify(results))
        router.push('/exam/results')
      }
    } catch (error) {
      console.error('Error submitting exam:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const cleanup = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (monitoringRef.current) clearInterval(monitoringRef.current)
    sessionStorage.removeItem('examAttemptId')
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen()
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading secure exam environment...</p>
        </div>
      </div>
    )
  }

  const currentQ = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Secure Certification Exam</h1>
          <p className="text-gray-400">Question {currentQuestion + 1} of {questions.length}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono">{formatTime(timeRemaining)}</div>
          {violations > 0 && (
            <div className="text-red-400 text-sm">
              Security Violations: {violations}/3
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-700 rounded-full h-2 mb-6">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Question */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl mb-6">{currentQ.question}</h2>
        
        <div className="space-y-3">
          {currentQ.options.map((option, index) => (
            <label
              key={index}
              className={`block p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                answers[currentQ.id] === index
                  ? 'border-blue-500 bg-blue-900'
                  : 'border-gray-600 hover:border-gray-500'
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
              <span className="flex items-center">
                <span className="w-6 h-6 rounded-full border-2 border-gray-400 mr-3 flex items-center justify-center">
                  {answers[currentQ.id] === index && (
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  )}
                </span>
                {option}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={handlePreviousQuestion}
          disabled={currentQuestion === 0}
          className="px-6 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
        >
          Previous
        </button>

        <div className="flex space-x-4">
          {currentQuestion === questions.length - 1 ? (
            <button
              onClick={handleSubmitExam}
              disabled={isSubmitting}
              className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Exam'}
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Next
            </button>
          )}
        </div>
      </div>

      {/* Security Notice */}
      <div className="fixed bottom-4 right-4 bg-red-900 text-red-100 p-3 rounded-lg text-sm max-w-sm">
        <p className="font-semibold mb-1">Security Monitoring Active</p>
        <p>This exam is being monitored. Any suspicious activity will result in termination.</p>
      </div>
    </div>
  )
}