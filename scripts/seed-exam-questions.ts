// scripts/seed-exam-questions.ts - Run this script to seed questions
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const examQuestions = [
  {
    question: "What is the primary purpose of professional certification?",
    options: [
      "To demonstrate knowledge and skills in a specific field",
      "To complete educational requirements only",
      "To practice basic concepts",
      "To earn academic credits"
    ],
    correctAnswer: 0,
    difficulty: "EASY" as const,
    explanation: "Professional certification validates expertise and competency in a specific field."
  },
  {
    question: "Which approach best demonstrates professional competency?",
    options: [
      "Memorizing theoretical concepts only",
      "Applying knowledge to solve real-world problems",
      "Following standard procedures without adaptation",
      "Completing tasks without understanding context"
    ],
    correctAnswer: 1,
    difficulty: "MEDIUM" as const,
    explanation: "True competency is shown through practical application of knowledge."
  },
  {
    question: "What is the most effective way to maintain professional development?",
    options: [
      "Attending occasional training sessions",
      "Reading industry publications monthly",
      "Continuously learning and adapting to new practices",
      "Following established routines without change"
    ],
    correctAnswer: 2,
    difficulty: "MEDIUM" as const,
    explanation: "Continuous learning ensures staying current with industry evolution."
  },
  {
    question: "In professional practice, how should you handle ethical dilemmas?",
    options: [
      "Follow personal preferences",
      "Consult established ethical guidelines and principles",
      "Choose the easiest solution",
      "Avoid making difficult decisions"
    ],
    correctAnswer: 1,
    difficulty: "HARD" as const,
    explanation: "Ethical guidelines provide the framework for professional decision-making."
  },
  {
    question: "What characterizes effective professional communication?",
    options: [
      "Using complex technical jargon exclusively",
      "Communicating clearly and appropriately for the audience",
      "Avoiding detailed explanations",
      "Speaking only when directly asked"
    ],
    correctAnswer: 1,
    difficulty: "EASY" as const,
    explanation: "Clear, audience-appropriate communication is essential for professional success."
  },
  {
    question: "Which factor is most important for successful project completion?",
    options: [
      "Working independently without consultation",
      "Following the original plan without deviation",
      "Effective planning, communication, and adaptability",
      "Completing tasks as quickly as possible"
    ],
    correctAnswer: 2,
    difficulty: "MEDIUM" as const,
    explanation: "Successful projects require comprehensive planning and the ability to adapt."
  },
  {
    question: "How should professionals approach quality assurance?",
    options: [
      "Check work only at the final stage",
      "Implement systematic quality controls throughout the process",
      "Rely solely on experience and intuition",
      "Focus only on meeting minimum requirements"
    ],
    correctAnswer: 1,
    difficulty: "MEDIUM" as const,
    explanation: "Quality assurance should be integrated throughout the entire work process."
  },
  {
    question: "What is the best approach to handling professional feedback?",
    options: [
      "Accept all feedback without question",
      "Ignore criticism and focus on praise",
      "Evaluate feedback objectively and use it for improvement",
      "Respond defensively to protect your reputation"
    ],
    correctAnswer: 2,
    difficulty: "EASY" as const,
    explanation: "Professional growth comes from objectively evaluating and acting on constructive feedback."
  },
  {
    question: "When facing a complex problem, what should be your first step?",
    options: [
      "Immediately implement the first solution that comes to mind",
      "Thoroughly analyze and understand the problem",
      "Delegate the problem to someone else",
      "Wait for more information before taking any action"
    ],
    correctAnswer: 1,
    difficulty: "MEDIUM" as const,
    explanation: "Understanding the problem thoroughly is crucial before developing solutions."
  },
  {
    question: "What defines professional accountability?",
    options: [
      "Only taking responsibility for successes",
      "Blaming external factors for failures",
      "Taking ownership of both successes and failures",
      "Avoiding situations where you might be held responsible"
    ],
    correctAnswer: 2,
    difficulty: "EASY" as const,
    explanation: "Professional accountability means owning the outcomes of your actions and decisions."
  }
]

async function seedExamQuestions() {
  try {
    console.log('🌱 Starting to seed exam questions...')
    
    // Get the course ID from the error log
    const COURSE_ID = 'cmf85risg00f5m39qohee8u37' // From your error logs

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: COURSE_ID }
    })

    if (!course) {
      console.log('❌ Course not found. Creating sample course...')
      
      // Create a sample course
      await prisma.course.create({
        data: {
          id: COURSE_ID,
          title: 'Entrepreneurship & Startup Fundamentals',
          description: 'Learn the fundamentals of entrepreneurship and startup development.',
          category: 'Business',
          level: 'INTERMEDIATE',
          isPublished: true,
          certificatePrice: 99.00,
          passingScore: 70,
          examDuration: 120,
          totalQuestions: examQuestions.length,
          certificateEnabled: true
        }
      })
      
      console.log('✅ Sample course created')
    }

    // Delete existing questions for this course
    const deletedCount = await prisma.examQuestion.deleteMany({
      where: { courseId: COURSE_ID }
    })
    
    if (deletedCount.count > 0) {
      console.log(`🗑️ Deleted ${deletedCount.count} existing questions`)
    }

    // Create new questions
    let createdCount = 0
    for (let i = 0; i < examQuestions.length; i++) {
      const questionData = examQuestions[i]

      await prisma.examQuestion.create({
        data: {
          courseId: COURSE_ID,
          question: questionData.question,
          options: questionData.options,
          correctAnswer: questionData.correctAnswer,
          difficulty: questionData.difficulty,
          explanation: questionData.explanation,
          order: i + 1,
          isActive: true
        }
      })
      
      createdCount++
      console.log(`📝 Created question ${i + 1}/${examQuestions.length}`)
    }

    // Update course with correct question count
    await prisma.course.update({
      where: { id: COURSE_ID },
      data: {
        totalQuestions: examQuestions.length,
        certificateEnabled: true
      }
    })

    console.log(`✅ Successfully seeded ${createdCount} exam questions for course: ${COURSE_ID}`)
    console.log('🎯 Course is now ready for certificate exams!')

  } catch (error) {
    console.error('❌ Error seeding exam questions:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding function
seedExamQuestions()
  .then(() => {
    console.log('🎉 Seeding completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error)
    process.exit(1)
  })