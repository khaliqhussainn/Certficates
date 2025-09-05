// app/certificate/course/[courseId]/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import StripePaymentForm from '@/components/StripePaymentForm'
import {
  ArrowLeft,
  Award,
  Clock,
  Target,
  Shield,
  CheckCircle,
  AlertCircle,
  Star,
  Users,
  BookOpen,
  Play,
  Calendar,
  DollarSign,
  Percent,
  Globe,
  Zap,
  Lock,
  Camera,
  Monitor,
  Loader2
} from 'lucide-react'

interface Course {
  id: string
  title: string
  description: string
  thumbnail?: string
  category: string
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  certificatePrice: number
  certificateDiscount: number
  certificateEnabled: boolean
  passingScore: number
  examDuration: number
  totalQuestions: number
  rating: number
  prerequisites: string[]
  tags: string[]
  isCompleted?: boolean
  completedAt?: string
  hasApplication?: boolean
  applicationStatus?: string
}

export default function CertificateCoursePage({ 
  params 
}: { 
  params: { courseId: string } 
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPayment, setShowPayment] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    
    fetchCourse()
  }, [status, params.courseId])

  const fetchCourse = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/certificate/course/${params.courseId}`)
      
      if (response.ok) {
        const data = await response.json()
        setCourse(data)
      } else if (response.status === 404) {
        setError('Course not found')
      } else if (response.status === 400) {
        setError('Certificate not available for this course')
      } else {
        setError('Failed to load course details')
      }
    } catch (error) {
      console.error('Error fetching course:', error)
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = (applicationId: string) => {
    router.push(`/certificate/application/${applicationId}`)
  }

  const handleStartExam = () => {
    if (course?.hasApplication) {
      // Find the application and redirect to exam
      router.push(`/certificate/exam/${course.id}`) // You'll need to get actual applicationId
    }
  }

  const formatPrice = (price: number, discount: number = 0) => {
    const finalPrice = price - (price * discount / 100)
    return finalPrice.toFixed(2)
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'BEGINNER': return 'bg-green-100 text-green-800 border-green-200'
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'ADVANCED': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getApplicationStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'payment_confirmed': return 'bg-purple-100 text-purple-800'
      case 'pending_payment': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading course details...</p>
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
                <Button variant="outline" onClick={fetchCourse}>
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!course) {
    return null
  }

  if (showPayment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <StripePaymentForm
            course={course}
            onSuccess={handlePaymentSuccess}
            onCancel={() => setShowPayment(false)}
          />
        </div>
      </div>
    )
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
              Back to Certificates
            </Link>
            
            <div className="flex items-center space-x-4">
              <Link 
                href={`/course/${course.id}`}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                <BookOpen className="w-4 h-4 inline mr-1" />
                View Course
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start space-x-6">
                  <Image
                    src={course.thumbnail || '/course-placeholder.jpg'}
                    alt={course.title}
                    width={200}
                    height={150}
                    className="rounded-lg object-cover"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <Badge className={getLevelColor(course.level)}>
                        {course.level}
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-800">
                        {course.category}
                      </Badge>
                      {course.isCompleted && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>
                    
                    <h1 className="text-3xl font-bold text-gray-900 mb-3">
                      {course.title}
                    </h1>
                    
                    <p className="text-gray-600 mb-4 leading-relaxed">
                      {course.description}
                    </p>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 mr-1" />
                        {course.rating} rating
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        Certificate Available
                      </div>
                      {course.completedAt && (
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          Completed {new Date(course.completedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Status */}
            {course.hasApplication && (
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Application Status</h3>
                      <Badge className={getApplicationStatusColor(course.applicationStatus)}>
                        {course.applicationStatus?.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <p className="text-sm text-gray-600 mt-2">
                        You have already applied for this certificate exam.
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        onClick={() => router.push('/certificate/dashboard')}
                        variant="outline"
                      >
                        View Application
                      </Button>
                      {course.applicationStatus === 'SCHEDULED' && (
                        <Button onClick={handleStartExam}>
                          Start Exam
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Exam Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="w-6 h-6 mr-2 text-blue-600" />
                  Certificate Exam Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <div className="font-semibold">{course.examDuration} Minutes</div>
                    <div className="text-sm text-gray-600">Exam Duration</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="font-semibold">{course.totalQuestions} Questions</div>
                    <div className="text-sm text-gray-600">Total Questions</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Percent className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <div className="font-semibold">{course.passingScore}%</div>
                    <div className="text-sm text-gray-600">Passing Score</div>
                  </div>
                </div>

                {/* Security Features */}
                <div className="mt-6">
                  <h4 className="font-semibold mb-3 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-red-600" />
                    Exam Security Features
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center p-3 bg-red-50 rounded border border-red-200">
                      <Camera className="w-4 h-4 text-red-600 mr-2" />
                      <span>Webcam Monitoring</span>
                    </div>
                    <div className="flex items-center p-3 bg-red-50 rounded border border-red-200">
                      <Monitor className="w-4 h-4 text-red-600 mr-2" />
                      <span>Screen Recording</span>
                    </div>
                    <div className="flex items-center p-3 bg-red-50 rounded border border-red-200">
                      <Lock className="w-4 h-4 text-red-600 mr-2" />
                      <span>Browser Lockdown</span>
                    </div>
                    <div className="flex items-center p-3 bg-red-50 rounded border border-red-200">
                      <Shield className="w-4 h-4 text-red-600 mr-2" />
                      <span>AI Proctoring</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Prerequisites & Tags */}
            {(course.prerequisites.length > 0 || course.tags.length > 0) && (
              <Card>
                <CardContent className="p-6">
                  {course.prerequisites.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2">Prerequisites:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {course.prerequisites.map((prereq, index) => (
                          <li key={index}>{prereq}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {course.tags.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Topics Covered:</h4>
                      <div className="flex flex-wrap gap-2">
                        {course.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing Card */}
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-center">Certificate Exam</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Price Display */}
                <div className="text-center">
                  {course.certificateDiscount > 0 ? (
                    <div>
                      <div className="text-3xl font-bold text-green-600">
                        ${formatPrice(course.certificatePrice, course.certificateDiscount)}
                      </div>
                      <div className="text-lg text-gray-500 line-through">
                        ${course.certificatePrice}
                      </div>
                      <Badge className="mt-2 bg-red-100 text-red-800">
                        Save {course.certificateDiscount}%
                      </Badge>
                    </div>
                  ) : (
                    <div className="text-3xl font-bold text-gray-900">
                      ${course.certificatePrice}
                    </div>
                  )}
                  <p className="text-sm text-gray-600 mt-2">One-time payment</p>
                </div>

                {/* What's Included */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    <span>Secure proctored exam</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    <span>Industry-recognized certificate</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    <span>Instant results</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    <span>Digital & PDF certificate</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    <span>Verification code included</span>
                  </div>
                </div>

                {/* Action Button */}
                <div className="space-y-3">
                  {!course.hasApplication ? (
                    <>
                      <Button
                        onClick={() => setShowPayment(true)}
                        className="w-full h-12 text-lg"
                        disabled={!course.certificateEnabled}
                      >
                        <Award className="w-5 h-5 mr-2" />
                        Apply for Certificate
                      </Button>
                      
                      {!course.certificateEnabled && (
                        <p className="text-xs text-red-600 text-center">
                          Certificate applications are currently disabled for this course
                        </p>
                      )}
                    </>
                  ) : (
                    <Button
                      onClick={() => router.push('/certificate/dashboard')}
                      variant="outline"
                      className="w-full"
                    >
                      View Application Status
                    </Button>
                  )}
                  
                  <div className="text-xs text-gray-500 text-center">
                    Secure payment powered by Stripe
                  </div>
                </div>

                {/* Currency Note */}
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-center text-xs text-gray-500">
                    <Globe className="w-3 h-3 mr-1" />
                    <span>Multiple currencies supported</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Support Card */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">Need Help?</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Have questions about the certificate exam process?
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}