// app/api/exam/seb-config/route.ts - FIXED VERSION FOR SEB v3.10
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'

interface SEBConfig {
  // Basic Settings
  startURL: string
  quitURL: string
  sendBrowserExamKey: boolean
  allowQuit: boolean
  hashedQuitPassword: string
  quitExamPasswordHash: string
  quitExamText: string
  
  // Security lockdown (all disabled for maximum security)
  ignoreExitKeys: boolean
  enableF1: boolean
  enableF3: boolean
  enableF12: boolean
  enableCtrlEsc: boolean
  enableAltEsc: boolean
  enableAltTab: boolean
  enableAltF4: boolean
  enableRightMouse: boolean
  enablePrintScreen: boolean
  enableEsc: boolean
  enableCtrlAltDel: boolean
  
  // Browser restrictions
  allowBrowsingBackForward: boolean
  allowReload: boolean
  showReloadButton: boolean
  allowAddressBar: boolean
  allowNavigationBar: boolean
  showNavigationButtons: boolean
  newBrowserWindowByLinkPolicy: number
  newBrowserWindowByScriptPolicy: number
  blockPopUpWindows: boolean
  
  // Content restrictions
  allowCopy: boolean
  allowCut: boolean
  allowPaste: boolean
  allowSpellCheck: boolean
  allowDictation: boolean
  
  // Security monitoring
  enableLogging: boolean
  logLevel: number
  detectVirtualMachine: boolean
  allowVirtualMachine: boolean
  forceAppFolderInstall: boolean
  
  // URL filtering
  URLFilterEnable: boolean
  URLFilterEnableContentFilter: boolean
  urlFilterRules: Array<{
    action: number
    active: boolean
    expression: string
  }>
  
  // Process restrictions
  prohibitedProcesses: Array<{
    active: boolean
    currentUser: boolean
    description: string
    executable: string
    windowHandling: number
  }>
}

// Generate SEB-compatible configuration
function generateSEBConfig(courseId: string, sessionId?: string): SEBConfig {
  const baseURL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const sessionParam = sessionId ? `?session=${sessionId}` : ''
  const sebParam = sessionParam ? '&seb=true' : '?seb=true'
  const examURL = `${baseURL}/exam/${courseId}${sessionParam}${sebParam}`
  const quitURL = `${baseURL}/courses/${courseId}`
  
  // SEB v3.10 expects Base64 encoded password
  const adminPassword = "admin123"
  const hashedPassword = Buffer.from(adminPassword).toString('base64')
  
  return {
    // Basic Settings
    startURL: examURL,
    quitURL: quitURL,
    sendBrowserExamKey: true,
    allowQuit: true,
    hashedQuitPassword: hashedPassword,
    quitExamPasswordHash: hashedPassword,
    quitExamText: "Enter administrator password to quit exam:",
    
    // Complete security lockdown
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
    logLevel: 2,
    detectVirtualMachine: true,
    allowVirtualMachine: false,
    forceAppFolderInstall: true,
    
    // URL filtering - very restrictive
    URLFilterEnable: true,
    URLFilterEnableContentFilter: true,
    urlFilterRules: [
      // Allow only exam URL
      {
        action: 1, // Allow
        active: true,
        expression: examURL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      },
      // Allow API endpoints for exam
      {
        action: 1,
        active: true,
        expression: `${baseURL}/api/exam/*`
      },
      // Allow authentication (in case session expires)
      {
        action: 1,
        active: true,
        expression: `${baseURL}/api/auth/*`
      },
      // Block everything else
      {
        action: 0, // Block
        active: true,
        expression: "*"
      }
    ],
    
    // Block potentially harmful processes
    prohibitedProcesses: [
      // Screen recording software
      { active: true, currentUser: true, description: "Block OBS Studio", executable: "obs", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block OBS Studio 64", executable: "obs64", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block Bandicam", executable: "bandicam", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block Camtasia", executable: "camtasia", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block Fraps", executable: "fraps", windowHandling: 1 },
      
      // Remote access software
      { active: true, currentUser: true, description: "Block TeamViewer", executable: "TeamViewer", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block AnyDesk", executable: "AnyDesk", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block Chrome Remote Desktop", executable: "remoting_host", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block VNC Viewer", executable: "vncviewer", windowHandling: 1 },
      
      // Communication software
      { active: true, currentUser: true, description: "Block Discord", executable: "Discord", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block Skype", executable: "Skype", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block Zoom", executable: "zoom", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block Microsoft Teams", executable: "Teams", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block WhatsApp", executable: "WhatsApp", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block Telegram", executable: "Telegram", windowHandling: 1 },
      
      // Web browsers
      { active: true, currentUser: true, description: "Block Google Chrome", executable: "chrome", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block Mozilla Firefox", executable: "firefox", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block Microsoft Edge", executable: "msedge", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block Safari", executable: "Safari", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block Opera", executable: "opera", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block Brave", executable: "brave", windowHandling: 1 },
      
      // System utilities
      { active: true, currentUser: true, description: "Block Task Manager", executable: "taskmgr", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block Command Prompt", executable: "cmd", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block PowerShell", executable: "powershell", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block Registry Editor", executable: "regedit", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block Control Panel", executable: "control", windowHandling: 1 },
      
      // Development tools
      { active: true, currentUser: true, description: "Block Visual Studio Code", executable: "Code", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block Visual Studio", executable: "devenv", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block Notepad++", executable: "notepad++", windowHandling: 1 },
      
      // Virtual machines
      { active: true, currentUser: true, description: "Block VirtualBox", executable: "VirtualBox", windowHandling: 1 },
      { active: true, currentUser: true, description: "Block VMware", executable: "vmware", windowHandling: 1 },
      
      // File managers (only block if running multiple instances)
      { active: false, currentUser: true, description: "Monitor Windows Explorer", executable: "explorer", windowHandling: 2 }
    ]
  }
}

// Convert config to proper SEB format (plist/binary)
function convertToSEBFormat(config: SEBConfig): Buffer {
  // SEB v3.10 expects a plist format
  // This is a simplified conversion - in production you might want to use a proper plist library
  
  const plistHeader = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
`;

  const plistFooter = `</dict>
</plist>`;

  let plistContent = '';

  // Convert each config property to plist format
  for (const [key, value] of Object.entries(config)) {
    plistContent += `\t<key>${key}</key>\n`;
    
    if (typeof value === 'boolean') {
      plistContent += `\t<${value ? 'true' : 'false'}/>\n`;
    } else if (typeof value === 'number') {
      plistContent += `\t<integer>${value}</integer>\n`;
    } else if (typeof value === 'string') {
      plistContent += `\t<string>${value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</string>\n`;
    } else if (Array.isArray(value)) {
      plistContent += `\t<array>\n`;
      value.forEach(item => {
        if (typeof item === 'object') {
          plistContent += `\t\t<dict>\n`;
          for (const [itemKey, itemValue] of Object.entries(item)) {
            plistContent += `\t\t\t<key>${itemKey}</key>\n`;
            if (typeof itemValue === 'boolean') {
              plistContent += `\t\t\t<${itemValue ? 'true' : 'false'}/>\n`;
            } else if (typeof itemValue === 'number') {
              plistContent += `\t\t\t<integer>${itemValue}</integer>\n`;
            } else {
              plistContent += `\t\t\t<string>${String(itemValue).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</string>\n`;
            }
          }
          plistContent += `\t\t</dict>\n`;
        } else {
          plistContent += `\t\t<string>${String(item)}</string>\n`;
        }
      });
      plistContent += `\t</array>\n`;
    }
  }

  const fullPlist = plistHeader + plistContent + plistFooter;
  return Buffer.from(fullPlist, 'utf8');
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const courseId = url.searchParams.get('courseId')
    const sessionId = url.searchParams.get('sessionId')
    
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    // Generate SEB configuration
    const sebConfig = generateSEBConfig(courseId, sessionId || undefined)
    
    // Convert to proper SEB format (plist/binary)
    const sebData = convertToSEBFormat(sebConfig)
    
    // Create filename with timestamp to ensure uniqueness
    const timestamp = Date.now()
    const filename = `secure_exam_${courseId}_${timestamp}.seb`
    
    // Return as proper .seb file
    return new Response(new Uint8Array(sebData), {
      headers: {
        'Content-Type': 'application/seb',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Content-Length': sebData.length.toString()
      }
    })

  } catch (error) {
    console.error('Error generating SEB config:', error)
    return NextResponse.json(
      { error: 'Failed to generate SEB configuration' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { courseId, sessionId, customConfig } = await request.json()
    
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    // Generate base configuration
    let sebConfig = generateSEBConfig(courseId, sessionId)
    
    // Merge with custom configuration if provided
    if (customConfig) {
      sebConfig = { ...sebConfig, ...customConfig }
    }
    
    // Return configuration as JSON (for programmatic access)
    return NextResponse.json({
      config: sebConfig,
      downloadUrl: `/api/exam/seb-config?courseId=${courseId}${sessionId ? `&sessionId=${sessionId}` : ''}`,
      instructions: [
        '1. Download and install Safe Exam Browser from https://safeexambrowser.org',
        '2. Close ALL applications and browser windows',
        '3. Download the exam configuration file (.seb)',
        '4. Double-click the .seb file to start your secure exam',
        '5. Your exam will load automatically in the secure environment'
      ],
      troubleshooting: [
        'If the .seb file doesn\'t open, try right-clicking and selecting "Open with Safe Exam Browser"',
        'Make sure you have SEB version 3.6 or higher installed',
        'Check that no other browsers or restricted applications are running',
        'Contact support if you continue to have issues'
      ]
    })

  } catch (error) {
    console.error('Error processing SEB config request:', error)
    return NextResponse.json(
      { error: 'Failed to process SEB configuration request' },
      { status: 500 }
    )
  }
}