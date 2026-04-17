import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { apiFetch } from '../lib/api';

interface DimensionScore {
  raw: number;
  rationale: string;
}

interface EvaluationDetail {
  id: string;
  url: string;
  company: string | null;
  role: string | null;
  score: number | null;
  grade: string | null;
  status: string;
  created_at: string;
  raw_eval: {
    dimensions: Record<string, DimensionScore>;
    keywords: string[];
    archetype: string;
  } | null;
  pdf_path: string | null;
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

const DEFAULT_WEIGHTS: Record<string, number> = {
  role_match: 0.15,
  skills_alignment: 0.15,
  seniority: 0.12,
  compensation: 0.12,
  interview_likelihood: 0.10,
  company_stage: 0.08,
  product_market_fit: 0.08,
  geographic_feasibility: 0.08,
  growth_trajectory: 0.07,
  hiring_timeline: 0.05,
};

export function EvaluationDetail() {
  const { evalId } = useParams<{ evalId: string }>();
  const [evalData, setEvalData] = useState<EvaluationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!evalId) return;
    apiFetch<EvaluationDetail>(`/api/evaluations/${evalId}`)
      .then(setEvalData)
      .catch((err) => setError(err.message || 'Failed to fetch evaluation'))
      .finally(() => setIsLoading(false));
  }, [evalId]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-tertiary-fixed animate-spin">refresh</span>
            </div>
            <p className="text-on-surface-variant text-sm">Loading evaluation...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !evalData) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 bg-error-container rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-on-error-container text-2xl">error</span>
            </div>
            <h2 className="text-xl font-bold text-on-surface" style={{ fontFamily: 'Manrope, sans-serif' }}>Evaluation Not Found</h2>
            <p className="text-on-surface-variant text-sm">{error || 'The requested evaluation could not be found.'}</p>
            <Link to="/dashboard" className="ink-gradient text-on-primary px-6 py-3 rounded-xl font-bold text-sm inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const dimensions = evalData.raw_eval?.dimensions || {};
  const keywords = evalData.raw_eval?.keywords || [];
  const archetype = evalData.raw_eval?.archetype;

  const suggestions = Object.entries(dimensions)
    .filter(([, v]) => v.raw < 3.5)
    .sort((a, b) => a[1].raw - b[1].raw);

  const gradeColors: Record<string, string> = {
    A: 'text-on-tertiary-container bg-teal-50',
    B: 'text-on-tertiary-container bg-teal-50',
    C: 'text-amber-700 bg-amber-50',
    D: 'text-orange-700 bg-orange-50',
    F: 'text-error bg-error-container',
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Back + Download Nav */}
          <nav className="flex items-center justify-between">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors font-medium"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to Dashboard
            </Link>
            {evalData.pdf_path && (
              <a
                href={`/api/pdf/${evalData.id}`}
                download
                className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-high text-on-surface text-sm font-semibold rounded-xl hover:bg-surface-container-highest transition-colors"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Download PDF
              </a>
            )}
          </nav>

          {/* Header Card */}
          <header className="bg-primary-container rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-[-30%] right-[-5%] w-64 h-64 bg-teal-500/10 blur-[80px] rounded-full" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 mb-4">
                  <span className="material-symbols-outlined text-tertiary-fixed text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  <span className="text-tertiary-fixed text-xs font-bold uppercase tracking-widest">
                    {archetype || 'Evaluation Result'}
                  </span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {evalData.company || 'Unknown Company'}
                </h1>
                <p className="text-on-primary-container text-lg">
                  {evalData.role || 'Unknown Role'}
                </p>
                <p className="text-on-primary-container/60 text-xs mt-2">
                  {new Date(evalData.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-5xl font-black" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {evalData.score != null ? `${Math.round(evalData.score)}` : '--'}
                    {evalData.score != null && <span className="text-2xl text-on-primary-container/50">%</span>}
                  </div>
                  <div className="text-[10px] text-on-primary-container uppercase tracking-widest font-bold mt-1">Overall Fit</div>
                </div>
                {evalData.grade && (
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black ${gradeColors[evalData.grade] || gradeColors.F}`}>
                    {evalData.grade}
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Dimension Breakdown */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-on-surface-variant" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Dimension Breakdown
              </h3>
              {Object.keys(dimensions).length === 0 ? (
                <div className="bg-surface-container-lowest rounded-2xl p-8 text-center">
                  <p className="text-on-surface-variant text-sm">No dimension data available for this evaluation.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(dimensions).map(([key, data]) => {
                    const weight = DEFAULT_WEIGHTS[key] ?? 0;
                    const scoreColor = data.raw >= 4 ? 'bg-on-tertiary-container' : data.raw >= 3 ? 'bg-amber-500' : 'bg-error';
                    const textColor = data.raw >= 4 ? 'text-on-tertiary-container' : data.raw >= 3 ? 'text-amber-600' : 'text-error';
                    return (
                      <div key={key} className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${scoreColor}`} />
                            <span className="text-sm font-bold text-on-surface uppercase tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                              {DIMENSION_LABELS[key] || key.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-on-surface-variant">Weight: {Math.round(weight * 100)}%</span>
                            <span className={`text-sm font-bold ${textColor}`}>{data.raw}/5</span>
                          </div>
                        </div>
                        <p className="text-sm text-on-surface-variant leading-relaxed">{data.rationale}</p>
                        <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${scoreColor}`}
                            style={{ width: `${(data.raw / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <div className="space-y-6">
              {/* Build Suggestions */}
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-on-surface-variant" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Build Suggestions
                </h3>
                {suggestions.length === 0 ? (
                  <div className="bg-teal-50 border border-on-tertiary-container/10 p-6 rounded-2xl text-center space-y-3">
                    <span className="material-symbols-outlined text-on-tertiary-container text-3xl block" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    <p className="text-sm text-on-tertiary-container font-medium">
                      Strong alignment with this role. No major gaps identified!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {suggestions.map(([key, data]) => (
                      <div key={key} className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-error-container rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-on-error-container text-sm">warning</span>
                          </div>
                          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            {DIMENSION_LABELS[key] || key.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-on-surface-variant leading-relaxed">{data.rationale}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Keywords */}
              {keywords.length > 0 && (
                <div className="bg-surface-container-low p-6 rounded-2xl space-y-4">
                  <h3 className="text-sm font-extrabold uppercase tracking-widest text-on-surface-variant" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Key Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((kw) => (
                      <span key={kw} className="text-xs bg-surface-container-lowest text-on-surface-variant px-3 py-1.5 rounded-lg font-medium">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Job URL */}
              <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Source URL</p>
                <a
                  href={evalData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-on-tertiary-container hover:underline break-all flex items-start gap-1"
                >
                  <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">open_in_new</span>
                  {evalData.url}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
