// app/seb-required/page.tsx - SEB Required Setup Page
'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Shield, Download, Monitor, AlertCircle, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react'
import { SEBConfigDownload, useSafeExamBrowser } from '@/components/SafeExamBrowser'

export default function SEBRequiredPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sebInfo = useSafeExamBrowser()
  const [isChecking, setIsChecking] = useState(false)
  
  const returnUrl = searchParams.get('returnUrl') || '/'
  const courseId = extractCourseIdFromUrl(returnUrl)

  function extractCourseIdFromUrl(url: string): string {
    const match = url.match(/\/exam\/([^\/\?]+)/)
    return match ? match[1] : ''
  }

  const handleCheckAgain = () => {
    setIsChecking(true)
    setTimeout(() => {
      setIsChecking(false)
      if (sebInfo.isSEB) {
        // Redirect back to exam if SEB is now detected
        router.push(returnUrl + (returnUrl.includes('?') ? '&' : '?') + 'seb=true')
      }
    }, 2000)
  }

  useEffect(() => {
    // Auto-redirect if SEB is detected
    if (sebInfo.isSEB && sebInfo.isVerified) {
      setTimeout(() => {
        router.push(returnUrl + (returnUrl.includes('?') ? '&' : '?') + 'seb=true')
      }, 1000)
    }
  }, [sebInfo.isSEB, sebInfo.isVerified, returnUrl, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-6">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Secure Exam Environment Required
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              This certification exam requires Safe Exam Browser (SEB) to ensure test integrity 
              and prevent cheating during your assessment.
            </p>
          </div>

          {/* SEB Status */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Safe Exam Browser Status</h2>
              {sebInfo.isSEB ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-500" />
              )}
            </div>
            
            {sebInfo.isSEB ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                  <span className="text-lg font-semibold text-green-800">
                    SEB Detected Successfully! 
                  </span>
                </div>
                <div className="text-green-700 space-y-2">
                  <p><strong>Version:</strong> {sebInfo.version}</p>
                  <p><strong>Detection Method:</strong> {sebInfo.detectionMethod}</p>
                  <p><strong>Security Mode:</strong> {sebInfo.securityMode}</p>
                </div>
                <div className="mt-6">
                  <button
                    onClick={() => router.push(returnUrl + (returnUrl.includes('?') ? '&' : '?') + 'seb=true')}
                    className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                  >
                    Continue to Exam
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
                  <span className="text-lg font-semibold text-red-800">
                    SEB Not Detected
                  </span>
                </div>
                <p className="text-red-700 mb-6">
                  Safe Exam Browser must be installed and running to access this exam. 
                  Please follow the setup instructions below.
                </p>
                <button
                  onClick={handleCheckAgain}
                  disabled={isChecking}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  {isChecking ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Check Again
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {!sebInfo.isSEB && (
            <>
              {/* Setup Instructions */}
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white font-bold">1</span>
                    </div>
                    <h3 className="text-xl font-semibold">Download & Install SEB</h3>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Download the official Safe Exam Browser from the official website and install it with administrator privileges.
                  </p>
                  <a
                    href="https://safeexambrowser.org/download_en.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    <Monitor className="w-4 h-4 mr-2" />
                    Download SEB Browser
                  </a>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white font-bold">2</span>
                    </div>
                    <h3 className="text-xl font-semibold">Download Exam Config</h3>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Download your personalized exam configuration file that will automatically set up SEB for your exam.
                  </p>
                  {courseId && (
                    <SEBConfigDownload
                      courseId={courseId}
                      onConfigGenerated={() => {
                        alert('✅ Configuration downloaded!\n\n📋 Next steps:\n1. Close this browser\n2. Double-click the .seb file\n3. Your exam will open in SEB automatically')
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Step-by-step instructions */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h3 className="text-2xl font-semibold mb-6">Complete Setup Instructions</h3>
                <div className="space-y-6">
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-4 mt-1">
                      <span className="text-white text-sm font-bold">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Install Safe Exam Browser</h4>
                      <p className="text-gray-600">
                        Download SEB 3.6+ from the official website and install with administrator privileges. 
                        Make sure to get the latest version for best security and compatibility.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-4 mt-1">
                      <span className="text-white text-sm font-bold">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Download Exam Configuration</h4>
                      <p className="text-gray-600">
                        Click the "Download SEB Configuration" button above to get your personalized .seb file. 
                        This file contains all the security settings for your exam.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center mr-4 mt-1">
                      <span className="text-white text-sm font-bold">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Close All Applications</h4>
                      <p className="text-gray-600 mb-2">
                        <strong>IMPORTANT:</strong> Before starting your exam, close:
                      </p>
                      <ul className="text-gray-600 list-disc list-inside space-y-1">
                        <li>All browser windows and tabs</li>
                        <li>Messaging apps (WhatsApp, Telegram, Discord, etc.)</li>
                        <li>Screen recording software (OBS, Bandicam, etc.)</li>
                        <li>Remote access tools (TeamViewer, Chrome Remote Desktop)</li>
                        <li>Any other unnecessary applications</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-4 mt-1">
                      <span className="text-white text-sm font-bold">4</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Start Your Exam</h4>
                      <p className="text-gray-600">
                        Double-click the downloaded .seb file. SEB will launch automatically and load your exam 
                        in a secure environment. Your exam will begin once SEB has loaded.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Emergency Info */}
                <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-amber-600 mr-2 mt-0.5" />
                    <div className="text-amber-800">
                      <h4 className="font-semibold mb-1">Emergency Access</h4>
                      <p className="text-sm">
                        If you experience technical difficulties during the exam, press <strong>Ctrl+Alt+F1</strong> and 
                        enter the admin password: <code className="bg-amber-100 px-1 rounded">admin123</code>. 
                        Only use this for genuine technical issues.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Features */}
              <div className="bg-white rounded-xl shadow-lg p-8 mt-8">
                <h3 className="text-2xl font-semibold mb-6">Security Features Active During Exam</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">✅ What's Enabled:</h4>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Fullscreen lock mode
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Real-time violation monitoring
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Secure exam environment
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Automatic session management
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">🚫 What's Blocked:</h4>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-center">
                        <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                        Alt+Tab (app switching)
                      </li>
                      <li className="flex items-center">
                        <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                        Ctrl+C/V (copy/paste)
                      </li>
                      <li className="flex items-center">
                        <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                        F12, F11 (dev tools, fullscreen)
                      </li>
                      <li className="flex items-center">
                        <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                        Screen recording software
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Back button */}
          <div className="text-center mt-8">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}