import React, { useState } from 'react';
import { LogOut, Layout, Users, FileBarChart } from 'lucide-react';
import ExamManager from './ExamManager';
import StudentManager from './StudentManager';
import AdminReports from './AdminReports';

const AdminDashboard = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState('exams'); // 'exams', 'students', 'reports'

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <header className="bg-white shadow px-6 py-4 flex justify-between items-center z-10">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-gray-800">Admin Portal</h1>
                </div>
                <button onClick={onLogout} className="flex items-center gap-2 text-red-600 hover:text-red-800 font-medium">
                    <LogOut size={20} /> Logout
                </button>
            </header>

            <div className="flex flex-grow overflow-hidden">
                {/* Sidebar */}
                <aside className="w-64 bg-white shadow-md flex-shrink-0 z-0">
                    <nav className="p-4 space-y-2">
                        <button
                            onClick={() => setActiveTab('exams')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'exams' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <Layout size={20} /> Exams
                        </button>
                        <button
                            onClick={() => setActiveTab('students')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'students' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <Users size={20} /> Students
                        </button>
                        <button
                            onClick={() => setActiveTab('reports')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'reports' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <FileBarChart size={20} /> Reports
                        </button>
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className="flex-grow p-6 overflow-hidden h-[calc(100vh-64px)]">
                    {activeTab === 'exams' && <ExamManager />}
                    {activeTab === 'students' && <StudentManager />}
                    {activeTab === 'reports' && <AdminReports />}
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;
