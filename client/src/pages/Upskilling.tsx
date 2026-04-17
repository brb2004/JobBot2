import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { apiFetch } from '../lib/api';

interface DimensionScore {
  raw: number;
  rationale: string;
}

interface EvalDetail {
  id: string;
  company: string | null;
  role: string | null;
  score: number | null;
  raw_eval: {
    dimensions: Record<string, DimensionScore>;
    keywords: string[];
  } | null;
}

interface TrackerResponse {
  items: { id: string; company: string | null; role: string | null; score: number | null }[];
  total: number;
  page: number;
}

const DIMENSION_LABELS: Record<string, string> = {
  role_match: 'Role Match',
  skills_alignment: 'Skills Alignment',
  seniority: 'Seniority',
  compensation: 'Compensation',
  interview_likelihood: 'Interview Likelihood',
  company_stage: 'Company Stage',
  product_market_fit: 'Product-Market Fit',
  geographic_feasibility: 'Geographic Feasibility',
  growth_trajectory: 'Growth Trajectory',
  hiring_timeline: 'Hiring Timeline',
};

export function Upskilling() {
  const [latestEval, setLatestEval] = useState<EvalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentScore, setCurrentScore] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const trackerData = await apiFetch<TrackerResponse>('/api/tracker?per_page=1&sort=created_at&order=desc');
        if (trackerData.items.length > 0) {
          const latestId = trackerData.items[0].id;
          const detail = await apiFetch<EvalDetail>(`/api/evaluations/${latestId}`);
          setLatestEval(detail);
          setCurrentScore(detail.score);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const dimensions = latestEval?.raw_eval?.dimensions || {};
  const skillGaps = Object.entries(dimensions)
    .filter(([, v]) => v.raw < 3.5)
    .sort((a, b) => a[1].raw - b[1].raw)
    .slice(0, 4);

  const strongDimensions = Object.entries(dimensions)
    .filter(([, v]) => v.raw >= 4)
    .map(([k]) => k);

  const projectedScore = currentScore != null
    ? Math.min(100, Math.round(currentScore + skillGaps.length * 3))
    : null;

  return (
    <AppLayout>
      <main className="lg:ml-0 pt-6 pb-12 px-8 min-h-screen">
        <div className="max-w-[1400px] mx-auto">
          {/* Header */}
          <header className="mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Upskilling &amp; Skill Bridge
            </h1>
            <p className="text-on-surface-variant max-w-2xl text-lg leading-relaxed">
              Our AI compares your profile against live{' '}
              <span className="text-on-surface font-bold">
                {latestEval?.role || 'Senior Engineer'}
              </span>{' '}
              requisites. Bridge the technical delta with precision-targeted improvements.
            </p>
          </header>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-8">
                <div className="bg-surface-container-lowest rounded-3xl h-64 animate-pulse" />
                <div className="bg-surface-container-lowest rounded-3xl h-48 animate-pulse" />
              </div>
              <div className="lg:col-span-4">
                <div className="bg-surface-container-lowest rounded-3xl h-80 animate-pulse" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column */}
              <div className="lg:col-span-8 space-y-8">
                {/* Bento Grid Top Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Skill Gap Visualization */}
                  <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-transparent hover:border-teal-500/10 transition-all duration-300">
                    <div className="flex justify-between items-start mb-6">
                      <h3 className="font-bold text-xl" style={{ fontFamily: 'Manrope, sans-serif' }}>Skill Gap Delta</h3>
                      <span className="bg-teal-50 text-on-tertiary-container text-xs font-bold px-3 py-1 rounded-full">
                        {latestEval ? 'LIVE ANALYSIS' : 'NO DATA'}
                      </span>
                    </div>
                    {Object.keys(dimensions).length === 0 ? (
                      <p className="text-on-surface-variant text-sm">
                        No evaluation data yet.{' '}
                        <Link to="/dashboard" className="text-on-tertiary-container font-bold hover:underline">
                          Submit a job URL
                        </Link>{' '}
                        to see skill gaps.
                      </p>
                    ) : (
                      <div className="space-y-5">
                        {Object.entries(dimensions).slice(0, 4).map(([key, val]) => (
                          <div key={key}>
                            <div className="flex justify-between text-xs font-bold mb-2">
                              <span className="text-on-surface-variant uppercase">{DIMENSION_LABELS[key] || key.replace(/_/g, ' ')}</span>
                              <span className="text-on-tertiary-container">{Math.round(val.raw / 5 * 100)}% COMPLETE</span>
                            </div>
                            <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${(val.raw / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Match Score Projection */}
                  <div className="signature-gradient rounded-3xl p-8 text-white relative overflow-hidden group">
                    <div className="relative z-10">
                      <h3 className="font-bold text-xl mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>Match Score Projection</h3>
                      <div className="flex items-end gap-6 mb-8">
                        <div>
                          <p className="text-teal-400 text-[10px] font-bold tracking-widest mb-1 uppercase">Current</p>
                          <p className="text-5xl font-black" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            {currentScore != null ? Math.round(currentScore) : '--'}
                            {currentScore != null && <span className="text-xl text-teal-400/50">%</span>}
                          </p>
                        </div>
                        {projectedScore != null && projectedScore > (currentScore ?? 0) && (
                          <>
                            <div className="mb-2">
                              <span className="material-symbols-outlined text-teal-400">trending_up</span>
                            </div>
                            <div>
                              <p className="text-teal-400 text-[10px] font-bold tracking-widest mb-1 uppercase">Projected</p>
                              <p className="text-5xl font-black" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                {projectedScore}<span className="text-xl text-teal-400/50">%</span>
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        {skillGaps.length > 0
                          ? `Addressing the ${skillGaps.length} identified skill gap${skillGaps.length > 1 ? 's' : ''} will elevate your profile significantly.`
                          : 'Your profile is strongly aligned with the target role.'}
                      </p>
                    </div>
                    <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl group-hover:bg-teal-500/20 transition-all duration-700" />
                  </div>
                </div>

                {/* Skill Gaps / Improvement Areas */}
                {skillGaps.length > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-black tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>Improvement Areas</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {skillGaps.map(([key, val]) => (
                        <div key={key} className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-transparent hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300">
                          <div className="flex justify-between items-start mb-4">
                            <div className="bg-tertiary-container/10 p-3 rounded-2xl">
                              <span className="material-symbols-outlined text-on-tertiary-container">trending_up</span>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">Score</p>
                              <p className="text-xl font-black text-error">{val.raw}/5</p>
                            </div>
                          </div>
                          <h4 className="font-bold text-lg mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            {DIMENSION_LABELS[key] || key.replace(/_/g, ' ')}
                          </h4>
                          <p className="text-sm text-on-surface-variant mb-4 leading-relaxed">{val.rationale}</p>
                          <Link
                            to={`/eval/${latestEval?.id}`}
                            className="text-[11px] font-bold text-on-tertiary-container hover:underline flex items-center gap-1"
                          >
                            View Full Analysis <span className="material-symbols-outlined text-sm">chevron_right</span>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strong Points */}
                {strongDimensions.length > 0 && (
                  <div className="bg-surface-container-low rounded-3xl p-8">
                    <h2 className="text-2xl font-black tracking-tight mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>Strong Points</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {strongDimensions.map((key) => (
                        <div key={key} className="bg-surface-container-lowest p-5 rounded-2xl flex items-center gap-4">
                          <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                          </div>
                          <div className="flex-1">
                            <h5 className="font-bold text-sm">{DIMENSION_LABELS[key] || key.replace(/_/g, ' ')}</h5>
                            <p className="text-[11px] text-on-surface-variant">Score: {dimensions[key].raw}/5</p>
                          </div>
                          <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!latestEval && (
                  <div className="bg-surface-container-lowest rounded-3xl p-12 text-center">
                    <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-4 block">school</span>
                    <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>No Evaluations Yet</h3>
                    <p className="text-on-surface-variant text-sm mb-6">Run your first job evaluation to see personalized upskilling recommendations.</p>
                    <Link
                      to="/dashboard"
                      className="ink-gradient text-on-primary px-8 py-3 rounded-xl font-bold text-sm inline-flex items-center gap-2"
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      Start Evaluation
                    </Link>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="lg:col-span-4 space-y-8">
                {/* Progress Tracking */}
                <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-transparent">
                  <h3 className="font-bold text-xl mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>Score Breakdown</h3>
                  {Object.entries(dimensions).length === 0 ? (
                    <p className="text-on-surface-variant text-sm">Submit a job evaluation to see your score breakdown.</p>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(dimensions).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${val.raw >= 4 ? 'bg-on-tertiary-container' : val.raw >= 3 ? 'bg-amber-500' : 'bg-error'}`} />
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-medium text-on-surface truncate pr-2">
                                {DIMENSION_LABELS[key] || key.replace(/_/g, ' ')}
                              </span>
                              <span className="font-bold shrink-0">{val.raw}/5</span>
                            </div>
                            <div className="h-1 bg-surface-container-high rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${val.raw >= 4 ? 'bg-on-tertiary-container' : val.raw >= 3 ? 'bg-amber-500' : 'bg-error'}`}
                                style={{ width: `${(val.raw / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Keywords */}
                {latestEval?.raw_eval?.keywords && latestEval.raw_eval.keywords.length > 0 && (
                  <div className="bg-surface p-6 rounded-3xl border border-on-surface/5">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="material-symbols-outlined text-on-tertiary-container">sell</span>
                      <h4 className="font-bold text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>Key Skills Detected</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {latestEval.raw_eval.keywords.slice(0, 12).map((kw) => (
                        <span key={kw} className="text-xs bg-surface-container-low text-on-surface-variant px-3 py-1 rounded-full font-medium">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* FAB */}
      <div className="fixed bottom-8 right-8 z-50">
        <Link
          to="/dashboard"
          className="signature-gradient text-white w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
        </Link>
      </div>
    </AppLayout>
  );
}
