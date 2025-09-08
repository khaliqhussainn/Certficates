// app/auth/signup/page.tsx - Certificate Website (Styled like Course Website)

'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Eye, EyeOff, AlertCircle, ArrowLeft, GraduationCap, CheckCircle } from 'lucide-react'
import LoaderComponent from '@/components/Loader'

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [success, setSuccess] = useState(false)

  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long')
      return false
    }
    if (!agreeToTerms) {
      setError('Please agree to terms and privacy policy')
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password
        })
      })
      const data = await response.json()
      
      if (response.ok) {
        setSuccess(true)
        setTimeout(async () => {
          const result = await signIn('credentials', {
            email: formData.email,
            password: formData.password,
            redirect: false,
          })
          if (result?.ok) {
            window.location.replace('/dashboard')
          } else {
            router.push('/auth/signin?message=Account created successfully')
          }
        }, 2000)
      } else {
        setError(data.error || 'Registration failed')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

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

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 relative overflow-hidden">
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">Account Created!</h1>
              <p className="text-white/70 mb-4">
                Welcome to CertifyPro! Redirecting you to your dashboard...
              </p>
              <div className="flex items-center justify-center">
                <LoaderComponent size="sm" variant="minimal" color="secondary" className="mr-2" />
                <span className="text-white/80 text-sm">Setting up your account...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900">
      {/* Back to Home Button */}
      <div className="absolute top-6 left-6 z-50">
        <Link href="/">
          <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:flex w-full">
        {/* Left Side - Sign Up Form */}
        <div className="w-1/2 bg-white flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <GraduationCap className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
              <p className="text-gray-600">Join thousands earning industry certificates</p>
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
                  Full Name
                </label>
                <Input
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="w-full h-12 text-base border-gray-300 focus:border-blue-600 focus:ring-blue-600 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <Input
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="w-full h-12 text-base border-gray-300 focus:border-blue-600 focus:ring-blue-600 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={handleChange}
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
                {formData.password && (
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">Password strength</span>
                      <span className={`font-semibold ${passwordStrength(formData.password) >= 3 ? 'text-green-600' : 'text-gray-600'}`}>
                        {getStrengthText(passwordStrength(formData.password))}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(passwordStrength(formData.password))}`}
                        style={{ width: `${(passwordStrength(formData.password) / 4) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
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

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                  I agree to the{' '}
                  <Link href="/terms" className="text-blue-600 hover:text-blue-500">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-blue-600 hover:text-blue-500">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 h-12 rounded-lg font-medium text-base"
                disabled={loading || !agreeToTerms}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <LoaderComponent size="sm" variant="minimal" color="secondary" className="mr-3" />
                    Creating Account...
                  </div>
                ) : (
                  'Create Account'
                )}
              </Button>

              <div className="text-center">
                <span className="text-sm text-gray-600">Or sign up using</span>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg"
                onClick={() => signIn('google')}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/auth/signin" className="text-blue-600 hover:text-blue-500 font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Certificate Illustration */}
        <div className="w-1/2 relative flex items-center justify-center p-8">
          <div className="relative z-10 text-center text-white max-w-md">
            {/* Certificate Achievement Illustration */}
            <div className="w-80 h-80 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-blue-400/20 to-indigo-400/20 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-300/30 to-indigo-300/30 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                    <GraduationCap className="w-12 h-12 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-2">Start Your Journey</h2>
                <h3 className="text-xl font-medium text-blue-200">Earn Professional Certificates</h3>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <p className="text-sm text-white/80">Join thousands of professionals advancing their careers</p>
            </div>
          </div>

          {/* Background decorative elements */}
          <div className="absolute top-20 left-20 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="lg:hidden w-full min-h-screen flex flex-col">
        {/* Mobile Hero Section */}
        <div className="flex-1 flex items-center justify-center p-6 text-white">
          <div className="text-center max-w-sm">
            {/* Mobile Certificate Illustration */}
            <div className="w-64 h-64 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-400/20 to-indigo-400/20 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-300/30 to-indigo-300/30 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                    <GraduationCap className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h2 className="text-lg font-bold mb-1">Start Your Journey</h2>
                <h3 className="text-base font-medium text-blue-200">Earn Professional Certificates</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Form Section */}
        <div className="bg-white rounded-t-3xl p-6 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Create Account</h1>
            <p className="text-gray-600 text-sm">Join thousands earning industry certificates</p>
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
                Full Name
              </label>
              <Input
                name="name"
                type="text"
                placeholder="Enter your name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full h-11 text-sm border-gray-300 focus:border-blue-600 focus:ring-blue-600 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <Input
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full h-11 text-sm border-gray-300 focus:border-blue-600 focus:ring-blue-600 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create password"
                  value={formData.password}
                  onChange={handleChange}
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
              {formData.password && (
                <div className="space-y-1 mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Strength</span>
                    <span className={`font-medium ${passwordStrength(formData.password) >= 3 ? 'text-green-600' : 'text-gray-600'}`}>
                      {getStrengthText(passwordStrength(formData.password))}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${getStrengthColor(passwordStrength(formData.password))}`}
                      style={{ width: `${(passwordStrength(formData.password) / 4) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
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

            <div className="flex items-center text-sm">
              <input
                type="checkbox"
                id="mobile-terms"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-600"
              />
              <label htmlFor="mobile-terms" className="ml-2 text-gray-600">
                I agree to the{' '}
                <Link href="/terms" className="text-blue-600 hover:text-blue-500">
                  Terms
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-blue-600 hover:text-blue-500">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 h-11 rounded-lg font-medium"
              disabled={loading || !agreeToTerms}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <LoaderComponent size="sm" variant="minimal" color="secondary" className="mr-2" />
                  Creating...
                </div>
              ) : (
                'Create Account'
              )}
            </Button>

            <div className="text-center">
              <span className="text-sm text-gray-600">Or sign up using</span>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm"
              onClick={() => signIn('google')}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign up with Google
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-blue-600 hover:text-blue-500 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}