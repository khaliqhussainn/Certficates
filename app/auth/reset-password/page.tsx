'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft, GraduationCap } from 'lucide-react'
import LoaderComponent, { PageLoader } from '@/components/Loader'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [validatingToken, setValidatingToken] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Invalid or missing reset token')
        setValidatingToken(false)
        setTokenValid(false)
        return
      }
      try {
        const response = await fetch('/api/auth/validate-reset-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        })
        if (response.ok) {
          setTokenValid(true)
        } else {
          const data = await response.json()
          setError(data.error || 'Invalid or expired reset token')
          setTokenValid(false)
        }
      } catch (error) {
        setError('Failed to validate reset token')
        setTokenValid(false)
      } finally {
        setValidatingToken(false)
      }
    }
    validateToken()
  }, [token])

  const passwordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++
    if (password.match(/\d/)) strength++
    if (password.match(/[^a-zA-Z\d]/)) strength++
    return strength
  }

  const getStrengthColor = (strength: number) => {
    if (strength <= 1) return 'bg-red-500'
    if (strength <= 2) return 'bg-yellow-500'
    if (strength <= 3) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getStrengthText = (strength: number) => {
    if (strength <= 1) return 'Weak'
    if (strength <= 2) return 'Fair'
    if (strength <= 3) return 'Good'
    return 'Strong'
  }

  const validateForm = () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!validateForm()) return
    setLoading(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })
      const data = await response.json()
      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/auth/signin?message=Password reset successful')
        }, 3000)
      } else {
        setError(data.error || 'Failed to reset password')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (validatingToken) {
    return <PageLoader message="Validating reset link..." />
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Reset Link</h1>
            <p className="text-gray-600 mb-6">
              {error || 'This password reset link is invalid or has expired.'}
            </p>
            <Link href="/auth/forgot-password">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Request New Reset Link
              </Button>
            </Link>
            <Link href="/auth/signin">
              <Button variant="ghost" className="w-full mt-3">
                Back to Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Reset!</h1>
            <p className="text-gray-600 mb-6">
              Your password has been successfully reset. Redirecting to sign in...
            </p>
            <div className="flex items-center justify-center">
              <LoaderComponent size="sm" variant="minimal" color="primary" className="mr-2" />
              <span className="text-gray-600 text-sm">Redirecting...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900">
      <div className="absolute top-6 left-6 z-50">
        <Link href="/auth/signin">
          <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sign In
          </Button>
        </Link>
      </div>
      <div className="hidden lg:flex w-full">
        <div className="w-1/2 relative flex items-center justify-center p-8">
          <div className="relative z-10 text-center text-white max-w-md">
            <div className="w-80 h-80 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-blue-400/20 to-indigo-400/20 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-300/30 to-indigo-300/30 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                    <GraduationCap className="w-12 h-12 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-2">Create New Password</h2>
                <h3 className="text-xl font-medium text-blue-200">Secure your account</h3>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <p className="text-sm text-white/80">Choose a strong password to protect your account</p>
            </div>
          </div>
          <div className="absolute top-20 left-20 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>
        </div>
        <div className="w-1/2 bg-white flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <GraduationCap className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
              <p className="text-gray-600">Enter your new password below</p>
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
                  New Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full h-12 text-base border-gray-300 focus:border-blue-600 focus:ring-blue-600 rounded-lg pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {password && (
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">Password strength</span>
                      <span className={`font-semibold ${passwordStrength(password) >= 3 ? 'text-green-600' : 'text-gray-600'}`}>
                        {getStrengthText(passwordStrength(password))}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(passwordStrength(password))}`}
                        style={{ width: `${(passwordStrength(password) / 4) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full h-12 text-base border-gray-300 focus:border-blue-600 focus:ring-blue-600 rounded-lg pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 h-12 rounded-lg font-medium text-base"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <LoaderComponent size="sm" variant="minimal" color="secondary" className="mr-3" />
                    Resetting Password...
                  </div>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
      <div className="lg:hidden w-full min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6 text-white">
          <div className="text-center max-w-sm">
            <div className="w-64 h-64 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-400/20 to-indigo-400/20 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-300/30 to-indigo-300/30 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                    <GraduationCap className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h2 className="text-lg font-bold mb-1">Create New Password</h2>
                <h3 className="text-base font-medium text-blue-200">Secure your account</h3>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-t-3xl p-6 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Reset Password</h1>
            <p className="text-gray-600 text-sm">Enter your new password below</p>
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
                New Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full h-11 text-sm border-gray-300 focus:border-blue-600 focus:ring-blue-600 rounded-lg pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <div className="space-y-1 mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Strength</span>
                    <span className={`font-medium ${passwordStrength(password) >= 3 ? 'text-green-600' : 'text-gray-600'}`}>
                      {getStrengthText(passwordStrength(password))}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${getStrengthColor(passwordStrength(password))}`}
                      style={{ width: `${(passwordStrength(password) / 4) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full h-11 text-sm border-gray-300 focus:border-blue-600 focus:ring-blue-600 rounded-lg pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 h-11 rounded-lg font-medium"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <LoaderComponent size="sm" variant="minimal" color="secondary" className="mr-2" />
                  Resetting...
                </div>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<PageLoader message="Loading reset password page..." />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
