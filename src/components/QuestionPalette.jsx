import React from 'react';
import { useExam } from '../context/ExamContext';

const QuestionPalette = () => {
    const { questions, currentQuestionIndex, userResponses, navigateToQuestion } = useExam();

    const getStatusColor = (status, isCurrent) => {
        if (isCurrent) return 'ring-2 ring-offset-2 ring-blue-500';
        switch (status) {
            case 'answered': return 'bg-green-500 text-white';
            case 'not_answered': return 'bg-red-500 text-white';
            case 'marked_for_review': return 'bg-violet-500 text-white';
            case 'answered_and_marked_for_review': return 'bg-violet-500 text-white relative after:content-["✓"] after:absolute after:bottom-0 after:right-0 after:text-xs';
            default: return 'bg-white border text-gray-700'; // not_visited
        }
    };

    return (
        <div className="bg-white shadow-md rounded-lg p-4 h-full flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Question Palette</h3>

            <div className="grid grid-cols-4 gap-2 overflow-y-auto flex-grow content-start">
                {questions.map((q, index) => {
                    const response = userResponses[q.id];
                    const status = response ? response.status : 'not_visited';
                    const isCurrent = currentQuestionIndex === index;

                    return (
                        <button
                            key={q.id}
                            onClick={() => navigateToQuestion(index)}
                            className={`w-10 h-10 rounded flex items-center justify-center font-semibold text-sm transition-all ${getStatusColor(status, isCurrent)}`}
                        >
                            {index + 1}
                        </button>
                    )
                })}
            </div>

            <div className="mt-4 border-t pt-2 text-xs space-y-2">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div> <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div> <span>Not Answered</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-white border rounded"></div> <span>Not Visited</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-violet-500 rounded"></div> <span>Marked for Review</span>
                </div>
            </div>
        </div>
    );
};

export default QuestionPalette;
