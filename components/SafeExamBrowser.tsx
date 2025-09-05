// components/SafeExamBrowser.tsx - SEB Integration Component
'use client'
import { useEffect, useState } from 'react'

interface SEBConfig {
  examURL: string
  quitURL: string
  sebConfigKey: string
  browserExamKey: string
  hashedQuitPassword: string
}

export function SafeExamBrowserDetector() {
  const [isSEB, setIsSEB] = useState(false)
  const [sebInfo, setSebInfo] = useState<any>(null)

  useEffect(() => {
    detectSEB()
  }, [])

  const detectSEB = () => {
    // Check for SEB specific properties
    const userAgent = navigator.userAgent
    const isSEBDetected = userAgent.includes('SEB') || 
                         userAgent.includes('SafeExamBrowser') ||
                         (window as any).SafeExamBrowser !== undefined

    setIsSEB(isSEBDetected)

    // Get SEB specific information if available
    if ((window as any).SafeExamBrowser) {
      setSebInfo({
        version: (window as any).SafeExamBrowser.version,
        configKey: (window as any).SafeExamBrowser.configKey,
        browserExamKey: (window as any).SafeExamBrowser.browserExamKey
      })
    }
  }

  return { isSEB, sebInfo }
}

// Safe Exam Browser configuration generator
export function generateSEBConfig(courseId: string, examSessionId: string): SEBConfig {
  const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'
  
  return {
    examURL: `${baseURL}/exam/${courseId}?session=${examSessionId}&seb=true`,
    quitURL: `${baseURL}/exam/completed`,
    sebConfigKey: generateConfigKey(courseId),
    browserExamKey: generateBrowserExamKey(examSessionId),
    hashedQuitPassword: hashPassword('admin123') // Change this in production
  }
}

function generateConfigKey(courseId: string): string {
  // Generate a unique config key for the course
  return btoa(`course_${courseId}_${Date.now()}`).substring(0, 16)
}

function generateBrowserExamKey(sessionId: string): string {
  // Generate a unique browser exam key for the session
  return btoa(`session_${sessionId}_${Date.now()}`).substring(0, 16)
}

function hashPassword(password: string): string {
  // Simple hash for demo - use proper crypto in production
  return btoa(password)
}

// SEB Configuration File Component
export function SEBConfigDownload({ courseId, examSessionId }: { courseId: string, examSessionId: string }) {
  const downloadSEBConfig = () => {
    const config = generateSEBConfig(courseId, examSessionId)
    
    const sebConfig = {
      // Basic SEB Settings
      "startURL": config.examURL,
      "quitURL": config.quitURL,
      "sendBrowserExamKey": true,
      "examKeySalt": config.sebConfigKey,
      "browserExamKey": config.browserExamKey,
      
      // Security Settings
      "allowQuit": false,
      "ignoreExitKeys": true,
      "enableF3": false,
      "enableF1": false,
      "enableCtrlEsc": false,
      "enableAltEsc": false,
      "enableAltTab": false,
      "enableAltF4": false,
      "enableRightMouse": false,
      "enablePrintScreen": false,
      "enableAltMouseWheel": false,
      
      // Browser Settings
      "allowBrowsingBackForward": false,
      "allowReload": false,
      "showReloadButton": false,
      "allowAddressBar": false,
      "allowNavigationBar": false,
      "newBrowserWindowByLinkPolicy": 0,
      "newBrowserWindowByScriptPolicy": 0,
      
      // Exam Settings
      "restartExamPasswordHash": config.hashedQuitPassword,
      "restartExamText": "Enter administrator password to restart exam:",
      "quitExamPasswordHash": config.hashedQuitPassword,
      "quitExamText": "Enter administrator password to quit exam:",
      
      // Monitoring
      "enableLogging": true,
      "logLevel": 2,
      "allowApplicationLog": true,
      "allowWindowCapture": false,
      
      // Additional Security
      "detectVirtualMachine": true,
      "allowVirtualMachine": false,
      "allowScreenSharing": false,
      "allowSiri": false,
      "allowDictation": false,
      "allowSpellCheck": false,
      "allowRemoteAppConnection": false
    }

    const blob = new Blob([JSON.stringify(sebConfig, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `exam_${courseId}_config.seb`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={downloadSEBConfig}
      className="bg-[#001e62] text-white px-4 py-2 rounded-lg hover:bg-[#001e62]/90 transition-colors"
    >
      Download SEB Config
    </button>
  )
}

// SEB Status Component for Exam Page
export function SEBStatus() {
  const { isSEB, sebInfo } = SafeExamBrowserDetector()

  if (!isSEB) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <strong className="font-bold">Security Warning!</strong>
        <span className="block sm:inline"> This exam requires Safe Exam Browser (SEB) for security.</span>
      </div>
    )
  }

  return (
    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
      <strong className="font-bold">Secure Environment Detected</strong>
      <span className="block sm:inline"> Safe Exam Browser is active.</span>
      {sebInfo && (
        <div className="text-sm mt-1">
          Version: {sebInfo.version} | Config Key: {sebInfo.configKey?.substring(0, 8)}...
        </div>
      )}
    </div>
  )
}