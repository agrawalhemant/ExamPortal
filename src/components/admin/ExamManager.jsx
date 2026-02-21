import React, { useState, useEffect } from 'react';
import { Upload, Trash2, Edit, Plus, Save, X, AlertCircle, Loader2, Search } from 'lucide-react';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../context/AuthContext';
import JSZip from 'jszip';

const ExamManager = () => {
    const [exams, setExams] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentExam, setCurrentExam] = useState(null);
    const [uploadedJsonFile, setUploadedJsonFile] = useState(null);
    const [uploadedZipFile, setUploadedZipFile] = useState(null);
    const [jsonInputKey, setJsonInputKey] = useState(Date.now());
    const [zipInputKey, setZipInputKey] = useState(Date.now() + 1);
    const [requiredImages, setRequiredImages] = useState([]);
    const [pendingImages, setPendingImages] = useState([]); // Store extracted 
    const [message, setMessage] = useState('');
    const [uploadProgress, setUploadProgress] = useState({ isUploading: false, current: 0, total: 0, text: '' });
    const [examToDelete, setExamToDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
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
            duration: 60,
            marksPerQuestion: 4,
            negativeMarks: 1,
            questions: []
        });
        setIsEditing(true);
        setMessage('');
        setUploadedJsonFile(null);
        setUploadedZipFile(null);
        setJsonInputKey(Date.now());
        setZipInputKey(Date.now() + 1);
        setRequiredImages([]);
        setPendingImages([]);
    };

    const handleEdit = (exam) => {
        setCurrentExam(exam);
        setIsEditing(true);
        setMessage('');
        setUploadedJsonFile(null);
        setUploadedZipFile(null);
        setJsonInputKey(Date.now());
        setZipInputKey(Date.now() + 1);
        setRequiredImages([]);
        setPendingImages([]);
    };

    const handleDeleteClick = (id) => {
        setExamToDelete(id);
    };

    const confirmDelete = async () => {
        if (!examToDelete) return;
        const id = examToDelete;

        try {
            // 0. Collect and delete images from storage bucket
            const examToRemove = exams.find(e => e.id === id);
            if (examToRemove?.questions?.length > 0) {
                const imageFilenames = examToRemove.questions
                    .filter(q => q.imageUrl)
                    .map(q => {
                        // imageUrl is a full public URL; extract just the filename (last segment)
                        try {
                            const url = new URL(q.imageUrl);
                            return url.pathname.split('/').pop();
                        } catch {
                            return null;
                        }
                    })
                    .filter(Boolean);

                if (imageFilenames.length > 0) {
                    const { error: storageError } = await supabase.storage
                        .from('question-images')
                        .remove(imageFilenames);
                    if (storageError) {
                        console.warn('Storage cleanup warning:', storageError.message);
                    }
                }
            }

            // 1. Delete associated results from exam_results table to avoid foreign key constraint errors
            const { error: resultsDeleteError } = await supabase.from('exam_results').delete().eq('exam_id', id);
            if (resultsDeleteError) {
                console.error("Error deleting exam results:", resultsDeleteError);
                throw new Error("Failed to delete associated exam results.");
            }

            // 2. Delete the exam from exams table
            const { error: deleteError } = await supabase.from('exams').delete().eq('id', id);
            if (deleteError) throw deleteError;

            // 3. Unassign from all students
            const { "data": profilesToUpdate, "error": fetchError } = await supabase
                .from('profiles')
                .select('id, assigned_exams')
                .contains('assigned_exams', JSON.stringify([id]));

            if (fetchError) {
                console.error("Error fetching profiles to unassign exam:", fetchError);
            } else if (profilesToUpdate && profilesToUpdate.length > 0) {
                await Promise.all(profilesToUpdate.map(async (profile) => {
                    const updatedAssignments = profile.assigned_exams.filter(examId => examId !== id);
                    await supabase.from('profiles').update({ assigned_exams: updatedAssignments }).eq('id', profile.id);
                }));
            }

            setExams(exams.filter(e => e.id !== id));
            setExamToDelete(null); // Close modal
        } catch (error) {
            console.error('Error deleting exam:', error);
            setMessage(error.message || 'Failed to delete exam');
            setExamToDelete(null); // Close modal even on error
        }
    };

    const handleJsonUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadedJsonFile(file);
        setUploadedZipFile(null);
        setRequiredImages([]);
        setPendingImages([]);
        setMessage('');

        if (file.name.endsWith('.json')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const parsedQuestions = JSON.parse(event.target.result);
                    validateAndSetQuestions(parsedQuestions);
                } catch (err) {
                    setMessage('Error parsing JSON file. Please ensure it is valid JSON.');
                    setCurrentExam(prev => ({ ...prev, questions: [] }));
                }
            };
            reader.readAsText(file);
        } else {
            setMessage('Please upload a .json file.');
            setUploadedJsonFile(null);
            setJsonInputKey(Date.now());
        }
    };

    const handleZipUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadedZipFile(file);
        setPendingImages([]);
        setMessage('');

        if (file.name.endsWith('.zip')) {
            setMessage('Validating Images ZIP file...');
            try {
                const jszip = new JSZip();
                const zip = await jszip.loadAsync(file);

                let missingImages = [];
                let foundImages = [];

                requiredImages.forEach(imgName => {
                    const normalizedImagePath = imgName.replace(/^\.\//, '');
                    const imageEntry = zip.file(normalizedImagePath) || zip.file(Object.keys(zip.files).find(n => n.endsWith(normalizedImagePath)));

                    if (!imageEntry) {
                        missingImages.push(imgName);
                    } else {
                        foundImages.push({
                            originalName: imgName,
                            zipEntry: imageEntry,
                            uuid: crypto.randomUUID(),
                            extension: imgName.split('.').pop()
                        });
                    }
                });

                if (missingImages.length > 0) {
                    setMessage(`Validation Error: The following images were referenced in your JSON but missing from the ZIP: ${missingImages.join(', ')}`);
                    setUploadedZipFile(null);
                    setZipInputKey(Date.now());

                    // Clear any previous pending refs on failure
                    if (currentExam?.questions) {
                        const strippedQuestions = currentExam.questions.map(q => {
                            const { pendingImageRef, ...rest } = q;
                            return rest;
                        });
                        setCurrentExam(prev => ({ ...prev, questions: strippedQuestions }));
                    }

                    return;
                }

                const updatedQuestions = currentExam.questions.map(q => {
                    if (q.imageUrl) {
                        const imgMeta = foundImages.find(img => img.originalName === q.imageUrl);
                        return { ...q, pendingImageRef: `${imgMeta.uuid}.${imgMeta.extension}` };
                    }
                    return q;
                });

                setCurrentExam(prev => ({ ...prev, questions: updatedQuestions }));
                setPendingImages(foundImages);
                setMessage(`Successfully validated all ${foundImages.length} required images from the ZIP.`);

            } catch (error) {
                console.error("Error processing zip:", error);
                setMessage('Error reading ZIP file. Ensure it is not corrupted.');
                setUploadedZipFile(null);
                setZipInputKey(Date.now());
            }
        } else {
            setMessage('Please upload a .zip file containing your images.');
            setUploadedZipFile(null);
            setZipInputKey(Date.now());
        }
    };

    const validateAndSetQuestions = (parsedQuestions) => {
        if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
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

            let reqImages = [];
            const updatedQuestions = parsedQuestions.map(q => {
                if (q.imageUrl) {
                    reqImages.push(q.imageUrl);
                }
                return {
                    id: q.id || crypto.randomUUID(),
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    imageUrl: q.imageUrl || null,
                    pendingImageRef: q.pendingImageRef || null, // our temporary zip ref
                    marksPerQuestion: q.marksPerQuestion !== undefined ? q.marksPerQuestion : currentExam.marksPerQuestion,
                    negativeMarks: q.negativeMarks !== undefined ? q.negativeMarks : currentExam.negativeMarks
                };
            });

            // Deduplicate required images
            const uniqueRequiredImages = [...new Set(reqImages)];
            setRequiredImages(uniqueRequiredImages);
            setCurrentExam(prev => ({ ...prev, questions: updatedQuestions }));

            if (uniqueRequiredImages.length > 0) {
                setMessage(`Loaded ${parsedQuestions.length} questions. This exam references ${uniqueRequiredImages.length} images. Please upload a ZIP containing these images.`);
            } else {
                setMessage(`Successfully loaded ${parsedQuestions.length} questions. No images required.`);
            }
        } else {
            setMessage('Invalid JSON format or empty array.');
            setCurrentExam(prev => ({ ...prev, questions: [] }));
        }
    };

    const handleSave = async () => {
        if (!currentExam.title) {
            setMessage('Exam Title is required');
            return;
        }

        if (!currentExam.questions || currentExam.questions.length === 0) {
            setMessage('You must upload a valid JSON/ZIP file with questions.');
            return;
        }

        try {
            // --- Image Upload Flow ---
            let finalQuestionsArray = [...currentExam.questions];

            if (pendingImages.length > 0) {
                setUploadProgress({ isUploading: true, current: 0, total: pendingImages.length, text: 'Uploading images...' });

                for (let i = 0; i < pendingImages.length; i++) {
                    const img = pendingImages[i];
                    setUploadProgress(p => ({ ...p, current: i + 1, text: `Uploading image ${i + 1} of ${pendingImages.length}` }));

                    const blob = await img.zipEntry.async("blob");
                    const filename = `${img.uuid}.${img.extension}`;

                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('question-images')
                        .upload(filename, blob, { upsert: true });

                    if (uploadError) {
                        throw new Error(`Failed to upload ${img.originalName}`);
                    }

                    // Get Public URL
                    const { data: { publicUrl } } = supabase.storage
                        .from('question-images')
                        .getPublicUrl(filename);

                    // Update the JSON reference
                    finalQuestionsArray = finalQuestionsArray.map(q => {
                        if (q.pendingImageRef === filename) {
                            return { ...q, imageUrl: publicUrl };
                        }
                        return q;
                    });
                }
            }

            setUploadProgress({ isUploading: true, current: 0, total: 0, text: 'Saving exam data...' });

            // Clean up temporary fields
            const cleanFinalQuestions = finalQuestionsArray.map(q => {
                const { pendingImageRef, ...cleanQ } = q;
                return cleanQ;
            });

            const { marksPerQuestion, negativeMarks, ...restOfExam } = currentExam;

            const examData = {
                ...restOfExam,
                marks_per_question: marksPerQuestion,
                negative_marks: negativeMarks,
                questions: cleanFinalQuestions,
                created_by: user?.id
            };

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
            setUploadedJsonFile(null);
            setUploadedZipFile(null);
            setJsonInputKey(Date.now());
            setZipInputKey(Date.now() + 1);
            setRequiredImages([]);
            setPendingImages([]);
            setUploadProgress({ isUploading: false, current: 0, total: 0, text: '' });
            setMessage('Exam saved successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error saving exam:', error);
            setMessage('Failed to save exam: ' + error.message);
            setUploadProgress({ isUploading: false, current: 0, total: 0, text: '' });
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* JSON Upload Box */}
                        <div className={`border-2 border-dashed rounded-lg p-6 text-center transition ${uploadedJsonFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:bg-gray-50'}`}>
                            <Upload className={`mx-auto h-10 w-10 mb-2 ${uploadedJsonFile ? 'text-green-500' : 'text-gray-400'}`} />
                            <label className="cursor-pointer block">
                                <span className={`font-medium ${uploadedJsonFile ? 'text-green-700' : 'text-blue-600 hover:text-blue-800'}`}>Upload exam.json File</span>
                                <input key={jsonInputKey} type="file" className="hidden" accept=".json" onChange={handleJsonUpload} disabled={uploadProgress.isUploading} />
                            </label>
                            <p className="text-xs text-gray-500 mt-1">
                                {uploadedJsonFile ? uploadedJsonFile.name : "Select an exam .json file"}
                            </p>
                        </div>

                        {/* Conditional ZIP Upload Box */}
                        {requiredImages.length > 0 && (
                            <div className={`border-2 border-dashed rounded-lg p-6 text-center transition ${pendingImages.length > 0 ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                                <Upload className={`mx-auto h-10 w-10 mb-2 ${pendingImages.length > 0 ? 'text-green-500' : 'text-red-400'}`} />
                                <label className="cursor-pointer block">
                                    <span className={`font-medium ${pendingImages.length > 0 ? 'text-green-700' : 'text-red-600 hover:text-red-800'}`}>Upload Images .zip File</span>
                                    <input key={zipInputKey} type="file" className="hidden" accept=".zip" onChange={handleZipUpload} disabled={uploadProgress.isUploading} />
                                </label>
                                <p className="text-xs text-gray-500 mt-1">
                                    {uploadedZipFile ? uploadedZipFile.name : "Select a .zip file"}
                                </p>
                                {pendingImages.length > 0 ? (
                                    <p className="text-xs text-green-600 mt-2 font-medium">
                                        ✓ Validated {pendingImages.length} images from ZIP.
                                    </p>
                                ) : (
                                    <p className="text-xs text-red-600 mt-2 font-medium">
                                        Waiting for ZIP containing {requiredImages.length} required images.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {uploadProgress.isUploading && (
                    <div className="mb-6 bg-blue-50 border border-blue-200 rounded p-4 flex items-center gap-4">
                        <Loader2 className="animate-spin text-blue-500 h-6 w-6" />
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-blue-800">{uploadProgress.text}</p>
                            {uploadProgress.total > 0 && (
                                <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                                    ></div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center mt-6">
                    <span className={`text-sm ${message.includes('Error') || message.includes('Failed') || message.includes('Invalid') || message.includes('must') || message.toLowerCase().includes('waiting for') ? 'text-red-500' : 'text-green-600'}`}>
                        {message}
                    </span>
                    <button
                        onClick={handleSave}
                        disabled={!currentExam.title || !currentExam.questions || currentExam.questions.length === 0 || (requiredImages.length > 0 && pendingImages.length === 0) || uploadProgress.isUploading}
                        className={`flex items-center gap-2 px-6 py-2 rounded text-white transition
                            ${(!currentExam.title || !currentExam.questions || currentExam.questions.length === 0 || (requiredImages.length > 0 && pendingImages.length === 0) || uploadProgress.isUploading)
                                ? 'bg-blue-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        <Save size={18} /> {uploadProgress.isUploading ? 'Saving...' : 'Save Exam'}
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

                {exams.length === 0 ? (
                    <div className="text-center text-gray-500 py-10">
                        No exams found. Create one to get started.
                    </div>
                ) : exams.filter(exam => exam.title?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                    <div className="text-center text-gray-500 py-10">
                        No exams match your search.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {exams.filter(exam => exam.title?.toLowerCase().includes(searchTerm.toLowerCase())).map(exam => (
                            <div key={exam.id} className="border rounded-lg p-4 flex justify-between items-center hover:shadow-md transition">
                                <div>
                                    <h3 className="font-semibold text-lg">{exam.title}</h3>
                                    <p className="text-sm text-gray-500">{exam.duration} mins • {exam.questions?.length} Questions</p>
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
                                        onClick={() => handleDeleteClick(exam.id)}
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

            {/* Custom Delete Confirmation Modal */}
            {examToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full text-center">
                        <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                        <h2 className="text-xl font-bold mb-2 text-gray-800">Delete Exam?</h2>
                        <p className="text-gray-600 mb-6 font-medium text-sm">
                            Are you sure you want to delete this exam? This will also unassign it from all students and permanently delete all associated student results.
                        </p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setExamToDelete(null)}
                                className="px-6 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-semibold transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold transition flex items-center gap-2"
                            >
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamManager;
