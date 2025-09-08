// app/admin/manage/page.tsx - Admin interface for managing courses, questions, and students
"use client"
import React, { useState, useEffect } from 'react'
import { 
  Book, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  Upload, 
  Download,
  RefreshCw,
  Check,
  X,
  Settings,
  Users,
  Award,
  Clock,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react'

interface Course {
  id: string
  title: string
  description: string
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  certificateEnabled: boolean
  passingScore: number
  examDuration: number
  totalQuestions: number
}

interface Question {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  order: number
  isActive: boolean
}

interface Student {
  id: string
  name: string
  email: string
  hasCompleted: boolean
  completedAt?: string
}

interface QuestionFormData {
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
}

export default function AdminQuestionManager() {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [activeTab, setActiveTab] = useState<'questions' | 'settings' | 'students'>('questions')
  const [loading, setLoading] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // AI Generation Form
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiConfig, setAiConfig] = useState({
    numberOfQuestions: 20,
    difficulty: 'MIXED' as 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED'
  })

  // Question Form
  const [questionForm, setQuestionForm] = useState<QuestionFormData>({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    difficulty: 'MEDIUM'
  })

  // Load courses on mount
  useEffect(() => {
    loadCourses()
  }, [])

  // Load questions when course is selected
  useEffect(() => {
    if (selectedCourse) {
      loadQuestions()
      loadStudents()
    }
  }, [selectedCourse])

  const loadCourses = async () => {
    try {
      const response = await fetch('/api/admin/courses')
      const data = await response.json()
      setCourses(data.courses || [])
    } catch (error) {
      console.error('Error loading courses:', error)
    }
  }

  const loadQuestions = async () => {
    if (!selectedCourse) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/questions/by-course/${selectedCourse.id}`)
      const data = await response.json()
      setQuestions(data.questions || [])
    } catch (error) {
      console.error('Error loading questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStudents = async () => {
    if (!selectedCourse) return
    
    try {
      const response = await fetch(`/api/admin/course-completions/${selectedCourse.id}`)
      const data = await response.json()
      setStudents(data.students || [])
    } catch (error) {
      console.error('Error loading students:', error)
    }
  }

  const generateQuestionsWithAI = async () => {
    if (!selectedCourse) return
    
    try {
      setAiGenerating(true)
      const response = await fetch('/api/admin/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          courseTitle: selectedCourse.title,
          courseDescription: selectedCourse.description,
          courseLevel: selectedCourse.level,
          numberOfQuestions: aiConfig.numberOfQuestions,
          difficulty: aiConfig.difficulty
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate questions')
      }

      await loadQuestions()
      alert('Questions generated successfully!')
    } catch (error) {
      console.error('Error generating questions:', error)
      alert('Failed to generate questions. Please try again.')
    } finally {
      setAiGenerating(false)
    }
  }

  const saveQuestion = async () => {
    if (!selectedCourse) return

    try {
      const url = editingQuestion 
        ? `/api/admin/questions/${editingQuestion.id}`
        : '/api/admin/questions'
      
      const method = editingQuestion ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...questionForm,
          courseId: selectedCourse.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save question')
      }

      await loadQuestions()
      setEditingQuestion(null)
      setShowAddForm(false)
      resetQuestionForm()
    } catch (error) {
      console.error('Error saving question:', error)
      alert('Failed to save question')
    }
  }

  const deleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    try {
      const response = await fetch(`/api/admin/questions/${questionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete question')
      }

      await loadQuestions()
    } catch (error) {
      console.error('Error deleting question:', error)
      alert('Failed to delete question')
    }
  }

  const markCourseComplete = async (studentId: string) => {
    if (!selectedCourse) return

    try {
      const response = await fetch('/api/admin/mark-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: studentId,
          courseId: selectedCourse.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to mark completion')
      }

      await loadStudents()
    } catch (error) {
      console.error('Error marking completion:', error)
      alert('Failed to mark completion')
    }
  }

  const updateCourseSettings = async (settings: Partial<Course>) => {
    if (!selectedCourse) return

    try {
      const response = await fetch(`/api/admin/courses/${selectedCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (!response.ok) {
        throw new Error('Failed to update course settings')
      }

      setSelectedCourse({ ...selectedCourse, ...settings })
      await loadCourses()
    } catch (error) {
      console.error('Error updating course settings:', error)
      alert('Failed to update course settings')
    }
  }

  const resetQuestionForm = () => {
    setQuestionForm({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      difficulty: 'MEDIUM'
    })
  }

  const startEditing = (question: Question) => {
    setEditingQuestion(question)
    setQuestionForm({
      question: question.question,
      options: [...question.options],
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || '',
      difficulty: question.difficulty
    })
    setShowAddForm(true)
  }

  const updateQuestionOption = (index: number, value: string) => {
    const newOptions = [...questionForm.options]
    newOptions[index] = value
    setQuestionForm({ ...questionForm, options: newOptions })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Exam Management System</h1>
          
          {/* Course Selector */}
          <div className="flex items-center space-x-4">
            <label className="block text-sm font-medium text-gray-700">Select Course:</label>
            <select
              value={selectedCourse?.id || ''}
              onChange={(e) => setSelectedCourse(courses.find(c => c.id === e.target.value) || null)}
              className="block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a course...</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            
            <button
              onClick={loadCourses}
              className="p-2 text-gray-500 hover:text-gray-700"
              title="Refresh courses"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {selectedCourse && (
          <>
            {/* Course Info */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedCourse.title}</h2>
                  <p className="text-gray-600 mt-1">{selectedCourse.description}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>Level: {selectedCourse.level}</span>
                    <span>Questions: {questions.length}/{selectedCourse.totalQuestions}</span>
                    <span>Duration: {selectedCourse.examDuration} min</span>
                    <span>Passing: {selectedCourse.passingScore}%</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    selectedCourse.certificateEnabled 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedCourse.certificateEnabled ? 'Certificates Enabled' : 'Certificates Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: 'questions', label: 'Questions', icon: Book },
                    { id: 'settings', label: 'Settings', icon: Settings },
                    { id: 'students', label: 'Students', icon: Users }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <tab.icon className="w-4 h-4 mr-2" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Questions Tab */}
              {activeTab === 'questions' && (
                <div className="p-6">
                  {/* AI Generation Section */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">AI Question Generation</h3>
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Number of Questions
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="50"
                          value={aiConfig.numberOfQuestions}
                          onChange={(e) => setAiConfig({...aiConfig, numberOfQuestions: parseInt(e.target.value)})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Difficulty Level
                        </label>
                        <select
                          value={aiConfig.difficulty}
                          onChange={(e) => setAiConfig({...aiConfig, difficulty: e.target.value as any})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="EASY">Easy</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HARD">Hard</option>
                          <option value="MIXED">Mixed</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={generateQuestionsWithAI}
                          disabled={aiGenerating}
                          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {aiGenerating ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Generate Questions
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-blue-700">
                      This will replace all existing questions for this course with AI-generated ones.
                    </p>
                  </div>

                  {/* Manual Question Management */}
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Manage Questions</h3>
                    <button
                      onClick={() => {
                        setShowAddForm(true)
                        setEditingQuestion(null)
                        resetQuestionForm()
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Question
                    </button>
                  </div>

                  {/* Add/Edit Question Form */}
                  {showAddForm && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
                      <h4 className="text-lg font-semibold mb-4">
                        {editingQuestion ? 'Edit Question' : 'Add New Question'}
                      </h4>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                          <textarea
                            value={questionForm.question}
                            onChange={(e) => setQuestionForm({...questionForm, question: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                            placeholder="Enter your question here..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                          {questionForm.options.map((option, index) => (
                            <div key={index} className="flex items-center space-x-2 mb-2">
                              <input
                                type="radio"
                                name="correctAnswer"
                                checked={questionForm.correctAnswer === index}
                                onChange={() => setQuestionForm({...questionForm, correctAnswer: index})}
                                className="text-blue-600"
                              />
                              <span className="font-medium text-sm w-6">{String.fromCharCode(65 + index)}.</span>
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => updateQuestionOption(index, e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder={`Option ${String.fromCharCode(65 + index)}`}
                              />
                            </div>
                          ))}
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                            <select
                              value={questionForm.difficulty}
                              onChange={(e) => setQuestionForm({...questionForm, difficulty: e.target.value as any})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="EASY">Easy</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="HARD">Hard</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Explanation (Optional)</label>
                          <textarea
                            value={questionForm.explanation}
                            onChange={(e) => setQuestionForm({...questionForm, explanation: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            rows={2}
                            placeholder="Explain why this is the correct answer..."
                          />
                        </div>

                        <div className="flex space-x-4">
                          <button
                            onClick={saveQuestion}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {editingQuestion ? 'Update Question' : 'Save Question'}
                          </button>
                          <button
                            onClick={() => {
                              setShowAddForm(false)
                              setEditingQuestion(null)
                              resetQuestionForm()
                            }}
                            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 flex items-center"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Questions List */}
                  {loading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                      <p className="text-gray-500 mt-2">Loading questions...</p>
                    </div>
                  ) : questions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Book className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No questions found. Generate some with AI or add manually.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {questions.map((question, index) => (
                        <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-medium">
                                  Q{index + 1}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  question.difficulty === 'EASY' ? 'bg-green-100 text-green-800' :
                                  question.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {question.difficulty}
                                </span>
                              </div>
                              <p className="text-gray-900 font-medium mb-2">{question.question}</p>
                              <div className="grid grid-cols-2 gap-2">
                                {question.options.map((option, optIndex) => (
                                  <div
                                    key={optIndex}
                                    className={`p-2 rounded text-sm ${
                                      optIndex === question.correctAnswer
                                        ? 'bg-green-100 border border-green-300 text-green-800'
                                        : 'bg-gray-50 border border-gray-200'
                                    }`}
                                  >
                                    {String.fromCharCode(65 + optIndex)}. {option}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="flex space-x-2 ml-4">
                              <button
                                onClick={() => startEditing(question)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteQuestion(question.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Settings</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Exam Duration (minutes)
                      </label>
                      <input
                        type="number"
                        min="30"
                        max="300"
                        value={selectedCourse.examDuration}
                        onChange={(e) => updateCourseSettings({ examDuration: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Passing Score (%)
                      </label>
                      <input
                        type="number"
                        min="50"
                        max="100"
                        value={selectedCourse.passingScore}
                        onChange={(e) => updateCourseSettings({ passingScore: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Questions
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="100"
                        value={selectedCourse.totalQuestions}
                        onChange={(e) => updateCourseSettings({ totalQuestions: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedCourse.certificateEnabled}
                        onChange={(e) => updateCourseSettings({ certificateEnabled: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 text-sm font-medium text-gray-700">
                        Enable Certificates
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Students Tab */}
              {activeTab === 'students' && (
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Completions</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Student
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Completion Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Completed At
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {students.map(student => (
                          <tr key={student.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{student.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{student.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                student.hasCompleted
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {student.hasCompleted ? (
                                  <>
                                    <Check className="w-3 h-3 mr-1" />
                                    Completed
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3 mr-1" />
                                    Pending
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {student.completedAt ? new Date(student.completedAt).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {!student.hasCompleted && (
                                <button
                                  onClick={() => markCourseComplete(student.id)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Mark Complete
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
          </>
        )}
      </div>
    </div>
  )
}