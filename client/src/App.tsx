import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { AtsOptimization } from './pages/AtsOptimization';
import { Upskilling } from './pages/Upskilling';
import { MapSearch } from './pages/MapSearch';
import { EvaluationDetail } from './pages/EvaluationDetail';
import { Tracker } from './pages/Tracker';
import './App.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-tertiary-fixed" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
          </div>
          <p className="text-on-surface-variant text-sm">Initializing engine...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RootRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center">
          <span className="material-symbols-outlined text-tertiary-fixed" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
        </div>
      </div>
    );
  }
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/ats" element={<ProtectedRoute><AtsOptimization /></ProtectedRoute>} />
      <Route path="/upskilling" element={<ProtectedRoute><Upskilling /></ProtectedRoute>} />
      <Route path="/map" element={<ProtectedRoute><MapSearch /></ProtectedRoute>} />
      <Route path="/eval/:evalId" element={<ProtectedRoute><EvaluationDetail /></ProtectedRoute>} />
      <Route path="/tracker" element={<ProtectedRoute><Tracker /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
