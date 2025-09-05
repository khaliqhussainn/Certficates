// app/dashboard/courses/page.tsx - Only show courses user has booked for certificate exam
'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'

interface Course {
  id: string
  title: string
  description: string
  category: string
  level: string
  thumbnail?: string
  certificatePrice: number
  rating?: number
  passingScore: number
  examDuration: number
  totalQuestions?: number
}

interface BookedCourse extends Course {
  payment: {
    id: string
    amount: number
    status: string
    createdAt: string
  }
  completion?: {
    id: string
    completedAt: string
    progress: number
  }
  certificate?: {
    id: string
    certificateNumber: string
    score: number
    issuedAt: string
    pdfPath?: string
  }
  examAttempts: {
    id: string
    score?: number
    passed: boolean
    startedAt: string
    completedAt?: string
    timeSpent?: number
  }[]
  canTakeExam: boolean
}

export default function DashboardCoursesPage() {
  const { data: session } = useSession()
  const [bookedCourses, setBookedCourses] = useState<BookedCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'ready' | 'completed' | 'certified'>('all')

  const navigation = [
    { id: 'overview', name: 'Overview', icon: '🏠', href: '/dashboard' },
    { id: 'courses', name: 'My Certificates', icon: '📚', href: '/dashboard/courses' },
    { id: 'certificates', name: 'Certificates', icon: '🏆', href: '/dashboard/certificates' },
    { id: 'exams', name: 'Exams', icon: '📝', href: '/dashboard/exams' },
    { id: 'payments', name: 'Payments', icon: '💳', href: '/dashboard/payments' },
    { id: 'profile', name: 'Profile', icon: '👤', href: '/dashboard/profile' },
  ]

  useEffect(() => {
    if (session?.user?.id) {
      fetchBookedCourses()
    }
  }, [session])

  const fetchBookedCourses = async () => {
    try {
      setLoading(true)
      
      // Fetch only courses that user has paid for (booked certificate exams)
      const response = await fetch('/api/user/booked-certificates')
      const data = await response.json()
      
      if (response.ok) {
        setBookedCourses(data.bookedCourses || [])
      }
    } catch (error) {
      console.error('Error fetching booked courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCourseStatus = (course: BookedCourse) => {
    if (course.certificate) {
      return { 
        status: 'certified', 
        color: 'bg-green-100 text-green-800', 
        text: 'Certified',
        priority: 4
      }
    }
    
    if (course.canTakeExam && course.completion) {
      return { 
        status: 'ready', 
        color: 'bg-blue-100 text-blue-800', 
        text: 'Ready for Exam',
        priority: 3
      }
    }
    
    if (course.payment.status === 'COMPLETED' && !course.completion) {
      return { 
        status: 'pending', 
        color: 'bg-yellow-100 text-yellow-800', 
        text: 'Complete Course First',
        priority: 1
      }
    }
    
    if (course.payment.status === 'COMPLETED' && course.completion && !course.canTakeExam) {
      return { 
        status: 'completed', 
        color: 'bg-purple-100 text-purple-800', 
        text: 'Course Completed',
        priority: 2
      }
    }
    
    return { 
      status: 'pending', 
      color: 'bg-gray-100 text-gray-800', 
      text: 'Payment Pending',
      priority: 0
    }
  }

  const filteredCourses = bookedCourses.filter(course => {
    const status = getCourseStatus(course).status
    
    switch (filter) {
      case 'pending':
        return status === 'pending'
      case 'ready':
        return status === 'ready'
      case 'completed':
        return status === 'completed'
      case 'certified':
        return status === 'certified'
      default:
        return true
    }
  }).sort((a, b) => {
    // Sort by status priority and then by most recent
    const statusA = getCourseStatus(a).priority
    const statusB = getCourseStatus(b).priority
    
    if (statusA !== statusB) {
      return statusB - statusA // Higher priority first
    }
    
    return new Date(b.payment.createdAt).getTime() - new Date(a.payment.createdAt).getTime()
  })

  const getFilterCounts = () => {
    return {
      all: bookedCourses.length,
      pending: bookedCourses.filter(c => getCourseStatus(c).status === 'pending').length,
      ready: bookedCourses.filter(c => getCourseStatus(c).status === 'ready').length,
      completed: bookedCourses.filter(c => getCourseStatus(c).status === 'completed').length,
      certified: bookedCourses.filter(c => getCourseStatus(c).status === 'certified').length,
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#001e62] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your certificate courses...</p>
        </div>
      </div>
    )
  }

  const counts = getFilterCounts()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#001e62]">My Certificate Courses</h1>
          <p className="mt-2 text-gray-600">
            Manage your certificate exams and track your progress
          </p>
          
          {bookedCourses.length === 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-800">
                You haven't booked any certificate exams yet. 
                <Link href="/courses" className="font-medium underline ml-1">
                  Browse available courses
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 overflow-x-auto">
              {navigation.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    item.id === 'courses'
                      ? 'border-[#001e62] text-[#001e62]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {bookedCourses.length > 0 && (
          <>
            {/* Filter Tabs */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {[
                    { key: 'all', label: 'All Booked', count: counts.all },
                    { key: 'ready', label: 'Ready for Exam', count: counts.ready },
                    { key: 'certified', label: 'Certified', count: counts.certified },
                    { key: 'completed', label: 'Course Completed', count: counts.completed },
                    { key: 'pending', label: 'Pending', count: counts.pending }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setFilter(tab.key as any)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        filter === tab.key
                          ? 'border-[#001e62] text-[#001e62]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => {
                const courseStatus = getCourseStatus(course)
                const lastAttempt = course.examAttempts[course.examAttempts.length - 1]
                
                return (
                  <div key={course.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow border border-gray-200">
                    <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                      {course.thumbnail ? (
                        <Image
                          src={course.thumbnail}
                          alt={course.title}
                          width={400}
                          height={225}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-[#001e62] to-[#001e62]/80 flex items-center justify-center">
                          <span className="text-white text-2xl font-bold">
                            {course.title.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${courseStatus.color}`}>
                          {courseStatus.text}
                        </span>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {course.level}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-[#001e62] mb-2">
                        {course.title}
                      </h3>
                      
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {course.description}
                      </p>
                      
                      {/* Course Progress Info */}
                      <div className="space-y-2 mb-4 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Booked:</span>
                          <span className="font-medium">{formatDate(course.payment.createdAt)}</span>
                        </div>
                        
                        {course.completion && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Completed:</span>
                            <span className="font-medium text-green-600">{formatDate(course.completion.completedAt)}</span>
                          </div>
                        )}
                        
                        {course.certificate && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Certified:</span>
                            <span className="font-medium text-green-600">{course.certificate.score.toFixed(1)}%</span>
                          </div>
                        )}
                        
                        {lastAttempt && !course.certificate && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Last Attempt:</span>
                            <span className={`font-medium ${lastAttempt.passed ? 'text-green-600' : 'text-red-600'}`}>
                              {lastAttempt.score?.toFixed(1)}%
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Exam Attempts:</span>
                          <span className="font-medium">{course.examAttempts.length}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <span className="bg-[#001e62]/10 text-[#001e62] px-2 py-1 rounded text-xs font-medium">
                          {course.category}
                        </span>
                        <span className="text-xs">
                          ${course.payment.amount} paid
                        </span>
                      </div>
                      
                      <div className="border-t pt-4">
                        <Link
                          href={`/dashboard/courses/${course.id}`}
                          className="w-full bg-[#001e62] text-white py-2 px-4 rounded-lg hover:bg-[#001e62]/90 transition-colors text-center block"
                        >
                          {courseStatus.status === 'certified' ? 'View Certificate' :
                           courseStatus.status === 'ready' ? 'Take Exam' :
                           courseStatus.status === 'completed' ? 'Start Exam' :
                           'View Details'}
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {filteredCourses.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📚</div>
                <h3 className="text-lg font-medium text-[#001e62] mb-2">
                  {filter === 'ready' ? 'No exams ready yet' :
                   filter === 'certified' ? 'No certificates earned yet' :
                   filter === 'completed' ? 'No courses completed yet' :
                   filter === 'pending' ? 'No pending items' :
                   'No courses found'}
                </h3>
                <p className="text-gray-600">
                  {filter === 'ready' 
                    ? 'Complete your courses to unlock certificate exams'
                    : filter === 'certified'
                    ? 'Take and pass certificate exams to earn certificates'
                    : 'Check your course progress and payment status'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}