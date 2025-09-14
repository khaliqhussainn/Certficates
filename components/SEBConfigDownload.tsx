// components/SEBConfigDownload.tsx - FIXED FOR SEB v3.10
import { useState } from 'react'
import { Download, Shield, CheckCircle, AlertTriangle, Monitor, RefreshCw } from 'lucide-react'

interface SEBConfigDownloadProps {
  courseId: string
  sessionId?: string
  onConfigDownloaded?: () => void
}

export function SEBConfigDownload({ courseId, sessionId, onConfigDownloaded }: SEBConfigDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [configGenerated, setConfigGenerated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const downloadConfig = async () => {
    setIsDownloading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({ courseId })
      if (sessionId) {
        params.append('sessionId', sessionId)
      }
      
      const response = await fetch(`/api/exam/seb-config?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to generate configuration')
      }
      
      // Get the blob and create download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `secure_exam_${courseId}_config.seb`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      setConfigGenerated(true)
      onConfigDownloaded?.()
      
      // Show detailed setup instructions
      setTimeout(() => {
        showSetupInstructions()
      }, 500)
      
    } catch (error) {
      console.error('Config download error:', error)
      setError(error instanceof Error ? error.message : 'Failed to download configuration')
    } finally {
      setIsDownloading(false)
    }
  }

  const showSetupInstructions = () => {
    alert(`✅ SEB Configuration Downloaded Successfully!

📋 COMPLETE SETUP INSTRUCTIONS FOR SEB v3.10:

🔧 STEP 1: INSTALL SAFE EXAM BROWSER
   • Download from: https://safeexambrowser.org/download_en.html
   • Choose version 3.6 or higher
   • Install with administrator privileges
   • Restart your computer after installation

🔒 STEP 2: PREPARE YOUR SYSTEM
   • Close ALL applications (including browsers, chat apps, etc.)
   • Disable antivirus notifications temporarily
   • Ensure stable internet connection
   • Close any cloud sync services (Dropbox, OneDrive, etc.)

📁 STEP 3: START YOUR SECURE EXAM
   • Locate the downloaded .seb file in your Downloads folder
   • Double-click the .seb file (it should open with SEB automatically)
   • If it doesn't open, right-click → "Open with" → "Safe Exam Browser"
   • Your exam will load automatically in the secure environment

🔐 IMPORTANT SECURITY NOTES:
   • DO NOT try to open other applications after SEB starts
   • Your screen will be locked to the exam interface
   • Emergency password: admin123 (only for technical issues)
   • If you need help, contact support BEFORE starting the exam

⚠️ TROUBLESHOOTING:
   • File won't open? Reinstall SEB with admin rights
   • Exam won't load? Check your internet connection
   • SEB crashes? Restart computer and try again
   • Still having issues? Contact our support team

🎯 EXAM WILL START IMMEDIATELY after opening the .seb file!`)
  }

  return (
    <div className="space-y-6">
      {/* Main Info Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <Shield className="w-8 h-8 text-blue-600 mr-3 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Secure Exam Environment Required
            </h3>
            <p className="text-blue-700 mb-4 text-sm leading-relaxed">
              This certification exam requires Safe Exam Browser (SEB) v3.6+ to ensure test integrity and prevent cheating. 
              SEB creates a controlled, monitored environment for your exam.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-900 text-sm">🔒 Security Features:</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Blocks screen recording & screenshots</li>
                  <li>• Disables keyboard shortcuts (Alt+Tab, Ctrl+C, etc.)</li>
                  <li>• Prevents application switching</li>
                  <li>• Monitors for security violations</li>
                  <li>• Blocks virtual machines</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-900 text-sm">🚫 Blocked Applications:</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Web browsers (Chrome, Firefox, Edge)</li>
                  <li>• Communication apps (Discord, Teams)</li>
                  <li>• Screen capture software (OBS, etc.)</li>
                  <li>• Remote access tools (TeamViewer)</li>
                  <li>• System utilities (Task Manager, CMD)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={downloadConfig}
          disabled={isDownloading}
          className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDownloading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              Generating Config...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Download SEB Configuration
            </>
          )}
        </button>
        
        <a
          href="https://safeexambrowser.org/download_en.html"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
        >
          <Monitor className="w-4 h-4 mr-2" />
          Download SEB Browser
        </a>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-red-900 mb-1">Configuration Error</p>
              <p className="text-red-700">{error}</p>
              <button
                onClick={downloadConfig}
                className="mt-2 text-red-600 hover:text-red-800 font-medium text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {configGenerated && !error && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-green-900 mb-1">Configuration Downloaded!</p>
              <p className="text-green-700 mb-2">
                Your SEB configuration file has been downloaded. Follow the setup instructions that appeared 
                to prepare your secure exam environment.
              </p>
              <button
                onClick={showSetupInstructions}
                className="text-green-600 hover:text-green-800 font-medium text-sm"
              >
                Show Instructions Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version Info */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Compatible with Safe Exam Browser v3.6+ • Generated for SEB v3.10
        </p>
      </div>
    </div>
  )
}