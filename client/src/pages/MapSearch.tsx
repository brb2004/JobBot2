import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { apiFetch } from '../lib/api';

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

export function MapSearch() {
  const [evals, setEvals] = useState<EvalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(15);
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('San Francisco, CA');

  useEffect(() => {
    apiFetch<TrackerResponse>('/api/tracker?per_page=20&sort=score&order=desc')
      .then((d) => setEvals(d.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = evals.filter((ev) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      ev.company?.toLowerCase().includes(q) ||
      ev.role?.toLowerCase().includes(q)
    );
  });

  const handleApprove = async (evalId: string) => {
    try {
      await apiFetch(`/api/tracker/${evalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'applied' }),
      });
      setEvals((prev) =>
        prev.map((ev) => (ev.id === evalId ? { ...ev, status: 'applied' } : ev))
      );
    } catch {
      alert('Failed to update status.');
    }
  };

  const handleDismiss = (evalId: string) => {
    setEvals((prev) => prev.filter((ev) => ev.id !== evalId));
  };

  return (
    <AppLayout fullWidth>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        {/* Left Sidebar - App Sidebar */}
        <aside className="hidden lg:flex flex-col gap-2 p-4 w-64 bg-surface-container-low shrink-0">
          <div className="mb-6 px-3 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              <span className="text-lg font-extrabold tracking-tight text-primary" style={{ fontFamily: 'Manrope, sans-serif' }}>AI Engine</span>
            </div>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Match Score Optimized</p>
          </div>
          <nav className="flex flex-col gap-1">
            {[
              { icon: 'folder_supervised', label: 'Job Curation', to: '/dashboard' },
              { icon: 'distance', label: 'Map Search', to: '/map', active: true },
              { icon: 'description', label: 'ATS Check', to: '/ats' },
              { icon: 'school', label: 'My Projects', to: '/upskilling' },
              { icon: 'send', label: 'Workflows', to: '/tracker' },
            ].map(({ icon, label, to, active }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 p-3 rounded-lg text-xs font-medium transition-all ${active ? 'bg-teal-50 text-teal-700 font-bold' : 'text-slate-600 hover:bg-slate-200'}`}
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                <span className="material-symbols-outlined" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>{icon}</span>
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto p-3">
            <Link
              to="/ats"
              className="w-full py-3 bg-primary text-on-primary rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2 text-sm hover:opacity-90 transition-opacity"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              <span className="material-symbols-outlined text-sm">upload</span>
              Upload Resume
            </Link>
          </div>
        </aside>

        {/* Main Content: Map + Panel */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Map Section */}
          <section className="flex-1 relative bg-surface-container" style={{ minWidth: 0 }}>
            {/* Map placeholder - styled to match the design */}
            <div className="w-full h-full bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 relative overflow-hidden">
              {/* Grid lines to simulate map */}
              <div className="absolute inset-0 opacity-20">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={`h${i}`} className="absolute w-full border-t border-slate-400" style={{ top: `${i * 5.5}%` }} />
                ))}
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={`v${i}`} className="absolute h-full border-l border-slate-400" style={{ left: `${i * 5.5}%` }} />
                ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-slate-400 text-sm font-medium">
                  Map visualization — {location}
                </p>
              </div>
              {/* Simulated pins */}
              <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2">
                <div className="bg-on-tertiary-container text-white px-3 py-1 rounded-full text-xs font-bold shadow-xl flex items-center gap-1 animate-pulse">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  {filtered.length} Jobs
                </div>
                <div className="w-0.5 h-4 bg-on-tertiary-container mx-auto" />
              </div>
              <div className="absolute top-1/3 left-2/3 -translate-x-1/2 -translate-y-1/2 opacity-80 scale-90">
                <div className="bg-primary-container text-white px-3 py-1 rounded-full text-xs font-bold shadow-xl">
                  {Math.floor(filtered.length * 0.3)} Jobs
                </div>
                <div className="w-0.5 h-4 bg-primary-container mx-auto" />
              </div>
            </div>

            {/* Search & Radius Overlay */}
            <div className="absolute top-6 left-6">
              <div className="bg-surface-container-lowest/95 backdrop-blur-md p-6 rounded-2xl shadow-xl w-80">
                <div className="flex items-center gap-3 bg-surface-container-low px-3 py-2.5 rounded-xl mb-6">
                  <span className="material-symbols-outlined text-on-surface-variant">search</span>
                  <input
                    className="bg-transparent border-none text-sm font-medium w-full outline-none placeholder:text-on-surface-variant"
                    placeholder="Search roles or skills..."
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest">Search Radius</span>
                    <span className="text-sm font-bold text-primary">{radius} miles</span>
                  </div>
                  <input
                    className="w-full h-1 bg-surface-container-high rounded-full appearance-none cursor-pointer"
                    max={50} min={1} type="range"
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    style={{ accentColor: '#000000' }}
                  />
                  <div className="flex justify-between text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter">
                    <span>1mi</span><span>50mi</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Map Controls */}
            <div className="absolute top-6 right-6 flex flex-col gap-2">
              <button className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center text-primary hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined">add</span>
              </button>
              <button className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center text-primary hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined">remove</span>
              </button>
              <button className="w-10 h-10 bg-primary text-white rounded-xl shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity mt-2">
                <span className="material-symbols-outlined">my_location</span>
              </button>
            </div>
          </section>

          {/* Right Panel: AI Gathered */}
          <aside className="w-[420px] bg-surface-container-low flex flex-col shrink-0 overflow-hidden">
            <div className="p-6 pb-4">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-xl font-extrabold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>AI Gathered</h2>
                <span className="px-3 py-1 bg-tertiary-container text-on-tertiary-container text-[10px] font-bold rounded-full">
                  {filtered.length} Found
                </span>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-on-surface-variant font-medium">Probabilistic matches from evaluations.</p>
                <span className="px-3 py-1 bg-surface-container-highest text-on-surface text-[10px] font-semibold rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-container animate-pulse" />
                  AI Active
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-8 custom-scrollbar">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-surface-container-lowest rounded-2xl h-32 animate-pulse" />
                ))
              ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant block mb-3">location_off</span>
                  <p className="text-on-surface-variant text-sm">No jobs found. Submit evaluations from the dashboard.</p>
                </div>
              ) : (
                filtered.map((ev) => (
                  <div key={ev.id} className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-surface-container-low rounded-lg flex items-center justify-center">
                          <span className="material-symbols-outlined text-on-surface-variant">business</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-sm leading-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            {ev.role || 'Unknown Role'}
                          </h3>
                          <p className="text-[11px] text-on-surface-variant">{ev.company || 'Unknown Company'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-extrabold text-on-tertiary-container" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          {ev.score != null ? `${Math.round(ev.score)}%` : '--'}
                        </span>
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">Match</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {ev.status !== 'applied' ? (
                        <button
                          onClick={() => handleApprove(ev.id)}
                          className="flex-1 py-2.5 bg-primary-container text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                        >
                          <span className="material-symbols-outlined text-sm">check_circle</span> Apply
                        </button>
                      ) : (
                        <div className="flex-1 py-2.5 bg-teal-50 text-on-tertiary-container rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span> Applied
                        </div>
                      )}
                      <Link
                        to={`/eval/${ev.id}`}
                        className="px-4 py-2.5 bg-surface-container-high text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container-highest transition-colors flex items-center"
                      >
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                      </Link>
                      <button
                        onClick={() => handleDismiss(ev.id)}
                        className="px-4 py-2.5 bg-surface-container-high text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container-highest transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
