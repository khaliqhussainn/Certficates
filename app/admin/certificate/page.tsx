'use client'
import { useState, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import {
  Settings,
  DollarSign,
  Users,
  Award,
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  Plus,
  Save,
  RefreshCw,
  Download,
  Calendar,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  BarChart3,
  PieChart,
  Target,
  Globe,
  Percent,
  CreditCard
} from 'lucide-react'

interface Course {
  id: string
  title: string
  description: string
  category: string
  level: string
  certificatePrice: number
  certificateDiscount: number
  certificateEnabled: boolean
  passingScore: number
  examDuration: number
  totalQuestions: number
  rating: number
  enrollmentCount: number
  certificatesSold: number
  revenue: number
  examApplications: number
}

interface ExamApplication {
  id: string
  userId: string
  userName: string
  userEmail: string
  courseId: string
  courseName: string
  status: string
  paymentStatus: string
  amountPaid: number
  scheduledAt?: string
  createdAt: string
  examSession?: {
    score?: number
    passed?: boolean
    violations: number
  }
}

interface Certificate {
  [x: string]: ReactNode
  id: string
  certificateNumber: string
  userId: string
  userName: string
  userEmail: string
  courseId: string
  courseName: string
  score: number
  grade: string
  issueDate: string
  isValid: boolean
}

interface DashboardStats {
  totalRevenue: number
  totalApplications: number
  totalCertificates: number
  totalStudents: number
  conversionRate: number
  averageScore: number
  revenueGrowth: number
  monthlyRevenue: { month: string; revenue: number }[]
}

export default function AdminCertificateManagement() {
  const { data: session } = useSession()
  const router = useRouter()
  
  // State
  const [activeTab, setActiveTab] = useState('dashboard')
  const [courses, setCourses] = useState<Course[]>([])
  const [applications, setApplications] = useState<ExamApplication[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [editingCourse, setEditingCourse] = useState<string | null>(null)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (session?.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    
    fetchData()
  }, [session, router])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [statsRes, coursesRes, applicationsRes, certificatesRes] = await Promise.all([
        fetch('/api/admin/certificate/stats'),
        fetch('/api/admin/certificate/courses'),
        fetch('/api/admin/certificate/applications'),
        fetch('/api/admin/certificate/certificates')
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      if (coursesRes.ok) {
        const coursesData = await coursesRes.json()
        setCourses(coursesData)
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
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const updateCourse = async (courseId: string, updates: Partial<Course>) => {
    try {
      const response = await fetch(`/api/admin/certificate/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        setSuccess('Course updated successfully')
        setEditingCourse(null)
        await fetchData()
      } else {
        setError('Failed to update course')
      }
    } catch (error) {
      setError('Network error occurred')
    }
  }

  const toggleCertificateEnabled = async (courseId: string, enabled: boolean) => {
    await updateCourse(courseId, { certificateEnabled: enabled })
  }

  const exportData = async (type: 'applications' | 'certificates' | 'revenue') => {
    try {
      const response = await fetch(`/api/admin/certificate/export?type=${type}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `certificate-${type}-export.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        setSuccess(`${type} data exported successfully`)
      }
    } catch (error) {
      setError('Export failed')
    }
  }

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.courseName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !selectedStatus || app.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  if (session?.user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600">Admin privileges required to access this page.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">Certificate Management</h1>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => router.push('/admin')}
              >
                Back to Admin
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <XCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
            <button onClick={() => setError('')} className="ml-auto">
              <XCircle className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-green-700">{success}</span>
            <button onClick={() => setSuccess('')} className="ml-auto">
              <XCircle className="w-4 h-4 text-green-500" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                { key: 'courses', label: 'Course Settings', icon: Settings },
                { key: 'applications', label: 'Applications', icon: Users },
                { key: 'certificates', label: 'Certificates', icon: Award }
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

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Students</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                    </div>
                    <Target className="w-8 h-8 text-orange-600" />
                  </div>
                  <div className="mt-2">
                    <span className="text-sm text-gray-600">
                      Across all courses
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between space-x-2">
                  {stats.monthlyRevenue.map((month, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div
                        className="bg-blue-500 w-full rounded-t"
                        style={{
                          height: `${(month.revenue / Math.max(...stats.monthlyRevenue.map(m => m.revenue))) * 200}px`
                        }}
                      ></div>
                      <div className="mt-2 text-xs text-gray-600">{month.month}</div>
                      <div className="text-xs font-medium">${month.revenue}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Export Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Export Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-4">
                  <Button
                    onClick={() => exportData('applications')}
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Applications
                  </Button>
                  <Button
                    onClick={() => exportData('certificates')}
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Certificates
                  </Button>
                  <Button
                    onClick={() => exportData('revenue')}
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Revenue
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Course Settings Tab */}
        {activeTab === 'courses' && (
          <div className="space-y-6">
            <div className="grid gap-6">
              {courses.map(course => (
                <Card key={course.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {course.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {course.category} • {course.level}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{course.enrollmentCount} enrolled</span>
                          <span>{course.certificatesSold} certificates sold</span>
                          <span>${course.revenue} revenue</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge
                          className={course.certificateEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                        >
                          {course.certificateEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingCourse(editingCourse === course.id ? null : course.id)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {editingCourse === course.id ? (
                      <div className="border-t pt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Certificate Price ($)
                            </label>
                            <Input
                              type="number"
                              defaultValue={course.certificatePrice}
                              onChange={(e) => {
                                const newPrice = parseFloat(e.target.value) || 0
                                updateCourse(course.id, { certificatePrice: newPrice })
                              }}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Discount (%)
                            </label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              defaultValue={course.certificateDiscount}
                              onChange={(e) => {
                                const discount = parseInt(e.target.value) || 0
                                updateCourse(course.id, { certificateDiscount: discount })
                              }}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Passing Score (%)
                            </label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              defaultValue={course.passingScore}
                              onChange={(e) => {
                                const score = parseInt(e.target.value) || 70
                                updateCourse(course.id, { passingScore: score })
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Exam Duration (minutes)
                            </label>
                            <Input
                              type="number"
                              min="30"
                              max="180"
                              defaultValue={course.examDuration}
                              onChange={(e) => {
                                const duration = parseInt(e.target.value) || 60
                                updateCourse(course.id, { examDuration: duration })
                              }}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Total Questions
                            </label>
                            <Input
                              type="number"
                              min="10"
                              max="100"
                              defaultValue={course.totalQuestions}
                              onChange={(e) => {
                                const questions = parseInt(e.target.value) || 50
                                updateCourse(course.id, { totalQuestions: questions })
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={course.certificateEnabled}
                              onChange={(e) => toggleCertificateEnabled(course.id, e.target.checked)}
                              className="mr-2"
                            />
                            <label className="text-sm font-medium text-gray-700">
                              Enable Certificate for this course
                            </label>
                          </div>

                          <Button
                            size="sm"
                            onClick={() => setEditingCourse(null)}
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Done
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t pt-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Price:</span>
                            <div className="flex items-center">
                              <span className="text-lg font-bold">
                                ${(course.certificatePrice - (course.certificatePrice * course.certificateDiscount / 100)).toFixed(2)}
                              </span>
                              {course.certificateDiscount > 0 && (
                                <span className="ml-2 text-gray-500 line-through text-sm">
                                  ${course.certificatePrice}
                                </span>
                              )}
                              {course.certificateDiscount > 0 && (
                                <Badge className="ml-2 bg-red-100 text-red-800">
                                  -{course.certificateDiscount}%
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <span className="font-medium">Duration:</span>
                            <p>{course.examDuration} minutes</p>
                          </div>
                          
                          <div>
                            <span className="font-medium">Questions:</span>
                            <p>{course.totalQuestions}</p>
                          </div>
                          
                          <div>
                            <span className="font-medium">Pass Score:</span>
                            <p>{course.passingScore}%</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by name, email, or course..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="PENDING_PAYMENT">Pending Payment</option>
                    <option value="PAYMENT_CONFIRMED">Payment Confirmed</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Applications List */}
            <div className="space-y-4">
              {filteredApplications.map(application => (
                <Card key={application.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <h3 className="text-lg font-semibold">{application.userName}</h3>
                          <Badge className={
                            application.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            application.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                            application.status === 'PAYMENT_CONFIRMED' ? 'bg-purple-100 text-purple-800' :
                            application.status === 'PENDING_PAYMENT' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {application.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          <p><strong>Email:</strong> {application.userEmail}</p>
                          <p><strong>Course:</strong> {application.courseName}</p>
                          <p><strong>Applied:</strong> {new Date(application.createdAt).toLocaleDateString()}</p>
                          {application.scheduledAt && (
                            <p><strong>Scheduled:</strong> {new Date(application.scheduledAt).toLocaleDateString()}</p>
                          )}
                          <p><strong>Amount Paid:</strong> ${application.amountPaid}</p>
                          
                          {application.examSession && (
                            <div className="mt-2 p-2 bg-gray-50 rounded">
                              <p><strong>Exam Results:</strong></p>
                              <p>Score: {application.examSession.score}%</p>
                              <p>Status: {application.examSession.passed ? 'Passed' : 'Failed'}</p>
                              {application.examSession.violations > 0 && (
                                <p className="text-red-600">
                                  Security Violations: {application.examSession.violations}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {application.status === 'SCHEDULED' && (
                          <Button size="sm" className="bg-red-600 hover:bg-red-700">
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredApplications.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">
                      No applications found
                    </h3>
                    <p className="text-gray-500">
                      Try adjusting your search filters
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Certificates Tab */}
        {activeTab === 'certificates' && (
          <div className="space-y-6">
            <div className="space-y-4">
              {certificates.map(certificate => (
                <Card key={certificate.id} className="border-l-4 border-l-green-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <h3 className="text-lg font-semibold">{certificate.userName}</h3>
                          <Badge className="bg-green-100 text-green-800">
                            Grade {certificate.grade}
                          </Badge>
                          {!certificate.isValid && (
                            <Badge className="bg-red-100 text-red-800">
                              Revoked
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div className="space-y-1">
                            <p><strong>Email:</strong> {certificate.userEmail}</p>
                            <p><strong>Course:</strong> {certificate.courseName}</p>
                            <p><strong>Certificate #:</strong> {certificate.certificateNumber}</p>
                          </div>
                          <div className="space-y-1">
                            <p><strong>Score:</strong> {certificate.score}%</p>
                            <p><strong>Issue Date:</strong> {new Date(certificate.issueDate).toLocaleDateString()}</p>
                            <p><strong>Verification:</strong> {certificate.verificationCode}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {certificate.isValid && (
                          <Button size="sm" variant="outline" className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {certificates.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">
                      No certificates issued yet
                    </h3>
                    <p className="text-gray-500">
                      Certificates will appear here once students pass their exams
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}