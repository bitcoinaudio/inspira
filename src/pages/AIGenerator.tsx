import React, { useState, useEffect } from 'react';
import { useSamplePackGenerator, type GenerationRequest } from '../hooks/useSamplePackGenerator';
import { useBlockchainStore } from '../stores/blockchainStore';
import { samplePackerAPI } from '../utils/samplePackerAPI';

const AIGenerator: React.FC = () => {
  const {
    isGenerating,
    currentJob,
    generationResult,
    error,
    progress,
    generateSamplePack,
    cancelGeneration,
    clearResults,
    cleanup
  } = useSamplePackGenerator();

  const { currentBlock, bnsPrompt, bnsMatches, fetchAndSetBlock, isLoading: isLoadingBlock } = useBlockchainStore();

  const [prompt, setPrompt] = useState('');
  const [blockHeightInput, setBlockHeightInput] = useState('');
  const [bpm, setBpm] = useState(120);
  const [key, setKey] = useState('Cmin');
  const [duration, setDuration] = useState(8);
  const [stems, setStems] = useState(2);
  const [modelSize, setModelSize] = useState<'small' | 'medium'>('small');
  const [guidance, setGuidance] = useState(3.0);
  const [workflow, setWorkflow] = useState('inspira-packs/rad-graff-v1');
  const [availableWorkflows, setAvailableWorkflows] = useState<Array<{
    value: string;
    label: string;
    name: string;
    type?: string;
    category?: string;
    categoryLabel?: string;
  }>>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(true);

  const samplePrompts = [
    'lofi hip hop with vinyl texture and warm bass',
    'upbeat electronic dance music with heavy bass',
    'chill ambient soundscape with ethereal pads',
    'graffiti lofi 80s vibe with retro drums',
    'boom bap hip hop with classic breaks',
    'dark trap beat with heavy 808s',
    'jazz-influenced hip hop with smooth chords',
    'synthwave retrowave with analog warmth'
  ];

  const stemOptions = [
    { value: 0, label: '0 stems (Image Only)' },
    { value: 1, label: '1 stem (Drums)' },
    { value: 2, label: '2 stems (Drums + Bass)' },
    { value: 3, label: '3 stems (Drums + Bass + Chords)' },
    { value: 4, label: '4 stems (+ Melody)' },
    { value: 5, label: '5 stems (+ FX)' }
  ];

  const keyOptions = [
    'Cmaj', 'Cmin', 'Dmaj', 'Dmin', 'Emaj', 'Emin',
    'Fmaj', 'Fmin', 'Gmaj', 'Gmin', 'Amaj', 'Amin', 'Bmaj', 'Bmin'
  ];

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Fetch available workflows from the API
  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const workflows = await samplePackerAPI.listWorkflows();
        setAvailableWorkflows(workflows);
        
        // Set default workflow to first inspira-packs workflow if available
        if (workflows.length > 0 && !workflow) {
          const inspiraWorkflow = workflows.find(w => (w as any).category === 'inspira-packs' || w.value.includes('inspira-packs'));
          if (inspiraWorkflow) {
            setWorkflow(inspiraWorkflow.value);
          } else {
            setWorkflow(workflows[0].value);
          }
        }
      } catch (error) {
        console.error('Error fetching workflows:', error);
        // Fallback to default workflows with new structure
        setAvailableWorkflows([
          { 
            value: 'inspira-packs/rad-graff-v1',
            label: 'Rad Graff V1',
            name: 'rad-graff-v1',
            category: 'inspira-packs',
            categoryLabel: 'Inspira Packs'
          },
          {
            value: 'base-packs/bitcoin-image-v1',
            label: 'Bitcoin Image V1',
            name: 'bitcoin-image-v1',
            category: 'base-packs',
            categoryLabel: 'Base Packs'
          }
        ]);
      } finally {
        setIsLoadingWorkflows(false);
      }
    };

    fetchWorkflows();
  }, []);

  useEffect(() => {
    if (bnsPrompt && currentBlock) {
      setPrompt(bnsPrompt);
    }
  }, [bnsPrompt, currentBlock]);

  const handleFetchBlock = async () => {
    const height = parseInt(blockHeightInput);
    if (!isNaN(height) && height >= 0) {
      await fetchAndSetBlock(height);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    const request: GenerationRequest = {
      prompt: prompt.trim(),
      bpm: Number(bpm),
      key,
      duration: Number(duration),
      stems: Number(stems),
      model_size: modelSize,
      guidance: Number(guidance),
      cover_model: "grfft",
      workflow: workflow || 'rad-graff-v1'
    };

    console.log('[AIGenerator] Generation request:', request);

    try {
      await generateSamplePack(request);
    } catch (err) {
      console.error('Generation failed:', err);
    }
  };

  const handleDownloadPackage = () => {
    if (!currentJob?.job_id) return;

    const params = new URLSearchParams({
      artist: 'Inspira Artist',
      name: generationResult?.manifest?.prompt || 'AI Sample Pack',
      commercial: 'true',
      credits: 'true'
    });

    const downloadUrl = `/api/packs/${currentJob.job_id}/package?${params.toString()}`;
    window.location.href = downloadUrl;
  };

  return (
    <div className="p-6 min-h-screen bg-base-100">
      <div className="max-w-6xl mx-auto">
        <div className="card bg-base-200 shadow-lg">
          <div className="card-body">
            <h1 className="text-3xl font-bold text-primary mb-2 text-center">
              Inspira Sample Pack Generator
            </h1>
            <p className="text-base-content opacity-70 text-center mb-6">
              Create custom music and sample packs with AI
            </p>
            
            {/* Generation Form */}
            <div className="space-y-6 mb-8">
              {/* Bitcoin Block BNS Section */}
              <div className="bg-base-300 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                   <h3 className="text-lg font-semibold">Blockchain Inspiration (BNS)</h3>
                </div>
                <p className="text-sm text-base-content/70 mb-3">
                  Generate prompts from Bitcoin block data using the Bitmap Naming Service algorithm
                </p>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Block Height</label>
                    <input
                      type="number"
                      min="0"
                      value={blockHeightInput}
                      onChange={(e) => setBlockHeightInput(e.target.value)}
                      placeholder={currentBlock ? String(currentBlock.height) : "Enter block height..."}
                      className="input input-bordered w-full bg-base-100"
                      disabled={isLoadingBlock}
                    />
                  </div>
                  <button 
                    onClick={handleFetchBlock}
                    className={`btn btn-primary ${isLoadingBlock ? 'loading' : ''}`}
                    disabled={isLoadingBlock || !blockHeightInput}
                  >
                    {isLoadingBlock ? 'Loading...' : '🔮 Generate BNS Prompt'}
                  </button>
                </div>
                {currentBlock && (
                  <div className="mt-4 space-y-3">
                    <div className="text-xs text-base-content/60 space-y-1">
                      <div><span className="font-medium">Block:</span> {currentBlock.height}</div>
                      <div className="truncate"><span className="font-medium">Merkle:</span> {currentBlock.merkleRoot}</div>
                    </div>
                    
                    {bnsMatches.length > 0 && (
                      <div className="bg-base-100 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold">🔤 BNS Word Matches</span>
                          <span className="text-xs text-base-content/50">(sorted by least shifts)</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {bnsMatches.map((match, idx) => (
                            <div 
                              key={idx}
                              className={`badge badge-lg gap-1 ${
                                match.exactMatch ? 'badge-success' : 
                                match.totalShift <= 3 ? 'badge-primary' :
                                match.totalShift <= 6 ? 'badge-secondary' :
                                'badge-ghost'
                              }`}
                              title={`Window: "${match.window}" → Shifts: [${match.shifts.join(', ')}]`}
                            >
                              <span className="font-bold">{match.word}</span>
                              <span className="opacity-70 text-xs">
                                {match.exactMatch ? '✓' : `±${match.totalShift}`}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-base-content/50 mt-2">
                          Hover over words to see shift details. Lower shifts = closer match to merkle root.
                        </p>
                      </div>
                    )}
                    
                    <div className="text-success font-medium text-sm">✓ BNS prompt generated and applied below</div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-base-content text-sm font-medium mb-2">
                  Describe Your Music
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the style, mood, and characteristics of your music..."
                  className="textarea textarea-bordered w-full bg-base-300 text-base-content placeholder:text-base-content placeholder:opacity-50"
                  rows={3}
                  disabled={isGenerating}
                />
                
                <div className="mt-2">
                  <p className="text-base-content opacity-60 text-xs mb-2">Try these prompts:</p>
                  <div className="flex flex-wrap gap-2">
                    {samplePrompts.map((samplePrompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => setPrompt(samplePrompt)}
                        className="btn btn-xs btn-ghost disabled:opacity-50"
                        disabled={isGenerating}
                      >
                        {samplePrompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Parameters Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-base-content text-sm font-medium mb-2">BPM</label>
                  <input
                    type="number"
                    min="60"
                    max="200"
                    value={bpm}
                    onChange={(e) => setBpm(parseInt(e.target.value))}
                    className="input input-bordered w-full bg-base-300"
                    disabled={isGenerating}
                  />
                </div>

                <div>
                  <label className="block text-base-content text-sm font-medium mb-2">Key</label>
                  <select
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="select select-bordered w-full bg-base-300"
                    disabled={isGenerating}
                  >
                    {keyOptions.map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-base-content text-sm font-medium mb-2">Duration (s)</label>
                  <input
                    type="number"
                    min="4"
                    max="32"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="input input-bordered w-full bg-base-300"
                    disabled={isGenerating}
                  />
                </div>

                <div>
                  <label className="block text-base-content text-sm font-medium mb-2">Stems</label>
                  <select
                    value={stems}
                    onChange={(e) => setStems(Number.parseInt(e.target.value, 10))}
                    className="select select-bordered w-full bg-base-300"
                    disabled={isGenerating}
                  >
                    {stemOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-base-content/50 mt-1">
                    Selected stems: {stems}
                  </div>
                </div>
              </div>

              {/* Advanced Parameters */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-base-content text-sm font-medium mb-2">Workflow</label>
                  <select
                    value={workflow}
                    onChange={(e) => setWorkflow(e.target.value)}
                    className="select select-bordered w-full bg-base-300"
                    disabled={isGenerating || isLoadingWorkflows}
                  >
                    {isLoadingWorkflows ? (
                      <option>Loading workflows...</option>
                    ) : (
                      // Group workflows by category
                      Object.entries(
                        availableWorkflows.reduce((acc, wf) => {
                          const category = wf.categoryLabel || wf.category || 'General';
                          if (!acc[category]) acc[category] = [];
                          acc[category].push(wf);
                          return acc;
                        }, {} as Record<string, typeof availableWorkflows>)
                      ).map(([category, workflows]) => (
                        <optgroup key={category} label={category}>
                          {workflows.map(wf => (
                            <option key={wf.value} value={wf.value}>
                              {wf.label}
                            </option>
                          ))}
                        </optgroup>
                      ))
                    )}
                  </select>
                  <p className="text-xs text-base-content/50 mt-1">
                    Workflows organized by pack type
                  </p>
                </div>

                <div>
                  <label className="block text-base-content text-sm font-medium mb-2">Model Size</label>
                  <select
                    value={modelSize}
                    onChange={(e) => setModelSize(e.target.value as 'small' | 'medium')}
                    className="select select-bordered w-full bg-base-300"
                    disabled={isGenerating}
                  >
                    <option value="small">Small (Faster)</option>
                    <option value="medium">Medium (Better Quality)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-base-content text-sm font-medium mb-2">
                    Guidance ({guidance})
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="0.5"
                    value={guidance}
                    onChange={(e) => setGuidance(parseFloat(e.target.value))}
                    className="range range-primary"
                    disabled={isGenerating}
                  />
                  <div className="flex justify-between text-xs text-base-content opacity-60 mt-1">
                    <span>Creative</span>
                    <span>Precise</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Generation Controls */}
            <div className="flex gap-4 justify-center mb-8">
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="btn btn-primary"
              >
                {isGenerating ? 'Generating...' : '🎵 Generate Music'}
              </button>

              {isGenerating && (
                <button
                  onClick={cancelGeneration}
                  className="btn btn-error"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Progress */}
            {isGenerating && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base-content text-sm">
                    {currentJob?.status === 'queued' ? 'Queued in pipeline...' : 
                     currentJob?.status === 'processing' ? 'Generating music...' : 
                     'Starting...'}
                  </span>
                  <span className="text-base-content text-sm font-medium">{Math.round(progress)}%</span>
                </div>
                <progress className="progress progress-primary w-full" value={progress} max="100"></progress>
                {currentJob && (
                  <div className="text-base-content opacity-60 text-xs mt-2 space-y-1">
                    <div>Job ID: {currentJob.job_id}</div>
                    <div className="flex items-center gap-4">
                      <span>Status: {currentJob.status}</span>
                      {currentJob.elapsed_time && (
                        <span>Elapsed: {Math.round(currentJob.elapsed_time / 1000)}s</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`badge ${progress > 5 ? 'badge-success' : 'badge-ghost'}`}>
                        Queued
                      </span>
                      <span className={`badge ${progress > 20 ? 'badge-success' : 'badge-ghost'}`}>
                        Audio Gen
                      </span>
                      <span className={`badge ${progress > 70 ? 'badge-success' : 'badge-ghost'}`}>
                        Cover Art
                      </span>
                      <span className={`badge ${progress > 85 ? 'badge-success' : 'badge-ghost'}`}>
                        Processing
                      </span>
                      <span className={`badge ${progress === 100 ? 'badge-success' : 'badge-ghost'}`}>
                        Complete
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="alert alert-error mb-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span><strong>Error:</strong> {error}</span>
              </div>
            )}

            {/* Results */}
            {generationResult && (
              <div className="card bg-base-300 shadow-lg">
                <div className="card-body">
                  <h3 className="card-title text-accent mb-4">✨ Generation Complete!</h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Left Column: Cover Art & Parameters */}
                    <div className="space-y-4">
                      {generationResult.manifest?.cover && (
                        <div>
                          <h4 className="text-base-content font-medium mb-2">Cover Art:</h4>
                          <div className="bg-base-100 rounded-lg p-2">
                            <img
                              src={`/api/files/${generationResult.manifest.cover.path}`}
                              alt="Generated cover art"
                              className="w-full h-auto rounded-lg shadow-md"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="text-base-content font-medium mb-2">Parameters:</h4>
                        <div className="bg-base-100 p-4 rounded-lg text-sm space-y-2">
                          <div className="text-base-content opacity-70">
                            <div className="mb-2">
                              <span className="font-medium">Prompt:</span>
                              <div className="text-base-content mt-1">{generationResult.manifest?.prompt}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div><span className="font-medium">BPM:</span> {generationResult.manifest?.parameters.bpm}</div>
                              <div><span className="font-medium">Key:</span> {generationResult.manifest?.parameters.key}</div>
                              <div><span className="font-medium">Stems:</span> {generationResult.manifest?.parameters.stems_count}</div>
                              <div><span className="font-medium">Duration:</span> {generationResult.manifest?.stats.total_duration_estimate.toFixed(1)}s</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <button
                          onClick={handleDownloadPackage}
                          className="btn btn-primary w-full"
                        >
                          📦 Download Product Package
                        </button>

                        <div className="text-xs text-base-content opacity-60 text-center mt-2">
                          Package includes: Audio stems, cover art, README, license
                        </div>
                        
                        <button
                          onClick={clearResults}
                          className="btn btn-ghost w-full"
                        >
                          Clear Results
                        </button>
                      </div>
                    </div>

                    {/* Right Column: Generated Tracks */}
                    <div>
                      <h4 className="text-base-content font-medium mb-2">Generated Tracks:</h4>
                      <div className="space-y-2">
                        {generationResult.manifest?.audio.map((audio, idx) => (
                          <div key={idx} className="card bg-base-100 shadow-sm">
                            <div className="card-body p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <div className="text-base-content font-medium">{audio.stem}</div>
                                  <div className="text-base-content opacity-60 text-xs">
                                    {audio.duration_estimate}s @ {audio.sample_rate}Hz
                                  </div>
                                </div>
                              </div>
                              <audio
                                controls
                                src={generationResult.audioUrls?.[idx]}
                                className="w-full"
                                preload="none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIGenerator;
