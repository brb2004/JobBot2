import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';

type Tab = 'login' | 'register';

export function Landing() {
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen">
      {/* TopNavBar */}
      <header className="fixed top-0 w-full z-50 glass-nav shadow-sm shadow-slate-200/50">
        <div className="flex justify-between items-center h-16 px-6 max-w-full mx-auto">
          <span className="text-xl font-bold tracking-tighter text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Precision-Tech Editorial
          </span>
          <nav className="hidden md:flex items-center gap-6">
            {['Discover', 'Optimization', 'Upskilling', 'Applications'].map((item, i) => (
              <button
                key={item}
                onClick={() => { setTab('login'); document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                className={`text-sm font-semibold tracking-tight transition-colors pb-1 ${i === 0 ? 'text-slate-900 border-b-2 border-teal-500' : 'text-slate-500 hover:text-slate-700'}`}
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                {item}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-slate-100/50 transition-all rounded-full">
              <span className="material-symbols-outlined text-on-surface">notifications</span>
            </button>
            <button className="p-2 hover:bg-slate-100/50 transition-all rounded-full">
              <span className="material-symbols-outlined text-on-surface">settings</span>
            </button>
          </div>
        </div>
      </header>

      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative min-h-[600px] flex items-center px-6 md:px-12 overflow-hidden bg-surface">
          <div className="max-w-7xl mx-auto w-full grid md:grid-cols-2 gap-12 items-center">
            <div className="z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tertiary-container/10 border border-on-tertiary-container/20 mb-6">
                <span className="material-symbols-outlined text-on-tertiary-container text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <span className="text-on-tertiary-container text-xs font-bold tracking-wider uppercase" style={{ fontFamily: 'Manrope, sans-serif' }}>Agentic AI Engine v2.4</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-primary leading-[1.1] mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Precision Engineering <br /> For Your <span className="text-on-tertiary-container">Career.</span>
              </h1>
              <p className="text-on-surface-variant text-lg md:text-xl max-w-xl mb-10 leading-relaxed">
                The architectural ledger of job search. We don't just find listings; we architect your professional narrative using probabilistic AI models optimized for ATS performance.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="ink-gradient text-on-primary px-8 py-4 rounded-xl font-bold text-sm tracking-tight shadow-xl hover:scale-[0.98] transition-transform"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  Initialize Engine
                </button>
                <button
                  onClick={() => document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-surface-container-high text-on-surface px-8 py-4 rounded-xl font-bold text-sm tracking-tight hover:bg-surface-container-highest transition-colors"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  Explore Workflows
                </button>
              </div>
              <p className="mt-8 text-xs text-on-surface-variant/60 font-medium">
                <span className="font-bold text-error">CRITICAL NOTICE:</span> AI outputs are probabilistic; verify critical data before submission.
              </p>
            </div>

            <div className="relative hidden md:block">
              <div className="absolute -top-20 -right-20 w-96 h-96 bg-tertiary-fixed-dim/20 blur-[100px] rounded-full" />
              <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-outline-variant/10 relative overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-white">
                      <span className="material-symbols-outlined">description</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-primary-container uppercase tracking-widest">Match Score Analysis</p>
                      <p className="text-lg font-extrabold" style={{ fontFamily: 'Manrope, sans-serif' }}>Senior AI Architect</p>
                    </div>
                  </div>
                  <div className="px-4 py-2 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-bold text-xl">98%</div>
                </div>
                <div className="space-y-4">
                  <div className="h-2 w-full bg-surface-container-low rounded-full overflow-hidden">
                    <div className="h-full w-[98%] bg-on-tertiary-container rounded-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-surface-container-low">
                      <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-1">ATS Sync</p>
                      <p className="text-sm font-bold text-primary">Optimized</p>
                    </div>
                    <div className="p-4 rounded-xl bg-surface-container-low">
                      <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-1">Keywords</p>
                      <p className="text-sm font-bold text-primary">Found 14/15</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-dashed border-outline-variant">
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-2">AI Optimization Suggestion</p>
                    <p className="text-xs italic text-on-surface-variant">"Rephrase 'Distributed Systems' to 'Large Scale Agentic Architectures' to increase relevance by 12%."</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Value Proposition */}
        <section id="features-section" className="py-24 px-6 md:px-12 bg-surface-container-low">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-primary-container mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Precision Workflow</h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto">Our agentic engine automates the friction of job seeking through technical rigor and data-driven optimization.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-surface-container-lowest p-10 rounded-[2rem] flex flex-col md:flex-row gap-8 items-center shadow-sm">
                <div className="flex-1">
                  <h3 className="text-2xl font-extrabold mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Resume Architecting</h3>
                  <p className="text-on-surface-variant mb-6 leading-relaxed">Upload once. Our AI deconstructs your experience into a modular knowledge graph, rebuilding it specifically for every target role's ATS requirements.</p>
                  <ul className="space-y-3">
                    {['Semantic Keyword Extraction', 'Formatting Protocol Verification'].map((item) => (
                      <li key={item} className="flex items-center gap-3 text-sm font-medium">
                        <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="bg-primary-container p-10 rounded-[2rem] text-on-primary shadow-xl">
                <div className="h-12 w-12 rounded-xl bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed mb-8">
                  <span className="material-symbols-outlined">send</span>
                </div>
                <h3 className="text-2xl font-extrabold mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Auto-Applications</h3>
                <p className="text-on-primary-container text-sm leading-relaxed mb-6">Let our agents handle the heavy lifting. We submit your optimized profile to compatible listings while you focus on interviews.</p>
              </div>
              <div className="bg-surface-container-lowest p-10 rounded-[2rem] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="h-12 w-12 rounded-xl bg-surface-container-high flex items-center justify-center text-primary-container mb-8">
                    <span className="material-symbols-outlined">distance</span>
                  </div>
                  <h3 className="text-2xl font-extrabold mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Map-Based Curation</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed">Visualize your career growth. Filter by tech hubs, salary density, and commute optimization scores.</p>
                </div>
              </div>
              <div className="md:col-span-2 bg-surface-container-lowest p-10 rounded-[2rem] shadow-sm flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1 order-2 md:order-1">
                  <h3 className="text-2xl font-extrabold mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>ATS Optimization Protocol</h3>
                  <p className="text-on-surface-variant mb-6 leading-relaxed">Our engine simulates common Applicant Tracking Systems to ensure your resume never hits a 'disqualify' filter due to formatting or semantics.</p>
                  <div className="flex gap-4">
                    {['PDF Clean', 'Standard UTF-8'].map((tag) => (
                      <div key={tag} className="px-4 py-2 bg-tertiary-container/5 rounded-lg border border-on-tertiary-container/10">
                        <span className="text-on-tertiary-container text-xs font-bold">{tag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Auth Section */}
        <section id="auth-section" className="py-24 px-6 md:px-12 bg-surface">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-extrabold tracking-tighter text-primary-container mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>Initialize Your Professional Node.</h2>
              <p className="text-on-surface-variant mb-8 text-lg">Join the Precision-Tech ecosystem to start your automated journey. One account, infinite career possibilities.</p>
              <div className="space-y-6">
                {[
                  { icon: 'security', title: 'Enterprise Privacy', desc: 'Your data is encrypted and never sold to third-party scrapers.' },
                  { icon: 'sync_alt', title: 'Seamless Integration', desc: 'Sync with LinkedIn, GitHub, and major job boards instantly.' },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-surface-container-high">
                      <span className="material-symbols-outlined">{icon}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{title}</h4>
                      <p className="text-xs text-on-surface-variant">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface-container-lowest p-8 md:p-12 rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-outline-variant/10">
              {/* Tab Switcher */}
              <div className="flex gap-4 mb-8">
                {(['login', 'register'] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setError(null); }}
                    className={`text-sm font-bold pb-1 capitalize transition-colors ${tab === t ? 'text-primary border-b-2 border-teal-500' : 'text-on-surface-variant hover:text-primary'}`}
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                {tab === 'register' && (
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mb-2 ml-1">Full Name</label>
                    <input
                      className="w-full px-5 py-4 rounded-xl bg-surface-container-low border-none focus:ring-2 focus:ring-on-tertiary-container/30 text-sm outline-none"
                      placeholder="Alex Vance"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mb-2 ml-1">Work Email</label>
                  <input
                    className="w-full px-5 py-4 rounded-xl bg-surface-container-low border-none focus:ring-2 focus:ring-on-tertiary-container/30 text-sm outline-none"
                    placeholder="name@company.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mb-2 ml-1">Credentials</label>
                  <input
                    className="w-full px-5 py-4 rounded-xl bg-surface-container-low border-none focus:ring-2 focus:ring-on-tertiary-container/30 text-sm outline-none"
                    placeholder="••••••••"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs font-medium">
                    {error}
                  </div>
                )}

                <button
                  className="w-full ink-gradient text-on-primary py-4 rounded-xl font-bold text-sm tracking-tight shadow-lg disabled:opacity-50"
                  type="submit"
                  disabled={isSubmitting}
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  {isSubmitting ? 'Processing...' : tab === 'login' ? 'Access Engine' : 'Initialize Node'}
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-900 w-full py-8 mt-auto border-t border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-center px-8 gap-4">
          <div className="flex flex-col items-center md:items-start">
            <span className="text-slate-50 font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Precision-Tech Editorial</span>
            <p className="text-xs leading-relaxed text-slate-500 max-w-sm text-center md:text-left">
              © 2024 Precision-Tech Editorial. AI outputs are probabilistic; verify critical data.
            </p>
          </div>
          <nav className="flex gap-6">
            {['Privacy Policy', 'Terms of Service', 'AI Ethics Disclaimer', 'Support'].map((item) => (
              <a key={item} className="text-xs text-slate-500 hover:text-teal-400 transition-colors" href="#">{item}</a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
