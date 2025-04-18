
import React from 'react';

interface StepIndicatorProps {
    currentStep: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => (
    <div className="flex justify-center mb-6 space-x-4">
        {['Article', 'Download', 'Summary'].map((_, index) => (
            <div
                key={index}
                className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                    currentStep === index + 1 ? 'bg-primary text-white border-primary' : 'bg-base-100 text-gray-600'
                }`}
            >
                {index + 1}
            </div>
        ))}
    </div>
);

export default StepIndicator;