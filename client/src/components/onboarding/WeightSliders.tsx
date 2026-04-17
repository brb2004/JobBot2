import React from 'react';

interface WeightSlidersProps {
  weights: {
    [key: string]: number;
  };
  setWeights: (weights: WeightSlidersProps['weights']) => void;
}

const WeightSliders: React.FC<WeightSlidersProps> = ({ weights, setWeights }) => {
  const items = [
    { key: 'role_match', label: 'Role Match', desc: 'How well your title and experience match the role' },
    { key: 'skills_alignment', label: 'Skills Alignment', desc: 'Overlap between your skills and job requirements' },
    { key: 'seniority', label: 'Seniority', desc: 'Alignment with the required level of experience' },
    { key: 'compensation', label: 'Compensation', desc: 'Match between your expectations and the role budget' },
    { key: 'interview_likelihood', label: 'Interview Likelihood', desc: 'Probability of getting an interview based on profile' },
    { key: 'company_stage', label: 'Company Stage', desc: 'Alignment with company size and growth phase' },
    { key: 'product_market_fit', label: 'Product-Market Fit', desc: 'Confidence in the company\'s product and market' },
    { key: 'geographic_feasibility', label: 'Geographic Feasibility', desc: 'Alignment with location and remote policies' },
    { key: 'growth_trajectory', label: 'Growth Trajectory', desc: 'Potential for career growth within the company' },
    { key: 'hiring_timeline', label: 'Hiring Timeline', desc: 'Alignment with your availability and their urgency' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Priority Weights</h2>
        <p className="text-gray-600">How should we weigh the match dimensions? Total doesn't need to be 100, we will normalize them.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        {items.map((item) => (
          <div key={item.key} className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="font-medium text-gray-700">{item.label}</label>
              <span className="text-sm text-blue-600 font-bold">{weights[item.key] || 0}%</span>
            </div>
            <p className="text-xs text-gray-500">{item.desc}</p>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={weights[item.key] || 0}
              onChange={(e) => setWeights({ ...weights, [item.key]: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeightSliders;
