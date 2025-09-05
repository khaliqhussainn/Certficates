// lib/examService.ts
import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const prisma = new PrismaClient();

export class ExamService {
  // Get exam questions for a course
  async getExamQuestions(courseId: string, shuffle: boolean = true) {
    const questions = await prisma.examQuestion.findMany({
      where: {
        courseId,
        isActive: true,
      },
      orderBy: shuffle ? undefined : { order: 'asc' },
    });

    if (shuffle) {
      // Shuffle questions and options
      questions.sort(() => Math.random() - 0.5);
      questions.forEach(question => {
        const correctAnswer = question.options[question.correctAnswer];
        question.options.sort(() => Math.random() - 0.5);
        question.correctAnswer = question.options.indexOf(correctAnswer);
      });
    }

    // Remove correct answers from response (security)
    return questions.map(({ correctAnswer, explanation, ...question }) => question);
  }

  // Submit exam answer
  async submitAnswer(examAttemptId: string, questionId: string, selectedAnswer: number, timeSpent: number) {
    try {
      const question = await prisma.examQuestion.findUnique({
        where: { id: questionId },
      });

      if (!question) {
        throw new Error('Question not found');
      }

      const isCorrect = selectedAnswer === question.correctAnswer;

      await prisma.examAnswer.upsert({
        where: {
          examAttemptId_questionId: {
            examAttemptId,
            questionId,
          },
        },
        update: {
          selectedAnswer,
          isCorrect,
          timeSpent,
        },
        create: {
          examAttemptId,
          questionId,
          selectedAnswer,
          isCorrect,
          timeSpent,
        },
      });

      return { success: true, isCorrect };
    } catch (error) {
      console.error('Answer submission error:', error);
      throw error;
    }
  }

  // Complete exam and calculate results
  async completeExam(examAttemptId: string) {
    try {
      const examAttempt = await prisma.examAttempt.findUnique({
        where: { id: examAttemptId },
        include: {
          answers: {
            include: {
              question: true,
            },
          },
          course: true,
          user: true,
          session: true,
        },
      });

      if (!examAttempt) {
        throw new Error('Exam attempt not found');
      }

      // Calculate score
      const totalQuestions = examAttempt.answers.length;
      const correctAnswers = examAttempt.answers.filter(answer => answer.isCorrect).length;
      const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
      const passed = score >= examAttempt.course.passingScore;

      // Calculate time spent
      const totalTimeSpent = examAttempt.answers.reduce((total, answer) => total + (answer.timeSpent || 0), 0);

      // Update exam attempt
      const completedExam = await prisma.examAttempt.update({
        where: { id: examAttemptId },
        data: {
          score,
          passed,
          completedAt: new Date(),
          timeSpent: Math.round(totalTimeSpent / 60), // Convert to minutes
        },
      });

      // Close exam session
      if (examAttempt.session) {
        await prisma.examSession.update({
          where: { id: examAttempt.session.id },
          data: {
            status: 'COMPLETED',
            endTime: new Date(),
          },
        });
      }

      // Generate certificate if passed
      let certificate = null;
      if (passed) {
        certificate = await this.generateCertificate(examAttempt.user, examAttempt.course, completedExam);
      }

      return {
        examAttempt: completedExam,
        certificate,
        results: {
          score,
          passed,
          totalQuestions,
          correctAnswers,
          timeSpent: Math.round(totalTimeSpent / 60),
          passingScore: examAttempt.course.passingScore,
        },
      };
    } catch (error) {
      console.error('Exam completion error:', error);
      throw error;
    }
  }

  // Generate certificate
  async generateCertificate(user: any, course: any, examAttempt: any) {
    try {
      // Generate unique certificate number
      const certificateNumber = `CERT-${course.id.substring(0, 8)}-${Date.now()}`;
      
      // Create certificate record
      const certificate = await prisma.certificate.create({
        data: {
          userId: user.id,
          courseId: course.id,
          examAttemptId: examAttempt.id,
          certificateNumber,
          score: examAttempt.score,
          issuedAt: new Date(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Valid for 1 year
        },
      });

      // Generate PDF certificate
      const pdfPath = await this.generateCertificatePDF(certificate, user, course);
      
      // Update certificate with PDF path
      await prisma.certificate.update({
        where: { id: certificate.id },
        data: { pdfPath },
      });

      return { ...certificate, pdfPath };
    } catch (error) {
      console.error('Certificate generation error:', error);
      throw error;
    }
  }

  // Generate PDF certificate
  async generateCertificatePDF(certificate: any, user: any, course: any): Promise<string> {
    try {
      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
      });

      const fileName = `certificate-${certificate.certificateNumber}.pdf`;
      const filePath = path.join(process.cwd(), 'public', 'certificates', fileName);
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      doc.pipe(fs.createWriteStream(filePath));

      // Certificate design
      doc.fontSize(40)
         .font('Helvetica-Bold')
         .fillColor('#2563eb')
         .text('Certificate of Completion', 0, 100, { align: 'center' });

      doc.fontSize(16)
         .font('Helvetica')
         .fillColor('#000000')
         .text('This is to certify that', 0, 180, { align: 'center' });

      doc.fontSize(32)
         .font('Helvetica-Bold')
         .fillColor('#1f2937')
         .text(user.name || 'Student', 0, 220, { align: 'center' });

      doc.fontSize(16)
         .font('Helvetica')
         .fillColor('#000000')
         .text('has successfully completed the course', 0, 280, { align: 'center' });

      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor('#2563eb')
         .text(course.title, 0, 320, { align: 'center' });

      doc.fontSize(14)
         .font('Helvetica')
         .fillColor('#6b7280')
         .text(`Score: ${certificate.score.toFixed(1)}%`, 0, 380, { align: 'center' })
         .text(`Certificate Number: ${certificate.certificateNumber}`, 0, 400, { align: 'center' })
         .text(`Issued on: ${certificate.issuedAt.toLocaleDateString()}`, 0, 420, { align: 'center' });

      // Add verification QR code placeholder
      doc.fontSize(12)
         .text(`Verify at: ${process.env.NEXTAUTH_URL}/verify/${certificate.certificateNumber}`, 0, 480, { align: 'center' });

      doc.end();

      return `/certificates/${fileName}`;
    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    }
  }

  // Verify certificate
  async verifyCertificate(certificateNumber: string) {
    const certificate = await prisma.certificate.findUnique({
      where: { certificateNumber },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        course: {
          select: {
            title: true,
            category: true,
            level: true,
          },
        },
      },
    });

    if (!certificate || certificate.isRevoked) {
      return null;
    }

    return certificate;
  }

  // Get user's certificates
  async getUserCertificates(userId: string) {
    return await prisma.certificate.findMany({
      where: {
        userId,
        isRevoked: false,
      },
      include: {
        course: {
          select: {
            title: true,
            category: true,
            level: true,
            thumbnail: true,
          },
        },
      },
      orderBy: {
        issuedAt: 'desc',
      },
    });
  }

  // Admin: Revoke certificate
  async revokeCertificate(certificateId: string, reason: string) {
    return await prisma.certificate.update({
      where: { id: certificateId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }

  // Get exam statistics
  async getExamStatistics(courseId?: string) {
    const whereClause = courseId ? { courseId } : {};

    const totalAttempts = await prisma.examAttempt.count({
      where: { ...whereClause, completedAt: { not: null } },
    });

    const passedAttempts = await prisma.examAttempt.count({
      where: { ...whereClause, passed: true },
    });

    const averageScore = await prisma.examAttempt.aggregate({
      where: { ...whereClause, completedAt: { not: null } },
      _avg: { score: true },
    });

    const certificatesIssued = await prisma.certificate.count({
      where: { ...whereClause, isRevoked: false },
    });

    return {
      totalAttempts,
      passedAttempts,
      passRate: totalAttempts > 0 ? (passedAttempts / totalAttempts) * 100 : 0,
      averageScore: averageScore._avg.score || 0,
      certificatesIssued,
    };
  }
}

export const examService = new ExamService();
