export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
  });

  if (!response.ok) {
    let message = 'An unexpected error occurred';
    try {
      const data = await response.json();
      if (data && typeof data === 'object' && 'message' in data) {
        message = (data as { message: string }).message;
      }
    } catch {
      message = response.statusText || message;
    }
    throw new ApiError(response.status, message);
  }

  return response.json();
}
