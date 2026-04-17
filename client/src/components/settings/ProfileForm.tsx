import React from 'react';
import { User, Save, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import WeightSliders from '../onboarding/WeightSliders';

interface ProfileData {
  name?: string;
  email?: string;
  current_job_title?: string;
  dimension_weights: {
    [key: string]: number;
  };
}

interface ProfileFormProps {
  profile: ProfileData | null;
  setProfile: (profile: ProfileData | null) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  saveStatus: 'idle' | 'success' | 'error';
}

const ProfileForm: React.FC<ProfileFormProps> = ({ 
  profile, 
  setProfile, 
  onSave, 
  isSaving, 
  saveStatus 
}) => {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
        <User className="w-5 h-5 text-slate-400" />
        <h2 className="text-xl font-semibold text-slate-900">Profile Information</h2>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Full Name</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={profile?.name || ''}
              onChange={(e) => setProfile(prev => prev ? { ...prev, name: e.target.value } : null)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Email Address</label>
            <input 
              type="email" 
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={profile?.email || ''}
              onChange={(e) => setProfile(prev => prev ? { ...prev, email: e.target.value } : null)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Current Job Title</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={profile?.current_job_title || ''}
              onChange={(e) => setProfile(prev => prev ? { ...prev, current_job_title: e.target.value } : null)}
            />
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100">
          <WeightSliders 
            weights={profile?.dimension_weights || {}} 
            setWeights={(weights) => setProfile(prev => prev ? { ...prev, dimension_weights: weights } : null)} 
          />
        </div>

        <div className="flex justify-end items-center gap-4 pt-6">
          {saveStatus === 'success' && (
            <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
              <CheckCircle className="w-4 h-4" /> Saved
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-1 text-red-600 text-sm font-medium">
              <AlertCircle className="w-4 h-4" /> Error saving
            </div>
          )}
          <button 
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Profile
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProfileForm;
