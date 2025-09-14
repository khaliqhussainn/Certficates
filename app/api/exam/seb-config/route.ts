// app/api/exam/seb-config/route.ts - PROPER SEB v3.10 BINARY FORMAT
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'
import { promisify } from 'util'
import zlib from 'zlib'

const gzip = promisify(zlib.gzip)

interface SEBConfig {
  [key: string]: any
}

// Generate proper SEB configuration object (plist structure)
function generateSEBConfig(courseId: string, sessionId?: string): SEBConfig {
  const baseURL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const sessionParam = sessionId ? `?session=${sessionId}` : ''
  const sebParam = sessionParam ? '&seb=true' : '?seb=true'
  const examURL = `${baseURL}/exam/${courseId}${sessionParam}${sebParam}`
  const quitURL = `${baseURL}/courses/${courseId}`
  
  return {
    // Basic Configuration
    startURL: examURL,
    quitURL: quitURL,
    sendBrowserExamKey: true,
    allowQuit: true,
    hashedQuitPassword: "YWRtaW4xMjM=", // Base64 of "admin123"
    quitExamPasswordHash: "YWRtaW4xMjM=",
    quitExamText: "Enter administrator password to quit exam:",
    
    // Security Lockdown
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
    
    // Browser Settings
    allowBrowsingBackForward: false,
    allowReload: false,
    showReloadButton: false,
    allowAddressBar: false,
    allowNavigationBar: false,
    showNavigationButtons: false,
    newBrowserWindowByLinkPolicy: 0,
    newBrowserWindowByScriptPolicy: 0,
    blockPopUpWindows: true,
    
    // Content Restrictions
    allowCopy: false,
    allowCut: false,
    allowPaste: false,
    allowSpellCheck: false,
    allowDictation: false,
    
    // Security Monitoring
    enableLogging: true,
    logLevel: 2,
    detectVirtualMachine: true,
    allowVirtualMachine: false,
    forceAppFolderInstall: true,
    
    // URL Filtering
    URLFilterEnable: true,
    URLFilterEnableContentFilter: true,
    urlFilterRules: [
      {
        action: 1,
        active: true,
        expression: examURL
      },
      {
        action: 1,
        active: true,
        expression: `${baseURL}/api/exam/*`
      },
      {
        action: 1,
        active: true,
        expression: `${baseURL}/api/auth/*`
      },
      {
        action: 0,
        active: true,
        expression: "*"
      }
    ],
    
    // Prohibited Processes
    prohibitedProcesses: [
      {
        active: true,
        currentUser: true,
        description: "Block OBS Studio",
        executable: "obs",
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
        description: "Block Discord",
        executable: "Discord",
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
      }
    ],
    
    // Platform Specific
    originatorVersion: "SEB_Web_3.10.0"
  }
}

// Convert config object to Apple plist XML format
function convertToPlistXML(config: SEBConfig): string {
  const plistHeader = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
`

  const plistFooter = `</dict>
</plist>`

  function convertValue(value: any): string {
    if (typeof value === 'boolean') {
      return value ? '<true/>' : '<false/>'
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return `<integer>${value}</integer>`
      } else {
        return `<real>${value}</real>`
      }
    } else if (typeof value === 'string') {
      return `<string>${escapeXml(value)}</string>`
    } else if (Array.isArray(value)) {
      let arrayContent = '<array>\n'
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          arrayContent += '<dict>\n'
          for (const [key, val] of Object.entries(item)) {
            arrayContent += `<key>${escapeXml(key)}</key>\n`
            arrayContent += convertValue(val) + '\n'
          }
          arrayContent += '</dict>\n'
        } else {
          arrayContent += convertValue(item) + '\n'
        }
      }
      arrayContent += '</array>'
      return arrayContent
    } else if (typeof value === 'object' && value !== null) {
      let dictContent = '<dict>\n'
      for (const [key, val] of Object.entries(value)) {
        dictContent += `<key>${escapeXml(key)}</key>\n`
        dictContent += convertValue(val) + '\n'
      }
      dictContent += '</dict>'
      return dictContent
    }
    return '<string></string>'
  }

  function escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  let plistContent = ''
  for (const [key, value] of Object.entries(config)) {
    plistContent += `<key>${escapeXml(key)}</key>\n`
    plistContent += convertValue(value) + '\n'
  }

  return plistHeader + plistContent + plistFooter
}

// Create proper SEB binary format with compression and "plnd" prefix
async function createSEBBinaryFile(config: SEBConfig): Promise<Buffer> {
  try {
    // 1. Convert to plist XML
    const plistXML = convertToPlistXML(config)
    
    // 2. Compress with gzip
    const compressedData = await gzip(Buffer.from(plistXML, 'utf8'))
    
    // 3. Add "plnd" prefix for plain data (unencrypted but compressed)
    const prefix = Buffer.from('plnd', 'ascii')
    const sebData = Buffer.concat([prefix, compressedData])
    
    // 4. Compress the entire file again (as per SEB format specification)
    const finalCompressed = await gzip(sebData)
    
    return finalCompressed
  } catch (error) {
    console.error('Error creating SEB binary file:', error)
    throw error
  }
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

    console.log('Generating SEB v3.10 binary config for course:', courseId)

    // Generate SEB configuration
    const sebConfig = generateSEBConfig(courseId, sessionId || undefined)
    
    // Create proper SEB binary format
    const sebBinaryData = await createSEBBinaryFile(sebConfig)
    
    // Create filename with timestamp
    const timestamp = Date.now()
    const filename = `secure_exam_${courseId}_${timestamp}.seb`
    
    console.log('SEB config generated:', {
      filename,
      size: sebBinaryData.length,
      format: 'binary_compressed',
      prefix: 'plnd'
    })
    
    // Return as proper .seb binary file
    return new Response(new Uint8Array(sebBinaryData), {
      headers: {
        'Content-Type': 'application/seb',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Content-Length': sebBinaryData.length.toString(),
        'X-SEB-Version': '3.10.0',
        'X-SEB-Format': 'binary-compressed'
      }
    })

  } catch (error) {
    console.error('Error generating SEB config:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate SEB configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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
    
    // Return configuration info (for testing/debugging)
    return NextResponse.json({
      message: 'SEB configuration ready',
      downloadUrl: `/api/exam/seb-config?courseId=${courseId}${sessionId ? `&sessionId=${sessionId}` : ''}`,
      format: 'SEB v3.10 binary format (compressed with gzip, plnd prefix)',
      instructions: [
        '1. Download and install Safe Exam Browser v3.6+ from https://safeexambrowser.org',
        '2. Close ALL applications and browser windows completely',
        '3. Download the exam configuration file (.seb)',
        '4. Double-click the .seb file to start your secure exam',
        '5. Your exam will load automatically in the secure environment',
        '6. Emergency password: admin123 (only for technical issues)'
      ],
      configDetails: {
        startURL: sebConfig.startURL,
        quitURL: sebConfig.quitURL,
        securityLevel: 'Maximum',
        urlFiltering: 'Enabled',
        processBlocking: 'Enabled',
        keyboardBlocking: 'Enabled'
      }
    })

  } catch (error) {
    console.error('Error processing SEB config request:', error)
    return NextResponse.json(
      { error: 'Failed to process SEB configuration request' },
      { status: 500 }
    )
  }
}