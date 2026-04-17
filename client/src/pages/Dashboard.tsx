import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { apiFetch } from '../lib/api';
import { useStore } from '../store/useStore';
import { useJobStream } from '../hooks/useJobStream';

type JobStatus = 'idle' | 'streaming' | 'completed' | 'failed';

interface EvalSummary {
  id: string;
  url: string;
  company: string | null;
  role: string | null;
  score: number | null;
  grade: string | null;
  status: string;
  created_at: string;
}

interface TrackerResponse {
  items: EvalSummary[];
  total: number;
  page: number;
}

// Job card with real-time SSE progress
function JobCard({ jobId, onDone }: { jobId: string; onDone: () => void }) {
  const { progress, status, error } = useJobStream(jobId);
  const removeJob = useStore((s) => s.removeJob);

  const statusLabel: Record<JobStatus, string> = {
    idle: 'Queued',
    streaming: 'Processing',
    completed: 'Complete',
    failed: 'Failed',
  };

  useEffect(() => {
    if (status === 'completed') {
      setTimeout(() => {
        removeJob(jobId);
        onDone();
      }, 2000);
    }
  }, [status]);

  return (
    <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {status === 'streaming' || status === 'idle' ? (
            <div className="w-2 h-2 rounded-full bg-on-tertiary-container animate-pulse" />
          ) : status === 'completed' ? (
            <span className="material-symbols-outlined text-on-tertiary-container text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          ) : (
            <span className="material-symbols-outlined text-error text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
          )}
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{statusLabel[status]}</span>
        </div>
        <button
          onClick={() => removeJob(jobId)}
          className="p-1 text-on-surface-variant hover:text-error transition-colors"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
      <p className="text-xs text-on-surface-variant mb-3 font-mono truncate">Job {jobId.slice(0, 12)}...</p>
      <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${status === 'failed' ? 'bg-error' : 'bg-on-tertiary-container'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {error && <p className="text-xs text-error mt-2">{error}</p>}
    </div>
  );
}

export function Dashboard() {
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evals, setEvals] = useState<EvalSummary[]>([]);
  const [evalsLoading, setEvalsLoading] = useState(true);

  const jobs = useStore((s) => s.jobs);
  const addJob = useStore((s) => s.addJob);

  const fetchEvals = async () => {
    try {
      const data = await apiFetch<TrackerResponse>('/api/tracker?per_page=8&sort=created_at&order=desc');
      setEvals(data.items);
    } catch {
      // ignore
    } finally {
      setEvalsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvals();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setIsSubmitting(true);
    try {
      const data = await apiFetch<{ job_id: string }>('/api/agents/auto-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      addJob({ id: data.job_id, status: 'pending', progress: 0 });
      setUrl('');
    } catch (err: any) {
      alert(err.message || 'Failed to start evaluation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const gradeColor = (grade: string | null) => {
    switch (grade) {
      case 'A': return 'text-on-tertiary-container';
      case 'B': return 'text-on-tertiary-container';
      case 'C': return 'text-on-surface-variant';
      default: return 'text-error';
    }
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-10">
        <div className="max-w-5xl mx-auto space-y-10">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold tracking-tight text-primary-container" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Job Curation Engine
              </h1>
              <p className="text-on-surface-variant max-w-lg">
                Submit a job posting URL and our agentic AI will evaluate your fit across 10 precision dimensions.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="px-4 py-2 bg-surface-container-low text-on-surface text-xs font-semibold rounded-full">Status: Ready</span>
              <span className="px-4 py-2 bg-tertiary-container text-on-tertiary-container text-xs font-semibold rounded-full flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-on-tertiary-container animate-pulse" />
                AI Active
              </span>
            </div>
          </header>

          {/* URL Submission */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
              <div className="p-8 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-surface-container-low rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl text-on-primary-container">link</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-primary" style={{ fontFamily: 'Manrope, sans-serif' }}>Evaluate a Job Posting</h3>
                    <p className="text-on-surface-variant text-sm">Paste a job URL from any major job board</p>
                  </div>
                </div>
                <form onSubmit={handleSubmit} className="flex gap-3">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://jobs.company.com/position/..."
                    className="flex-1 px-5 py-4 rounded-xl bg-surface-container-low border-none focus:ring-2 focus:ring-on-tertiary-container/30 text-sm outline-none"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-4 ink-gradient text-on-primary rounded-xl font-bold text-sm tracking-tight shadow-lg disabled:opacity-50 flex items-center gap-2"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    {isSubmitting ? (
                      <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                    ) : (
                      <span className="material-symbols-outlined text-sm">send</span>
                    )}
                    {isSubmitting ? 'Queuing...' : 'Evaluate'}
                  </button>
                </form>
              </div>
            </div>

            {/* Stats */}
            <div className="md:col-span-4 space-y-4">
              <div className="bg-primary-container p-6 rounded-2xl text-white">
                <h4 className="text-xs font-bold text-on-primary-container uppercase tracking-widest mb-1">Active Jobs</h4>
                <p className="text-3xl font-extrabold" style={{ fontFamily: 'Manrope, sans-serif' }}>{jobs.length}</p>
                <p className="text-[10px] text-on-primary-container mt-3 italic">Processing evaluations in real-time</p>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm">
                <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Total Evaluated</h4>
                <p className="text-3xl font-extrabold text-primary" style={{ fontFamily: 'Manrope, sans-serif' }}>{evals.length}</p>
              </div>
            </div>
          </div>

          {/* Active Jobs */}
          {jobs.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-on-surface-variant">Active Evaluations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobs.map((job) => (
                  <JobCard key={job.id} jobId={job.id} onDone={fetchEvals} />
                ))}
              </div>
            </section>
          )}

          {/* Recent Evaluations */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-on-surface-variant">Recent Evaluations</h2>
              <Link
                to="/tracker"
                className="text-xs font-bold text-on-tertiary-container hover:underline flex items-center gap-1"
              >
                View All <span className="material-symbols-outlined text-sm">chevron_right</span>
              </Link>
            </div>

            {evalsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-surface-container-lowest rounded-2xl h-28 animate-pulse" />
                ))}
              </div>
            ) : evals.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-2xl p-12 text-center">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4 block">search</span>
                <p className="text-on-surface-variant text-sm">No evaluations yet. Paste a job URL above to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {evals.map((ev) => (
                  <Link
                    key={ev.id}
                    to={`/eval/${ev.id}`}
                    className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-sm text-on-surface leading-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          {ev.company || 'Unknown Company'}
                        </h3>
                        <p className="text-[11px] text-on-surface-variant">{ev.role || 'Unknown Role'}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`text-lg font-extrabold ${gradeColor(ev.grade)}`} style={{ fontFamily: 'Manrope, sans-serif' }}>
                          {ev.score != null ? `${Math.round(ev.score)}%` : '--'}
                        </span>
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">
                          Grade {ev.grade || '?'}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-on-tertiary-container rounded-full"
                        style={{ width: `${ev.score ?? 0}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] text-on-surface-variant">
                        {new Date(ev.created_at).toLocaleDateString()}
                      </span>
                      <span className="material-symbols-outlined text-sm text-on-surface-variant group-hover:text-on-tertiary-container transition-colors">chevron_right</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
