import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { questions as questionsData } from '../data/questions';

const ExamContext = createContext();

export const useExam = () => useContext(ExamContext);

export const ExamProvider = ({ children }) => {
    // Initialize state
    const [questions, setQuestions] = useState(questionsData);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userResponses, setUserResponses] = useState({});
    const [timeLeft, setTimeLeft] = useState(3600);
    const [isExamActive, setIsExamActive] = useState(false);
    const [examStatus, setExamStatus] = useState('instruction');
    const [violations, setViolations] = useState(0);
    const [examConfig, setExamConfig] = useState(null);

    // Initialize from LocalStorage or Default
    useEffect(() => {
        const savedConfig = localStorage.getItem('exam_config');
        if (savedConfig) {
            try {
                const parsed = JSON.parse(savedConfig);
                if (parsed.questions && parsed.questions.length > 0) {
                    setQuestions(parsed.questions);
                }
                if (parsed.meta && parsed.meta.duration) {
                    setTimeLeft(parsed.meta.duration * 60);
                }
                setExamConfig(parsed.meta);
            } catch (e) {
                console.error("Failed to load config from localStorage", e);
            }
        }
    }, []);

    // Initialize responses map when questions change
    useEffect(() => {
        const initialResponses = {};
        questions.forEach(q => {
            initialResponses[q.id] = {
                selectedOption: null,
                status: 'not_visited',
                markedForReview: false
            };
        });
        setUserResponses(initialResponses);
    }, [questions]);

    const startExam = () => {
        setExamStatus('active');
        setIsExamActive(true);
    };

    const submitExam = useCallback(() => {
        setIsExamActive(false);
        setExamStatus('submitted');
    }, []);

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
                markedForReview: false // Unmark if saving
            }
        }));

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            // Mark next as not_answered if it was not_visited
            const nextQId = questions[currentQuestionIndex + 1].id;
            setUserResponses(prev => {
                if (prev[nextQId].status === 'not_visited') {
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
            // Mark next as not_answered if it was not_visited
            const nextQId = questions[currentQuestionIndex + 1].id;
            setUserResponses(prev => {
                if (prev[nextQId].status === 'not_visited') {
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
        // Mark current as not_answered if visiting another and leaving it blank? 
        // Typically existing logic handles "visiting" = "not answered" unless saved.
        // We'll update the status of the *target* question to 'not_answered' if it was 'not_visited'

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
        startExam,
        submitExam,
        handleOptionSelect,
        saveAndNext,
        markForReview,
        clearResponse,
        navigateToQuestion,
        handleViolation
    };

    return <ExamContext.Provider value={value}>{children}</ExamContext.Provider>;
};
