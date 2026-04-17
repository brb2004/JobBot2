import React from 'react';

interface StepWizardProps {
  step: number;
}

const StepWizard: React.FC<StepWizardProps> = ({ step }) => {
  const steps = ['Resume', 'Weights', 'Finalize'];
  
  return (
    <div className="mb-8">
      <div className="flex justify-between mb-2">
        {steps.map((label, index) => (
          <span 
            key={label} 
            className={`text-sm font-medium ${step === index + 1 ? 'text-blue-600' : 'text-gray-400'}`}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
        <div 
          className="bg-blue-600 h-full transition-all duration-300" 
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default StepWizard;
