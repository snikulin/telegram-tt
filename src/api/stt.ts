export interface SttWord {
  start: number;
  end: number;
  text: string;
  confidence: number;
}

export interface SttJobResponse {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text: string | null;
  error: string | null;
  language: string | null;
  created_at: string;
  updated_at: string;
  words: SttWord[] | null;
}

export interface SttHealthResponse {
  ok: boolean;
  model_ready: boolean;
  model_path: string;
  whisper_cli: string;
  queue_size: number;
  model_error: string | null;
}

export async function checkSttHealth(serverUrl: string): Promise<SttHealthResponse | undefined> {
  try {
    const response = await fetch(`${serverUrl}/health`);
    if (!response.ok) {
      return undefined;
    }
    return await response.json();
  } catch {
    return undefined;
  }
}

export async function createTranscriptionJob(
  serverUrl: string,
  audioBlob: Blob,
  apiKey?: string,
): Promise<SttJobResponse | undefined> {
  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'voice.ogg');

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${serverUrl}/v1/transcriptions`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      return undefined;
    }

    return await response.json();
  } catch {
    return undefined;
  }
}

export async function pollTranscriptionResult(
  serverUrl: string,
  jobId: string,
  apiKey?: string,
  intervalMs = 2000,
  maxAttempts = 60,
): Promise<SttJobResponse | undefined> {
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`${serverUrl}/v1/transcriptions/${jobId}`, { headers });

      if (!response.ok) {
        return undefined;
      }

      const job: SttJobResponse = await response.json();

      if (job.status === 'completed' || job.status === 'error') {
        return job;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    } catch {
      return undefined;
    }
  }

  return undefined;
}
