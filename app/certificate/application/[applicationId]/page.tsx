// app/certificate/application/[applicationId]/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Target,
  Shield,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Award,
  Play,
  Download,
  RefreshCw,
  Loader2,
  Camera,
  Monitor,
  Mic
} from 'lucide-react'

interface ExamApplication {
  id: string
  courseId: string
  courseName: string
  courseTitle: string
  status: string
  paymentStatus: string
  amountPaid: number
  currency: string
  scheduledAt?: string
  createdAt: string
  examDuration: number
  totalQuestions: number
  passingScore: number
  examSession?: {
    id: string
    status: string
    startedAt?: string
    endedAt?: string
    score?: number
    passed?: boolean
    violations: number
  }
}

export default function ExamApplicationPage({
  params
}: {
  params: { applicationId: string }
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [application, setApplication] = useState<ExamApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [systemCheck, setSystemCheck] = useState({
    webcam: false,
    microphone: false,
    fullscreen: false,
    browser: false
  })

  useEffect(() => {
    if (status === 'loading') return
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    
    fetchApplication()
    performSystemCheck()
  }, [status, params.applicationId])

  const fetchApplication = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/certificate/application/${params.applicationId}`)
      
      if (response.ok) {
        const data = await response.json()
        setApplication(data)
      } else if (response.status === 404) {
        setError('Application not found')
      } else {
        setError('Failed to load application details')
      }
    } catch (error) {
      console.error('Error fetching application:', error)
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const performSystemCheck = async () => {
    try {
      // Check webcam and microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      
      setSystemCheck(prev => ({
        ...prev,
        webcam: true,
        microphone: true
      }))
      
      // Stop the stream after check
      stream.getTracks().forEach(track => track.stop())
      
      // Check browser compatibility
      setSystemCheck(prev => ({
        ...prev,
        browser: !!document.requestFullscreen,
        fullscreen: true
      }))
      
    } catch (error) {
      console.error('System check failed:', error)
    }
  }

  const scheduleExam = async () => {
    try {
      const response = await fetch(`/api/certificate/application/${params.applicationId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledAt: new Date().toISOString() // Schedule for now
        })
      })
      
      if (response.ok) {
        await fetchApplication()
      } else {
        setError('Failed to schedule exam')
      }
    } catch (error) {
      setError('Network error occurred')
    }
  }

  const startExam = () => {
    if (application) {
      router.push(`/certificate/exam/${application.id}`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'payment_confirmed': return 'bg-purple-100 text-purple-800'
      case 'pending_payment': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading application details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <div className="flex space-x-2 justify-center">
                <Button onClick={() => router.push('/certificate/dashboard')}>
                  Back to Dashboard
                </Button>
                <Button variant="outline" onClick={fetchApplication}>
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!application) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/certificate/dashboard"
              className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </Link>
            
            <div className="flex items-center space-x-4">
              <Badge className={getStatusColor(application.status)}>
                {application.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Application Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="w-6 h-6 mr-2 text-blue-600" />
                Certificate Exam Application
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">{application.courseTitle}</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Application ID:</strong> {application.id}</p>
                    <p><strong>Applied:</strong> {new Date(application.createdAt).toLocaleDateString()}</p>
                    <p><strong>Payment:</strong> ${application.amountPaid} {application.currency}</p>
                    <p>
                      <strong>Payment Status:</strong> 
                      <Badge className="ml-2 bg-green-100 text-green-800">
                        {application.paymentStatus}
                      </Badge>
                    </p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Exam Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-gray-500" />
                      <span>Duration: {application.examDuration} minutes</span>
                    </div>
                    <div className="flex items-center">
                      <Target className="w-4 h-4 mr-2 text-gray-500" />
                      <span>Questions: {application.totalQuestions}</span>
                    </div>
                    <div className="flex items-center">
                      <Award className="w-4 h-4 mr-2 text-gray-500" />
                      <span>Passing Score: {application.passingScore}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exam Results (if completed) */}
          {application.examSession && application.examSession.status === 'COMPLETED' && (
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="w-6 h-6 mr-2 text-green-600" />
                  Exam Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">
                      {application.examSession.score}%
                    </div>
                    <div className="text-sm text-gray-600">Your Score</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className={`text-3xl font-bold ${application.examSession.passed ? 'text-green-600' : 'text-red-600'}`}>
                      {application.examSession.passed ? 'PASSED' : 'FAILED'}
                    </div>
                    <div className="text-sm text-gray-600">Result</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600">
                      {application.examSession.violations}
                    </div>
                    <div className="text-sm text-gray-600">Violations</div>
                  </div>
                </div>
                
                {application.examSession.passed && (
                  <div className="mt-4 text-center">
                    <Button className="mr-2">
                      <Download className="w-4 h-4 mr-2" />
                      Download Certificate
                    </Button>
                    <Button variant="outline">
                      View Certificate
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* System Requirements Check */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-6 h-6 mr-2 text-red-600" />
                System Requirements Check
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <Camera className="w-4 h-4 mr-2" />
                      <span>Webcam Access</span>
                    </div>
                    {systemCheck.webcam ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <Mic className="w-4 h-4 mr-2" />
                      <span>Microphone Access</span>
                    </div>
                    {systemCheck.microphone ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <Monitor className="w-4 h-4 mr-2" />
                      <span>Fullscreen Support</span>
                    </div>
                    {systemCheck.fullscreen ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-2" />
                      <span>Browser Compatible</span>
                    </div>
                    {systemCheck.browser ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  onClick={performSystemCheck}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recheck System
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Action Section */}
          <Card>
            <CardContent className="p-6">
              {application.status === 'PAYMENT_CONFIRMED' && (
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-semibold">Ready to Schedule Your Exam</h3>
                  <p className="text-gray-600">
                    Your payment has been confirmed. You can now schedule and start your certificate exam.
                  </p>
                  <Button onClick={scheduleExam} size="lg">
                    <Calendar className="w-5 h-5 mr-2" />
                    Schedule & Start Exam
                  </Button>
                </div>
              )}
              
              {application.status === 'SCHEDULED' && (
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-semibold">Exam Ready to Start</h3>
                  <p className="text-gray-600">
                    Your exam is scheduled and ready. Make sure you have a stable internet connection and are in a quiet environment.
                  </p>
                  <Button 
                    onClick={startExam} 
                    size="lg"
                    className="bg-green-600 hover:bg-green-700"
                    disabled={!systemCheck.webcam || !systemCheck.microphone}
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Secure Exam
                  </Button>
                  {(!systemCheck.webcam || !systemCheck.microphone) && (
                    <p className="text-sm text-red-600">
                      Please enable webcam and microphone access to start the exam
                    </p>
                  )}
                </div>
              )}
              
              {application.status === 'PENDING_PAYMENT' && (
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-semibold">Payment Required</h3>
                  <p className="text-gray-600">
                    Complete your payment to proceed with the certificate exam.
                  </p>
                  <Button onClick={() => router.push(`/certificate/course/${application.courseId}`)}>
                    <CreditCard className="w-5 h-5 mr-2" />
                    Complete Payment
                  </Button>
                </div>
              )}
              
              {application.status === 'COMPLETED' && application.examSession?.passed && (
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-semibold text-green-600">Congratulations!</h3>
                  <p className="text-gray-600">
                    You have successfully passed the exam and earned your certificate.
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Button>
                      <Download className="w-5 h-5 mr-2" />
                      Download Certificate
                    </Button>
                    <Button variant="outline">
                      Share Achievement
                    </Button>
                  </div>
                </div>
              )}
              
              {application.status === 'COMPLETED' && !application.examSession?.passed && (
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-semibold text-red-600">Exam Not Passed</h3>
                  <p className="text-gray-600">
                    You scored {application.examSession?.score}%. You need {application.passingScore}% to pass.
                  </p>
                  <Button variant="outline">
                    Contact Support
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}