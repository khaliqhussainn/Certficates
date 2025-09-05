// Certificate Platform: app/dashboard/courses/[courseId]/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

interface CourseDetail {
  course: {
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
    totalQuestions: number
    price?: number
    isFree?: boolean
  }
  completion?: {
    id: string
    completedAt: string
    progress: number
    courseTitle?: string
    courseCategory?: string
  }
  certificate?: {
    id: string
    certificateNumber: string
    score: number
    issuedAt: string
    pdfPath?: string
  }
  payment?: {
    id: string
    amount: number
    status: string
    createdAt: string
  }
  examAttempts: {
    id: string
    score?: number
    passed: boolean
    startedAt: string
    completedAt?: string
    timeSpent?: number
  }[]
  canTakeExam: boolean
  totalQuestions: number
}

export default function CourseDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string

  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState(false)

  useEffect(() => {
    if (session?.user?.id && courseId) {
      fetchCourseDetail()
    }
  }, [session, courseId])

  const fetchCourseDetail = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/courses/${courseId}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch course')
      }
      
      setCourseDetail(data)
    } catch (error) {
      console.error('Error fetching course detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePayForExam = async () => {
    try {
      setPaymentLoading(true)
      const response = await fetch('/api/payments/create-exam-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // Redirect to payment page or handle Stripe checkout
        router.push(`/dashboard/payment?paymentId=${data.paymentId}&clientSecret=${data.clientSecret}`)
      } else {
        alert(data.error || 'Payment failed')
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('Payment failed')
    } finally {
      setPaymentLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading course details...</p>
        </div>
      </div>
    )
  }

  if (!courseDetail) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Course Not Found</h2>
          <Link href="/dashboard/courses" className="text-blue-600 hover:text-blue-500">
            Back to Courses
          </Link>
        </div>
      </div>
    )
  }

  const { course, completion, certificate, payment, examAttempts, canTakeExam } = courseDetail

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/dashboard/courses" className="text-blue-600 hover:text-blue-500 text-sm font-medium">
            ← Back to Courses
          </Link>
        </div>

        {/* Course Hero */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="md:flex">
            <div className="md:w-1/3">
              {course.thumbnail ? (
                <Image
                  src={course.thumbnail}
                  alt={course.title}
                  width={400}
                  height={300}
                  className="w-full h-64 md:h-full object-cover"
                />
              ) : (
                <div className="w-full h-64 md:h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <span className="text-white text-4xl font-bold">
                    {course.title.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            
            <div className="md:w-2/3 p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                  {course.category}
                </span>
                <span className="bg-gray-100 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded">
                  {course.level}
                </span>
                {course.rating && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="text-yellow-400">★</span>
                    <span className="ml-1">{course.rating}</span>
                  </div>
                )}
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{course.title}</h1>
              <p className="text-gray-600 mb-6">{course.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-900">Certificate Price:</span>
                  <span className="ml-2 text-green-600 font-bold">${course.certificatePrice}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Passing Score:</span>
                  <span className="ml-2">{course.passingScore}%</span>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Exam Duration:</span>
                  <span className="ml-2">{formatDuration(course.examDuration)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Total Questions:</span>
                  <span className="ml-2">{courseDetail.totalQuestions}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Course Completion Status */}
            {completion && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Course Completion</h2>
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-green-800 font-medium">Completed on {formatDate(completion.completedAt)}</p>
                    <p className="text-green-600 text-sm">Progress: {completion.progress}%</p>
                  </div>
                  <div className="text-green-600">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Certificate Status */}
            {certificate && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Certificate Earned</h2>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-yellow-800 font-medium">Certificate #{certificate.certificateNumber}</p>
                    <span className="text-yellow-600 font-bold">{certificate.score.toFixed(1)}%</span>
                  </div>
                  <p className="text-yellow-600 text-sm mb-3">Issued on {formatDate(certificate.issuedAt)}</p>
                  <div className="flex gap-3">
                    {certificate.pdfPath && (
                      <a
                        href={certificate.pdfPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-yellow-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-yellow-700"
                      >
                        Download PDF
                      </a>
                    )}
                    <Link
                      href={`/verify/${certificate.certificateNumber}`}
                      className="bg-gray-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-700"
                    >
                      Verify Certificate
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Exam Attempts */}
            {examAttempts.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Exam History</h2>
                <div className="space-y-3">
                  {examAttempts.map((attempt) => (
                    <div key={attempt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium text-gray-900">
                          {attempt.completedAt ? 'Completed' : 'In Progress'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Started: {formatDate(attempt.startedAt)}
                        </p>
                        {attempt.timeSpent && (
                          <p className="text-sm text-gray-600">
                            Time: {formatDuration(attempt.timeSpent)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {attempt.score !== null && (
                          <p className={`font-bold ${attempt.passed ? 'text-green-600' : 'text-red-600'}`}>
                            {attempt.score?.toFixed(1)}%
                          </p>
                        )}
                        <span className={`text-xs px-2 py-1 rounded ${
                          attempt.passed ? 'bg-green-100 text-green-800' : 
                          attempt.completedAt ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {attempt.passed ? 'Passed' : attempt.completedAt ? 'Failed' : 'In Progress'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Action Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Certificate Exam</h3>
              
              {!completion ? (
                <div className="text-center py-4">
                  <div className="text-gray-400 text-4xl mb-2">📚</div>
                  <p className="text-gray-600 text-sm mb-4">
                    Complete this course on the main website to unlock the certificate exam
                  </p>
                  <a
                    href={`${process.env.NEXT_PUBLIC_COURSE_WEBSITE_URL || 'https://your-course-website.com'}/courses/${courseId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
                  >
                    Go to Course
                  </a>
                </div>
              ) : certificate ? (
                <div className="text-center py-4">
                  <div className="text-green-400 text-4xl mb-2">🎓</div>
                  <p className="text-green-600 font-medium mb-2">Certificate Earned!</p>
                  <p className="text-gray-600 text-sm mb-4">
                    You have successfully completed this certificate exam
                  </p>
                  <Link
                    href="/dashboard/certificates"
                    className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700"
                  >
                    View All Certificates
                  </Link>
                </div>
              ) : !payment ? (
                <div className="text-center py-4">
                  <div className="text-blue-400 text-4xl mb-2">💳</div>
                  <p className="text-gray-900 font-medium mb-2">Ready for Certificate Exam</p>
                  <p className="text-gray-600 text-sm mb-4">
                    Pay the exam fee to start your certificate assessment
                  </p>
                  <div className="mb-4 p-3 bg-blue-50 rounded">
                    <p className="text-blue-900 font-bold text-lg">${course.certificatePrice}</p>
                    <p className="text-blue-600 text-xs">One-time exam fee</p>
                  </div>
                  <button
                    onClick={handlePayForExam}
                    disabled={paymentLoading}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {paymentLoading ? 'Processing...' : 'Pay for Exam'}
                  </button>
                </div>
              ) : canTakeExam ? (
                <div className="text-center py-4">
                  <div className="text-green-400 text-4xl mb-2">📝</div>
                  <p className="text-green-600 font-medium mb-2">Exam Available!</p>
                  <p className="text-gray-600 text-sm mb-4">
                    You can now take the certificate exam
                  </p>
                  <Link
                    href={`/dashboard/exam/${courseId}`}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded font-medium hover:bg-green-700 block text-center"
                  >
                    Start Exam
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-yellow-400 text-4xl mb-2">⏳</div>
                  <p className="text-yellow-600 font-medium mb-2">Payment Processed</p>
                  <p className="text-gray-600 text-sm">
                    Your exam will be available shortly after payment confirmation
                  </p>
                </div>
              )}
            </div>

            {/* Payment Info */}
            {payment && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">${payment.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${
                      payment.status === 'COMPLETED' ? 'text-green-600' : 
                      payment.status === 'PENDING' ? 'text-yellow-600' : 
                      'text-red-600'
                    }`}>
                      {payment.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{formatDate(payment.createdAt)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Course Stats */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Exam Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Questions:</span>
                  <span className="font-medium">{courseDetail.totalQuestions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time Limit:</span>
                  <span className="font-medium">{formatDuration(course.examDuration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Passing Score:</span>
                  <span className="font-medium">{course.passingScore}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Retakes:</span>
                  <span className="font-medium">Unlimited</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}