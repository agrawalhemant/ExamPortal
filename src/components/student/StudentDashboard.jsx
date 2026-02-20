import React, { useState, useEffect } from 'react';
import { LogOut, Play, Clock, CheckCircle, AlertCircle, RefreshCw, User, Lock, X, Save, Search } from 'lucide-react';
import { supabase } from '../../supabase/client';
import { useSearchParams } from 'react-router-dom';

const StudentDashboard = ({ student, onStartExam, onLogout }) => {
    const [assignedExams, setAssignedExams] = useState([]);
    const [previousResults, setPreviousResults] = useState([]);
    const [loading, setLoading] = useState(false);

    // Profile / Change Password State
    const [showProfile, setShowProfile] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (searchParams.get('reset') === 'true') {
            setShowProfile(true);
            // Optionally clean up URL
            setSearchParams({});
        }
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        loadDashboardData();

        if (!student) return;

        const profileSub = supabase
            .channel('student_profile_changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${student.id}`,
                },
                (payload) => {
                    console.log('Profile updated', payload);
                    loadDashboardData();
                }
            )
            .subscribe();

        const resultsSub = supabase
            .channel('student_results_changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'exam_results',
                    filter: `student_id=eq.${student.id}`,
                },
                (payload) => {
                    console.log('New result synced', payload);
                    // Append or reload? Reload is safer to get consistent state
                    loadDashboardData();
                }
            )
            .subscribe();

        return () => {
            profileSub.unsubscribe();
            resultsSub.unsubscribe();
        };
    }, [student]);

    const loadDashboardData = async () => {
        if (!student) return;
        setLoading(true);

        try {
            // 1. Get assigned exam IDs from profile
            // Note: student prop *should* have assigned_exams if it comes from AuthContext, 
            // but let's fetch fresh to be sure or if AuthContext is stale.
            // Actually, let's trust AuthContext for the ID, but fetch data fresh.

            const { data: profile } = await supabase
                .from('profiles')
                .select('assigned_exams')
                .eq('id', student.id)
                .single();

            const examIds = profile?.assigned_exams || [];

            if (examIds.length > 0) {
                // 2. Fetch Exam Details
                const { data: examsData } = await supabase
                    .from('exams')
                    .select('*')
                    .in('id', examIds)
                    .order('created_at', { ascending: false });

                setAssignedExams(examsData || []);
            } else {
                setAssignedExams([]);
            }

            // 3. Fetch Results
            const { data: resultsData } = await supabase
                .from('exam_results')
                .select('*')
                .eq('student_id', student.id);

            setPreviousResults(resultsData || []);

        } catch (error) {
            console.error("Error loading dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    const getExamStatus = (examId) => {
        const result = previousResults.find(r => r.exam_id === examId);
        return result ? 'completed' : 'pending';
    };

    const getScore = (examId) => {
        const result = previousResults.find(r => r.exam_id === examId);
        return result ? result.score : null;
    }

    return (
        <div className="min-h-screen bg-gray-50 relative">
            <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Welcome, {student.full_name || student.email}</h1>
                    <p className="text-sm text-gray-500">{student.email}</p>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setShowProfile(true)} className="flex items-center gap-2 text-gray-600 hover:text-blue-600">
                        <User size={18} /> Profile
                    </button>
                    <button onClick={loadDashboardData} className="text-gray-500 hover:text-blue-600" title="Refresh">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={onLogout} className="flex items-center gap-2 text-red-600 hover:text-red-800">
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-8">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Your Assigned Exams</h2>

                {assignedExams.length === 0 ? (
                    <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
                        No exams assigned to you yet. Contact your administrator.
                    </div>
                ) : (
                    <>
                        <div className="mb-6 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search exams by title..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                            />
                        </div>

                        {assignedExams.filter(exam => exam.title?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                            <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
                                No exams match your search.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {assignedExams
                                    .filter(exam => exam.title?.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map(exam => {
                                        const status = getExamStatus(exam.id);
                                        const score = getScore(exam.id);
                                        const totalMarks = exam.questions?.reduce((sum, q) => {
                                            return sum + (q.marksPerQuestion !== undefined ? q.marksPerQuestion : (exam.marks_per_question || 4));
                                        }, 0) || 0;

                                        return (
                                            <div key={exam.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                                                <div className="p-6">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h3 className="text-xl font-bold text-gray-800">{exam.title}</h3>
                                                        </div>
                                                        {status === 'completed' ? (
                                                            <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-sm font-medium">
                                                                <CheckCircle size={16} /> Completed
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-sm font-medium">
                                                                <AlertCircle size={16} /> Pending
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 mb-6 text-sm text-gray-600">
                                                        <div className="flex items-center gap-2">
                                                            <Clock size={16} className="text-blue-500" />
                                                            {exam.duration} Minutes
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold">Questions:</span> {exam.questions?.length || 0}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold">Total Marks:</span> {totalMarks}
                                                        </div>
                                                        {status === 'completed' && (
                                                            <div className="flex items-center gap-2 font-bold text-blue-600">
                                                                Score: {score}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {status === 'pending' ? (
                                                        <button
                                                            onClick={() => onStartExam(exam)}
                                                            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
                                                        >
                                                            <Play size={18} /> Start Test
                                                        </button>
                                                    ) : (
                                                        <button
                                                            disabled
                                                            className="w-full bg-gray-100 text-gray-400 py-3 rounded-lg cursor-not-allowed font-medium"
                                                        >
                                                            Submitted
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Profile Modal */}
            {showProfile && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
                        <button
                            onClick={() => setShowProfile(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X size={20} />
                        </button>
                        <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                            <User size={24} /> Profile Settings
                        </h2>

                        <div className="mb-6 pb-4 border-b">
                            <p className="text-gray-600 mb-1">Full Name</p>
                            <p className="font-medium text-lg">{student.full_name || 'N/A'}</p>
                            <p className="text-gray-600 mt-3 mb-1">Email</p>
                            <p className="font-medium text-lg">{student.email}</p>
                        </div>

                        <ChangePasswordForm onSuccess={() => setShowProfile(false)} />
                    </div>
                </div>
            )}
        </div>
    );
};

const ChangePasswordForm = ({ onSuccess }) => {
    const [passwords, setPasswords] = useState({ new: '', confirm: '' });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (passwords.new !== passwords.confirm) {
            setMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }
        if (passwords.new.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: passwords.new });
            if (error) throw error;

            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setPasswords({ new: '', confirm: '' });

            setTimeout(() => {
                if (typeof onSuccess === 'function') {
                    onSuccess();
                }
            }, 1500);
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: err?.message || 'An unexpected error occurred while updating the password.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Lock size={18} /> Change Password
            </h3>

            {message.text && (
                <div className={`p-3 rounded-md mb-4 text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                    }`}>
                    {message.text}
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input
                        type="password"
                        value={passwords.new}
                        onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                        className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                    <input
                        type="password"
                        value={passwords.confirm}
                        onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                        className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? 'Updating...' : <><Save size={18} /> Update Password</>}
                </button>
            </div>
        </form>
    );
};

export default StudentDashboard;
