import React, { useState, useEffect } from 'react';

const LoadingIndicator: React.FC = () => {
    const [progress, setProgress] = useState(0);
    const [phase, setPhase] = useState(0);
    const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, delay: number}>>([]);

    useEffect(() => {
        // Simulate loading progress
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    return 0; // Reset for demo
                }
                return prev + Math.random() * 15;
            });
        }, 300);

        // Phase animation cycle
        const phaseInterval = setInterval(() => {
            setPhase(prev => (prev + 1) % 4);
        }, 2000);

        // Generate floating particles
        const particleArray = Array.from({length: 12}, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            delay: Math.random() * 2
        }));
        setParticles(particleArray);

        return () => {
            clearInterval(progressInterval);
            clearInterval(phaseInterval);
        };
    }, []);

    const getPhaseColors = () => {
        const phases = [
            'from-violet-600 via-purple-600 to-pink-600',
            'from-blue-600 via-cyan-500 to-teal-500',
            'from-orange-500 via-red-500 to-pink-600',
            'from-green-500 via-emerald-500 to-blue-500'
        ];
        return phases[phase];
    };

    const getPhaseText = () => {
        const texts = ['กำลังเตรียมความพร้อม...', 'กำลังประมวลผล...', 'เกือบเสร็จแล้ว...', 'กำลังโหลด...'];
        return texts[phase];
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">

            {/* Animated background particles */}
            <div className="absolute inset-0">
                {particles.map(particle => (
                    <div
                        key={particle.id}
                        className="absolute w-1 h-1 rounded-full bg-white opacity-20 animate-pulse"
                        style={{
                            left: `${particle.x}%`,
                            top: `${particle.y}%`,
                            animationDelay: `${particle.delay}s`,
                            animationDuration: '3s'
                        }}
                    />
                ))}
            </div>

            {/* Main loading container */}
            <div className="relative z-10 text-center">

                {/* Outer glow ring */}
                <div className="relative mb-8">
                    <div className={`w-32 h-32 rounded-full bg-gradient-to-r ${getPhaseColors()} p-1 animate-spin`} style={{animationDuration: '3s'}}>
                        <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">

                            {/* Inner animated elements */}
                            <div className="relative">
                                {/* Pulsing core */}
                                <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${getPhaseColors()} animate-pulse opacity-80`}></div>

                                {/* Orbiting dots */}
                                <div className="absolute inset-0 animate-spin" style={{animationDuration: '2s'}}>
                                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg"></div>
                                </div>
                                <div className="absolute inset-0 animate-spin" style={{animationDuration: '1.5s', animationDirection: 'reverse'}}>
                                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-cyan-400 rounded-full shadow-lg"></div>
                                </div>

                                {/* DNA helix effect */}
                                <div className="absolute inset-0">
                                    {Array.from({length: 8}).map((_, i) => (
                                        <div
                                            key={i}
                                            className="absolute w-1 h-1 bg-gradient-to-r from-pink-400 to-cyan-400 rounded-full animate-ping"
                                            style={{
                                                left: '50%',
                                                top: '50%',
                                                transform: `rotate(${i * 45}deg) translateX(20px)`,
                                                animationDelay: `${i * 0.2}s`,
                                                animationDuration: '2s'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="w-80 h-2 bg-slate-800 rounded-full mb-6 overflow-hidden shadow-inner">
                    <div
                        className={`h-full bg-gradient-to-r ${getPhaseColors()} rounded-full transition-all duration-300 relative`}
                        style={{width: `${Math.min(progress, 100)}%`}}
                    >
                        <div className="absolute inset-0 bg-white opacity-30 animate-pulse"></div>
                        <div className="absolute right-0 top-0 w-4 h-full bg-white opacity-50 blur-sm"></div>
                    </div>
                </div>

                {/* Dynamic text */}
                <h2 className={`text-2xl font-bold bg-gradient-to-r ${getPhaseColors()} bg-clip-text text-transparent mb-4 animate-pulse`}>
                    {getPhaseText()}
                </h2>

                {/* Percentage */}
                <div className="text-4xl font-bold text-white mb-6 font-mono">
                    {Math.round(Math.min(progress, 100))}%
                </div>

                {/* Floating elements */}
                <div className="flex justify-center space-x-4 mb-8">
                    {Array.from({length: 5}).map((_, i) => (
                        <div
                            key={i}
                            className={`w-3 h-3 rounded-full bg-gradient-to-r ${getPhaseColors()} animate-bounce opacity-70`}
                            style={{
                                animationDelay: `${i * 0.1}s`,
                                animationDuration: '1s'
                            }}
                        />
                    ))}
                </div>

                {/* Status indicators */}
                <div className="flex justify-center space-x-6 text-sm text-slate-400">
                    <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${progress > 20 ? 'bg-green-400' : 'bg-slate-600'} animate-pulse`}></div>
                        <span>เชื่อมต่อ</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${progress > 50 ? 'bg-yellow-400' : 'bg-slate-600'} animate-pulse`}></div>
                        <span>ประมวลผล</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${progress > 80 ? 'bg-blue-400' : 'bg-slate-600'} animate-pulse`}></div>
                        <span>เสร็จสิ้น</span>
                    </div>
                </div>

                {/* Ripple effect */}
                <div className="absolute -inset-4 opacity-30">
                    <div className={`w-full h-full rounded-full bg-gradient-to-r ${getPhaseColors()} animate-ping`} style={{animationDuration: '3s'}}></div>
                </div>

            </div>

            {/* Corner decorations */}
            <div className="absolute top-10 left-10">
                <div className={`w-20 h-20 border-2 border-gradient-to-r ${getPhaseColors()} rounded-full animate-spin opacity-20`} style={{animationDuration: '8s'}}></div>
            </div>
            <div className="absolute bottom-10 right-10">
                <div className={`w-16 h-16 border border-gradient-to-r ${getPhaseColors()} rounded-full animate-pulse opacity-30`}></div>
            </div>

            {/* Grid overlay */}
            <div className="absolute inset-0 opacity-5">
                <div className="w-full h-full" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '50px 50px'
                }}></div>
            </div>

        </div>
    );
};

export default LoadingIndicator;