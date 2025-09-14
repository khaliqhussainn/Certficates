// app/seb-required/page.tsx - Main wrapper with Suspense
'use client'
import { Suspense } from 'react'
import SEBRequiredContent from './content'

// Loading component for Suspense fallback
function SEBRequiredLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#001e62] mx-auto mb-4"></div>
        <p className="text-lg font-medium text-gray-900">Loading SEB Setup...</p>
      </div>
    </div>
  )
}

export default function SEBRequiredPage() {
  return (
    <Suspense fallback={<SEBRequiredLoading />}>
      <SEBRequiredContent />
    </Suspense>
  )
}