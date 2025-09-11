// seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sampleQuestions = [
  {
    question: "What is the primary benefit of using TypeScript over JavaScript?",
    options: [
      "Better performance",
      "Static type checking",
      "Smaller bundle size",
      "Native mobile support"
    ],
    correctAnswer: 1,
    difficulty: "MEDIUM" as const,
    explanation: "TypeScript provides static type checking which helps catch errors at compile time."
  },
  {
    question: "Which of the following is NOT a React Hook?",
    options: [
      "useState",
      "useEffect",
      "useContext",
      "useClass"
    ],
    correctAnswer: 3,
    difficulty: "EASY" as const,
    explanation: "useClass is not a React Hook. React Hooks start with 'use' but useClass doesn't exist."
  },
  {
    question: "What does the 'async' keyword do in JavaScript?",
    options: [
      "Makes a function run faster",
      "Makes a function return a Promise",
      "Makes a function run in parallel",
      "Makes a function synchronous"
    ],
    correctAnswer: 1,
    difficulty: "MEDIUM" as const,
    explanation: "The async keyword makes a function return a Promise automatically."
  },
  {
    question: "Which HTTP status code indicates a successful request?",
    options: [
      "404",
      "500",
      "200",
      "302"
    ],
    correctAnswer: 2,
    difficulty: "EASY" as const,
    explanation: "HTTP status code 200 indicates a successful request."
  },
  {
    question: "What is the time complexity of searching in a balanced binary search tree?",
    options: [
      "O(1)",
      "O(log n)",
      "O(n)",
      "O(n²)"
    ],
    correctAnswer: 1,
    difficulty: "HARD" as const,
    explanation: "Searching in a balanced BST has O(log n) time complexity due to the tree structure."
  },
  {
    question: "Which CSS property is used to create flexible layouts?",
    options: [
      "display: block",
      "display: inline",
      "display: flex",
      "display: table"
    ],
    correctAnswer: 2,
    difficulty: "EASY" as const,
    explanation: "The display: flex property creates flexible layouts using Flexbox."
  },
  {
    question: "What is the purpose of the useEffect hook in React?",
    options: [
      "To manage component state",
      "To handle side effects",
      "To create custom hooks",
      "To optimize performance"
    ],
    correctAnswer: 1,
    difficulty: "MEDIUM" as const,
    explanation: "useEffect is used to handle side effects like API calls, subscriptions, etc."
  },
  {
    question: "Which of the following is a NoSQL database?",
    options: [
      "MySQL",
      "PostgreSQL",
      "MongoDB",
      "SQLite"
    ],
    correctAnswer: 2,
    difficulty: "EASY" as const,
    explanation: "MongoDB is a popular NoSQL document database."
  },
  {
    question: "What does REST stand for in web APIs?",
    options: [
      "Representational State Transfer",
      "Remote State Transfer",
      "Relational State Transfer",
      "Responsive State Transfer"
    ],
    correctAnswer: 0,
    difficulty: "MEDIUM" as const,
    explanation: "REST stands for Representational State Transfer."
  },
  {
    question: "Which Git command is used to create a new branch?",
    options: [
      "git new branch",
      "git branch new",
      "git checkout -b",
      "git create branch"
    ],
    correctAnswer: 2,
    difficulty: "EASY" as const,
    explanation: "git checkout -b creates and switches to a new branch."
  },
  {
    question: "In React, what is the virtual DOM?",
    options: [
      "A copy of the browser DOM",
      "A JavaScript representation of the UI",
      "A database for components",
      "A testing framework"
    ],
    correctAnswer: 1,
    difficulty: "MEDIUM" as const,
    explanation: "The virtual DOM is a JavaScript representation of the UI that React uses for efficient updates."
  },
  {
    question: "Which of the following is NOT a JavaScript data type?",
    options: [
      "String",
      "Boolean",
      "Float",
      "Symbol"
    ],
    correctAnswer: 2,
    difficulty: "EASY" as const,
    explanation: "JavaScript uses 'number' for all numeric values, not separate 'float' type."
  },
  {
    question: "What is the main advantage of using a CDN (Content Delivery Network)?",
    options: [
      "Better security",
      "Faster content delivery",
      "Lower costs",
      "Easier development"
    ],
    correctAnswer: 1,
    difficulty: "MEDIUM" as const,
    explanation: "CDNs deliver content from servers closer to users, reducing latency and improving speed."
  },
  {
    question: "In database design, what does ACID stand for?",
    options: [
      "Atomicity, Consistency, Isolation, Durability",
      "Access, Control, Integration, Distribution",
      "Application, Client, Interface, Database",
      "Authentication, Certification, Identity, Data"
    ],
    correctAnswer: 0,
    difficulty: "HARD" as const,
    explanation: "ACID properties ensure database reliability: Atomicity, Consistency, Isolation, Durability."
  },
  {
    question: "Which of the following is a correct way to declare a variable in ES6?",
    options: [
      "var name = \"John\"",
      "let name = \"John\"",
      "const name = \"John\"",
      "All of the above"
    ],
    correctAnswer: 3,
    difficulty: "EASY" as const,
    explanation: "All three are valid ways to declare variables in ES6, each with different scoping rules."
  },
  {
    question: "What is the purpose of Docker containers?",
    options: [
      "To replace virtual machines entirely",
      "To package applications with their dependencies",
      "To speed up internet connections",
      "To encrypt data transmission"
    ],
    correctAnswer: 1,
    difficulty: "MEDIUM" as const,
    explanation: "Docker containers package applications with all their dependencies for consistent deployment."
  },
  {
    question: "In object-oriented programming, what is inheritance?",
    options: [
      "Creating multiple instances of a class",
      "A class acquiring properties from another class",
      "Deleting unused objects from memory",
      "Converting data types automatically"
    ],
    correctAnswer: 1,
    difficulty: "MEDIUM" as const,
    explanation: "Inheritance allows a class to acquire properties and methods from a parent class."
  },
  {
    question: "Which SQL command is used to retrieve data from a database?",
    options: [
      "GET",
      "FETCH",
      "SELECT",
      "RETRIEVE"
    ],
    correctAnswer: 2,
    difficulty: "EASY" as const,
    explanation: "SELECT is the SQL command used to query and retrieve data from database tables."
  },
  {
    question: "What is the main purpose of a load balancer?",
    options: [
      "To increase server storage capacity",
      "To distribute incoming requests across multiple servers",
      "To compress data before transmission",
      "To encrypt user passwords"
    ],
    correctAnswer: 1,
    difficulty: "MEDIUM" as const,
    explanation: "Load balancers distribute incoming network traffic across multiple servers to ensure reliability and performance."
  },
  {
    question: "In agile development, what is a sprint?",
    options: [
      "A bug in the code that needs urgent fixing",
      "A time-boxed iteration of development work",
      "A meeting between developers and clients",
      "A type of automated testing"
    ],
    correctAnswer: 1,
    difficulty: "EASY" as const,
    explanation: "A sprint is a time-boxed iteration, usually 1-4 weeks, where a team works on a specific set of features."
  }
];

async function seedExamQuestions(courseId: string) {
  try {
    console.log(`Seeding exam questions for course: ${courseId}`);

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      console.error(`Course with ID ${courseId} not found`);
      return;
    }

    // Delete existing questions for this course
    await prisma.examQuestion.deleteMany({
      where: { courseId: courseId }
    });

    // Create new questions
    for (let i = 0; i < sampleQuestions.length; i++) {
      const questionData = sampleQuestions[i];

      await prisma.examQuestion.create({
        data: {
          courseId: courseId,
          question: questionData.question,
          options: questionData.options,
          correctAnswer: questionData.correctAnswer,
          difficulty: questionData.difficulty,
          explanation: questionData.explanation,
          order: i + 1,
          isActive: true
        }
      });
    }

    // Update course with question count
    await prisma.course.update({
      where: { id: courseId },
      data: {
        totalQuestions: sampleQuestions.length,
        certificateEnabled: true
      }
    });

    console.log(`Successfully seeded ${sampleQuestions.length} questions for course ${courseId}`);

  } catch (error) {
    console.error('Error seeding exam questions:', error);
  }
}

// Usage: Replace with your actual course ID
const COURSE_ID = 'cmf85risg00f5m39qohee8u37'; // Your course ID from the logs

async function main() {
  await seedExamQuestions(COURSE_ID);
  await prisma.$disconnect();
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export { seedExamQuestions };
