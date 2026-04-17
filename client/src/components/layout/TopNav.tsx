import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navLinks = [
  { label: 'Discover', to: '/dashboard' },
  { label: 'Optimization', to: '/ats' },
  { label: 'Upskilling', to: '/upskilling' },
  { label: 'Applications', to: '/tracker' },
];

export function TopNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getNavActive = (to: string) => {
    if (to === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    return pathname.startsWith(to);
  };

  return (
    <header className="fixed top-0 w-full z-50 glass-nav shadow-sm shadow-slate-200/50">
      <div className="flex justify-between items-center h-16 px-6 max-w-full mx-auto">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="text-xl font-bold tracking-tighter text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Precision-Tech Editorial
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const active = getNavActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-sm font-semibold tracking-tight transition-colors pb-1 ${
                    active
                      ? 'text-slate-900 border-b-2 border-teal-500'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-slate-100/50 transition-all rounded-full">
            <span className="material-symbols-outlined text-on-surface">notifications</span>
          </button>
          <Link to="/settings" className="p-2 hover:bg-slate-100/50 transition-all rounded-full">
            <span className="material-symbols-outlined text-on-surface">settings</span>
          </Link>
          {user && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-colors text-xs font-semibold text-on-surface-variant"
            >
              <div className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center text-white text-xs font-bold">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:block">{user.name || user.email.split('@')[0]}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
