import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { apiFetch } from '../lib/api';

type EvalStatus = 'new' | 'applied' | 'interviewing' | 'rejected' | 'offer';

interface Evaluation {
  id: string;
  url: string;
  company: string | null;
  role: string | null;
  score: number | null;
  grade: string | null;
  status: EvalStatus;
  created_at: string;
  applied_at: string | null;
}

interface TrackerResponse {
  items: Evaluation[];
  total: number;
  page: number;
}

const STATUS_STYLES: Record<EvalStatus, string> = {
  new: 'bg-surface-container-high text-on-surface-variant',
  applied: 'bg-secondary-container text-secondary',
  interviewing: 'bg-tertiary-container/20 text-on-tertiary-container',
  rejected: 'bg-error-container text-on-error-container',
  offer: 'bg-teal-50 text-on-tertiary-container',
};

const STATUS_LABELS: Record<EvalStatus, string> = {
  new: 'New',
  applied: 'Applied',
  interviewing: 'Interviewing',
  rejected: 'Rejected',
  offer: 'Offer',
};

const GRADE_COLOR: Record<string, string> = {
  A: 'text-on-tertiary-container',
  B: 'text-on-tertiary-container',
  C: 'text-amber-600',
  D: 'text-orange-600',
  F: 'text-error',
};

export function Tracker() {
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<'created_at' | 'score' | 'grade'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const perPage = 10;

  const fetchEvals = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        sort: sortKey,
        order: sortDir,
      });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (gradeFilter !== 'all') params.set('grade', gradeFilter);

      const data = await apiFetch<TrackerResponse>(`/api/tracker?${params}`);
      setEvals(data.items);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch evaluations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvals();
  }, [page, statusFilter, gradeFilter, sortKey, sortDir]);

  const updateStatus = async (evalId: string, newStatus: EvalStatus) => {
    const prev = [...evals];
    setEvals((e) => e.map((ev) => ev.id === evalId ? { ...ev, status: newStatus } : ev));
    try {
      await apiFetch(`/api/tracker/${evalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      setEvals(prev);
    }
  };

  const handleSort = (key: 'created_at' | 'score' | 'grade') => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  };

  const filteredEvals = useMemo(() => {
    if (!searchQuery) return evals;
    const q = searchQuery.toLowerCase();
    return evals.filter(
      (ev) =>
        ev.company?.toLowerCase().includes(q) ||
        ev.role?.toLowerCase().includes(q)
    );
  }, [evals, searchQuery]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <AppLayout>
      <div className="p-6 md:p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-primary-container" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Application Tracker
              </h1>
              <p className="text-on-surface-variant mt-2">
                Track evaluations and manage your application pipeline.{' '}
                <span className="font-bold text-on-surface">{total} total</span>
              </p>
            </div>
            <Link
              to="/dashboard"
              className="ink-gradient text-on-primary px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 self-start"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              <span className="material-symbols-outlined text-sm">add</span>
              New Evaluation
            </Link>
          </header>

          {/* Filter Bar */}
          <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Search</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
                <input
                  type="text"
                  placeholder="Company or role..."
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low rounded-xl text-sm outline-none focus:ring-2 focus:ring-on-tertiary-container/30"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</label>
              <select
                className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-sm outline-none focus:ring-2 focus:ring-on-tertiary-container/30 appearance-none"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="all">All Statuses</option>
                {(Object.keys(STATUS_LABELS) as EvalStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Grade</label>
              <select
                className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-sm outline-none focus:ring-2 focus:ring-on-tertiary-container/30 appearance-none"
                value={gradeFilter}
                onChange={(e) => { setGradeFilter(e.target.value); setPage(1); }}
              >
                <option value="all">All Grades</option>
                {['A', 'B', 'C', 'D', 'F'].map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <button
              onClick={() => { setStatusFilter('all'); setGradeFilter('all'); setSearchQuery(''); setPage(1); }}
              className="text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors py-2.5 text-left"
            >
              Clear Filters
            </button>
          </div>

          {/* Table */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-2 border-surface-container-high border-t-on-tertiary-container rounded-full animate-spin mx-auto" />
              </div>
            ) : error ? (
              <div className="p-8 text-center space-y-4">
                <span className="material-symbols-outlined text-error text-3xl block">error</span>
                <p className="text-on-surface-variant text-sm">{error}</p>
                <button onClick={fetchEvals} className="ink-gradient text-on-primary px-5 py-2 rounded-xl text-sm font-bold">
                  Retry
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low">
                      {[
                        { label: 'Company', key: null },
                        { label: 'Role', key: null },
                        { label: 'Score', key: 'score' as const },
                        { label: 'Grade', key: 'grade' as const },
                        { label: 'Status', key: null },
                        { label: 'Date', key: 'created_at' as const },
                        { label: '', key: null },
                      ].map(({ label, key }, i) => (
                        <th
                          key={i}
                          className={`px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ${key ? 'cursor-pointer hover:text-on-surface transition-colors' : ''}`}
                          onClick={() => key && handleSort(key)}
                        >
                          <div className="flex items-center gap-1">
                            {label}
                            {key && sortKey === key && (
                              <span className="material-symbols-outlined text-xs">
                                {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvals.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-16 text-center">
                          <span className="material-symbols-outlined text-4xl text-on-surface-variant block mb-3">inbox</span>
                          <p className="text-on-surface-variant text-sm">No evaluations found.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredEvals.map((ev) => (
                        <tr key={ev.id} className="border-t border-surface-container-low hover:bg-surface-container-low/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-bold text-on-surface" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            {ev.company || '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-on-surface-variant max-w-[200px] truncate">
                            {ev.role || '—'}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-on-surface">
                            {ev.score != null ? `${Math.round(ev.score)}%` : '—'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-sm font-black ${GRADE_COLOR[ev.grade || 'F'] || ''}`}>
                              {ev.grade || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              className={`text-xs font-bold px-3 py-1.5 rounded-lg outline-none cursor-pointer ${STATUS_STYLES[ev.status]}`}
                              value={ev.status}
                              onChange={(e) => updateStatus(ev.id, e.target.value as EvalStatus)}
                            >
                              {(Object.keys(STATUS_LABELS) as EvalStatus[]).map((s) => (
                                <option key={s} value={s} className="bg-white text-on-surface font-normal">{STATUS_LABELS[s]}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 text-xs text-on-surface-variant">
                            {new Date(ev.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <Link
                              to={`/eval/${ev.id}`}
                              className="p-1.5 text-on-surface-variant hover:text-on-tertiary-container transition-colors rounded-lg hover:bg-teal-50"
                            >
                              <span className="material-symbols-outlined text-sm">open_in_new</span>
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-surface-container-low border-t border-surface-variant/30 flex items-center justify-between">
                <p className="text-xs text-on-surface-variant">
                  Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 text-xs font-semibold text-on-surface-variant bg-surface-container-lowest rounded-lg hover:bg-surface-container-high disabled:opacity-40 transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 text-xs font-bold rounded-lg transition-colors ${
                        page === p
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 text-xs font-semibold text-on-surface-variant bg-surface-container-lowest rounded-lg hover:bg-surface-container-high disabled:opacity-40 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
