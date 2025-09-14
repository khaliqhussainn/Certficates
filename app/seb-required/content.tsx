// app/seb-required/content.tsx - Main SEB component
'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Shield, Download, Monitor, AlertCircle, ArrowLeft, CheckCircle, ArrowRight, RefreshCw, AlertTriangle, Settings, Play } from 'lucide-react'

// SEB Detection Hook (simplified for this component)
function useSafeExamBrowser() {
  const [sebInfo, setSebInfo] = useState({
    isSEB: false,
    isVerified: false,
    version: '',
    detectionMethod: 'none'
  })

  useEffect(() => {
    const detectSEB = () => {
      const win = window as any
      let detected = false
      let version = ''
      let method = 'none'
      let verified = false

      // Modern SEB API
      if (win.SafeExamBrowser_) {
        detected = true
        version = 'Modern API'
        method = 'JavaScript API'
        verified = true
      }
      // Legacy SEB
      else if (win.SafeExamBrowser) {
        detected = true
        version = win.SafeExamBrowser.version || 'Legacy'
        method = 'SafeExamBrowser Object'
        verified = true
      }
      // User Agent fallback
      else {
        const userAgent = navigator.userAgent
        const sebPatterns = [/SEB[\s\/][\d\.]+/i, /SafeExamBrowser/i, /Safe.*Exam.*Browser/i]
        
        if (sebPatterns.some(pattern => pattern.test(userAgent))) {
          detected = true
          const versionMatch = userAgent.match(/SEB[\s\/]([\d\.]+)/i)
          version = versionMatch ? versionMatch[1] : 'Unknown'
          method = 'User Agent'
          verified = false
        }
      }

      setSebInfo({ isSEB: detected, isVerified: verified, version, detectionMethod: method })
    }

    detectSEB()
    const interval = setInterval(detectSEB, 2000)
    return () => clearInterval(interval)
  }, [])

  return sebInfo
}

// SEB Config Generator
function generateSEBConfig(courseId: string, examURL: string) {
  const quitURL = `${new URL(examURL).origin}/courses/${courseId}`
  
  return {
    startURL: examURL,
    quitURL: quitURL,
    sendBrowserExamKey: true,
    allowQuit: true,
    quitExamPasswordHash: btoa("admin123"),
    quitExamText: "Enter administrator password to quit exam:",
    
    // Lockdown settings
    ignoreExitKeys: true,
    enableF1: false,
    enableF3: false,
    enableF12: false,
    enableCtrlEsc: false,
    enableAltEsc: false,
    enableAltTab: false,
    enableAltF4: false,
    enableRightMouse: false,
    enablePrintScreen: false,
    enableEsc: false,
    enableCtrlAltDel: false,
    
    // Browser restrictions
    allowBrowsingBackForward: false,
    allowReload: false,
    showReloadButton: false,
    allowAddressBar: false,
    allowNavigationBar: false,
    showNavigationButtons: false,
    newBrowserWindowByLinkPolicy: 0,
    newBrowserWindowByScriptPolicy: 0,
    blockPopUpWindows: true,
    
    // Content restrictions
    allowCopy: false,
    allowCut: false,
    allowPaste: false,
    allowSpellCheck: false,
    allowDictation: false,
    
    // Security
    enableLogging: true,
    logLevel: 2,
    detectVirtualMachine: true,
    allowVirtualMachine: false,
    forceAppFolderInstall: true,
    
    // URL filtering
    URLFilterEnable: true,
    URLFilterEnableContentFilter: true,
    urlFilterRules: [
      { action: 1, active: true, expression: examURL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") },
      { action: 1, active: true, expression: `${new URL(examURL).origin}/api/exam/*` },
      { action: 0, active: true, expression: "*" }
    ],
    
    // Process blocking
    prohibitedProcesses: [
      { active: true, currentUser: true, description: "Block OBS", executable: "obs", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block TeamViewer", executable: "TeamViewer", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block Discord", executable: "Discord", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block Chrome", executable: "chrome", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block Firefox", executable: "firefox", windowHandling: 1 }
    ]
  }
}

// SEB Config Download Component
function SEBConfigDownload({ courseId, onConfigGenerated }: { courseId: string; onConfigGenerated?: () => void }) {
  const [isGenerating, setIsGenerating] = useState(false)

  const downloadConfig = async () => {
    setIsGenerating(true)
    try {
      const baseURL = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const examURL = `${baseURL}/exam/${courseId}?seb=true`
      const config = generateSEBConfig(courseId, examURL)
      
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/seb' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `secure_exam_${courseId}_config.seb`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      onConfigGenerated?.()
    } catch (error) {
      console.error('Config generation error:', error)
      alert('Failed to generate configuration. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <button
      onClick={downloadConfig}
      disabled={isGenerating}
      className="inline-flex items-center px-6 py-3 bg-[#001e62] text-white rounded-lg hover:bg-[#001e62]/90 transition-colors font-medium disabled:opacity-50"
    >
      {isGenerating ? (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}
      {isGenerating ? 'Generating...' : 'Download SEB Config'}
    </button>
  )
}

function extractCourseIdFromUrl(url: string): string {
  const match = url.match(/\/exam\/([^\/\?]+)/)
  return match ? match[1] : ''
}

export default function SEBRequiredContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sebInfo = useSafeExamBrowser()
  const [isChecking, setIsChecking] = useState(false)
  const [configDownloaded, setConfigDownloaded] = useState(false)
  
  const returnUrl = searchParams.get('returnUrl') || '/'
  const courseId = extractCourseIdFromUrl(returnUrl)

  const handleCheckAgain = () => {
    setIsChecking(true)
    setTimeout(() => {
      setIsChecking(false)
      if (sebInfo.isSEB) {
        router.push(returnUrl + (returnUrl.includes('?') ? '&' : '?') + 'seb=true')
      }
    }, 2000)
  }

  const handleConfigDownloaded = () => {
    setConfigDownloaded(true)
    alert(`✅ SEB Configuration Downloaded Successfully!

📋 NEXT STEPS:

1️⃣ INSTALL SAFE EXAM BROWSER:
   • Visit: https://safeexambrowser.org/download_en.html
   • Download version 3.6+ for your OS
   • Install with administrator privileges

2️⃣ CLOSE ALL APPLICATIONS:
   • Close ALL browser windows completely
   • Exit messaging apps (WhatsApp, Discord, Telegram)
   • Stop screen recording software (OBS, etc.)
   • Close remote access tools (TeamViewer, etc.)

3️⃣ START SECURE EXAM:
   • Double-click the downloaded .seb file
   • SEB will launch automatically in secure mode
   • Your exam will load in the locked environment

🔐 EMERGENCY ACCESS:
   Admin Password: admin123
   (Only use if you encounter technical issues)

⚠️ IMPORTANT: Do not open any other applications after starting SEB!`)
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
        <div className="max-w-5xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-[#001e62] rounded-full mb-6">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Secure Exam Environment Required
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              This professional certificate exam requires Safe Exam Browser (SEB) to ensure 
              academic integrity and prevent unauthorized assistance during assessment.
            </p>
          </div>

          {/* SEB Status Card */}
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
                  <p><strong>Security Status:</strong> {sebInfo.isVerified ? 'Verified' : 'Basic Detection'}</p>
                </div>
                <div className="mt-6">
                  <button
                    onClick={() => router.push(returnUrl + (returnUrl.includes('?') ? '&' : '?') + 'seb=true')}
                    className="inline-flex items-center px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-lg"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Continue to Secure Exam
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
                  Safe Exam Browser must be installed and running to access this secure certificate exam. 
                  Please follow the setup instructions below.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={handleCheckAgain}
                    disabled={isChecking}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                  >
                    {isChecking ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    {isChecking ? 'Checking...' : 'Check Again'}
                  </button>
                  
                  {process.env.NODE_ENV === 'development' && (
                    <button
                      onClick={() => router.push(returnUrl)}
                      className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Skip (Dev Mode)
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {!sebInfo.isSEB && (
            <>
              {/* Setup Steps */}
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-[#001e62] rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white font-bold">1</span>
                    </div>
                    <h3 className="text-xl font-semibold">Download & Install SEB</h3>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Download the official Safe Exam Browser and install it with administrator privileges. 
                    Ensure you get the latest version for optimal security.
                  </p>
                  <a
                    href="https://safeexambrowser.org/download_en.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-[#001e62] text-white rounded-lg hover:bg-[#001e62]/90 font-medium"
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
                    Download your personalized exam configuration file that will automatically 
                    configure SEB with the correct security settings.
                  </p>
                  {courseId && (
                    <SEBConfigDownload
                      courseId={courseId}
                      onConfigGenerated={handleConfigDownloaded}
                    />
                  )}
                </div>
              </div>
            </>
          )}

          {/* Back button */}
          <div className="text-center mt-8">
            <button
              onClick={() => router.push('/courses')}
              className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Courses
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}