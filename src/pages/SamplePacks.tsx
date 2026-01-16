import React, { useState, useEffect } from 'react';
import PublishToBeatfeedModal from '../components/PublishToBeatfeedModal';

interface AudioFile {
  filename: string;
  path: string;
  url: string;
  stem: string;
  sample_rate: number;
  duration_estimate: number;
}

interface SamplePack {
  job_id: string;
  prompt: string;
  parameters: {
    bpm: number;
    key: string;
    stems_count: number;
  };
  created_at: string;
  format_version: string;
  audio: AudioFile[];
  audio_urls: AudioFile[];
  cover: {
    filename: string;
    path: string;
    size: number;
  } | null;
  cover_url: string | null;
  stats: {
    total_files: number;
    total_duration_estimate: number;
  };
  models?: {
    audio?: string;
    checkpoint?: string;
    lora?: {
      name: string;
      strength: number;
    };
  };
}

const SamplePacks: React.FC = () => {
  const [packs, setPacks] = useState<SamplePack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<{ [key: string]: string | null }>({});
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});
  const [publishModal, setPublishModal] = useState<{ isOpen: boolean; packId: string; packTitle: string }>({
    isOpen: false,
    packId: '',
    packTitle: ''
  });

  useEffect(() => {
    fetchPacks();
  }, []);

  const fetchPacks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/packs');
      if (!response.ok) {
        throw new Error('Failed to fetch sample packs');
      }
      const data = await response.json();
      setPacks(data.packs || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching packs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = (packId: string, audioPath: string) => {
    const key = `${packId}-${audioPath}`;
    
    // Stop any currently playing audio for this pack
    Object.keys(audioElements).forEach(k => {
      if (k.startsWith(packId) && audioElements[k]) {
        audioElements[k].pause();
        audioElements[k].currentTime = 0;
      }
    });

    if (playingAudio[packId] === audioPath) {
      // Stop playing
      setPlayingAudio(prev => ({ ...prev, [packId]: null }));
    } else {
      // Start playing
      if (!audioElements[key]) {
        // Construct full URL with /api prefix
        const fullUrl = audioPath.startsWith('/api') ? audioPath : `/api${audioPath}`;
        const audio = new Audio(fullUrl);
        audio.crossOrigin = 'anonymous';
        audio.addEventListener('ended', () => {
          setPlayingAudio(prev => ({ ...prev, [packId]: null }));
        });
        audio.addEventListener('error', (e) => {
          console.error('Audio playback error:', e);
          setPlayingAudio(prev => ({ ...prev, [packId]: null }));
        });
        setAudioElements(prev => ({ ...prev, [key]: audio }));
        audio.play().catch(err => {
          console.error('Failed to play audio:', err);
          setPlayingAudio(prev => ({ ...prev, [packId]: null }));
        });
      } else {
        audioElements[key].play().catch(err => {
          console.error('Failed to play audio:', err);
          setPlayingAudio(prev => ({ ...prev, [packId]: null }));
        });
      }
      setPlayingAudio(prev => ({ ...prev, [packId]: audioPath }));
    }
  };

  const downloadPack = (packId: string) => {
    window.open(`/api/packs/${packId}/download`, '_blank');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-100 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-primary mb-8">Sample Packs</h1>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-base-content"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-100 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-primary mb-8">Sample Packs</h1>
          <div className="alert alert-error flex flex-col items-center gap-3">
            <span>{error}</span>
            <button 
              onClick={fetchPacks}
              className="btn btn-sm btn-outline"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-primary">Sample Packs</h1>
          <button 
            onClick={fetchPacks}
            className="btn btn-ghost"
          >
            Refresh
          </button>
        </div>

        {packs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-base-content/60 text-lg">No sample packs yet. Generate your first pack!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {packs.map((pack) => (
              <div 
                key={pack.job_id} 
                className="card bg-base-200 shadow-xl border border-base-300 hover:shadow-2xl transition"
              >
                {/* Cover Image */}
                <div className="relative aspect-square bg-base-300">
                  {pack.cover_url ? (
                    <img 
                      src={pack.cover_url.startsWith('/api') ? pack.cover_url : `/api${pack.cover_url}`}
                      alt={pack.prompt}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <svg className="w-16 h-16 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                    </div>
                  )}
                  {/* BPM & Key Badge */}
                  <div className="absolute top-2 right-2 badge badge-neutral">
                    {pack.parameters.bpm} BPM • {pack.parameters.key}
                  </div>
                </div>

                {/* Content */}
                <div className="card-body p-4">
                  {/* Title */}
                  <h3 className="text-base-content font-semibold mb-2 line-clamp-2 min-h-[3rem]">
                    {pack.prompt}
                  </h3>

                  {/* Metadata */}
                  <div className="flex items-center gap-2 text-xs text-base-content/60 mb-3">
                    <span>{pack.audio?.length || 0} stems</span>
                    <span>•</span>
                    <span>{formatDate(pack.created_at)}</span>
                  </div>

                  {/* Model Info */}
                  {pack.models && (
                    <div className="mb-3 text-xs text-base-content/60">
                      {pack.models.checkpoint && (
                        <div className="truncate">🎨 {pack.models.checkpoint.replace('.safetensors', '')}</div>
                      )}
                      {pack.models.audio && (
                        <div className="truncate">🎵 {pack.models.audio}</div>
                      )}
                    </div>
                  )}

                  {/* Audio Stems */}
                  {pack.audio && pack.audio.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {pack.audio.map((audio, idx) => {
                        const audioPath = `/api/files/${audio.path}`;
                        return (
                          <button
                            key={idx}
                            onClick={() => togglePlay(pack.job_id, audioPath)}
                            className={`badge badge-lg gap-2 cursor-pointer transition ${
                              playingAudio[pack.job_id] === audioPath
                                ? 'badge-success'
                                : 'badge-ghost'
                            }`}
                          >
                            {playingAudio[pack.job_id] === audioPath ? '⏸' : '▶'} {audio.stem}
                          </button>
                        );
                      })}flex-col gap-2">
                    <div className="flex gap-2">
                      <a
                        href={`/studio/${pack.job_id}`}
                        className="btn btn-secondary flex-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Studio
                      </a>
                      <button
                        onClick={() => downloadPack(pack.job_id)}
                        className="btn btn-primary flex-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </button>
                    </div>
                    <button
                      onClick={() => setPublishModal({ isOpen: true, packId: pack.job_id, packTitle: pack.prompt })}
                      className="btn btn-warning w-full"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Publish to Beatfeeme="btn btn-primary flex-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">

      {/* Publish to Beatfeed Modal */}
      <PublishToBeatfeedModal
        packId={publishModal.packId}
        packTitle={publishModal.packTitle}
        isOpen={publishModal.isOpen}
        onClose={() => setPublishModal({ ...publishModal, isOpen: false })}
        onSuccess={() => {
          // Optionally refresh packs list
          fetchPacks();
        }}
      />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SamplePacks;
