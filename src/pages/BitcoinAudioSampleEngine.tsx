import React, { useEffect, useState, useCallback, useRef } from 'react';
import * as Tone from 'tone';
import { useBlockchainStore } from '../stores/blockchainStore';
import { samplePackerAPI } from '../utils/samplePackerAPI';

interface Stem {
  id: number;
  segment: string;
  synth: Tone.Synth | null;
  volume: Tone.Volume | null;
  isMuted: boolean;
  isSolo: boolean;
  volumeLevel: number;
}

const BitcoinAudioSampleEngine: React.FC = () => {
  const { currentBlock, fetchAndSetBlock, isLoading } = useBlockchainStore();
  const [blockHeight, setBlockHeight] = useState<number>(0);
  const [dataSource, setDataSource] = useState<'merkleRoot' | 'hash'>('merkleRoot');
  const [stems, setStems] = useState<Stem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [colorGrid, setColorGrid] = useState<string[][]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Hex to note mapping
  const hexToNote: Record<string, string> = {
    '0': 'C2', '1': 'D2', '2': 'E2', '3': 'F2',
    '4': 'G2', '5': 'A2', '6': 'B2', '7': 'C3',
    '8': 'D3', '9': 'E3', 'a': 'F3', 'b': 'G3',
    'c': 'A3', 'd': 'B3', 'e': 'C4', 'f': 'D4'
  };

  // Initialize 8 stems with Tone.js synths
  const initializeStems = useCallback(async (dataString: string) => {
    await Tone.start();
    
    // Divide the 64-character string into 8 segments of 8 characters each
    const segmentSize = Math.floor(dataString.length / 8);
    const newStems: Stem[] = [];

    for (let i = 0; i < 8; i++) {
      const segment = dataString.slice(i * segmentSize, (i + 1) * segmentSize);
      
      // Create a synth for each stem with slight variations
      const synth = new Tone.Synth({
        oscillator: {
          type: ['sine', 'square', 'triangle', 'sawtooth'][i % 4] as any
        },
        envelope: {
          attack: 0.05,
          decay: 0.3,
          sustain: 0.4,
          release: 0.8
        }
      });

      const volume = new Tone.Volume(0);
      synth.connect(volume);
      volume.toDestination();

      newStems.push({
        id: i,
        segment,
        synth,
        volume,
        isMuted: false,
        isSolo: false,
        volumeLevel: 0
      });
    }

    setStems(newStems);
    setIsInitialized(true);
  }, []);

  // Generate color grid from data string
  const generateColorGrid = useCallback((dataString: string) => {
    const grid: string[][] = [];
    const gridSize = 8; // 8x8 grid for 64 values (perfect for 64-char hex string)
    
    for (let row = 0; row < gridSize; row++) {
      const gridRow: string[] = [];
      for (let col = 0; col < gridSize; col++) {
        const index = (row * gridSize + col) % dataString.length;
        const hexChar = dataString[index].toLowerCase();
        const hue = (parseInt(hexChar, 16) / 15) * 360;
        const saturation = 70 + (parseInt(hexChar, 16) % 4) * 10; // Vary saturation
        const lightness = 40 + (parseInt(hexChar, 16) % 3) * 10; // Vary lightness
        const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        gridRow.push(color);
      }
      grid.push(gridRow);
    }
    
    setColorGrid(grid);
    return grid;
  }, []);

  // Draw color grid to canvas
  const drawColorGrid = useCallback((grid: string[][]) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvas.width / grid.length;
    
    grid.forEach((row, rowIndex) => {
      row.forEach((color, colIndex) => {
        ctx.fillStyle = color;
        ctx.fillRect(colIndex * cellSize, rowIndex * cellSize, cellSize, cellSize);
      });
    });
  }, []);

  // Handle block fetch
  const handleFetchBlock = useCallback(async () => {
    if (blockHeight >= 0) {
      await fetchAndSetBlock(blockHeight);
    }
  }, [blockHeight, fetchAndSetBlock]);

  // Generate image from color grid
  const handleGenerateImage = useCallback(async () => {
    if (!canvasRef.current || colorGrid.length === 0 || stems.length === 0) return;

    setIsGeneratingImage(true);
    try {
      const canvas = canvasRef.current;
      const imageDataUrl = canvas.toDataURL('image/png');
      
      // Extract stem segments to send to backend
      const stemSegments = stems.map(stem => stem.segment);
      
      // Call API to generate image using ComfyUI
      const response = await samplePackerAPI.createBitcoinImage({
        imageData: imageDataUrl,
        blockHeight: currentBlock?.height || blockHeight,
        dataSource: dataSource,
        stemSegments: stemSegments
      });

      // Poll for completion
      let jobStatus = response;
      while (jobStatus.status === 'queued' || jobStatus.status === 'processing') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        jobStatus = await samplePackerAPI.getJobStatus(jobStatus.job_id);
      }

      if (jobStatus.status === 'completed' && jobStatus.outputs?.image_url) {
        // Ensure the image URL has the correct base path
        const imageUrl = jobStatus.outputs.image_url.startsWith('http') 
          ? jobStatus.outputs.image_url 
          : `http://localhost:3003${jobStatus.outputs.image_url}`;
        setGeneratedImageUrl(imageUrl);
        console.log('Image generated successfully:', imageUrl);
        
        // Show success message
        alert(`✅ BASE Pack created successfully!\n\nBlock: ${currentBlock?.height || blockHeight}\nJob ID: ${jobStatus.job_id}\n\nView it in the B.A.S.E Packs gallery!`);
      } else if (jobStatus.status === 'failed') {
        throw new Error('Image generation failed');
      } else if (jobStatus.status === 'timeout') {
        throw new Error('Image generation timed out');
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
      alert(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingImage(false);
    }
  }, [colorGrid, currentBlock, blockHeight, dataSource]);

  // Play a stem's pattern
  const playStem = useCallback(async (stem: Stem) => {
    if (!stem.synth || stem.isMuted) return;

    // Ensure Tone.js is started
    await Tone.start();

    const notes = stem.segment
      .toLowerCase()
      .split('')
      .map(char => hexToNote[char])
      .filter(Boolean);

    if (notes.length === 0) return;

    const now = Tone.now();
    notes.forEach((note, index) => {
      stem.synth?.triggerAttackRelease(note, '8n', now + index * 0.15);
    });
    
    console.log(`Playing stem ${stem.id + 1} with ${notes.length} notes`);
  }, [hexToNote]);

  // Play all stems as a sequence
  const playAllStems = useCallback(async () => {
    if (!isInitialized || stems.length === 0) return;

    if (isPlaying) {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      setIsPlaying(false);
      return;
    }

    await Tone.start();
    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.position = 0;

    // Check if any stem is soloed
    const soloedStems = stems.filter(s => s.isSolo);
    const activeStems = soloedStems.length > 0 ? soloedStems : stems.filter(s => !s.isMuted);

    console.log(`Playing ${activeStems.length} active stems`);

    activeStems.forEach((stem, stemIndex) => {
      const notes = stem.segment
        .toLowerCase()
        .split('')
        .map(char => hexToNote[char])
        .filter(Boolean);

      if (notes.length === 0) return;

      console.log(`Stem ${stem.id + 1}: ${notes.length} notes`);

      // Stagger stem start times slightly for texture
      const startOffset = stemIndex * 0.05;
      
      notes.forEach((note, index) => {
        const time = startOffset + (index * 0.2);
        Tone.Transport.schedule((t) => {
          if (stem.synth) {
            stem.synth.triggerAttackRelease(note, '8n', t);
          }
        }, time);
      });
    });

    Tone.Transport.start();
    Tone.Transport.start();
    setIsPlaying(true);

    // Stop after all notes complete
    const maxDuration = Math.max(...activeStems.map(s => s.segment.length)) * 0.2 + 2;
    setTimeout(() => {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      setIsPlaying(false);
    }, maxDuration * 1000);
  }, [isInitialized, stems, isPlaying, hexToNote]);

  // Toggle mute for a stem
  const toggleMute = useCallback((stemId: number) => {
    setStems(prev => prev.map(s => 
      s.id === stemId ? { ...s, isMuted: !s.isMuted } : s
    ));
  }, []);

  // Toggle solo for a stem
  const toggleSolo = useCallback((stemId: number) => {
    setStems(prev => prev.map(s => 
      s.id === stemId ? { ...s, isSolo: !s.isSolo } : s
    ));
  }, []);

  // Adjust volume for a stem
  const adjustVolume = useCallback((stemId: number, volumeLevel: number) => {
    setStems(prev => prev.map(s => {
      if (s.id === stemId && s.volume) {
        s.volume.volume.value = volumeLevel;
        return { ...s, volumeLevel };
      }
      return s;
    }));
  }, []);

  // Initialize when block data changes
  useEffect(() => {
    if (!currentBlock) return;

    const dataString = dataSource === 'merkleRoot' 
      ? currentBlock.merkleRoot.toLowerCase().replace(/[^0-9a-f]/g, '')
      : currentBlock.hash.toLowerCase().replace(/[^0-9a-f]/g, '');

    // Generate color grid
    const grid = generateColorGrid(dataString);
    
    // Initialize stems
    initializeStems(dataString);

    // Draw grid to canvas after a short delay
    setTimeout(() => drawColorGrid(grid), 100);
  }, [currentBlock, dataSource, generateColorGrid, initializeStems, drawColorGrid]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stems.forEach(stem => {
        stem.synth?.dispose();
        stem.volume?.dispose();
      });
      Tone.Transport.stop();
      Tone.Transport.cancel();
    };
  }, [stems]);

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-primary flex items-center gap-3">
              <span className="text-5xl">₿</span>
              Bitcoin Audio Sample Engine (B.A.S.E)
            </h1>
            <p className="text-base-content/70 mt-2">
              Transform Bitcoin blockchain data into unique generative audio stems and visual art
            </p>
          </div>
          <a 
            href="base-packs"
            className="btn btn-outline gap-2"
          >
            🖼️ View Gallery
          </a>
        </div>

        {/* Input Section */}
        <section className="mb-8">
          <div className="card bg-base-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Block Input</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Block Height Input */}
              <div>
                <label className="label">
                  <span className="label-text">Block Height</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={blockHeight}
                    onChange={(e) => setBlockHeight(parseInt(e.target.value) || 0)}
                    placeholder="Enter block height..."
                    className="input input-bordered flex-1"
                    min="0"
                  />
                  <button
                    onClick={handleFetchBlock}
                    disabled={isLoading}
                    className="btn btn-primary"
                  >
                    {isLoading ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      'Load'
                    )}
                  </button>
                </div>
              </div>

              {/* Data Source Selection */}
              <div>
                <label className="label">
                  <span className="label-text">Data Source</span>
                </label>
                <select
                  value={dataSource}
                  onChange={(e) => setDataSource(e.target.value as 'merkleRoot' | 'hash')}
                  className="select select-bordered w-full"
                  disabled={!currentBlock}
                >
                  <option value="merkleRoot">Merkle Root</option>
                  <option value="hash">Block Hash</option>
                </select>
              </div>
            </div>

            {/* Block Info */}
            {currentBlock && (
              <div className="mt-6 space-y-2">
                <div>
                  <span className="text-sm opacity-70">Block Height:</span>
                  <span className="ml-2 font-mono">{currentBlock.height}</span>
                </div>
                <div>
                  <span className="text-sm opacity-70">Merkle Root:</span>
                  <div className="font-mono text-xs break-all">{currentBlock.merkleRoot}</div>
                </div>
                <div>
                  <span className="text-sm opacity-70">Block Hash:</span>
                  <div className="font-mono text-xs break-all">{currentBlock.hash}</div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Visual Grid & Generated Image Section */}
        {currentBlock && (
          <section className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Color Grid */}
              <div className="card bg-base-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Interactive Color Grid</h2>
                  <button
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || colorGrid.length === 0}
                    className="btn btn-sm btn-primary"
                  >
                    {isGeneratingImage ? (
                      <>
                        <span className="loading loading-spinner loading-xs"></span>
                        Generating...
                      </>
                    ) : (
                      '🎨 Generate Image'
                    )}
                  </button>
                </div>

                {/* 8x8 Grid as clickable buttons */}
                <div className="space-y-1">
                  {colorGrid.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex gap-1">
                      {row.map((color, colIndex) => {
                        const dataIndex = rowIndex * 8 + colIndex;
                        const dataString = dataSource === 'merkleRoot' 
                          ? currentBlock?.merkleRoot.toLowerCase().replace(/[^0-9a-f]/g, '')
                          : currentBlock?.hash.toLowerCase().replace(/[^0-9a-f]/g, '');
                        const hexChar = dataString?.[dataIndex % (dataString?.length || 64)] || '0';
                        const note = hexToNote[hexChar];
                        
                        return (
                          <button
                            key={`${rowIndex}-${colIndex}`}
                            onClick={async () => {
                              await Tone.start();
                              const synth = new Tone.Synth().toDestination();
                              synth.triggerAttackRelease(note, '8n');
                              setTimeout(() => synth.dispose(), 300);
                            }}
                            className="flex-1 aspect-square rounded transition-all transform hover:scale-110 hover:ring-2 hover:ring-white"
                            style={{
                              backgroundColor: color,
                              minWidth: '60px',
                              minHeight: '60px'
                            }}
                            title={`${hexChar} → ${note}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
                
                <p className="text-xs text-base-content/60 mt-3">
                  8x8 grid (64 cells) - Click any cell to hear its note
                </p>
                <p className="text-xs text-base-content/60">
                  Source: {dataSource === 'merkleRoot' ? 'Merkle Root' : 'Block Hash'}
                </p>

                {/* Hidden canvas for image generation */}
                <canvas
                  ref={canvasRef}
                  width={512}
                  height={512}
                  className="hidden"
                />
              </div>

              {/* Generated Image */}
              <div className="card bg-base-200 p-6">
                <h2 className="text-xl font-semibold mb-4">Generated Artwork</h2>
                {generatedImageUrl ? (
                  <img
                    src={generatedImageUrl}
                    alt="Generated Bitcoin Art"
                    className="w-full border border-base-300 rounded-lg"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full aspect-square bg-base-300 rounded-lg flex items-center justify-center">
                    <p className="text-base-content/50">Click "Generate Image" to create artwork</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Audio Stems Section */}
        {currentBlock && isInitialized && (
          <section className="mb-8">
            <div className="card bg-base-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">8 Audio Stems</h2>
                <button
                  onClick={playAllStems}
                  className={`btn ${isPlaying ? 'btn-error' : 'btn-success'}`}
                >
                  {isPlaying ? '⏸️ Stop All' : '▶️ Play All'}
                </button>
              </div>

              {/* Stems Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stems.map((stem) => (
                  <div key={stem.id} className="card bg-base-300 p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold">Stem {stem.id + 1}</h3>
                      <button
                        onClick={() => playStem(stem)}
                        className="btn btn-xs btn-circle btn-ghost"
                        disabled={stem.isMuted}
                      >
                        ▶️
                      </button>
                    </div>

                    {/* Segment Display */}
                    <div className="font-mono text-xs bg-base-100 p-2 rounded mb-3 break-all">
                      {stem.segment}
                    </div>

                    {/* Controls */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleMute(stem.id)}
                          className={`btn btn-xs flex-1 ${stem.isMuted ? 'btn-error' : 'btn-ghost'}`}
                        >
                          {stem.isMuted ? '🔇 Muted' : '🔊 Mute'}
                        </button>
                        <button
                          onClick={() => toggleSolo(stem.id)}
                          className={`btn btn-xs flex-1 ${stem.isSolo ? 'btn-warning' : 'btn-ghost'}`}
                        >
                          {stem.isSolo ? '⭐ Solo' : 'Solo'}
                        </button>
                      </div>

                      {/* Volume Slider */}
                      <div>
                        <label className="label py-1">
                          <span className="label-text text-xs">Volume</span>
                          <span className="label-text text-xs">{stem.volumeLevel}dB</span>
                        </label>
                        <input
                          type="range"
                          min="-30"
                          max="0"
                          value={stem.volumeLevel}
                          onChange={(e) => adjustVolume(stem.id, parseFloat(e.target.value))}
                          className="range range-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Info Section */}
        <section className="card bg-base-200 p-6">
          <h2 className="text-xl font-semibold mb-4">How It Works</h2>
          <div className="space-y-2 text-sm text-base-content/80">
            <p>1. Enter a Bitcoin block height and select a data source (Merkle Root or Block Hash)</p>
            <p>2. The 64-character hex string is converted into an 8x8 color grid (1 cell per character)</p>
            <p>3. Click "Generate Image" to send the color grid to ComfyUI for unique AI artwork</p>
            <p>4. The data is divided into 8 segments of 8 characters, each generating a unique audio stem</p>
            <p>5. Control individual stems: play, mute, solo, and adjust volume</p>
            <p>6. Play all stems together to create a unique Bitcoin-blockchain-generated composition</p>
            <p className="text-primary mt-4 font-semibold">💡 Each block creates a completely unique visual and sonic fingerprint</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default BitcoinAudioSampleEngine;
