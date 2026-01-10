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
  };
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

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
  }

  async createSamplePack(request: SamplePackRequest): Promise<SamplePackJob> {
    const response = await fetch(`${this.baseURL}/packs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getJobStatus(jobId: string): Promise<SamplePackJob> {
    const response = await fetch(`${this.baseURL}/jobs/${jobId}`);

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

    const response = await fetch(`${this.baseURL}/jobs?${params}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteJob(jobId: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/jobs/${jobId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
  }

  async downloadFile(filename: string): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/files/${filename}`);

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
    const response = await fetch(`${this.baseURL}/health`);

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return response.json();
  }
}

// Export singleton instance
export const samplePackerAPI = new SamplePackerAPI();
