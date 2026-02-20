import React, { useMemo } from 'react';
import { useExam } from '../context/ExamContext';
import { generatePDF } from '../utils/pdfGenerator';
import { Download } from 'lucide-react';

const ResultPage = () => {
    const { questions, userResponses } = useExam();

    const { score, totalMarks, correctCount, wrongCount, attemptedCount } = useMemo(() => {
        let score = 0;
        let totalMarks = 0;
        let correctCount = 0;
        let wrongCount = 0;
        let attemptedCount = 0;

        questions.forEach(q => {
            totalMarks += q.marks;
            const response = userResponses[q.id];
            const userAnswer = response?.selectedOption;

            if (userAnswer) {
                attemptedCount++;
                if (userAnswer === q.correctAnswer) {
                    score += q.marks;
                    correctCount++;
                } else {
                    score -= q.negativeMarks;
                    wrongCount++;
                }
            }
        });

        return { score, totalMarks, correctCount, wrongCount, attemptedCount };
    }, [questions, userResponses]);

    return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8">
            <div className="bg-white p-8 rounded-xl shadow-2xl text-center max-w-2xl w-full">
                <h2 className="text-3xl font-bold text-gray-800 mb-6">Exam Completed</h2>

                <div className="grid grid-cols-2 gap-6 mb-8 text-left">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500">Total Score</p>
                        <p className="text-2xl font-bold text-blue-600">{score} / {totalMarks}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500">Correct Answers</p>
                        <p className="text-2xl font-bold text-green-600">{correctCount}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500">Wrong Answers</p>
                        <p className="text-2xl font-bold text-red-600">{wrongCount}</p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500">Attempted</p>
                        <p className="text-2xl font-bold text-yellow-600">{attemptedCount} / {questions.length}</p>
                    </div>
                </div>

                <button
                    onClick={() => generatePDF(questions, userResponses, score, totalMarks)}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
                >
                    <Download size={20} />
                    Download Result Report (PDF)
                </button>
            </div>
        </div>
    );
};

export default ResultPage;
