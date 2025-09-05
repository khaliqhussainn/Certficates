// app/dashboard/page.tsx - User Dashboard
'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

interface Certificate {
  id: string
  certificateNumber: string
  score: number
  issuedAt: string
  pdfPath?: string
  course: {
    title: string
    category: string
    level: string
    thumbnail?: string
  }
}

interface CourseCompletion {
  id: string
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
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [completedCourses, setCompletedCourses] = useState<CourseCompletion[]>([])
  const [stats, setStats] = useState({ totalCertificates: 0, totalCoursesCompleted: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchDashboardData()
  }, [session])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard')
      if (response.ok) {
        const data = await response.json()
        setCertificates(data.certificates)
        setCompletedCourses(data.completedCourses)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadCertificate = (certificate: Certificate) => {
    if (certificate.pdfPath) {
      const link = document.createElement('a')
      link.href = certificate.pdfPath
      link.download = `certificate-${certificate.certificateNumber}.pdf`
      link.click()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {session?.user?.name}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Certificates Earned</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCertificates}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Courses Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCoursesCompleted}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalCoursesCompleted > 0 
                    ? Math.round((stats.totalCertificates / stats.totalCoursesCompleted) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <Link href="/courses" className="flex items-center h-full">
              <div className="p-3 rounded-full bg-orange-100">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Take New Exam</p>
                <p className="text-lg font-semibold text-orange-600">Browse Certificates</p>
              </div>
            </Link>
          </div>
        </div>

        {/* My Certificates */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">My Certificates</h2>
          {certificates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map((certificate) => (
                <div key={certificate.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  {certificate.course.thumbnail && (
                    <Image
                      src={certificate.course.thumbnail}
                      alt={certificate.course.title}
                      width={400}
                      height={200}
                      className="w-full h-32 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-blue-600 font-medium">{certificate.course.category}</span>
                      <span className="text-sm font-bold text-green-600">{certificate.score.toFixed(1)}%</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{certificate.course.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Issued: {new Date(certificate.issuedAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500 mb-3">
                      Certificate ID: {certificate.certificateNumber}
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => downloadCertificate(certificate)}
                        className="flex-1 py-2 px-3 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Download
                      </button>
                      <Link
                        href={`/verify/${certificate.certificateNumber}`}
                        className="flex-1 py-2 px-3 bg-gray-200 text-gray-700 text-sm rounded text-center hover:bg-gray-300"
                      >
                        Verify
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Certificates Yet</h3>
              <p className="text-gray-600 mb-4">Start taking exams to earn your first certificate!</p>
              <Link
                href="/courses"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Browse Available Exams
              </Link>
            </div>
          )}
        </div>

        {/* Completed Courses (Available for Certification) */}
        {completedCourses.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Ready for Certification</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedCourses.map((completion) => (
                <div key={completion.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  {completion.course.thumbnail && (
                    <Image
                      src={completion.course.thumbnail}
                      alt={completion.course.title}
                      width={400}
                      height={200}
                      className="w-full h-32 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-green-600 font-medium">{completion.course.category}</span>
                      <span className="text-sm text-green-600">Completed</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{completion.course.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Completed: {new Date(completion.completedAt).toLocaleDateString()}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-blue-600">${completion.course.certificatePrice}</span>
                      <Link
                        href={`/certificate/${completion.course.id}`}
                        className="py-2 px-4 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Take Exam
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
