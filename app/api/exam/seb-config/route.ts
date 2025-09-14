// app/api/exam/seb-config/route.ts - WORKING SOLUTION FOR SEB v3.10
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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

    console.log('=== GENERATING SEB CONFIG ===')
    console.log('Course ID:', courseId)
    console.log('Session ID:', sessionId)

    const baseURL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const sessionParam = sessionId ? `?session=${sessionId}` : ''
    const sebParam = sessionParam ? '&seb=true' : '?seb=true'
    const examURL = `${baseURL}/exam/${courseId}${sessionParam}${sebParam}`
    const quitURL = `${baseURL}/courses/${courseId}`
    
    // Create proper XML plist format (NOT JSON!)
    const plistXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>allowBrowsingBackForward</key>
	<false/>
	<key>allowCopy</key>
	<false/>
	<key>allowCut</key>
	<false/>
	<key>allowPaste</key>
	<false/>
	<key>allowQuit</key>
	<true/>
	<key>allowReload</key>
	<false/>
	<key>blockPopUpWindows</key>
	<true/>
	<key>enableAltEsc</key>
	<false/>
	<key>enableAltF4</key>
	<false/>
	<key>enableAltTab</key>
	<false/>
	<key>enableCtrlAltDel</key>
	<false/>
	<key>enableCtrlEsc</key>
	<false/>
	<key>enableEsc</key>
	<false/>
	<key>enableF1</key>
	<false/>
	<key>enableF3</key>
	<false/>
	<key>enableF12</key>
	<false/>
	<key>enableLogging</key>
	<true/>
	<key>enablePrintScreen</key>
	<false/>
	<key>enableRightMouse</key>
	<false/>
	<key>hashedQuitPassword</key>
	<string>YWRtaW4xMjM=</string>
	<key>ignoreExitKeys</key>
	<true/>
	<key>logLevel</key>
	<integer>2</integer>
	<key>newBrowserWindowByLinkPolicy</key>
	<integer>0</integer>
	<key>newBrowserWindowByScriptPolicy</key>
	<integer>0</integer>
	<key>originatorVersion</key>
	<string>SEB_Web_3.10.0</string>
	<key>prohibitedProcesses</key>
	<array>
		<dict>
			<key>active</key>
			<true/>
			<key>currentUser</key>
			<true/>
			<key>description</key>
			<string>Block OBS Studio</string>
			<key>executable</key>
			<string>obs</string>
			<key>windowHandling</key>
			<integer>1</integer>
		</dict>
		<dict>
			<key>active</key>
			<true/>
			<key>currentUser</key>
			<true/>
			<key>description</key>
			<string>Block TeamViewer</string>
			<key>executable</key>
			<string>TeamViewer</string>
			<key>windowHandling</key>
			<integer>1</integer>
		</dict>
		<dict>
			<key>active</key>
			<true/>
			<key>currentUser</key>
			<true/>
			<key>description</key>
			<string>Block Discord</string>
			<key>executable</key>
			<string>Discord</string>
			<key>windowHandling</key>
			<integer>1</integer>
		</dict>
		<dict>
			<key>active</key>
			<true/>
			<key>currentUser</key>
			<true/>
			<key>description</key>
			<string>Block Chrome</string>
			<key>executable</key>
			<string>chrome</string>
			<key>windowHandling</key>
			<integer>1</integer>
		</dict>
		<dict>
			<key>active</key>
			<true/>
			<key>currentUser</key>
			<true/>
			<key>description</key>
			<string>Block Firefox</string>
			<key>executable</key>
			<string>firefox</string>
			<key>windowHandling</key>
			<integer>1</integer>
		</dict>
	</array>
	<key>quitExamPasswordHash</key>
	<string>YWRtaW4xMjM=</string>
	<key>quitExamText</key>
	<string>Enter administrator password to quit exam:</string>
	<key>quitURL</key>
	<string>${quitURL}</string>
	<key>sendBrowserExamKey</key>
	<true/>
	<key>showNavigationButtons</key>
	<false/>
	<key>showReloadButton</key>
	<false/>
	<key>startURL</key>
	<string>${examURL}</string>
	<key>URLFilterEnable</key>
	<true/>
	<key>URLFilterEnableContentFilter</key>
	<true/>
	<key>urlFilterRules</key>
	<array>
		<dict>
			<key>action</key>
			<integer>1</integer>
			<key>active</key>
			<true/>
			<key>expression</key>
			<string>${examURL}</string>
		</dict>
		<dict>
			<key>action</key>
			<integer>1</integer>
			<key>active</key>
			<true/>
			<key>expression</key>
			<string>${baseURL}/api/exam/*</string>
		</dict>
		<dict>
			<key>action</key>
			<integer>1</integer>
			<key>active</key>
			<true/>
			<key>expression</key>
			<string>${baseURL}/api/auth/*</string>
		</dict>
		<dict>
			<key>action</key>
			<integer>0</integer>
			<key>active</key>
			<true/>
			<key>expression</key>
			<string>*</string>
		</dict>
	</array>
</dict>
</plist>`

    console.log('Generated plist XML (first 200 chars):', plistXML.substring(0, 200))

    // Create filename
    const timestamp = Date.now()
    const filename = `secure_exam_${courseId}_${timestamp}.seb`
    
    console.log('Filename:', filename)
    console.log('Content-Type: application/seb')
    console.log('Data size:', plistXML.length, 'bytes')

    // Return as .seb file with correct headers
    return new Response(plistXML, {
      headers: {
        'Content-Type': 'application/seb',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Content-Length': plistXML.length.toString(),
        'X-Debug': 'SEB-XML-Format'
      }
    })

  } catch (error) {
    console.error('ERROR generating SEB config:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate SEB configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}