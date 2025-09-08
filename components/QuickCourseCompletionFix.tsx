
// components/QuickCourseCompletionFix.tsx - Component to add to your exam page
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, RefreshCw } from 'lucide-react'

interface QuickFixProps {
  courseId: string
  courseName: string
}

export default function QuickCourseCompletionFix({ courseId, courseName }: QuickFixProps) {
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)
  const router = useRouter()

  const markCourseComplete = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/admin/auto-complete-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId })
      })

      if (!response.ok) {
        throw new Error('Failed to mark course complete')
      }

      setCompleted(true)
      
      // Redirect to exam after a short delay
      setTimeout(() => {
        router.push(`/exam/${courseId}`)
      }, 2000)
      
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to mark course complete')
    } finally {
      setLoading(false)
    }
  }

  if (completed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-green-800 mb-2">Course Marked Complete!</h3>
        <p className="text-green-700 mb-4">Redirecting to exam...</p>
      </div>
    )
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-yellow-800 mb-4">Development Quick Fix</h3>
      <p className="text-yellow-700 mb-4">
        Course completion is required to take the exam. Click below to mark "{courseName}" as completed for testing purposes.
      </p>
      <button
        onClick={markCourseComplete}
        disabled={loading}
        className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors flex items-center"
      >
        {loading ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Marking Complete...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark Course Complete
          </>
        )}
      </button>
      <p className="text-xs text-yellow-600 mt-2">
        Note: In production, this should be handled by your main course website via API integration.
      </p>
    </div>
  )
}