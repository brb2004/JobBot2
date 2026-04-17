import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  resumeStrength?: number | null;
  fullWidth?: boolean;
}

export function AppLayout({ children, resumeStrength, fullWidth }: AppLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface">
      <TopNav />
      <div className="flex min-h-screen pt-16">
        <Sidebar
          resumeStrength={resumeStrength}
          onUploadResume={() => navigate('/ats')}
        />
        <main className={`flex-1 ${fullWidth ? '' : 'lg:ml-64'} bg-surface`}>
          {children}
        </main>
      </div>
    </div>
  );
}
