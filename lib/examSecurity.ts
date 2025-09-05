// lib/examSecurity.ts
import { prisma } from './prisma';
import crypto from 'crypto';

interface BrowserData {
  userAgent: string;
  screen: {
    width: number;
    height: number;
  };
  timezone: string;
}

interface MonitoringData {
  tabSwitched?: boolean;
  windowBlurred?: boolean;
  fullscreenExit?: boolean;
  copyPasteAttempt?: boolean;
}

export class ExamSecurityService {
  private encryptionKey: string;

  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key';
  }

  // Generate browser fingerprint for exam session
  generateBrowserFingerprint(userAgent: string, screen: any, timezone: string): string {
    const data = `${userAgent}-${screen.width}x${screen.height}-${timezone}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Start secure exam session
  async startExamSession(userId: string, courseId: string, browserData: BrowserData, ipAddress: string) {
    try {
      // Check if user has paid for exam
      const payment = await prisma.payment.findFirst({
        where: {
          userId,
          courseId,
          status: 'COMPLETED',
        },
      });

      if (!payment) {
        throw new Error('Payment required for exam access');
      }

      // Check for existing active sessions
      const activeSession = await prisma.examSession.findFirst({
        where: {
          userId,
          courseId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      });

      if (activeSession) {
        throw new Error('Exam session already active');
      }

      // Generate security keys
      const browserFingerprint = this.generateBrowserFingerprint(
        browserData.userAgent,
        browserData.screen,
        browserData.timezone
      );
      const safeBrowserKey = crypto.randomBytes(32).toString('hex');

      // Create exam session
      const session = await prisma.examSession.create({
        data: {
          userId,
          courseId,
          browserFingerprint,
          ipAddress,
          safeBrowserKey,
          status: 'PENDING',
        },
      });

      // Create exam attempt
      const examAttempt = await prisma.examAttempt.create({
        data: {
          userId,
          courseId,
          sessionId: session.id,
        },
      });

      // Update session with attempt ID
      await prisma.examSession.update({
        where: { id: session.id },
        data: { examAttemptId: examAttempt.id },
      });

      return {
        sessionId: session.id,
        examAttemptId: examAttempt.id,
        safeBrowserKey,
      };
    } catch (error) {
      console.error('Exam session start error:', error);
      throw error;
    }
  }

  // Validate exam session security during exam
  async validateSession(sessionId: string, browserData: BrowserData, ipAddress: string): Promise<boolean> {
    try {
      const session = await prisma.examSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) return false;

      const currentFingerprint = this.generateBrowserFingerprint(
        browserData.userAgent,
        browserData.screen,
        browserData.timezone
      );

      // Check security parameters
      const isValid = 
        session.browserFingerprint === currentFingerprint &&
        session.ipAddress === ipAddress &&
        session.status === 'IN_PROGRESS';

      if (!isValid) {
        await this.recordViolation(sessionId, {
          type: 'SECURITY_BREACH',
          details: {
            expectedFingerprint: session.browserFingerprint,
            actualFingerprint: currentFingerprint,
            expectedIP: session.ipAddress,
            actualIP: ipAddress,
            timestamp: new Date(),
          },
        });
      }

      return isValid;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  // Record security violations
  async recordViolation(sessionId: string, violation: any) {
    try {
      const session = await prisma.examSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) return;

      const violations = (session.violations as any[]) || [];
      violations.push({
        ...violation,
        timestamp: new Date(),
      });

      await prisma.examSession.update({
        where: { id: sessionId },
        data: {
          violations: violations,
        },
      });

      // If too many violations, terminate session
      if (violations.length >= 3) {
        await this.terminateSession(sessionId, 'MULTIPLE_VIOLATIONS');
      }
    } catch (error) {
      console.error('Violation recording error:', error);
    }
  }

  // Terminate exam session
  async terminateSession(sessionId: string, reason: string) {
    try {
      const session = await prisma.examSession.findUnique({
        where: { id: sessionId },
        include: { examAttempt: true },
      });

      if (!session) return;

      const violations = (session.violations as any[]) || [];
      violations.push({
        type: 'SESSION_TERMINATED',
        reason,
        timestamp: new Date(),
      });

      await prisma.examSession.update({
        where: { id: sessionId },
        data: {
          status: 'TERMINATED',
          endTime: new Date(),
          violations: violations,
        },
      });

      // Also update the exam attempt
      if (session.examAttempt) {
        await prisma.examAttempt.update({
          where: { id: session.examAttempt.id },
          data: {
            completedAt: new Date(),
            violations: {
              sessionTerminated: true,
              reason,
              timestamp: new Date(),
            },
          },
        });
      }
    } catch (error) {
      console.error('Session termination error:', error);
    }
  }

  // Monitor exam session (called periodically during exam)
  async monitorSession(sessionId: string, monitoringData: MonitoringData) {
    try {
      const violations = [];

      // Check for tab switching
      if (monitoringData.tabSwitched) {
        violations.push({
          type: 'TAB_SWITCH',
          details: 'User switched browser tabs',
        });
      }

      // Check for window focus loss
      if (monitoringData.windowBlurred) {
        violations.push({
          type: 'WINDOW_BLUR',
          details: 'Browser window lost focus',
        });
      }

      // Check for fullscreen exit
      if (monitoringData.fullscreenExit) {
        violations.push({
          type: 'FULLSCREEN_EXIT',
          details: 'User exited fullscreen mode',
        });
      }

      // Check for copy/paste attempts
      if (monitoringData.copyPasteAttempt) {
        violations.push({
          type: 'COPY_PASTE_ATTEMPT',
          details: 'User attempted to copy or paste',
        });
      }

      // Record violations
      for (const violation of violations) {
        await this.recordViolation(sessionId, violation);
      }

      return { violations: violations.length };
    } catch (error) {
      console.error('Session monitoring error:', error);
      return { violations: 0 };
    }
  }

  // Generate Safe Exam Browser configuration
  generateSEBConfig(sessionId: string, courseId: string) {
    return {
      examSessionServiceURL: `${process.env.NEXTAUTH_URL}/api/exam/session/${sessionId}`,
      quitURL: `${process.env.NEXTAUTH_URL}/exam/complete`,
      startURL: `${process.env.NEXTAUTH_URL}/exam/${courseId}?session=${sessionId}`,
      sebServerConfiguration: {
        url: `${process.env.NEXTAUTH_URL}/api/exam/seb-config`,
        fallback: true,
      },
      browserExamKey: process.env.SAFE_EXAM_BROWSER_KEY,
      configKey: crypto.randomBytes(32).toString('hex'),
      allowBrowsingBackForward: false,
      allowReloading: false,
      showReloadButton: false,
      allowQuit: true,
      ignoreQuitPassword: false,
      allowSpellCheck: false,
      allowDictation: false,
      enableAppSwitcherCheck: true,
      forceAppFolderInstall: true,
      enableLogging: true,
      logLevel: 2,
      URLFilterEnable: true,
      URLFilterEnableContentFilter: true,
      permittedProcesses: [],
      prohibitedProcesses: [
        {
          active: true,
          currentUser: true,
          description: "Block screen recording software",
          executable: "obs",
          identifier: "com.obsproject.obs-studio",
          windowHandling: 1
        },
        {
          active: true,
          currentUser: true,
          description: "Block TeamViewer",
          executable: "TeamViewer",
          identifier: "com.teamviewer.TeamViewer",
          windowHandling: 1
        }
      ]
    };
  }
}

export const examSecurity = new ExamSecurityService();