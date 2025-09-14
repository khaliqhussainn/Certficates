// hooks/useSafeExamBrowser.ts - Enhanced SEB Detection
import { useState, useEffect, useCallback } from 'react'

interface SEBInfo {
  isSEB: boolean
  isVerified: boolean
  securityLevel: 'none' | 'basic' | 'enhanced' | 'maximum'
  detectionMethod: string
  version?: string
  platform?: string
  browserExamKey?: string
  configKey?: string
  capabilities: {
    hasJavaScriptAPI: boolean
    hasConfigValidation: boolean
    hasKeyValidation: boolean
    hasVersionInfo: boolean
  }
  violations: string[]
  recommendations: string[]
}

interface SEBValidationResponse {
  isValid: boolean
  validationMethod: string
  securityLevel: string
  sebInfo: {
    detected: boolean
    version?: string
    securityMode: string
    isVerified: boolean
  }
  issues?: string[]
  recommendations: string[]
}

declare global {
  interface Window {
    SafeExamBrowser_?: {
      getConfigKey?: () => string
      getBrowserExamKey?: () => string
      security?: {
        isSecureMode: boolean
      }
    }
    SafeExamBrowser?: {
      version?: string
      platform?: string
      configKey?: string
      browserExamKey?: string
    }
  }
}

export function useSafeExamBrowser() {
  const [sebInfo, setSebInfo] = useState<SEBInfo>({
    isSEB: false,
    isVerified: false,
    securityLevel: 'none',
    detectionMethod: 'none',
    capabilities: {
      hasJavaScriptAPI: false,
      hasConfigValidation: false,
      hasKeyValidation: false,
      hasVersionInfo: false
    },
    violations: [],
    recommendations: []
  })
  
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<SEBValidationResponse | null>(null)

  const detectSEB = useCallback((): SEBInfo => {
    const win = window as any
    const userAgent = navigator.userAgent
    
    let result: SEBInfo = {
      isSEB: false,
      isVerified: false,
      securityLevel: 'none',
      detectionMethod: 'none',
      capabilities: {
        hasJavaScriptAPI: false,
        hasConfigValidation: false,
        hasKeyValidation: false,
        hasVersionInfo: false
      },
      violations: [],
      recommendations: []
    }

    try {
      // Method 1: Modern SEB JavaScript API (SEB 3.4+ Windows, 3.0+ macOS/iOS)
      if (win.SafeExamBrowser_) {
        result = detectModernSEB(win.SafeExamBrowser_, result)
      }
      // Method 2: Legacy SafeExamBrowser object
      else if (win.SafeExamBrowser) {
        result = detectLegacySEB(win.SafeExamBrowser, result)
      }
      // Method 3: User Agent Detection (fallback)
      else {
        result = detectUserAgentSEB(userAgent, result)
      }

      // Additional validation
      result = performAdditionalValidation(result)
      
      // Generate recommendations
      result = generateRecommendations(result)

    } catch (error) {
      console.error('SEB detection error:', error)
      result.violations.push(`Detection error: ${error}`)
    }

    return result
  }, [])

  const detectModernSEB = (sebAPI: any, result: SEBInfo): SEBInfo => {
    result.isSEB = true
    result.securityLevel = 'maximum'
    result.detectionMethod = 'Modern JavaScript API'
    result.isVerified = true
    result.version = 'Modern API'
    result.platform = 'Modern SEB'
    
    result.capabilities.hasJavaScriptAPI = true
    
    try {
      if (typeof sebAPI.getConfigKey === 'function') {
        result.configKey = sebAPI.getConfigKey()
        result.capabilities.hasConfigValidation = true
      }
      
      if (typeof sebAPI.getBrowserExamKey === 'function') {
        result.browserExamKey = sebAPI.getBrowserExamKey()
        result.capabilities.hasKeyValidation = true
      }
      
      if (sebAPI.security?.isSecureMode) {
        result.securityLevel = 'maximum'
      }
      
    } catch (error) {
      result.violations.push(`Modern SEB API error: ${error}`)
      result.securityLevel = 'enhanced'
    }
    
    return result
  }

  const detectLegacySEB = (seb: any, result: SEBInfo): SEBInfo => {
    result.isSEB = true
    result.securityLevel = 'enhanced'
    result.detectionMethod = 'Legacy SafeExamBrowser Object'
    result.isVerified = true
    
    if (seb.version) {
      result.version = seb.version
      result.capabilities.hasVersionInfo = true
    }
    
    if (seb.platform) {
      result.platform = seb.platform
    }
    
    if (seb.configKey) {
      result.configKey = seb.configKey
      result.capabilities.hasConfigValidation = true
    }
    
    if (seb.browserExamKey) {
      result.browserExamKey = seb.browserExamKey
      result.capabilities.hasKeyValidation = true
    }
    
    // Upgrade security level if both keys are present
    if (result.configKey && result.browserExamKey) {
      result.securityLevel = 'maximum'
    }
    
    return result
  }

  const detectUserAgentSEB = (userAgent: string, result: SEBInfo): SEBInfo => {
    const sebPatterns = [
      /SEB[\s\/]([\d\.]+)/i,
      /SafeExamBrowser[\s\/]?([\d\.]*)/i,
      /Safe.*Exam.*Browser/i
    ]
    
    for (const pattern of sebPatterns) {
      const match = userAgent.match(pattern)
      if (match) {
        result.isSEB = true
        result.securityLevel = 'basic'
        result.detectionMethod = 'User Agent Pattern'
        result.isVerified = false
        
        if (match[1]) {
          result.version = match[1]
          result.capabilities.hasVersionInfo = true
        }
        
        break
      }
    }
    
    return result
  }

  const performAdditionalValidation = (result: SEBInfo): SEBInfo => {
    if (!result.isSEB) {
      return result
    }

    // Check for known SEB window properties
    const win = window as any
    const sebIndicators = [
      'sebWindow',
      'sebConfig',
      'SafeExamBrowser',
      'SafeExamBrowser_'
    ]
    
    let indicatorCount = 0
    sebIndicators.forEach(indicator => {
      if (win[indicator]) {
        indicatorCount++
      }
    })
    
    // Validate browser restrictions (SEB should block these)
    try {
      // Test if common shortcuts are blocked
      const testDiv = document.createElement('div')
      testDiv.addEventListener('contextmenu', (e) => {
        if (!e.defaultPrevented) {
          result.violations.push('Right-click not properly blocked')
        }
      })
      
      // Test fullscreen capability
      if (!document.fullscreenEnabled && result.securityLevel !== 'maximum') {
        result.violations.push('Fullscreen API may not be properly restricted')
      }
      
    } catch (error) {
      // Expected in SEB environment
    }
    
    // Validate security level based on capabilities
    if (result.capabilities.hasJavaScriptAPI && 
        result.capabilities.hasConfigValidation && 
        result.capabilities.hasKeyValidation) {
      result.securityLevel = 'maximum'
    } else if (result.capabilities.hasConfigValidation || 
               result.capabilities.hasKeyValidation) {
      result.securityLevel = 'enhanced'
    }
    
    return result
  }

  const generateRecommendations = (result: SEBInfo): SEBInfo => {
    if (!result.isSEB) {
      result.recommendations.push('Install Safe Exam Browser for secure exam access')
      result.recommendations.push('Download the latest SEB version from official website')
      return result
    }
    
    if (result.securityLevel === 'basic') {
      result.recommendations.push('Upgrade to newer SEB version for enhanced security')
      result.recommendations.push('Ensure SEB configuration is properly loaded')
    }
    
    if (result.violations.length > 0) {
      result.recommendations.push('Review and resolve security violations before proceeding')
    }
    
    if (!result.capabilities.hasKeyValidation) {
      result.recommendations.push('Enable browser exam key validation for maximum security')
    }
    
    if (!result.capabilities.hasConfigValidation) {
      result.recommendations.push('Load proper SEB configuration file')
    }
    
    return result
  }

  const validateSEBWithServer = async (sessionId: string): Promise<SEBValidationResponse | null> => {
    if (!sebInfo.isSEB) {
      return null
    }

    setIsValidating(true)
    
    try {
      const response = await fetch('/api/exam/seb-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          browserExamKey: sebInfo.browserExamKey,
          configKey: sebInfo.configKey,
          userAgent: navigator.userAgent,
          sebInfo: {
            version: sebInfo.version,
            platform: sebInfo.platform,
            securityMode: sebInfo.securityLevel,
            detectionMethod: sebInfo.detectionMethod,
            isVerified: sebInfo.isVerified
          }
        })
      })

      if (response.ok) {
        const result: SEBValidationResponse = await response.json()
        setValidationResult(result)
        return result
      }
    } catch (error) {
      console.error('SEB validation error:', error)
    } finally {
      setIsValidating(false)
    }

    return null
  }

  const downloadSEBConfig = async (courseId: string, sessionId?: string): Promise<void> => {
    try {
      const params = new URLSearchParams({ courseId })
      if (sessionId) {
        params.append('sessionId', sessionId)
      }
      
      const response = await fetch(`/api/exam/seb-config?${params}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `secure_exam_${courseId}_config.seb`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error downloading SEB config:', error)
      throw error
    }
  }

  // Effect for continuous detection
  useEffect(() => {
    // Initial detection
    const result = detectSEB()
    setSebInfo(result)
    
    // Set up periodic detection
    const interval = setInterval(() => {
      const newResult = detectSEB()
      setSebInfo(prev => {
        // Only update if something changed
        if (JSON.stringify(prev) !== JSON.stringify(newResult)) {
          return newResult
        }
        return prev
      })
    }, 3000) // Check every 3 seconds
    
    // Listen for custom SEB events
    const handleSEBReady = () => {
      setTimeout(() => {
        const newResult = detectSEB()
        setSebInfo(newResult)
      }, 100)
    }

    window.addEventListener('SEBReady', handleSEBReady)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('SEBReady', handleSEBReady)
    }
  }, [detectSEB])

  return {
    sebInfo,
    isValidating,
    validationResult,
    validateSEBWithServer,
    downloadSEBConfig,
    refresh: () => {
      const result = detectSEB()
      setSebInfo(result)
    }
  }
}

// Utility functions for components
export const getSEBStatusColor = (sebInfo: SEBInfo): string => {
  if (!sebInfo.isSEB) return 'text-red-500'
  
  switch (sebInfo.securityLevel) {
    case 'maximum': return 'text-green-500'
    case 'enhanced': return 'text-blue-500'
    case 'basic': return 'text-yellow-500'
    default: return 'text-gray-500'
  }
}

export const getSEBStatusMessage = (sebInfo: SEBInfo): string => {
  if (!sebInfo.isSEB) return 'Safe Exam Browser not detected'
  
  const messages = {
    maximum: 'Maximum security - SEB fully validated',
    enhanced: 'Enhanced security - SEB detected with validation',
    basic: 'Basic security - SEB detected',
    none: 'No security validation'
  }
  
  return messages[sebInfo.securityLevel] || 'Unknown security level'
}

export const isSEBProperlyConfigured = (sebInfo: SEBInfo): boolean => {
  return sebInfo.isSEB && sebInfo.isVerified && sebInfo.securityLevel !== 'basic'
}

export const getSEBSetupInstructions = (): string[] => {
  return [
    '1. Download Safe Exam Browser from https://safeexambrowser.org',
    '2. Install SEB with administrator privileges',
    '3. Close ALL applications and browser windows',
    '4. Download the exam configuration file (.seb) from your course',
    '5. Double-click the .seb file to start the secure exam',
    '6. Your exam will load automatically in the secure environment',
    '7. Emergency password: admin123 (only for technical issues)'
  ]
}