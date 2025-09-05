// Certificate Platform: app/dashboard/certificates/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface Certificate {
  id: string
  courseId: string
  certificateNumber: string
  score: number
  issuedAt: string
  pdfPath?: string
  validUntil?: string
  course: {
    title: string
    category: string
    level: string
  }
}

export default function CertificatesPage() {
  const { data: session } = useSession()
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.id) {
      fetchCertificates()
    }
  }, [session])

  const fetchCertificates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/enrollments')
      const data = await response.json()
      setCertificates(data.certificates || [])
    } catch (error) {
      console.error('Error fetching certificates:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-blue-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadge = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800'
    if (score >= 80) return 'bg-blue-100 text-blue-800'
    if (score >= 70) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your certificates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Certificates</h1>
          <p className="mt-2 text-gray-600">
            View and manage your earned professional certificates
          </p>
        </div>

        {certificates.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🏆</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No certificates earned yet
            </h3>
            <p className="text-gray-600 mb-6">
              Complete courses and pass certificate exams to earn professional credentials
            </p>
            <Link
              href="/dashboard/courses"
              className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700"
            >
              Browse Available Courses
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((certificate) => (
              <div key={certificate.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">{certificate.course.title}</h3>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{certificate.score.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm opacity-90">
                    <span>{certificate.course.category}</span>
                    <span>{certificate.course.level}</span>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Certificate Number</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getScoreBadge(certificate.score)}`}>
                        {certificate.score >= 90 ? 'Excellent' : 
                         certificate.score >= 80 ? 'Very Good' : 
                         certificate.score >= 70 ? 'Good' : 'Pass'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                      {certificate.certificateNumber}
                    </p>
                  </div>
                  
                  <div className="mb-4 text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-600">Issued:</span>
                      <span className="text-gray-900">{formatDate(certificate.issuedAt)}</span>
                    </div>
                    {certificate.validUntil && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Valid Until:</span>
                        <span className="text-gray-900">{formatDate(certificate.validUntil)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {certificate.pdfPath && (
                      <a
                        href={certificate.pdfPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-blue-600 text-white text-center py-2 px-3 rounded text-sm font-medium hover:bg-blue-700"
                      >
                        Download PDF
                      </a>
                    )}
                    <Link
                      href={`/verify/${certificate.certificateNumber}`}
                      className="flex-1 bg-gray-600 text-white text-center py-2 px-3 rounded text-sm font-medium hover:bg-gray-700"
                    >
                      Verify
                    </Link>
                  </div>
                  
                  <div className="mt-3">
                    <Link
                      href={`/dashboard/courses/${certificate.courseId}`}
                      className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                    >
                      View Course Details →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {certificates.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Certificate Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{certificates.length}</div>
                <div className="text-sm text-gray-600">Total Certificates</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {(certificates.reduce((sum, cert) => sum + cert.score, 0) / certificates.length).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Average Score</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {certificates.filter(cert => cert.score >= 90).length}
                </div>
                <div className="text-sm text-gray-600">Excellent Scores</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}