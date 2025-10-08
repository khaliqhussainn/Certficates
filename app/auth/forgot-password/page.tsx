'use client'
// app/auth/forgot-password/page.tsx

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AlertCircle, ArrowLeft, Mail, CheckCircle, GraduationCap } from 'lucide-react'
import LoaderComponent from '@/components/Loader'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
      } else {
        setError(data.error || 'Failed to send reset email')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h1>
            <p className="text-gray-600 mb-6">
              We've sent password reset instructions to <strong>{email}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <Button
              onClick={() => setSuccess(false)}
              variant="outline"
              className="w-full mb-3"
            >
              Try Another Email
            </Button>
            <Link href="/auth/signin">
              <Button variant="ghost" className="w-full">
                Back to Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900">
      {/* Back to Sign In Button */}
      <div className="absolute top-6 left-6 z-50">
        <Link href="/auth/signin">
          <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sign In
          </Button>
        </Link>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:flex w-full">
        {/* Left Side - Illustration */}
        <div className="w-1/2 relative flex items-center justify-center p-8">
          <div className="relative z-10 text-center text-white max-w-md">
            <div className="w-80 h-80 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-blue-400/20 to-indigo-400/20 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-300/30 to-indigo-300/30 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                    <Mail className="w-12 h-12 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-2">Reset Your Password</h2>
                <h3 className="text-xl font-medium text-blue-200">We'll help you get back in</h3>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <p className="text-sm text-white/80">Enter your email to receive reset instructions</p>
            </div>
          </div>

          {/* Background decorative elements */}
          <div className="absolute top-20 left-20 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>
        </div>

        {/* Right Side - Form */}
        <div className="w-1/2 bg-white flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <GraduationCap className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password?</h1>
              <p className="text-gray-600">No worries, we'll send you reset instructions.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full h-12 text-base border-gray-300 focus:border-blue-600 focus:ring-blue-600 rounded-lg"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 h-12 rounded-lg font-medium text-base"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <LoaderComponent size="sm" variant="minimal" color="secondary" className="mr-3" />
                    Sending Reset Link...
                  </div>
                ) : (
                  'Send Reset Link'
                )}
              </Button>

              <div className="text-center">
                <Link href="/auth/signin" className="text-sm text-blue-600 hover:text-blue-500 font-medium">
                  Remember your password? Sign in
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="lg:hidden w-full min-h-screen flex flex-col">
        {/* Mobile Hero Section */}
        <div className="flex-1 flex items-center justify-center p-6 text-white">
          <div className="text-center max-w-sm">
            <div className="w-64 h-64 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-400/20 to-indigo-400/20 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-300/30 to-indigo-300/30 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                    <Mail className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h2 className="text-lg font-bold mb-1">Reset Your Password</h2>
                <h3 className="text-base font-medium text-blue-200">We'll help you get back in</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Form Section */}
        <div className="bg-white rounded-t-3xl p-6 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Forgot Password?</h1>
            <p className="text-gray-600 text-sm">We'll send you reset instructions.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-xs">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full h-11 text-sm border-gray-300 focus:border-blue-600 focus:ring-blue-600 rounded-lg"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 h-11 rounded-lg font-medium"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <LoaderComponent size="sm" variant="minimal" color="secondary" className="mr-2" />
                  Sending...
                </div>
              ) : (
                'Send Reset Link'
              )}
            </Button>

            <div className="text-center">
              <Link href="/auth/signin" className="text-sm text-blue-600 hover:text-blue-500 font-medium">
                Remember your password? Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}