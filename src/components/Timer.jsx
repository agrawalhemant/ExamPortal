import React from 'react';
import { useExam } from '../context/ExamContext';
import { Clock } from 'lucide-react';

const Timer = () => {
    const { timeLeft } = useExam();

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg font-mono text-xl shadow-lg">
            <Clock size={20} className="text-yellow-400" />
            <span>{formatTime(timeLeft)}</span>
        </div>
    );
};

export default Timer;
