import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

type LandingLink = {
  title: string;
  description: string;
  bullets: string[];
  to: string;
  cta: string;
  tone?: 'primary' | 'secondary' | 'accent' | 'ghost';
  icon: 'spark' | 'stack' | 'mixer' | 'bitcoin' | 'network';
  gradientFrom: string;
  gradientTo: string;
};

const links: LandingLink[] = [
  {
    title: 'Sample Pack Generator',
    description: 'Generate new sample packs from a prompt, BPM, key, and stem settings.',
    bullets: ['Prompt → stems', 'BPM/key controls', 'Repeatable outputs'],
    to: 'ai-generator',
    cta: 'Generate a pack',
    tone: 'ghost',
    icon: 'spark',
    gradientFrom: 'from-primary/25',
    gradientTo: 'to-secondary/25',
  },
  {
    title: 'Sample Packs',
    description: 'Browse existing packs, preview stems, download, and jump into the Studio mixer.',
    bullets: ['Preview stems', 'Download packs', 'Open Studio instantly'],
    to: 'sample-packs',
    cta: 'Browse packs',
    tone: 'ghost',
    icon: 'stack',
    gradientFrom: 'from-secondary/25',
    gradientTo: 'to-accent/25',
  },
  {
    title: 'B.A.S.E Packs',
    description: 'Explore curated Bitcoin Audio Sample Engine packs and quick-start into creation.',
    bullets: ['Curated collections', 'Fast experimentation', 'Studio-ready stems'],
    to: 'base-packs',
    cta: 'Explore B.A.S.E',
    tone: 'ghost',
    icon: 'mixer',
    gradientFrom: 'from-accent/25',
    gradientTo: 'to-primary/25',
  },
  // {
  //   title: 'Bitcoin Audio',
  //   description: 'Interactive Bitcoin-native audio demos and experiments.',
  //   bullets: ['Bitcoin-driven sound', 'Interactive demos', 'Engine playground'],
  //   to: 'bitcoin-audio',
  //   cta: 'Open demo',
  //   tone: 'ghost',
  //   icon: 'bitcoin',
  //   gradientFrom: 'from-warning/20',
  //   gradientTo: 'to-primary/20',
  // },
 
];

function toneToButtonClass(tone: LandingLink['tone']) {
  switch (tone) {
    case 'primary':
      return 'btn-primary';
    case 'secondary':
      return 'btn-secondary';
    case 'accent':
      return 'btn-accent';
    default:
      return 'btn-ghost';
  }
}

function Icon({ name }: { name: LandingLink['icon'] }) {
  const common = 'w-6 h-6';
  switch (name) {
    case 'spark':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l1.5 6L20 10l-6.5 2L12 18l-1.5-6L4 10l6.5-2L12 2z" />
        </svg>
      );
    case 'stack':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l9 5-9 5-9-5 9-5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9 5 9-5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l9 5 9-5" />
        </svg>
      );
    case 'mixer':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 21V14" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 10V3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V12" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8V3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 21V16" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12V3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2 14h4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 12h4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 16h4" />
        </svg>
      );
    case 'bitcoin':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 4h5a3 3 0 010 6H9V4z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h6a3 3 0 010 6H9v-6z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 4V2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 4V2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 22v-2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 22v-2" />
        </svg>
      );
    case 'network':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6a3 3 0 100-6 3 3 0 000 6z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 24a3 3 0 100-6 3 3 0 000 6z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 24a3 3 0 100-6 3 3 0 000 6z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.6 5.5L7.4 18.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.4 5.5l3.2 13" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.7 19.1h6.6" />
        </svg>
      );
  }
}

function FeatureHero({
  item,
  index,
  previewImages,
}: {
  item: LandingLink;
  index: number;
  previewImages?: string[];
}) {
  const reversed = index % 2 === 1;
  const tiles = previewImages && previewImages.length > 0 ? previewImages.slice(0, 3) : [null, null, null];
  const isSinglePreview = tiles.length === 1;
  return (
    <section className="py-6">
      <div className={`grid grid-cols-1 lg:grid-cols-1 gap-6 items-stretch ${reversed ? 'lg:[&>*:first-child]:order-2' : ''}`}>
        <div className={`card bg-base-200 border border-base-300 overflow-hidden`}>
          <div className={`p-6 bg-gradient-to-br ${item.gradientFrom} ${item.gradientTo}`}>
            <div className="flex items-center gap-3">
              <div className="btn btn-circle btn-sm btn-ghost">
                <Icon name={item.icon} />
              </div>
              <div className="badge badge-outline">Inspira</div>
            </div>
            <h2 className="mt-4 text-2xl md:text-3xl font-bold">{item.title}</h2>
            <p className="mt-2 text-base-content/70 max-w-xl">{item.description}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {item.bullets.map((b) => (
                <div key={b} className="badge badge-neutral">
                  {b}
                </div>
              ))}
            </div>
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">What you can do here</div>
              <div className="badge badge-ghost">Fast path</div>
            </div>

            <ul className="mt-3 space-y-3 text-sm text-base-content/75">
              {item.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="mt-[2px] inline-block w-2 h-2 rounded-full bg-primary" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

           
              <div className="rounded-2xl border border-base-300 bg-base-300/40 p-5">
                <div className="text-xs uppercase tracking-wide text-base-content/60">Preview</div>
                <div className={`mt-2 grid ${isSinglePreview ? 'grid-cols-1' : 'grid-cols-3'} gap-3`}>
                  {tiles.map((src, i) => (
                    <div
                      key={i}
                      className={`${isSinglePreview ? 'aspect-video' : 'aspect-square'} rounded-xl border border-base-300 bg-base-200 overflow-hidden`}
                    >
                      {src ? (
                        <img
                          src={src}
                          alt={`${item.title} preview ${i + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className={`w-full h-full bg-gradient-to-br ${item.gradientFrom} ${item.gradientTo} opacity-80`}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-base-content/60">
                  Open <span className="font-semibold">{item.title}</span> to get the full experience.
                </div>
              </div>
            
          </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={item.to} className={`btn ${toneToButtonClass(item.tone)}`}>
                {item.cta}
              </Link>
              <Link to={item.to} className="btn btn-outline">
                Learn more
              </Link>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

export default function InspiraLanding() {
  const [packPreviewImages, setPackPreviewImages] = useState<string[]>([]);
  const [basePreviewImages, setBasePreviewImages] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchPackPreviews = async () => {
      try {
        const response = await fetch('/api/packs');
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        const packs = Array.isArray(data?.packs) ? data.packs : [];
        const normalized = packs
          .map((pack: { cover_url?: string | null }) => pack.cover_url)
          .filter((coverUrl: string | null | undefined): coverUrl is string => Boolean(coverUrl))
          .map((coverUrl: string) => {
            if (coverUrl.startsWith('http')) return coverUrl;
            return coverUrl.startsWith('/api') ? coverUrl : `/api${coverUrl}`;
          });
        if (isMounted) {
          setPackPreviewImages(normalized.slice(0, 9));
        }
      } catch {
        // Swallow errors to keep landing experience stable
      }
    };

    const fetchBasePreviews = async () => {
      try {
        const PAGE_SIZE = 200;
        const MAX_PAGES = 2;
        let offset = 0;
        let pagesFetched = 0;
        const jobs: Array<{ type?: string; parameters?: { blockHeight?: number }; stems_file?: string; outputs?: { image_url?: string } }> = [];

        while (pagesFetched < MAX_PAGES) {
          const response = await fetch(`/api/jobs?limit=${PAGE_SIZE}&offset=${offset}`);
          if (!response.ok) break;
          const data = await response.json();
          const pageResults = Array.isArray(data?.results) ? data.results : Array.isArray(data?.jobs) ? data.jobs : [];
          jobs.push(...pageResults);
          if (pageResults.length < PAGE_SIZE) break;
          offset += PAGE_SIZE;
          pagesFetched += 1;
        }

        const isBasePackJob = (job: { type?: string; parameters?: { blockHeight?: number }; stems_file?: string; outputs?: { image_url?: string } }) => {
          const type = (job.type || '').toLowerCase();
          const hasBlockHeight = typeof job.parameters?.blockHeight === 'number';
          const stemsFile = job.stems_file || '';
          const hasBaseStems = stemsFile.startsWith('base_stems_') || stemsFile.includes('base_stems_');
          const imageUrl = job.outputs?.image_url || '';
          const hasBitcoinImage = imageUrl.includes('bitcoin_');
          return type === 'bitcoin_image' || hasBlockHeight || hasBaseStems || hasBitcoinImage;
        };

        const normalizeApiUrl = (maybePath?: string) => {
          if (!maybePath) return undefined;
          if (/^https?:\/\//i.test(maybePath)) return maybePath;
          if (maybePath.startsWith('/api/')) return maybePath;
          if (maybePath.startsWith('/files/')) return `/api${maybePath}`;
          if (maybePath.startsWith('files/')) return `/api/${maybePath}`;
          if (maybePath.startsWith('/')) return `/api${maybePath}`;
          return `/api/${maybePath}`;
        };

        const normalized = jobs
          .filter(isBasePackJob)
          .map((job) => normalizeApiUrl(job.outputs?.image_url))
          .filter((url): url is string => Boolean(url));

        if (isMounted) {
          setBasePreviewImages(normalized.slice(0, 6));
        }
      } catch {
        // Swallow errors to keep landing experience stable
      }
    };

    fetchPackPreviews();
    fetchBasePreviews();
    return () => {
      isMounted = false;
    };
  }, []);

  const aiGeneratorPreviews = useMemo(() => ['/images/spg.png'], []);
  const samplePacksPreviews = useMemo(() => packPreviewImages.slice(3, 6), [packPreviewImages]);
  const basePacksPreviews = useMemo(() => basePreviewImages.slice(0, 3), [basePreviewImages]);

  return (
    <div className="min-h-screen bg-base-100">
      <section className="rounded-3xl border border-base-300 bg-gradient-to-br from-base-200 to-base-100 p-8 md:p-12 shadow-xl">
          <div className="">
          <div className="inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-200/50 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-base-content/70 shadow-sm">
            Tools • Creation • Output
          </div>

          <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <img src="/inspira-logo.png" alt="Inspira Logo" className="w-64 h-64" /> 

            <h1 className="text-4xl md:text-6xl font-bold ">
             Input inspires output.
            </h1>

            </div>
            {/* <div className="badge badge-outline">Inspira</div> */}
           
          <p className="text-base-content/70 mt-5 text-lg md:text-xl leading-relaxed">
              Create, browse, and mix AI sample packs.
              Inspira is the audio workspace inside BitcoinAudio.ai. Start by generating a pack, browse
              existing packs, then open the Studio to mix stems and export a recording.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="ai-generator" className="btn btn-outline">
                Get started
              </Link>
              <Link to="sample-packs" className="btn btn-outline">
                View sample packs
              </Link>
            </div>
          </div>

          <div className="w-full">
            <div className="divider">Explore</div>
            {links.map((item, index) => (
              <FeatureHero
                key={item.to}
                item={item}
                index={index}
                previewImages={
                  item.to === 'ai-generator'
                    ? aiGeneratorPreviews
                    : item.to === 'sample-packs'
                      ? samplePacksPreviews
                      : item.to === 'base-packs'
                        ? basePacksPreviews
                        : undefined
                }
              />
            ))}
          </div>

          <div className="w-full rounded-2xl border border-base-300 bg-base-200 p-6">
            <div className="text-sm text-base-content/70">
              Tip: If you’re new here, start with <span className="font-semibold">AI Generator</span>,
              then head to <span className="font-semibold">Sample Packs</span> to open a pack in the
              Studio.
            </div>
          </div>
        
      </section>
    </div>
  );
}
