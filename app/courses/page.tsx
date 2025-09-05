// app/courses/page.tsx - Improved Public Courses Page
'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  BookOpen, 
  Clock, 
  Star, 
  Users, 
  Award, 
  CheckCircle, 
  Search,
  Filter,
  GraduationCap,
  Shield,
  TrendingUp,
  Building2
} from 'lucide-react'

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
  isPublished: boolean
  prerequisites?: string[]
  learningOutcomes?: string[]
  instructor?: string
  estimatedStudyTime?: string
  courseDuration?: string
  skillsGained?: string[]
  price?: number
  enrollmentCount?: number
}

interface UserStatus {
  hasBooked: boolean
  hasCompleted: boolean
  hasCertificate: boolean
  payment?: {
    status: string
    amount: number
  }
}

export default function CoursesPage() {
  const { data: session } = useSession()
  const [courses, setCourses] = useState<Course[]>([])
  const [userStatuses, setUserStatuses] = useState<Record<string, UserStatus>>({})
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    if (session?.user?.id && courses.length > 0) {
      fetchUserStatuses()
    }
  }, [session, courses])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/courses/public')
      if (response.ok) {
        const data = await response.json()
        setCourses(data.courses.filter((course: Course) => course.isPublished))
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserStatuses = async () => {
    try {
      const response = await fetch('/api/user/course-statuses')
      if (response.ok) {
        const data = await response.json()
        setUserStatuses(data.statuses || {})
      }
    } catch (error) {
      console.error('Error fetching user statuses:', error)
    }
  }

  // Get unique categories and levels
  const categories = Array.from(new Set(courses.map(course => course.category)))
  const levels = Array.from(new Set(courses.map(course => course.level)))

  // Filter courses based on selected filters and search
  const filteredCourses = courses.filter(course => {
    const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory
    const matchesLevel = selectedLevel === 'all' || course.level === selectedLevel
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.category.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesCategory && matchesLevel && matchesSearch
  })

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const getUserStatus = (courseId: string): UserStatus => {
    return userStatuses[courseId] || {
      hasBooked: false,
      hasCompleted: false,
      hasCertificate: false
    }
  }

  const getActionButton = (course: Course) => {
    if (!session) {
      return {
        text: 'Sign In to Get Certificate',
        href: '/auth/signin',
        className: 'w-full bg-[#001e62] text-white py-3 px-4 rounded-lg hover:bg-[#001e62]/90 transition-colors text-center block font-medium',
        icon: <GraduationCap className="w-4 h-4 mr-2" />
      }
    }

    const status = getUserStatus(course.id)

    if (status.hasCertificate) {
      return {
        text: 'View Certificate',
        href: `/dashboard/courses/${course.id}`,
        className: 'w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors text-center block font-medium',
        icon: <Award className="w-4 h-4 mr-2" />
      }
    }

    if (status.hasBooked) {
      return {
        text: 'Go to Dashboard',
        href: `/dashboard/courses/${course.id}`,
        className: 'w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors text-center block font-medium',
        icon: <BookOpen className="w-4 h-4 mr-2" />
      }
    }

    return {
      text: 'Get Certificate',
      href: `/courses/${course.id}`,
      className: 'w-full bg-[#001e62] text-white py-3 px-4 rounded-lg hover:bg-[#001e62]/90 transition-colors text-center block font-medium',
      icon: <GraduationCap className="w-4 h-4 mr-2" />
    }
  }

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'advanced':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-[#001e62] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-6">
            <GraduationCap className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Professional Certificate Courses
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Advance your career with industry-recognized certificates. Complete courses, take secure proctored exams, 
            and earn blockchain-verified credentials that employers trust.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {!session ? (
              <Link
                href="/auth/signin"
                className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-[#001e62] bg-white hover:bg-gray-50 transition-colors"
              >
                <GraduationCap className="w-5 h-5 mr-2" />
                Get Started Today
              </Link>
            ) : (
              <Link
                href="/dashboard/courses"
                className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-[#001e62] bg-white hover:bg-gray-50 transition-colors"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                View My Certificates
              </Link>
            )}
            
            <div className="text-blue-100 text-sm flex items-center">
              <BookOpen className="w-4 h-4 mr-2" />
              <span className="font-medium">{courses.length}</span> certificate courses available
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <BookOpen className="w-12 h-12 text-[#001e62]" />
              </div>
              <h3 className="text-lg font-semibold text-[#001e62] mb-2">Learn First</h3>
              <p className="text-gray-600">Complete comprehensive courses with hands-on projects and practical skills</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Shield className="w-12 h-12 text-[#001e62]" />
              </div>
              <h3 className="text-lg font-semibold text-[#001e62] mb-2">Take Proctored Exam</h3>
              <p className="text-gray-600">Secure, monitored certificate exams that validate your knowledge</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Award className="w-12 h-12 text-[#001e62]" />
              </div>
              <h3 className="text-lg font-semibold text-[#001e62] mb-2">Earn Certificate</h3>
              <p className="text-gray-600">Get blockchain-verified certificates recognized by top employers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white py-8 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search certificate courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001e62] focus:border-[#001e62]"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001e62] focus:border-[#001e62]"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001e62] focus:border-[#001e62]"
              >
                <option value="all">All Levels</option>
                {levels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4">
            <p className="text-gray-600 flex items-center">
              <BookOpen className="w-4 h-4 mr-2" />
              Showing {filteredCourses.length} of {courses.length} certificate courses
            </p>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#001e62]"></div>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#001e62] mb-2">No certificate courses found</h3>
              <p className="text-gray-600">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCourses.map((course) => {
                const userStatus = getUserStatus(course.id)
                const actionButton = getActionButton(course)
                
                return (
                  <div key={course.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-200">
                    {/* Course Image */}
                    <div className="relative aspect-w-16 aspect-h-9">
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
                          <BookOpen className="w-12 h-12 text-white" />
                        </div>
                      )}
                      
                      {/* Status Badge */}
                      {session && userStatus.hasCertificate && (
                        <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                          <Award className="w-3 h-3 mr-1" />
                          Certified
                        </div>
                      )}
                      {session && userStatus.hasBooked && !userStatus.hasCertificate && (
                        <div className="absolute top-3 right-3 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Booked
                        </div>
                      )}
                    </div>

                    {/* Course Content */}
                    <div className="p-6">
                      {/* Category and Level */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-[#001e62] font-medium bg-[#001e62]/10 px-3 py-1 rounded-full">
                          {course.category}
                        </span>
                        <span className={`text-sm font-medium px-2 py-1 rounded ${getLevelColor(course.level)}`}>
                          {course.level}
                        </span>
                      </div>

                      {/* Title and Description */}
                      <h3 className="text-xl font-semibold text-[#001e62] mb-2 line-clamp-2">
                        {course.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {course.description}
                      </p>

                      {/* Course Details */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            Exam Duration:
                          </span>
                          <span className="font-medium">{formatDuration(course.examDuration)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 flex items-center">
                            <TrendingUp className="w-4 h-4 mr-1" />
                            Passing Score:
                          </span>
                          <span className="font-medium">{course.passingScore}%</span>
                        </div>
                        {course.totalQuestions && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 flex items-center">
                              <BookOpen className="w-4 h-4 mr-1" />
                              Questions:
                            </span>
                            <span className="font-medium">{course.totalQuestions}</span>
                          </div>
                        )}
                        {course.estimatedStudyTime && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              Study Time:
                            </span>
                            <span className="font-medium">{course.estimatedStudyTime}</span>
                          </div>
                        )}
                        {course.rating && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Rating:</span>
                            <div className="flex items-center">
                              <Star className="w-4 h-4 text-yellow-400 mr-1" />
                              <span className="font-medium">{course.rating}</span>
                            </div>
                          </div>
                        )}
                        {course.enrollmentCount && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              Students:
                            </span>
                            <span className="font-medium">{course.enrollmentCount.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Skills & Outcomes */}
                      {course.skillsGained && course.skillsGained.length > 0 && (
                        <div className="border-t pt-3 mb-4">
                          <p className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                            <Award className="w-4 h-4 mr-1" />
                            Skills You'll Gain:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {course.skillsGained.slice(0, 3).map((skill, index) => (
                              <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {skill}
                              </span>
                            ))}
                            {course.skillsGained.length > 3 && (
                              <span className="text-xs text-gray-500">+{course.skillsGained.length - 3} more</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Instructor */}
                      {course.instructor && (
                        <div className="border-t pt-3 mb-4">
                          <p className="text-sm text-gray-600 flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            <span className="font-medium">Instructor:</span>
                            <span className="ml-1">{course.instructor}</span>
                          </p>
                        </div>
                      )}

                      {/* Price and CTA */}
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="text-sm text-gray-500 flex items-center">
                              <Award className="w-4 h-4 mr-1" />
                              Certificate Exam Fee
                            </span>
                            <div className="text-2xl font-bold text-[#001e62]">
                              ${course.certificatePrice}
                            </div>
                            <span className="text-xs text-gray-500">One-time payment after course completion</span>
                          </div>
                          {course.rating && (
                            <div className="text-right">
                              <div className="flex items-center text-yellow-400 mb-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`w-4 h-4 ${i < Math.floor(course.rating!) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                                ))}
                              </div>
                              <span className="text-xs text-gray-500">{course.rating} rating</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Action Button */}
                        <Link
                          href={actionButton.href}
                          className={`${actionButton.className} flex items-center justify-center`}
                        >
                          {actionButton.icon}
                          {actionButton.text}
                        </Link>
                        
                        {/* Additional Info */}
                        <div className="mt-2 text-center">
                          <Link
                            href={`/courses/${course.id}`}
                            className="text-sm text-[#001e62] hover:text-[#001e62]/80 font-medium flex items-center justify-center"
                          >
                            <BookOpen className="w-4 h-4 mr-1" />
                            View Full Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Certificate Value Proposition */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <Award className="w-12 h-12 text-[#001e62]" />
            </div>
            <h2 className="text-3xl font-bold text-[#001e62] mb-4">
              Why Choose Our Certificates?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Industry-recognized credentials that validate your skills and boost your career prospects
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <Shield className="w-8 h-8 text-[#001e62]" />
              </div>
              <h3 className="font-semibold text-[#001e62] mb-2">Secure & Proctored</h3>
              <p className="text-sm text-gray-600">AI-monitored exams ensure credential integrity</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <CheckCircle className="w-8 h-8 text-[#001e62]" />
              </div>
              <h3 className="font-semibold text-[#001e62] mb-2">Blockchain Verified</h3>
              <p className="text-sm text-gray-600">Tamper-proof certificates on the blockchain</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <Building2 className="w-8 h-8 text-[#001e62]" />
              </div>
              <h3 className="font-semibold text-[#001e62] mb-2">Employer Recognized</h3>
              <p className="text-sm text-gray-600">Trusted by leading companies worldwide</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <TrendingUp className="w-8 h-8 text-[#001e62]" />
              </div>
              <h3 className="font-semibold text-[#001e62] mb-2">Career Impact</h3>
              <p className="text-sm text-gray-600">Proven to increase job opportunities</p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-6">
            <GraduationCap className="w-12 h-12 text-[#001e62]" />
          </div>
          <h2 className="text-3xl font-bold text-[#001e62] mb-4">
            Ready to Advance Your Career?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of professionals who have earned industry-recognized certificates and advanced their careers.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            {!session ? (
              <>
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-[#001e62] hover:bg-[#001e62]/90 transition-colors"
                >
                  <GraduationCap className="w-5 h-5 mr-2" />
                  Start Your Journey
                </Link>
                <Link
                  href="/about"
                  className="inline-flex items-center px-8 py-3 border border-[#001e62] text-base font-medium rounded-lg text-[#001e62] bg-white hover:bg-[#001e62]/5 transition-colors"
                >
                  <BookOpen className="w-5 h-5 mr-2" />
                  Learn More
                </Link>
              </>
            ) : (
              <Link
                href="/dashboard/courses"
                className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-[#001e62] hover:bg-[#001e62]/90 transition-colors"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                View My Certificates
              </Link>
            )}
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Award className="w-8 h-8 text-[#001e62]" />
              </div>
              <div className="text-3xl font-bold text-[#001e62] mb-2">10,000+</div>
              <p className="text-gray-600">Certificates Issued</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <TrendingUp className="w-8 h-8 text-[#001e62]" />
              </div>
              <div className="text-3xl font-bold text-[#001e62] mb-2">95%</div>
              <p className="text-gray-600">Career Advancement Rate</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Building2 className="w-8 h-8 text-[#001e62]" />
              </div>
              <div className="text-3xl font-bold text-[#001e62] mb-2">500+</div>
              <p className="text-gray-600">Employer Partners</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}