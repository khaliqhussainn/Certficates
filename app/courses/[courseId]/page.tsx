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
  Zap,
  Sparkles,
  BookMarked,
  LightbulbIcon,
  BadgeCheck,
  BarChart
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

      const courseResponse = await fetch(`/api/courses/public/${courseId}`);
      if (!courseResponse.ok) {
        throw new Error('Course not found');
      }
      const courseData = await courseResponse.json();
      setCourse(courseData.course);

      if (session?.user?.id) {
        const statusResponse = await fetch(`/api/courses/${courseId}`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setUserStatus({
            hasBooked: true,
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
      router.push(`/dashboard/courses/${courseId}`);
      return;
    }

    router.push(`/exam/${courseId}`);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'beginner': return 'bg-blue-100 text-blue-800';
      case 'intermediate': return 'bg-indigo-100 text-indigo-800';
      case 'advanced': return 'bg-purple-100 text-purple-800';
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
                  <Award className="w-5 h-5 mr-2" />
                  <span>Professional Certificate</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  <span>{formatDuration(course.examDuration)} exam</span>
                </div>
              </div>

              {session && userStatus && (
                <div className="bg-white/10 backdrop-blur rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      {userStatus.hasCertificate ? (
                        <div className="flex items-center text-blue-200">
                          <Award className="w-5 h-5 mr-2" />
                          <span className="font-medium">Certificate Earned</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-blue-200">
                          <CheckCircle2 className="w-5 h-5 mr-2" />
                          <span className="font-medium">Certificate Exam Available</span>
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
                          Take Exam
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
                      <span className="text-blue-200">Questions:</span>
                      <span className="font-medium">{course.totalQuestions}</span>
                    </div>
                  </div>
                </div>
              )}

              {!session && (
                <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Earn Your Professional Certificate</p>
                      <p className="text-blue-200 text-sm">Sign in to access your certification exam</p>
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
                  <div className="w-full h-full bg-gradient-to-br from-[#001e62] to-[#003a8c] flex items-center justify-center">
                    <GraduationCap className="w-24 h-24 text-white" />
                  </div>
                )}
              </div>
              
              <div className="absolute -bottom-6 -right-6 bg-[#001e62] text-white rounded-full p-4 shadow-lg">
                <Award className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BookOpen },
              { id: 'certificate', label: 'Certificate', icon: Award },
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
            <div className="lg:col-span-2 space-y-10">
              {/* Course Description */}
              <section className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-8 border border-[#001e62]/10">
                <div className="flex items-center mb-6">
                  <div className="bg-[#001e62] p-3 rounded-xl mr-4">
                    <BookMarked className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-[#001e62]">Course Overview</h2>
                </div>
                <div className="prose max-w-none">
                  <p className="text-lg leading-relaxed text-gray-700">
                    {course.description}
                  </p>
                  <p className="text-base leading-relaxed text-gray-600 mt-4">
                    This comprehensive certification program is designed to validate your expertise and enhance your professional credentials. Upon successful completion of the examination, you will receive an industry-recognized certificate that demonstrates your mastery of the subject matter.
                  </p>
                </div>
              </section>

              {/* Learning Outcomes */}
              {course.learningOutcomes && course.learningOutcomes.length > 0 && (
                <section className="bg-white rounded-2xl p-8 border-2 border-[#001e62]/10 shadow-lg">
                  <div className="flex items-center mb-6">
                    <div className="bg-gradient-to-br from-[#001e62] to-[#003a8c] p-3 rounded-xl mr-4">
                      <LightbulbIcon className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-[#001e62]">Learning Objectives</h2>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    {course.learningOutcomes.map((outcome, index) => (
                      <div 
                        key={index} 
                        className="flex items-start p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-[#001e62]/20 hover:shadow-md transition-shadow"
                      >
                        <div className="bg-[#001e62] p-1.5 rounded-lg mr-3 mt-0.5 flex-shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-gray-800 font-medium">{outcome}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Skills */}
              {course.skillsGained && course.skillsGained.length > 0 && (
                <section className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-8 border border-[#001e62]/10">
                  <div className="flex items-center mb-6">
                    <div className="bg-gradient-to-br from-[#001e62] to-[#003a8c] p-3 rounded-xl mr-4">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-[#001e62]">Professional Skills Development</h2>
                  </div>
                  <p className="text-gray-600 mb-6">
                    Master these essential competencies to advance your career and demonstrate expertise in your field.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {course.skillsGained.map((skill, index) => (
                      <span
                        key={index}
                        className="bg-gradient-to-r from-[#001e62] to-[#003a8c] text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-md hover:shadow-lg transition-shadow"
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
              <div className="bg-gradient-to-br from-[#001e62] to-[#003a8c] rounded-2xl p-6 text-white shadow-xl">
                <h3 className="font-bold text-xl mb-6 flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Exam Specifications
                </h3>
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg backdrop-blur">
                    <span className="flex items-center text-blue-100">
                      <Clock className="w-4 h-4 mr-2" />
                      Duration
                    </span>
                    <span className="font-bold">{formatDuration(course.examDuration)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg backdrop-blur">
                    <span className="flex items-center text-blue-100">
                      <FileText className="w-4 h-4 mr-2" />
                      Total Questions
                    </span>
                    <span className="font-bold">{course.totalQuestions}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg backdrop-blur">
                    <span className="flex items-center text-blue-100">
                      <Target className="w-4 h-4 mr-2" />
                      Passing Score
                    </span>
                    <span className="font-bold">{course.passingScore}%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg backdrop-blur">
                    <span className="flex items-center text-blue-100">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Difficulty Level
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getLevelColor(course.level)}`}>
                      {course.level}
                    </span>
                  </div>
                  {course.instructor && (
                    <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg backdrop-blur">
                      <span className="flex items-center text-blue-100">
                        <Users className="w-4 h-4 mr-2" />
                        Instructor
                      </span>
                      <span className="font-bold">{course.instructor}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Certificate Preview */}
              <div className="bg-gradient-to-br from-[#001e62] to-[#003a8c] text-white rounded-2xl p-6 shadow-xl">
                <div className="flex items-center mb-4">
                  <div className="bg-white/20 p-2 rounded-lg mr-3">
                    <Award className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg">Professional Certification</h3>
                </div>
                <p className="text-blue-100 text-sm mb-6 leading-relaxed">
                  Upon successful examination completion, you will receive an industry-recognized digital certificate with lifetime validity.
                </p>
                <div className="space-y-3 text-sm bg-white/10 rounded-xl p-4 backdrop-blur">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-100">Credential Type:</span>
                    <span className="font-bold">Professional</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-100">Validity Period:</span>
                    <span className="font-bold">Lifetime</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-100">Format:</span>
                    <span className="font-bold">Digital PDF</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-100">Verification:</span>
                    <span className="font-bold">Online Portal</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'certificate' && (
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="bg-gradient-to-br from-[#001e62] to-[#003a8c] w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <Award className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-4xl font-bold text-[#001e62] mb-4">Professional Certificate Program</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Validate your expertise with an industry-recognized credential that enhances your professional profile and career prospects.
              </p>
            </div>

            {/* Certificate CTA Banner */}
            <div className="bg-gradient-to-r from-[#001e62] to-[#003a8c] text-white rounded-3xl p-10 text-center mb-10 shadow-2xl">
              <div className="inline-flex items-center bg-white/20 px-4 py-2 rounded-full mb-4">
                <BadgeCheck className="w-5 h-5 mr-2" />
                <span className="font-semibold">Industry-Recognized Certification</span>
              </div>
              <h3 className="text-3xl font-bold mb-4">Advance Your Professional Career</h3>
              <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
                Demonstrate your mastery and commitment to excellence with a verified professional certificate.
              </p>

              {session ? (
                userStatus?.hasCertificate ? (
                  <div className="bg-white/20 text-white py-4 px-8 rounded-xl inline-flex items-center backdrop-blur">
                    <Award className="w-6 h-6 mr-3" />
                    <span className="font-semibold text-lg">Certificate Successfully Earned</span>
                  </div>
                ) : (
                  <button
                    onClick={handleProceedToExam}
                    className="bg-white text-[#001e62] py-4 px-10 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all inline-flex items-center shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                  >
                    <Play className="w-6 h-6 mr-3" />
                    Begin Certification Exam
                    <ArrowRight className="w-6 h-6 ml-3" />
                  </button>
                )
              ) : (
                <button
                  onClick={() => router.push('/auth/signin')}
                  className="bg-white text-[#001e62] py-4 px-10 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                >
                  Sign In to Start Certification
                </button>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Certificate Benefits */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 border-2 border-[#001e62]/20 rounded-2xl p-8 shadow-lg">
                <div className="flex items-center mb-6">
                  <div className="bg-[#001e62] p-3 rounded-xl mr-4">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#001e62]">Certificate Benefits</h3>
                </div>
                <div className="space-y-4">
                  {[
                    'Industry-recognized professional credential',
                    'Digital certificate with unique verification code',
                    'Lifetime validity with no renewal required',
                    'High-quality downloadable PDF format',
                    'Direct LinkedIn profile integration',
                    'Employer verification through online portal',
                    'Enhanced professional credibility',
                    'Career advancement opportunities'
                  ].map((benefit, index) => (
                    <div key={index} className="flex items-center p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                      <div className="bg-[#001e62] p-1.5 rounded-lg mr-3 flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-gray-800 font-medium">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exam Information */}
              <div className="bg-gradient-to-br from-[#001e62] to-[#003a8c] text-white rounded-2xl p-8 shadow-lg">
                <div className="flex items-center mb-6">
                  <div className="bg-white/20 p-3 rounded-xl mr-4">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold">Examination Details</h3>
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Assessment Format', value: 'Multiple Choice Questions' },
                    { label: 'Total Questions', value: course.totalQuestions },
                    { label: 'Time Allocation', value: formatDuration(course.examDuration) },
                    { label: 'Minimum Passing Score', value: `${course.passingScore}%` },
                    { label: 'Attempt Policy', value: 'Unlimited Retakes' },
                    { label: 'Availability', value: '24/7 Access' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/10 rounded-lg backdrop-blur">
                      <span className="text-blue-100">{item.label}:</span>
                      <span className="font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Certificate Features */}
            <div className="bg-white border-2 border-[#001e62]/10 rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-[#001e62] mb-6 text-center">Your Professional Certificate Includes</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { icon: BadgeCheck, title: 'Verified Credential', desc: 'Unique verification code and certificate number' },
                  { icon: Download, title: 'Digital Download', desc: 'High-resolution PDF ready for printing' },
                  { icon: Globe, title: 'Online Verification', desc: 'Instant validation through our portal' },
                  { icon: Users, title: 'Professional Recognition', desc: 'Acknowledged by industry leaders' },
                  { icon: Shield, title: 'Secure & Authentic', desc: 'Blockchain-verified certification' },
                  { icon: BarChart, title: 'Performance Metrics', desc: 'Detailed score breakdown included' }
                ].map((feature, index) => (
                  <div key={index} className="text-center p-4">
                    <div className="bg-gradient-to-br from-[#001e62] to-[#003a8c] w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <h4 className="font-bold text-[#001e62] mb-2">{feature.title}</h4>
                    <p className="text-sm text-gray-600">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'requirements' && (
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="bg-gradient-to-br from-[#001e62] to-[#003a8c] w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-4xl font-bold text-[#001e62] mb-4">Examination Requirements</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Ensure optimal exam conditions by meeting all technical and environmental requirements for a secure testing experience.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-10">
              {/* Technical Requirements */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 border-2 border-[#001e62]/20 rounded-2xl p-8 shadow-lg">
                <div className="flex items-center mb-6">
                  <div className="bg-[#001e62] p-3 rounded-xl mr-4">
                    <Monitor className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#001e62]">Technical Specifications</h3>
                </div>
                <div className="space-y-4">
                  {[
                    'Safe Exam Browser (SEB) installation recommended',
                    'Stable internet connection with minimum 5 Mbps speed',
                    'Computer equipped with functional webcam',
                    'Microphone for audio verification',
                    'Modern web browser (Chrome 90+, Firefox 88+, Edge 90+)',
                    'Screen resolution minimum 1280x720 pixels',
                    'Quiet and well-illuminated testing environment',
                    'Uninterrupted power supply or fully charged battery'
                  ].map((requirement, index) => (
                    <div key={index} className="flex items-start p-3 bg-white rounded-lg shadow-sm">
                      <div className="bg-[#001e62] p-1.5 rounded-lg mr-3 mt-0.5 flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-gray-800 font-medium">{requirement}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Features */}
              <div className="bg-gradient-to-br from-[#001e62] to-[#003a8c] text-white rounded-2xl p-8 shadow-lg">
                <div className="flex items-center mb-6">
                  <div className="bg-white/20 p-3 rounded-xl mr-4">
                    <Eye className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold">Security Protocols</h3>
                </div>
                <p className="text-blue-100 mb-6 text-sm">
                  Our advanced proctoring system ensures examination integrity and fairness for all candidates.
                </p>
                <div className="space-y-4">
                  {[
                    'AI-powered real-time monitoring and supervision',
                    'Automatic screen recording prevention technology',
                    'Application switching and tab change detection',
                    'Copy, paste, and screenshot blocking',
                    'Mandatory full-screen examination mode',
                    'Suspicious behavior pattern recognition',
                    'Identity verification at exam start',
                    'Automated integrity violation reporting'
                  ].map((feature, index) => (
                    <div key={index} className="flex items-start p-3 bg-white/10 rounded-lg backdrop-blur">
                      <div className="bg-blue-400 p-1.5 rounded-lg mr-3 mt-0.5 flex-shrink-0">
                        <Shield className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Prerequisites */}
            {course.prerequisites && course.prerequisites.length > 0 && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-8 shadow-lg mb-10">
                <div className="flex items-center mb-6">
                  <div className="bg-gradient-to-br from-[#001e62] to-[#003a8c] p-3 rounded-xl mr-4">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#001e62]">Recommended Prerequisites</h3>
                </div>
                <p className="text-gray-700 mb-6">
                  While not mandatory, the following knowledge areas will enhance your examination performance and learning experience.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  {course.prerequisites.map((prerequisite, index) => (
                    <div key={index} className="flex items-start p-4 bg-white rounded-lg shadow-sm">
                      <div className="bg-[#001e62] p-1.5 rounded-lg mr-3 mt-0.5 flex-shrink-0">
                        <Zap className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-gray-800 font-medium">{prerequisite}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Exam Guidelines */}
            <div className="bg-gradient-to-r from-[#001e62] to-[#003a8c] text-white rounded-2xl p-8 shadow-xl">
              <h3 className="text-2xl font-bold mb-6 text-center">Examination Guidelines</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white/10 rounded-xl p-6 backdrop-blur">
                  <div className="flex items-center mb-4">
                    <Clock className="w-6 h-6 mr-3" />
                    <h4 className="font-bold text-lg">Before Your Exam</h4>
                  </div>
                  <ul className="space-y-2 text-sm text-blue-100">
                    <li>• Test your internet connection stability</li>
                    <li>• Close all unnecessary applications</li>
                    <li>• Ensure webcam and microphone functionality</li>
                    <li>• Choose a quiet, private location</li>
                    <li>• Have a valid ID ready for verification</li>
                  </ul>
                </div>
                <div className="bg-white/10 rounded-xl p-6 backdrop-blur">
                  <div className="flex items-center mb-4">
                    <FileText className="w-6 h-6 mr-3" />
                    <h4 className="font-bold text-lg">During Your Exam</h4>
                  </div>
                  <ul className="space-y-2 text-sm text-blue-100">
                    <li>• Remain visible to the webcam at all times</li>
                    <li>• Do not leave the examination window</li>
                    <li>• Avoid communication with others</li>
                    <li>• Keep reference materials out of reach</li>
                    <li>• Answer all questions before submitting</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 py-20 border-t border-gray-200">
        <div className="max-w-7xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-12">
            <h2 className="text-4xl font-bold text-[#001e62] mb-4">
              Earn Your Professional Certificate
            </h2>
            <p className="text-xl text-gray-600 mb-10 max-w-5xl mx-auto">
              Join thousands of certified professionals who have validated their expertise and accelerated their career growth through our comprehensive certification program.
            </p>
            
            {session ? (
              userStatus?.hasCertificate ? (
                <div className="bg-gradient-to-r from-[#001e62] to-[#003a8c] text-white py-5 px-10 rounded-2xl inline-flex items-center text-lg font-bold shadow-lg">
                  <Award className="w-7 h-7 mr-3" />
                  Certificate Successfully Earned
                  <BadgeCheck className="w-6 h-6 ml-3" />
                </div>
              ) : (
                <button
                  onClick={handleProceedToExam}
                  className="bg-gradient-to-r from-[#001e62] to-[#003a8c] text-white py-5 px-12 rounded-2xl text-lg font-bold hover:shadow-2xl transition-all inline-flex items-center shadow-xl transform hover:-translate-y-1"
                >
                  <Play className="w-6 h-6 mr-3" />
                  Begin Certification Exam
                  <ArrowRight className="w-6 h-6 ml-3" />
                </button>
              )
            ) : (
              <button
                onClick={() => router.push('/auth/signin')}
                className="bg-gradient-to-r from-[#001e62] to-[#003a8c] text-white py-5 px-12 rounded-2xl text-lg font-bold hover:shadow-2xl transition-all inline-flex items-center shadow-xl transform hover:-translate-y-1"
              >
                <GraduationCap className="w-6 h-6 mr-3" />
                Sign In to Start Certification
                <ArrowRight className="w-6 h-6 ml-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}