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
    title: 'AI Generator',
    description: 'Generate new sample packs from a prompt, BPM, key, and stem settings.',
    bullets: ['Prompt → stems', 'BPM/key controls', 'Repeatable outputs'],
    to: 'ai-generator',
    cta: 'Generate a pack',
    tone: 'primary',
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
    tone: 'secondary',
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
    tone: 'accent',
    icon: 'mixer',
    gradientFrom: 'from-accent/25',
    gradientTo: 'to-primary/25',
  },
  {
    title: 'Bitcoin Audio',
    description: 'Interactive Bitcoin-native audio demos and experiments.',
    bullets: ['Bitcoin-driven sound', 'Interactive demos', 'Engine playground'],
    to: 'bitcoin-audio',
    cta: 'Open demo',
    tone: 'ghost',
    icon: 'bitcoin',
    gradientFrom: 'from-warning/20',
    gradientTo: 'to-primary/20',
  },
  {
    title: 'Blockchain Audio',
    description: 'Synth + signal experiments driven by blockchain data and on-chain patterns.',
    bullets: ['On-chain patterns', 'Signal → synthesis', 'Visual + audio feedback'],
    to: 'blockchain-audio',
    cta: 'Open lab',
    tone: 'ghost',
    icon: 'network',
    gradientFrom: 'from-info/20',
    gradientTo: 'to-secondary/20',
  },
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

function FeatureHero({ item, index }: { item: LandingLink; index: number }) {
  const reversed = index % 2 === 1;
  return (
    <section className="py-6">
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch ${reversed ? 'lg:[&>*:first-child]:order-2' : ''}`}>
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

        <div className="card bg-base-200 border border-base-300">
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

            <div className="mt-5">
              <div className="rounded-2xl border border-base-300 bg-base-300/40 p-5">
                <div className="text-xs uppercase tracking-wide text-base-content/60">Preview</div>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={`aspect-square rounded-xl border border-base-300 bg-gradient-to-br ${item.gradientFrom} ${item.gradientTo} opacity-80`}
                    />
                  ))}
                </div>
                <div className="mt-3 text-xs text-base-content/60">
                  Open <span className="font-semibold">{item.title}</span> to get the full experience.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function InspiraLanding() {
  return (
    <div className="min-h-screen bg-base-100">
      <section className="hero py-6">
        <div className="hero-content w-full max-w-6xl flex-col items-start gap-4">
          <div className="w-full">
            <img src="/inspira-logo.png" alt="Inspira Logo" className="w-24 h-24" />
            {/* <div className="badge badge-outline">Inspira</div> */}
            <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">
             Input inspires output.
            </h1>
            <p className="mt-4 text-base md:text-lg text-base-content/70 max-w-3xl">
              Create, browse, and mix AI sample packs.
              Inspira is the audio workspace inside BitcoinAudio.ai. Start by generating a pack, browse
              existing packs, then open the Studio to mix stems and export a recording.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="ai-generator" className="btn btn-primary">
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
              <FeatureHero key={item.to} item={item} index={index} />
            ))}
          </div>

          <div className="w-full rounded-2xl border border-base-300 bg-base-200 p-6">
            <div className="text-sm text-base-content/70">
              Tip: If you’re new here, start with <span className="font-semibold">AI Generator</span>,
              then head to <span className="font-semibold">Sample Packs</span> to open a pack in the
              Studio.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
