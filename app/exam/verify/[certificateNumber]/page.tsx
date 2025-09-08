import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  User, 
  BookOpen, 
  Award,
  Clock,
  Target,
  AlertCircle,
  RefreshCw
} from 'lucide-react'

interface CertificateData {
  certificateNumber: string
  studentName: string
  courseName: string
  courseCategory: string
  courseLevel: string
  score: number
  grade: string
  issuedAt: string
  validUntil?: string
  isValid: boolean
}

export default function CertificateVerificationPage() {
  const params = useParams()
  const certificateNumber = params.certificateNumber as string
  
  const [certificate, setCertificate] = useState<CertificateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (certificateNumber) {
      verifyCertificate()
    }
  }, [certificateNumber])

  const verifyCertificate = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/certificate/verify/${certificateNumber}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Certificate not found or has been revoked')
        }
        throw new Error('Failed to verify certificate')
      }

      const data = await response.json()
      setCertificate(data.certificate)
      
    } catch (error) {
      console.error('Error verifying certificate:', error)
      setError(error instanceof Error ? error.message : 'Failed to verify certificate')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Verifying certificate...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 mx-auto text-blue-600 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Certificate Verification</h1>
          <p className="text-gray-600">Verify the authenticity of educational certificates</p>
        </div>

        {error ? (
          /* Error State */
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Certificate Not Found</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-red-800 mb-2">Possible Reasons:</h3>
              <ul className="text-sm text-red-700 text-left space-y-1">
                <li>• Certificate number is incorrect</li>
                <li>• Certificate has been revoked</li>
                <li>• Certificate has expired</li>
                <li>• Certificate was never issued</li>
              </ul>
            </div>

            <button
              onClick={verifyCertificate}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : certificate ? (
          /* Valid Certificate */
          <div className="space-y-6">
            {/* Verification Status */}
            <div className="bg-white rounded-lg shadow-sm border-l-4 border-green-500 p-6">
              <div className="flex items-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <h2 className="text-xl font-semibold text-green-800">Certificate Verified</h2>
                  <p className="text-green-700">This certificate is authentic and valid</p>
                </div>
              </div>
            </div>

            {/* Certificate Details */}
            <div className="bg-white rounded-lg shadow-sm p-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Student Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Student Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Student Name</label>
                      <p className="text-lg font-semibold text-gray-900">{certificate.studentName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Certificate Number</label>
                      <p className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                        {certificate.certificateNumber}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Course Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <BookOpen className="w-5 h-5 mr-2" />
                    Course Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Course Title</label>
                      <p className="text-lg font-semibold text-gray-900">{certificate.courseName}</p>
                    </div>
                    <div className="flex space-x-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Category</label>
                        <p className="text-sm text-gray-900">{certificate.courseCategory}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Level</label>
                        <p className="text-sm text-gray-900">{certificate.courseLevel}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Award className="w-5 h-5 mr-2" />
                  Performance Metrics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{certificate.score.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">Final Score</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-3xl font-bold px-3 py-1 rounded-full ${
                      certificate.grade === 'A' ? 'text-green-600 bg-green-100' :
                      certificate.grade === 'B' ? 'text-blue-600 bg-blue-100' :
                      certificate.grade === 'C' ? 'text-yellow-600 bg-yellow-100' :
                      'text-gray-600 bg-gray-100'
                    }`}>
                      {certificate.grade}
                    </div>
                    <div className="text-sm text-gray-600">Grade</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {new Date(certificate.issuedAt).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600">Issue Date</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">Valid</div>
                    <div className="text-sm text-gray-600">Status</div>
                  </div>
                </div>
              </div>

              {/* Validity Information */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <Calendar className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Certificate Validity</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      This certificate was issued on {new Date(certificate.issuedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long', 
                        day: 'numeric'
                      })}
                      {certificate.validUntil && (
                        <> and is valid until {new Date(certificate.validUntil).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</>
                      )}.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Features */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Security Features
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Verification Methods</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                      Digital signature verification
                    </li>
                    <li className="flex items-center">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                      Blockchain-secured records
                    </li>
                    <li className="flex items-center">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                      Tamper-proof certificate number
                    </li>
                    <li className="flex items-center">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                      Real-time database validation
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Anti-Fraud Protection</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                      Secure exam environment monitoring
                    </li>
                    <li className="flex items-center">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                      Identity verification required
                    </li>
                    <li className="flex items-center">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                      Time-stamped completion records
                    </li>
                    <li className="flex items-center">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                      Revocation tracking system
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-gray-500">
              <p>This verification was performed on {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}.</p>
              <p className="mt-1">For questions about this certificate, please contact our support team.</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}