import { create } from 'zustand';

interface BlockchainData {
  height: number;
  hash: string;
  merkleRoot: string;
  timestamp?: number;
}

interface BnsWordMatch {
  word: string;
  position: number;
  window: string;
  shifts: number[];
  totalShift: number;
  exactMatch: boolean;
}

interface BlockchainStore {
  // Current playing block
  currentBlock: BlockchainData | null;
  
  // BNS-derived name/prompt
  bnsPrompt: string;
  
  // BNS word matches (sorted by least shifts)
  bnsMatches: BnsWordMatch[];
  
  // Loading state
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentBlock: (block: BlockchainData) => void;
  setBnsPrompt: (prompt: string) => void;
  clearBlock: () => void;
  
  // Fetch and set block
  fetchAndSetBlock: (height: number) => Promise<void>;
}

// TLD alphabet for BNS: a-z, 0-9, - (37 characters total)
const TLD_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789-';

// Word list for BNS matching - musical, creative, and evocative words
const BNS_WORD_LIST = [
  // Musical terms
  'beat', 'bass', 'drum', 'synth', 'wave', 'tone', 'vibe', 'loop', 'mix', 'drop',
  'fade', 'echo', 'flow', 'funk', 'jazz', 'soul', 'rock', 'pop', 'trap', 'boom',
  'kick', 'snare', 'hat', 'pad', 'lead', 'chord', 'note', 'tune', 'song', 'track',
  'groove', 'rhythm', 'melody', 'sound', 'audio', 'music', 'tempo', 'pitch',
  // Moods & Feelings
  'dark', 'deep', 'warm', 'cool', 'hot', 'cold', 'soft', 'hard', 'loud', 'calm',
  'wild', 'free', 'slow', 'fast', 'high', 'low', 'raw', 'pure', 'rich', 'smooth',
  'chill', 'hype', 'dream', 'daze', 'glow', 'shine', 'spark', 'flash', 'blaze',
  'mellow', 'intense', 'serene', 'vivid', 'crisp', 'lush',
  // Nature & Elements
  'sun', 'moon', 'star', 'sky', 'rain', 'wind', 'fire', 'ice', 'sea', 'wave',
  'storm', 'cloud', 'mist', 'fog', 'dust', 'sand', 'earth', 'stone', 'gold',
  'ocean', 'river', 'forest', 'night', 'dawn', 'dusk', 'light',
  // Abstract & Crypto
  'hash', 'block', 'chain', 'node', 'coin', 'bit', 'byte', 'code', 'data', 'key',
  'link', 'grid', 'net', 'web', 'core', 'peak', 'edge', 'zone', 'realm', 'void',
  'nexus', 'pulse', 'flux', 'orbit', 'matrix', 'cipher', 'crypto',
  // Colors
  'red', 'blue', 'green', 'pink', 'gray', 'cyan', 'jade', 'ruby', 'amber',
  'azure', 'coral', 'ivory', 'onyx', 'pearl', 'silver', 'violet',
  // Actions
  'rise', 'fall', 'spin', 'roll', 'swing', 'jump', 'fly', 'run', 'move', 'push',
  'pull', 'break', 'make', 'build', 'grow', 'shift', 'drift', 'float', 'glide',
  // Time & Space
  'past', 'now', 'next', 'end', 'start', 'loop', 'cycle', 'phase', 'step', 'path',
  'future', 'moment', 'eternal', 'infinite',
  // Bitcoin specific
  'satoshi', 'genesis', 'halving', 'mining', 'proof', 'work', 'stake', 'hodl',
  'bull', 'bear', 'whale', 'moon', 'pump', 'stack', 'sats'
];

/**
 * Convert merkle root to TLD-Alpha string using BNS algorithm
 * Each byte (0-255) is mapped to TLD alphabet using modulo 37
 */
export function merkleToTldAlpha(merkleRoot: string): string {
  const result: string[] = [];
  
  // Process each byte (2 hex characters)
  for (let i = 0; i < merkleRoot.length; i += 2) {
    const hexByte = merkleRoot.substring(i, i + 2);
    const byteValue = parseInt(hexByte, 16);
    const charIndex = byteValue % 37;
    result.push(TLD_ALPHABET[charIndex]);
  }
  
  return result.join('');
}

/**
 * Calculate the minimal circular shift between two characters in TLD alphabet
 */
function calculateCharShift(source: string, target: string): number {
  const sourceIdx = TLD_ALPHABET.indexOf(source.toLowerCase());
  const targetIdx = TLD_ALPHABET.indexOf(target.toLowerCase());
  
  if (sourceIdx === -1 || targetIdx === -1) return 37;
  
  const forward = (targetIdx - sourceIdx + 37) % 37;
  const backward = (sourceIdx - targetIdx + 37) % 37;
  
  return forward <= backward ? forward : -backward;
}

/**
 * Find the best match for a word in the TLD-alpha string
 */
function findWordMatch(tldAlpha: string, word: string): BnsWordMatch | null {
  if (word.length > tldAlpha.length) return null;
  
  let bestMatch: BnsWordMatch | null = null;
  
  for (let pos = 0; pos <= tldAlpha.length - word.length; pos++) {
    const window = tldAlpha.substring(pos, pos + word.length);
    const shifts: number[] = [];
    let totalShift = 0;
    let exactMatch = true;
    
    for (let i = 0; i < word.length; i++) {
      const shift = calculateCharShift(window[i], word[i]);
      shifts.push(shift);
      totalShift += Math.abs(shift);
      if (shift !== 0) exactMatch = false;
    }
    
    if (!bestMatch || totalShift < bestMatch.totalShift) {
      bestMatch = {
        word,
        position: pos,
        window,
        shifts,
        totalShift,
        exactMatch
      };
    }
    
    if (exactMatch) break;
  }
  
  return bestMatch;
}

/**
 * Find all real-world word matches in a merkle root using BNS shift registers
 */
export function findBnsWords(merkleRoot: string, maxWords: number = 8): BnsWordMatch[] {
  const tldAlpha = merkleToTldAlpha(merkleRoot);
  const matches: BnsWordMatch[] = [];
  
  for (const word of BNS_WORD_LIST) {
    const match = findWordMatch(tldAlpha, word);
    if (match) {
      matches.push(match);
    }
  }
  
  matches.sort((a, b) => {
    if (a.exactMatch && !b.exactMatch) return -1;
    if (!a.exactMatch && b.exactMatch) return 1;
    return a.totalShift - b.totalShift;
  });
  
  return matches.slice(0, maxWords);
}

/**
 * Generate a musical prompt from merkle root using BNS shift registers
 */
export function generateBnsPrompt(merkleRoot: string, height: number): string {
  const matches = findBnsWords(merkleRoot, 6);
  const bnsWords = matches.map(m => m.word).join(' ');
  
  const firstByte = parseInt(merkleRoot.substring(0, 2), 16);
  const genres = ['ambient', 'lofi', 'electronic', 'synthwave', 'chillhop', 'trap', 'boom bap', 'jazz'];
  const genre = genres[firstByte % genres.length];
  
  const lastByte = parseInt(merkleRoot.substring(62, 64), 16);
  const moods = ['ethereal', 'dark', 'upbeat', 'melancholic', 'energetic', 'dreamy', 'intense', 'peaceful'];
  const mood = moods[lastByte % moods.length];
  
  let era = '';
  if (height < 100000) {
    era = 'early bitcoin';
  } else if (height >= 210000 && height < 211000) {
    era = 'first halving';
  } else if (height >= 420000 && height < 421000) {
    era = 'second halving';
  } else if (height >= 630000 && height < 631000) {
    era = 'third halving';
  } else if (height >= 840000 && height < 841000) {
    era = 'fourth halving';
  } else if (height > 800000) {
    era = 'modern era';
  }
  
  const parts = [`block ${height}`, genre, mood, bnsWords];
  if (era) parts.push(era);
  parts.push('bitcoin blockchain');
  
  return parts.join(' ').trim();
}

export const useBlockchainStore = create<BlockchainStore>((set) => ({
  currentBlock: null,
  bnsPrompt: '',
  bnsMatches: [],
  isLoading: false,
  error: null,

  setCurrentBlock: (block: BlockchainData) => {
    const prompt = generateBnsPrompt(block.merkleRoot, block.height);
    const matches = findBnsWords(block.merkleRoot, 8);
    set({ 
      currentBlock: block,
      bnsPrompt: prompt,
      bnsMatches: matches,
      error: null
    });
  },

  setBnsPrompt: (prompt: string) => {
    set({ bnsPrompt: prompt });
  },

  clearBlock: () => {
    set({ 
      currentBlock: null, 
      bnsPrompt: '',
      bnsMatches: [],
      error: null 
    });
  },

  fetchAndSetBlock: async (height: number) => {
    set({ isLoading: true, error: null });
    
    try {
      const hashResponse = await fetch(`https://blockstream.info/api/block-height/${height}`);
      if (!hashResponse.ok) throw new Error('Failed to fetch block hash');
      const hash = await hashResponse.text();
      
      const blockResponse = await fetch(`https://blockstream.info/api/block/${hash}`);
      if (!blockResponse.ok) throw new Error('Failed to fetch block details');
      const blockData = await blockResponse.json();
      
      const block: BlockchainData = {
        height,
        hash,
        merkleRoot: blockData.merkle_root,
        timestamp: blockData.timestamp
      };
      
      const prompt = generateBnsPrompt(block.merkleRoot, block.height);
      const matches = findBnsWords(block.merkleRoot, 8);
      
      set({ 
        currentBlock: block,
        bnsPrompt: prompt,
        bnsMatches: matches,
        isLoading: false,
        error: null
      });
    } catch (err) {
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to fetch block' 
      });
    }
  }
}));
