import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Check, RefreshCw } from 'lucide-react';
import { supabase } from '../../supabase/client';

const StudentManager = () => {
    const [students, setStudents] = useState([]);
    const [exams, setExams] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null); // For assigning exams
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const { data: studentsData } = await supabase.from('profiles').select('*').eq('role', 'student');
            const { data: examsData } = await supabase.from('exams').select('*');

            setStudents(studentsData || []);
            setExams(examsData || []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };


    const toggleExamAssignment = async (examId) => {
        if (!selectedStudent) return;

        const currentAssignments = selectedStudent.assigned_exams || [];
        let updatedAssignments;

        if (currentAssignments.includes(examId)) {
            updatedAssignments = currentAssignments.filter(id => id !== examId);
        } else {
            updatedAssignments = [...currentAssignments, examId];
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ assigned_exams: updatedAssignments })
                .eq('id', selectedStudent.id);

            if (error) throw error;

            // Update local state
            const updatedStudent = { ...selectedStudent, assigned_exams: updatedAssignments };
            setStudents(students.map(s => s.id === selectedStudent.id ? updatedStudent : s));
            setSelectedStudent(updatedStudent);
        } catch (error) {
            console.error('Error updating assignments:', error);
            alert('Failed to update assignment');
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow h-full flex gap-6">
            {/* Left: Student List */}
            <div className="w-1/2 flex flex-col border-r pr-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Students</h2>
                    <button
                        onClick={loadData}
                        className="bg-gray-100 text-gray-600 p-2 rounded hover:bg-gray-200"
                        title="Refresh List"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                <div className="bg-blue-50 p-3 rounded text-sm text-blue-700 mb-4">
                    Students will appear here after they sign up.
                </div>

                <div className="flex-grow overflow-y-auto space-y-2">
                    {students.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No registered students yet.</p>
                    ) : (
                        students.map(student => (
                            <div
                                key={student.id}
                                onClick={() => setSelectedStudent(student)}
                                className={`p-3 rounded border cursor-pointer flex justify-between items-center ${selectedStudent?.id === student.id ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'
                                    }`}
                            >
                                <div>
                                    <h3 className="font-medium">{student.full_name || 'Unnamed Student'}</h3>
                                    <p className="text-sm text-gray-500">{student.email}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right: Exam Assignment */}
            <div className="w-1/2 pl-2">
                <h2 className="text-xl font-bold mb-4">
                    {selectedStudent ? `Assign Exams to ${selectedStudent.full_name}` : 'Select a student to assign exams'}
                </h2>

                {selectedStudent ? (
                    <div className="space-y-2">
                        {exams.length === 0 && <p className="text-gray-500">No exams available. Create exams first.</p>}
                        {exams.map(exam => {
                            const isAssigned = selectedStudent.assigned_exams?.includes(exam.id);
                            return (
                                <div
                                    key={exam.id}
                                    onClick={() => toggleExamAssignment(exam.id)}
                                    className={`p-3 rounded border cursor-pointer flex justify-between items-center transition ${isAssigned ? 'bg-green-50 border-green-500' : 'hover:bg-gray-50'
                                        }`}
                                >
                                    <div>
                                        <h4 className="font-medium">{exam.title}</h4>
                                        <p className="text-xs text-gray-500">{exam.duration} mins • {exam.topic}</p>
                                    </div>
                                    {isAssigned && <Check size={20} className="text-green-600" />}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-gray-400 text-center mt-10">
                        <p>Click on a student from the list to manage their exam assignments.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentManager;
