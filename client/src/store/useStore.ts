import { create } from 'zustand';

interface Job {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
}

interface AppState {
  jobs: Job[];
  sseStatus: boolean;
  onboardingStep: number;
  resumeText: string;
  weights: {
    roleMatch: number;
    skillsAlignment: number;
    companyCulture: number;
  };
  
  addJob: (job: Job) => void;
  updateJobProgress: (id: string, progress: number, status?: Job['status']) => void;
  removeJob: (id: string) => void;
  setSSEStatus: (status: boolean) => void;
  setOnboardingStep: (step: number) => void;
  setResumeText: (text: string) => void;
  setWeights: (weights: AppState['weights']) => void;
}

export const useStore = create<AppState>((set) => ({
  jobs: [],
  sseStatus: false,
  onboardingStep: 1,
  resumeText: '',
  weights: {
    roleMatch: 50,
    skillsAlignment: 50,
    companyCulture: 50,
  },

  addJob: (job) => 
    set((state) => ({ 
      jobs: [...state.jobs, job] 
    })),

  updateJobProgress: (id, progress, status) => 
    set((state) => ({
      jobs: state.jobs.map((job) => 
        job.id === id 
          ? { ...job, progress, ...(status ? { status } : {}) } 
          : job
      ),
    })),

  removeJob: (id) => 
    set((state) => ({ 
      jobs: state.jobs.filter((job) => job.id !== id) 
    })),

  setSSEStatus: (status) => 
    set({ sseStatus: status }),

  setOnboardingStep: (step) => 
    set({ onboardingStep: step }),

  setResumeText: (text) => 
    set({ resumeText: text }),

  setWeights: (weights) => 
    set({ weights }),
}));
