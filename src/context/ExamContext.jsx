import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from './AuthContext';

const ExamContext = createContext();

export const useExam = () => useContext(ExamContext);

export const ExamProvider = ({ children }) => {
    // Initialize state
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userResponses, setUserResponses] = useState({});
    const [timeLeft, setTimeLeft] = useState(3600);
    const [isExamActive, setIsExamActive] = useState(false);
    const [examStatus, setExamStatus] = useState('instruction');
    const [violations, setViolations] = useState(0);
    const [examConfig, setExamConfig] = useState(null);
    const [activeExamId, setActiveExamId] = useState(null);
    const { user } = useAuth();

    // Initialize/Load Exam
    const loadExam = useCallback(async (examId) => {
        setActiveExamId(examId);

        // 1. Check for saved PROGRESS in localStorage (Resilience)
        const savedProgress = localStorage.getItem(`exam_progress_${examId}`);
        if (savedProgress) {
            try {
                const progress = JSON.parse(savedProgress);
                // We still need the exam definition (questions) from Supabase
                // unless we cached strictly the questions too. 
                // Let's fetch the latest exam definition to be safe.
                const { data: exam, error } = await supabase.from('exams').select('*').eq('id', examId).single();

                if (exam && !error) {
                    setQuestions(exam.questions || []);
                    setExamConfig(exam);

                    // Restore dynamic state from Sync/Local
                    setUserResponses(progress.userResponses);
                    setTimeLeft(progress.timeLeft);
                    setCurrentQuestionIndex(progress.currentQuestionIndex);
                    setViolations(progress.violations);
                    setExamStatus(progress.examStatus);
                    setIsExamActive(progress.examStatus === 'active');
                    return;
                }
            } catch (e) {
                console.error("Failed to load saved progress", e);
            }
        }

        // 2. Fresh Load from Supabase
        try {
            const { data: exam, error } = await supabase.from('exams').select('*').eq('id', examId).single();
            if (error) throw error;

            if (exam) {
                setQuestions(exam.questions || []);
                if (exam.duration) {
                    setTimeLeft(exam.duration * 60);
                }
                setExamConfig(exam);

                // Reset state
                setCurrentQuestionIndex(0);
                setIsExamActive(false);
                setExamStatus('instruction');
                setViolations(0);
                setUserResponses({});
            }
        } catch (error) {
            console.error("Error loading exam:", error);
            alert("Failed to load exam. Please try again.");
        }
    }, []);

    // Initialize responses map when questions change
    useEffect(() => {
        if (questions.length > 0 && Object.keys(userResponses).length === 0 && examStatus === 'instruction') {
            const initialResponses = {};
            questions.forEach(q => {
                initialResponses[q.id] = {
                    selectedOption: null,
                    status: 'not_visited',
                    markedForReview: false
                };
            });
            setUserResponses(initialResponses);
        }
    }, [questions, examStatus]);

    // Persistence Effect (Keep LocalStorage for crash recovery)
    useEffect(() => {
        if (activeExamId && (isExamActive || examStatus === 'submitted')) {
            const progress = {
                userResponses,
                timeLeft,
                currentQuestionIndex,
                violations,
                examStatus
            };
            localStorage.setItem(`exam_progress_${activeExamId}`, JSON.stringify(progress));
        }
    }, [userResponses, timeLeft, currentQuestionIndex, violations, examStatus, isExamActive, activeExamId]);


    const startExam = () => {
        setExamStatus('active');
        setIsExamActive(true);
    };

    const submitExam = useCallback(async () => {
        console.trace("submitExam executed!");
        setIsExamActive(false);
        setExamStatus('submitted');

        if (activeExamId && user) {
            let calculatedScore = 0;
            let correctAnswers = 0;
            let wrongAnswers = 0;
            let attempted = 0;

            questions.forEach(q => {
                const response = userResponses[q.id];
                if (response && response.selectedOption) {
                    attempted++;
                    if (response.selectedOption === q.correctAnswer) {
                        calculatedScore += (q.marksPerQuestion || examConfig?.marks_per_question || 4);
                        correctAnswers++;
                    } else {
                        calculatedScore -= (q.negativeMarks || examConfig?.negative_marks || 0);
                        wrongAnswers++;
                    }
                }
            });

            const result = {
                exam_id: activeExamId,
                student_id: user.id,
                score: calculatedScore,
                total_marks: questions.reduce((acc, q) => acc + (q.marks || examConfig?.marks_per_question || 4), 0),
                correct_answers: correctAnswers,
                wrong_answers: wrongAnswers,
                attempted: attempted,
                answers: userResponses, // Save detailed responses as JSON
                submitted_at: new Date().toISOString()
            };

            try {
                const { error } = await supabase.from('exam_results').insert([result]);
                if (error) throw error;

                // Clear local progress on successful submit
                localStorage.removeItem(`exam_progress_${activeExamId}`);
                alert("Exam submitted successfully!");
            } catch (error) {
                console.error("Error submitting exam:", error);
                alert("Failed to submit exam results to server. Your progress is saved locally. Please contact admin.");
            }
        }
    }, [activeExamId, questions, userResponses, examConfig, user]);

    // Timer logic
    useEffect(() => {
        let timer;
        if (isExamActive && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        submitExam();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isExamActive, timeLeft, submitExam]);

    const handleOptionSelect = (option) => {
        setUserResponses(prev => ({
            ...prev,
            [questions[currentQuestionIndex].id]: {
                ...prev[questions[currentQuestionIndex].id],
                selectedOption: option
            }
        }));
    };

    const saveAndNext = () => {
        const currentQId = questions[currentQuestionIndex].id;
        const currentResponse = userResponses[currentQId];

        let newStatus = 'not_answered';
        if (currentResponse.selectedOption) {
            newStatus = 'answered';
        }

        setUserResponses(prev => ({
            ...prev,
            [currentQId]: {
                ...prev[currentQId],
                status: newStatus,
                markedForReview: false
            }
        }));

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            const nextQId = questions[currentQuestionIndex + 1].id;
            setUserResponses(prev => {
                if (prev[nextQId] && prev[nextQId].status === 'not_visited') {
                    return {
                        ...prev,
                        [nextQId]: { ...prev[nextQId], status: 'not_answered' }
                    }
                }
                return prev;
            });
        }
    };

    const markForReview = () => {
        const currentQId = questions[currentQuestionIndex].id;
        const currentResponse = userResponses[currentQId];

        let newStatus = 'marked_for_review';
        if (currentResponse.selectedOption) {
            newStatus = 'answered_and_marked_for_review';
        }

        setUserResponses(prev => ({
            ...prev,
            [currentQId]: {
                ...prev[currentQId],
                status: newStatus,
                markedForReview: true
            }
        }));

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            const nextQId = questions[currentQuestionIndex + 1].id;
            setUserResponses(prev => {
                if (prev[nextQId] && prev[nextQId].status === 'not_visited') {
                    return {
                        ...prev,
                        [nextQId]: { ...prev[nextQId], status: 'not_answered' }
                    }
                }
                return prev;
            });
        }
    };

    const clearResponse = () => {
        const currentQId = questions[currentQuestionIndex].id;
        setUserResponses(prev => ({
            ...prev,
            [currentQId]: {
                ...prev[currentQId],
                selectedOption: null,
                status: 'not_answered', // Reverting to not answered
                markedForReview: false
            }
        }));
    };

    const navigateToQuestion = (index) => {
        const targetQId = questions[index].id;
        setUserResponses(prev => {
            if (prev[targetQId] && prev[targetQId].status === 'not_visited') {
                return {
                    ...prev,
                    [targetQId]: { ...prev[targetQId], status: 'not_answered' }
                }
            }
            return prev;
        });
        setCurrentQuestionIndex(index);
    }

    const handleViolation = () => {
        setViolations(prev => {
            const newCount = prev + 1;
            if (newCount >= 3) {
                alert("Maximum violations reached. Auto-submitting exam.");
                submitExam();
            } else {
                alert(`Warning: Tab switching is not allowed! Violation ${newCount}/3`);
            }
            return newCount;
        })
    }

    const value = {
        questions,
        currentQuestionIndex,
        userResponses,
        timeLeft,
        isExamActive,
        examStatus,
        violations,
        activeExamId,
        startExam,
        submitExam,
        handleOptionSelect,
        saveAndNext,
        markForReview,
        clearResponse,
        navigateToQuestion,
        handleViolation,
        loadExam
    };

    return <ExamContext.Provider value={value}>{children}</ExamContext.Provider>;
};
