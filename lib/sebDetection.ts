// lib/sebDetection.ts - Comprehensive Safe Exam Browser Detection
import crypto from 'crypto';
import React from 'react';

// SEB Detection Interface
export interface SEBDetectionResult {
  isSEB: boolean;
  isVerified: boolean;
  securityLevel: 'none' | 'basic' | 'enhanced' | 'maximum';
  detectionMethod: string;
  version?: string;
  platform?: string;
  browserExamKey?: string;
  configKey?: string;
  capabilities: {
    hasJavaScriptAPI: boolean;
    hasConfigValidation: boolean;
    hasKeyValidation: boolean;
    hasVersionInfo: boolean;
  };
  violations: string[];
  recommendations: string[];
}

// SEB Configuration Interface
export interface SEBConfig {
  startURL: string;
  quitURL: string;
  sendBrowserExamKey: boolean;
  allowQuit: boolean;
  quitExamPasswordHash: string;
  quitExamText: string;
  
  // Security lockdown
  ignoreExitKeys: boolean;
  enableF1: boolean;
  enableF3: boolean;
  enableF12: boolean;
  enableCtrlEsc: boolean;
  enableAltEsc: boolean;
  enableAltTab: boolean;
  enableAltF4: boolean;
  enableRightMouse: boolean;
  enablePrintScreen: boolean;
  enableEsc: boolean;
  enableCtrlAltDel: boolean;
  
  // Browser restrictions
  allowBrowsingBackForward: boolean;
  allowReload: boolean;
  showReloadButton: boolean;
  allowAddressBar: boolean;
  allowNavigationBar: boolean;
  showNavigationButtons: boolean;
  newBrowserWindowByLinkPolicy: number;
  newBrowserWindowByScriptPolicy: number;
  blockPopUpWindows: boolean;
  
  // Content restrictions
  allowCopy: boolean;
  allowCut: boolean;
  allowPaste: boolean;
  allowSpellCheck: boolean;
  allowDictation: boolean;
  
  // Security monitoring
  enableLogging: boolean;
  logLevel: number;
  detectVirtualMachine: boolean;
  allowVirtualMachine: boolean;
  forceAppFolderInstall: boolean;
  
  // URL filtering
  URLFilterEnable: boolean;
  URLFilterEnableContentFilter: boolean;
  urlFilterRules: Array<{
    action: number;
    active: boolean;
    expression: string;
  }>;
  
  // Process restrictions
  prohibitedProcesses: Array<{
    active: boolean;
    currentUser: boolean;
    description: string;
    executable: string;
    windowHandling: number;
  }>;
}

// SEB Detection Class
export class SafeExamBrowserDetector {
  private static instance: SafeExamBrowserDetector;
  private detectionCallbacks: Array<(result: SEBDetectionResult) => void> = [];
  private lastDetectionResult: SEBDetectionResult | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): SafeExamBrowserDetector {
    if (!SafeExamBrowserDetector.instance) {
      SafeExamBrowserDetector.instance = new SafeExamBrowserDetector();
    }
    return SafeExamBrowserDetector.instance;
  }

  // Comprehensive SEB Detection
  public detectSEB(): SEBDetectionResult {
    const win = window as any;
    const userAgent = navigator.userAgent;
    
    let result: SEBDetectionResult = {
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
    };

    try {
      // Method 1: Modern SEB JavaScript API (SEB 3.4+ Windows, 3.0+ macOS/iOS)
      if (win.SafeExamBrowser_) {
        result = this.detectModernSEB(win.SafeExamBrowser_, result);
      }
      // Method 2: Legacy SafeExamBrowser object
      else if (win.SafeExamBrowser) {
        result = this.detectLegacySEB(win.SafeExamBrowser, result);
      }
      // Method 3: User Agent Detection (fallback)
      else {
        result = this.detectUserAgentSEB(userAgent, result);
      }

      // Additional validation and security checks
      result = this.performAdditionalValidation(result);
      
      // Generate recommendations
      result = this.generateRecommendations(result);

    } catch (error) {
      console.error('SEB detection error:', error);
      result.violations.push(`Detection error: ${error}`);
    }

    this.lastDetectionResult = result;
    this.notifyCallbacks(result);
    
    return result;
  }

  // Detect Modern SEB (JavaScript API)
  private detectModernSEB(sebAPI: any, result: SEBDetectionResult): SEBDetectionResult {
    result.isSEB = true;
    result.securityLevel = 'maximum';
    result.detectionMethod = 'Modern JavaScript API';
    result.isVerified = true;
    result.version = 'Modern API';
    result.platform = 'Modern SEB';
    
    result.capabilities.hasJavaScriptAPI = true;
    
    try {
      if (typeof sebAPI.getConfigKey === 'function') {
        result.configKey = sebAPI.getConfigKey();
        result.capabilities.hasConfigValidation = true;
      }
      
      if (typeof sebAPI.getBrowserExamKey === 'function') {
        result.browserExamKey = sebAPI.getBrowserExamKey();
        result.capabilities.hasKeyValidation = true;
      }
      
      if (sebAPI.security?.isSecureMode) {
        result.securityLevel = 'maximum';
      }
      
    } catch (error) {
      result.violations.push(`Modern SEB API error: ${error}`);
      result.securityLevel = 'enhanced';
    }
    
    return result;
  }

  // Detect Legacy SEB
  private detectLegacySEB(seb: any, result: SEBDetectionResult): SEBDetectionResult {
    result.isSEB = true;
    result.securityLevel = 'enhanced';
    result.detectionMethod = 'Legacy SafeExamBrowser Object';
    result.isVerified = true;
    
    if (seb.version) {
      result.version = seb.version;
      result.capabilities.hasVersionInfo = true;
    }
    
    if (seb.platform) {
      result.platform = seb.platform;
    }
    
    if (seb.configKey) {
      result.configKey = seb.configKey;
      result.capabilities.hasConfigValidation = true;
    }
    
    if (seb.browserExamKey) {
      result.browserExamKey = seb.browserExamKey;
      result.capabilities.hasKeyValidation = true;
    }
    
    // Upgrade security level if both keys are present
    if (result.configKey && result.browserExamKey) {
      result.securityLevel = 'maximum';
    }
    
    return result;
  }

  // Detect SEB via User Agent (least reliable)
  private detectUserAgentSEB(userAgent: string, result: SEBDetectionResult): SEBDetectionResult {
    const sebPatterns = [
      /SEB[\s\/]([\d\.]+)/i,
      /SafeExamBrowser[\s\/]?([\d\.]*)/i,
      /Safe.*Exam.*Browser/i
    ];
    
    for (const pattern of sebPatterns) {
      const match = userAgent.match(pattern);
      if (match) {
        result.isSEB = true;
        result.securityLevel = 'basic';
        result.detectionMethod = 'User Agent Pattern';
        result.isVerified = false;
        
        if (match[1]) {
          result.version = match[1];
          result.capabilities.hasVersionInfo = true;
        }
        
        break;
      }
    }
    
    return result;
  }

  // Perform additional validation
  private performAdditionalValidation(result: SEBDetectionResult): SEBDetectionResult {
    if (!result.isSEB) {
      return result;
    }

    // Check for known SEB window properties
    const win = window as any;
    const sebIndicators = [
      'sebWindow',
      'sebConfig',
      'SafeExamBrowser',
      'SafeExamBrowser_'
    ];
    
    let indicatorCount = 0;
    sebIndicators.forEach(indicator => {
      if (win[indicator]) {
        indicatorCount++;
      }
    });
    
    // Validate browser restrictions (SEB should block these)
    try {
      // Test if common shortcuts are blocked
      const testDiv = document.createElement('div');
      testDiv.addEventListener('contextmenu', (e) => {
        if (!e.defaultPrevented) {
          result.violations.push('Right-click not properly blocked');
        }
      });
      
      // Test fullscreen capability
      if (!document.fullscreenEnabled && result.securityLevel !== 'maximum') {
        result.violations.push('Fullscreen API may not be properly restricted');
      }
      
    } catch (error) {
      // Expected in SEB environment
    }
    
    // Validate security level based on capabilities
    if (result.capabilities.hasJavaScriptAPI && 
        result.capabilities.hasConfigValidation && 
        result.capabilities.hasKeyValidation) {
      result.securityLevel = 'maximum';
    } else if (result.capabilities.hasConfigValidation || 
               result.capabilities.hasKeyValidation) {
      result.securityLevel = 'enhanced';
    }
    
    return result;
  }

  // Generate recommendations
  private generateRecommendations(result: SEBDetectionResult): SEBDetectionResult {
    if (!result.isSEB) {
      result.recommendations.push('Install Safe Exam Browser for secure exam access');
      result.recommendations.push('Download the latest SEB version from official website');
      return result;
    }
    
    if (result.securityLevel === 'basic') {
      result.recommendations.push('Upgrade to newer SEB version for enhanced security');
      result.recommendations.push('Ensure SEB configuration is properly loaded');
    }
    
    if (result.violations.length > 0) {
      result.recommendations.push('Review and resolve security violations before proceeding');
    }
    
    if (!result.capabilities.hasKeyValidation) {
      result.recommendations.push('Enable browser exam key validation for maximum security');
    }
    
    if (!result.capabilities.hasConfigValidation) {
      result.recommendations.push('Load proper SEB configuration file');
    }
    
    return result;
  }

  // Start continuous monitoring
  public startMonitoring(intervalMs: number = 5000): void {
    this.stopMonitoring(); // Clear any existing interval
    
    this.monitoringInterval = setInterval(() => {
      this.detectSEB();
    }, intervalMs);
  }

  // Stop monitoring
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Subscribe to detection changes
  public subscribe(callback: (result: SEBDetectionResult) => void): void {
    this.detectionCallbacks.push(callback);
  }

  // Unsubscribe from detection changes
  public unsubscribe(callback: (result: SEBDetectionResult) => void): void {
    const index = this.detectionCallbacks.indexOf(callback);
    if (index > -1) {
      this.detectionCallbacks.splice(index, 1);
    }
  }

  // Notify all subscribers
  private notifyCallbacks(result: SEBDetectionResult): void {
    this.detectionCallbacks.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        console.error('SEB detection callback error:', error);
      }
    });
  }

  // Get last detection result
  public getLastResult(): SEBDetectionResult | null {
    return this.lastDetectionResult;
  }

  // Validate SEB configuration
  public validateSEBConfig(sessionId: string, courseId: string): Promise<any> {
    return fetch('/api/exam/seb-validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        browserExamKey: this.lastDetectionResult?.browserExamKey,
        configKey: this.lastDetectionResult?.configKey,
        userAgent: navigator.userAgent,
        sebInfo: {
          version: this.lastDetectionResult?.version,
          platform: this.lastDetectionResult?.platform,
          securityMode: this.lastDetectionResult?.securityLevel,
          detectionMethod: this.lastDetectionResult?.detectionMethod,
          isVerified: this.lastDetectionResult?.isVerified || false
        }
      })
    }).then(response => response.json());
  }
}

// SEB Configuration Generator
export class SEBConfigGenerator {
  // Generate comprehensive SEB configuration
  public static generateConfig(options: {
    courseId: string;
    sessionId?: string;
    examURL: string;
    quitURL: string;
    adminPassword?: string;
    certificateMode?: boolean;
  }): SEBConfig {
    const { courseId, sessionId, examURL, quitURL, adminPassword = 'admin123', certificateMode = true } = options;
    
    return {
      startURL: examURL,
      quitURL: quitURL,
      sendBrowserExamKey: true,
      allowQuit: true,
      quitExamPasswordHash: Buffer.from(adminPassword).toString('base64'),
      quitExamText: "Enter administrator password to quit exam:",
      
      // Security lockdown (all disabled for maximum security)
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
      newBrowserWindowByLinkPolicy: 0, // Block new windows
      newBrowserWindowByScriptPolicy: 0, // Block popup windows
      blockPopUpWindows: true,
      
      // Content restrictions
      allowCopy: false,
      allowCut: false,
      allowPaste: false,
      allowSpellCheck: false,
      allowDictation: false,
      
      // Security monitoring
      enableLogging: true,
      logLevel: certificateMode ? 2 : 1,
      detectVirtualMachine: certificateMode,
      allowVirtualMachine: false,
      forceAppFolderInstall: certificateMode,
      
      // URL filtering
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
      
      // Process restrictions
      prohibitedProcesses: [
        // Screen recording software
        { active: true, currentUser: true, description: "Block OBS Studio", executable: "obs", windowHandling: 1 },
        { active: true, currentUser: true, description: "Block OBS Studio 64", executable: "obs64", windowHandling: 1 },
        { active: true, currentUser: true, description: "Block Bandicam", executable: "bandicam", windowHandling: 1 },
        { active: true, currentUser: true, description: "Block Camtasia", executable: "camtasia", windowHandling: 1 },
        
        // Remote access software
        { active: true, currentUser: true, description: "Block TeamViewer", executable: "TeamViewer", windowHandling: 1 },
        { active: true, currentUser: true, description: "Block AnyDesk", executable: "AnyDesk", windowHandling: 1 },
        { active: true, currentUser: true, description: "Block Chrome Remote Desktop", executable: "remoting_host", windowHandling: 1 },
        
        // Communication software
        { active: true, currentUser: true, description: "Block Discord", executable: "Discord", windowHandling: 1 },
        { active: true, currentUser: true, description: "Block Skype", executable: "Skype", windowHandling: 1 },
        { active: true, currentUser: true, description: "Block Zoom", executable: "zoom", windowHandling: 1 },
        { active: true, currentUser: true, description: "Block Microsoft Teams", executable: "Teams", windowHandling: 1 },
        
        // Browsers
        { active: true, currentUser: true, description: "Block Chrome", executable: "chrome", windowHandling: 1 },
        { active: true, currentUser: true, description: "Block Firefox", executable: "firefox", windowHandling: 1 },
        { active: true, currentUser: true, description: "Block Edge", executable: "msedge", windowHandling: 1 },
        { active: true, currentUser: true, description: "Block Safari", executable: "Safari", windowHandling: 1 },
        
        // System utilities
        { active: true, currentUser: true, description: "Block Task Manager", executable: "taskmgr", windowHandling: 1 },
        { active: true, currentUser: true, description: "Block Command Prompt", executable: "cmd", windowHandling: 1 },
        { active: true, currentUser: true, description: "Block PowerShell", executable: "powershell", windowHandling: 1 }
      ]
    };
  }

  // Generate and download SEB config file
  public static downloadConfig(config: SEBConfig, filename: string): void {
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: 'application/seb'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Export utilities
export const sebDetector = SafeExamBrowserDetector.getInstance();

// React Hook for SEB Detection
export function useSafeExamBrowser() {
  const [sebResult, setSebResult] = React.useState<SEBDetectionResult | null>(null);

  React.useEffect(() => {
    // Initial detection
    const result = sebDetector.detectSEB();
    setSebResult(result);

    // Subscribe to changes
    const handleDetectionChange = (newResult: SEBDetectionResult) => {
      setSebResult(newResult);
    };

    sebDetector.subscribe(handleDetectionChange);
    sebDetector.startMonitoring(3000); // Check every 3 seconds

    return () => {
      sebDetector.unsubscribe(handleDetectionChange);
      sebDetector.stopMonitoring();
    };
  }, []);

  return sebResult;
}

// Security Event Logger
export class SEBSecurityLogger {
  private static events: Array<{
    timestamp: string;
    type: string;
    details: any;
    severity: 'info' | 'warning' | 'error' | 'critical';
  }> = [];

  public static logEvent(
    type: string, 
    details: any, 
    severity: 'info' | 'warning' | 'error' | 'critical' = 'info'
  ): void {
    const event = {
      timestamp: new Date().toISOString(),
      type,
      details,
      severity
    };

    this.events.push(event);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 SEB ${severity.toUpperCase()}: ${type}`, details);
    }

    // Send to server in production
    if (process.env.NODE_ENV === 'production' && severity !== 'info') {
      this.sendToServer(event);
    }

    // Limit stored events to prevent memory issues
    if (this.events.length > 100) {
      this.events.splice(0, 50);
    }
  }

  private static async sendToServer(event: any): Promise<void> {
    try {
      await fetch('/api/exam/security-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.error('Failed to send security event to server:', error);
    }
  }

  public static getEvents(): typeof SEBSecurityLogger.events {
    return [...this.events];
  }

  public static clearEvents(): void {
    this.events = [];
  }
}

// SEB Status Component Helper
export interface SEBStatusProps {
  result: SEBDetectionResult | null;
  showDetails?: boolean;
  className?: string;
}

export function getSEBStatusColor(result: SEBDetectionResult | null): string {
  if (!result || !result.isSEB) return 'text-red-500';
  
  switch (result.securityLevel) {
    case 'maximum': return 'text-green-500';
    case 'enhanced': return 'text-blue-500';
    case 'basic': return 'text-yellow-500';
    default: return 'text-gray-500';
  }
}

export function getSEBStatusMessage(result: SEBDetectionResult | null): string {
  if (!result) return 'Checking SEB status...';
  if (!result.isSEB) return 'Safe Exam Browser not detected';
  
  const messages = {
    maximum: 'Maximum security - SEB fully validated',
    enhanced: 'Enhanced security - SEB detected with validation',
    basic: 'Basic security - SEB detected',
    none: 'No security validation'
  };
  
  return messages[result.securityLevel] || 'Unknown security level';
}

// Exam Security Monitor
export class ExamSecurityMonitor {
  private static instance: ExamSecurityMonitor;
  private violations: Array<{
    type: string;
    timestamp: string;
    details: any;
  }> = [];
  
  private monitoringActive = false;
  private sessionId: string | null = null;

  private constructor() {}

  public static getInstance(): ExamSecurityMonitor {
    if (!ExamSecurityMonitor.instance) {
      ExamSecurityMonitor.instance = new ExamSecurityMonitor();
    }
    return ExamSecurityMonitor.instance;
  }

  public startMonitoring(sessionId: string): void {
    this.sessionId = sessionId;
    this.monitoringActive = true;
    this.violations = [];

    // Monitor fullscreen changes
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('focus', this.handleWindowFocus);
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('contextmenu', this.handleContextMenu);

    SEBSecurityLogger.logEvent('MONITORING_STARTED', { sessionId }, 'info');
  }

  public stopMonitoring(): void {
    this.monitoringActive = false;
    
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('focus', this.handleWindowFocus);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('contextmenu', this.handleContextMenu);

    SEBSecurityLogger.logEvent('MONITORING_STOPPED', { 
      sessionId: this.sessionId,
      totalViolations: this.violations.length 
    }, 'info');
  }

  private handleFullscreenChange = (): void => {
    if (!this.monitoringActive) return;
    
    const isFullscreen = !!document.fullscreenElement;
    const sebResult = sebDetector.getLastResult();
    
    if (!isFullscreen && !sebResult?.isSEB) {
      this.recordViolation('FULLSCREEN_EXIT', {
        message: 'User exited fullscreen mode',
        sebActive: sebResult?.isSEB || false
      });
    }
  };

  private handleVisibilityChange = (): void => {
    if (!this.monitoringActive) return;
    
    if (document.hidden) {
      this.recordViolation('TAB_SWITCH', {
        message: 'User switched tabs or minimized window',
        hidden: document.hidden
      });
    }
  };

  private handleWindowBlur = (): void => {
    if (!this.monitoringActive) return;
    
    this.recordViolation('WINDOW_BLUR', {
      message: 'Browser window lost focus',
      timestamp: Date.now()
    });
  };

  private handleWindowFocus = (): void => {
    if (!this.monitoringActive) return;
    
    SEBSecurityLogger.logEvent('WINDOW_FOCUS', {
      message: 'Browser window regained focus'
    }, 'info');
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.monitoringActive) return;
    
    const sebResult = sebDetector.getLastResult();
    
    // Only monitor if not using SEB (SEB handles this natively)
    if (sebResult?.isSEB) return;
    
    // Check for prohibited key combinations
    const prohibitedKeys = [
      { ctrl: true, key: 'c' }, // Copy
      { ctrl: true, key: 'v' }, // Paste
      { ctrl: true, key: 'x' }, // Cut
      { ctrl: true, key: 'a' }, // Select All
      { ctrl: true, key: 's' }, // Save
      { ctrl: true, key: 'p' }, // Print
      { ctrl: true, key: 'f' }, // Find
      { alt: true, key: 'Tab' }, // Alt+Tab
      { key: 'F12' }, // Dev Tools
      { key: 'F1' }, // Help
      { key: 'F3' }, // Find
      { key: 'F5' }, // Refresh
    ];

    const isProhibited = prohibitedKeys.some(combo => {
      if (combo.ctrl && !event.ctrlKey) return false;
      if (combo.alt && !event.altKey) return false;
      return event.key.toLowerCase() === combo.key.toLowerCase();
    });

    if (isProhibited) {
      event.preventDefault();
      this.recordViolation('PROHIBITED_KEY', {
        key: event.key,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey
      });
    }
  };

  private handleContextMenu = (event: MouseEvent): void => {
    if (!this.monitoringActive) return;
    
    const sebResult = sebDetector.getLastResult();
    
    // Only prevent if not using SEB
    if (!sebResult?.isSEB) {
      event.preventDefault();
      this.recordViolation('RIGHT_CLICK', {
        message: 'User attempted right-click context menu',
        x: event.clientX,
        y: event.clientY
      });
    }
  };

  private recordViolation(type: string, details: any): void {
    const violation = {
      type,
      timestamp: new Date().toISOString(),
      details
    };

    this.violations.push(violation);
    
    SEBSecurityLogger.logEvent('SECURITY_VIOLATION', violation, 'warning');

    // Send to server
    if (this.sessionId) {
      this.sendViolationToServer(violation);
    }
  }

  private async sendViolationToServer(violation: any): Promise<void> {
    try {
      await fetch('/api/exam/violation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          violation
        })
      });
    } catch (error) {
      SEBSecurityLogger.logEvent('VIOLATION_SEND_FAILED', { error: error instanceof Error ? error.message : 'Unknown error' }, 'error');
    }
  }

  public getViolations(): typeof this.violations {
    return [...this.violations];
  }

  public getViolationCount(): number {
    return this.violations.length;
  }
}

// Export the security monitor instance
export const examSecurityMonitor = ExamSecurityMonitor.getInstance();

// Utility function to check if SEB is properly configured
export function isSEBProperlyConfigured(): boolean {
  const result = sebDetector.detectSEB();
  return result.isSEB && result.isVerified && result.securityLevel !== 'basic';
}

// Utility function to get SEB setup instructions
export function getSEBSetupInstructions(): string[] {
  return [
    '1. Download Safe Exam Browser from the official website',
    '2. Install SEB with administrator privileges',
    '3. Download the exam configuration file (.seb)',
    '4. Close all applications and browsers',
    '5. Double-click the .seb file to start the secure exam',
    '6. Your exam will load automatically in the secure environment'
  ];
}

// Export all utilities
export default {
  SafeExamBrowserDetector,
  SEBConfigGenerator,
  SEBSecurityLogger,
  ExamSecurityMonitor,
  sebDetector,
  examSecurityMonitor,
  useSafeExamBrowser,
  getSEBStatusColor,
  getSEBStatusMessage,
  isSEBProperlyConfigured,
  getSEBSetupInstructions
};