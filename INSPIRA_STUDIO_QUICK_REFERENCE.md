# Inspira Studio - Developer Quick Reference

## Key Components

### InspiraStudio Component
Location: `src/pages/InspiraStudio.tsx`

Entry point for the studio interface. Handles:
- Audio initialization (Tone.js)
- Stem loading and playback
- Recording with MediaRecorder
- Backend communication

### useStudioSettings Hook
Location: `src/hooks/useStudioSettings.ts`

Manages:
- localStorage persistence
- Mixer settings per pack
- Audio export functionality

## Adding Stems to a Pack

Stems are automatically loaded from:
1. `audio_urls` array (preferred)
2. `audio` array (fallback)

Each stem needs:
```typescript
{
  path: string,      // File path relative to /api/files/
  stem: string,      // Display name
  filename?: string, // Optional
  url?: string       // Optional direct URL
}
```

## Extending ADSR/Effects

Currently placeholder. To implement:

1. **Update Stem interface** (InspiraStudio.tsx):
```typescript
adsr: {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}
effects: {
  reverb: { wet: number; decay: number };
  delay: { time: number; feedback: number };
  chorus: { rate: number; depth: number };
}
```

2. **Create effect controls** in JSX:
```tsx
// Inside stem card's Effects section
<input 
  type="range"
  min="0"
  max="1"
  step="0.01"
  value={stem.effects.reverb.wet}
  onChange={(e) => updateStemSettings(...)}
/>
```

3. **Apply to Tone.js**:
```typescript
const reverb = new Tone.Reverb({ decay: stem.effects.reverb.decay });
player.connect(reverb);
```

## Server-Side Mixing (Future)

Endpoint ready: `/api/studio/mix`

To implement:
1. Create Node.js Tone.js offlineContext
2. Load stems
3. Apply mix settings
4. Export to WAV/MP3
5. Stream response

```javascript
apiRouter.post("/studio/mix", async (req, res) => {
  const { packId, stemSettings, masterVolume } = req.body;
  // Render mix server-side
  // Return high-quality audio
});
```

## localStorage Keys

All studio data:
- Key format: `inspira-studio-{packId}`
- Single JSON object per pack
- Cleared on studio exit

To inspect in DevTools:
```javascript
// List all studio settings
Object.keys(localStorage)
  .filter(k => k.startsWith('inspira-studio-'))
  .forEach(k => console.log(k, JSON.parse(localStorage[k])))
```

## Recording Flow

```
User clicks Record
  → initializeAudio()
  → mediaRecorder.start()
  → setIsRecording(true)
  
User clicks Play
  → initializeAudio()
  → Tone players start()
  → Tone.Transport.start()
  
User clicks Stop Recording
  → mediaRecorder.stop()
  → mediaRecorder fires 'onstop'
  → downloadRecording() called
  → exportRecording() to backend
  → downloadRecording() to client
```

## Backend Studio Endpoints

### POST /api/studio/:packId/export
Save a recording

```bash
curl -X POST http://localhost:3003/api/studio/abc123/export \
  --data-binary @recording.webm \
  -H "Content-Type: audio/webm"
```

Response:
```json
{
  "success": true,
  "recordingId": "abc123-2025-01-13T...webm",
  "downloadUrl": "/api/files/studio-recordings/...",
  "timestamp": "2025-01-13T..."
}
```

### GET /api/studio/:packId/recordings
List pack's recordings

```bash
curl http://localhost:3003/api/studio/abc123/recordings
```

Response:
```json
{
  "packId": "abc123",
  "recordings": [
    { "id": "...", "url": "/api/files/studio-recordings/..." },
    ...
  ]
}
```

## Common Issues

### 1. Audio Playback Fails
- Check browser's audio context permissions
- Verify stems have valid URLs
- Check CORS headers in response

### 2. Recording Not Saving
- Check backend `/data/output/studio-recordings/` exists
- Verify write permissions
- Check browser console for errors

### 3. Settings Not Persisting
- Check localStorage isn't disabled
- Verify packId is valid
- Check browser quota

### 4. Tone.js Player Fails
- Ensure audio file is CORS-enabled
- Check file format support
- Verify URL is correct

## Debugging Tips

### Enable Logging
```typescript
// In InspiraStudio.tsx
console.log('[Studio] Pack loaded:', pack);
console.log('[Studio] Stems:', stems);
console.log('[Studio] Settings:', settings);
```

### Check Backend Logs
```bash
# In gateway container
docker logs samplepacker-gateway
```

### Inspect Audio Context
```javascript
Tone.getContext().state // 'running', 'suspended', etc.
Tone.Transport.state     // playback state
```

## File Organization

```
inspira/
├── src/
│   ├── pages/
│   │   ├── InspiraStudio.tsx       ← Main component
│   │   ├── SamplePacks.tsx         ← Modified with Studio button
│   │   └── BASEPacks.tsx           ← Modified with Studio button
│   ├── hooks/
│   │   └── useStudioSettings.ts    ← Settings + export
│   └── App.tsx                     ← Modified with route
└── INSPIRA_STUDIO_IMPLEMENTATION.md ← Full docs

gateway/
├── server.js                       ← Modified with endpoints
└── package.json                    ← Added tone.js
```

## Testing Commands

### Test Pack Loading
```bash
curl http://localhost:3000/studio/job_abc123
```

### Test File Download
```bash
curl http://localhost:3000/api/packs/job_abc123/download
```

### Test Recording Save
```bash
curl -X POST http://localhost:3000/api/studio/job_abc123/export \
  --data-binary @test.webm
```

## Performance Optimization (Future)

- Use React.memo for stem cards
- Virtualize stem list (if 100+ stems)
- Lazy load cover images
- Debounce localStorage writes
- Use Web Workers for audio processing

## Accessibility Improvements

- Add ARIA labels to sliders
- Keyboard shortcuts for Play/Record
- Screen reader support
- High contrast mode support

---

**Last Updated**: January 13, 2026
**Maintainer**: Inspira Team
