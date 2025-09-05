// Certificate Platform: types/integration.d.ts
export interface CourseWebsiteUser {
  id: string
  email: string
  name: string
  image?: string
  enrollments: CourseEnrollment[]
}

export interface CourseEnrollment {
  courseId: string
  progress: number
  completedAt?: string
  courseTitle?: string
  courseCategory?: string
  courseLevel?: string
}

export interface CourseWebsiteCourse {
  id: string
  title: string
  description: string
  category: string
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  thumbnail?: string
  isPublished: boolean
  rating?: number
  price?: number
  isFree?: boolean
}

export interface ExamSession {
  sessionId: string
  examAttemptId: string
  safeBrowserKey: string
}

export interface BrowserData {
  userAgent: string
  screen: {
    width: number
    height: number
  }
  timezone: string
}

export interface MonitoringData {
  tabSwitched?: boolean
  windowBlurred?: boolean
  fullscreenExit?: boolean
  copyPasteAttempt?: boolean
}

export interface ExamResults {
  examAttempt: any
  certificate?: any
  results: {
    score: number
    passed: boolean
    totalQuestions: number
    correctAnswers: number
    timeSpent: number
    passingScore: number
  }
}