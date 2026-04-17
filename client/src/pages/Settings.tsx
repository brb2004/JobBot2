import React, { useState, useEffect } from 'react';
import { 
   Settings as SettingsIcon 
 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import ProfileForm from '../components/settings/ProfileForm';
import ResumeEditor from '../components/settings/ResumeEditor';

interface ProfileData {

  name?: string;
  email?: string;
  current_job_title?: string;
  dimension_weights: {
    role_match: number;
    skills_alignment: number;
    seniority: number;
    compensation: number;
    interview_likelihood: number;
    company_stage: number;
    product_market_fit: number;
    geographic_feasibility: number;
    growth_trajectory: number;
    hiring_timeline: number;
  };
}

interface ResumeData {
  content_md: string;
  updated_at: string;
}

const Settings = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [resume, setResume] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingResume, setSavingResume] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ profile: 'idle' | 'success' | 'error'; resume: 'idle' | 'success' | 'error' }>({
    profile: 'idle',
    resume: 'idle',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [profileData, resumeData] = await Promise.all([
        apiFetch<any>('/api/profile'),
        apiFetch<ResumeData>('/api/resume'),
      ]);
      
      setProfile({
        name: profileData.name, // This might be missing if not implemented in backend yet
        email: profileData.email, // This might be missing
        current_job_title: profileData.current_job_title,
        dimension_weights: profileData.dimension_weights || {},
      });
      setResume(resumeData.content_md);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    try {
      setSavingProfile(true);
      setSaveStatus(prev => ({ ...prev, profile: 'idle' }));
      
      // Normalize weights to sum to 1.0
      const weights = profile.dimension_weights;
      const weightValues = Object.values(weights);
      const totalWeight = weightValues.reduce((sum, val) => sum + val, 0);
      
      const normalizedWeights = { ...weights };
      if (totalWeight > 0) {
        for (const key in normalizedWeights) {
          normalizedWeights[key] = normalizedWeights[key] / totalWeight;
        }
      } else {
        // Default distribution if all weights are 0
        const keys = Object.keys(weights);
        const defaultWeight = 1 / keys.length;
        keys.forEach(key => {
          normalizedWeights[key] = defaultWeight;
        });
      }

      await apiFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          current_job_title: profile.current_job_title,
          dimension_weights: normalizedWeights,
        }),
      });
      
      setSaveStatus(prev => ({ ...prev, profile: 'success' }));
      setTimeout(() => setSaveStatus(prev => ({ ...prev, profile: 'idle' })), 3000);
    } catch (err: any) {
      setSaveStatus(prev => ({ ...prev, profile: 'error' }));
      alert(`Failed to save profile: ${err.message}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveResume = async () => {
    try {
      setSavingResume(true);
      setSaveStatus(prev => ({ ...prev, resume: 'idle' }));
      
      await apiFetch('/api/resume', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_md: resume }),
      });
      
      setSaveStatus(prev => ({ ...prev, resume: 'success' }));
      setTimeout(() => setSaveStatus(prev => ({ ...prev, resume: 'idle' })), 3000);
    } catch (err: any) {
      setSaveStatus(prev => ({ ...prev, resume: 'error' }));
      alert(`Failed to save resume: ${err.message}`);
    } finally {
      setSavingResume(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
          <div>
            <h3 className="font-semibold text-slate-900">Error</h3>
            <p className="text-sm text-slate-500">{error}</p>
            <button 
              onClick={fetchSettings}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
            <p className="text-slate-500">Manage your profile, evaluation weights, and master resume</p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-12">
          <ProfileForm 
            profile={profile}
            setProfile={setProfile}
            onSave={handleSaveProfile}
            isSaving={savingProfile}
            saveStatus={saveStatus.profile}
          />
          <ResumeEditor 
            resume={resume}
            setResume={setResume}
            onSave={handleSaveResume}
            isSaving={savingResume}
            saveStatus={saveStatus.resume}
          />
        </div>

      </div>
    </div>
  );
};

export default Settings;
