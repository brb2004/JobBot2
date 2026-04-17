import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarLink {
  icon: string;
  label: string;
  to: string;
}

const sidebarLinks: SidebarLink[] = [
  { icon: 'folder_supervised', label: 'Job Curation', to: '/dashboard' },
  { icon: 'distance', label: 'Map Search', to: '/map' },
  { icon: 'description', label: 'ATS Check', to: '/ats' },
  { icon: 'school', label: 'My Projects', to: '/upskilling' },
  { icon: 'send', label: 'Workflows', to: '/tracker' },
];

interface SidebarProps {
  resumeStrength?: number | null;
  onUploadResume?: () => void;
}

export function Sidebar({ resumeStrength, onUploadResume }: SidebarProps) {
  const { pathname } = useLocation();

  const isActive = (to: string) => {
    if (to === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(to);
  };

  return (
    <aside className="hidden lg:flex flex-col gap-2 p-4 h-screen w-64 fixed left-0 top-0 pt-20 bg-surface-container-low">
      <div className="mb-6 px-3 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center">
          <span className="material-symbols-outlined text-tertiary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
        </div>
        <div>
          <h3 className="font-bold text-sm leading-none" style={{ fontFamily: 'Manrope, sans-serif' }}>AI Engine</h3>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">Match Score Optimized</p>
        </div>
      </div>

      <nav className="space-y-1">
        {sidebarLinks.map(({ icon, label, to }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 p-3 rounded-lg font-medium text-xs transition-all ${
                active
                  ? 'bg-teal-50 text-teal-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              <span
                className="material-symbols-outlined"
                style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {icon}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-4 bg-primary-container rounded-xl text-white">
        <p className="text-[10px] text-on-primary-container font-semibold uppercase tracking-wider mb-2">Resume Strength</p>
        <div className="flex items-end justify-between mb-2">
          <span className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {resumeStrength != null ? `${resumeStrength}%` : '--'}
          </span>
        </div>
        {resumeStrength != null && (
          <div className="w-full bg-slate-700 h-1 rounded-full overflow-hidden mb-3">
            <div className="bg-tertiary-fixed h-full transition-all" style={{ width: `${resumeStrength}%` }} />
          </div>
        )}
        <button
          onClick={onUploadResume}
          className="w-full bg-white text-primary-container text-xs font-bold py-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          Upload Resume
        </button>
      </div>
    </aside>
  );
}
