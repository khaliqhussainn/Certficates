// app/courses/[courseId]/page.tsx - Complete Course Detail Page with Payment
"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  BookOpen,
  Clock,
  Star,
  Users,
  Award,
  CheckCircle,
  ArrowLeft,
  GraduationCap,
  Shield,
  TrendingUp,
  Building2,
  Play,
  FileText,
  Target,
  Calendar,
  DollarSign,
  AlertCircle,
  CreditCard,
} from "lucide-react";

// Dynamically import PaymentComponent to avoid SSR issues
const PaymentComponent = dynamic(() => import("@/components/PaymentComponent"), {
  ssr: false,
  loading: () => <div className="flex justify-center items-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#001e62] border-t-transparent"></div>
  </div>
});

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  thumbnail?: string;
  certificatePrice: number;
  rating?: number;
  passingScore: number;
  examDuration: number;
  totalQuestions?: number;
  prerequisites?: string[];
  learningOutcomes?: string[];
  instructor?: string;
  estimatedStudyTime?: string;
  courseDuration?: string;
  skillsGained?: string[];
  price?: number;
  enrollmentCount?: number;
  courseUrl?: string;
  syllabus?: {
    module: string;
    topics: string[];
    duration: string;
  }[];
}

interface UserStatus {
  hasBooked: boolean;
  hasCompleted: boolean;
  hasCertificate: boolean;
  hasPaid: boolean;
  payment?: {
    status: string;
    amount: number;
    provider: string;
    id: string;
  };
}

export default function CourseDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    if (courseId) {
      console.log("Course ID from params:", courseId);
      fetchCourseDetail();
    }
  }, [courseId]);

  useEffect(() => {
    if (session?.user?.id && course) {
      fetchUserStatus();
    }
  }, [session, course]);

  const fetchCourseDetail = async () => {
    try {
      setLoading(true);
      console.log(`Fetching course details for ID: ${courseId}`);
      const response = await fetch(`/api/courses/public/${courseId}`);
      console.log("Course API response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Course data received:", data);
        setCourse(data.course);
      } else {
        console.error(
          "Failed to fetch course:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error fetching course:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStatus = async () => {
    try {
      const response = await fetch("/api/user/course-statuses");
      if (response.ok) {
        const data = await response.json();
        const status = data.statuses[courseId] || {
          hasBooked: false,
          hasCompleted: false,
          hasCertificate: false,
          hasPaid: false,
        };
        
        // Check payment status separately
        const paymentResponse = await fetch(`/api/payments/check/${courseId}`);
        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json();
          status.hasPaid = paymentData.hasPayment && paymentData.payment.status === 'COMPLETED';
          if (paymentData.hasPayment) {
            status.payment = paymentData.payment;
          }
        }
        
        setUserStatus(status);
      }
    } catch (error) {
      console.error("Error fetching user status:", error);
    }
  };

  const handleStartExam = () => {
    console.log("Starting exam for course ID:", courseId);

    if (!courseId) {
      console.error("Course ID is missing!");
      alert("Course ID is missing. Please try again.");
      return;
    }

    if (!session) {
      console.log("No session found, redirecting to signin");
      router.push("/auth/signin");
      return;
    }

    // Check if user has paid for the certificate exam
    if (!userStatus?.hasPaid) {
      alert("Please complete the payment for the certificate exam first.");
      setShowPayment(true);
      return;
    }

    // Direct navigation to exam page
    try {
      const targetUrl = `/exam/${courseId}`;
      console.log("Attempting to navigate to:", targetUrl);
      router.push(targetUrl);
    } catch (error) {
      console.error("Navigation error:", error);
      alert("Navigation failed. Please check the console for details.");
    }
  };

  const handlePaymentSuccess = () => {
    // Refresh user status after successful payment
    fetchUserStatus();
    setShowPayment(false);
    
    // Show success message and offer to start exam
    alert("Payment successful! You can now start your certificate exam.");
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "beginner":
        return "bg-green-100 text-green-800 border-green-200";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "advanced":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getActionButton = () => {
    if (!session) {
      return {
        text: "Sign In to Get Started",
        action: () => {
          console.log("Redirecting to signin");
          router.push("/auth/signin");
        },
        className:
          "w-full bg-[#001e62] text-white py-3 px-6 rounded-lg hover:bg-[#001e62]/90 transition-colors text-center font-medium",
        icon: <GraduationCap className="w-5 h-5 mr-2" />,
      };
    }

    if (userStatus?.hasCertificate) {
      return {
        text: "View Your Certificate",
        action: () => {
          console.log("Redirecting to dashboard certificates");
          router.push("/dashboard/certificates");
        },
        className:
          "w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors text-center font-medium",
        icon: <Award className="w-5 h-5 mr-2" />,
      };
    }

    if (userStatus?.hasPaid) {
      return {
        text: "Take Certificate Exam",
        action: handleStartExam,
        className:
          "w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors text-center font-medium",
        icon: <Play className="w-5 h-5 mr-2" />,
      };
    }

    return {
      text: `Pay for Certificate Exam - ${course?.certificatePrice} SAR`,
      action: () => setShowPayment(true),
      className:
        "w-full bg-[#001e62] text-white py-3 px-6 rounded-lg hover:bg-[#001e62]/90 transition-colors text-center font-medium",
      icon: <CreditCard className="w-5 h-5 mr-2" />,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#001e62] border-t-transparent mx-auto"></div>
          <p className="mt-3 text-sm text-gray-600">
            Loading course details...
          </p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md mx-auto p-8">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Course Not Found
          </h2>
          <Link
            href="/courses"
            className="inline-flex items-center text-[#001e62] hover:text-[#001e62]/80 font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  // Show payment component if requested
  if (showPayment) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <PaymentComponent
            courseId={courseId}
            courseTitle={course.title}
            amount={course.certificatePrice}
            currency="SAR"
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentCancel={handlePaymentCancel}
          />
        </div>
      </div>
    );
  }

  const actionButton = getActionButton();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/courses"
            className="inline-flex items-center text-[#001e62] hover:text-[#001e62]/80 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to All Courses
          </Link>
        </div>
      </div>

      {/* Course Hero */}
      <div className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-start">
            {/* Exam Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Shield className="w-4 h-4 mr-2 text-[#001e62]" />
                Exam Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{formatDuration(course.examDuration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Questions:</span>
                  <span className="font-medium">{course.totalQuestions || 50}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Passing Score:</span>
                  <span className="font-medium">{course.passingScore}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Retakes:</span>
                  <span className="font-medium">Unlimited</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Format:</span>
                  <span className="font-medium">Multiple Choice</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Certificate Fee:</span>
                  <span className="font-medium">{course.certificatePrice} SAR</span>
                </div>
              </div>
            </div>

            {/* Prerequisites */}
            {course.prerequisites && course.prerequisites.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Target className="w-4 h-4 mr-2 text-[#001e62]" />
                  Prerequisites
                </h3>
                <ul className="space-y-1 text-sm text-gray-700">
                  {course.prerequisites.map((prereq, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="w-3 h-3 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                      {prereq}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Certificate Benefits */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Award className="w-4 h-4 mr-2 text-[#001e62]" />
                Certificate Benefits
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <CheckCircle className="w-3 h-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Industry recognition</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-3 h-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Blockchain verification</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-3 h-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">LinkedIn shareable</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-3 h-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">PDF download</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-3 h-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Lifetime validity</span>
                </li>
              </ul>
            </div>

            {/* Help & Support */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Need Help?</h3>
              <div className="space-y-2">
                <Link
                  href="/support"
                  className="block text-[#001e62] hover:text-[#001e62]/80 text-sm font-medium"
                >
                  Contact Support
                </Link>
                <Link
                  href="/faq"
                  className="block text-[#001e62] hover:text-[#001e62]/80 text-sm font-medium"
                >
                  View FAQ
                </Link>
                <Link
                  href="/verify-certificate"
                  className="block text-[#001e62] hover:text-[#001e62]/80 text-sm font-medium"
                >
                  Verify Certificates
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}/* Course Image */}
            <div className="mb-6 lg:mb-0">
              {course.thumbnail ? (
                <Image
                  src={course.thumbnail}
                  alt={course.title}
                  width={500}
                  height={300}
                  className="w-full h-64 object-cover rounded-lg shadow-sm border border-gray-200"
                />
              ) : (
                <div className="w-full h-64 bg-gradient-to-br from-[#001e62] to-[#001e62]/80 rounded-lg shadow-sm border border-gray-200 flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-white" />
                </div>
              )}
            </div>

            {/* Course Info */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-[#001e62] bg-[#001e62]/10 px-2 py-1 rounded-full border border-[#001e62]/20">
                  {course.category}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full border ${getLevelColor(
                    course.level
                  )}`}
                >
                  {course.level}
                </span>
                {userStatus?.hasCertificate && (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800 border border-green-200 flex items-center">
                    <Award className="w-3 h-3 mr-1" />
                    Certified
                  </span>
                )}
                {userStatus?.hasPaid && !userStatus?.hasCertificate && (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Paid
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                {course.title}
              </h1>
              <p className="text-gray-600 mb-4 leading-relaxed">
                {course.description}
              </p>

              {/* Course Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <Star className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                  <div className="text-sm font-semibold text-gray-900">
                    {course.rating || "N/A"}
                  </div>
                  <div className="text-xs text-gray-600">Rating</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                  <div className="text-sm font-semibold text-gray-900">
                    {formatDuration(course.examDuration)}
                  </div>
                  <div className="text-xs text-gray-600">Exam Time</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <FileText className="w-5 h-5 text-green-500 mx-auto mb-1" />
                  <div className="text-sm font-semibold text-gray-900">
                    {course.totalQuestions || "N/A"}
                  </div>
                  <div className="text-xs text-gray-600">Questions</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <Award className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                  <div className="text-sm font-semibold text-gray-900">
                    {course.certificatePrice} SAR
                  </div>
                  <div className="text-xs text-gray-600">Certificate</div>
                </div>
              </div>

              {/* Payment Status Banner */}
              {userStatus?.payment && userStatus.payment.status === 'PENDING' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                    <div>
                      <h3 className="font-medium text-yellow-800">Payment Pending</h3>
                      <p className="text-sm text-yellow-700">
                        Your payment is being processed. You can check the status or try again.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {userStatus?.hasPaid && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <div>
                      <h3 className="font-medium text-green-800">Payment Completed</h3>
                      <p className="text-sm text-green-700">
                        You have access to the certificate exam. Click below to start.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* CTA Button */}
              <button
                onClick={actionButton.action}
                className={`${actionButton.className} flex items-center justify-center`}
              >
                {actionButton.icon}
                {actionButton.text}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Course Details */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Certificate Overview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2 text-[#001e62]" />
                Professional Certification
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Earn an industry-recognized certificate for {course.title}. This
                certification validates your expertise and demonstrates your
                competency to employers worldwide.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">
                  What This Certificate Validates
                </h3>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    Professional competency in {course.category.toLowerCase()}
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    Industry-standard knowledge and best practices
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    Practical application of {course.level.toLowerCase()}-level skills
                  </li>
                </ul>
              </div>
            </div>

            {/* Payment Information */}
            {!userStatus?.hasPaid && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-[#001e62]" />
                  Certificate Exam Payment
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Pay Once, Take Multiple Times</h3>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li className="flex items-center">
                        <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                        One-time payment of {course.certificatePrice} SAR
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                        Unlimited exam attempts
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                        Certificate upon passing
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                        Lifetime access to certificate
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Secure Payment Methods</h3>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li className="flex items-center">
                        <Shield className="w-3 h-3 text-[#001e62] mr-2" />
                        Moyasar - MADA, Visa, Mastercard
                      </li>
                      <li className="flex items-center">
                        <Shield className="w-3 h-3 text-[#001e62] mr-2" />
                        Tap Payments - All major cards
                      </li>
                      <li className="flex items-center">
                        <Shield className="w-3 h-3 text-[#001e62] mr-2" />
                        PCI DSS compliant processing
                      </li>
                      <li className="flex items-center">
                        <Shield className="w-3 h-3 text-[#001e62] mr-2" />
                        Instant exam access after payment
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Exam Format */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-[#001e62]" />
                Secure Exam Format
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Exam Structure</h3>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li className="flex items-center">
                      <FileText className="w-3 h-3 text-[#001e62] mr-2" />
                      {course.totalQuestions || 50} multiple-choice questions
                    </li>
                    <li className="flex items-center">
                      <Clock className="w-3 h-3 text-[#001e62] mr-2" />
                      {formatDuration(course.examDuration)} time limit
                    </li>
                    <li className="flex items-center">
                      <TrendingUp className="w-3 h-3 text-[#001e62] mr-2" />
                      {course.passingScore}% minimum passing score
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Security Features</h3>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li className="flex items-center">
                      <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                      Fullscreen monitoring
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                      Tab switching detection
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                      Copy/paste prevention
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Course Content Preview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-[#001e62]" />
                What You'll Learn
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Learning Outcomes</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    {course.learningOutcomes?.slice(0, 5).map((outcome, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        {outcome}
                      </li>
                    )) || [
                      <li key={1} className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        Master core concepts and principles
                      </li>,
                      <li key={2} className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        Apply knowledge to real-world scenarios
                      </li>,
                      <li key={3} className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        Understand industry best practices
                      </li>,
                    ]}
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Skills You'll Gain</h3>
                  <div className="flex flex-wrap gap-2">
                    {course.skillsGained?.slice(0, 8).map((skill, index) => (
                      <span
                        key={index}
                        className="inline-block bg-[#001e62]/10 text-[#001e62] px-2 py-1 rounded text-xs font-medium border border-[#001e62]/20"
                      >
                        {skill}
                      </span>
                    )) || [
                      "Problem Solving",
                      "Critical Thinking", 
                      "Technical Knowledge",
                      "Best Practices",
                    ].map((skill, index) => (
                      <span
                        key={index}
                        className="inline-block bg-[#001e62]/10 text-[#001e62] px-2 py-1 rounded text-xs font-medium border border-[#001e62]/20"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Certificate Process */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <GraduationCap className="w-4 h-4 mr-2 text-[#001e62]" />
                Certification Process
              </h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className={`w-6 h-6 rounded-full ${userStatus?.hasPaid ? 'bg-green-500 text-white' : 'bg-[#001e62] text-white'} flex items-center justify-center text-xs font-medium mr-3`}>
                    {userStatus?.hasPaid ? '✓' : '1'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Pay Certificate Fee</p>
                    <p className="text-xs text-gray-600">{course.certificatePrice} SAR one-time payment</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className={`w-6 h-6 rounded-full ${userStatus?.hasPaid ? 'bg-[#001e62] text-white' : 'bg-gray-300 text-gray-600'} flex items-center justify-center text-xs font-medium mr-3`}>
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Take Secure Exam</p>
                    <p className="text-xs text-gray-600">Complete the proctored assessment</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-xs font-medium mr-3">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Receive Certificate</p>
                    <p className="text-xs text-gray-600">Download your verified credential</p>
                  </div>
                </div>
              </div>
            </div>

            {// app/courses/[courseId]/page.tsx - Updated Course Detail Page with Payment
"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import PaymentComponent from "@/components/PaymentComponent";
import {
  BookOpen,
  Clock,
  Star,
  Users,
  Award,
  CheckCircle,
  ArrowLeft,
  GraduationCap,
  Shield,
  TrendingUp,
  Building2,
  Play,
  FileText,
  Target,
  Calendar,
  DollarSign,
  AlertCircle,
  CreditCard,
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  thumbnail?: string;
  certificatePrice: number;
  rating?: number;
  passingScore: number;
  examDuration: number;
  totalQuestions?: number;
  prerequisites?: string[];
  learningOutcomes?: string[];
  instructor?: string;
  estimatedStudyTime?: string;
  courseDuration?: string;
  skillsGained?: string[];
  price?: number;
  enrollmentCount?: number;
  courseUrl?: string;
  syllabus?: {
    module: string;
    topics: string[];
    duration: string;
  }[];
}

interface UserStatus {
  hasBooked: boolean;
  hasCompleted: boolean;
  hasCertificate: boolean;
  hasPaid: boolean; // New field for payment status
  payment?: {
    status: string;
    amount: number;
    provider: string;
    id: string;
  };
}

export default function CourseDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    if (courseId) {
      console.log("Course ID from params:", courseId);
      fetchCourseDetail();
    }
  }, [courseId]);

  useEffect(() => {
    if (session?.user?.id && course) {
      fetchUserStatus();
    }
  }, [session, course]);

  const fetchCourseDetail = async () => {
    try {
      setLoading(true);
      console.log(`Fetching course details for ID: ${courseId}`);
      const response = await fetch(`/api/courses/public/${courseId}`);
      console.log("Course API response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Course data received:", data);
        setCourse(data.course);
      } else {
        console.error(
          "Failed to fetch course:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error fetching course:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStatus = async () => {
    try {
      const response = await fetch("/api/user/course-statuses");
      if (response.ok) {
        const data = await response.json();
        const status = data.statuses[courseId] || {
          hasBooked: false,
          hasCompleted: false,
          hasCertificate: false,
          hasPaid: false,
        };
        
        // Check payment status separately
        const paymentResponse = await fetch(`/api/payments/check/${courseId}`);
        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json();
          status.hasPaid = paymentData.hasPayment && paymentData.payment.status === 'COMPLETED';
          if (paymentData.hasPayment) {
            status.payment = paymentData.payment;
          }
        }
        
        setUserStatus(status);
      }
    } catch (error) {
      console.error("Error fetching user status:", error);
    }
  };

  const handleStartExam = () => {
    console.log("Starting exam for course ID:", courseId);

    if (!courseId) {
      console.error("Course ID is missing!");
      alert("Course ID is missing. Please try again.");
      return;
    }

    if (!session) {
      console.log("No session found, redirecting to signin");
      router.push("/auth/signin");
      return;
    }

    // Check if user has paid for the certificate exam
    if (!userStatus?.hasPaid) {
      alert("Please complete the payment for the certificate exam first.");
      setShowPayment(true);
      return;
    }

    // Direct navigation to exam page
    try {
      const targetUrl = `/exam/${courseId}`;
      console.log("Attempting to navigate to:", targetUrl);
      router.push(targetUrl);
    } catch (error) {
      console.error("Navigation error:", error);
      alert("Navigation failed. Please check the console for details.");
    }
  };

  const handlePaymentSuccess = () => {
    // Refresh user status after successful payment
    fetchUserStatus();
    setShowPayment(false);
    
    // Show success message and offer to start exam
    alert("Payment successful! You can now start your certificate exam.");
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "beginner":
        return "bg-green-100 text-green-800 border-green-200";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "advanced":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getActionButton = () => {
    if (!session) {
      return {
        text: "Sign In to Get Started",
        action: () => {
          console.log("Redirecting to signin");
          router.push("/auth/signin");
        },
        className:
          "w-full bg-[#001e62] text-white py-3 px-6 rounded-lg hover:bg-[#001e62]/90 transition-colors text-center font-medium",
        icon: <GraduationCap className="w-5 h-5 mr-2" />,
      };
    }

    if (userStatus?.hasCertificate) {
      return {
        text: "View Your Certificate",
        action: () => {
          console.log("Redirecting to dashboard certificates");
          router.push("/dashboard/certificates");
        },
        className:
          "w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors text-center font-medium",
        icon: <Award className="w-5 h-5 mr-2" />,
      };
    }

    if (userStatus?.hasPaid) {
      return {
        text: "Take Certificate Exam",
        action: handleStartExam,
        className:
          "w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors text-center font-medium",
        icon: <Play className="w-5 h-5 mr-2" />,
      };
    }

    return {
      text: `Pay for Certificate Exam - ${course?.certificatePrice} SAR`,
      action: () => setShowPayment(true),
      className:
        "w-full bg-[#001e62] text-white py-3 px-6 rounded-lg hover:bg-[#001e62]/90 transition-colors text-center font-medium",
      icon: <CreditCard className="w-5 h-5 mr-2" />,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#001e62] border-t-transparent mx-auto"></div>
          <p className="mt-3 text-sm text-gray-600">
            Loading course details...
          </p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md mx-auto p-8">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Course Not Found
          </h2>
          <Link
            href="/courses"
            className="inline-flex items-center text-[#001e62] hover:text-[#001e62]/80 font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  // Show payment component if requested
  if (showPayment) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <PaymentComponent
            courseId={courseId}
            courseTitle={course.title}
            amount={course.certificatePrice}
            currency="SAR"
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentCancel={handlePaymentCancel}
          />
        </div>
      </div>
    );
  }

  const actionButton = getActionButton();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/courses"
            className="inline-flex items-center text-[#001e62] hover:text-[#001e62]/80 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to All Courses
          </Link>
        </div>
      </div>

      {/* Course Hero */}
      <div className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-start">
            {/* Course Image */}
            <div className="mb-6 lg:mb-0">
              {course.thumbnail ? (
                <Image
                  src={course.thumbnail}
                  alt={course.title}
                  width={500}
                  height={300}
                  className="w-full h-64 object-cover rounded-lg shadow-sm border border-gray-200"
                />
              ) : (
                <div className="w-full h-64 bg-gradient-to-br from-[#001e62] to-[#001e62]/80 rounded-lg shadow-sm border border-gray-200 flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-white" />
                </div>
              )}
            </div>

            {/* Course Info */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-[#001e62] bg-[#001e62]/10 px-2 py-1 rounded-full border border-[#001e62]/20">
                  {course.category}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full border ${getLevelColor(
                    course.level
                  )}`}
                >
                  {course.level}
                </span>
                {userStatus?.hasCertificate && (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800 border border-green-200 flex items-center">
                    <Award className="w-3 h-3 mr-1" />
                    Certified
                  </span>
                )}
                {userStatus?.hasPaid && !userStatus?.hasCertificate && (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Paid
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                {course.title}
              </h1>
              <p className="text-gray-600 mb-4 leading-relaxed">
                {course.description}
              </p>

              {/* Course Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <Star className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                  <div className="text-sm font-semibold text-gray-900">
                    {course.rating || "N/A"}
                  </div>
                  <div className="text-xs text-gray-600">Rating</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                  <div className="text-sm font-semibold text-gray-900">
                    {formatDuration(course.examDuration)}
                  </div>
                  <div className="text-xs text-gray-600">Exam Time</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <FileText className="w-5 h-5 text-green-500 mx-auto mb-1" />
                  <div className="text-sm font-semibold text-gray-900">
                    {course.totalQuestions || "N/A"}
                  </div>
                  <div className="text-xs text-gray-600">Questions</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <Award className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                  <div className="text-sm font-semibold text-gray-900">
                    {course.certificatePrice} SAR
                  </div>
                  <div className="text-xs text-gray-600">Certificate</div>
                </div>
              </div>

              {/* Payment Status Banner */