import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import InspiraRoutes from './InspiraRoutes';

// Note: this component intentionally does NOT create a Router.
// It expects to be rendered inside an existing react-router Router.
export default function InspiraEmbedded() {
  const [queryClient] = useState(() => new QueryClient());
  const location = useLocation();

  // Audio engines require a user gesture to start (browser autoplay policy).
  useEffect(() => {
    const handleClick = () => {
      // No-op; establishes the “first click” gesture.
    };
    document.addEventListener('click', handleClick, { once: true });
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // SEO helpers: set canonical URL + basic meta as navigation changes.
  useEffect(() => {
    const rawPath = location.pathname || '/';
    const canonicalPath = rawPath.replace(/^\/apps\/inspira(?=\/|$)/, '/inspira');
    const canonicalUrl = `${window.location.origin}${canonicalPath}`;

    // Canonical link
    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalUrl);

    // Title
    const pathAfterInspira = canonicalPath.replace(/^\/inspira\/?/, '');
    const section = (() => {
      if (!pathAfterInspira) return 'Home';
      if (pathAfterInspira.startsWith('ai-generator')) return 'AI Generator';
      if (pathAfterInspira.startsWith('sample-packs')) return 'Sample Packs';
      if (pathAfterInspira.startsWith('studio')) return 'Studio';
      if (pathAfterInspira.startsWith('bitcoin-audio')) return 'Bitcoin Audio';
      if (pathAfterInspira.startsWith('bitcoin-sample-engine')) return 'B.A.S.E';
      if (pathAfterInspira.startsWith('base-packs')) return 'B.A.S.E Packs';
      if (pathAfterInspira.startsWith('blockchain-audio')) return 'Blockchain Audio';
      return 'Inspira';
    })();
    document.title = `${section} — Inspira`;

    // Description
    const descriptions: Record<string, string> = {
      Home: 'Inspira is the audio workspace inside BitcoinAudio.ai: generate packs, browse stems, and mix in the Studio.',
      'AI Generator': 'Generate new AI sample packs from a prompt, BPM, key, and stem settings.',
      'Sample Packs': 'Browse existing packs, preview stems, download, and open the Studio mixer.',
      Studio: 'Mix stems, add effects, and record an export directly from your browser.',
      'Bitcoin Audio': 'Interactive Bitcoin-native audio demos and experiments.',
      'B.A.S.E': 'Bitcoin Audio Sample Engine: interactive sample engine and experiments.',
      'B.A.S.E Packs': 'Curated B.A.S.E packs for fast experimentation and Studio workflows.',
      'Blockchain Audio': 'Synth and signal experiments driven by blockchain data and on-chain patterns.',
      Inspira: 'Inspira: generate, browse, and mix AI sample packs.',
    };

    let descriptionEl = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!descriptionEl) {
      descriptionEl = document.createElement('meta');
      descriptionEl.setAttribute('name', 'description');
      document.head.appendChild(descriptionEl);
    }
    descriptionEl.setAttribute('content', descriptions[section] || descriptions.Inspira);
  }, [location.pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      <InspiraRoutes />
    </QueryClientProvider>
  );
}
