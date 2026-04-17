import React, { useEffect, useState } from 'react';
import { ExternalLink, History } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { Link } from 'react-router-dom';

interface Evaluation {
  id: string;
  url: string;
  score: number;
  timestamp: string;
}

export const RecentEvals = () => {
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvals = async () => {
      try {
        const data = await apiFetch<Evaluation[]>('/api/tracker');
        setEvals(data);
      } catch (error) {
        console.error('Error fetching recent evaluations:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvals();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (evals.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No recent evaluations found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-slate-900 font-semibold mb-4">
        <History className="w-5 h-5 text-slate-500" />
        <h3>Recent Evaluations</h3>
      </div>
      <div className="grid gap-3">
        {evals.map((evalItem) => (
          <Link
            key={evalItem.id}
            to={`/eval/${evalItem.id}`}
            className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-all group shadow-sm"
          >
            <div className="flex flex-col gap-1 overflow-hidden">
              <span className="text-sm font-medium text-slate-900 truncate">
                {evalItem.url}
              </span>
              <span className="text-xs text-slate-500">
                {new Date(evalItem.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-sm font-bold ${evalItem.score > 70 ? 'text-green-600' : 'text-slate-600'}`}>
                {evalItem.score}%
              </span>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};