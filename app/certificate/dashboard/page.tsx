'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import {
  Search,
  Filter,
  Award,
  Clock,
  DollarSign,
  Users,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Calendar,
  Star,
  TrendingUp,
  Shield,
  Globe,
  Play,
  GraduationCap,
  Target,
  Zap
} from 'lucide-react'

interface Course {
  id: string
  title: string
  description: string
  thumbnail?: string
  category: string
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  certificatePrice: number
  certificateDiscount: number
  certificateEnabled: boolean
  passingScore: number
  examDuration: number
  totalQuestions: number
  rating: number
  isCompleted?: boolean
  completedAt?: string
}

interface UserStats {
  completedCourses: number
  earnedCertificates: number
  passedExams: number
  totalSpent: number
}

interface ExamApplication {
  id: string
  courseId: string
  courseName: string
  status: string
  scheduledAt?: string
  createdAt: string
  amountPaid?: number
}

interface Certificate {
  id: string
  courseId: string
  courseName: string
  certificateNumber: string
  issueDate: string
  score: number
  grade: string
  verificationCode: string
  certificateUrl?: string
}

export default function CertificateDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // State management
  const [courses, setCourses] = useState<Course[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [applications, setApplications] = useState<ExamApplication[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('')
  const [activeTab, setActiveTab] = useState('browse')
  
  // Filter states
  const [categories, setCategories] = useState<string[]>([])
  
  useEffect(() => {
    if (status === 'loading') return
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    
    fetchData()
  }, [status, router])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch all data in parallel
      const [coursesRes, statsRes, applicationsRes, certificatesRes] = await Promise.all([
        fetch('/api/certificate/courses'),
        fetch('/api/certificate/user/stats'),
        fetch('/api/certificate/applications'),
        fetch('/api/certificate/certificates')
      ])
      
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json()
        setCourses(coursesData)
        setCategories([...new Set(coursesData.map((c: Course) => c.category))])
      }
      
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setUserStats(statsData)
      }
      
      if (applicationsRes.ok) {
        const applicationsData = await applicationsRes.json()
        setApplications(applicationsData)
      }
      
      if (certificatesRes.ok) {
        const certificatesData = await certificatesRes.json()
        setCertificates(certificatesData)
      }
      
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || course.category === selectedCategory
    const matchesLevel = !selectedLevel || course.level === selectedLevel
    const isEnabled = course.certificateEnabled
    
    return matchesSearch && matchesCategory && matchesLevel && isEnabled
  })

  const formatPrice = (price: number, discount: number = 0) => {
    const finalPrice = price - (price * discount / 100)
    return finalPrice.toFixed(2)
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'BEGINNER': return 'bg-green-100 text-green-800 border-green-200'
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'ADVANCED': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'scheduled': return 'bg-purple-100 text-purple-800'
      case 'pending_payment': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your certificate dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <GraduationCap className="w-8 h-8 text-blue-600 mr-2" />
                <span className="text-xl font-bold text-gray-900">CertifyPro</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => router.push('/course-platform')}>
                <BookOpen className="w-4 h-4 mr-2" />
                Learning Platform
              </Button>
              
              <div className="flex items-center">
                <Image
                  src={session?.user?.image || '/default-avatar.png'}
                  alt="Profile"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  {session?.user?.name}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Welcome to Your Certification Journey
            </h1>
            <p className="text-xl opacity-90 mb-6">
              Earn industry-recognized certificates and validate your skills
            </p>
            
            {userStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{userStats.completedCourses}</div>
                  <div className="text-sm opacity-75">Completed Courses</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{userStats.earnedCertificates}</div>
                  <div className="text-sm opacity-75">Certificates Earned</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{userStats.passedExams}</div>
                  <div className="text-sm opacity-75">Exams Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">${userStats.totalSpent}</div>
                  <div className="text-sm opacity-75">Total Invested</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'browse', label: 'Browse Certificates', icon: Search },
                { key: 'applications', label: 'My Applications', icon: Calendar },
                { key: 'certificates', label: 'My Certificates', icon: Award }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Browse Certificates Tab */}
        {activeTab === 'browse' && (
          <div>
            {/* Filters */}
            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search certificates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Levels</option>
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
                
                <Button variant="outline" className="flex items-center">
                  <Filter className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map(course => (
                <Card key={course.id} className="hover:shadow-lg transition-shadow duration-300">
                  <div className="relative">
                    <img
                      src={course.thumbnail || '/course-placeholder.jpg'}
                      alt={course.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    {course.isCompleted && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completed
                      </div>
                    )}
                  </div>
                  
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{course.title}</CardTitle>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {course.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                      <Badge className={getLevelColor(course.level)}>
                        {course.level}
                      </Badge>
                      <div className="flex items-center text-sm text-gray-500">
                        <Star className="w-4 h-4 text-yellow-400 mr-1" />
                        {course.rating}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        Exam Duration: {course.examDuration} minutes
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Target className="w-4 h-4 mr-2" />
                        {course.totalQuestions} questions • {course.passingScore}% to pass
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Shield className="w-4 h-4 mr-2" />
                        Proctored & Secure
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        {course.certificateDiscount > 0 ? (
                          <div>
                            <span className="text-lg font-bold text-green-600">
                              ${formatPrice(course.certificatePrice, course.certificateDiscount)}
                            </span>
                            <span className="text-sm text-gray-500 line-through ml-2">
                              ${course.certificatePrice}
                            </span>
                            <Badge className="ml-2 bg-red-100 text-red-800">
                              {course.certificateDiscount}% OFF
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-lg font-bold text-gray-900">
                            ${course.certificatePrice}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        className="flex-1"
                        onClick={() => router.push(`/certificate/course/${course.id}`)}
                      >
                        <Award className="w-4 h-4 mr-2" />
                        Apply for Certificate
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => router.push(`/course/${course.id}`)}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredCourses.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  No certificates found
                </h3>
                <p className="text-gray-500">
                  Try adjusting your search filters to find certificates
                </p>
              </div>
            )}
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div className="space-y-4">
            {applications.length > 0 ? (
              applications.map(application => (
                <Card key={application.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{application.courseName}</h3>
                        <p className="text-sm text-gray-600">
                          Applied on {new Date(application.createdAt).toLocaleDateString()}
                        </p>
                        {application.scheduledAt && (
                          <p className="text-sm text-blue-600 mt-1">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Scheduled for {new Date(application.scheduledAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(application.status)}>
                          {application.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        {application.amountPaid && (
                          <p className="text-sm text-gray-600 mt-1">
                            Paid: ${application.amountPaid}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <Button 
                        size="sm" 
                        onClick={() => router.push(`/certificate/application/${application.id}`)}
                      >
                        View Details
                      </Button>
                      {application.status === 'SCHEDULED' && (
                        <Button 
                          size="sm" 
                          onClick={() => router.push(`/certificate/exam/${application.id}`)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Start Exam
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  No exam applications yet
                </h3>
                <p className="text-gray-500 mb-4">
                  Start by applying for a certificate exam
                </p>
                <Button onClick={() => setActiveTab('browse')}>
                  Browse Available Certificates
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Certificates Tab */}
        {activeTab === 'certificates' && (
          <div className="space-y-4">
            {certificates.length > 0 ? (
              certificates.map(certificate => (
                <Card key={certificate.id} className="border-l-4 border-l-green-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg flex items-center">
                          <Award className="w-5 h-5 text-green-600 mr-2" />
                          {certificate.courseName}
                        </h3>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-600">
                            <strong>Certificate #:</strong> {certificate.certificateNumber}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Issue Date:</strong> {new Date(certificate.issueDate).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Score:</strong> {certificate.score}% (Grade: {certificate.grade})
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Verification Code:</strong> {certificate.verificationCode}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-green-100 text-green-800 mb-2">
                          Verified
                        </Badge>
                        <div className="flex flex-col space-y-2">
                          <Button size="sm" variant="outline">
                            Download PDF
                          </Button>
                          <Button size="sm" variant="outline">
                            Share Certificate
                          </Button>
                          <Button size="sm" variant="outline">
                            Verify Online
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  No certificates earned yet
                </h3>
                <p className="text-gray-500 mb-4">
                  Pass an exam to earn your first certificate
                </p>
                <Button onClick={() => setActiveTab('browse')}>
                  Browse Available Certificates
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}