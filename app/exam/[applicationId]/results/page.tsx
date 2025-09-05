// app/certificate/exam/[applicationId]/results/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Award,
  CheckCircle,
  XCircle,
  Download,
  Share2,
  Home,
  RotateCcw,
  TrendingUp,
  Target,
  Clock,
  Shield,
  AlertTriangle
} from 'lucide-react'

interface ExamResults {
  score: number
  passed: boolean
  grade: string
  correctAnswers: number
  totalQuestions: number
  duration: number
  violations: number
  certificate?: {
    certificateNumber: string
    verificationCode: string
    downloadUrl: string
  }
  course: {
    title: string
    passingScore: number
  }
}

export default function ExamResultsPage({
  params
}: {
  params: { applicationId: string }
}) {
  const { data: session } = useSession()
  const router = useRouter()
  const [results, setResults] = useState<ExamResults | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchResults()
  }, [session, params.applicationId])

  const fetchResults = async () => {
    try {
      const response = await fetch(`/api/certificate/exam/${params.applicationId}/results`)
      if (response.ok) {
        const data = await response.json()
        setResults(data)
      }
    } catch (error) {
      console.error('Error fetching results:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading your exam results...</p>
        </div>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Card>
          <CardContent className="p-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Results Not Available</h2>
            <Button onClick={() => router.push('/certificate/dashboard')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          {results.passed ? (
            <div className="mb-6">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Congratulations!
              </h1>
              <p className="text-xl text-gray-600">
                You have successfully passed the certificate exam
              </p>
            </div>
          ) : (
            <div className="mb-6">
              <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Exam Not Passed
              </h1>
              <p className="text-xl text-gray-600">
                You need {results.course.passingScore}% to pass this exam
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Score Card */}
          <Card>
            <CardContent className="p-6 text-center">
              <div className={`text-4xl font-bold mb-2 ${results.passed ? 'text-green-600' : 'text-red-600'}`}>
                {results.score}%
              </div>
              <p className="text-gray-600">Your Score</p>
              <Badge className={`mt-2 ${getGradeColor(results.grade)}`}>
                Grade {results.grade}
              </Badge>
            </CardContent>
          </Card>

          {/* Questions Card */}
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {results.correctAnswers}/{results.totalQuestions}
              </div>
              <p className="text-gray-600">Correct Answers</p>
              <div className="mt-2 text-sm text-gray-500">
                {Math.round((results.correctAnswers / results.totalQuestions) * 100)}% accuracy
              </div>
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card>
            <CardContent className="p-6 text-center">
              <div className={`text-4xl font-bold mb-2 ${results.violations === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {results.violations}
              </div>
              <p className="text-gray-600">Security Violations</p>
              {results.violations === 0 ? (
                <Badge className="mt-2 bg-green-100 text-green-800">Clean Exam</Badge>
              ) : (
                <Badge className="mt-2 bg-red-100 text-red-800">Flagged</Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Course Details */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Exam Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">{results.course.title}</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Target className="w-4 h-4 mr-2" />
                    <span>Passing Score: {results.course.passingScore}%</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Duration: {Math.round(results.duration / 60)} minutes</span>
                  </div>
                  <div className="flex items-center">
                    <Shield className="w-4 h-4 mr-2" />
                    <span>Proctored Exam</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Performance Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Correct Answers:</span>
                    <span>{results.correctAnswers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Incorrect Answers:</span>
                    <span>{results.totalQuestions - results.correctAnswers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Accuracy Rate:</span>
                    <span>{Math.round((results.correctAnswers / results.totalQuestions) * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Certificate Section */}
        {results.passed && results.certificate && (
          <Card className="mb-8 border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center text-green-600">
                <Award className="w-6 h-6 mr-2" />
                Your Certificate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Certificate Number</p>
                    <p className="font-mono font-semibold">{results.certificate.certificateNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Verification Code</p>
                    <p className="font-mono font-semibold">{results.certificate.verificationCode}</p>
                  </div>
                </div>
                
                <div className="flex space-x-4">
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Download className="w-4 h-4 mr-2" />
                    Download Certificate
                  </Button>
                  <Button variant="outline">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Achievement
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="text-center space-y-4">
          <div className="flex justify-center space-x-4">
            <Button onClick={() => router.push('/certificate/dashboard')}>
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            
            {!results.passed && (
              <Button 
                variant="outline"
                onClick={() => router.push(`/certificate/course/${results.course.title}`)}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake Exam
              </Button>
            )}
          </div>

          {results.violations > 0 && (
            <div className="max-w-md mx-auto">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                  <span className="text-sm text-yellow-800">
                    Security violations were detected during your exam. This may affect certificate processing.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}