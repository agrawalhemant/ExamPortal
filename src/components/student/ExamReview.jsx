import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, CheckCircle2, XCircle, MinusCircle, BookOpen, Trophy } from 'lucide-react';
import { generatePDF } from '../../utils/pdfGenerator';

/**
 * ExamReview — Read-only post-exam review page.
 *
 * Router state shape (passed via navigate):
 *   { exam: {...}, result: {...} }
 *
 * exam.questions[i].options  — array of option strings
 * exam.questions[i].correctAnswer — the CORRECT option string (e.g. "Paris")
 *                               OR a numeric 0-based index (legacy support)
 * result.answers — either:
 *   { "1": { selectedOption: "Paris", status: "answered" }, ... }  (1-based, string values)
 *   OR { "0": 2, "1": 0, ... }  (0-based, numeric index values)
 */
const ExamReview = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { exam, result } = location.state || {};

    if (!exam || !result) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">No review data found.</p>
                    <button
                        onClick={() => navigate('/student/dashboard')}
                        className="text-blue-600 hover:underline"
                    >
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const questions = exam.questions || [];
    const rawAnswers = result.answers || {};

    /**
     * Normalise the answers map into a consistent format:
     *   { [0-based index]: selectedOptionString | null }
     * 
     * Handles two storage formats:
     *  A. { "1": { selectedOption: "Paris" }, ... }  — 1-based, object values
     *  B. { "0": 2, "1": 0, ... }  — 0-based, numeric index values
     */
    const normalisedAnswers = useMemo(() => {
        const out = {};
        Object.entries(rawAnswers).forEach(([key, val]) => {
            const keyNum = Number(key);
            if (val && typeof val === 'object' && 'selectedOption' in val) {
                // Format A: 1-based keys
                out[keyNum - 1] = val.selectedOption ?? null;
            } else if (typeof val === 'number') {
                // Format B: 0-based keys, numeric index
                out[keyNum] = val; // leave as numeric index; we'll handle below
            } else {
                out[keyNum] = val ?? null;
            }
        });
        return out;
    }, [rawAnswers]);

    /**
     * Given a question and the normalised answer value, resolve to matching option index.
     * correctAnswer is normalised to the option string.
     */
    const resolveOption = (q, value) => {
        if (value === null || value === undefined) return null;
        const opts = q.options || [];
        if (typeof value === 'string') {
            // Match by string equality
            const idx = opts.findIndex(o => String(o).trim() === String(value).trim());
            return idx >= 0 ? idx : null;
        }
        if (typeof value === 'number') {
            return value; // already an index
        }
        return null;
    };

    const resolveCorrect = (q) => {
        const ca = q.correctAnswer;
        const opts = q.options || [];
        if (typeof ca === 'number') return ca;
        if (typeof ca === 'string') {
            const idx = opts.findIndex(o => String(o).trim() === String(ca).trim());
            return idx >= 0 ? idx : 0;
        }
        return 0;
    };

    const reviewItems = useMemo(() => {
        return questions.map((q, idx) => {
            const rawVal = normalisedAnswers[idx];
            const selectedIdx = resolveOption(q, rawVal);
            const correctIdx = resolveCorrect(q);

            const wasAnswered = selectedIdx !== null;
            const isCorrect = wasAnswered && selectedIdx === correctIdx;
            let status = 'skipped';
            if (wasAnswered) status = isCorrect ? 'correct' : 'wrong';

            return {
                question: q,
                index: idx,
                selectedIdx,
                correctIdx,
                status,
                marksPerQuestion: q.marksPerQuestion !== undefined
                    ? q.marksPerQuestion
                    : (exam.marks_per_question || 4),
            };
        });
    }, [questions, normalisedAnswers]);

    const correctCount = reviewItems.filter(i => i.status === 'correct').length;
    const wrongCount = reviewItems.filter(i => i.status === 'wrong').length;
    const skippedCount = reviewItems.filter(i => i.status === 'skipped').length;
    const totalMarks = result.total_marks ||
        reviewItems.reduce((s, i) => s + i.marksPerQuestion, 0);
    const percentage = totalMarks > 0 ? Math.round((result.score / totalMarks) * 100) : 0;

    const statusMeta = {
        correct: {
            Icon: CheckCircle2,
            badge: 'Correct',
            badgeBg: 'bg-green-100 text-green-700',
            border: 'border-green-300',
            bg: 'bg-green-50',
        },
        wrong: {
            Icon: XCircle,
            badge: 'Wrong',
            badgeBg: 'bg-red-100 text-red-700',
            border: 'border-red-300',
            bg: 'bg-red-50',
        },
        skipped: {
            Icon: MinusCircle,
            badge: 'Skipped',
            badgeBg: 'bg-gray-100 text-gray-500',
            border: 'border-gray-200',
            bg: 'bg-gray-50',
        },
    };

    const optLabel = (i) => ['A', 'B', 'C', 'D', 'E'][i] ?? String.fromCharCode(65 + i);

    return (
        <div className="h-screen overflow-y-auto bg-gray-100">
            {/* Top Bar */}
            <header className="bg-white border-b shadow-sm sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/student/dashboard')}
                        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors font-medium"
                    >
                        <ArrowLeft size={20} /> Back to Dashboard
                    </button>

                    <span className="font-bold text-gray-800 text-lg hidden sm:block truncate max-w-xs">
                        {exam.title} — Review
                    </span>

                    <button
                        onClick={() => generatePDF(questions, rawAnswers, result.score, totalMarks)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
                    >
                        <Download size={16} /> Download Report
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* Score Summary Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-blue-100 p-3 rounded-xl">
                            <Trophy className="text-blue-600 w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">{exam.title}</h2>
                            <p className="text-sm text-gray-500">Exam Review — Read Only</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                        <div className="text-center bg-blue-50 rounded-xl p-4">
                            <p className="text-2xl font-black text-blue-600">
                                {result.score}
                                <span className="text-sm font-medium text-blue-400">/{totalMarks}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Score</p>
                        </div>
                        <div className="text-center bg-green-50 rounded-xl p-4">
                            <p className="text-2xl font-black text-green-600">{correctCount}</p>
                            <p className="text-xs text-gray-500 mt-1">Correct</p>
                        </div>
                        <div className="text-center bg-red-50 rounded-xl p-4">
                            <p className="text-2xl font-black text-red-500">{wrongCount}</p>
                            <p className="text-xs text-gray-500 mt-1">Wrong</p>
                        </div>
                        <div className="text-center bg-gray-50 rounded-xl p-4">
                            <p className="text-2xl font-black text-gray-400">{skippedCount}</p>
                            <p className="text-xs text-gray-500 mt-1">Skipped</p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-5">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Score Percentage</span>
                            <span className="font-semibold">{percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                                className={`h-2.5 rounded-full transition-all ${percentage >= 70
                                    ? 'bg-green-500'
                                    : percentage >= 40
                                        ? 'bg-yellow-400'
                                        : 'bg-red-500'
                                    }`}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Questions */}
                <div className="space-y-6">
                    {reviewItems.map((item) => {
                        const meta = statusMeta[item.status];
                        const { Icon } = meta;
                        const opts = item.question.options || [];

                        return (
                            <div
                                key={item.index}
                                className={`bg-white rounded-2xl shadow-sm border-2 ${meta.border} overflow-hidden`}
                            >
                                {/* Question Header */}
                                <div className={`${meta.bg} px-6 py-4`}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <span className="bg-white text-gray-600 font-bold text-sm px-2.5 py-1 rounded-lg shadow-sm border border-gray-200 shrink-0 mt-0.5">
                                                Q{item.index + 1}
                                            </span>
                                            <p className="font-semibold text-gray-800 leading-relaxed">
                                                {item.question.question}
                                            </p>
                                        </div>
                                        <div className={`flex items-center gap-1.5 shrink-0 text-xs font-bold px-3 py-1.5 rounded-full ${meta.badgeBg}`}>
                                            <Icon size={14} />
                                            {meta.badge}
                                        </div>
                                    </div>
                                    {item.question.imageUrl && (
                                        <div className="mt-4 flex justify-center">
                                            <img
                                                src={item.question.imageUrl}
                                                alt={`Question ${item.index + 1} image`}
                                                className="max-w-full h-auto max-h-72 object-contain rounded-lg border shadow-sm"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Options */}
                                <div className="px-6 py-4 space-y-2.5">
                                    {opts.map((opt, optIdx) => {
                                        const isSelected = item.selectedIdx === optIdx;
                                        const isCorrectOpt = item.correctIdx === optIdx;

                                        let optClass = 'border-gray-200 bg-gray-50 text-gray-700';
                                        let labelClass = 'bg-gray-200 text-gray-600';
                                        let rightIcon = null;

                                        if (isCorrectOpt) {
                                            optClass = 'border-green-400 bg-green-50 text-green-800';
                                            labelClass = 'bg-green-500 text-white';
                                            rightIcon = (
                                                <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                                            );
                                        }
                                        if (isSelected && !isCorrectOpt) {
                                            optClass = 'border-red-400 bg-red-50 text-red-800';
                                            labelClass = 'bg-red-500 text-white';
                                            rightIcon = (
                                                <XCircle size={18} className="text-red-500 shrink-0" />
                                            );
                                        }

                                        return (
                                            <div
                                                key={optIdx}
                                                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 ${optClass}`}
                                            >
                                                <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold shrink-0 ${labelClass}`}>
                                                    {optLabel(optIdx)}
                                                </span>
                                                <span className="flex-1 text-sm leading-snug">{opt}</span>
                                                {rightIcon}
                                                {isSelected && isCorrectOpt && (
                                                    <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                                                )}
                                            </div>
                                        );
                                    })}

                                    {item.status === 'skipped' && (
                                        <p className="text-xs text-gray-400 italic mt-2 flex items-center gap-1.5">
                                            <MinusCircle size={13} />
                                            You did not answer this question.{' '}
                                            <span className="text-green-600 font-semibold not-italic">
                                                Correct answer: {optLabel(item.correctIdx)}
                                            </span>
                                        </p>
                                    )}
                                </div>

                                {/* Marks footer */}
                                <div className="px-6 py-2 border-t border-gray-100 text-xs text-gray-400 flex justify-end">
                                    {item.status === 'correct' ? (
                                        <span className="text-green-600 font-semibold">
                                            +{item.marksPerQuestion} marks
                                        </span>
                                    ) : item.status === 'wrong' ? (
                                        <span className="text-red-500 font-semibold">0 marks</span>
                                    ) : (
                                        <span>0 marks (skipped)</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom Actions */}
                <div className="flex flex-col sm:flex-row gap-4 mt-10 justify-between">
                    <button
                        onClick={() => navigate('/student/dashboard')}
                        className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition font-medium"
                    >
                        <ArrowLeft size={18} /> Back to Dashboard
                    </button>
                    <button
                        onClick={() => generatePDF(questions, rawAnswers, result.score, totalMarks)}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium"
                    >
                        <Download size={18} /> Download PDF Report
                    </button>
                </div>
            </main>
        </div>
    );
};

export default ExamReview;
