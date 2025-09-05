// app/certificate/[courseId]/page.tsx - Certificate Exam Page
'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Course {
  id: string
  title: string
  description: string
  certificatePrice: number
  passingScore: number
  examDuration: number
}

function PaymentForm({ course, onPaymentSuccess }: { course: Course, onPaymentSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id }),
      })

      const { clientSecret } = await response.json()

      const { error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      })

      if (error) {
        setError(error.message || 'Payment failed')
      } else {
        onPaymentSuccess()
      }
    } catch (error) {
      setError('Payment processing failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': { color: '#aab7c4' },
              },
            },
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {loading ? 'Processing...' : `Pay ${course.certificatePrice}`}
      </button>
    </form>
  )
}

export default function CertificateExamPage({ params }: { params: { courseId: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [hasPaid, setHasPaid] = useState(false)
  const [hasCompleted, setHasCompleted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchCourseDetails()
    checkPaymentStatus()
    checkCompletionStatus()
  }, [session, params.courseId])

  const fetchCourseDetails = async () => {
    try {
      const response = await fetch(`/api/courses/${params.courseId}`)
      if (response.ok) {
        const data = await response.json()
        setCourse(data)
      }
    } catch (error) {
      console.error('Error fetching course:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkPaymentStatus = async () => {
    try {
      const response = await fetch(`/api/payments/status/${params.courseId}`)
      if (response.ok) {
        const { hasPaid } = await response.json()
        setHasPaid(hasPaid)
      }
    } catch (error) {
      console.error('Error checking payment status:', error)
    }
  }

  const checkCompletionStatus = async () => {
    try {
      const response = await fetch(`/api/certificates/status/${params.courseId}`)
      if (response.ok) {
        const { hasCompleted } = await response.json()
        setHasCompleted(hasCompleted)
      }
    } catch (error) {
      console.error('Error checking completion status:', error)
    }
  }

  const startExam = async () => {
    try {
      const response = await fetch('/api/exam/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          courseId: params.courseId,
          browserData: {
            userAgent: navigator.userAgent,
            screen: { width: screen.width, height: screen.height },
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }),
      })

      if (response.ok) {
        const { sessionId } = await response.json()
        router.push(`/exam/${params.courseId}?session=${sessionId}`)
      }
    } catch (error) {
      console.error('Error starting exam:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Course not found</h2>
          <p className="text-gray-600 mt-2">The requested course could not be found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {course.title} Certificate Exam
            </h1>
            <p className="text-gray-600 mb-6">{course.description}</p>

            {hasCompleted ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  Certificate Already Earned!
                </h3>
                <p className="text-green-700 mb-4">
                  You have already successfully completed this certification exam.
                </p>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  View Certificate
                </button>
              </div>
            ) : hasPaid ? (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">
                    Ready to Take Exam
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700 mb-4">
                    <div>
                      <strong>Duration:</strong> {course.examDuration} minutes
                    </div>
                    <div>
                      <strong>Passing Score:</strong> {course.passingScore}%
                    </div>
                    <div>
                      <strong>Format:</strong> Multiple Choice
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
                    <h4 className="font-semibold text-yellow-800 mb-2">Important Instructions:</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Ensure you have a stable internet connection</li>
                      <li>• Close all other applications and browser tabs</li>
                      <li>• The exam uses Safe Exam Browser for security</li>
                      <li>• You cannot pause or restart the exam once started</li>
                      <li>• Any suspicious activity will result in exam termination</li>
                    </ul>
                  </div>
                  <button
                    onClick={startExam}
                    className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Start Secure Exam
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Exam Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-6">
                    <div>
                      <strong>Duration:</strong> {course.examDuration} minutes
                    </div>
                    <div>
                      <strong>Passing Score:</strong> {course.passingScore}%
                    </div>
                    <div>
                      <strong>Price:</strong> ${course.certificatePrice}
                    </div>
                    <div>
                      <strong>Attempts:</strong> 1 per payment
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Payment Information
                  </h3>
                  <Elements stripe={stripePromise}>
                    <PaymentForm 
                      course={course} 
                      onPaymentSuccess={() => {
                        setHasPaid(true)
                        checkPaymentStatus()
                      }} 
                    />
                  </Elements>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}