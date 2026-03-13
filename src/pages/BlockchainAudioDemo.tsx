import React from 'react';
import BlockchainAudioEngine from '../components/BlockchainAudioEngine';

/**
 * BlockchainAudioDemo - Demo page showcasing the Blockchain Audio Engine
 * 
 * Based on Bitcoin Audio Engine's page2.html, this demonstrates:
 * - Real Bitcoin blockchain data from Blockstream API
 * - Color visualization from block hash/merkle root
 * - Musical playback of blockchain data
 * - Audio effects and controls
 */
const BlockchainAudioDemo: React.FC = () => {
  return (
    <div className="inspira-shell min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-8 rounded-[32px] border border-white/10 bg-white/[0.03] p-6 text-center sm:p-8">
          <span className="inspira-kicker">Blockchain Sonics</span>
          <h1 className="mt-4 text-4xl font-bold text-primary sm:text-5xl">
            Bitcoin Audio
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-base-content/72 sm:text-lg">
            Transform Bitcoin blockchain data into music and visual art. 
            Each block's hash and merkle root become colors, notes, and rhythms.
          </p>
        </div>

        {/* Main Component */}
        <section className="mb-12">
          <div className="inspira-panel rounded-[32px] p-6 shadow-xl">
            <BlockchainAudioEngine
              showNavigator
              showColorPads
              showVisualizer
              showControls
              initialBlockHeight={0}
            />
          </div>
        </section>

        {/* Features Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <span>✨</span>
            Features
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { 
                icon: '⛓️', 
                title: 'Live Blockchain Data', 
                desc: 'Real-time data from Blockstream API - browse any Bitcoin block' 
              },
              { 
                icon: '🎨', 
                title: 'Color Visualization', 
                desc: 'Block hashes become a 64-color palette - click colors to play notes' 
              },
              { 
                icon: '🎵', 
                title: 'Musical Playback', 
                desc: 'Hex characters map to musical notes - play blocks as melodies' 
              },
              { 
                icon: '🌀', 
                title: 'Circular Visualizer', 
                desc: 'Audio-reactive circular display with blockchain-derived colors' 
              },
              { 
                icon: '🎛️', 
                title: 'Effects Chain', 
                desc: 'Reverb, Delay, Chorus, Phaser, Tremolo, Vibrato effects' 
              },
              { 
                icon: '🔢', 
                title: 'Block Navigation', 
                desc: 'Jump ±1, ±10, ±100, ±1k, ±10k, ±100k blocks instantly' 
              },
              { 
                icon: '🌳', 
                title: 'Merkle Root Audio', 
                desc: 'Choose between block hash or merkle root as audio source' 
              },
              { 
                icon: '⏱️', 
                title: 'Tempo Control', 
                desc: 'Adjustable BPM for sequence playback (60-180 BPM)' 
              },
              { 
                icon: '🔊', 
                title: 'Web Audio API', 
                desc: 'Built on Tone.js for professional audio quality' 
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="inspira-panel rounded-[24px] p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <h3 className="font-medium">{title}</h3>
                    <p className="text-sm text-base-content/60">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <span>🔧</span>
            How It Works
          </h2>

          <div className="inspira-panel rounded-[30px] p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl mb-3">1️⃣</div>
                <h3 className="font-bold mb-2">Fetch Block</h3>
                <p className="text-sm text-base-content/70">
                  Enter a block height or navigate through the blockchain. 
                  Data is fetched from Blockstream's public API.
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">2️⃣</div>
                <h3 className="font-bold mb-2">Extract Data</h3>
                <p className="text-sm text-base-content/70">
                  The block's merkle root or hash (64 hex characters) 
                  is sliced into colors and musical notes.
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">3️⃣</div>
                <h3 className="font-bold mb-2">Play & Visualize</h3>
                <p className="text-sm text-base-content/70">
                  Click colors to play notes, or hit Play to sequence 
                  through the entire block as music.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 p-4">
              <h4 className="font-medium mb-2">Hex to Note Mapping</h4>
              <div className="grid grid-cols-8 gap-2 text-xs font-mono">
                {Object.entries({
                  '0': 'C2', '1': 'D2', '2': 'E2', '3': 'F2',
                  '4': 'G2', '5': 'A2', '6': 'B2', '7': 'C3',
                  '8': 'D3', '9': 'E3', 'a': 'F3', 'b': 'G3',
                  'c': 'A3', 'd': 'B3', 'e': 'C4', 'f': 'D4',
                }).map(([hex, note]) => (
                  <div key={hex} className="rounded-2xl border border-white/10 bg-white/5 p-2 text-center">
                    <div className="text-primary">{hex}</div>
                    <div className="text-base-content/60">{note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Usage Examples */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <span>📝</span>
            Usage Examples
          </h2>

          <div className="mockup-code border border-white/10 bg-black/20">
            <pre data-prefix="1"><code>{`// Import the full component`}</code></pre>
            <pre data-prefix="2"><code>{`import BlockchainAudioEngine from './components/BlockchainAudioEngine';`}</code></pre>
            <pre data-prefix="3"><code>{``}</code></pre>
            <pre data-prefix="4"><code>{`// Use in your app`}</code></pre>
            <pre data-prefix="5"><code>{`<BlockchainAudioEngine`}</code></pre>
            <pre data-prefix="6"><code>{`  showNavigator`}</code></pre>
            <pre data-prefix="7"><code>{`  showColorPads`}</code></pre>
            <pre data-prefix="8"><code>{`  showVisualizer`}</code></pre>
            <pre data-prefix="9"><code>{`  showControls`}</code></pre>
            <pre data-prefix="10"><code>{`  initialBlockHeight={0}`}</code></pre>
            <pre data-prefix="11"><code>{`/>`}</code></pre>
          </div>

          <div className="mt-4 mockup-code border border-white/10 bg-black/20">
            <pre data-prefix="1"><code>{`// Use hooks for custom implementations`}</code></pre>
            <pre data-prefix="2"><code>{`import { useBlockchainData, useBlockchainSynth } from './components/BlockchainAudioEngine';`}</code></pre>
            <pre data-prefix="3"><code>{``}</code></pre>
            <pre data-prefix="4"><code>{`function MyComponent() {`}</code></pre>
            <pre data-prefix="5"><code>{`  const blockchain = useBlockchainData();`}</code></pre>
            <pre data-prefix="6"><code>{`  const synth = useBlockchainSynth();`}</code></pre>
            <pre data-prefix="7"><code>{``}</code></pre>
            <pre data-prefix="8"><code>{`  // Fetch block #500000`}</code></pre>
            <pre data-prefix="9"><code>{`  await blockchain.fetchBlock(500000);`}</code></pre>
            <pre data-prefix="10"><code>{``}</code></pre>
            <pre data-prefix="11"><code>{`  // Play the block as music`}</code></pre>
            <pre data-prefix="12"><code>{`  synth.playSequence(blockchain.audioString);`}</code></pre>
            <pre data-prefix="13"><code>{`}`}</code></pre>
          </div>
        </section>

        {/* Famous Blocks */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <span>🏆</span>
            Famous Blocks to Try
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { height: 0, name: 'Genesis Block', desc: 'The first Bitcoin block' },
              { height: 170, name: 'First TX Block', desc: 'First person-to-person transaction' },
              { height: 210000, name: 'First Halving', desc: 'Block reward halved to 25 BTC' },
              { height: 420000, name: 'Second Halving', desc: 'Block reward halved to 12.5 BTC' },
              { height: 630000, name: 'Third Halving', desc: 'Block reward halved to 6.25 BTC' },
              { height: 840000, name: 'Fourth Halving', desc: 'Block reward halved to 3.125 BTC' },
              { height: 500000, name: '500K Milestone', desc: 'Half million blocks' },
              { height: 100000, name: '100K Milestone', desc: 'Hundred thousand blocks' },
            ].map(({ height, name, desc }) => (
              <div 
                key={height} 
                className="inspira-panel cursor-pointer rounded-[24px] p-4 transition-colors hover:border-primary/35 hover:bg-primary/10"
                onClick={() => {
                  console.log('Navigate to block:', height);
                }}
              >
                <div className="font-mono text-lg text-primary">#{height.toLocaleString()}</div>
                <div className="font-medium">{name}</div>
                <div className="text-xs text-base-content/60">{desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-8 text-center text-sm text-base-content/50">
          <p>
            Based on the original Bitcoin Audio Engine
          </p>
          <p className="mt-1">
            Built with React, Tone.js, TailwindCSS & Blockstream API
          </p>
        </footer>
      </div>
    </div>
  );
};

export default BlockchainAudioDemo;
