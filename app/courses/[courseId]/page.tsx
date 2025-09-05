'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  BookOpen,
  Clock,
  Star,
  Users,
  Award,
  CheckCircle,
  ArrowLeft,
  GraduationCap,
  Shield,
  TrendingUp,
  Building2,
  Play,
  FileText,
  Target,
  Calendar,
  DollarSign
} from 'lucide-react'

interface Course {
  id: string
  title: string
  description: string
  category: string
  level: string
  thumbnail?: string
  certificatePrice: number
  rating?: number
  passingScore: number
  examDuration: number
  totalQuestions?: number
  prerequisites?: string[]
  learningOutcomes?: string[]
  instructor?: string
  estimatedStudyTime?: string
  courseDuration?: string
  skillsGained?: string[]
  price?: number
  enrollmentCount?: number
  courseUrl?: string
  syllabus?: {
    module: string
    topics: string[]
    duration: string
  }[]
}

interface UserStatus {
  hasBooked: boolean
  hasCompleted: boolean
  hasCertificate: boolean
  payment?: {
    status: string
    amount: number
  }
}

export default function CourseDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const [course, setCourse] = useState<Course | null>(null)
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState(false)

  useEffect(() => {
    if (courseId) {
      fetchCourseDetail()
    }
  }, [courseId])

  useEffect(() => {
    if (session?.user?.id && course) {
      fetchUserStatus()
    }
  }, [session, course])

  const fetchCourseDetail = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/courses/public/${courseId}`)
      if (response.ok) {
        const data = await response.json()
        setCourse(data.course)
      }
    } catch (error) {
      console.error('Error fetching course:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserStatus = async () => {
    try {
      const response = await fetch('/api/user/course-statuses')
      if (response.ok) {
        const data = await response.json()
        setUserStatus(data.statuses[courseId] || {
          hasBooked: false,
          hasCompleted: false,
          hasCertificate: false
        })
      }
    } catch (error) {
      console.error('Error fetching user status:', error)
    }
  }

  const handleStartCourse = () => {
    router.push(`/exam/${courseId}`)
  }

  const handleBookCertificate = async () => {
    if (!session) {
      router.push('/auth/signin')
      return
    }
    if (!userStatus?.hasCompleted) {
      alert('Please complete the course first before booking the certificate exam.')
      return
    }
    try {
      setPaymentLoading(true)
      const response = await fetch('/api/payments/create-exam-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId })
      })

      const data = await response.json()

      if (response.ok) {
        router.push(`/dashboard/payment?paymentId=${data.paymentId}&clientSecret=${data.clientSecret}`)
      } else {
        alert(data.error || 'Payment initialization failed')
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('Payment failed')
    } finally {
      setPaymentLoading(false)
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'advanced':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getActionButton = () => {
    if (!session) {
      return {
        text: 'Sign In to Get Started',
        action: () => router.push('/auth/signin'),
        className: 'w-full bg-[#001e62] text-white py-4 px-6 rounded-lg hover:bg-[#001e62]/90 transition-colors text-center font-medium text-lg',
        icon: <GraduationCap className="w-5 h-5 mr-2" />
      }
    }
    if (userStatus?.hasCertificate) {
      return {
        text: 'View Your Certificate',
        action: () => router.push(`/dashboard/courses/${courseId}`),
        className: 'w-full bg-green-600 text-white py-4 px-6 rounded-lg hover:bg-green-700 transition-colors text-center font-medium text-lg',
        icon: <Award className="w-5 h-5 mr-2" />
      }
    }
    if (userStatus?.hasBooked) {
      return {
        text: 'Go to Dashboard',
        action: () => router.push(`/dashboard/courses/${courseId}`),
        className: 'w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors text-center font-medium text-lg',
        icon: <BookOpen className="w-5 h-5 mr-2" />
      }
    }
    if (userStatus?.hasCompleted) {
      return {
        text: `Book Certificate Exam - $${course?.certificatePrice}`,
        action: handleBookCertificate,
        className: 'w-full bg-[#001e62] text-white py-4 px-6 rounded-lg hover:bg-[#001e62]/90 transition-colors text-center font-medium text-lg',
        icon: <Award className="w-5 h-5 mr-2" />
      }
    }
    return {
      text: 'Start Exam',
      action: handleStartCourse,
      className: 'w-full bg-[#001e62] text-white py-4 px-6 rounded-lg hover:bg-[#001e62]/90 transition-colors text-center font-medium text-lg',
      icon: <Play className="w-5 h-5 mr-2" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#001e62] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading course details...</p>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Course Not Found</h2>
          <Link href="/courses" className="text-[#001e62] hover:text-[#001e62]/80 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Link>
        </div>
      </div>
    )
  }

  const actionButton = getActionButton()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/courses" className="text-[#001e62] hover:text-[#001e62]/80 text-sm font-medium flex items-center">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to All Courses
          </Link>
        </div>
      </div>

      {/* Course Hero */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-center">
            {/* Course Image */}
            <div className="mb-8 lg:mb-0">
              {course.thumbnail ? (
                <Image
                  src={course.thumbnail}
                  alt={course.title}
                  width={600}
                  height={400}
                  className="w-full h-80 object-cover rounded-lg shadow-lg"
                />
              ) : (
                <div className="w-full h-80 bg-gradient-to-br from-[#001e62] to-[#001e62]/80 rounded-lg shadow-lg flex items-center justify-center">
                  <BookOpen className="w-24 h-24 text-white" />
                </div>
              )}
            </div>

            {/* Course Info */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm text-[#001e62] font-medium bg-[#001e62]/10 px-3 py-1 rounded-full">
                  {course.category}
                </span>
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${getLevelColor(course.level)}`}>
                  {course.level}
                </span>
                {userStatus?.hasCertificate && (
                  <span className="text-sm font-medium px-3 py-1 rounded-full bg-green-100 text-green-800 flex items-center">
                    <Award className="w-3 h-3 mr-1" />
                    Certified
                  </span>
                )}
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{course.title}</h1>
              <p className="text-xl text-gray-600 mb-6">{course.description}</p>

              {/* Course Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                  <div className="text-lg font-bold text-gray-900">{course.rating || 'N/A'}</div>
                  <div className="text-sm text-gray-600">Rating</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Clock className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <div className="text-lg font-bold text-gray-900">{course.estimatedStudyTime || 'N/A'}</div>
                  <div className="text-sm text-gray-600">Study Time</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Users className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <div className="text-lg font-bold text-gray-900">{course.enrollmentCount?.toLocaleString() || 'N/A'}</div>
                  <div className="text-sm text-gray-600">Students</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Award className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <div className="text-lg font-bold text-gray-900">${course.certificatePrice}</div>
                  <div className="text-sm text-gray-600">Certificate</div>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={actionButton.action}
                disabled={paymentLoading}
                className={`${actionButton.className} flex items-center justify-center ${paymentLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {paymentLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                ) : (
                  actionButton.icon
                )}
                {paymentLoading ? 'Processing...' : actionButton.text}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Course Details */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="lg:grid lg:grid-cols-3 lg:gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Certificate Overview */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Award className="w-6 h-6 mr-3 text-[#001e62]" />
                Professional Certification
              </h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                Earn an industry-recognized certificate for {course.title}. This certification validates your expertise
                and demonstrates your competency to employers worldwide. Our certificates are blockchain-verified
                and accepted by leading companies in the industry.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">What This Certificate Validates</h3>
                <ul className="space-y-2 text-blue-800">
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    Professional competency in {course.category.toLowerCase()}
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    Industry-standard knowledge and best practices
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    Practical application of {course.level.toLowerCase()}-level skills
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    Commitment to professional development
                  </li>
                </ul>
              </div>
            </div>

            {/* Exam Format */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Shield className="w-6 h-6 mr-3 text-[#001e62]" />
                Secure Exam Format
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Exam Structure</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-center">
                      <FileText className="w-4 h-4 text-[#001e62] mr-2" />
                      {course.totalQuestions || 50} multiple-choice questions
                    </li>
                    <li className="flex items-center">
                      <Clock className="w-4 h-4 text-[#001e62] mr-2" />
                      {formatDuration(course.examDuration)} time limit
                    </li>
                    <li className="flex items-center">
                      <TrendingUp className="w-4 h-4 text-[#001e62] mr-2" />
                      {course.passingScore}% minimum passing score
                    </li>
                    <li className="flex items-center">
                      <Shield className="w-4 h-4 text-[#001e62] mr-2" />
                      AI-proctored examination
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Security Features</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Fullscreen monitoring
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Tab switching detection
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Copy/paste prevention
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Violation tracking
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Certificate Recognition */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Building2 className="w-6 h-6 mr-3 text-[#001e62]" />
                Industry Recognition
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Fortune 500 Companies</h3>
                  <p className="text-sm text-gray-600">Recognized by leading corporations worldwide</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Blockchain Verified</h3>
                  <p className="text-sm text-gray-600">Tamper-proof verification system</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Award className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">LinkedIn Integration</h3>
                  <p className="text-sm text-gray-600">Add directly to your LinkedIn profile</p>
                </div>
              </div>
            </div>

            {/* Success Stories */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Users className="w-6 h-6 mr-3 text-[#001e62]" />
                Success Stories
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-[#001e62] rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-semibold">JS</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">John Smith</h4>
                      <p className="text-sm text-gray-600">Software Engineer</p>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm">
                    "This certification helped me land a senior position at a Fortune 500 company.
                    The exam was challenging but fair, and the credential is highly respected."
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-[#001e62] rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-semibold">MJ</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Maria Johnson</h4>
                      <p className="text-sm text-gray-600">Product Manager</p>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm">
                    "The blockchain verification gives me confidence that my achievement is
                    secure and verifiable. HR departments love the transparency."
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Certificate Process */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <GraduationCap className="w-5 h-5 mr-2 text-[#001e62]" />
                Certificate Process
              </h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mr-3 ${
                    userStatus?.hasCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    1
                  </div>
                  <div>
                    <p className={`font-medium ${userStatus?.hasCompleted ? 'text-green-700' : 'text-gray-900'}`}>
                      Complete Course
                    </p>
                    <p className="text-sm text-gray-600">Finish all modules and assignments</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mr-3 ${
                    userStatus?.hasBooked ?
                    'bg-green-500 text-white' :
                    userStatus?.hasCompleted ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    2
                  </div>
                  <div>
                    <p className={`font-medium ${
                      userStatus?.hasBooked ? 'text-green-700' :
                      userStatus?.hasCompleted ? 'text-blue-700' : 'text-gray-900'
                    }`}>
                      Pay Certificate Fee
                    </p>
                    <p className="text-sm text-gray-600">${course.certificatePrice} one-time payment</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mr-3 ${
                    userStatus?.hasCertificate ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    3
                  </div>
                  <div>
                    <p className={`font-medium ${userStatus?.hasCertificate ? 'text-green-700' : 'text-gray-900'}`}>
                      Pass Proctored Exam
                    </p>
                    <p className="text-sm text-gray-600">Score {course.passingScore}% or higher</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Exam Details */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-[#001e62]" />
                Exam Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Duration:
                  </span>
                  <span className="font-medium">{formatDuration(course.examDuration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Passing Score:
                  </span>
                  <span className="font-medium">{course.passingScore}%</span>
                </div>
                {course.totalQuestions && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 flex items-center">
                      <FileText className="w-4 h-4 mr-1" />
                      Questions:
                    </span>
                    <span className="font-medium">{course.totalQuestions}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Retakes:</span>
                  <span className="font-medium">Unlimited</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Proctored:</span>
                  <span className="font-medium">Yes</span>
                </div>
              </div>
            </div>

            {/* Course Price */}
            {course.price && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-[#001e62]" />
                  Course Pricing
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Course Access:</span>
                    <span className="font-medium">
                      {course.price === 0 ? 'Free' : `$${course.price}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Certificate Exam:</span>
                    <span className="font-medium">${course.certificatePrice}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total to Certificate:</span>
                      <span className="text-[#001e62]">
                        ${(course.price || 0) + course.certificatePrice}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Certificate Benefits */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2 text-[#001e62]" />
                Certificate Benefits
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Industry-recognized credential</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Blockchain-verified authenticity</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Shareable on LinkedIn</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">PDF download available</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Lifetime validity</span>
                </li>
              </ul>
            </div>

            {/* Help & Support */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Need Help?</h3>
              <div className="space-y-3">
                <Link
                  href="/support"
                  className="block text-[#001e62] hover:text-[#001e62]/80 text-sm font-medium"
                >
                  Contact Support
                </Link>
                <Link
                  href="/faq"
                  className="block text-[#001e62] hover:text-[#001e62]/80 text-sm font-medium"
                >
                  View FAQ
                </Link>
                <Link
                  href="/certificate-verification"
                  className="block text-[#001e62] hover:text-[#001e62]/80 text-sm font-medium"
                >
                  Verify Certificates
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
