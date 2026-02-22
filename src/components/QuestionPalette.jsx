import React from 'react';
import { useExam } from '../context/ExamContext';

const QuestionPalette = () => {
    const { questions, currentQuestionIndex, userResponses, navigateToQuestion } = useExam();

    const getStatusColor = (status, isCurrent) => {
        let baseClasses = '';
        if (isCurrent) baseClasses += 'ring-2 ring-offset-2 ring-blue-500 ';

        switch (status) {
            case 'answered':
                return baseClasses + 'bg-green-500 text-white relative';
            case 'not_answered':
                return baseClasses + 'bg-red-500 text-white relative';
            case 'marked_for_review':
                // White background, gray text, but with the violet bottom-right tick/check
                return baseClasses + 'bg-white border text-gray-700 overflow-visible relative after:content-["✓"] after:absolute after:-bottom-2 after:-right-2 after:bg-violet-500 after:text-white after:w-5 after:h-5 after:rounded-full after:flex after:items-center after:justify-center after:text-xs after:shadow-sm';
            case 'answered_and_marked_for_review':
                // Green background with a violet checkmark/tick superimposed
                return baseClasses + 'bg-green-500 text-white overflow-visible relative after:content-["✓"] after:absolute after:-bottom-2 after:-right-2 after:bg-violet-500 after:text-white after:w-5 after:h-5 after:rounded-full after:flex after:items-center after:justify-center after:text-xs after:shadow-sm';
            default:
                return baseClasses + 'bg-white border text-gray-700 relative'; // not_visited
        }
    };

    const counts = {
        answered: 0,
        not_answered: 0,
        not_visited: 0,
        marked_for_review: 0,
        answered_and_marked_for_review: 0
    };

    questions.forEach((q) => {
        const response = userResponses[q.id];
        const status = response ? response.status : 'not_visited';
        counts[status] = (counts[status] || 0) + 1;
    });

    const totalAttempted = counts.answered + counts.answered_and_marked_for_review;
    const totalMarked = counts.marked_for_review + counts.answered_and_marked_for_review;

    return (
        <div className="bg-white shadow-md rounded-lg p-4 h-full flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Questions ({questions.length})</h3>

            <div className="grid grid-cols-4 gap-3 p-2 overflow-y-scroll flex-grow content-start">
                {questions.map((q, index) => {
                    const response = userResponses[q.id];
                    const status = response ? response.status : 'not_visited';
                    const isCurrent = currentQuestionIndex === index;

                    return (
                        <button
                            key={q.id}
                            onClick={() => navigateToQuestion(index)}
                            className={`w-10 h-10 rounded flex items-center justify-center font-semibold text-sm transition-all shadow-sm ${getStatusColor(status, isCurrent)}`}
                        >
                            {index + 1}
                        </button>
                    )
                })}
            </div>

            <div className="mt-4 border-t pt-3 text-xs flex flex-col gap-3">
                <div className="flex justify-between items-center px-1 border-b pb-2">
                    <span className="font-bold text-gray-700">Attempted: <span className="text-blue-600">{totalAttempted}</span></span>
                    <span className="font-bold text-gray-700">Review: <span className="text-violet-600">{totalMarked}</span></span>
                </div>
                <div className="space-y-2 px-1">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded"></div> <span>Answered</span>
                        <span className="ml-auto font-medium text-gray-600">{counts.answered}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded"></div> <span>Not Answered</span>
                        <span className="ml-auto font-medium text-gray-600">{counts.not_answered}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-white border rounded"></div> <span>Not Visited</span>
                        <span className="ml-auto font-medium text-gray-600">{counts.not_visited}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-white border border-gray-300 relative rounded after:content-['✓'] after:absolute after:-bottom-1 after:-right-1 after:bg-violet-500 after:text-white after:w-3 after:h-3 after:rounded-full after:flex after:items-center after:justify-center after:text-[8px] after:shadow-sm"></div> <span>Marked for Review</span>
                        <span className="ml-auto font-medium text-gray-600">{counts.marked_for_review + counts.answered_and_marked_for_review}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuestionPalette;
