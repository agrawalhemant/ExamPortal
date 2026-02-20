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
import { Settings } from 'lucide-react';

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
  const { isExamActive, examStatus, startExam, submitExam, timeLeft, loadExam, questions, activeExamId } = useExam();
  const { examId } = useParams();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  // Load exam if not already loaded or if ID differs
  useEffect(() => {
    if (examId && activeExamId !== examId) {
      loadExam(examId);
    }
  }, [examId, activeExamId, loadExam]);


  if (examStatus === 'instruction') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg text-center">
          <h1 className="text-3xl font-bold mb-4">Welcome to the Exam</h1>
          <ul className="text-left list-disc pl-6 mb-6 space-y-2 text-gray-600">
            <li>The exam will run in full-screen mode.</li>
            <li>Do not switch tabs or windows. Doing so will be recorded as a violation.</li>
            <li>3 violations will result in auto-submission.</li>
            <li>Good luck!</li>
          </ul>
          <button
            onClick={startExam}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition"
          >
            Start Test
          </button>
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
        <header className="bg-indigo-700 text-white h-16 flex items-center justify-between px-6 shadow-md z-10 shrink-0">
          <h1 className="text-xl font-bold">Entrance Exam Portal</h1>
          <div className="flex items-center gap-4">
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
          <main className="w-[70%] h-full p-4 bg-gray-100 overflow-hidden">
            <QuestionArea />
          </main>
          <aside className="w-[30%] h-full p-4 bg-gray-200 border-l border-gray-300 overflow-hidden">
            <QuestionPalette />
          </aside>
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
    </Proctoring>
  );
}

// --- Page Components ---

const Home = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex flex-col items-center justify-center text-white">
      <h1 className="text-5xl font-bold mb-8">Online Examination Portal</h1>
      <div className="space-y-4 flex flex-col items-center">
        <button
          onClick={() => navigate('/student/login')}
          className="w-64 bg-white text-indigo-600 px-8 py-4 rounded-full font-bold text-xl shadow-lg hover:bg-gray-100 transition transform hover:scale-105"
        >
          Student Login
        </button>

        <button
          onClick={() => navigate('/admin/login')}
          className="flex items-center gap-2 text-blue-100 hover:text-white transition mt-4"
        >
          <Settings size={18} /> Admin Portal
        </button>
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
