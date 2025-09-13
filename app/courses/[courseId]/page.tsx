"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import {
  BookOpen,
  Clock,
  Users,
  Star,
  Award,
  Shield,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Play,
  Target,
  Calendar,
  Globe,
  Download,
  TrendingUp,
  ChevronRight,
  Lock,
  CreditCard,
  GraduationCap,
  FileText,
  Monitor,
  Eye,
  Brain,
  Zap
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  thumbnail?: string;
  certificatePrice: number;
  certificateDiscount?: number;
  passingScore: number;
  examDuration: number;
  totalQuestions: number;
  rating?: number;
  price?: number;
  is?: boolean;
  instructor?: string;
  estimatedStudyTime?: string;
  skillsGained?: string[];
  learningOutcomes?: string[];
  prerequisites?: string[];
  isPublished: boolean;
}

interface UserStatus {
  hasBooked: boolean;
  hasCompleted: boolean;
  hasCertificate: boolean;
  canTakeExam: boolean;
  Access?: boolean;
  payment?: {
    status: string;
    amount: number;
  };
  examAttempts?: any[];
  certificate?: {
    certificateNumber: string;
    verificationCode: string;
    grade: string;
    score: number;
  };
}

export default function CourseDetailsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'certificate' | 'requirements'>('overview');

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
    }
  }, [courseId, session]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);

      // Fetch course details
      const courseResponse = await fetch(`/api/courses/public/${courseId}`);
      if (!courseResponse.ok) {
        throw new Error('Course not found');
      }
      const courseData = await courseResponse.json();
      setCourse(courseData.course);

      // Fetch user status if logged in
      if (session?.user?.id) {
        const statusResponse = await fetch(`/api/courses/${courseId}`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setUserStatus({
            hasBooked: true, // Always true since no payment required
            hasCompleted: !!statusData.completion,
            hasCertificate: !!statusData.certificate,
            canTakeExam: statusData.canTakeExam,
            Access: statusData.Access,
            payment: statusData.payment,
            examAttempts: statusData.examAttempts || [],
            certificate: statusData.certificate
          });
        }
      }
    } catch (error) {
      console.error('Error fetching course details:', error);
      setError(error instanceof Error ? error.message : 'Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToExam = () => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (userStatus?.hasCertificate) {
      // View certificate
      router.push(`/dashboard/courses/${courseId}`);
      return;
    }

    // Go directly to exam - no payment required
    router.push(`/exam/${courseId}`);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#001e62] mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-900">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Course Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The requested course could not be found.'}</p>
          <button
            onClick={() => router.push('/courses')}
            className="bg-[#001e62] text-white py-2 px-4 rounded-lg hover:bg-[#001e62]/90 transition-colors"
          >
            Browse Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#001e62] to-[#003a8c] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center space-x-4 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(course.level)}`}>
                  {course.level}
                </span>
                <span className="text-blue-200 text-sm">{course.category}</span>
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                {course.title}
              </h1>
              
              <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                {course.description}
              </p>

              <div className="flex flex-wrap items-center gap-6 mb-8">
                {course.rating && (
                  <div className="flex items-center">
                    <Star className="w-5 h-5 text-yellow-400 mr-1" />
                    <span className="font-semibold">{course.rating}</span>
                    <span className="text-blue-200 ml-1">rating</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  <span>Professional Certificate</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  <span>{formatDuration(course.examDuration)} exam</span>
                </div>
              </div>

              {/* User Status */}
              {session && userStatus && (
                <div className="bg-white/10 backdrop-blur rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      {userStatus.hasCertificate ? (
                        <div className="flex items-center text-green-300">
                          <Award className="w-5 h-5 mr-2" />
                          <span className="font-medium">Certificate Earned!</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-green-300">
                          <CheckCircle2 className="w-5 h-5 mr-2" />
                          <span className="font-medium"> Certificate Exam Available</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleProceedToExam}
                      className="bg-white text-[#001e62] px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center"
                    >
                      {userStatus.hasCertificate ? (
                        <>
                          <Award className="w-4 h-4 mr-2" />
                          View Certificate
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Take  Exam
                        </>
                      )}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-200">Passing Score:</span>
                      <span className="font-medium">{course.passingScore}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-200">Attempts:</span>
                      <span className="font-medium">Unlimited</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-200">Cost:</span>
                      <span className="font-medium text-green-300"></span>
                    </div>
                  </div>
                </div>
              )}

              {!session && (
                <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Ready to get certified?</p>
                      <p className="text-blue-200 text-sm">Sign in to take your  certificate exam</p>
                    </div>
                    <button
                      onClick={() => router.push('/auth/signin')}
                      className="bg-white text-[#001e62] px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                    >
                      Sign In
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl">
                {course.thumbnail ? (
                  <Image
                    src={course.thumbnail}
                    alt={course.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <GraduationCap className="w-24 h-24 text-white" />
                  </div>
                )}
              </div>
              
              {/* Certificate Badge */}
              <div className="absolute -bottom-6 -right-6 bg-green-400 text-green-900 rounded-full p-4 shadow-lg">
                <Award className="w-8 h-8" />
              </div>
            </div>
          </div>

       
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BookOpen },
              { id: 'certificate', label: ' Certificate', icon: Award },
              { id: 'requirements', label: 'Requirements', icon: Shield }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#001e62] text-[#001e62]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
              {/* Course Description */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Course</h2>
                <div className="prose max-w-none text-gray-600">
                  <p className="text-lg leading-relaxed">{course.description}</p>
                </div>
              </section>

              {/* Learning Outcomes */}
              {course.learningOutcomes && course.learningOutcomes.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">What You'll Learn</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {course.learningOutcomes.map((outcome, index) => (
                      <div key={index} className="flex items-start">
                        <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{outcome}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Skills */}
              {course.skillsGained && course.skillsGained.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Skills You'll Gain</h2>
                  <div className="flex flex-wrap gap-2">
                    {course.skillsGained.map((skill, index) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Course Stats */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Course Details</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Exam Duration
                    </span>
                    <span className="font-medium">{formatDuration(course.examDuration)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Questions
                    </span>
                    <span className="font-medium">{course.totalQuestions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center">
                      <Target className="w-4 h-4 mr-2" />
                      Passing Score
                    </span>
                    <span className="font-medium">{course.passingScore}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Level
                    </span>
                    <span className={`px-2 py-1 rounded text-sm font-medium ${getLevelColor(course.level)}`}>
                      {course.level}
                    </span>
                  </div>
                  {course.instructor && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center">
                        <Users className="w-4 h-4 mr-2" />
                        Instructor
                      </span>
                      <span className="font-medium">{course.instructor}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Certificate Preview */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <Award className="w-6 h-6 text-green-600 mr-3" />
                  <h3 className="font-semibold text-green-900"> Professional Certificate</h3>
                </div>
                <p className="text-green-800 text-sm mb-4">
                  Earn an industry-recognized certificate at no cost upon successful completion of the exam.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-700">Certificate Fee:</span>
                    <span className="font-semibold text-green-900">
                      
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Validity:</span>
                    <span className="font-semibold text-green-900">Lifetime</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Verification:</span>
                    <span className="font-semibold text-green-900">Digital</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'certificate' && (
          <div id="certificate-section" className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Award className="w-16 h-16 text-[#001e62] mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-4"> Professional Certificate</h2>
              <p className="text-xl text-gray-600">
                Validate your expertise with an industry-recognized certificate - completely !
              </p>
            </div>

            {/*  Access Banner */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl p-8 text-center mb-8">
              <h3 className="text-2xl font-bold mb-4">🎉  Certificate Exam!</h3>
              <div className="text-4xl font-bold mb-2">
                
              </div>
              <p className="text-green-100 mb-8">
                Limited time offer - Take your certificate exam for !
              </p>

              {session ? (
                userStatus?.hasCertificate ? (
                  <div className="bg-white/20 text-white py-3 px-6 rounded-lg inline-flex items-center">
                    <Award className="w-5 h-5 mr-2" />
                    Certificate Already Earned
                  </div>
                ) : (
                  <button
                    onClick={handleProceedToExam}
                    className="bg-white text-green-600 py-3 px-8 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Take  Exam Now
                  </button>
                )
              ) : (
                <button
                  onClick={() => router.push('/auth/signin')}
                  className="bg-white text-green-600 py-3 px-8 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  Sign In to Take  Exam
                </button>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Certificate Benefits */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Certificate Benefits</h3>
                <div className="space-y-3">
                  {[
                    'Industry-recognized credential',
                    'Digital verification',
                    'Lifetime validity',
                    'Downloadable PDF certificate',
                    'LinkedIn profile integration',
                    'Employer verification portal'
                  ].map((benefit, index) => (
                    <div key={index} className="flex items-center">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mr-3" />
                      <span className="text-gray-700">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exam Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Exam Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Format:</span>
                    <span className="font-medium">Multiple Choice</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Questions:</span>
                    <span className="font-medium">{course.totalQuestions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{formatDuration(course.examDuration)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Passing Score:</span>
                    <span className="font-medium">{course.passingScore}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Attempts:</span>
                    <span className="font-medium">Unlimited</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Cost:</span>
                    <span className="font-medium text-green-600"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'requirements' && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Shield className="w-16 h-16 text-[#001e62] mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Exam Requirements</h2>
              <p className="text-xl text-gray-600">
                Ensure you meet all requirements for a secure exam experience
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Technical Requirements */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Monitor className="w-5 h-5 mr-2" />
                  Technical Requirements
                </h3>
                <div className="space-y-3">
                  {[
                    'Safe Exam Browser (SEB) recommended',
                    'Stable internet connection (minimum 5 Mbps)',
                    'Computer with webcam and microphone',
                    'Updated browser (Chrome, Firefox, Edge)',
                    'Quiet, well-lit testing environment'
                  ].map((requirement, index) => (
                    <div key={index} className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
                      <span className="text-gray-700">{requirement}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Features */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Security Features
                </h3>
                <div className="space-y-3">
                  {[
                    'Real-time monitoring and supervision',
                    'Screen recording prevention',
                    'Application switching detection',
                    'Copy/paste blocking',
                    'Full-screen lock mode',
                    'Suspicious activity alerts'
                  ].map((feature, index) => (
                    <div key={index} className="flex items-start">
                      <Shield className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Prerequisites */}
            {course.prerequisites && course.prerequisites.length > 0 && (
              <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-amber-900 mb-4 flex items-center">
                  <Brain className="w-5 h-5 mr-2" />
                  Prerequisites
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {course.prerequisites.map((prerequisite, index) => (
                    <div key={index} className="flex items-start">
                      <Zap className="w-5 h-5 text-amber-600 mr-3 mt-0.5" />
                      <span className="text-amber-800">{prerequisite}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Earn Your  Certificate?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of professionals who have advanced their careers with our certificates.
          </p>
          
          {session ? (
            userStatus?.hasCertificate ? (
              <div className="bg-green-500 text-white py-4 px-8 rounded-lg inline-flex items-center text-lg font-semibold">
                <Award className="w-6 h-6 mr-3" />
                Certificate Earned - Congratulations!
              </div>
            ) : (
              <button
                onClick={handleProceedToExam}
                className="bg-[#001e62] text-white py-4 px-8 rounded-lg text-lg font-semibold hover:bg-[#003a8c] transition-colors inline-flex items-center"
              >
                <Play className="w-6 h-6 mr-3" />
                Start Your  Exam
                <ArrowRight className="w-6 h-6 ml-3" />
              </button>
            )
          ) : (
            <button
              onClick={() => router.push('/auth/signin')}
              className="bg-[#001e62] text-white py-4 px-8 rounded-lg text-lg font-semibold hover:bg-[#003a8c] transition-colors inline-flex items-center"
            >
              <GraduationCap className="w-6 h-6 mr-3" />
              Get Started Today - !
              <ArrowRight className="w-6 h-6 ml-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}