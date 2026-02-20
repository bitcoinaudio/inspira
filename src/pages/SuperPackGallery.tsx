import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { normalizeApiUrl } from '../utils/samplePackerAPI';

interface SuperPackJob {
  job_id: string;
  status: 'processing' | 'completed' | 'failed';
  type?: string;
  created_at?: string;
  updated_at?: string;
  parameters?: {
    blockHeight?: number;
    dataSource?: string;
    includeAudio?: boolean;
  };
  outputs?: {
    image_url?: string;
    video_url?: string;
    audio_stems?: Record<string, string>;
  };
}

const stemOrder = ['drums', 'bass', 'chords', 'melody', 'fx'];

function formatDate(value?: string) {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SuperPackGallery() {
  const [jobs, setJobs] = useState<SuperPackJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const pageSize = 200;
      const maxPages = 3;
      let offset = 0;
      let page = 0;
      const allJobs: SuperPackJob[] = [];

      while (page < maxPages) {
        const response = await fetch(`/api/jobs?limit=${pageSize}&offset=${offset}`);
        if (!response.ok) break;

        const data = await response.json();
        const pageResults = (Array.isArray(data?.results) ? data.results : Array.isArray(data?.jobs) ? data.jobs : []) as SuperPackJob[];

        allJobs.push(...pageResults);
        if (pageResults.length < pageSize) break;

        offset += pageSize;
        page += 1;
      }

      const normalized = allJobs
        .filter((job) => (job.type || '').toLowerCase() === 'superpack')
        .filter((job) => job.status === 'completed')
        .map((job) => ({
          ...job,
          outputs: {
            image_url: normalizeApiUrl(job.outputs?.image_url),
            video_url: normalizeApiUrl(job.outputs?.video_url),
            audio_stems: job.outputs?.audio_stems
              ? Object.fromEntries(
                  Object.entries(job.outputs.audio_stems)
                    .map(([stem, url]) => {
                      const normalizedUrl = normalizeApiUrl(url);
                      return normalizedUrl ? [stem, normalizedUrl] : null;
                    })
                    .filter((entry): entry is [string, string] => entry !== null)
                )
              : undefined,
          },
        }))
        .filter((job) => !!job.outputs?.image_url)
        .sort((a, b) => {
          const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
          const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
          return bTime - aTime;
        });

      setJobs(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch SuperPacks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const sortedStems = (audioStems?: Record<string, string>) => {
    if (!audioStems) return [] as Array<[string, string]>;
    return Object.entries(audioStems).sort((a, b) => {
      const ai = stemOrder.indexOf(a[0]);
      const bi = stemOrder.indexOf(b[0]);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  };

  const hasAudio = useMemo(
    () => jobs.some((job) => !!job.outputs?.audio_stems && Object.keys(job.outputs.audio_stems).length > 0),
    [jobs]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold">SuperPack Gallery</h1>
          </div>
          <div className="flex items-center justify-center h-48">
            <span className="loading loading-spinner loading-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="text-4xl font-bold">SuperPack Gallery</h1>
            <p className="text-base-content/70 mt-2">Browse completed SuperPacks and download visuals, video, and stems.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/inspira/superpack" className="btn btn-outline btn-sm">
              Create SuperPack
            </Link>
            <button onClick={fetchJobs} className="btn btn-ghost btn-sm">
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-error mb-6">
            <span>{error}</span>
          </div>
        )}

        {jobs.length === 0 ? (
          <div className="card bg-base-200 border border-base-300">
            <div className="card-body">
              <p className="text-base-content/70">No completed SuperPacks found yet.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => {
              const stems = sortedStems(job.outputs?.audio_stems);
              const blockHeight = job.parameters?.blockHeight ?? 'Unknown';
              return (
                <div key={job.job_id} className="card bg-base-200 shadow-xl border border-base-300 hover:shadow-2xl transition">
                  <figure className="relative aspect-video bg-base-300 overflow-hidden">
                    {job.outputs?.video_url ? (
                      <video src={job.outputs.video_url} className="w-full h-full object-cover" muted loop playsInline preload="metadata" />
                    ) : job.outputs?.image_url ? (
                      <img src={job.outputs.image_url} alt={`SuperPack ${job.job_id}`} className="w-full h-full object-cover" loading="lazy" />
                    ) : null}
                    <div className="absolute top-2 left-2 flex gap-2">
                      <span className="badge badge-neutral">SuperPack</span>
                      {stems.length > 0 && <span className="badge badge-success">Audio</span>}
                    </div>
                  </figure>

                  <div className="card-body p-4">
                    <div className="text-sm font-semibold">Block {blockHeight}</div>
                    <div className="text-xs text-base-content/60">{formatDate(job.updated_at || job.created_at)}</div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {job.outputs?.image_url && (
                        <a href={job.outputs.image_url} download className="btn btn-xs btn-outline">
                          Download Image
                        </a>
                      )}
                      {job.outputs?.video_url && (
                        <a href={job.outputs.video_url} download className="btn btn-xs btn-outline">
                          Download Video
                        </a>
                      )}
                    </div>

                    {stems.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-base-300">
                        <div className="text-xs font-semibold mb-2">Audio Stems</div>
                        <div className="grid grid-cols-2 gap-2">
                          {stems.map(([stem, url]) => (
                            <a
                              key={`${job.job_id}-${stem}`}
                              href={url}
                              download={`${stem}_${blockHeight}.wav`}
                              className="btn btn-xs btn-outline capitalize"
                            >
                              {stem}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasAudio && (
          <div className="mt-8 text-xs text-base-content/60">
            Cards with an Audio badge include downloadable stems.
          </div>
        )}
      </div>
    </div>
  );
}
