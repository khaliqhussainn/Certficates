// app/exam/results/[sessionId]/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { 
  CheckCircle2, 
  XCircle, 
  Download, 
  Share2, 
  RotateCcw,
  ArrowLeft,
  Award,
  Clock,
  Target,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'

interface ExamResult {
  id: string
  score: number
  passed: boolean
  totalQuestions: number
  correctAnswers: number
  timeSpent: number
  completedAt: string
  course: {
    id: string
    title: string
    passingScore: number
  }
  certificate?: {
    certificateNumber: string
    verificationCode: string
  }
  violations: any[]
}

export default function ExamResultsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const sessionId = params.sessionId as string
  
  const [result, setResult] = useState<ExamResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin')
      return
    }

    fetchExamResult()
  }, [session, sessionId])

  const fetchExamResult = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/exam/results/${sessionId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch exam results')
      }

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error fetching exam result:', error)
      setError('Failed to load exam results')
    } finally {
      setLoading(false)
    }
  }

  const downloadCertificate = async () => {
    if (!result?.certificate) return

    try {
      const response = await fetch(`/api/certificates/${result.certificate.certificateNumber}/download`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `certificate-${result.certificate.certificateNumber}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error downloading certificate:', error)
    }
  }

  const shareResult = () => {
    if (!result) return

    const shareText = `I just completed the ${result.course.title} certification exam with a score of ${result.score.toFixed(1)}%! ${result.passed ? '🎉' : ''}`
    const shareUrl = `${window.location.origin}/verify/${result.certificate?.verificationCode}`

    if (navigator.share) {
      navigator.share({
        title: 'Certification Achievement',
        text: shareText,
        url: result.certificate ? shareUrl : undefined
      })
    } else {
      navigator.clipboard.writeText(`${shareText}${result.certificate ? ` Verify at: ${shareUrl}` : ''}`)
      alert('Achievement copied to clipboard!')
    }
  }

  const retakeExam = () => {
    router.push(`/exam/${result?.course.id}`)
  }

  const getGradeColor = (score: number, passed: boolean) => {
    if (!passed) return 'text-red-500'
    if (score >= 90) return 'text-green-500'
    if (score >= 80) return 'text-blue-500'
    return 'text-yellow-500'
  }

  const getGradeLetter = (score: number) => {
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#001e62] border-t-transparent mx-auto"></div>
          <p className="mt-3 text-sm text-gray-600">Loading results...</p>
        </div>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Results Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'Unable to load exam results'}</p>
          
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-[#001e62] text-white py-2 px-4 rounded-lg hover:bg-[#001e62]/90 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Exam Results</h1>
          <p className="text-gray-600">{result.course.title}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Results Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          {/* Result Header */}
          <div className={`p-8 text-center ${
            result.passed 
              ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
              : 'bg-gradient-to-r from-red-500 to-rose-600'
          } text-white`}>
            {result.passed ? (
              <CheckCircle2 className="w-20 h-20 mx-auto mb-4" />
            ) : (
              <XCircle className="w-20 h-20 mx-auto mb-4" />
            )}
            
            <h2 className="text-3xl font-bold mb-2">
              {result.passed ? 'Congratulations!' : 'Not Passed'}
            </h2>
            
            <p className="text-xl opacity-90">
              {result.passed 
                ? 'You have successfully passed the certification exam!' 
                : 'You did not meet the passing requirements this time.'
              }
            </p>

            {result.violations && result.violations.length > 0 && (
              <div className="mt-4 bg-white/20 rounded-lg p-4">
                <AlertTriangle className="w-5 h-5 inline mr-2" />
                <span className="text-sm">
                  {result.violations.length} security violation(s) detected during exam
                </span>
              </div>
            )}
          </div>

          {/* Score Details */}
          <div className="p-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="text-center">
                <div className={`text-4xl font-bold mb-2 ${getGradeColor(result.score, result.passed)}`}>
                  {result.score.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Your Score</div>
                <div className={`text-lg font-semibold ${getGradeColor(result.score, result.passed)}`}>
                  Grade: {getGradeLetter(result.score)}
                </div>
              </div>

              <div className="text-center">
                <div className="text-4xl font-bold mb-2 text-gray-700">
                  {result.correctAnswers}/{result.totalQuestions}
                </div>
                <div className="text-sm text-gray-600">Correct Answers</div>
              </div>

              <div className="text-center">
                <div className="text-4xl font-bold mb-2 text-gray-700">
                  {result.course.passingScore}%
                </div>
                <div className="text-sm text-gray-600">Passing Score</div>
              </div>

              <div className="text-center">
                <div className="text-4xl font-bold mb-2 text-gray-700">
                  {Math.round(result.timeSpent || 0)}m
                </div>
                <div className="text-sm text-gray-600">Time Spent</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Score Progress</span>
                <span className="text-sm text-gray-500">{result.score.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className={`h-4 rounded-full transition-all duration-1000 ${
                    result.passed ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(result.score, 100)}%` }}
                />
                {/* Passing Score Marker */}
                <div 
                  className="relative"
                  style={{ marginTop: '-16px', marginLeft: `${result.course.passingScore}%` }}
                >
                  <div className="w-0.5 h-4 bg-gray-600"></div>
                  <div className="text-xs text-gray-600 mt-1 -ml-4">Pass</div>
                </div>
              </div>
            </div>

            {/* Certificate Section */}
            {result.passed && result.certificate && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6 mb-8">
                <div className="flex items-center mb-4">
                  <Award className="w-8 h-8 text-yellow-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-800">Certificate Earned!</h3>
                    <p className="text-sm text-yellow-700">
                      Certificate #{result.certificate.certificateNumber}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-4">
                  <button
                    onClick={downloadCertificate}
                    className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Certificate
                  </button>
                  
                  <button
                    onClick={() => router.push(`/verify/${result.certificate?.verificationCode}`)}
                    className="flex items-center px-4 py-2 bg-white text-yellow-600 border border-yellow-600 rounded-lg hover:bg-yellow-50 transition-colors"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Verify Certificate
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={shareResult}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Achievement
              </button>

              {!result.passed && (
                <button
                  onClick={retakeExam}
                  className="flex items-center px-6 py-3 bg-[#001e62] text-white rounded-lg hover:bg-[#001e62]/90 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retake Exam
                </button>
              )}

              <button
                onClick={() => router.push(`/courses/${result.course.id}`)}
                className="flex items-center px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Course
              </button>
            </div>
          </div>
        </div>

        {/* Exam Details */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Details</h3>
          
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Completed At:</span>
                <span className="font-medium">
                  {new Date(result.completedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Total Questions:</span>
                <span className="font-medium">{result.totalQuestions}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Correct Answers:</span>
                <span className="font-medium">{result.correctAnswers}</span>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Time Spent:</span>
                <span className="font-medium">{Math.round(result.timeSpent || 0)} minutes</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Passing Score:</span>
                <span className="font-medium">{result.course.passingScore}%</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Result:</span>
                <span className={`font-medium ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                  {result.passed ? 'PASSED' : 'NOT PASSED'}
                </span>
              </div>
            </div>
          </div>

          {result.certificate && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">Certificate Information</h4>
              <div className="text-sm text-gray-600">
                <p>Certificate Number: <span className="font-mono">{result.certificate.certificateNumber}</span></p>
                <p>Verification Code: <span className="font-mono">{result.certificate.verificationCode}</span></p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}