import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LoadingIndicator = () => {
    const [progress, setProgress] = useState(0);
    const [phase, setPhase] = useState(0);

    useEffect(() => {
        const progressTimer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) return 100;
                const increment = prev > 90 ? Math.random() * 2 : Math.random() * 8;
                return Math.min(prev + increment, 100);
            });
        }, 200);

        const phaseTimer = setInterval(() => {
            setPhase(prev => (prev + 1) % 4);
        }, 2000);

        return () => {
            clearInterval(progressTimer);
            clearInterval(phaseTimer);
        };
    }, []);

    const phases = [
        { colors: 'from-violet-600 to-pink-600', text: 'กำลังเตรียมความพร้อม...' },
        { colors: 'from-blue-600 to-teal-500', text: 'กำลังประมวลผล...' },
        { colors: 'from-orange-500 to-pink-600', text: 'เกือบเสร็จแล้ว...' },
        { colors: 'from-green-500 to-emerald-400', text: 'เสร็จเรียบร้อย!' }
    ];

    const currentPhase = phases[phase];

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 transition-opacity duration-1000 ${progress >= 100 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>

            {/* Floating Particles */}
            {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-white"
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                        opacity: [0.2, 0.8, 0.2],
                        scale: [1, 1.5, 1],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                    }}
                />
            ))}

            {/* Main Content */}
            <div className="text-center">

                {/* Spinner */}
                <div className="relative mb-6">
                    <motion.div
                        className={`w-24 h-24 rounded-full bg-gradient-to-r ${currentPhase.colors} p-1`}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                        <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                            <motion.div
                                className={`w-12 h-12 rounded-full bg-gradient-to-r ${currentPhase.colors}`}
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.8, 1, 0.8]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                }}
                            />
                        </div>
                    </motion.div>
                </div>

                {/* Progress Bar */}
                <div className="w-64 h-2 bg-slate-800 rounded-full mb-4 overflow-hidden">
                    <motion.div
                        className={`h-full bg-gradient-to-r ${currentPhase.colors} rounded-full`}
                        animate={{ width: `${Math.min(progress, 100)}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>

                {/* Text & Percentage */}
                <AnimatePresence mode="wait">
                    <motion.h2
                        key={phase}
                        className={`text-xl font-bold bg-gradient-to-r ${currentPhase.colors} bg-clip-text text-transparent mb-2`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.5 }}
                    >
                        {currentPhase.text}
                    </motion.h2>
                </AnimatePresence>

                <div className={`text-2xl font-bold text-white mb-4 ${progress >= 100 ? 'text-green-400' : ''}`}>
                    {Math.round(Math.min(progress, 100))}%
                </div>

                {/* Bouncing Dots */}
                <div className="flex justify-center space-x-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <motion.div
                            key={i}
                            className={`w-2 h-2 rounded-full bg-gradient-to-r ${currentPhase.colors}`}
                            animate={{
                                y: [0, -10, 0],
                            }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: i * 0.2,
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LoadingIndicator;