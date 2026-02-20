import React, { useState } from 'react';
import { ExamProvider, useExam } from './context/ExamContext';
import QuestionArea from './components/QuestionArea';
import QuestionPalette from './components/QuestionPalette';
import Timer from './components/Timer';
import Proctoring from './components/Proctoring';
import ResultPage from './components/ResultPage';
import AdminLogin from './components/admin/AdminLogin';
import AdminDashboard from './components/admin/AdminDashboard';
import { Settings } from 'lucide-react';

const ExamLayout = () => {
  const { isExamActive, examStatus, startExam, submitExam, timeLeft } = useExam();

  // Convert seconds to minutes for display in instructions
  const durationInMinutes = Math.floor(timeLeft / 60); // Initial time might be different if countdown started? 
  // Actually timeLeft decrements, so we might want to store originalDuration in context context or just generic message.
  // For simplicity, we just say "allocated time".

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
        {/* Header */}
        <header className="bg-indigo-700 text-white h-16 flex items-center justify-between px-6 shadow-md z-10 shrink-0">
          <h1 className="text-xl font-bold">Entrance Exam Portal</h1>
          <div className="flex items-center gap-4">
            <Timer />
            <button
              onClick={submitExam}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded text-sm font-semibold transition"
            >
              Finish Exam
            </button>
          </div>
        </header>

        {/* Main Content Split */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Question Area (70%) */}
          <main className="w-[70%] h-full p-4 bg-gray-100 overflow-hidden">
            <QuestionArea />
          </main>

          {/* Right: Palette (30%) */}
          <aside className="w-[30%] h-full p-4 bg-gray-200 border-l border-gray-300 overflow-hidden">
            <QuestionPalette />
          </aside>
        </div>
      </div>
    </Proctoring>
  );
}

const MainApp = () => {
  const [currentView, setCurrentView] = useState('home'); // 'home', 'exam', 'admin_login', 'admin_dashboard'

  const handleStartExamFlow = () => {
    setCurrentView('exam');
  };

  const handleAdminLoginSuccess = () => {
    setCurrentView('admin_dashboard');
  };

  if (currentView === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex flex-col items-center justify-center text-white">
        <h1 className="text-5xl font-bold mb-8">Online Examination Portal</h1>
        <div className="space-y-4 flex flex-col items-center">
          <button
            onClick={handleStartExamFlow}
            className="w-64 bg-white text-indigo-600 px-8 py-4 rounded-full font-bold text-xl shadow-lg hover:bg-gray-100 transition transform hover:scale-105"
          >
            Student Login
          </button>

          <button
            onClick={() => setCurrentView('admin_login')}
            className="flex items-center gap-2 text-blue-100 hover:text-white transition mt-4"
          >
            <Settings size={18} /> Admin Portal
          </button>
        </div>
      </div>
    );
  }

  if (currentView === 'admin_login') {
    return <AdminLogin onLogin={handleAdminLoginSuccess} onBackToHome={() => setCurrentView('home')} />;
  }

  if (currentView === 'admin_dashboard') {
    return <AdminDashboard onLogout={() => setCurrentView('home')} />;
  }

  // Exam View
  return (
    <ExamProvider>
      <ExamLayout />
    </ExamProvider>
  );
};

function App() {
  return <MainApp />;
}

export default App;
