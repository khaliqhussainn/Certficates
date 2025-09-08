// lib/examService.ts - Updated with all enhanced features
import { prisma } from './prisma';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

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

  // Complete exam and calculate results - ENHANCED VERSION
  async completeExam(examAttemptId: string, reason: string = 'USER_SUBMIT') {
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
    const passed = score >= examAttempt.course.passingScore && reason !== 'SECURITY_VIOLATION';

    // Determine grade
    let grade = 'F';
    if (passed) {
      if (score >= 90) grade = 'A';
      else if (score >= 80) grade = 'B';
      else if (score >= 70) grade = 'C';
      else if (score >= 60) grade = 'D';
    }

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
          status: reason === 'SECURITY_VIOLATION' ? 'TERMINATED' : 'COMPLETED',
          endTime: new Date(),
          score: score,
          passed: passed,
        },
      });
    }

    // Generate certificate if passed and no violations
    let certificate = null;
    if (passed && reason !== 'SECURITY_VIOLATION') {
      // FIXED: Pass all required parameters including grade
      certificate = await this.generateCertificate(
        examAttempt.user, 
        examAttempt.course, 
        completedExam, // Pass the updated exam attempt
        grade // Pass the calculated grade
      );
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
        grade,
        reason
      },
    };
  } catch (error) {
    console.error('Exam completion error:', error);
    throw error;
  }
}

  // Generate certificate - ENHANCED VERSION
  async generateCertificate(user: any, course: any, examAttempt: any, grade: string) {
    try {
      // Generate unique certificate number
      const certificateNumber = `CERT-${course.id.substring(0, 8).toUpperCase()}-${Date.now()}`;
      const verificationCode = `VER-${certificateNumber.substring(5)}`;
      
      // Create certificate record
      const certificate = await prisma.certificate.create({
        data: {
          userId: user.id,
          courseId: course.id,
          examAttemptId: examAttempt.id,
          certificateNumber,
          verificationCode,
          score: examAttempt.score,
          grade: grade,
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

  // Generate PDF certificate - ENHANCED VERSION
  async generateCertificatePDF(certificate: any, user: any, course: any): Promise<string> {
    try {
      const fileName = `certificate-${certificate.certificateNumber}.pdf`;
      const filePath = path.join(process.cwd(), 'public', 'certificates', fileName);
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 72, right: 72 }
      });

      doc.pipe(fs.createWriteStream(filePath));

      // Certificate background and border
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
         .strokeColor('#2563eb')
         .lineWidth(3)
         .stroke();

      doc.rect(35, 35, doc.page.width - 70, doc.page.height - 70)
         .strokeColor('#e5e7eb')
         .lineWidth(1)
         .stroke();

      // Header
      doc.fontSize(48)
         .font('Helvetica-Bold')
         .fillColor('#1e3a8a')
         .text('CERTIFICATE', 0, 120, { align: 'center' });

      doc.fontSize(24)
         .font('Helvetica')
         .fillColor('#374151')
         .text('OF COMPLETION', 0, 180, { align: 'center' });

      // Main content
      doc.fontSize(18)
         .font('Helvetica')
         .fillColor('#374151')
         .text('This is to certify that', 0, 260, { align: 'center' });

      doc.fontSize(36)
         .font('Helvetica-Bold')
         .fillColor('#1e3a8a')
         .text(user.name || 'Student Name', 0, 300, { align: 'center' });

      doc.fontSize(18)
         .font('Helvetica')
         .fillColor('#374151')
         .text('has successfully completed the course', 0, 360, { align: 'center' });

      doc.fontSize(28)
         .font('Helvetica-Bold')
         .fillColor('#2563eb')
         .text(course.title, 0, 400, { align: 'center', width: doc.page.width - 144 });

      // Score and grade information
      doc.fontSize(16)
         .font('Helvetica')
         .fillColor('#6b7280')
         .text(`Final Score: ${certificate.score.toFixed(1)}% | Grade: ${certificate.grade}`, 0, 470, { align: 'center' });

      // Certificate details
      const issuedDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      doc.fontSize(14)
         .font('Helvetica')
         .fillColor('#6b7280')
         .text(`Certificate Number: ${certificate.certificateNumber}`, 0, 520, { align: 'center' })
         .text(`Verification Code: ${certificate.verificationCode}`, 0, 540, { align: 'center' })
         .text(`Issued on: ${issuedDate}`, 0, 560, { align: 'center' });

      // Verification URL
      doc.fontSize(12)
         .text(`Verify this certificate at: ${process.env.NEXTAUTH_URL}/verify/${certificate.certificateNumber}`, 0, 600, { align: 'center' });

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
        examAttempt: {
          select: {
            score: true,
            completedAt: true,
          },
        },
      },
    });

    if (!certificate || certificate.isRevoked || !certificate.isValid) {
      return null;
    }

    // Check if certificate is still valid
    if (certificate.validUntil && new Date() > certificate.validUntil) {
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
        isValid: true,
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
        examAttempt: {
          select: {
            score: true,
            completedAt: true,
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
        isValid: false,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }

  // Get exam statistics
  async getExamStatistics(courseId?: string) {
    const whereClause = courseId ? { courseId } : {};

    const [
      totalAttempts,
      passedAttempts,
      averageScore,
      certificatesIssued,
      recentAttempts
    ] = await Promise.all([
      prisma.examAttempt.count({
        where: { ...whereClause, completedAt: { not: null } },
      }),
      prisma.examAttempt.count({
        where: { ...whereClause, passed: true },
      }),
      prisma.examAttempt.aggregate({
        where: { ...whereClause, completedAt: { not: null } },
        _avg: { score: true },
      }),
      prisma.certificate.count({
        where: { ...whereClause, isRevoked: false },
      }),
      prisma.examAttempt.findMany({
        where: { ...whereClause, completedAt: { not: null } },
        include: {
          user: { select: { name: true, email: true } },
          course: { select: { title: true } },
        },
        orderBy: { completedAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      totalAttempts,
      passedAttempts,
      passRate: totalAttempts > 0 ? (passedAttempts / totalAttempts) * 100 : 0,
      averageScore: averageScore._avg.score || 0,
      certificatesIssued,
      recentAttempts,
    };
  }

  // Get detailed exam analytics
async getExamAnalyticsAlternative(courseId: string) {
  // Get all questions for the course
  const questions = await prisma.examQuestion.findMany({
    where: { courseId, isActive: true },
  });

  // Get all answers for these questions
  const questionIds = questions.map(q => q.id);
  const answers = await prisma.examAnswer.findMany({
    where: { 
      questionId: { in: questionIds },
      examAttempt: {
        completedAt: { not: null }
      }
    },
    include: {
      examAttempt: true
    }
  });

  // Process analytics
  const analytics = questions.map(question => {
    const questionAnswers = answers.filter(answer => answer.questionId === question.id);
    const totalAnswers = questionAnswers.length;
    const correctAnswers = questionAnswers.filter(answer => answer.isCorrect).length;
    const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

    // Calculate option distribution
    const optionDistribution = question.options.map((_, index) => {
      const count = questionAnswers.filter(answer => answer.selectedAnswer === index).length;
      return {
        option: index,
        count,
        percentage: totalAnswers > 0 ? (count / totalAnswers) * 100 : 0
      };
    });

    return {
      questionId: question.id,
      question: question.question,
      difficulty: question.difficulty,
      totalAnswers,
      correctAnswers,
      accuracy,
      optionDistribution,
      averageTimeSpent: questionAnswers.length > 0 
        ? questionAnswers.reduce((sum, answer) => sum + (answer.timeSpent || 0), 0) / questionAnswers.length 
        : 0
    };
  });

  return analytics;
}
}
export const examService = new ExamService();
