// Certificate Platform: app/dashboard/courses/page.tsx
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
  price?: number
  isFree?: boolean
  passingScore: number
  examDuration: number
}

interface UserData {
  completions: any[]
  certificates: any[]
  examAttempts: any[]
  payments: any[]
}

export default function CoursesPage() {
  const { data: session } = useSession()
  const [courses, setCourses] = useState<Course[]>([])
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'completed' | 'available'>('all')

  useEffect(() => {
    if (session?.user?.id) {
      fetchData()
    }
  }, [session])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch all courses
      const coursesResponse = await fetch('/api/courses')
      const coursesData = await coursesResponse.json()
      
      // Fetch user enrollments
      const userResponse = await fetch('/api/user/enrollments')
      const userData = await userResponse.json()

      setCourses(coursesData.courses || [])
      setUserData(userData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCompletedCourseIds = () => {
    return userData?.completions?.map(c => c.courseId) || []
  }

  const getCertificatedCourseIds = () => {
    return userData?.certificates?.map(c => c.courseId) || []
  }

  const hasPaidForCourse = (courseId: string) => {
    return userData?.payments?.some(p => 
      p.courseId === courseId && p.status === 'COMPLETED'
    ) || false
  }

  const filteredCourses = courses.filter(course => {
    const completedIds = getCompletedCourseIds()
    
    switch (filter) {
      case 'completed':
        return completedIds.includes(course.id)
      case 'available':
        return !completedIds.includes(course.id)
      default:
        return true
    }
  })

  const getCourseStatus = (course: Course) => {
    const completedIds = getCompletedCourseIds()
    const certificatedIds = getCertificatedCourseIds()
    const hasPaid = hasPaidForCourse(course.id)

    if (certificatedIds.includes(course.id)) {
      return { status: 'certificated', color: 'bg-green-100 text-green-800', text: 'Certified' }
    }
    if (completedIds.includes(course.id)) {
      if (hasPaid) {
        return { status: 'can-exam', color: 'bg-blue-100 text-blue-800', text: 'Exam Available' }
      }
      return { status: 'completed', color: 'bg-yellow-100 text-yellow-800', text: 'Completed' }
    }
    return { status: 'available', color: 'bg-gray-100 text-gray-800', text: 'Available' }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading courses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Certificate Courses</h1>
          <p className="mt-2 text-gray-600">
            Complete courses to unlock certificate exams and earn professional credentials
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'all', label: 'All Courses', count: courses.length },
                { key: 'completed', label: 'Completed', count: getCompletedCourseIds().length },
                { key: 'available', label: 'Available', count: courses.length - getCompletedCourseIds().length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    filter === tab.key
                      ? 'border-blue-500 text-blue-600'
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
            
            return (
              <div key={course.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
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
                    <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
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
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {course.title}
                  </h3>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {course.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>{course.category}</span>
                    {course.rating && (
                      <div className="flex items-center">
                        <span className="text-yellow-400">★</span>
                        <span className="ml-1">{course.rating}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-900">
                        Certificate Exam: ${course.certificatePrice}
                      </span>
                      <span className="text-xs text-gray-500">
                        {course.passingScore}% to pass
                      </span>
                    </div>
                    
                    <Link
                      href={`/dashboard/courses/${course.id}`}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-center block"
                    >
                      {courseStatus.status === 'certificated' ? 'View Certificate' :
                       courseStatus.status === 'can-exam' ? 'Take Exam' :
                       courseStatus.status === 'completed' ? 'Get Certificate' :
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'completed' ? 'No completed courses yet' :
               filter === 'available' ? 'No available courses' :
               'No courses found'}
            </h3>
            <p className="text-gray-600">
              {filter === 'completed' 
                ? 'Complete courses on the main website to see them here'
                : 'Check back later for new courses'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}