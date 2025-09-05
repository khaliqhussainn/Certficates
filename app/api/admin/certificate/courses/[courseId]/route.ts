import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"

// app/api/admin/certificate/courses/[courseId]/route.ts
export async function PATCH(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const updates = await req.json()
    const { courseId } = params

    // Validate update data
    const allowedUpdates = [
      'certificatePrice',
      'certificateDiscount',
      'certificateEnabled',
      'passingScore',
      'examDuration',
      'totalQuestions'
    ]

    const updateData: any = {}
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updateData[key] = updates[key]
      }
    })

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: updateData
    })

    return NextResponse.json({ success: true, course: updatedCourse })

  } catch (error) {
    console.error('Error updating course:', error)
    return NextResponse.json(
      { error: 'Failed to update course' },
      { status: 500 }
    )
  }
}
