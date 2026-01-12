// API client for SamplePacker AI integration
export interface SamplePackRequest {
  prompt: string;
  bpm?: number;
  key?: string;
  duration?: number;
  stems?: number | string[];
  seed_base?: number;
  model_size?: 'small' | 'medium';
  guidance?: number;
  cover_model?: 'pil' | 'grfft';
  workflow?: string;
}

export interface SamplePackJob {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'timeout';
  created_at: string;
  updated_at?: string;
  comfy_prompt_id?: string;
  estimated_duration?: string;
  progress?: number;
  processing_time?: number;
  elapsed_time?: number;
  debug_info?: {
    audio_files_found?: number;
    expected_stems?: number;
    comfy_status?: string;
    comfy_prompt_id?: string;
    has_manifest?: boolean;
    elapsed_minutes?: number;
  };
  parameters?: {
    bpm: number;
    key: string;
    duration: number;
    stems: number;
    seed_base: number;
    model_size: string;
    guidance: number;
  };
  outputs?: {
    manifest?: string;
    audio_files?: string[];
    image_url?: string;
  };
}

export interface BitcoinImageRequest {
  imageData: string; // Base64 data URL from canvas
  blockHeight: number;
  dataSource: 'merkleRoot' | 'hash';
  seed?: number;
  stemSegments?: string[]; // 8 segments of hex data for audio generation
}

export interface SamplePackManifest {
  job_id: string;
  prompt: string;
  parameters: {
    bpm: number;
    key: string;
    stems_count: number;
  };
  created_at: string;
  format_version: string;
  audio: Array<{
    filename: string;
    path: string;
    stem: string;
    sample_rate: number;
    duration_estimate: number;
  }>;
  cover?: {
    filename: string;
    path: string;
    size: number;
  } | null;
  stats: {
    total_files: number;
    total_duration_estimate: number;
  };
}

export class SamplePackerAPI {
  private baseURL: string;
  private retryAttempts: number;
  private retryDelay: number;
  private isHealthy: boolean | null;

  constructor(baseURL: string = 'http://localhost:3003/api', retryAttempts: number = 3, retryDelay: number = 1000) {
    this.baseURL = baseURL;
    this.retryAttempts = retryAttempts;
    this.retryDelay = retryDelay;
    this.isHealthy = null;
  }

  private async fetchWithRetry(url: string, options: RequestInit = {}, attempts: number = this.retryAttempts): Promise<Response> {
    const timeoutMs = 10000; // 10 second timeout
    
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });
        
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        const isLastAttempt = attempt === attempts;
        
        if (error instanceof Error) {
          // Check for network errors
          if (error.name === 'TypeError' && error.message.includes('fetch')) {
            if (isLastAttempt) {
              throw new Error('Cannot connect to backend server. Please ensure the SamplePacker gateway is running on port 3003.');
            }
          } else if (error.name === 'AbortError') {
            if (isLastAttempt) {
              throw new Error('Request timeout - backend server is not responding.');
            }
          } else if (isLastAttempt) {
            throw error;
          }
        } else if (isLastAttempt) {
          throw new Error('Unknown network error occurred');
        }
        
        // Wait before retrying (exponential backoff)
        if (!isLastAttempt) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }
    
    throw new Error('Failed to fetch after multiple attempts');
  }

  async createSamplePack(request: SamplePackRequest): Promise<SamplePackJob> {
    const response = await this.fetchWithRetry(`${this.baseURL}/packs`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getJobStatus(jobId: string): Promise<SamplePackJob> {
    const response = await this.fetchWithRetry(`${this.baseURL}/jobs/${jobId}`, {}, 2); // Less retries for polling

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async listJobs(status?: string, limit?: number, offset?: number): Promise<SamplePackJob[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    const response = await this.fetchWithRetry(`${this.baseURL}/jobs?${params}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      return data;
    }

    if (data && Array.isArray(data.jobs)) {
      return data.jobs;
    }

    return [];
  }

  async deleteJob(jobId: string): Promise<void> {
    const response = await this.fetchWithRetry(`${this.baseURL}/jobs/${jobId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
  }

  async downloadFile(filename: string): Promise<Blob> {
    const response = await this.fetchWithRetry(`${this.baseURL}/files/${filename}`);

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    return response.blob();
  }

  async getJobManifest(jobId: string): Promise<SamplePackManifest> {
    const job = await this.getJobStatus(jobId);
    
    if (job.status !== 'completed' || !job.outputs?.manifest) {
      throw new Error('Job is not completed or manifest is not available');
    }

    const manifestFilename = job.outputs.manifest.replace('/files/', '');
    const manifestBlob = await this.downloadFile(manifestFilename);
    const manifestText = await manifestBlob.text();
    
    return JSON.parse(manifestText);
  }

  async checkHealth(): Promise<{ status: string; timestamp: string; uptime: number }> {
    try {
      const response = await this.fetchWithRetry(`${this.baseURL}/health`, {}, 1); // Single attempt for health check

      if (!response.ok) {
        this.isHealthy = false;
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      this.isHealthy = true;
      return response.json();
    } catch (error) {
      this.isHealthy = false;
      throw error;
    }
  }

  getHealthStatus(): boolean | null {
    return this.isHealthy;
  }

  async createBitcoinImage(request: BitcoinImageRequest): Promise<SamplePackJob> {
    const response = await this.fetchWithRetry(`${this.baseURL}/bitcoin/image`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async listWorkflows(): Promise<Array<{value: string, label: string, name: string, type: string}>> {
    const response = await this.fetchWithRetry(`${this.baseURL}/workflows`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.workflows || [];
  }
}

// Export singleton instance
export const samplePackerAPI = new SamplePackerAPI();
