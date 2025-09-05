// components/StripePaymentForm.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  CreditCard,
  Shield,
  Clock,
  Target,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Lock,
  Globe,
  Award
} from 'lucide-react'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Course {
  id: string
  title: string
  description: string
  thumbnail?: string
  certificatePrice: number
  certificateDiscount: number
  examDuration: number
  totalQuestions: number
  passingScore: number
}

interface PaymentFormProps {
  course: Course
  onSuccess: (applicationId: string) => void
  onCancel: () => void
}

// Stripe Card Element styles
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: 'antialiased',
    },
    invalid: {
      color: '#9e2146',
    },
  },
}

function CheckoutForm({ course, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [paymentSucceeded, setPaymentSucceeded] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState('USD')

  // Calculate final price
  const basePrice = course.certificatePrice
  const discount = course.certificateDiscount || 0
  const finalPrice = basePrice - (basePrice * discount / 100)

  const supportedCurrencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' }
  ]

  useEffect(() => {
    createPaymentIntent()
  }, [selectedCurrency])

  const createPaymentIntent = async () => {
    try {
      const response = await fetch('/api/certificate/payment/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          currency: selectedCurrency
        })
      })

      if (response.ok) {
        const data = await response.json()
        setClientSecret(data.clientSecret)
        setApplicationId(data.applicationId)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to initialize payment')
      }
    } catch (err) {
      setError('Network error occurred')
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements || !clientSecret) {
      return
    }

    setProcessing(true)
    setError(null)

    const cardElement = elements.getElement(CardElement)

    if (!cardElement) {
      setError('Card information is required')
      setProcessing(false)
      return
    }

    // Confirm payment
    const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: 'Certificate Exam Payment'
          }
        }
      }
    )

    if (paymentError) {
      setError(paymentError.message || 'Payment failed')
      setProcessing(false)
    } else if (paymentIntent?.status === 'succeeded') {
      // Confirm payment with backend
      try {
        const confirmResponse = await fetch('/api/certificate/payment/create-intent', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id
          })
        })

        if (confirmResponse.ok) {
          setPaymentSucceeded(true)
          setTimeout(() => {
            if (applicationId) {
              onSuccess(applicationId)
            }
          }, 2000)
        } else {
          setError('Payment confirmation failed')
        }
      } catch (err) {
        setError('Payment confirmation failed')
      }
      
      setProcessing(false)
    }
  }

  const getCurrencySymbol = (code: string) => {
    return supportedCurrencies.find(c => c.code === code)?.symbol || '$'
  }

  if (paymentSucceeded) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
        <p className="text-gray-600 mb-4">
          Your certificate exam application has been confirmed.
        </p>
        <p className="text-sm text-gray-500">
          Redirecting to your dashboard...
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <CreditCard className="w-6 h-6 mr-2" />
              Secure Payment
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Order Summary</h3>
            <div className="flex items-start space-x-4">
              <img
                src={course.thumbnail || '/course-placeholder.jpg'}
                alt={course.title}
                className="w-16 h-16 object-cover rounded"
              />
              <div className="flex-1">
                <h4 className="font-medium">{course.title}</h4>
                <p className="text-sm text-gray-600 mb-2">Certificate Exam</p>
                
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {course.examDuration}min
                  </span>
                  <span className="flex items-center">
                    <Target className="w-3 h-3 mr-1" />
                    {course.totalQuestions} questions
                  </span>
                  <span className="flex items-center">
                    <Award className="w-3 h-3 mr-1" />
                    {course.passingScore}% to pass
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span>Certificate Price:</span>
                <span>{getCurrencySymbol(selectedCurrency)}{basePrice.toFixed(2)}</span>
              </div>
              
              {discount > 0 && (
                <div className="flex justify-between items-center mb-2 text-green-600">
                  <span>Discount ({discount}%):</span>
                  <span>-{getCurrencySymbol(selectedCurrency)}{(basePrice * discount / 100).toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center font-bold text-lg pt-2 border-t border-gray-200">
                <span>Total:</span>
                <span>{getCurrencySymbol(selectedCurrency)}{finalPrice.toFixed(2)} {selectedCurrency}</span>
              </div>
            </div>
          </div>

          {/* Currency Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={processing}
            >
              {supportedCurrencies.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name}
                </option>
              ))}
            </select>
          </div>

          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Shield className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">Secure Payment</p>
                <p className="text-blue-700">
                  Your payment is processed securely using Stripe. We never store your card information.
                </p>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Information
              </label>
              <div className="border border-gray-300 rounded-md p-3 bg-white">
                <CardElement options={cardElementOptions} />
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Security Features */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center">
                <Lock className="w-4 h-4 mr-2" />
                What you get:
              </h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Secure, proctored online exam</li>
                <li>• Industry-recognized certificate upon passing</li>
                <li>• Instant results and score breakdown</li>
                <li>• Digital certificate with verification code</li>
                <li>• Downloadable PDF certificate</li>
              </ul>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!stripe || processing}
              className="w-full h-12 text-lg"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  Pay {getCurrencySymbol(selectedCurrency)}{finalPrice.toFixed(2)} {selectedCurrency}
                </>
              )}
            </Button>
          </form>

          {/* Terms */}
          <div className="text-xs text-gray-500 text-center">
            By completing this purchase, you agree to our Terms of Service and Privacy Policy.
            <br />
            Refunds are available within 24 hours if you haven't started the exam.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Main Payment Component with Stripe Elements Provider
export default function StripePaymentForm({ course, onSuccess, onCancel }: PaymentFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm
        course={course}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  )
}