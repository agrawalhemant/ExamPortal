import React, { useState, useEffect } from 'react';
import { Upload, Save, LogOut } from 'lucide-react';
import { questions as defaultQuestions } from '../../data/questions';

const AdminDashboard = ({ onLogout }) => {
    const [config, setConfig] = useState({
        title: 'Exam Portal',
        duration: 60, // minutes
        totalMarks: 100,
        marksPerQuestion: 4,
        negativeMarks: 1,
    });
    const [questions, setQuestions] = useState([]);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [message, setMessage] = useState('');

    // Load existing config on mount
    useEffect(() => {
        const savedConfig = localStorage.getItem('exam_config');
        if (savedConfig) {
            try {
                const parsed = JSON.parse(savedConfig);
                setConfig(parsed.meta);
                setQuestions(parsed.questions && parsed.questions.length > 0 ? parsed.questions : defaultQuestions);
            } catch (e) {
                console.error("Failed to load config", e);
                setQuestions(defaultQuestions);
            }
        } else {
            setQuestions(defaultQuestions);
        }
    }, []);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setUploadedFile(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const parsedQuestions = JSON.parse(event.target.result);
                    if (Array.isArray(parsedQuestions)) {
                        // Basic validation could go here
                        setQuestions(parsedQuestions);
                        setMessage(`Loaded ${parsedQuestions.length} questions from file.`);
                    } else {
                        setMessage('Invalid JSON format. Expected an array of questions.');
                    }
                } catch (err) {
                    setMessage('Error parsing JSON file.');
                }
            };
            reader.readAsText(file);
        }
    };

    const handleSave = () => {
        // Apply default marks to all questions to ensure consistency
        // In a more advanced version, we might want to preserve individual overrides if they differ from the *old* default,
        // but given the current UI only has global controls, we apply globally.
        const updatedQuestions = questions.map(q => ({
            ...q,
            marks: config.marksPerQuestion,
            negativeMarks: config.negativeMarks
        }));

        const examData = {
            meta: config,
            questions: updatedQuestions
        };

        // Also update local state to reflect changes
        setQuestions(updatedQuestions);

        localStorage.setItem('exam_config', JSON.stringify(examData));
        setMessage('Configuration saved successfully!');
        setTimeout(() => setMessage(''), 3000);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white shadow p-4 flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
                <button onClick={onLogout} className="flex items-center gap-2 text-red-600 hover:text-red-800">
                    <LogOut size={18} /> Logout
                </button>
            </header>

            <main className="flex-grow p-8 max-w-4xl mx-auto w-full space-y-8">
                {/* Settings Section */}
                <section className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-4 border-b pb-2">Exam Settings</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title</label>
                            <input
                                type="text"
                                value={config.title}
                                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                            <input
                                type="number"
                                value={config.duration}
                                onChange={(e) => setConfig({ ...config, duration: parseInt(e.target.value) })}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Default Marks per Question</label>
                            <input
                                type="number"
                                value={config.marksPerQuestion}
                                onChange={(e) => setConfig({ ...config, marksPerQuestion: parseInt(e.target.value) })}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Default Negative Marks</label>
                            <input
                                type="number"
                                value={config.negativeMarks}
                                onChange={(e) => setConfig({ ...config, negativeMarks: parseInt(e.target.value) })}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>
                    </div>
                </section>

                {/* Question Upload Section */}
                <section className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-4 border-b pb-2">Question Bank</h2>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition">
                        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <label className="cursor-pointer block">
                            <span className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full font-semibold text-sm hover:bg-blue-100 transition">
                                Upload JSON File
                            </span>
                            <input type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
                        </label>
                        <p className="text-sm text-gray-500 mt-2">
                            {uploadedFile ? uploadedFile.name : "Select a .json file containing questions"}
                        </p>
                    </div>

                    <div className="mt-4">
                        <p className="text-sm font-medium">Questions Loaded: <span className="text-blue-600 text-lg">{questions.length}</span></p>
                    </div>
                </section>

                {/* Save Action */}
                <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                        {message}
                    </p>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 shadow-lg transition"
                    >
                        <Save size={20} /> Save Configuration
                    </button>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
