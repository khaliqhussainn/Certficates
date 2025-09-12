// app/exam/[courseId]/page.tsx - Updated Exam Page with SEB Integration
'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { 
  useSafeExamBrowser, 
  SEBStatusIndicator, 
  SEBConfigDownload 
} from '@/components/SafeExamBrowser'
import { Shield, AlertTriangle, Clock, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react'

interface ExamQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface ExamSession {
  id: string;
  courseId: string;
  userId: string;
  status: 'active' | 'completed' | 'expired';
  startedAt: string;
  completedAt?: string;
  timeLimit: number;
  currentQuestionIndex: number;
  answers: Record<string, number>;
  score?: number;
  violations: any[];
}

interface ExamPageProps {
  params: { courseId: string };
}

export default function ExamPage({ params }: ExamPageProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sebInfo = useSafeExamBrowser();
  
  const [examSession, setExamSession] = useState<ExamSession | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [examStarted, setExamStarted] = useState(false);
  const [sebValidated, setSebValidated] = useState(false);
  const [validationLoading, setValidationLoading] = useState(false);
  const [showSEBSetup, setShowSEBSetup] = useState(false);
  const [proctoring, setProctoring] = useState({
    cameraActive: false,
    screenMonitoring: false,
    violations: 0
  });

  const sessionId = searchParams.get('session');
  const sebMode = searchParams.get('seb') === 'true';
  const timerRef = useRef<NodeJS.Timeout>();
  const validationRef = useRef<NodeJS.Timeout>();

  // SEB Validation Function
  const validateSEB = useCallback(async () => {
    if (!sessionId || validationLoading) return;

    setValidationLoading(true);
    try {
      const response = await fetch('/api/exam/seb-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          browserExamKey: sebInfo.browserExamKey,
          configKey: sebInfo.configKey,
          userAgent: navigator.userAgent,
          sebInfo
        })
      });

      const result = await response.json();
      
      if (result.isValid) {
        setSebValidated(true);
        console.log('✅ SEB validation successful:', result);
      } else {
        console.warn('⚠️ SEB validation failed:', result);
        if (result.issues?.length > 0) {
          alert(`Security Issues Detected:\n${result.issues.join('\n')}\n\nPlease restart with proper SEB configuration.`);
        }
      }
    } catch (error) {
      console.error('SEB validation error:', error);
    } finally {
      setValidationLoading(false);
    }
  }, [sessionId, sebInfo, validationLoading]);

  // Load exam session and questions
  useEffect(() => {
    async function loadExam() {
      if (status !== 'authenticated' || !session?.user?.id) return;
      
      try {
        setIsLoading(true);
        
        // Load or create exam session
        let session_response;
        if (sessionId) {
          session_response = await fetch(`/api/exam/session/${sessionId}`);
        } else {
          session_response = await fetch('/api/exam/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId: params.courseId })
          });
        }
        
        if (!session_response.ok) {
          throw new Error('Failed to load exam session');
        }
        
        const sessionData = await session_response.json();
        setExamSession(sessionData);
        
        // Load questions
        const questions_response = await fetch(`/api/exam/${params.courseId}/questions`);
        if (!questions_response.ok) {
          throw new Error('Failed to load exam questions');
        }
        
        const questionsData = await questions_response.json();
        setQuestions(questionsData);
        setCurrentQuestionIndex(sessionData.currentQuestionIndex || 0);
        
        // Set up timer
        if (sessionData.status === 'active') {
          const elapsed = Date.now() - new Date(sessionData.startedAt).getTime();
          const remaining = Math.max(0, (sessionData.timeLimit * 60 * 1000) - elapsed);
          setTimeRemaining(Math.floor(remaining / 1000));
          setExamStarted(true);
        }
        
      } catch (error) {
        console.error('Error loading exam:', error);
        alert('Failed to load exam. Please try again.');
        router.push(`/courses/${params.courseId}`);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadExam();
  }, [status, session, params.courseId, sessionId, router]);

  // SEB validation effect
  useEffect(() => {
    if (sebMode && examSession && sebInfo.isSEB && !sebValidated) {
      // Validate immediately if SEB is detected
      validateSEB();
      
      // Set up periodic validation
      validationRef.current = setInterval(validateSEB, 30000); // Every 30 seconds
      
      return () => {
        if (validationRef.current) {
          clearInterval(validationRef.current);
        }
      };
    }
  }, [sebMode, examSession, sebInfo.isSEB, sebValidated, validateSEB]);

  // Timer effect
  useEffect(() => {
    if (examStarted && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [examStarted, timeRemaining]);

  // Security monitoring
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && examStarted) {
        recordViolation('TAB_SWITCH', 'User switched away from exam tab');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (examStarted) {
        e.preventDefault();
        recordViolation('RIGHT_CLICK', 'Right-click attempted');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (examStarted) {
        // Block common cheating shortcuts
        const blockedKeys = [
          'F12', 'F11', 'PrintScreen',
          'Meta', 'Alt', 'Control'
        ];
        
        if (blockedKeys.includes(e.key) || 
            (e.ctrlKey && ['c', 'v', 'a', 'f', 'u', 'r', 'i'].includes(e.key.toLowerCase())) ||
            (e.altKey && e.key === 'Tab')) {
          e.preventDefault();
          recordViolation('BLOCKED_SHORTCUT', `Blocked shortcut: ${e.key}`);
        }
      }
    };

    if (examStarted) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [examStarted]);

  const recordViolation = async (type: string, details: string) => {
    if (!examSession) return;
    
    setProctoring(prev => ({ ...prev, violations: prev.violations + 1 }));
    
    try {
      await fetch('/api/exam/violation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: examSession.id,
          type,
          details,
          timestamp: new Date().toISOString()
        })
      });
      
      // Show warning for serious violations
      if (['TAB_SWITCH', 'BLOCKED_SHORTCUT'].includes(type)) {
        alert(`⚠️ Security Warning: ${details}\n\nContinued violations may result in exam termination.`);
      }
    } catch (error) {
      console.error('Failed to record violation:', error);
    }
  };

  const handleStartExam = async () => {
    if (!examSession) return;
    
    // Final SEB check before starting
    if (sebMode && !sebValidated) {
      if (!sebInfo.isSEB) {
        setShowSEBSetup(true);
        return;
      } else {
        await validateSEB();
        if (!sebValidated) {
          alert('SEB validation failed. Please restart with proper configuration.');
          return;
        }
      }
    }
    
    try {
      const response = await fetch(`/api/exam/session/${examSession.id}/start`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to start exam');
      }
      
      const updatedSession = await response.json();
      setExamSession(updatedSession);
      setTimeRemaining(updatedSession.timeLimit * 60);
      setExamStarted(true);
      
      // Enable proctoring features if in SEB mode
      if (sebMode && sebValidated) {
        setProctoring(prev => ({
          ...prev,
          screenMonitoring: true,
          cameraActive: true
        }));
      }
      
    } catch (error) {
      console.error('Error starting exam:', error);
      alert('Failed to start exam. Please try again.');
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
  };

  const handleNextQuestion = async () => {
    if (!examSession || selectedAnswer === null) return;
    
    const updatedAnswers = {
      ...examSession.answers,
      [questions[currentQuestionIndex].id]: selectedAnswer
    };
    
    try {
      await fetch(`/api/exam/session/${examSession.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: questions[currentQuestionIndex].id,
          answer: selectedAnswer,
          questionIndex: currentQuestionIndex
        })
      });
      
      setExamSession(prev => prev ? { ...prev, answers: updatedAnswers } : null);
      
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(
          updatedAnswers[questions[currentQuestionIndex + 1].id] ?? null
        );
      } else {
        await handleSubmitExam();
      }
    } catch (error) {
      console.error('Error saving answer:', error);
      alert('Failed to save answer. Please try again.');
    }
  };

  const handleSubmitExam = async () => {
    if (!examSession) return;
    
    try {
      const response = await fetch(`/api/exam/session/${examSession.id}/submit`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit exam');
      }
      
      const result = await response.json();
      
      alert(`Exam completed!\nScore: ${result.score}/${questions.length} (${Math.round(result.percentage)}%)`);
      
      router.push(`/courses/${params.courseId}/results?session=${examSession.id}`);
      
    } catch (error) {
      console.error('Error submitting exam:', error);
      alert('Failed to submit exam. Please try again.');
    }
  };

  const handleTimeUp = async () => {
    alert('⏰ Time is up! Your exam will be submitted automatically.');
    await handleSubmitExam();
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  if (!examSession || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Exam Not Available</h2>
          <p className="text-gray-600 mb-4">The exam could not be loaded or is not available.</p>
          <button
            onClick={() => router.push(`/courses/${params.courseId}`)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Course
          </button>
        </div>
      </div>
    );
  }

  // Show SEB setup screen if required but not detected
  if (sebMode && !sebInfo.isSEB && showSEBSetup) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Secure Exam Setup Required</h1>
              <p className="text-gray-600">
                This exam requires Safe Exam Browser (SEB) for security and integrity.
              </p>
            </div>
            
            <SEBConfigDownload
              courseId={params.courseId}
              examSessionId={examSession.id}
              onConfigGenerated={() => {
                alert('Configuration downloaded! Please close this browser and open the .seb file to start your exam.');
              }}
            />
            
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <strong>Important:</strong> After downloading the configuration file, close this browser window 
                  and double-click the downloaded .seb file to launch the secure exam environment.
                </div>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <button
                onClick={() => router.push(`/courses/${params.courseId}`)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 mr-4"
              >
                Cancel
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Refresh & Check Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Security Status Bar */}
      {sebMode && (
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <SEBStatusIndicator />
            {proctoring.screenMonitoring && (
              <div className="mt-2 flex items-center text-sm text-gray-600">
                <Eye className="w-4 h-4 mr-1" />
                Proctoring Active • Violations: {proctoring.violations} • 
                {proctoring.cameraActive ? ' Camera: On' : ' Camera: Off'}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        {!examStarted ? (
          /* Exam Start Screen */
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Ready to Start Your Exam</h1>
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="font-semibold">Time Limit</div>
                  <div className="text-gray-600">{examSession.timeLimit} minutes</div>
                </div>
                <div className="text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="font-semibold">Questions</div>
                  <div className="text-gray-600">{questions.length} total</div>
                </div>
                <div className="text-center">
                  <Shield className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <div className="font-semibold">Security</div>
                  <div className="text-gray-600">{sebMode ? 'SEB Required' : 'Standard'}</div>
                </div>
              </div>
            </div>

            {sebMode && !sebValidated && validationLoading && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-yellow-600 border-t-transparent mr-3"></div>
                  <span className="text-yellow-800">Validating Safe Exam Browser...</span>
                </div>
              </div>
            )}

            <button
              onClick={handleStartExam}
              disabled={sebMode && (!sebValidated || validationLoading)}
              className="w-full py-4 bg-green-600 text-white text-lg font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sebMode && !sebValidated ? 'Validating Security...' : 'Start Exam'}
            </button>
          </div>
        ) : (
          /* Exam Interface */
          <div className="space-y-6">
            {/* Header with timer and progress */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </div>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className={`w-5 h-5 mr-2 ${timeRemaining < 300 ? 'text-red-500' : 'text-gray-500'}`} />
                  <span className={`text-lg font-semibold ${timeRemaining < 300 ? 'text-red-500' : 'text-gray-700'}`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              </div>
            </div>

            {/* Question */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-6">{currentQuestion.question}</h2>
              
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                      selectedAnswer === index
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${
                        selectedAnswer === index
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedAnswer === index && (
                          <div className="w-3 h-3 rounded-full bg-white"></div>
                        )}
                      </div>
                      <span>{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={() => {
                  if (currentQuestionIndex > 0) {
                    setCurrentQuestionIndex(currentQuestionIndex - 1);
                    setSelectedAnswer(
                      examSession.answers[questions[currentQuestionIndex - 1].id] ?? null
                    );
                  }
                }}
                disabled={currentQuestionIndex === 0}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <button
                onClick={handleNextQuestion}
                disabled={selectedAnswer === null}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentQuestionIndex === questions.length - 1 ? 'Submit Exam' : 'Next Question'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}