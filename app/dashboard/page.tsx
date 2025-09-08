// app/dashboard/page.tsx - Professional Dashboard
'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Home, 
  BookOpen, 
  Award, 
  FileText, 
  CreditCard, 
  User, 
  DollarSign, 
  Download, 
  Shield, 
  ArrowRight,
  TrendingUp,
  Calendar,
  Eye
} from 'lucide-react'

interface DashboardData {
  completions: {
    id: string
    courseId: string
    completedAt: string
    progress: number
    course: {
      id: string
      title: string
      category: string
      level: string
      thumbnail?: string
      certificatePrice: number
    }
  }[]
  certificates: {
    id: string
    courseId: string
    certificateNumber: string
    score: number
    issuedAt: string
    pdfPath?: string
    course: {
      title: string
      category: string
      level: string
    }
  }[]
  examAttempts: {
    id: string
    courseId: string
    score?: number
    passed: boolean
    startedAt: string
    completedAt?: string
    course: {
      title: string
      certificatePrice: number
    }
  }[]
  payments: {
    id: string
    courseId?: string
    amount: number
    status: string
    createdAt: string
  }[]
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (session?.user?.id) {
      fetchDashboardData()
    }
  }, [session])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/enrollments')
      const data = await response.json()
      setDashboardData(data)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#001e62] border-t-transparent mx-auto"></div>
          <p className="mt-3 text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const stats = dashboardData ? {
    completedCourses: dashboardData.completions.length,
    earnedCertificates: dashboardData.certificates.length,
    examAttempts: dashboardData.examAttempts.length,
    totalSpent: dashboardData.payments
      .filter(p => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0)
  } : { completedCourses: 0, earnedCertificates: 0, examAttempts: 0, totalSpent: 0 }

  const navigation = [
    { id: 'overview', name: 'Overview', icon: Home, href: '/dashboard' },
 
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#001e62]">
            Welcome back, {session?.user?.name || 'Student'}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Track your learning progress and manage your achievements
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-6 overflow-x-auto">
              {navigation.map((item) => {
                const IconComponent = item.icon
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`flex items-center py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                      item.id === 'overview'
                        ? 'border-[#001e62] text-[#001e62]'
                        : 'border-transparent text-gray-500 hover:text-[#001e62] hover:border-gray-300'
                    }`}
                  >
                    <IconComponent className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Completed Courses</p>
                <p className="text-2xl font-semibold text-[#001e62] mt-1">{stats.completedCourses}</p>
              </div>
              <div className="p-2 bg-[#001e62]/10 rounded-lg">
                <BookOpen className="w-5 h-5 text-[#001e62]" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Certificates Earned</p>
                <p className="text-2xl font-semibold text-[#001e62] mt-1">{stats.earnedCertificates}</p>
              </div>
              <div className="p-2 bg-[#001e62]/10 rounded-lg">
                <Award className="w-5 h-5 text-[#001e62]" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Exam Attempts</p>
                <p className="text-2xl font-semibold text-[#001e62] mt-1">{stats.examAttempts}</p>
              </div>
              <div className="p-2 bg-[#001e62]/10 rounded-lg">
                <FileText className="w-5 h-5 text-[#001e62]" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Invested</p>
                <p className="text-2xl font-semibold text-[#001e62] mt-1">${stats.totalSpent}</p>
              </div>
              <div className="p-2 bg-[#001e62]/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-[#001e62]" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Certificates */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#001e62] flex items-center">
                <Award className="w-5 h-5 mr-2" />
                Recent Certificates
              </h2>
              <Link 
                href="/dashboard/certificates" 
                className="text-[#001e62] hover:text-[#001e62]/80 text-sm font-medium flex items-center transition-colors"
              >
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            {dashboardData?.certificates.length === 0 ? (
              <div className="text-center py-8">
                <div className="p-3 bg-gray-100 rounded-full w-fit mx-auto mb-3">
                  <Award className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 text-sm font-medium">No certificates earned yet</p>
                <p className="text-gray-500 text-xs mt-1">Complete courses and pass exams to earn certificates</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData?.certificates.slice(0, 3).map((certificate) => (
                  <div key={certificate.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-[#001e62]/20 transition-colors">
                    <div className="flex-1">
                      <h3 className="font-medium text-[#001e62] text-sm">{certificate.course.title}</h3>
                      <div className="flex items-center mt-1 space-x-3">
                        <span className="inline-flex items-center text-xs text-gray-600">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {certificate.score.toFixed(1)}% score
                        </span>
                        <span className="inline-flex items-center text-xs text-gray-500">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(certificate.issuedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {certificate.pdfPath && (
                        <a
                          href={certificate.pdfPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-[#001e62] hover:bg-[#001e62]/10 rounded transition-colors"
                          title="Download Certificate"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                      <Link
                        href={`/verify/${certificate.certificateNumber}`}
                        className="p-1.5 text-[#001e62] hover:bg-[#001e62]/10 rounded transition-colors"
                        title="Verify Certificate"
                      >
                        <Shield className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Courses */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#001e62] flex items-center">
                <BookOpen className="w-5 h-5 mr-2" />
                Completed Courses
              </h2>
              <Link 
                href="/dashboard/courses" 
                className="text-[#001e62] hover:text-[#001e62]/80 text-sm font-medium flex items-center transition-colors"
              >
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            {dashboardData?.completions.length === 0 ? (
              <div className="text-center py-8">
                <div className="p-3 bg-gray-100 rounded-full w-fit mx-auto mb-3">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 text-sm font-medium">No completed courses yet</p>
                <p className="text-gray-500 text-xs mt-1">Complete courses on the main website to see them here</p>
                <Link
                  href="/dashboard/courses"
                  className="mt-3 inline-flex items-center bg-[#001e62] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#001e62]/90 transition-colors"
                >
                  <BookOpen className="w-3 h-3 mr-1" />
                  Browse Courses
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData?.completions.slice(0, 3).map((completion) => (
                  <div key={completion.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-[#001e62]/20 transition-colors">
                    <div className="flex items-center flex-1">
                      {completion.course.thumbnail ? (
                        <Image
                          src={completion.course.thumbnail}
                          alt={completion.course.title}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-[#001e62] rounded flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {completion.course.title.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="ml-3 flex-1">
                        <h3 className="font-medium text-[#001e62] text-sm">{completion.course.title}</h3>
                        <div className="flex items-center mt-1 space-x-3">
                          <span className="text-xs text-gray-600">{completion.course.category}</span>
                          <span className="inline-flex items-center text-xs text-gray-500">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(completion.completedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/courses/${completion.courseId}`}
                      className="inline-flex items-center bg-[#001e62] text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-[#001e62]/90 transition-colors"
                    >
                      <Award className="w-3 h-3 mr-1" />
                      Certificate
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-[#001e62] mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link
              href="/dashboard/courses"
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-[#001e62]/30 hover:bg-gray-50 transition-all group"
            >
              <div className="p-2 bg-[#001e62]/10 rounded-lg text-[#001e62] mr-3 group-hover:bg-[#001e62]/20 transition-colors">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-medium text-[#001e62] text-sm">Browse Courses</h3>
                <p className="text-xs text-gray-600">Find courses for certification</p>
              </div>
            </Link>

            <Link
              href="/dashboard/certificates"
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-[#001e62]/30 hover:bg-gray-50 transition-all group"
            >
              <div className="p-2 bg-[#001e62]/10 rounded-lg text-[#001e62] mr-3 group-hover:bg-[#001e62]/20 transition-colors">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-medium text-[#001e62] text-sm">My Certificates</h3>
                <p className="text-xs text-gray-600">View and download certificates</p>
              </div>
            </Link>

            <Link
              href="/dashboard/profile"
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-[#001e62]/30 hover:bg-gray-50 transition-all group"
            >
              <div className="p-2 bg-[#001e62]/10 rounded-lg text-[#001e62] mr-3 group-hover:bg-[#001e62]/20 transition-colors">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-medium text-[#001e62] text-sm">Profile Settings</h3>
                <p className="text-xs text-gray-600">Update account information</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}