import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';

interface StemData {
  index: number;
  segment: string;
  notes: string[];
}

interface BASEPack {
  job_id: string;
  status: string;
  created_at: string;
  parameters: {
    blockHeight: number;
    dataSource: string;
    seed: number;
    stemCount?: number;
  };
  outputs: {
    image_url?: string;
  };
  processing_time?: number;
  type: string;
  stems_file?: string;
}

const BASEPacks: React.FC = () => {
  const [packs, setPacks] = useState<BASEPack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingStems, setPlayingStems] = useState<{ [key: string]: number | null }>({});
  const [loadedStems, setLoadedStems] = useState<{ [key: string]: StemData[] }>({});
  const [expandedPacks, setExpandedPacks] = useState<{ [key: string]: boolean }>({});
  const synthsRef = useRef<{ [key: string]: Tone.Synth[] }>({});

  useEffect(() => {
    fetchBASEPacks();
    
    // Cleanup synths on unmount
    return () => {
      Object.values(synthsRef.current).forEach(synths => {
        synths.forEach(synth => synth.dispose());
      });
    };
  }, []);

  const fetchBASEPacks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/jobs?status=completed');
      if (!response.ok) {
        throw new Error('Failed to fetch BASE packs');
      }
      const data = await response.json();
      
      console.log('Fetched jobs data:', data);
      
      // Filter for bitcoin_image jobs only
      const bitcoinJobs = data.results?.filter((job: BASEPack) => job.type === 'bitcoin_image') || [];
      console.log('Filtered bitcoin_image jobs:', bitcoinJobs.length);
      setPacks(bitcoinJobs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching BASE packs:', err);
    } finally {
      setIsLoading(false);
    }
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

  const loadStems = async (jobId: string, stemsFile: string) => {
    if (loadedStems[jobId]) return loadedStems[jobId];
    
    try {
      const response = await fetch(`/api/files/${stemsFile}`);
      if (!response.ok) throw new Error('Failed to load stems');
      
      const data = await response.json();
      setLoadedStems(prev => ({ ...prev, [jobId]: data.stems }));
      return data.stems;
    } catch (err) {
      console.error('Error loading stems:', err);
      return [];
    }
  };

  const initializeSynths = (jobId: string) => {
    if (synthsRef.current[jobId]) return synthsRef.current[jobId];
    
    const waveforms = ['sine', 'square', 'sawtooth', 'triangle', 'sine', 'square', 'sawtooth', 'triangle'] as const;
    const synths = waveforms.map(wave => 
      new Tone.Synth({
        oscillator: { type: wave },
        envelope: {
          attack: 0.005,
          decay: 0.1,
          sustain: 0.3,
          release: 0.5
        }
      }).toDestination()
    );
    
    synthsRef.current[jobId] = synths;
    return synths;
  };

  const toggleStemPlayback = async (pack: BASEPack, stemIndex: number) => {
    const jobId = pack.job_id;
    
    if (!pack.stems_file) {
      console.error('No stems file available');
      return;
    }

    // If this stem is playing, stop it
    if (playingStems[jobId] === stemIndex) {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      setPlayingStems(prev => ({ ...prev, [jobId]: null }));
      return;
    }

    // Load stems if not already loaded
    let stems = loadedStems[jobId];
    if (!stems) {
      stems = await loadStems(jobId, pack.stems_file);
      if (!stems || stems.length === 0) {
        console.error('No stems loaded');
        return;
      }
    }

    // Stop any currently playing stem
    Tone.Transport.stop();
    Tone.Transport.cancel();

    // Initialize synths
    const synths = initializeSynths(jobId);
    const synth = synths[stemIndex % synths.length];
    const stem = stems[stemIndex];
    
    if (!stem || !stem.notes || stem.notes.length === 0) {
      console.error('No notes in stem');
      return;
    }

    try {
      // Start audio context
      await Tone.start();
      
      // Set transport settings before scheduling
      Tone.Transport.bpm.value = 120;
      Tone.Transport.loop = true;
      
      // Calculate total duration for the loop
      const totalNoteDuration = stem.notes.length * 0.125;
      Tone.Transport.loopEnd = totalNoteDuration;
      
      // Schedule notes for this stem only
      stem.notes.forEach((note: string, noteIndex: number) => {
        const time = noteIndex * 0.125; // 16th notes
        Tone.Transport.schedule(() => {
          synth.triggerAttackRelease(note, '8n');
        }, `+${time}`);
      });

      // Start playback
      Tone.Transport.start();
      setPlayingStems(prev => ({ ...prev, [jobId]: stemIndex }));
    } catch (err) {
      console.error('Error playing stem:', err);
      setPlayingStems(prev => ({ ...prev, [jobId]: null }));
    }
  };

  const downloadPackage = async (pack: BASEPack) => {
    // Download image
    if (pack.outputs?.image_url) {
      const imageLink = document.createElement('a');
      imageLink.href = `/api${pack.outputs.image_url}`;
      imageLink.download = `BASE_block_${pack.parameters.blockHeight}_image.png`;
      imageLink.target = '_blank';
      document.body.appendChild(imageLink);
      imageLink.click();
      document.body.removeChild(imageLink);
    }
    
    // Download stems JSON
    if (pack.stems_file) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between downloads
      const stemsLink = document.createElement('a');
      stemsLink.href = `/api/files/${pack.stems_file}`;
      stemsLink.download = `BASE_block_${pack.parameters.blockHeight}_stems.json`;
      stemsLink.target = '_blank';
      document.body.appendChild(stemsLink);
      stemsLink.click();
      document.body.removeChild(stemsLink);
    }
  };

  const toggleExpanded = async (pack: BASEPack) => {
    const jobId = pack.job_id;
    const isExpanding = !expandedPacks[jobId];
    
    setExpandedPacks(prev => ({ ...prev, [jobId]: isExpanding }));
    
    // Load stems when expanding
    if (isExpanding && pack.stems_file && !loadedStems[jobId]) {
      await loadStems(jobId, pack.stems_file);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-900 via-yellow-900 to-amber-900 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8">Bitcoin Audio Sample Engine (B.A.S.E) Packs</h1>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-900 via-yellow-900 to-amber-900 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8">B.A.S.E Packs</h1>
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-6">
            <p className="text-white text-center">{error}</p>
            <button 
              onClick={fetchBASEPacks}
              className="mt-4 mx-auto block px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-900 via-yellow-900 to-amber-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">B.A.S.E Packs</h1>
            <p className="text-white/70 mt-2">Bitcoin Audio Sample Engine - Generated Packs</p>
          </div>
          <div className="flex gap-3">
            <a
              href="/bitcoin-sample-engine"
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg hover:from-orange-600 hover:to-yellow-600 transition-all font-semibold shadow-lg"
            >
              Create Pack
            </a>
            <button 
              onClick={fetchBASEPacks}
              className="px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {packs.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-6">
              <svg className="w-24 h-24 mx-auto text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-white/60 text-lg mb-6">No B.A.S.E packs yet. Generate your first one!</p>
            <a 
              href="/bitcoin-sample-engine"
              className="inline-block px-8 py-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-yellow-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Create B.A.S.E Pack
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {packs.map((pack) => (
              <div 
                key={pack.job_id} 
                className="bg-white/10 backdrop-blur-md rounded-xl overflow-hidden border border-white/20 hover:border-white/40 transition-all hover:shadow-2xl hover:scale-105"
              >
                {/* Cover Image */}
                <div className="relative aspect-square bg-gradient-to-br from-orange-500/20 to-yellow-500/20">
                  {pack.outputs?.image_url ? (
                    <img 
                      src={`${pack.outputs.image_url}`}
                      alt={`Block ${pack.parameters.blockHeight}`}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <svg className="w-16 h-16 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {/* Block Badge */}
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-white">
                    Block #{pack.parameters.blockHeight}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Title */}
                  <h3 className="text-white font-semibold mb-2">
                    Bitcoin Block #{pack.parameters.blockHeight}
                  </h3>

                  {/* Metadata */}
                  <div className="flex flex-col gap-1 text-xs text-white/60 mb-3">
                    <div className="flex items-center gap-2">
                      <span>Source: {pack.parameters.dataSource === 'merkleRoot' ? 'Merkle Root' : 'Block Hash'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Seed: {pack.parameters.seed}</span>
                    </div>
                    {pack.parameters.stemCount && (
                      <div className="flex items-center gap-2">
                        <span>🎵 {pack.parameters.stemCount} Audio Stems</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span>{formatDate(pack.created_at)}</span>
                    </div>
                    {pack.processing_time && (
                      <div className="flex items-center gap-2">
                        <span>Generated in {pack.processing_time}s</span>
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="mb-3">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      pack.status === 'completed' 
                        ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                        : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                    }`}>
                      {pack.status}
                    </span>
                  </div>

                  {/* Stems Section */}
                  {pack.stems_file && (
                    <div className="mb-3">
                      <button
                        onClick={() => toggleExpanded(pack)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-white text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                          {pack.parameters.stemCount || 8} Audio Stems
                        </span>
                        <svg 
                          className={`w-4 h-4 transition-transform ${expandedPacks[pack.job_id] ? 'rotate-180' : ''}`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {expandedPacks[pack.job_id] && loadedStems[pack.job_id] && (
                        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                          {loadedStems[pack.job_id].map((stem, index) => (
                            <div 
                              key={index}
                              className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded text-xs text-white/80"
                            >
                              <button
                                onClick={() => toggleStemPlayback(pack, index)}
                                className={`p-1 rounded transition-colors ${
                                  playingStems[pack.job_id] === index
                                    ? 'bg-red-500 hover:bg-red-600'
                                    : 'bg-green-500 hover:bg-green-600'
                                }`}
                              >
                                {playingStems[pack.job_id] === index ? (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <rect x="6" y="4" width="4" height="16" />
                                    <rect x="14" y="4" width="4" height="16" />
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                )}
                              </button>
                              <span className="flex-1">Stem {index + 1}</span>
                              <span className="text-white/50">{stem?.notes?.length || 0} notes</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadPackage(pack)}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Pack
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

export default BASEPacks;
