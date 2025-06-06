import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LoadingIndicator = () => {
    const [progress, setProgress] = useState(0);
    const [phase, setPhase] = useState(0);

    useEffect(() => {
        // Simulate loading progress
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    return 0; // Reset for demo
                }
                return prev + Math.random() * 15;
            });
        }, 300);

        // Phase animation cycle
        const phaseInterval = setInterval(() => {
            setPhase((prev) => (prev + 1) % 4);
        }, 2000);

        return () => {
            clearInterval(progressInterval);
            clearInterval(phaseInterval);
        };
    }, []);

    const phases = [
        {
            colors: 'from-violet-600 via-purple-600 to-pink-600',
            text: 'กำลังเตรียมความพร้อม...'
        },
        {
            colors: 'from-blue-600 via-cyan-500 to-teal-500',
            text: 'กำลังประมวลผล...'
        },
        {
            colors: 'from-orange-500 via-red-500 to-pink-600',
            text: 'เกือบเสร็จแล้ว...'
        },
        {
            colors: 'from-green-500 via-emerald-500 to-blue-500',
            text: 'กำลังโหลด...'
        },
    ];

    const currentPhase = phases[phase];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">

            {/* Floating Particles */}
            <div className="absolute inset-0">
                {Array.from({ length: 12 }).map((_, i) => (
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
            </div>

            {/* Main Loading Container */}
            <div className="relative z-10 text-center">

                {/* Main Spinner */}
                <div className="relative mb-8">
                    <motion.div
                        className={`w-32 h-32 rounded-full bg-gradient-to-r ${currentPhase.colors} p-1`}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                        <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">

                            {/* Pulsing Core */}
                            <motion.div
                                className={`w-16 h-16 rounded-full bg-gradient-to-r ${currentPhase.colors}`}
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.8, 1, 0.8]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            />

                            {/* Orbiting Dots */}
                            <motion.div
                                className="absolute w-3 h-3 bg-white rounded-full shadow-lg"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                style={{ originX: 0.5, originY: -2.5 }}
                            />

                            <motion.div
                                className="absolute w-2 h-2 bg-cyan-400 rounded-full shadow-lg"
                                animate={{ rotate: -360 }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                style={{ originX: 0.5, originY: 2.5 }}
                            />

                        </div>
                    </motion.div>
                </div>

                {/* Progress Bar */}
                <div className="w-80 h-2 bg-slate-800 rounded-full mb-6 overflow-hidden shadow-inner relative">
                    <motion.div
                        className={`h-full bg-gradient-to-r ${currentPhase.colors} rounded-full relative`}
                        initial={{ width: "0%" }}
                        animate={{ width: `${Math.min(progress, 100)}%` }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        <motion.div
                            className="absolute inset-0 bg-white rounded-full"
                            animate={{
                                opacity: [0.3, 0.6, 0.3]
                            }}
                            transition={{
                                duration: 1,
                                repeat: Infinity
                            }}
                        />
                        <motion.div
                            className="absolute right-0 top-0 w-4 h-full bg-white blur-sm"
                            animate={{
                                opacity: [0.5, 1, 0.5]
                            }}
                            transition={{
                                duration: 0.8,
                                repeat: Infinity
                            }}
                        />
                    </motion.div>
                </div>

                {/* Dynamic Text */}
                <AnimatePresence mode="wait">
                    <motion.h2
                        key={phase}
                        className={`text-2xl font-bold bg-gradient-to-r ${currentPhase.colors} bg-clip-text text-transparent mb-4`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                    >
                        {currentPhase.text}
                    </motion.h2>
                </AnimatePresence>

                {/* Percentage */}
                <motion.div
                    className="text-4xl font-bold text-white mb-6 font-mono"
                    key={Math.floor(progress / 10)} // Re-trigger animation every 10%
                    initial={{ scale: 1.2, opacity: 0.8 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                >
                    {Math.round(Math.min(progress, 100))}%
                </motion.div>

                {/* Bouncing Dots */}
                <div className="flex justify-center space-x-4 mb-8">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <motion.div
                            key={i}
                            className={`w-3 h-3 rounded-full bg-gradient-to-r ${currentPhase.colors}`}
                            animate={{
                                y: [0, -20, 0],
                                opacity: [0.7, 1, 0.7]
                            }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: i * 0.1,
                                ease: "easeInOut"
                            }}
                        />
                    ))}
                </div>

                {/* Status Indicators */}
                <div className="flex justify-center space-x-6 text-sm text-slate-400">
                    {[
                        { threshold: 20, label: 'เชื่อมต่อ', color: 'bg-green-400' },
                        { threshold: 50, label: 'ประมวลผล', color: 'bg-yellow-400' },
                        { threshold: 80, label: 'เสร็จสิ้น', color: 'bg-blue-400' }
                    ].map((status, i) => (
                        <div key={i} className="flex items-center space-x-2">
                            <motion.div
                                className={`w-2 h-2 rounded-full ${progress > status.threshold ? status.color : 'bg-slate-600'}`}
                                animate={progress > status.threshold ? {
                                    scale: [1, 1.3, 1],
                                    opacity: [0.8, 1, 0.8]
                                } : {}}
                                transition={{
                                    duration: 1,
                                    repeat: Infinity
                                }}
                            />
                            <span>{status.label}</span>
                        </div>
                    ))}
                </div>

                {/* Ripple Effect */}
                <motion.div
                    className="absolute -inset-4 opacity-30 -z-10"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.1, 0.3]
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                >
                    <div className={`w-full h-full rounded-full bg-gradient-to-r ${currentPhase.colors}`} />
                </motion.div>
            </div>

            {/* Corner Decorations */}
            <motion.div
                className="absolute top-10 left-10"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
                <div className={`w-20 h-20 border-2 border-opacity-20 border-white rounded-full`} />
            </motion.div>

            <motion.div
                className="absolute bottom-10 right-10"
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                <div className={`w-16 h-16 border border-opacity-30 border-white rounded-full`} />
            </motion.div>

        </div>
    );
};

export default LoadingIndicator;