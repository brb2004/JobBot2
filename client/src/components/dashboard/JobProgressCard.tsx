import React from 'react';
import { XCircle, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useJobStream, JobStatus } from '../../hooks/useJobStream';
import { apiFetch } from '../../lib/api';
import { useStore } from '../../store/useStore';

interface JobProgressCardProps {
  jobId: string;
}

const statusIcons: Record<JobStatus, React.ReactNode> = {
  idle: <Loader2 className="w-4 h-4 animate-spin text-slate-400" />,
  streaming: <Loader2 className="w-4 h-4 animate-spin text-blue-500" />,
  completed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  failed: <AlertCircle className="w-4 h-4 text-red-500" />,
};

const statusColors: Record<JobStatus, string> = {
  idle: 'bg-slate-200',
  streaming: 'bg-blue-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
};

export const JobProgressCard = ({ jobId }: JobProgressCardProps) => {
  const { progress, status, error } = useJobStream(jobId);
  const removeJob = useStore((state) => state.removeJob);

  const handleCancel = async () => {
    try {
      await apiFetch(`/api/agents/job/${jobId}`, { method: 'DELETE' });
      removeJob(jobId);
    } catch (error) {
      console.error('Error cancelling job:', error);
      alert('Failed to cancel job.');
    }
  };

  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {statusIcons[status]}
          <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">
            Job {jobId.slice(0, 8)}...
          </span>
        </div>
        <button
          onClick={handleCancel}
          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
          title="Cancel Job"
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${statusColors[status]}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-500 font-medium">
          {error}
        </div>
      )}
    </div>
  );
};
