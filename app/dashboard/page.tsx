// app/dashboard/page.tsx - Updated Dashboard
'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'

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
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#001e62] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
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
    { id: 'overview', name: 'Overview', icon: '🏠', href: '/dashboard' },
    { id: 'courses', name: 'Courses', icon: '📚', href: '/dashboard/courses' },
    { id: 'certificates', name: 'Certificates', icon: '🏆', href: '/dashboard/certificates' },
    { id: 'exams', name: 'Exams', icon: '📝', href: '/dashboard/exams' },
    { id: 'payments', name: 'Payments', icon: '💳', href: '/dashboard/payments' },
    { id: 'profile', name: 'Profile', icon: '👤', href: '/dashboard/profile' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#001e62]">
            Welcome back, {session?.user?.name || 'Student'}!
          </h1>
          <p className="mt-2 text-gray-600">
            Track your course progress and manage your certificates
          </p>
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
                    item.id === 'overview'
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-[#001e62]/10 text-[#001e62]">
                📚
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed Courses</p>
                <p className="text-2xl font-bold text-[#001e62]">{stats.completedCourses}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-[#001e62]/10 text-[#001e62]">
                🏆
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Certificates Earned</p>
                <p className="text-2xl font-bold text-[#001e62]">{stats.earnedCertificates}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-[#001e62]/10 text-[#001e62]">
                📝
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Exam Attempts</p>
                <p className="text-2xl font-bold text-[#001e62]">{stats.examAttempts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-[#001e62]/10 text-[#001e62]">
                💰
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Invested</p>
                <p className="text-2xl font-bold text-[#001e62]">${stats.totalSpent}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Certificates */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#001e62]">Recent Certificates</h2>
              <Link href="/dashboard/certificates" className="text-[#001e62] hover:text-[#001e62]/80 text-sm font-medium">
                View All
              </Link>
            </div>

            {dashboardData?.certificates.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-2">🎓</div>
                <p className="text-gray-600">No certificates earned yet</p>
                <p className="text-gray-500 text-sm mt-1">Complete courses and pass exams to earn certificates</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboardData?.certificates.slice(0, 3).map((certificate) => (
                  <div key={certificate.id} className="flex items-center justify-between p-4 bg-[#001e62]/5 rounded-lg border border-[#001e62]/10">
                    <div>
                      <h3 className="font-medium text-[#001e62]">{certificate.course.title}</h3>
                      <p className="text-sm text-gray-600">Score: {certificate.score.toFixed(1)}%</p>
                      <p className="text-sm text-gray-500">Issued: {formatDate(certificate.issuedAt)}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {certificate.pdfPath && (
                        <a
                          href={certificate.pdfPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#001e62] hover:text-[#001e62]/80 text-sm"
                        >
                          Download
                        </a>
                      )}
                      <Link
                        href={`/verify/${certificate.certificateNumber}`}
                        className="text-[#001e62] hover:text-[#001e62]/80 text-sm"
                      >
                        Verify
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Courses */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#001e62]">Completed Courses</h2>
              <Link href="/dashboard/courses" className="text-[#001e62] hover:text-[#001e62]/80 text-sm font-medium">
                View All
              </Link>
            </div>

            {dashboardData?.completions.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-2">📚</div>
                <p className="text-gray-600">No completed courses yet</p>
                <p className="text-gray-500 text-sm mt-1">Complete courses on the main website to see them here</p>
                <Link
                  href="/dashboard/courses"
                  className="mt-3 inline-block bg-[#001e62] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#001e62]/90"
                >
                  Browse Courses
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboardData?.completions.slice(0, 3).map((completion) => (
                  <div key={completion.id} className="flex items-center justify-between p-4 bg-[#001e62]/5 rounded-lg border border-[#001e62]/10">
                    <div className="flex items-center">
                      {completion.course.thumbnail ? (
                        <Image
                          src={completion.course.thumbnail}
                          alt={completion.course.title}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-[#001e62] rounded flex items-center justify-center">
                          <span className="text-white text-sm font-bold">
                            {completion.course.title.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="ml-4">
                        <h3 className="font-medium text-[#001e62]">{completion.course.title}</h3>
                        <p className="text-sm text-gray-600">{completion.course.category}</p>
                        <p className="text-sm text-gray-500">Completed: {formatDate(completion.completedAt)}</p>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/courses/${completion.courseId}`}
                      className="bg-[#001e62] text-white px-3 py-1 rounded text-sm font-medium hover:bg-[#001e62]/90"
                    >
                      Get Certificate
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-[#001e62] mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/dashboard/courses"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-[#001e62]/30 hover:shadow-md transition-all"
            >
              <div className="p-2 bg-[#001e62]/10 rounded text-[#001e62] mr-4">
                📚
              </div>
              <div>
                <h3 className="font-medium text-[#001e62]">Browse Courses</h3>
                <p className="text-sm text-gray-600">Find courses available for certification</p>
              </div>
            </Link>

            <Link
              href="/dashboard/certificates"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-[#001e62]/30 hover:shadow-md transition-all"
            >
              <div className="p-2 bg-[#001e62]/10 rounded text-[#001e62] mr-4">
                🏆
              </div>
              <div>
                <h3 className="font-medium text-[#001e62]">My Certificates</h3>
                <p className="text-sm text-gray-600">View and download your earned certificates</p>
              </div>
            </Link>

            <Link
              href="/dashboard/profile"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-[#001e62]/30 hover:shadow-md transition-all"
            >
              <div className="p-2 bg-[#001e62]/10 rounded text-[#001e62] mr-4">
                👤
              </div>
              <div>
                <h3 className="font-medium text-[#001e62]">Profile Settings</h3>
                <p className="text-sm text-gray-600">Update your account information</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}