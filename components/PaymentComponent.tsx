// components/PaymentComponent.tsx - Complete Payment Component
"use client";
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { 
  CreditCard, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Shield,
  ExternalLink,
  ArrowLeft,
  Clock,
  Banknote
} from 'lucide-react'

interface PaymentComponentProps {
  courseId: string
  courseTitle: string
  amount: number
  currency?: string
  onPaymentSuccess?: () => void
  onPaymentCancel?: () => void
}

interface PaymentStatus {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  provider: 'moyasar' | 'tap'
  checkoutUrl?: string
}

export default function PaymentComponent({
  courseId,
  courseTitle,
  amount,
  currency = 'SAR',
  onPaymentSuccess,
  onPaymentCancel
}: PaymentComponentProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [selectedProvider, setSelectedProvider] = useState<'moyasar' | 'tap'>('moyasar')
  const [loading, setLoading] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)

  // Check for existing payment status on mount
  useEffect(() => {
    checkExistingPayment()
  }, [courseId])

  const checkExistingPayment = async () => {
    try {
      const response = await fetch(`/api/payments/check/${courseId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.hasPayment && data.payment.status === 'COMPLETED') {
          onPaymentSuccess?.()
        } else if (data.hasPayment && data.payment.status === 'PENDING') {
          setPaymentStatus({
            id: data.payment.id,
            status: 'pending',
            provider: data.payment.provider,
          })
        }
      }
    } catch (error) {
      console.error('Error checking existing payment:', error)
    }
  }

  const createPayment = async () => {
    if (!session) {
      router.push('/auth/signin')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          provider: selectedProvider
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Payment creation failed')
      }

      setPaymentStatus({
        id: data.payment.id,
        status: 'pending',
        provider: selectedProvider,
        checkoutUrl: data.payment.checkoutUrl
      })

      // Open checkout in new tab
      if (data.payment.checkoutUrl) {
        window.open(data.payment.checkoutUrl, '_blank', 'width=800,height=600')
        
        // Start polling for payment status
        startStatusPolling(data.payment.id)
      }

    } catch (error) {
      console.error('Payment creation error:', error)
      setError(error instanceof Error ? error.message : 'Payment creation failed')
    } finally {
      setLoading(false)
    }
  }

  const startStatusPolling = (paymentId: string) => {
    setCheckingStatus(true)
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payments/status/${paymentId}`)
        const data = await response.json()

        if (data.success && data.payment) {
          const status = data.payment.status.toLowerCase()
          
          setPaymentStatus(prev => prev ? { ...prev, status } : null)

          if (status === 'completed') {
            clearInterval(pollInterval)
            setCheckingStatus(false)
            onPaymentSuccess?.()
          } else if (status === 'failed' || status === 'cancelled') {
            clearInterval(pollInterval)
            setCheckingStatus(false)
            setError(`Payment ${status}. Please try again.`)
          }
        }
      } catch (error) {
        console.error('Status polling error:', error)
      }
    }, 3000) // Check every 3 seconds

    // Stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval)
      setCheckingStatus(false)
    }, 600000)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount)
  }

  const resetPayment = () => {
    setPaymentStatus(null)
    setError(null)
    setCheckingStatus(false)
  }

  if (paymentStatus?.status === 'completed') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-green-800 mb-2">Payment Successful!</h3>
        <p className="text-green-700 mb-4">
          Your certificate exam payment has been processed successfully.
        </p>
        <button
          onClick={() => router.push(`/exam/${courseId}`)}
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          Start Your Exam
        </button>
      </div>
    )
  }

  if (paymentStatus && checkingStatus) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <Clock className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
        <h3 className="text-xl font-bold text-blue-800 mb-2">Processing Payment</h3>
        <p className="text-blue-700 mb-4">
          Please complete your payment in the opened window. We're monitoring the status...
        </p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={resetPayment}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          {paymentStatus.checkoutUrl && (
            <button
              onClick={() => window.open(paymentStatus.checkoutUrl, '_blank')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Reopen Payment
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="text-center mb-6">
        <Shield className="w-16 h-16 text-[#001e62] mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-[#001e62] mb-2">Secure Payment</h2>
        <p className="text-gray-600">
          Pay for your certificate exam to unlock access
        </p>
      </div>

      {/* Course Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-2">{courseTitle}</h3>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Certificate Exam Fee:</span>
          <span className="text-2xl font-bold text-[#001e62]">
            {formatCurrency(amount)}
          </span>
        </div>
      </div>

      {/* Payment Provider Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Choose Payment Method
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setSelectedProvider('moyasar')}
            className={`p-4 border-2 rounded-lg transition-all ${
              selectedProvider === 'moyasar'
                ? 'border-[#001e62] bg-[#001e62]/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <div className={`w-5 h-5 rounded-full border-2 mr-3 ${
                selectedProvider === 'moyasar'
                  ? 'border-[#001e62] bg-[#001e62]'
                  : 'border-gray-300'
              }`}>
                {selectedProvider === 'moyasar' && (
                  <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                )}
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">Moyasar</div>
                <div className="text-sm text-gray-600">
                  Credit/Debit Cards, MADA, STCPay
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedProvider('tap')}
            className={`p-4 border-2 rounded-lg transition-all ${
              selectedProvider === 'tap'
                ? 'border-[#001e62] bg-[#001e62]/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <div className={`w-5 h-5 rounded-full border-2 mr-3 ${
                selectedProvider === 'tap'
                  ? 'border-[#001e62] bg-[#001e62]'
                  : 'border-gray-300'
              }`}>
                {selectedProvider === 'tap' && (
                  <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                )}
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">Tap Payments</div>
                <div className="text-sm text-gray-600">
                  All major cards, Apple Pay, Google Pay
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Security Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Shield className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium text-green-800">Secure Payment Processing</div>
            <div className="text-green-700 mt-1">
              Your payment is processed securely through Saudi-certified payment gateways.
              All transactions are encrypted and comply with PCI DSS standards.
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-red-800">Payment Error</div>
              <div className="text-red-700 mt-1">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={() => onPaymentCancel?.()}
          className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4 inline mr-2" />
          Back to Course
        </button>
        
        <button
          onClick={createPayment}
          disabled={loading}
          className="flex-1 bg-[#001e62] text-white py-3 px-6 rounded-lg hover:bg-[#001e62]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay {formatCurrency(amount)}
            </>
          )}
        </button>
      </div>

      {/* Terms */}
      <div className="text-xs text-gray-500 text-center mt-4">
        By proceeding, you agree to our Terms of Service and Privacy Policy.
        Payment is non-refundable once the exam is started.
      </div>
    </div>
  )
}