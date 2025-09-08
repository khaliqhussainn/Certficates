import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  Award, 
  Download, 
  Share2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  BarChart3,
  Target,
  Trophy,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  Calendar,
  User,
  BookOpen
} from 'lucide-react'

interface ExamResults {
  sessionId: string
  courseId: string
  courseName: string
  score: number
  passed: boolean
  totalQuestions: number
  correctAnswers: number
  timeSpent: number
  passingScore: number
  grade: string
  completedAt: string
  violations: any[]
  certificate?: {
    id: string
    certificateNumber: string
    verificationCode: string
    pdfPath?: string
    issuedAt: string
  }
}

interface QuestionBreakdown {
  questionId: string
  question: string
  selectedAnswer?: number
  correctAnswer: number
  isCorrect: boolean
  options: string[]
  explanation?: string
  timeSpent: number
}

export default function ExamResultsPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.sessionId as string
  
  const [results, setResults] = useState<ExamResults | null>(null)
  const [breakdown, setBreakdown] = useState<QuestionBreakdown[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [generatingCertificate, setGeneratingCertificate] = useState(false)

  useEffect(() => {
    if (sessionId) {
      loadResults()
    }
  }, [sessionId])

  const loadResults = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/exam/results/${sessionId}`)
      
      if (!response.ok) {
        throw new Error('Failed to load exam results')
      }

      const data = await response.json()
      setResults(data.results)
      
      if (data.breakdown) {
        setBreakdown(data.breakdown)
      }
    } catch (error) {
      console.error('Error loading results:', error)
      setError(error instanceof Error ? error.message : 'Failed to load results')
    } finally {
      setLoading(false)
    }
  }

  const downloadCertificate = async () => {
    if (!results?.certificate) return

    try {
      setGeneratingCertificate(true)
      const response = await fetch(`/api/certificate/download/${results.certificate.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to download certificate')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `certificate-${results.certificate.certificateNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading certificate:', error)
      alert('Failed to download certificate')
    } finally {
      setGeneratingCertificate(false)
    }
  }

  const shareCertificate = async () => {
    if (!results?.certificate) return

    const shareUrl = `${window.location.origin}/verify/${results.certificate.certificateNumber}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Certificate for ${results.courseName}`,
          text: `I've successfully completed ${results.courseName} with a score of ${results.score.toFixed(1)}%!`,
          url: shareUrl
        })
      } catch (error) {
        // Fallback to clipboard
        copyToClipboard(shareUrl)
      }
    } else {
      copyToClipboard(shareUrl)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Certificate verification link copied to clipboard!')
    }).catch(() => {
      alert('Failed to copy link')
    })
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-100'
      case 'B': return 'text-blue-600 bg-blue-100'
      case 'C': return 'text-yellow-600 bg-yellow-100'
      case 'D': return 'text-orange-600 bg-orange-100'
      default: return 'text-red-600 bg-red-100'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Loading your exam results...</p>
        </div>
      </div>
    )
  }

  if (error || !results) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Unable to Load Results</h2>
          <p className="text-gray-600 mb-6">{error || 'Exam results not found'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
        </div>

        {/* Results Header */}
        <div className={`rounded-2xl p-8 mb-8 ${
          results.passed 
            ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
            : 'bg-gradient-to-r from-red-500 to-pink-600'
        } text-white`}>
          <div className="text-center">
            {results.passed ? (
              <Trophy className="w-20 h-20 mx-auto mb-4 animate-bounce" />
            ) : (
              <XCircle className="w-20 h-20 mx-auto mb-4" />
            )}
            
            <h1 className="text-4xl font-bold mb-2">
              {results.passed ? 'Congratulations!' : 'Exam Not Passed'}
            </h1>
            
            <p className="text-xl opacity-90 mb-6">
              {results.passed 
                ? 'You have successfully passed the certification exam!' 
                : `You scored ${results.score.toFixed(1)}%. The passing score is ${results.passingScore}%.`
              }
            </p>

            <div className="flex justify-center items-center space-x-8">
              <div className="text-center">
                <div className="text-3xl font-bold">{results.score.toFixed(1)}%</div>
                <div className="text-sm opacity-75">Your Score</div>
              </div>
              
              <div className="text-center">
                <div className={`text-2xl font-bold px-4 py-2 rounded-full ${
                  results.passed ? 'bg-white/20' : 'bg-white/10'
                }`}>
                  {results.grade}
                </div>
                <div className="text-sm opacity-75">Grade</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold">{results.correctAnswers}/{results.totalQuestions}</div>
                <div className="text-sm opacity-75">Correct Answers</div>
              </div>
            </div>
          </div>
        </div>

        {/* Course Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <BookOpen className="w-5 h-5 mr-2" />
            Course Information
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Course Name</h3>
              <p className="text-gray-600">{results.courseName}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Completion Date</h3>
              <p className="text-gray-600 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {new Date(results.completedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Performance Statistics */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Time Spent</p>
                <p className="text-2xl font-bold text-gray-900">{results.timeSpent} min</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Accuracy</p>
                <p className="text-2xl font-bold text-gray-900">
                  {((results.correctAnswers / results.totalQuestions) * 100).toFixed(1)}%
                </p>
              </div>
              <Target className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Required Score</p>
                <p className="text-2xl font-bold text-gray-900">{results.passingScore}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Security Violations (if any) */}
        {results.violations && results.violations.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800">Security Violations Detected</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  {results.violations.length} security violation(s) were recorded during your exam.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Certificate Section */}
        {results.passed && results.certificate && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <Award className="w-8 h-8 text-blue-600 mr-3 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    Certificate Earned!
                  </h3>
                  <p className="text-blue-700 mb-4">
                    Your completion certificate is ready for download.
                  </p>
                  <div className="space-y-2 text-sm text-blue-600">
                    <p><strong>Certificate Number:</strong> {results.certificate.certificateNumber}</p>
                    <p><strong>Verification Code:</strong> {results.certificate.verificationCode}</p>
                    <p><strong>Issued:</strong> {new Date(results.certificate.issuedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={downloadCertificate}
                  disabled={generatingCertificate}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
                >
                  {generatingCertificate ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {generatingCertificate ? 'Generating...' : 'Download'}
                </button>
                
                <button
                  onClick={shareCertificate}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Question Breakdown */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Question Breakdown</h2>
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {showBreakdown ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          {showBreakdown && breakdown.length > 0 && (
            <div className="space-y-4">
              {breakdown.map((item, index) => (
                <div key={item.questionId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-medium">
                          Q{index + 1}
                        </span>
                        {item.isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span className="text-sm text-gray-500">
                          {item.timeSpent}s
                        </span>
                      </div>
                      <p className="text-gray-900 font-medium mb-3">{item.question}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {item.options.map((option, optIndex) => (
                      <div
                        key={optIndex}
                        className={`p-3 rounded text-sm border ${
                          optIndex === item.correctAnswer
                            ? 'bg-green-100 border-green-300 text-green-800'
                            : optIndex === item.selectedAnswer && !item.isCorrect
                            ? 'bg-red-100 border-red-300 text-red-800'
                            : optIndex === item.selectedAnswer
                            ? 'bg-blue-100 border-blue-300 text-blue-800'
                            : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="font-medium mr-2">
                            {String.fromCharCode(65 + optIndex)}.
                          </span>
                          {option}
                          {optIndex === item.correctAnswer && (
                            <CheckCircle2 className="w-4 h-4 ml-2 text-green-600" />
                          )}
                          {optIndex === item.selectedAnswer && optIndex !== item.correctAnswer && (
                            <XCircle className="w-4 h-4 ml-2 text-red-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {item.explanation && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm text-blue-800">
                        <strong>Explanation:</strong> {item.explanation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Next Steps */}
        <div className="mt-8 text-center">
          {results.passed ? (
            <div>
              <p className="text-gray-600 mb-4">
                Don't worry! You can retake the exam after reviewing the course materials. 
                Focus on the areas where you missed questions.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => router.push(`/courses/${results.courseId}`)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Review Course
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}