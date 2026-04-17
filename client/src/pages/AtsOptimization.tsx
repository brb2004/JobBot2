import React, { useState, useEffect } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { apiFetch } from '../lib/api';

interface ResumeData {
  id: string;
  content_md: string | null;
  updated_at: string | null;
}

interface EvalSummary {
  id: string;
  company: string | null;
  role: string | null;
  score: number | null;
  grade: string | null;
}

interface TrackerResponse {
  items: EvalSummary[];
  total: number;
  page: number;
}

export function AtsOptimization() {
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [topEvals, setTopEvals] = useState<EvalSummary[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<ResumeData>('/api/resume').catch(() => null),
      apiFetch<TrackerResponse>('/api/tracker?per_page=3&sort=score&order=desc').catch(() => ({ items: [], total: 0, page: 1 })),
    ]).then(([resumeData, trackerData]) => {
      if (resumeData) {
        setResume(resumeData);
        setResumeText(resumeData.content_md || '');
      }
      setTopEvals((trackerData as TrackerResponse).items);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMsg(null);
    try {
      const data = await apiFetch<ResumeData>('/api/resume', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_md: resumeText }),
      });
      setResume(data);
      setSaveMsg('Resume saved successfully.');
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err: any) {
      setSaveMsg(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const resumeStrength = resume?.content_md
    ? Math.min(100, Math.round((resume.content_md.length / 3000) * 100))
    : null;

  return (
    <AppLayout resumeStrength={resumeStrength}>
      <div className="lg:pl-0 pt-6 pb-12 px-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tighter text-on-surface" style={{ fontFamily: 'Manrope, sans-serif' }}>
                ATS Optimization Hub
              </h1>
              <p className="text-on-surface-variant mt-2 max-w-lg">
                Cross-reference your profile against live job requisitions. Edit your resume and apply AI suggestions to bridge the semantic gap.
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href={topEvals[0] ? `/api/pdf/${topEvals[0].id}` : '#'}
                className={`px-5 py-2.5 bg-surface-container-high text-on-surface font-semibold text-sm rounded-xl hover:bg-surface-container-highest transition-colors ${!topEvals[0] ? 'opacity-50 pointer-events-none' : ''}`}
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                Download PDF
              </a>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2.5 ink-gradient text-on-primary font-semibold text-sm rounded-xl hover:opacity-90 transition-all shadow-lg disabled:opacity-50"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                {isSaving ? 'Saving...' : 'Save Resume'}
              </button>
            </div>
          </div>

          {saveMsg && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${saveMsg.startsWith('Error') ? 'bg-error-container text-on-error-container' : 'bg-tertiary-container/10 text-on-tertiary-container'}`}>
              {saveMsg}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12 xl:col-span-8 bg-surface-container-lowest rounded-2xl h-96 animate-pulse" />
              <div className="col-span-12 xl:col-span-4 space-y-6">
                <div className="bg-surface-container-lowest rounded-2xl h-48 animate-pulse" />
                <div className="bg-surface-container-lowest rounded-2xl h-32 animate-pulse" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-8">
              {/* Left Column: Resume Editor */}
              <div className="col-span-12 xl:col-span-8 flex flex-col gap-6">
                <section className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm ring-1 ring-outline-variant/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    <span className="bg-tertiary-container/10 text-on-tertiary-container text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">verified</span> Live Editorial Mode
                    </span>
                  </div>

                  {resumeText ? (
                    <div className="max-w-2xl mx-auto">
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                        <h3 className="font-extrabold text-sm tracking-widest text-slate-400 uppercase" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          Master Resume
                        </h3>
                        <span className="text-[10px] bg-tertiary-container/10 text-on-tertiary-container px-2 py-0.5 rounded font-bold">
                          {resume?.updated_at ? `Last saved ${new Date(resume.updated_at).toLocaleDateString()}` : 'Unsaved'}
                        </span>
                      </div>
                      <textarea
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                        className="w-full h-[500px] font-mono text-xs text-slate-700 bg-transparent resize-none outline-none leading-relaxed"
                        placeholder="Your resume in Markdown format..."
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-16 h-16 bg-surface-container-low rounded-full flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-3xl text-on-primary-container">cloud_upload</span>
                      </div>
                      <h3 className="text-xl font-bold text-primary mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>No Resume Yet</h3>
                      <p className="text-on-surface-variant text-sm mb-6 max-w-sm">
                        Paste your resume content below in Markdown format to begin ATS optimization.
                      </p>
                      <textarea
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                        className="w-full h-64 p-4 bg-surface-container-low rounded-xl font-mono text-xs text-slate-700 resize-none outline-none focus:ring-2 focus:ring-on-tertiary-container/30"
                        placeholder="# Your Name&#10;Senior Engineer | City, State&#10;&#10;## Experience&#10;..."
                      />
                    </div>
                  )}
                </section>

                {/* AI Analysis Status */}
                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    { icon: 'analytics', title: 'Semantic Parsing', desc: 'AI breaks down your experience into distinct skill clusters for precise indexing.' },
                    { icon: 'query_stats', title: 'Market Mapping', desc: 'Real-time comparison against current high-growth job requisitions.' },
                    { icon: 'architecture', title: 'Optimization Guide', desc: 'Personalized suggestions to rephrase impact statements for maximum ATS penetration.' },
                  ].map(({ icon, title, desc }) => (
                    <div key={title} className="bg-surface-container-lowest p-8 rounded-2xl flex flex-col gap-4 shadow-sm">
                      <span className="material-symbols-outlined text-on-tertiary-container text-4xl">{icon}</span>
                      <h3 className="font-bold text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>{title}</h3>
                      <p className="text-sm text-on-surface-variant leading-relaxed">{desc}</p>
                      <div className="mt-auto pt-4 border-t border-surface-variant">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">
                          Status: {resumeText ? 'Ready' : 'Awaiting Input'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Match Stats */}
              <div className="col-span-12 xl:col-span-4 space-y-6">
                {/* Top Matches */}
                <div className="bg-primary-container rounded-2xl p-6 text-white overflow-hidden relative">
                  <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-teal-500/10 blur-[64px] rounded-full" />
                  <h3 className="font-bold text-lg mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>Top Role Matches</h3>
                  {topEvals.length === 0 ? (
                    <p className="text-on-primary-container text-xs italic">No evaluations yet. Submit a job URL from the dashboard to get started.</p>
                  ) : (
                    <div className="space-y-6">
                      {topEvals.map((ev) => (
                        <div key={ev.id}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-medium text-slate-300 truncate pr-4">
                              {ev.role || 'Unknown Role'} {ev.company ? `(${ev.company})` : ''}
                            </span>
                            <span className="text-xs font-bold text-tertiary-fixed shrink-0">
                              {ev.score != null ? `${Math.round(ev.score)}%` : '--'}
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 h-2 rounded-full">
                            <div
                              className="bg-teal-400 h-full rounded-full shadow-[0_0_12px_rgba(45,212,191,0.4)]"
                              style={{ width: `${ev.score ?? 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Skill Gap placeholder */}
                <div className="space-y-4">
                  <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-400 px-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    ATS Checklist
                  </h3>
                  {[
                    { icon: 'check_circle', color: 'bg-teal-50', iconColor: 'text-on-tertiary-container', label: 'PDF-compatible formatting', done: true },
                    { icon: resumeText ? 'check_circle' : 'radio_button_unchecked', color: resumeText ? 'bg-teal-50' : 'bg-surface-container-low', iconColor: resumeText ? 'text-on-tertiary-container' : 'text-on-surface-variant', label: 'Resume content uploaded', done: !!resumeText },
                    { icon: topEvals.length > 0 ? 'check_circle' : 'radio_button_unchecked', color: topEvals.length > 0 ? 'bg-teal-50' : 'bg-surface-container-low', iconColor: topEvals.length > 0 ? 'text-on-tertiary-container' : 'text-on-surface-variant', label: 'Job evaluations run', done: topEvals.length > 0 },
                  ].map(({ icon, color, iconColor, label }) => (
                    <div key={label} className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-100`}>
                      <div className="flex gap-4 items-center">
                        <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center shrink-0`}>
                          <span className={`material-symbols-outlined ${iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-900">{label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Vertical selector */}
                <div className="bg-surface-container-low p-6 rounded-2xl">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Target Vertical</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Technology', 'Fintech', 'Healthcare', 'Creative', 'Engineering', 'Management'].map((v, i) => (
                      <button
                        key={v}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${i === 0 ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-on-surface hover:bg-surface-variant'}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
