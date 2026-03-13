import { useMemo } from 'react';
import { Link } from 'react-router-dom';

type LandingLink = {
  title: string;
  description: string;
  bullets: string[];
  to: string;
  cta: string;
};

const links: LandingLink[] = [
  {
    title: 'Sample Pack Generator',
    description: 'Generate new sample packs from a prompt, BPM, key, and stem settings.',
    bullets: ['Prompt to stems', 'BPM and key controls', 'Repeatable outputs'],
    to: 'ai-generator',
    cta: 'Generate a pack',
  },
  {
    title: 'Sample Packs',
    description: 'Browse existing packs, preview stems, download, and jump straight into the Studio mixer.',
    bullets: ['Preview stems', 'Download packs', 'Open Studio instantly'],
    to: 'sample-packs',
    cta: 'Browse packs',
  },
  {
    title: 'B.A.S.E Packs',
    description: 'Explore curated Bitcoin Audio Sample Engine packs and fast-start into experimentation.',
    bullets: ['Curated collections', 'Fast experimentation', 'Studio-ready stems'],
    to: 'base-packs',
    cta: 'Explore B.A.S.E',
  },
  {
    title: 'SuperPack Creator',
    description: 'Generate unique artwork, animation, and optional AI stems from Bitcoin block data.',
    bullets: ['Block-driven visuals', 'Optional audio stems', 'Instant download'],
    to: 'superpack',
    cta: 'Create SuperPack',
  },
];

export default function InspiraLanding() {
  const metrics = useMemo(() => [
    { value: '4', label: 'creation lanes' },
    { value: '1', label: 'studio workflow' },
    { value: '24/7', label: 'local-first iteration' },
  ], []);

  return (
    <div className="space-y-12 pb-6">
      <section className="inspira-panel rounded-[36px] px-6 py-8 md:px-10 md:py-10">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
          <div className="flex flex-col gap-8">
            <div className="inspira-kicker">Tools • creation • output</div>
            <div className="max-w-3xl space-y-5">
              <h1 className="max-w-2xl text-4xl leading-[0.95] text-base-content md:text-6xl">
                Input inspires output.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-base-content/72 md:text-[1.35rem]">
                Inspira is the standalone audio workspace for the BitcoinAudio ecosystem. Generate packs, browse outputs, and move directly into a studio-ready mixing flow.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link to="ai-generator" className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-content shadow-lg shadow-primary/20 hover:-translate-y-0.5">
                Get started
              </Link>
              <Link to="sample-packs" className="inline-flex items-center justify-center rounded-full border border-base-300 bg-base-100/75 px-7 py-3 text-sm font-semibold text-base-content hover:border-primary">
                View sample packs
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="inspira-metric">
                  <div className="font-mono text-2xl font-bold text-base-content">{metric.value}</div>
                  <div className="mt-1 text-sm text-base-content/60">{metric.label}</div>
                </div>
              ))}
            </div>
          </div>

          <aside className="grid gap-4">
            <div className="overflow-hidden rounded-[30px] border border-base-300 bg-base-100/65 shadow-xl shadow-black/20">
              <div className="aspect-[4/3] overflow-hidden bg-base-300/30">
                <img src="/inspira-logo.png" alt="Inspira logo" className="h-full w-full object-contain p-10" />
              </div>
              <div className="space-y-3 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Workspace focus</p>
                <h2 className="text-2xl text-base-content">Create, browse, and mix AI sample packs.</h2>
                <p className="text-sm leading-7 text-base-content/68">
                  Inspira connects pack generation, browsing, and Studio mixing inside one modular environment instead of forcing separate tools for each step.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {links.map((item) => (
          <article key={item.to} className="inspira-panel rounded-[30px] px-6 py-7">
            <div className="inspira-kicker">Feature</div>
            <h2 className="mt-4 text-2xl text-base-content">{item.title}</h2>
            <p className="mt-3 text-base leading-8 text-base-content/70">{item.description}</p>
            <ul className="mt-5 grid gap-2 text-sm text-base-content/68">
              {item.bullets.map((bullet) => (
                <li key={bullet} className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-primary"></span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <Link to={item.to} className="mt-6 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-content">
              {item.cta}
            </Link>
          </article>
        ))}
      </section>

      <section className="inspira-panel rounded-[30px] px-6 py-6">
        <p className="text-sm leading-7 text-base-content/70">
          Tip: start with <span className="font-semibold text-base-content">Packs Generator</span>, then head to <span className="font-semibold text-base-content">Sample Packs</span> to open a result in the Studio.
        </p>
      </section>
    </div>
  );
}
