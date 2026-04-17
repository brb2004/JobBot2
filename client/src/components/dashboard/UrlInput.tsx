import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useStore } from '../../store/useStore';

export const UrlInput = () => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const addJob = useStore((state) => state.addJob);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    try {
      const data = await apiFetch<{ jobId: string }>('/api/agents/auto_pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      addJob({
        id: data.jobId,
        status: 'pending',
        progress: 0,
      });
      setUrl('');
    } catch (error) {
      console.error('Error starting evaluation:', error);
      alert('Failed to start evaluation. Please check the URL and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-3xl mx-auto">
      <div className="relative flex-1">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste job URL to start evaluation..."
          className="w-full px-4 py-3 pl-4 pr-12 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
          required
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center min-w-[120px]"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <span className="flex items-center gap-2">
            Start <Send className="w-4 h-4" />
          </span>
        )}
      </button>
    </form>
  );
};
