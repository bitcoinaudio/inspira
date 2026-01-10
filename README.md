# Inspira Engine

A React-based audio synthesis and AI music generation platform built on Bitcoin blockchain data.

## Features

### 🎵 AI Music Generator
Generate custom music and sample packs using AI with:
- Text-to-music generation from natural language prompts
- Bitcoin blockchain-derived prompts using BNS (Bitmap Naming Service) algorithm
- Customizable parameters: BPM, key, duration, stem count
- AI-generated cover art
- Download complete sample pack packages

### 🎹 Bitcoin Audio Engine
Web-based synthesizer with real-time visualization:
- Oscilloscope (waveform display)
- FFT spectrum analyzer
- Virtual keyboard with polyphonic synth
- Multiple oscillator types (sine, square, saw, triangle, FM)
- ADSR envelope control
- Effects chain (reverb, delay, chorus, phaser, distortion)

### ⛓️ Blockchain Audio Engine
Transform Bitcoin blockchain data into music and visual art:
- Real-time data from Blockstream API
- 64-color visualization from merkle roots
- Hex-to-note musical mapping
- Block sequence playback
- Audio-reactive circular visualizer
- Block navigation with quick-jump buttons

## Tech Stack

- **React 19** - UI framework with hooks
- **TypeScript 5** - Full type safety
- **Vite 7** - Fast build tool and dev server
- **Tailwind CSS 4** - Utility-first styling
- **DaisyUI 5** - Component library with themes
- **Tone.js 15** - Web Audio synthesis
- **Zustand 5** - State management
- **TanStack Query 5** - Server state management
- **React Router 7** - Client-side routing

## Getting Started

### Prerequisites
- Node.js 18+ or Bun
- npm, yarn, pnpm, or bun package manager

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start with network access (for mobile testing)
npm run dev:network

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# API Gateway for AI generation (optional, defaults to localhost:3002)
VITE_API_URL=http://localhost:3002
```

## Project Structure

```
inspira/
├── src/
│   ├── components/
│   │   ├── BitcoinAudioEngine/   # Synth & visualizers
│   │   └── BlockchainAudioEngine/ # Blockchain audio components
│   ├── hooks/
│   │   └── useSamplePackGenerator.ts
│   ├── pages/
│   │   ├── AIGenerator.tsx
│   │   ├── BitcoinAudioDemo.tsx
│   │   └── BlockchainAudioDemo.tsx
│   ├── stores/
│   │   ├── blockchainStore.ts    # BNS algorithm & state
│   │   └── uiStore.ts            # Theme state
│   ├── utils/
│   │   └── samplePackerAPI.ts    # AI generation API client
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   └── main.tsx
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Available Themes

The app supports multiple DaisyUI themes:
- `dark` (default)
- `light`
- `synthwave`
- `cyberpunk`
- `retro`

Change theme via the theme selector in the navigation bar.

## API Endpoints

The AI Generator requires a backend API (proxied through Vite in development):

- `POST /api/jobs` - Start a new generation job
- `GET /api/jobs/:id/status` - Poll job status
- `GET /api/jobs/:id/manifest` - Get generated content manifest
- `GET /api/files/:path` - Fetch generated files (audio/images)
- `GET /api/packs/:id/package` - Download complete sample pack

## Component Usage

### BitcoinAudioEngine

```tsx
import BitcoinAudioEngine, { 
  Oscilloscope, 
  FFTVisualizer, 
  SynthControls 
} from './components/BitcoinAudioEngine';

// Full component
<BitcoinAudioEngine
  showOscilloscope
  showFFT
  showSynth
  theme="bitcoin"
/>

// Individual components
<Oscilloscope width={300} height={100} color="#f7931a" />
<FFTVisualizer width={300} height={100} gradient />
<SynthControls showKeyboard showEffects showEnvelope />
```

### BlockchainAudioEngine

```tsx
import BlockchainAudioEngine from './components/BlockchainAudioEngine';

<BlockchainAudioEngine
  showNavigator
  showColorPads
  showVisualizer
  showControls
  initialBlockHeight={0}
/>
```

## BNS Algorithm

The Bitmap Naming Service (BNS) algorithm derives meaningful words from Bitcoin block merkle roots:

1. Extract sliding windows of 3-6 characters from the merkle root
2. Check each window against a TLD/word dictionary
3. Apply character shifts (0-9, a-f → alphabet mapping)
4. Score matches by total shift distance
5. Generate music prompts from the best matches

## License

MIT

## Credits

Based on the original Bitcoin Audio Engine project.
Built with ❤️ using React, Tone.js, and the Bitcoin blockchain.
