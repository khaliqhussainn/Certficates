'use client'
// app/courses/page.tsx - Modern Course Cards
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
  Building2,
  ArrowRight
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

  const categories = Array.from(new Set(courses.map(course => course.category)))
  const levels = Array.from(new Set(courses.map(course => course.level)))

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
        text: 'Get Certified',
        href: '/auth/signin',
        className: 'w-full bg-[#001e62] text-white py-3 px-6 rounded-xl hover:bg-[#001e62]/90 transition-all hover:scale-[1.02] text-center block font-semibold shadow-lg shadow-[#001e62]/20',
        icon: <GraduationCap className="w-5 h-5" />
      }
    }

    const status = getUserStatus(course.id)

    if (status.hasCertificate) {
      return {
        text: 'View Certificate',
        href: `/dashboard/courses/${course.id}`,
        className: 'w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-6 rounded-xl hover:from-green-700 hover:to-green-800 transition-all hover:scale-[1.02] text-center block font-semibold shadow-lg shadow-green-600/20',
        icon: <Award className="w-5 h-5" />
      }
    }

    if (status.hasBooked) {
      return {
        text: 'Continue Learning',
        href: `/dashboard/courses/${course.id}`,
        className: 'w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all hover:scale-[1.02] text-center block font-semibold shadow-lg shadow-blue-600/20',
        icon: <BookOpen className="w-5 h-5" />
      }
    }

    return {
      text: 'Get Certificate',
      href: `/courses/${course.id}`,
      className: 'w-full bg-[#001e62] text-white py-3 px-6 rounded-xl hover:bg-[#001e62]/90 transition-all hover:scale-[1.02] text-center block font-semibold shadow-lg shadow-[#001e62]/20',
      icon: <GraduationCap className="w-5 h-5" />
    }
  }

  const getLevelBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'bg-gradient-to-r from-green-500 to-green-600 text-white'
      case 'intermediate':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'
      case 'advanced':
        return 'bg-gradient-to-r from-red-500 to-red-600 text-white'
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#001e62] via-[#001e62] to-[#003399] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl">
              <GraduationCap className="w-16 h-16 text-white" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Professional Certificates
          </h1>
          <p className="text-xl text-blue-100 mb-10 max-w-3xl mx-auto leading-relaxed">
            Advance your career with industry-recognized certificates. Complete courses, take secure proctored exams, 
            and earn blockchain-verified credentials.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            {!session ? (
              <Link
                href="/auth/signin"
                className="inline-flex items-center px-8 py-4 border-2 border-white text-lg font-semibold rounded-xl text-[#001e62] bg-white hover:bg-blue-50 transition-all hover:scale-105 shadow-xl"
              >
                <GraduationCap className="w-6 h-6 mr-2" />
                Get Started Today
              </Link>
            ) : (
              <Link
                href="/dashboard/courses"
                className="inline-flex items-center px-8 py-4 border-2 border-white text-lg font-semibold rounded-xl text-[#001e62] bg-white hover:bg-blue-50 transition-all hover:scale-105 shadow-xl"
              >
                <BookOpen className="w-6 h-6 mr-2" />
                My Certificates
              </Link>
            )}
            
            <div className="flex items-center gap-3 text-white bg-white/10 backdrop-blur-sm px-6 py-3 rounded-xl">
              <BookOpen className="w-5 h-5" />
              <span className="font-semibold text-lg">{courses.length}</span>
              <span className="text-blue-100">Courses Available</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: BookOpen, title: "Learn First", desc: "Comprehensive courses with hands-on projects" },
              { icon: Shield, title: "Proctored Exam", desc: "Secure, monitored exams that validate your skills" },
              { icon: Award, title: "Earn Certificate", desc: "Blockchain-verified credentials employers trust" }
            ].map((feature, idx) => (
              <div key={idx} className="text-center p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 hover:shadow-lg transition-shadow">
                <div className="flex justify-center mb-4">
                  <div className="bg-[#001e62] p-4 rounded-xl">
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-[#001e62] mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white py-8 border-y border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 max-w-md w-full">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#001e62] focus:border-[#001e62] transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 items-center">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#001e62] focus:border-[#001e62] font-medium transition-all"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#001e62] focus:border-[#001e62] font-medium transition-all"
              >
                <option value="all">All Levels</option>
                {levels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-gray-600 font-medium flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              Showing {filteredCourses.length} of {courses.length} courses
            </p>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#001e62] border-t-transparent"></div>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-[#001e62] mb-3">No courses found</h3>
              <p className="text-gray-600 text-lg">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCourses.map((course) => {
                const userStatus = getUserStatus(course.id)
                const actionButton = getActionButton(course)
                
                return (
                  <div key={course.id} className="group bg-white rounded-2xl shadow-md transition-all duration-300 overflow-hidden border border-gray-100 hover:-translate-y-2">
                    {/* Course Image */}
                    <div className="relative h-52 overflow-hidden">
                      {course.thumbnail ? (
                        <Image
                          src={course.thumbnail}
                          alt={course.title}
                          width={400}
                          height={225}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#001e62] via-[#003399] to-[#0055cc] flex items-center justify-center">
                          <BookOpen className="w-16 h-16 text-white/80" />
                        </div>
                      )}
                      
                      {/* Status Badge */}
                      {session && userStatus.hasCertificate && (
                        <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1.5 rounded-full text-sm font-bold flex items-center shadow-lg">
                          <Award className="w-4 h-4 mr-1" />
                          Certified
                        </div>
                      )}
                      {session && userStatus.hasBooked && !userStatus.hasCertificate && (
                        <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1.5 rounded-full text-sm font-bold flex items-center shadow-lg">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Enrolled
                        </div>
                      )}

                      {/* Level Badge */}
                      <div className="absolute bottom-4 left-4">
                        <span className={`${getLevelBadge(course.level)} px-4 py-1.5 rounded-full text-sm font-bold shadow-lg`}>
                          {course.level}
                        </span>
                      </div>
                    </div>

                    {/* Course Content */}
                    <div className="p-6">
                      {/* Category */}
                      <div className="mb-3">
                        <span className="inline-block text-sm text-[#001e62] font-bold bg-blue-100 px-3 py-1 rounded-full">
                          {course.category}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold text-[#001e62] mb-3 line-clamp-2 group-hover:text-[#003399] transition-colors min-h-[3.5rem]">
                        {course.title}
                      </h3>
                      
                      {/* Description */}
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3 min-h-[4rem]">
                        {course.description}
                      </p>

                      {/* Course Stats */}
                      <div className="grid grid-cols-2 gap-3 mb-5 pb-5 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-50 p-2 rounded-lg">
                            <Clock className="w-4 h-4 text-[#001e62]" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Duration</p>
                            <p className="text-sm font-bold text-gray-900">{formatDuration(course.examDuration)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-50 p-2 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-[#001e62]" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Pass Score</p>
                            <p className="text-sm font-bold text-gray-900">{course.passingScore}%</p>
                          </div>
                        </div>
                      </div>

                      {/* Skills */}
                      {course.skillsGained && course.skillsGained.length > 0 && (
                        <div className="mb-5">
                          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Skills You'll Gain</p>
                          <div className="flex flex-wrap gap-2">
                            {course.skillsGained.slice(0, 3).map((skill, index) => (
                              <span key={index} className="text-xs bg-gradient-to-r from-blue-50 to-blue-100 text-[#001e62] px-3 py-1 rounded-full font-medium">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Price and CTA */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Certificate Fee</p>
                            <p className="text-3xl font-bold text-[#001e62]">${course.certificatePrice}</p>
                          </div>
                          {course.rating && (
                            <div className="text-right">
                              <div className="flex items-center gap-1 mb-1">
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                <span className="text-lg font-bold text-gray-900">{course.rating}</span>
                              </div>
                              <p className="text-xs text-gray-500">Rating</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Action Button */}
                        <Link
                          href={actionButton.href}
                          className={`${actionButton.className} flex items-center justify-center gap-2 group/btn`}
                        >
                          {actionButton.icon}
                          <span>{actionButton.text}</span>
                          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                        
                        {/* View Details Link */}
                        <Link
                          href={`/courses/${course.id}`}
                          className="text-sm text-[#001e62] hover:text-[#003399] font-semibold flex items-center justify-center gap-1 group/link"
                        >
                          View Full Details
                          <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Why Choose Section */}
      <div className="bg-white py-20 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-6">
              <div className="bg-[#001e62] p-4 rounded-2xl">
                <Award className="w-12 h-12 text-white" />
              </div>
            </div>
            <h2 className="text-4xl font-bold text-[#001e62] mb-4">
              Why Choose Our Certificates?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Industry-recognized credentials that boost your career
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Shield, title: "Secure & Proctored", desc: "AI-monitored exams ensure integrity" },
              { icon: CheckCircle, title: "Blockchain Verified", desc: "Tamper-proof on blockchain" },
              { icon: Building2, title: "Employer Recognized", desc: "Trusted by leading companies" },
              { icon: TrendingUp, title: "Career Impact", desc: "Proven to increase opportunities" }
            ].map((item, idx) => (
              <div key={idx} className="text-center p-6 rounded-2xl hover:bg-blue-50 transition-colors">
                <div className="flex justify-center mb-4">
                  <div className="bg-blue-100 p-3 rounded-xl">
                    <item.icon className="w-7 h-7 text-[#001e62]" />
                  </div>
                </div>
                <h3 className="font-bold text-[#001e62] mb-2 text-lg">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-[#001e62] via-[#001e62] to-[#003399] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl">
              <GraduationCap className="w-12 h-12 text-white" />
            </div>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Advance Your Career?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Join thousands of professionals who have earned industry-recognized certificates
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            {!session ? (
              <>
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center px-8 py-4 text-lg font-bold rounded-xl text-[#001e62] bg-white hover:bg-blue-50 transition-all hover:scale-105 shadow-xl"
                >
                  <GraduationCap className="w-6 h-6 mr-2" />
                  Start Your Journey
                </Link>
                <Link
                  href="/about"
                  className="inline-flex items-center px-8 py-4 border-2 border-white text-lg font-bold rounded-xl text-white hover:bg-white/10 transition-all hover:scale-105"
                >
                  <BookOpen className="w-6 h-6 mr-2" />
                  Learn More
                </Link>
              </>
            ) : (
              <Link
                href="/dashboard/courses"
                className="inline-flex items-center px-8 py-4 text-lg font-bold rounded-xl text-[#001e62] bg-white hover:bg-blue-50 transition-all hover:scale-105 shadow-xl"
              >
                <BookOpen className="w-6 h-6 mr-2" />
                View My Certificates
              </Link>
            )}
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
              <Award className="w-10 h-10 text-white mx-auto mb-3" />
              <div className="text-4xl font-bold text-white mb-2">10,000+</div>
              <p className="text-blue-100">Certificates Issued</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
              <TrendingUp className="w-10 h-10 text-white mx-auto mb-3" />
              <div className="text-4xl font-bold text-white mb-2">95%</div>
              <p className="text-blue-100">Career Advancement</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
              <Building2 className="w-10 h-10 text-white mx-auto mb-3" />
              <div className="text-4xl font-bold text-white mb-2">500+</div>
              <p className="text-blue-100">Employer Partners</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}