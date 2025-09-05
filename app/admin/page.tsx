// app/admin/page.tsx - Complete Admin Panel Dashboard
'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface AdminStats {
  totalUsers: number
  totalCourses: number
  totalCertificates: number
  totalRevenue: number
  recentPayments: {
    id: string
    user: { name: string; email: string }
    course: { title: string }
    amount: number
    status: string
    createdAt: string
  }[]
  recentExams: {
    id: string
    user: { name: string; email: string }
    course: { title: string }
    score: number
    passed: boolean
    completedAt: string
  }[]
}

interface Course {
  id: string
  title: string
  category: string
  level: string
  certificatePrice: number
  isPublished: boolean
  passingScore: number
  examDuration: number
  _count: {
    enrollments: number
    certificates: number
  }
}

interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  _count: {
    certificates: number
    payments: number
  }
}

interface Payment {
  id: string
  amount: number
  status: string
  createdAt: string
  user: { name: string; email: string }
  course: { title: string }
}

interface ExamMonitoring {
  id: string
  user: { name: string; email: string }
  course: { title: string }
  status: string
  violations: number
  startedAt: string
  completedAt?: string
}

export default function AdminDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [exams, setExams] = useState<ExamMonitoring[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Check if user is admin
    if (session.user?.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }

    fetchAdminData()
  }, [session, router])

  const fetchAdminData = async () => {
    try {
      setLoading(true)
      
      // Fetch admin stats
      const statsResponse = await fetch('/api/admin/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      // Fetch courses for management
      const coursesResponse = await fetch('/api/admin/courses')
      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json()
        setCourses(coursesData)
      }

      // Fetch users if on users tab
      if (activeTab === 'users') {
        const usersResponse = await fetch('/api/admin/users')
        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          setUsers(usersData)
        }
      }

      // Fetch payments if on payments tab
      if (activeTab === 'payments') {
        const paymentsResponse = await fetch('/api/admin/payments')
        if (paymentsResponse.ok) {
          const paymentsData = await paymentsResponse.json()
          setPayments(paymentsData)
        }
      }

      // Fetch exam monitoring if on exams tab
      if (activeTab === 'exams') {
        const examsResponse = await fetch('/api/admin/exam-monitoring')
        if (examsResponse.ok) {
          const examsData = await examsResponse.json()
          setExams(examsData)
        }
      }
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchAdminData()
    }
  }, [activeTab])

  const handleUpdateCourse = async (courseId: string, updates: Partial<Course>) => {
    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        // Update local state
        setCourses(prev => prev.map(course => 
          course.id === courseId ? { ...course, ...updates } : course
        ))
      }
    } catch (error) {
      console.error('Error updating course:', error)
    }
  }

  const handleUpdateUser = async (userId: string, updates: { role: string }) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        // Update local state
        setUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, ...updates } : user
        ))
      }
    } catch (error) {
      console.error('Error updating user:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#001e62] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#001e62]">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage courses, users, and monitor platform activity</p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: '📊' },
                { id: 'courses', name: 'Course Management', icon: '📚' },
                { id: 'users', name: 'User Management', icon: '👥' },
                { id: 'payments', name: 'Payments', icon: '💳' },
                { id: 'exams', name: 'Exam Monitoring', icon: '📝' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-[#001e62] text-[#001e62]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-[#001e62]/10 text-[#001e62]">
                    👥
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-[#001e62]">{stats?.totalUsers || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-[#001e62]/10 text-[#001e62]">
                    📚
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Courses</p>
                    <p className="text-2xl font-bold text-[#001e62]">{stats?.totalCourses || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-[#001e62]/10 text-[#001e62]">
                    🏆
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Certificates Issued</p>
                    <p className="text-2xl font-bold text-[#001e62]">{stats?.totalCertificates || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-[#001e62]/10 text-[#001e62]">
                    💰
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-[#001e62]">{formatCurrency(stats?.totalRevenue || 0)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Payments */}
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-[#001e62] mb-4">Recent Payments</h2>
                <div className="space-y-4">
                  {stats?.recentPayments?.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium text-[#001e62]">{payment.user.name}</p>
                        <p className="text-sm text-gray-600">{payment.course.title}</p>
                        <p className="text-xs text-gray-500">{formatDate(payment.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#001e62]">{formatCurrency(payment.amount)}</p>
                        <span className={`text-xs px-2 py-1 rounded ${
                          payment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Exams */}
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-[#001e62] mb-4">Recent Exam Results</h2>
                <div className="space-y-4">
                  {stats?.recentExams?.slice(0, 5).map((exam) => (
                    <div key={exam.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium text-[#001e62]">{exam.user.name}</p>
                        <p className="text-sm text-gray-600">{exam.course.title}</p>
                        <p className="text-xs text-gray-500">{formatDate(exam.completedAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#001e62]">{exam.score}%</p>
                        <span className={`text-xs px-2 py-1 rounded ${
                          exam.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {exam.passed ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Course Management Tab */}
        {activeTab === 'courses' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-[#001e62]">Course Management</h2>
                <p className="text-gray-600">Manage certificate pricing and exam settings</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Certificate Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Passing Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration (min)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stats
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {courses.map((course) => (
                      <CourseRow
                        key={course.id}
                        course={course}
                        onUpdate={handleUpdateCourse}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-[#001e62]">User Management</h2>
              <p className="text-gray-600">Manage user roles and monitor activity</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      onUpdate={handleUpdateUser}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-[#001e62]">Payment Management</h2>
              <p className="text-gray-600">Monitor and manage all platform payments</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Course
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {payment.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-[#001e62]">{payment.user.name}</div>
                          <div className="text-sm text-gray-500">{payment.user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.course.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#001e62]">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          payment.status === 'COMPLETED' 
                            ? 'bg-green-100 text-green-800' 
                            : payment.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(payment.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Exam Monitoring Tab */}
        {activeTab === 'exams' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-[#001e62]">Exam Monitoring</h2>
              <p className="text-gray-600">Real-time monitoring of ongoing and completed exams</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Course
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Violations
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Started
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {exams.map((exam) => (
                    <tr key={exam.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-[#001e62]">{exam.user.name}</div>
                          <div className="text-sm text-gray-500">{exam.user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {exam.course.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          exam.status === 'ACTIVE' 
                            ? 'bg-blue-100 text-blue-800' 
                            : exam.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {exam.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          exam.violations > 2 ? 'text-red-600' : exam.violations > 0 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {exam.violations}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(exam.startedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {exam.status === 'ACTIVE' && (
                          <button className="text-red-600 hover:text-red-900">
                            Terminate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Course Row Component for inline editing
function CourseRow({ course, onUpdate }: { course: Course; onUpdate: (id: string, updates: Partial<Course>) => void }) {
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState({
    certificatePrice: course.certificatePrice,
    passingScore: course.passingScore,
    examDuration: course.examDuration,
    isPublished: course.isPublished,
  })

  const handleSave = () => {
    onUpdate(course.id, values)
    setEditing(false)
  }

  const handleCancel = () => {
    setValues({
      certificatePrice: course.certificatePrice,
      passingScore: course.passingScore,
      examDuration: course.examDuration,
      isPublished: course.isPublished,
    })
    setEditing(false)
  }

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-[#001e62]">{course.title}</div>
          <div className="text-sm text-gray-500">{course.category} • {course.level}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {editing ? (
          <input
            type="number"
            value={values.certificatePrice}
            onChange={(e) => setValues({ ...values, certificatePrice: Number(e.target.value) })}
            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#001e62] focus:border-[#001e62]"
            min="0"
          />
        ) : (
          <span className="text-sm font-medium">${values.certificatePrice}</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {editing ? (
          <input
            type="number"
            value={values.passingScore}
            onChange={(e) => setValues({ ...values, passingScore: Number(e.target.value) })}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#001e62] focus:border-[#001e62]"
            min="0"
            max="100"
          />
        ) : (
          <span className="text-sm">{values.passingScore}%</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {editing ? (
          <input
            type="number"
            value={values.examDuration}
            onChange={(e) => setValues({ ...values, examDuration: Number(e.target.value) })}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#001e62] focus:border-[#001e62]"
            min="30"
            max="300"
          />
        ) : (
          <span className="text-sm">{values.examDuration} min</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm">
          <div className="text-[#001e62] font-medium">Enrollments: {course._count.enrollments}</div>
          <div className="text-gray-600">Certificates: {course._count.certificates}</div>
          <div className="text-gray-500 text-xs mt-1">
            Success Rate: {course._count.enrollments > 0 ? Math.round((course._count.certificates / course._count.enrollments) * 100) : 0}%
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        {editing ? (
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="text-green-600 hover:text-green-900 px-3 py-1 bg-green-50 rounded transition-colors font-medium"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="text-gray-600 hover:text-gray-900 px-3 py-1 bg-gray-50 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => setEditing(true)}
              className="text-[#001e62] hover:text-[#001e62]/80 px-3 py-1 bg-[#001e62]/5 rounded transition-colors text-xs"
            >
              Edit Pricing
            </button>
            <button
              onClick={() => onUpdate(course.id, { isPublished: !course.isPublished })}
              className={`px-3 py-1 rounded transition-colors text-xs font-medium ${
                course.isPublished 
                  ? 'text-red-600 hover:text-red-900 bg-red-50' 
                  : 'text-green-600 hover:text-green-900 bg-green-50'
              }`}
            >
              {course.isPublished ? 'Unpublish' : 'Publish'}
            </button>
            <span className={`px-2 py-1 rounded text-xs text-center ${
              course.isPublished 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {course.isPublished ? 'Active' : 'Inactive'}
            </span>
          </div>
        )}
      </td>
    </tr>
  )
}

// User Row Component for user management
function UserRow({ user, onUpdate }: { user: User; onUpdate: (id: string, updates: { role: string }) => void }) {
  const [editing, setEditing] = useState(false)
  const [role, setRole] = useState(user.role)

  const handleSave = () => {
    onUpdate(user.id, { role })
    setEditing(false)
  }

  const handleCancel = () => {
    setRole(user.role)
    setEditing(false)
  }

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-[#001e62]">{user.name}</div>
          <div className="text-sm text-gray-500">{user.email}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {editing ? (
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-[#001e62] focus:border-[#001e62]"
          >
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
            <option value="INSTRUCTOR">Instructor</option>
          </select>
        ) : (
          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
            user.role === 'ADMIN' 
              ? 'bg-red-100 text-red-800' 
              : user.role === 'INSTRUCTOR'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {user.role}
          </span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(user.createdAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm">
          <div className="text-[#001e62] font-medium">Certificates: {user._count.certificates}</div>
          <div className="text-gray-600">Payments: {user._count.payments}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        {editing ? (
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="text-green-600 hover:text-green-900 px-3 py-1 bg-green-50 rounded transition-colors"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="text-gray-600 hover:text-gray-900 px-3 py-1 bg-gray-50 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-[#001e62] hover:text-[#001e62]/80 px-3 py-1 bg-[#001e62]/5 rounded transition-colors text-xs"
          >
            Edit Role
          </button>
        )}
      </td>
    </tr>
  )
}