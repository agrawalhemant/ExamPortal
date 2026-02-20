import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { supabase } from '../../supabase/client';

const AdminReports = () => {
    const [students, setStudents] = useState([]);
    const [results, setResults] = useState([]);
    const [exams, setExams] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');

    useEffect(() => {
        loadData();

        // Real-time subscription for new results
        const subscription = supabase
            .channel('exam_results_changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'exam_results',
                },
                (payload) => {
                    console.log('New result received!', payload);
                    setResults((prev) => [...prev, payload.new]);
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const { data: studentsData } = await supabase.from('profiles').select('*').eq('role', 'student');
            const { data: resultsData } = await supabase.from('exam_results').select('*');
            const { data: examsData } = await supabase.from('exams').select('*');

            setStudents(studentsData || []);
            setResults(resultsData || []);
            setExams(examsData || []);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStudentReport = (studentId) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return [];

        const studentResults = results.filter(r => r.student_id === studentId);
        const assignments = student.assigned_exams || [];

        // Combine assigned exams with results to ensure we capture past non-assigned results too
        const allExamIds = Array.from(new Set([...studentResults.map(r => r.exam_id), ...assignments]));

        return allExamIds.map(examId => {
            const exam = exams.find(e => e.id === examId);
            const result = studentResults.find(r => r.exam_id === examId);

            // If the exam was deleted and there is no result for it, ignore this assignment (garbage cleanup)
            if (!exam && !result) return null;

            let calculatedTotal = '-';
            if (result) {
                calculatedTotal = result.total_marks;
            } else if (exam && exam.questions) {
                calculatedTotal = exam.questions.reduce((sum, q) => {
                    const qMarks = q.marksPerQuestion !== undefined ? q.marksPerQuestion : (exam.marks_per_question || 4);
                    return sum + qMarks;
                }, 0);
            }

            return {
                examTitle: exam ? exam.title : 'Deleted Exam (Legacy Result)',
                examId: examId,
                status: result ? 'Completed' : 'Pending',
                score: result ? result.score : '-',
                totalMarks: calculatedTotal,
                submittedAt: result ? new Date(result.submitted_at).toLocaleDateString() : '-'
            };
        }).filter(Boolean); // Filter out the nulls
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Student Reports</h2>
                <button
                    onClick={loadData}
                    className="bg-gray-100 text-gray-600 p-2 rounded hover:bg-gray-200"
                    title="Refresh Data"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="flex gap-6 h-full overflow-hidden">
                <div className="w-1/3 border-r pr-4 flex flex-col h-full">
                    <h3 className="font-semibold text-gray-700 mb-4 shrink-0">Select Student</h3>
                    <div className="mb-4 shrink-0">
                        <input
                            type="text"
                            placeholder="Search student by name..."
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div className="space-y-2 overflow-y-auto flex-grow">
                        {students
                            .filter(s => (s.full_name || '').toLowerCase().includes(studentSearch.toLowerCase()))
                            .map(student => (
                                <div
                                    key={student.id}
                                    onClick={() => setSelectedStudent(student)}
                                    className={`p-3 rounded border cursor-pointer hover:bg-gray-50 ${selectedStudent?.id === student.id ? 'bg-blue-50 border-blue-500' : ''
                                        }`}
                                >
                                    <p className="font-medium">{student.full_name || 'Unnamed'}</p>
                                    <p className="text-xs text-gray-500">{student.email}</p>
                                </div>
                            ))}
                    </div>
                </div>

                {/* Report View */}
                <div className="w-2/3 pl-4 overflow-y-auto">
                    {selectedStudent ? (
                        <div>
                            <h3 className="text-lg font-bold mb-4">{selectedStudent.full_name}'s Performance</h3>
                            {getStudentReport(selectedStudent.id).length > 0 ? (
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100 text-left text-sm text-gray-600">
                                            <th className="p-3 border">Exam</th>
                                            <th className="p-3 border">Status</th>
                                            <th className="p-3 border">Score</th>
                                            <th className="p-3 border">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {getStudentReport(selectedStudent.id).map((row, idx) => (
                                            <tr key={idx} className="border-b">
                                                <td className="p-3 border">{row.examTitle}</td>
                                                <td className="p-3 border">
                                                    <span className={`px-2 py-1 rounded text-xs ${row.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {row.status}
                                                    </span>
                                                </td>
                                                <td className="p-3 border">{row.score} / {row.totalMarks}</td>
                                                <td className="p-3 border">{row.submittedAt}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-gray-500">No exams assigned to this student.</p>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            Select a student to view details
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminReports;
