import React, { useState, useEffect } from 'react';
import { useExam } from '../context/ExamContext';

const QuestionArea = () => {
    const { questions, currentQuestionIndex, userResponses, saveAndNext, markForReview } = useExam();
    const currentQuestion = questions[currentQuestionIndex];
    const currentResponse = userResponses[currentQuestion.id];

    // Local draft state for the current question
    const [localSelection, setLocalSelection] = useState(currentResponse?.selectedOption || null);

    // Sync draft state with officially saved state when navigating between questions
    useEffect(() => {
        setLocalSelection(userResponses[currentQuestion.id]?.selectedOption || null);
    }, [currentQuestionIndex, userResponses, currentQuestion.id]);

    const handleClearResponse = () => {
        setLocalSelection(null);
    };

    return (
        <div className="flex flex-col h-full bg-white shadow-md rounded-lg p-6 overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
                <h2 className="text-xl font-bold text-gray-800">Question {currentQuestionIndex + 1}</h2>
                <span className="text-sm font-semibold text-green-600">+{currentQuestion.marksPerQuestion} Marks</span>
                <span className="text-sm font-semibold text-red-500">-{currentQuestion.negativeMarks} Negative Marks</span>
            </div>

            <div className="flex-grow">
                <p className="text-lg text-gray-700 mb-6">{currentQuestion.question}</p>
                <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => (
                        <label
                            key={index}
                            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${localSelection === option
                                ? 'bg-blue-50 border-blue-500'
                                : 'hover:bg-gray-50 border-gray-200'
                                }`}
                        >
                            <input
                                type="radio"
                                name={`question-${currentQuestion.id}`}
                                value={option}
                                checked={localSelection === option}
                                onChange={() => setLocalSelection(option)}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="ml-3 text-gray-700">{option}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="mt-8 flex justify-between items-center border-t pt-4">
                <div className="space-x-2">
                    <button
                        onClick={markForReview}
                        className={`px-4 py-2 text-white rounded transition-colors ${currentResponse?.markedForReview ? 'bg-orange-500 hover:bg-orange-600' : 'bg-violet-600 hover:bg-violet-700'}`}
                    >
                        {currentResponse?.markedForReview ? 'Unmark for Review' : 'Mark for Review'}
                    </button>
                    <button
                        onClick={handleClearResponse}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                    >
                        Clear Response
                    </button>
                </div>

                <button
                    onClick={() => saveAndNext(localSelection)}
                    className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                    {currentQuestionIndex === questions.length - 1 ? 'Save' : 'Save & Next'}
                </button>
            </div>
        </div>
    );
};

export default QuestionArea;
