import React, { useEffect } from 'react';
import { FullScreen, useFullScreenHandle } from "react-full-screen";
import { useExam } from '../context/ExamContext';

const Proctoring = ({ children }) => {
    const handle = useFullScreenHandle();
    const { handleViolation, isExamActive, examStatus } = useExam();

    useEffect(() => {
        if (isExamActive && !handle.active) {
            // Ideally we force it, but browsers block programmatic full-screen without user interaction.
            // We can prompt the user or just rely on the initial entry.
            // specific requirements say "Force Full-Screen mode"
        }
    }, [isExamActive, handle.active]);

    // Enter full screen when exam starts
    useEffect(() => {
        if (isExamActive) {
            handle.enter().catch(err => console.warn("Could not enter full screen", err));
        }
    }, [isExamActive]); // trigger when exam becomes active

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && isExamActive) {
                handleViolation();
            }
        };

        const handleContextMenu = (e) => {
            if (isExamActive) {
                e.preventDefault();
            }
        }

        document.addEventListener("visibilitychange", handleVisibilityChange);
        document.addEventListener("contextmenu", handleContextMenu);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            document.removeEventListener("contextmenu", handleContextMenu);
        };
    }, [isExamActive, handleViolation]);

    return (
        <FullScreen handle={handle}>
            <div className="h-full w-full bg-gray-100">
                {children}
            </div>
        </FullScreen>
    );
};

export default Proctoring;
