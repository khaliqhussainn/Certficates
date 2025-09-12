// app/courses/[courseId]/page.tsx - WORKING SIMPLIFIED VERSION
"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import {
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Play,
  Loader2,
} from "lucide-react";

// --- Types ---
interface Question {
  id: string;
  question: string;
  options: string[];
  order: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
}

interface ExamSession {
  id: string;
  courseId: string;
  courseName: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "TERMINATED";
  duration: number;
  totalQuestions: number;
  passingScore: number;
}

// --- Main Component ---
export default function SimplifiedExamPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;

  // --- State ---
  const [examSession, setExamSession] = useState<ExamSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Refs ---
  const timerRef = useRef<NodeJS.Timeout>();

  // --- Functions ---
  const initializeExam = async () => {
    try {
      setLoading(true);
      console.log("Initializing exam for course:", courseId);

      // Step 1: Get or create exam session
      const sessionResponse = await fetch(
        `/api/exam/session?courseId=${courseId}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json();
        throw new Error(errorData.error || "Failed to get exam session");
      }

      const sessionData: ExamSession = await sessionResponse.json();
      console.log("Exam session created/retrieved:", sessionData);
      setExamSession(sessionData);
      setTimeRemaining(sessionData.duration * 60);

      // Step 2: Get exam questions
      const questionsResponse = await fetch(
        `/api/exam/questions/${courseId}?sessionId=${sessionData.id}`
      );

      if (!questionsResponse.ok) {
        const errorData = await questionsResponse.json();
        throw new Error(errorData.error || "Failed to load exam questions");
      }

      const questionsData = await questionsResponse.json();
      console.log("Questions loaded:", questionsData.questions?.length || 0);
      setQuestions(questionsData.questions || []);
    } catch (error) {
      console.error("Exam initialization error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to initialize exam"
      );
    } finally {
      setLoading(false);
    }
  };

  const startExam = async () => {
    if (!examSession || !questions.length) {
      alert("Exam session or questions not ready. Please refresh the page.");
      return;
    }

    try {
      console.log("Starting exam session:", examSession.id);

      // Start the exam session on the server
      const response = await fetch(`/api/exam/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: examSession.id,
          browserData: {
            userAgent: navigator.userAgent,
            screen: { width: screen.width, height: screen.height },
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to start exam");
      }

      console.log("Exam started successfully");

      // Start the timer
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmitExam("TIME_EXPIRED");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setExamStarted(true);
    } catch (error) {
      console.error("Error starting exam:", error);
      alert(
        `Failed to start exam: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleSubmitExam = async (reason: string = "USER_SUBMIT") => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/exam/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: examSession?.id,
          reason,
          answers,
          violations: [],
          timeSpent: examSession ? examSession.duration * 60 - timeRemaining : 0,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Redirect to results page
        router.push(`/exam/results/${examSession?.id}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit exam");
      }
    } catch (error) {
      console.error("Error submitting exam:", error);
      alert("Failed to submit exam. Please try again or contact support.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnswerChange = (questionId: string, selectedOption: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: selectedOption }));
    
    // Auto-save answer
    saveAnswer(questionId, selectedOption);
  };

  const saveAnswer = async (questionId: string, selectedAnswer: number) => {
    try {
      await fetch("/api/exam/submit-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: examSession?.id,
          questionId,
          selectedAnswer,
          timeSpent: 30 // Default time spent per question
        }),
      });
    } catch (error) {
      console.error("Error saving answer:", error);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // --- Effects ---
  useEffect(() => {
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    if (courseId) {
      initializeExam();
    }
  }, [courseId, session, router]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // --- Loading State ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#001e62] mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">Loading Exam...</p>
          <p className="text-sm text-gray-500 mt-2">
            Preparing your exam environment
          </p>
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Unable to Load Exam
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#001e62] text-white py-2 px-4 rounded-lg hover:bg-[#001e62]/90 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push(`/courses/${courseId}`)}
              className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Course
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Pre-Exam Screen ---
  if (!examStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#001e62] to-[#003a8c] flex items-center justify-center p-4">
        <div className="max-w-2xl mx-auto w-full">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-[#001e62] text-white p-8 text-center">
              <Shield className="w-16 h-16 mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-2">Certificate Exam</h1>
              <p className="text-blue-100">Ready to begin your assessment</p>
            </div>

            <div className="p-8">
              {/* Exam Information */}
              {examSession && (
                <div className="bg-gray-50 rounded-lg p-6 mb-8">
                  <h2 className="text-xl font-bold text-[#001e62] mb-4">
                    Exam Information
                  </h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Course:</span>
                        <span className="font-medium">
                          {examSession.courseName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Questions:</span>
                        <span className="font-medium">
                          {questions.length || examSession.totalQuestions}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">
                          {examSession.duration} minutes
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Passing Score:</span>
                        <span className="font-medium">
                          {examSession.passingScore}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-amber-800 mb-4">
                  Exam Instructions
                </h3>
                <div className="text-sm text-amber-700 space-y-2">
                  <p>• Answer all questions to the best of your ability</p>
                  <p>• You can navigate between questions freely</p>
                  <p>• Your answers are automatically saved</p>
                  <p>• Submit your exam when complete or when time expires</p>
                  <p>• Ensure stable internet connection throughout</p>
                </div>
              </div>

              {/* Start Button */}
              <div className="text-center">
                <button
                  onClick={startExam}
                  disabled={!examSession || questions.length === 0}
                  className="px-8 py-4 bg-[#001e62] text-white rounded-lg text-lg font-semibold hover:bg-[#003a8c] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center mx-auto shadow-lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Begin Exam
                </button>
                <p className="text-sm text-gray-500 mt-4">
                  {examSession && questions.length > 0
                    ? `Ready to start - ${questions.length} questions loaded`
                    : "Loading exam data..."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Main Exam Interface ---
  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            No Questions Available
          </h2>
          <p className="text-gray-600 mb-6">
            This exam doesn't have any questions configured yet.
          </p>
          <button
            onClick={() => router.push(`/courses/${courseId}`)}
            className="w-full bg-[#001e62] text-white py-2 px-4 rounded-lg hover:bg-[#001e62]/90 transition-colors flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900 flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                {examSession?.courseName}
              </h1>
              <div className="flex gap-4 text-sm text-gray-500 mt-1">
                <span>Question {currentQuestion + 1} of {questions.length}</span>
                <span>Progress: {Math.round(progress)}%</span>
                <span>Answered: {answeredCount}/{questions.length}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono font-bold text-red-600">
                <Clock className="w-5 h-5 inline mr-2" />
                {formatTime(timeRemaining)}
              </div>
              <div className="text-xs text-gray-500">Time Remaining</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-gray-200 rounded-full h-2 mt-4">
            <div
              className="bg-[#001e62] h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <h2 className="text-xl font-semibold leading-relaxed mb-6 text-gray-900">
            {currentQ.question}
          </h2>

          <div className="space-y-4">
            {currentQ.options.map((option, index) => (
              <label
                key={index}
                className={`block p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-gray-50 ${
                  answers[currentQ.id] === index
                    ? "border-[#001e62] bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name={`question-${currentQ.id}`}
                  value={index}
                  checked={answers[currentQ.id] === index}
                  onChange={() => handleAnswerChange(currentQ.id, index)}
                  className="sr-only"
                />
                <div className="flex items-center">
                  <div
                    className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center transition-all ${
                      answers[currentQ.id] === index
                        ? "border-[#001e62] bg-[#001e62]"
                        : "border-gray-300"
                    }`}
                  >
                    {answers[currentQ.id] === index && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                  <span className="text-gray-900">{option}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-between items-center">
          <button
            onClick={handlePreviousQuestion}
            disabled={currentQuestion === 0}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </button>

          <div className="flex gap-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestion(index)}
                className={`w-8 h-8 rounded text-sm font-medium transition-all ${
                  index === currentQuestion
                    ? "bg-[#001e62] text-white"
                    : answers[questions[index].id] !== undefined
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            {currentQuestion === questions.length - 1 ? (
              <button
                onClick={() => handleSubmitExam("USER_SUBMIT")}
                disabled={isSubmitting}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Submit Exam
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-6 py-3 bg-[#001e62] text-white rounded-lg hover:bg-[#003a8c] transition-colors flex items-center"
              >
                Next
                <ArrowLeft className="w-4 h-4 ml-2 transform rotate-180" />
              </button>
            )}
          </div>
        </div>

        {/* Status Summary */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Progress</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#001e62]">
                {answeredCount}/{questions.length}
              </div>
              <div className="text-sm text-gray-600">Questions Answered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#001e62]">
                {Math.round(progress)}%
              </div>
              <div className="text-sm text-gray-600">Progress Complete</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {formatTime(timeRemaining)}
              </div>
              <div className="text-sm text-gray-600">Time Remaining</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}