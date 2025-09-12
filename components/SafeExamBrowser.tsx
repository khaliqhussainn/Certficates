// components/SafeExamBrowser.tsx - COMPLETE SEB Integration
'use client'
import { useEffect, useState, useCallback } from 'react'
import { Download, Shield, CheckCircle, AlertTriangle, Monitor, Settings } from 'lucide-react'

// SEB JavaScript API interface (modern approach)
interface SEBWindow extends Window {
  SafeExamBrowser?: {
    version: string;
    configKey: string;
    browserExamKey: string;
    applicationName: string;
    platform: string;
  };
  
  // Legacy detection methods
  sebVersion?: string;
  seb?: any;
  
  // Modern SEB JS API (SEB 3.4+ Windows, 3.0+ macOS/iOS)
  SafeExamBrowser_?: {
    security: {
      isSecureMode: boolean;
      browserExamKey: string;
      configKey: string;
    };
    getConfigKey(): string;
    getBrowserExamKey(): string;
    getSecurityInfo(): any;
  };
}

interface SEBInfo {
  isSEB: boolean;
  version?: string;
  configKey?: string;
  browserExamKey?: string;
  platform?: string;
  securityMode: 'none' | 'legacy' | 'modern';
  detectionMethod: string;
  isVerified: boolean;
}

interface SEBConfigOptions {
  courseId: string;
  examSessionId?: string;
  examURL: string;
  quitURL: string;
  certificateMode?: boolean;
}

// Enhanced SEB Detection Hook
export function useSafeExamBrowser(): SEBInfo {
  const [sebInfo, setSebInfo] = useState<SEBInfo>({
    isSEB: false,
    securityMode: 'none',
    detectionMethod: 'none',
    isVerified: false
  });

  const detectSEB = useCallback(() => {
    const win = window as SEBWindow;
    let detectionInfo: SEBInfo = {
      isSEB: false,
      securityMode: 'none',
      detectionMethod: 'none',
      isVerified: false
    };

    try {
      // Method 1: Modern SEB JavaScript API (SEB 3.4+ Windows, 3.0+ macOS/iOS)
      if (win.SafeExamBrowser_) {
        detectionInfo = {
          isSEB: true,
          version: 'Modern API',
          configKey: win.SafeExamBrowser_.getConfigKey?.(),
          browserExamKey: win.SafeExamBrowser_.getBrowserExamKey?.(),
          platform: 'Modern SEB',
          securityMode: 'modern',
          detectionMethod: 'JavaScript API',
          isVerified: true
        };
        console.log('✅ SEB detected via modern JavaScript API');
      }
      // Method 2: Legacy SafeExamBrowser object
      else if (win.SafeExamBrowser) {
        detectionInfo = {
          isSEB: true,
          version: win.SafeExamBrowser.version,
          configKey: win.SafeExamBrowser.configKey,
          browserExamKey: win.SafeExamBrowser.browserExamKey,
          platform: win.SafeExamBrowser.platform,
          securityMode: 'legacy',
          detectionMethod: 'Legacy SafeExamBrowser object',
          isVerified: true
        };
        console.log('✅ SEB detected via legacy SafeExamBrowser object');
      }
      // Method 3: User Agent Detection (fallback)
      else {
        const userAgent = navigator.userAgent;
        const sebPatterns = [
          /SEB[\s\/][\d\.]+/i,
          /SafeExamBrowser/i,
          /SEB\//i,
          /Safe Exam Browser/i
        ];
        
        const isSEBByUserAgent = sebPatterns.some(pattern => pattern.test(userAgent));
        
        if (isSEBByUserAgent) {
          const versionMatch = userAgent.match(/SEB[\s\/]([\d\.]+)/i);
          detectionInfo = {
            isSEB: true,
            version: versionMatch ? versionMatch[1] : 'Unknown',
            securityMode: 'legacy',
            detectionMethod: 'User Agent',
            isVerified: false
          };
          console.log('⚠️ SEB detected via User Agent (less reliable)');
        }
      }

      // Method 4: Additional security checks
      if (detectionInfo.isSEB) {
        // Check for SEB-specific features
        const hasFullscreenAPI = document.fullscreenEnabled;
        const hasSecureContext = window.isSecureContext;
        
        // Additional verification for certificate exams
        detectionInfo.isVerified = detectionInfo.securityMode === 'modern' || 
                                   (!!detectionInfo.browserExamKey && !!detectionInfo.configKey);
      }

    } catch (error) {
      console.error('SEB detection error:', error);
    }

    setSebInfo(detectionInfo);
    return detectionInfo;
  }, []);

  useEffect(() => {
    // Initial detection
    detectSEB();
    
    // Periodic re-detection
    const interval = setInterval(detectSEB, 2000);
    
    // Listen for custom SEB events
    const handleSEBReady = () => {
      console.log('SEB Ready event received');
      setTimeout(detectSEB, 100);
    };

    window.addEventListener('SEBReady', handleSEBReady);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('SEBReady', handleSEBReady);
    };
  }, [detectSEB]);

  return sebInfo;
}

// SEB Configuration Generator
function generateSEBConfig(options: SEBConfigOptions) {
  const {
    courseId,
    examSessionId,
    examURL,
    quitURL,
    certificateMode = true
  } = options;

  const timestamp = Date.now();
  const configKey = `CERT_${courseId}_${timestamp}`.substring(0, 32);
  const browserExamKey = `EXAM_${examSessionId || 'default'}_${timestamp}`.substring(0, 32);
  
  // Generate admin password (should be environment variable in production)
  const adminPassword = process.env.NEXT_PUBLIC_SEB_ADMIN_PASSWORD || 'admin123';
  const hashedPassword = btoa(adminPassword);

  return {
    // Basic Settings
    startURL: examURL,
    quitURL: quitURL,
    restartExamURL: examURL,
    
    // Security Configuration
    sendBrowserExamKey: true,
    examKeySalt: configKey,
    browserExamKey: browserExamKey,
    configKey: configKey,
    
    // Authentication
    hashedQuitPassword: hashedPassword,
    quitExamPasswordHash: hashedPassword,
    restartExamPasswordHash: hashedPassword,
    quitExamText: "Enter administrator password to quit exam:",
    restartExamText: "Enter administrator password to restart exam:",
    
    // Lockdown Settings
    allowQuit: true,
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
    enableAltMouseWheel: false,
    enableEsc: false,
    enableCtrlAltDel: false,
    
    // Browser Settings
    allowBrowsingBackForward: false,
    allowReload: false,
    showReloadButton: false,
    allowAddressBar: false,
    allowNavigationBar: false,
    showNavigationButtons: false,
    newBrowserWindowByLinkPolicy: 0, // Block new windows
    newBrowserWindowByScriptPolicy: 0, // Block popup windows
    blockPopUpWindows: true,
    
    // Content Restrictions
    allowCopy: false,
    allowCut: false,
    allowPaste: false,
    enablePrivateClipboard: true,
    allowPasteFromClipboard: false,
    allowSpellCheck: false,
    allowDictation: false,
    allowVirtualMachine: false,
    detectVirtualMachine: true,
    
    // Network & Security
    enableLogging: true,
    logLevel: 2,
    allowApplicationLog: true,
    allowWindowCapture: false,
    allowScreenSharing: false,
    forceAppFolderInstall: certificateMode,
    
    // URL Filtering
    URLFilterEnable: true,
    URLFilterEnableContentFilter: true,
    urlFilterRules: [
      // Allow exam URLs
      {
        action: 1, // Allow
        active: true,
        expression: examURL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      },
      // Allow API endpoints
      {
        action: 1,
        active: true,
        expression: `${new URL(examURL).origin}/api/exam/*`
      },
      // Block everything else
      {
        action: 0, // Block
        active: true,
        expression: "*"
      }
    ],
    
    // Prohibited Processes
    prohibitedProcesses: [
      {
        active: true,
        currentUser: true,
        description: "Block screen recording",
        executable: "obs",
        windowHandling: 1
      },
      {
        active: true,
        currentUser: true,
        description: "Block OBS Studio",
        executable: "obs64",
        windowHandling: 1
      },
      {
        active: true,
        currentUser: true,
        description: "Block TeamViewer",
        executable: "TeamViewer",
        windowHandling: 1
      },
      {
        active: true,
        currentUser: true,
        description: "Block Zoom",
        executable: "zoom",
        windowHandling: 1
      },
      {
        active: true,
        currentUser: true,
        description: "Block Discord",
        executable: "Discord",
        windowHandling: 1
      },
      {
        active: true,
        currentUser: true,
        description: "Block Skype",
        executable: "Skype",
        windowHandling: 1
      },
      {
        active: true,
        currentUser: true,
        description: "Block Chrome",
        executable: "chrome",
        windowHandling: 1
      },
      {
        active: true,
        currentUser: true,
        description: "Block Firefox",
        executable: "firefox",
        windowHandling: 1
      },
      {
        active: true,
        currentUser: true,
        description: "Block Safari",
        executable: "Safari",
        windowHandling: 1
      },
      {
        active: true,
        currentUser: true,
        description: "Block Edge",
        executable: "msedge",
        windowHandling: 1
      }
    ],
    
    // System Restrictions
    allowSiri: false,
    allowRemoteAppConnection: false,
    enableTouchExit: false,
    touchOptimized: false,
    allowPreferencesWindow: false,
    showBackToStartButton: false,
    showInputLanguage: false,
    showTime: true,
    allowDisplayMirroring: false,
    allowedDisplaysMaxNumber: 1,
    
    // Session Management
    examSessionClearCookiesOnStart: true,
    examSessionClearCookiesOnEnd: true,
    restartExamUseStartURL: true,
    
    // Media Controls
    allowAudioCapture: false,
    allowVideoCapture: false,
    allowCamera: false,
    allowMicrophone: false,
    
    // Certificate-specific settings
    ...(certificateMode && {
      strictMode: true,
      certificateExamMode: true,
      additionalSecurityMeasures: true
    })
  };
}

// SEB Config Download Component
interface SEBConfigDownloadProps {
  courseId: string;
  examSessionId?: string;
  examURL?: string;
  onConfigGenerated?: (config: any) => void;
}

function SEBConfigDownload({ 
  courseId, 
  examSessionId, 
  examURL,
  onConfigGenerated 
}: SEBConfigDownloadProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [configGenerated, setConfigGenerated] = useState(false);

  const generateAndDownloadConfig = async () => {
    setIsGenerating(true);
    
    try {
      const baseURL = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const sessionParam = examSessionId ? `?session=${examSessionId}` : '';
      const sebParam = sessionParam ? '&seb=true' : '?seb=true';
      const finalExamURL = examURL || `${baseURL}/exam/${courseId}${sessionParam}${sebParam}`;
      const quitURL = `${baseURL}/courses/${courseId}`;

      const config = generateSEBConfig({
        courseId,
        examSessionId,
        examURL: finalExamURL,
        quitURL,
        certificateMode: true
      });

      // Create downloadable .seb file
      const configBlob = new Blob(
        [JSON.stringify(config, null, 2)], 
        { type: 'application/seb' }
      );
      
      const url = URL.createObjectURL(configBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `secure_exam_${courseId}_config.seb`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setConfigGenerated(true);
      onConfigGenerated?.(config);

      // Show setup instructions
      setTimeout(() => {
        alert(`✅ SEB Configuration Downloaded Successfully!

📋 IMPORTANT SETUP STEPS:

1️⃣ DOWNLOAD SAFE EXAM BROWSER:
   • Visit: https://safeexambrowser.org/download_en.html
   • Download version 3.6+ for Windows
   • Install with administrator privileges

2️⃣ CLOSE ALL APPLICATIONS:
   • Close ALL browser windows
   • Close messaging apps (WhatsApp, Telegram, etc.)
   • Close any recording software

3️⃣ START SECURE EXAM:
   • Double-click the downloaded .seb file
   • SEB will launch automatically
   • Your exam will load in secure mode

⚠️ EMERGENCY ACCESS:
   Admin Password: admin123
   (Only use if you need to exit due to technical issues)

🔐 SECURITY FEATURES ACTIVE:
   ✓ Screen recording blocked
   ✓ Tab switching disabled
   ✓ Copy/paste disabled
   ✓ System shortcuts blocked
   ✓ Virtual machine detection

❓ Need Help? Contact support if you have issues.`);
      }, 500);

    } catch (error) {
      console.error('Config generation error:', error);
      alert('❌ Failed to generate SEB configuration. Please try again or contact support.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <Shield className="w-8 h-8 text-blue-600 mr-3 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Secure Exam Environment Required
            </h3>
            <p className="text-blue-700 mb-4 text-sm leading-relaxed">
              This certification exam requires Safe Exam Browser (SEB) to ensure test integrity. 
              SEB creates a secure, monitored environment that prevents cheating and maintains 
              academic standards.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-900 text-sm">✅ Security Features:</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Blocks screen recording & screenshots</li>
                  <li>• Disables tab switching & copy/paste</li>
                  <li>• Monitors for violations in real-time</li>
                  <li>• Prevents virtual machine usage</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-900 text-sm">📱 What's Blocked:</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Alt+Tab, Ctrl+C/V, F12 keys</li>
                  <li>• Other browsers & applications</li>
                  <li>• Communication software</li>
                  <li>• Screen sharing tools</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={generateAndDownloadConfig}
          disabled={isGenerating}
          className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
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

      {configGenerated && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-green-900 mb-1">Configuration Generated Successfully!</p>
              <p className="text-green-700">
                Please follow the setup instructions that appeared. If you missed them, 
                regenerate the configuration to see the instructions again.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// SEB Status Indicator Component
export function SEBStatusIndicator() {
  const sebInfo = useSafeExamBrowser();

  if (!sebInfo.isSEB) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-center">
        <AlertTriangle className="w-5 h-5 mr-2" />
        <div className="text-sm">
          <strong>Security Warning:</strong> Safe Exam Browser not detected. 
          <span className="ml-1">This exam requires SEB for security.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Shield className="w-5 h-5 mr-2 text-green-600" />
          <div>
            <strong className="text-green-900">Secure Environment Active</strong>
            <div className="text-sm text-green-700">
              SEB {sebInfo.version} • {sebInfo.detectionMethod}
              {sebInfo.securityMode === 'modern' && ' • Advanced Security'}
            </div>
          </div>
        </div>
        <div className="flex items-center">
          {sebInfo.isVerified ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          )}
        </div>
      </div>
      
      {sebInfo.configKey && sebInfo.browserExamKey && (
        <div className="mt-2 text-xs text-green-600 font-mono">
          Config: {sebInfo.configKey.substring(0, 8)}... | 
          Browser: {sebInfo.browserExamKey.substring(0, 8)}...
        </div>
      )}
    </div>
  );
}

// Export everything
export {
  useSafeExamBrowser as SafeExamBrowserDetector,
  generateSEBConfig,
  SEBConfigDownload,
  SEBStatusIndicator as SEBStatus
};