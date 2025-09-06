// lib/utils.ts - Keep your existing structure with enhancements
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- Duration Formatting (Enhanced your existing function) ---
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds === 0) {
    return "0:00"
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// New: Detailed duration formatting for your UI
export function formatDetailedDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0 minutes'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)

  return parts.join(' ') || '0m'
}

// --- Progress Calculations (Enhanced your existing function) ---
export function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

// Progress color utilities for your UI
export function getProgressColor(progress: number): string {
  if (progress === 0) return 'text-gray-500'
  if (progress < 25) return 'text-red-500'
  if (progress < 50) return 'text-orange-500'
  if (progress < 75) return 'text-yellow-500'
  if (progress < 100) return 'text-blue-500'
  return 'text-green-500'
}

export function getProgressBgColor(progress: number): string {
  if (progress === 0) return 'bg-gray-200'
  if (progress < 25) return 'bg-red-100'
  if (progress < 50) return 'bg-orange-100'
  if (progress < 75) return 'bg-yellow-100'
  if (progress < 100) return 'bg-blue-100'
  return 'bg-green-100'
}

// --- Time Formatting ---
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d ago`

  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) return `${diffInWeeks}w ago`

  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) return `${diffInMonths}mo ago`

  const diffInYears = Math.floor(diffInDays / 365)
  return `${diffInYears}y ago`
}

export function formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  })
}

// --- String Utilities ---
export function getInitials(name: string): string {
  if (!name) return 'U'
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-')
}

// --- Validation Utilities ---
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

export function validateName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length >= 2 && trimmed.length <= 100
}

export function validatePassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// --- Number Formatting ---
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatPercentage(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`
}

// --- Video Progress Utilities (Keep your existing ones) ---
export function getVideoProgressStatus(
  video: { tests?: any[] },
  progress?: { completed: boolean; testPassed: boolean }
): 'locked' | 'available' | 'completed' | 'quiz-required' {
  if (!progress) return 'available'

  if (!progress.completed) return 'available'

  if (!video.tests || video.tests.length === 0) {
    return progress.completed ? 'completed' : 'available'
  }

  if (progress.completed && !progress.testPassed) {
    return 'quiz-required'
  }

  if (progress.completed && progress.testPassed) {
    return 'completed'
  }

  return 'available'
}

export function validateVideoAccess(
  allVideos: any[],
  currentVideoIndex: number,
  videoProgress: any[]
): { canWatch: boolean; reason?: string; requiredVideo?: string } {
  if (currentVideoIndex === 0) {
    return { canWatch: true }
  }

  for (let i = 0; i < currentVideoIndex; i++) {
    const prevVideo = allVideos[i]
    const prevProgress = videoProgress.find(p => p.videoId === prevVideo.id)

    if (!prevProgress?.completed) {
      return {
        canWatch: false,
        reason: "Previous video not completed",
        requiredVideo: prevVideo.title
      }
    }

    if (prevVideo.tests && prevVideo.tests.length > 0 && !prevProgress.testPassed) {
      return {
        canWatch: false,
        reason: "Previous video quiz not passed",
        requiredVideo: prevVideo.title
      }
    }
  }
  return { canWatch: true }
}

export function getNextAvailableVideo(
  allVideos: any[],
  videoProgress: any[]
): any | null {
  for (let i = 0; i < allVideos.length; i++) {
    const video = allVideos[i]
    const progress = videoProgress.find(p => p.videoId === video.id)

    const status = getVideoProgressStatus(video, progress)

    if (status === 'available' || status === 'quiz-required') {
      return video
    }
  }

  return null
}

export function getCourseStats(
  course: any,
  videoProgress: any[]
) {
  const allVideos = [
    ...(course.sections?.flatMap((section: any) => section.videos) || []),
    ...(course.videos || [])
  ]

  const totalVideos = allVideos.length
  const totalDuration = allVideos.reduce((acc: number, video: any) => acc + (video.duration || 0), 0)

  const completedVideos = videoProgress.filter(p => {
    const video = allVideos.find(v => v.id === p.videoId)
    if (!video) return false

    if (!video.tests || video.tests.length === 0) {
      return p.completed
    }

    return p.completed && p.testPassed
  }).length

  const progressPercentage = calculateProgress(completedVideos, totalVideos)

  return {
    totalVideos,
    totalDuration,
    completedVideos,
    progressPercentage
  }
}

// --- File Utilities ---
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function isValidVideoFormat(filename: string): boolean {
  const validExtensions = /\.(mp4|mov|avi|wmv|mkv|webm|m4v|3gp|flv|f4v)$/i
  return validExtensions.test(filename)
}

export function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

// --- Learning Analytics ---
export function calculateLearningStreak(activities: Array<{ date: string }>): number {
  if (activities.length === 0) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let streak = 0
  let currentDate = new Date(today)

  const activityDates = activities
    .map(activity => {
      const date = new Date(activity.date)
      date.setHours(0, 0, 0, 0)
      return date.getTime()
    })
    .sort((a, b) => b - a) // Sort descending

  const uniqueDates = Array.from(new Set(activityDates))

  for (const dateTime of uniqueDates) {
    const activityDate = new Date(dateTime)
    const dayDiff = Math.floor((currentDate.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24))

    if (dayDiff === streak || (streak === 0 && dayDiff <= 1)) {
      streak++
      currentDate = new Date(activityDate)
    } else {
      break
    }
  }

  return streak
}

export function getAchievementBadge(completedCourses: number): {
  name: string
  color: string
  icon: string
} {
  if (completedCourses >= 20) {
    return { name: 'Master Learner', color: 'text-purple-600', icon: '👑' }
  } else if (completedCourses >= 10) {
    return { name: 'Course Master', color: 'text-yellow-600', icon: '🏆' }
  } else if (completedCourses >= 5) {
    return { name: 'Learning Champion', color: 'text-blue-600', icon: '🎯' }
  } else if (completedCourses >= 1) {
    return { name: 'Quick Learner', color: 'text-green-600', icon: '⚡' }
  } else {
    return { name: 'Getting Started', color: 'text-gray-600', icon: '🌱' }
  }
}

// --- Error Handling ---
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function handleApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }

  if (error instanceof Error) {
    return new ApiError(error.message)
  }

  return new ApiError('An unexpected error occurred')
}

// --- Type Definitions for your project ---
export interface UserStats {
  totalEnrollments: number
  completedCourses: number
  inProgressCourses: number
  totalWatchTime: number
  favoriteCount: number
}

export interface Course {
  id: string
  title: string
  description: string
  thumbnail?: string
  category: string
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  price: number
  isFree: boolean
  isPublished: boolean
  rating: number
  videos: { id: string; duration: number | null }[]
  _count: { enrollments: number }
}

export interface Enrollment {
  id: string
  userId: string
  courseId: string
  progress: number
  enrolledAt: string
  updatedAt: string
  course: Course
  calculatedProgress?: number
}


// --- Constants ---
export const FILE_SIZE_LIMITS = {
  AVATAR: 5 * 1024 * 1024, // 5MB
  VIDEO: 100 * 1024 * 1024, // 100MB
  IMAGE: 10 * 1024 * 1024, // 10MB
} as const

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
] as const

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-ms-wmv',
  'video/x-matroska',
  'video/webm',
  'video/3gpp'
] as const
