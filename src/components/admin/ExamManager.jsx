import React, { useState, useEffect } from 'react';
import { Upload, Trash2, Edit, Plus, Save, X, AlertCircle } from 'lucide-react';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../context/AuthContext';

const ExamManager = () => {
    const [exams, setExams] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentExam, setCurrentExam] = useState(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [message, setMessage] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        loadExams();
    }, []);

    const loadExams = async () => {
        try {
            const { data, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setExams(data || []);
        } catch (error) {
            console.error('Error loading exams:', error);
            setMessage('Error loading exams');
        }
    };

    const handleCreateNew = () => {
        setCurrentExam({
            title: '',
            topic: '',
            duration: 60,
            marksPerQuestion: 4,
            negativeMarks: 1,
            questions: []
        });
        setIsEditing(true);
        setMessage('');
        setUploadedFile(null);
    };

    const handleEdit = (exam) => {
        setCurrentExam(exam);
        setIsEditing(true);
        setMessage('');
        setUploadedFile(null); // Reset file input when editing, though questions are already loaded
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this exam? This will also unassign it from all students.')) {
            try {
                // 1. Delete the exam from exams table
                const { error: deleteError } = await supabase.from('exams').delete().eq('id', id);
                if (deleteError) throw deleteError;

                // 2. Unassign from all students
                // Fetch profiles that have this exam in their assigned_exams array
                // Supabase JSONB contains operator is `@>`.
                const { "data": profilesToUpdate, "error": fetchError } = await supabase
                    .from('profiles')
                    .select('id, assigned_exams')
                    .contains('assigned_exams', [id]);

                if (fetchError) {
                    console.error("Error fetching profiles to unassign exam:", fetchError);
                } else if (profilesToUpdate && profilesToUpdate.length > 0) {
                    // Update each profile asynchronously
                    await Promise.all(profilesToUpdate.map(async (profile) => {
                        const updatedAssignments = profile.assigned_exams.filter(examId => examId !== id);
                        await supabase.from('profiles').update({ assigned_exams: updatedAssignments }).eq('id', profile.id);
                    }));
                }

                // Update local state
                setExams(exams.filter(e => e.id !== id));
            } catch (error) {
                console.error('Error deleting exam:', error);
                setMessage('Failed to delete exam');
            }
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setUploadedFile(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const parsedQuestions = JSON.parse(event.target.result);
                    if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
                        // Validate Schema: Must have 'question', 'options' array, and 'correctAnswer'
                        const isValidSchema = parsedQuestions.every(q =>
                            q.question &&
                            Array.isArray(q.options) &&
                            q.options.length > 0 &&
                            q.correctAnswer !== undefined
                        );

                        if (!isValidSchema) {
                            setMessage('Invalid JSON schema. Each question must have "question", "options" array, and "correctAnswer".');
                            setCurrentExam(prev => ({ ...prev, questions: [] }));
                            return;
                        }

                        const updatedQuestions = parsedQuestions.map(q => ({
                            id: q.id || crypto.randomUUID(),
                            question: q.question, // Strictly keep as 'question'
                            options: q.options,
                            correctAnswer: q.correctAnswer,
                            // Use JSON provided marksPerQuestion, fallback to form fields if absent
                            marksPerQuestion: q.marksPerQuestion !== undefined ? q.marksPerQuestion : currentExam.marksPerQuestion,
                            negativeMarks: q.negativeMarks !== undefined ? q.negativeMarks : currentExam.negativeMarks
                        }));

                        setCurrentExam(prev => ({ ...prev, questions: updatedQuestions }));
                        setMessage(`Successfully loaded ${parsedQuestions.length} questions.`);
                    } else {
                        setMessage('Invalid JSON format or empty array.');
                        setCurrentExam(prev => ({ ...prev, questions: [] }));
                    }
                } catch (err) {
                    setMessage('Error parsing JSON file. Please ensure it is valid JSON.');
                    setCurrentExam(prev => ({ ...prev, questions: [] }));
                }
            };
            reader.readAsText(file);
        }
    };

    const handleSave = async () => {
        if (!currentExam.title) {
            setMessage('Exam Title is required');
            return;
        }

        if (!currentExam.questions || currentExam.questions.length === 0) {
            setMessage('You must upload a valid JSON file with questions.');
            return;
        }

        const finalQuestions = currentExam.questions.map(q => ({
            ...q,
            marksPerQuestion: q.marksPerQuestion !== undefined ? q.marksPerQuestion : currentExam.marksPerQuestion,
            negativeMarks: q.negativeMarks !== undefined ? q.negativeMarks : currentExam.negativeMarks
        }));

        const { marksPerQuestion, negativeMarks, ...restOfExam } = currentExam;

        const examData = {
            ...restOfExam,
            marks_per_question: marksPerQuestion,
            negative_marks: negativeMarks,
            questions: finalQuestions,
            created_by: user?.id
        };

        try {
            const { data, error } = await supabase
                .from('exams')
                .upsert(examData)
                .select()
                .single();

            if (error) throw error;

            if (exams.some(e => e.id === data.id)) {
                setExams(exams.map(e => e.id === data.id ? data : e));
            } else {
                setExams([data, ...exams]);
            }

            setIsEditing(false);
            setUploadedFile(null);
            setMessage('Exam saved successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error saving exam:', error);
            setMessage('Failed to save exam: ' + error.message);
        }
    };

    if (isEditing) {
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">{currentExam.title || 'New Exam'}</h2>
                    <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title</label>
                        <input
                            type="text"
                            value={currentExam.title}
                            onChange={(e) => setCurrentExam({ ...currentExam, title: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                            placeholder="e.g. React Fundamentals"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                        <input
                            type="text"
                            value={currentExam.topic}
                            onChange={(e) => setCurrentExam({ ...currentExam, topic: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                            placeholder="e.g. Frontend"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                        <input
                            type="number"
                            value={currentExam.duration}
                            onChange={(e) => setCurrentExam({ ...currentExam, duration: parseInt(e.target.value) || 0 })}
                            className="w-full border rounded px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Marks per Question</label>
                        <input
                            type="number"
                            value={currentExam.marksPerQuestion}
                            onChange={(e) => setCurrentExam({ ...currentExam, marksPerQuestion: parseInt(e.target.value) || 0 })}
                            className="w-full border rounded px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Negative Marks</label>
                        <input
                            type="number"
                            value={currentExam.negativeMarks}
                            onChange={(e) => setCurrentExam({ ...currentExam, negativeMarks: parseInt(e.target.value) || 0 })}
                            className="w-full border rounded px-3 py-2"
                        />
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Questions ({currentExam.questions?.length || 0})</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition">
                        <Upload className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                        <label className="cursor-pointer block">
                            <span className="text-blue-600 hover:text-blue-800 font-medium">Upload JSON File</span>
                            <input type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                            {uploadedFile ? uploadedFile.name : "Select a .json file"}
                        </p>
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <span className={`text-sm ${message.includes('Error') || message.includes('Failed') || message.includes('Invalid') || message.includes('must') || message.includes('required') ? 'text-red-500' : 'text-green-600'}`}>
                        {message}
                    </span>
                    <button
                        onClick={handleSave}
                        disabled={!currentExam.title || !currentExam.questions || currentExam.questions.length === 0}
                        className={`flex items-center gap-2 px-6 py-2 rounded text-white transition
                            ${(!currentExam.title || !currentExam.questions || currentExam.questions.length === 0)
                                ? 'bg-blue-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        <Save size={18} /> Save Exam
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Manage Exams</h2>
                <button
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                    <Plus size={18} /> Create New Exam
                </button>
            </div>

            <div className="flex-grow overflow-y-auto">
                {exams.length === 0 ? (
                    <div className="text-center text-gray-500 py-10">
                        No exams found. Create one to get started.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {exams.map(exam => (
                            <div key={exam.id} className="border rounded-lg p-4 flex justify-between items-center hover:shadow-md transition">
                                <div>
                                    <h3 className="font-semibold text-lg">{exam.title}</h3>
                                    <p className="text-sm text-gray-500">{exam.topic} • {exam.duration} mins • {exam.questions?.length} Questions</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(exam)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                        title="Edit"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(exam.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExamManager;
