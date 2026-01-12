# Inspira Engine

A React-based audio synthesis and AI music generation platform built on Bitcoin blockchain data.

## Features

### 🤖 AI Music Generator
Generate custom music and sample packs using AI with:
- **Text-to-music generation** from natural language prompts
- **Bitcoin blockchain-derived prompts** using BNS (Bitmap Naming Service) algorithm
- **Customizable parameters**: BPM (40-200), key signatures, duration (4-32s), stems (1-10)
- **AI-generated cover art** with graffiti style using Stable Diffusion
- **Multiple workflows** with priority-based selection
- **Real-time job tracking** with progress updates and status polling
- **Download complete sample packs** as ZIP files

### ₿ Bitcoin Audio Sample Engine (B.A.S.E)
Transform Bitcoin blocks into unique generative audio stems and AI artwork:
- **Block data input** - Enter any Bitcoin block height to fetch blockchain data
- **8x8 color grid** - Visualize blockchain data as interactive color matrix
- **8 audio stems** - Generate melodic patterns from Bitcoin hex data (merkle root or block hash)
- **AI artwork generation** - ComfyUI transforms color grid into unique graffiti-style art
- **Hex-to-note mapping** - Each hex character (0-f) maps to a musical note
- **Downloadable packs** - Complete B.A.S.E packs with image and stem data
- **B.A.S.E Packs gallery** - Browse all generated Bitcoin artwork and audio data

### 📦 Sample Pack Browser
Browse and manage your generated sample packs:
- **Grid view** with responsive layout (1-4 columns)
- **Cover art preview** with fallback placeholders
- **Individual stem playback** - play/pause each audio stem
- **Metadata display** - BPM, key, prompt, creation date
- **Model information** - checkpoint, LoRA, and audio model used
- **Quick download** - download complete packs with one click
- **Auto-sorted** by creation date (newest first)
- **Refresh on demand** to update the list

### 🖼️ B.A.S.E Packs Gallery
View all generated Bitcoin Audio Sample Engine artworks:
- **Bitcoin-themed gallery** - Orange/yellow gradient design
- **Block metadata** - Block height, data source, seed, generation time
- **Image preview** - View generated AI artwork
- **Download support** - Download individual images and stem data
- **Status tracking** - See completion status and processing time

### 🎹 Bitcoin Audio Engine
Web-based synthesizer with real-time visualization:
- **Oscilloscope** (waveform display)
- **FFT spectrum analyzer**
- **Virtual keyboard** with polyphonic synth
- **Multiple oscillator types** (sine, square, saw, triangle, FM)
- **ADSR envelope control**
- **Effects chain** (reverb, delay, chorus, phaser, distortion)

### ⛓️ Blockchain Audio Engine
Transform Bitcoin blockchain data into music and visual art:
- **Real-time data** from Blockstream API
- **64-color visualization** from merkle roots
- **Hex-to-note musical mapping**
- **Block sequence playback**
- **Audio-reactive circular visualizer**
- **Block navigation** with quick-jump buttons

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
# API Gateway for AI generation (optional, defaults to proxied /api)
VITE_API_URL=http://localhost:3003

# Backend must be running for AI Generator and Sample Pack Browser
# See: https://github.com/yourusername/samplepacker.ai
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
│   │   ├── AIGenerator.tsx       # AI music generation UI
│   │   ├── SamplePacks.tsx       # Sample pack browser
│   │   ├── BitcoinAudioDemo.tsx  # Synthesizer demo
│   │   ├── BitcoinAudioSampleEngine.tsx # B.A.S.E generator
│   │   ├── BASEPacks.tsx         # B.A.S.E gallery
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

The AI Generator, B.A.S.E, and Sample Pack Browser connect to the SamplePacker AI backend:

### Generation
- `GET /api/workflows` - List available workflows
- `POST /api/packs` - Start a new generation job
- `POST /api/bitcoin/image` - Generate B.A.S.E pack (image + stems)
- `GET /api/jobs/:id` - Get job status and details
- `GET /api/jobs` - List all jobs (supports filtering: `?status=completed`)

### Sample Packs
- `GET /api/packs` - List all generated sample packs
- `GET /api/packs/:id/download` - Download complete pack as ZIP
- `GET /api/packs/:id/package` - Get pack metadata

### Files
- `GET /api/files/:filename` - Fetch generated files (audio/images/stem data)

### Vite Proxy (Development)
All `/api/*` requests are proxied to `http://localhost:3003` in development mode.)
- `GET /api/packs/:id/package` - Download complete sample pack

## Component Usage

### BitcoinAudioSampleEngine

```tsx
import BitcoinAudioSampleEngine from './pages/BitcoinAudioSampleEngine';

<BitcoinAudioSampleEngine />
```

Complete B.A.S.E generator with:
- Block height input and data fetching
- 8x8 interactive color grid from blockchain data
- 8 audio stems with Tone.js synthesis
- AI artwork generation via ComfyUI
- Data source selection (merkle root or block hash)

### BASEPacks

```tsx
import BASEPacks from './pages/BASEPacks';

<BASEPacks />
```

Gallery view with:
- All completed B.A.S.E packs
- Block metadata (height, source, seed, time)
- Generated artwork preview
- Download buttons for images and stem data

### SamplePacks

```tsx
import SamplePacks from './pages/SamplePacks';

<SamplePacks />
```

Features:
- Responsive grid (1-4 columns based on screen size)
- Individual stem playback with play/pause controls
- Cover art display with automatic fallback
- Download button for complete packs
- Metadata display (BPM, key, stems, date, models)

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
