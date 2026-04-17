import { useState, useEffect } from 'react';

export type JobStatus = 'idle' | 'streaming' | 'completed' | 'failed';

export interface JobStreamState {
  progress: number;
  status: JobStatus;
  result: unknown;
  error: string | null;
}

export function useJobStream(jobId: string | null) {
  const [state, setState] = useState<JobStreamState>({
    progress: 0,
    status: 'idle',
    result: null,
    error: null,
  });

  useEffect(() => {
    if (!jobId) return;

    const eventSource = new EventSource(`/api/stream?jobId=${jobId}`);

    eventSource.onopen = () => {
      setState(prev => ({ ...prev, status: 'streaming', error: null }));
    };

    eventSource.addEventListener('job:progress', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setState(prev => ({ ...prev, progress: data.progress }));
      } catch (e) {
        console.error('Error parsing job:progress event', e);
      }
    });

    eventSource.addEventListener('job:complete', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setState(prev => ({ ...prev, status: 'completed', result: data.result, progress: 100 }));
        eventSource.close();
      } catch (e) {
        console.error('Error parsing job:complete event', e);
      }
    });

    eventSource.addEventListener('job:failed', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setState(prev => ({ ...prev, status: 'failed', error: data.error }));
        eventSource.close();
      } catch (e) {
        console.error('Error parsing job:failed event', e);
      }
    });

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      setState(prev => ({ ...prev, status: 'failed', error: 'Connection lost' }));
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [jobId]);

  return state;
}
