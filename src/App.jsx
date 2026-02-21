import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate, useParams, Outlet } from 'react-router-dom';
import { ExamProvider, useExam } from './context/ExamContext';
import { AuthProvider, useAuth } from './context/AuthContext'; // Import AuthProvider
import QuestionArea from './components/QuestionArea';
import QuestionPalette from './components/QuestionPalette';
import Timer from './components/Timer';
import Proctoring from './components/Proctoring';
import ResultPage from './components/ResultPage';
import AdminLogin from './components/admin/AdminLogin';
import AdminDashboard from './components/admin/AdminDashboard';
import StudentLogin from './components/student/StudentLogin';
import StudentDashboard from './components/student/StudentDashboard';
import StudentRegister from './components/student/StudentRegister';
import ForgotPassword from './components/student/ForgotPassword';
import { Settings, Loader2, BookOpen, Award, ShieldCheck, ArrowRight } from 'lucide-react';

// --- Protected Route Component (Internal Definition for simplicity or external) ---
// Let's redefine it here or update the external one. 
// For now, I'll update the usage and strictly use the one in components if possible, 
// BUT the external ProtectedRoute might depend on localStorage. 
// I will REPLACE the external import with an internal implementation or update the file later.
// Let's go with updating the file later. For now, I will inline a context-aware ProtectedRoute here 
// to avoid breaking changes if I don't update key files at once. 
// Actually, better to update ProtectedRoute.jsx in next step. 
// Here I will just use `useAuth` in wrappers.

const PrivateRoute = ({ role, children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  if (!user) {
    return <Navigate to={role === 'admin' ? '/admin/login' : '/student/login'} replace />;
  }

  if (role === 'admin' && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  if (role === 'student' && user.role !== 'student') {
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
};

// --- Exam Components ---

const ExamLayout = () => {
  const { isExamActive, examStatus, startExam, submitExam, timeLeft, loadExam, questions, activeExamId, examConfig, violationWarning, clearViolationWarning, assetsLoaded, setAssetsLoaded } = useExam();
  const { examId } = useParams();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loadedImageCount, setLoadedImageCount] = useState(0);
  const [totalImageCount, setTotalImageCount] = useState(0);

  // Preload Images
  useEffect(() => {
    if (questions && questions.length > 0) {
      const urls = questions.map(q => q.imageUrl).filter(Boolean);

      if (urls.length === 0) {
        setAssetsLoaded(true);
        return;
      }

      setTotalImageCount(urls.length);
      setLoadedImageCount(0);
      setAssetsLoaded(false);

      let loaded = 0;
      urls.forEach(url => {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          loaded++;
          setLoadedImageCount(loaded);
          if (loaded === urls.length) setAssetsLoaded(true);
        };
        img.onerror = () => {
          loaded++; // Count errors too so it doesn't hang forever
          setLoadedImageCount(loaded);
          if (loaded === urls.length) setAssetsLoaded(true);
        };
      });
    } else {
      setAssetsLoaded(false);
    }
  }, [questions, setAssetsLoaded]);

  const handleStartTest = () => {
    // 2. Popup window logic
    if (!window.location.search.includes('popup=true')) {
      // Launch popup
      const popupUrl = `${window.location.origin}${window.location.pathname}?popup=true`;
      const features = `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${window.screen.availWidth},height=${window.screen.availHeight}`;

      const popup = window.open(popupUrl, '_blank', features);

      if (!popup) {
        alert("Please allow popups for this site to take the exam.");
        return;
      }

      // Navigate the parent window back to the dashboard to avoid dual-running states
      navigate('/student/dashboard');
    }
  };

  // Auto-start exam if we are in the popup window and data is loaded
  useEffect(() => {
    if (examStatus === 'instruction' && window.location.search.includes('popup=true') && questions.length > 0) {
      startExam();
    }
  }, [examStatus, startExam, questions.length]);

  // Load exam if not already loaded or if ID differs
  useEffect(() => {
    if (examId && activeExamId !== examId) {
      loadExam(examId);
    }
  }, [examId, activeExamId, loadExam]);

  // Determine if device is mobile size for rendering
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  if (examStatus === 'instruction') {
    // If it's the popup, show a loading state briefly while useEffect fires startExam
    if (window.location.search.includes('popup=true')) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
          <p className="text-xl text-gray-600 animate-pulse">Initializing Secure Exam Environment...</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg text-center">
          <h1 className="text-3xl font-bold mb-4">Welcome to the Exam</h1>
          <ul className="text-left list-disc pl-6 mb-6 space-y-2 text-gray-600">
            <li>The exam will run in full-screen mode.</li>
            <li>Do not switch tabs or windows. Doing so will be recorded as a violation.</li>
            <li>3 violations will result in auto-submission.</li>
            <li><strong>Important:</strong> Make sure to click the "Save & Next" button to confirm your answer or to clear a response.</li>
            <li>Good luck!</li>
          </ul>

          {isMobile ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              <strong>Device Not Supported:</strong> Exams can only be taken on desktop computers, laptops, or large tablets. Please switch devices to continue.
            </div>
          ) : (
            <button
              onClick={handleStartTest}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition"
            >
              Start Test
            </button>
          )}

          <button
            onClick={() => navigate('/student/dashboard')}
            className="block mt-4 text-gray-500 hover:text-gray-700 mx-auto"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (examStatus === 'submitted') {
    return <ResultPage />
  }

  return (
    <Proctoring>
      <div className="flex flex-col h-screen overflow-hidden">
        <header className="bg-white shadow px-6 py-3 flex justify-between items-center z-10 shrink-0">
          <div className="w-1/3">
            <h1 className="text-xl font-bold text-gray-800">Entrance Exam Portal</h1>
          </div>
          <div className="w-1/3 text-center">
            <h2 className="text-xl font-bold text-blue-800">{examConfig?.title || 'Active Exam'}</h2>
          </div>
          <div className="flex items-center justify-end gap-4 w-1/3">
            <Timer />
            <button
              onClick={() => setShowConfirm(true)}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded text-sm font-semibold transition"
            >
              Finish Exam
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {!assetsLoaded ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
              <Loader2 className="animate-spin text-blue-600 w-12 h-12 mb-4" />
              <h2 className="text-2xl font-bold text-gray-800">Preparing Exam Assets...</h2>
              {totalImageCount > 0 && (
                <p className="text-gray-500 mt-2 font-medium">Loading images: {loadedImageCount} / {totalImageCount}</p>
              )}
            </div>
          ) : (
            <>
              <main className="w-[70%] h-full p-4 bg-gray-100 overflow-hidden">
                <QuestionArea />
              </main>
              <aside className="w-[30%] h-full p-4 bg-gray-200 border-l border-gray-300 overflow-hidden">
                <QuestionPalette />
              </aside>
            </>
          )}
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Finish Exam?</h2>
            <p className="text-gray-600 mb-6 font-medium text-left">
              Are you sure you want to finish the exam? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  submitExam();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold transition"
              >
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Violation Warning Modal */}
      {violationWarning?.show && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]">
          <div className="bg-white p-6 rounded-lg shadow-2xl max-w-sm w-full text-center border-t-8 border-red-500">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Security Warning</h2>
            <p className="text-gray-700 mb-6 font-medium text-center">
              {violationWarning.message}
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => clearViolationWarning()}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-bold transition w-full"
              >
                {violationWarning.isAutoSubmit ? 'View Results' : 'Acknowledge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Proctoring>
  );
}

// --- Page Components ---

const Home = () => {
  const navigate = useNavigate();
  return (
    <div className="relative min-h-screen bg-[#07090f] overflow-hidden flex flex-col justify-center items-center text-white font-sans selection:bg-cyan-500/30">
      {/* Abstract Background Mesh Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/30 rounded-full mix-blend-screen filter blur-[100px] opacity-70 animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-blue-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-70 animate-pulse" style={{ animationDuration: '10s' }}></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-cyan-600/20 rounded-full mix-blend-screen filter blur-[120px] opacity-60"></div>

      {/* Grid Overlay for Texture */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxwYXRoIGQ9Ik0wIDBoMjB2MjBIMHoiIGZpbGw9Im5vbmUiLz4KPGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz4KPC9zdmc+')] [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none"></div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-20 flex flex-col lg:flex-row items-center gap-16 min-h-screen">

        {/* Left Side: Typography & Hero */}
        <div className="flex-1 text-center lg:text-left pt-10 lg:pt-0">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 shadow-2xl">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="text-sm font-semibold tracking-wide text-gray-300 uppercase">Next-Gen Assessment</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black tracking-tighter mb-6 leading-[1.1]">
            Testing,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
              Reimagined.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 mb-12 max-w-xl mx-auto lg:mx-0 leading-relaxed font-light">
            Step into a distraction-free, highly secure environment engineered explicitly for peak student performance. Minimal friction. Maximum focus.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start">
            <button
              onClick={() => navigate('/student/login')}
              className="group relative px-8 py-4 bg-white text-black font-bold rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_-10px_rgba(34,211,238,0.5)]"
            >
              <div className="absolute inset-0 w-0 bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300 ease-out group-hover:w-full"></div>
              <span className="relative group-hover:text-white flex items-center justify-center gap-2 text-lg">
                Enter Portal <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </span>
            </button>
            <button
              onClick={() => navigate('/student/register')}
              className="px-8 py-4 bg-white/5 text-white font-semibold rounded-2xl border border-white/10 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/20 text-lg"
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Right Side: Glassmorphic Visual/Widget */}
        <div className="flex-1 w-full max-w-md lg:max-w-xl relative mt-16 lg:mt-0">
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500 to-purple-500 rounded-[2.5rem] transform rotate-3 scale-105 opacity-20 blur-2xl"></div>

          <div className="relative bg-[#0d1323]/80 border border-white/10 backdrop-blur-2xl p-8 sm:p-10 rounded-[2.5rem] shadow-2xl">
            <div className="flex items-center justify-between mb-10 border-b border-white/10 pb-8">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">System Status</h3>
                <p className="text-sm font-medium text-cyan-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  All services operational
                </p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl shadow-inner border border-white/5">
                <ShieldCheck className="w-8 h-8 text-cyan-400" />
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-start gap-5 group">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 group-hover:bg-purple-500/20 transition-colors">
                  <BookOpen className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-xl text-white font-semibold mb-1">Smart Interface</h4>
                  <p className="text-gray-400 leading-relaxed">Immersive, distraction-free focus mode built for modern examinations.</p>
                </div>
              </div>

              <div className="flex items-start gap-5 group">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
                  <Award className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-xl text-white font-semibold mb-1">Instant Analytics</h4>
                  <p className="text-gray-400 leading-relaxed">Cryptographically secure submission with real-time performance tracking.</p>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-white/10">
              <button
                onClick={() => navigate('/admin/login')}
                className="w-full py-4 flex items-center justify-center gap-2 text-sm font-semibold text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/10"
              >
                <Settings className="w-5 h-5" /> Access Control Panel
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const AdminLoginWrapper = () => {
  const navigate = useNavigate();
  // We'll pass the login logic down or handle it here if AdminLogin expects a function
  // AdminLogin likely just takes onLogin. 
  // We will need to update AdminLogin to call `login` from context, likely.
  // OR we pass a handler that's calls context.login

  const { login } = useAuth();

  const handleLogin = async (email, password) => {
    try {
      await login(email, password);
      navigate('/admin/dashboard');
    } catch (e) {
      console.error('Login failed: ' + e.message);
      throw e;
    }
  };

  return <AdminLogin onLogin={handleLogin} onBackToHome={() => navigate('/')} />;
};

const AdminDashboardWrapper = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };
  return <AdminDashboard onLogout={handleLogout} />;
};

const StudentLoginWrapper = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (email, password) => {
    try {
      await login(email, password);
      navigate('/student/dashboard');
    } catch (e) {
      console.error('Login failed: ' + e.message);
      throw e;
    }
  };
  return <StudentLogin onLogin={handleLogin} onBackToHome={() => navigate('/')} />;
};

const StudentDashboardWrapper = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleStartExam = (exam) => {
    navigate(`/exam/${exam.id}`);
  };

  if (!user) return null;

  return <StudentDashboard student={user} onStartExam={handleStartExam} onLogout={handleLogout} />;
};

// --- Main App ---

function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/admin/login" element={<AdminLoginWrapper />} />
          <Route path="/student/login" element={<StudentLoginWrapper />} />
          <Route path="/student/register" element={<StudentRegister />} />
          <Route path="/student/forgot-password" element={<ForgotPassword />} />

          {/* Secure Admin Routes */}
          <Route element={<PrivateRoute role="admin" />}>
            <Route path="/admin/dashboard" element={<AdminDashboardWrapper />} />
          </Route>

          {/* Secure Student Routes */}
          <Route element={<PrivateRoute role="student" />}>
            <Route path="/student/dashboard" element={<StudentDashboardWrapper />} />
            <Route path="/exam/:examId" element={
              <ExamProvider>
                <ExamLayout />
              </ExamProvider>
            } />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
