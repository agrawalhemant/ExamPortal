import React, { useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, CheckCircle2, XCircle, MinusCircle, Trophy } from 'lucide-react';
import { generatePDF } from '../../utils/pdfGenerator';

const ExamReview = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { exam, result } = location.state || {};
    const questionRefs = useRef([]);

    if (!exam || !result) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">No review data found.</p>
                    <button onClick={() => navigate('/student/dashboard')} className="text-blue-600 hover:underline">
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const questions = exam.questions || [];
    const rawAnswers = result.answers || {};

    // Normalise answers into { [0-based index]: selectedOptionString | null }
    // Handles: { "1": { selectedOption: "Paris" } }  OR  { "0": 2 } (numeric index)
    const normalisedAnswers = useMemo(() => {
        const out = {};
        Object.entries(rawAnswers).forEach(([key, val]) => {
            const keyNum = Number(key);
            if (val && typeof val === 'object' && 'selectedOption' in val) {
                out[keyNum - 1] = val.selectedOption ?? null; // 1-based → 0-based
            } else {
                out[keyNum] = val ?? null;
            }
        });
        return out;
    }, [rawAnswers]);

    const resolveOption = (q, value) => {
        if (value === null || value === undefined) return null;
        const opts = q.options || [];
        if (typeof value === 'string') {
            const idx = opts.findIndex(o => String(o).trim() === String(value).trim());
            return idx >= 0 ? idx : null;
        }
        return typeof value === 'number' ? value : null;
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
            const status = !wasAnswered ? 'skipped' : isCorrect ? 'correct' : 'wrong';
            return {
                question: q,
                index: idx,
                selectedIdx,
                correctIdx,
                status,
                marksPerQuestion: q.marksPerQuestion !== undefined ? q.marksPerQuestion : (exam.marks_per_question || 4),
            };
        });
    }, [questions, normalisedAnswers]);

    const correctCount = reviewItems.filter(i => i.status === 'correct').length;
    const wrongCount = reviewItems.filter(i => i.status === 'wrong').length;
    const skippedCount = reviewItems.filter(i => i.status === 'skipped').length;
    const totalMarks = result.total_marks || reviewItems.reduce((s, i) => s + i.marksPerQuestion, 0);
    const percentage = totalMarks > 0 ? Math.round((result.score / totalMarks) * 100) : 0;

    const scrollToQuestion = (idx) => {
        questionRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const statusColors = {
        correct: 'bg-green-500 text-white',
        wrong: 'bg-red-500 text-white',
        skipped: 'bg-gray-200 text-gray-600',
    };

    const cardMeta = {
        correct: { border: 'border-green-300', headerBg: 'bg-green-50', badge: 'bg-green-100 text-green-700', Icon: CheckCircle2 },
        wrong: { border: 'border-red-300', headerBg: 'bg-red-50', badge: 'bg-red-100 text-red-700', Icon: XCircle },
        skipped: { border: 'border-gray-200', headerBg: 'bg-gray-50', badge: 'bg-gray-100 text-gray-500', Icon: MinusCircle },
    };

    const optLabel = (i) => ['A', 'B', 'C', 'D', 'E'][i] ?? String.fromCharCode(65 + i);

    return (
        <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">

            {/* ── Top Bar ── */}
            <header className="bg-white border-b shadow-sm shrink-0">
                <div className="px-6 py-3 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/student/dashboard')}
                        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium transition-colors"
                    >
                        <ArrowLeft size={20} /> Back to Dashboard
                    </button>
                    <span className="font-bold text-gray-800 text-lg truncate hidden sm:block">
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

            {/* ── Body: Questions (left) + Sidebar (right) ── */}
            <div className="flex flex-1 overflow-hidden">

                {/* ── LEFT: Question List (scrollable) ── */}
                <main className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                    {reviewItems.map((item) => {
                        const meta = cardMeta[item.status];
                        const { Icon } = meta;
                        const opts = item.question.options || [];

                        return (
                            <div
                                key={item.index}
                                ref={el => questionRefs.current[item.index] = el}
                                className={`bg-white rounded-2xl border-2 ${meta.border} overflow-hidden shadow-sm`}
                            >
                                {/* Question Header */}
                                <div className={`${meta.headerBg} px-5 py-4`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <span className="bg-white text-gray-600 text-sm font-bold px-2.5 py-1 rounded-lg border border-gray-200 shadow-sm shrink-0 mt-0.5">
                                                Q{item.index + 1}
                                            </span>
                                            <p className="font-semibold text-gray-800 leading-relaxed">
                                                {item.question.question}
                                            </p>
                                        </div>
                                        <span className={`flex items-center gap-1.5 shrink-0 text-xs font-bold px-3 py-1.5 rounded-full ${meta.badge}`}>
                                            <Icon size={13} /> {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                        </span>
                                    </div>

                                    {/* Question Image */}
                                    {item.question.imageUrl && (
                                        <div className="mt-4 flex justify-start">
                                            <img
                                                src={item.question.imageUrl}
                                                alt={`Q${item.index + 1}`}
                                                className="max-w-sm h-auto max-h-64 object-contain rounded-lg border shadow-sm"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Options */}
                                <div className="px-5 py-4 space-y-2">
                                    {opts.map((opt, optIdx) => {
                                        const isSelected = item.selectedIdx === optIdx;
                                        const isCorrectOpt = item.correctIdx === optIdx;

                                        let rowCls = 'border-gray-200 bg-gray-50 text-gray-700';
                                        let lblCls = 'bg-gray-200 text-gray-600';
                                        let icon = null;

                                        if (isCorrectOpt) {
                                            rowCls = 'border-green-400 bg-green-50 text-green-800';
                                            lblCls = 'bg-green-500 text-white';
                                            icon = <CheckCircle2 size={17} className="text-green-600 shrink-0" />;
                                        }
                                        if (isSelected && !isCorrectOpt) {
                                            rowCls = 'border-red-400 bg-red-50 text-red-800';
                                            lblCls = 'bg-red-500 text-white';
                                            icon = <XCircle size={17} className="text-red-500 shrink-0" />;
                                        }
                                        if (isSelected && isCorrectOpt) {
                                            icon = <CheckCircle2 size={17} className="text-green-600 shrink-0" />;
                                        }

                                        return (
                                            <div key={optIdx} className={`flex items-center gap-3 rounded-xl border-2 px-4 py-2.5 ${rowCls}`}>
                                                <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold shrink-0 ${lblCls}`}>
                                                    {optLabel(optIdx)}
                                                </span>
                                                <span className="flex-1 text-sm">{opt}</span>
                                                {icon}
                                            </div>
                                        );
                                    })}

                                    {item.status === 'skipped' && (
                                        <p className="text-xs text-gray-400 italic mt-2 flex items-center gap-1.5">
                                            <MinusCircle size={12} />
                                            Not answered.{' '}
                                            <span className="text-green-600 font-semibold not-italic">
                                                Correct: {optLabel(item.correctIdx)}
                                            </span>
                                        </p>
                                    )}
                                </div>

                                {/* Marks footer */}
                                <div className="px-5 py-2 border-t border-gray-100 text-xs flex justify-end">
                                    {item.status === 'correct'
                                        ? <span className="text-green-600 font-semibold">+{item.marksPerQuestion} marks</span>
                                        : item.status === 'wrong'
                                            ? <span className="text-red-500 font-semibold">0 marks</span>
                                            : <span className="text-gray-400">0 marks (skipped)</span>
                                    }
                                </div>
                            </div>
                        );
                    })}

                    {/* Bottom action */}
                    <div className="pb-6 flex justify-start">
                        <button
                            onClick={() => navigate('/student/dashboard')}
                            className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition font-medium text-sm"
                        >
                            <ArrowLeft size={16} /> Back to Dashboard
                        </button>
                    </div>
                </main>

                {/* ── RIGHT SIDEBAR (sticky) ── */}
                <aside className="w-72 shrink-0 border-l bg-white overflow-y-auto flex flex-col gap-4 px-4 py-5">

                    {/* Score Summary */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Trophy size={16} className="text-blue-600" />
                            <h3 className="font-bold text-gray-700 text-sm">Score Summary</h3>
                        </div>

                        <div className="bg-blue-50 rounded-xl px-4 py-3 mb-3 text-center">
                            <p className="text-3xl font-black text-blue-600">
                                {result.score}
                                <span className="text-base font-semibold text-blue-400">/{totalMarks}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">{percentage}% score</p>
                            <div className="mt-2 w-full bg-blue-100 rounded-full h-1.5">
                                <div
                                    className={`h-1.5 rounded-full ${percentage >= 70 ? 'bg-green-500' : percentage >= 40 ? 'bg-yellow-400' : 'bg-red-500'}`}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="bg-green-50 rounded-lg py-2">
                                <p className="text-lg font-black text-green-600">{correctCount}</p>
                                <p className="text-gray-500">Correct</p>
                            </div>
                            <div className="bg-red-50 rounded-lg py-2">
                                <p className="text-lg font-black text-red-500">{wrongCount}</p>
                                <p className="text-gray-500">Wrong</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg py-2">
                                <p className="text-lg font-black text-gray-400">{skippedCount}</p>
                                <p className="text-gray-500">Skipped</p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h3 className="font-bold text-gray-700 text-sm mb-3">Jump to Question</h3>
                        <div className="grid grid-cols-5 gap-1.5">
                            {reviewItems.map((item) => (
                                <button
                                    key={item.index}
                                    onClick={() => scrollToQuestion(item.index)}
                                    title={`Q${item.index + 1} — ${item.status}`}
                                    className={`w-full aspect-square flex items-center justify-center text-xs font-bold rounded-lg transition hover:opacity-80 ${statusColors[item.status]}`}
                                >
                                    {item.index + 1}
                                </button>
                            ))}
                        </div>

                        {/* Legend */}
                        <div className="mt-4 space-y-1.5 text-xs text-gray-500">
                            <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded bg-green-500 inline-block shrink-0" />
                                Correct
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded bg-red-500 inline-block shrink-0" />
                                Wrong
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded bg-gray-200 inline-block shrink-0" />
                                Skipped
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default ExamReview;
