import { BrowserRouter as Router, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUIStore } from './stores/uiStore';
import { useGatewayStatus } from './hooks/useGatewayStatus';
import { useEffect, useMemo, useState } from 'react';
import WalletConnectButton from './components/WalletConnectButton';
import InspiraRoutes from './InspiraRoutes';

import './App.css';

const queryClient = new QueryClient();

function InspiraQueryRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const packId = params.get('pack');

    if (packId && !location.pathname.startsWith('/studio/')) {
      navigate(`/studio/${encodeURIComponent(packId)}`, { replace: true });
    }
  }, [location, navigate]);

  return null;
}

const navItems = [
  { to: '/ai-generator', label: 'Packs Generator' },
  { to: '/sample-packs', label: 'Sample Packs' },
  { to: '/bitcoin-audio', label: 'Bitcoin Audio' },
  { to: '/bitcoin-sample-engine', label: 'B.A.S.E' },
  { to: '/base-packs', label: 'B.A.S.E Packs' },
  { to: '/blockchain-audio', label: 'Blockchain Audio' },
];

function App() {
  const { theme, setTheme } = useUIStore();
  const { isConnected } = useGatewayStatus();
  const [showNav, setShowNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const statusLabel = useMemo(() => (
    isConnected === null ? 'Checking...' : isConnected ? 'Gateway live' : 'Gateway offline'
  ), [isConnected]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);

    const handleClick = () => {
      console.log('Inspira audio engine ready');
    };
    document.addEventListener('click', handleClick, { once: true });
    return () => document.removeEventListener('click', handleClick);
  }, [theme]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > lastScrollY && window.scrollY > 24) {
        setShowNav(false);
      } else {
        setShowNav(true);
      }
      setLastScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-base-100 text-primary shadow-sm' : 'text-base-content/72 hover:bg-base-100/60 hover:text-base-content'}`;

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <InspiraQueryRedirect />
        <div className="inspira-shell min-h-screen bg-base-100 text-base-content">
          <nav className={`sticky top-0 z-50 px-4 py-4 transition-transform duration-300 md:px-6 ${showNav ? 'translate-y-0' : '-translate-y-full'}`}>
            <div className="mx-auto flex max-w-7xl flex-col gap-3">
              <div className="inspira-panel flex w-full flex-wrap items-center justify-between gap-4 rounded-[28px] px-5 py-4 backdrop-blur md:px-6">
                <div className="flex items-center gap-3">
                  <img src="/inspira-logo.png" alt="Inspira Logo" className="h-12 w-12 rounded-2xl object-cover" />
                  <div className="leading-tight">
                    <div className="font-orbitron text-base font-bold tracking-[0.08em] text-base-content">Inspira</div>
                  </div>
                </div>

                <nav className="hidden items-center gap-1 rounded-full border border-base-300/80 bg-base-100/60 p-1 lg:flex">
                  {navItems.map((item) => (
                    <NavLink key={item.to} to={item.to} className={navLinkClass}>
                      {item.label}
                    </NavLink>
                  ))}
                </nav>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                    aria-expanded={isMobileMenuOpen}
                    onClick={() => setIsMobileMenuOpen((open) => !open)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-base-300/80 bg-base-100/75 text-base-content lg:hidden"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      {isMobileMenuOpen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
                      )}
                    </svg>
                  </button>

                  <div className="hidden items-center gap-2 rounded-full border border-base-300/70 bg-base-100/70 px-3 py-2 text-sm md:flex">
                    <div className={`h-2.5 w-2.5 rounded-full ${isConnected === null ? 'bg-gray-400 animate-pulse' : isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-base-content/70">{statusLabel}</span>
                  </div>

                  <div className="dropdown dropdown-end hidden md:block">
                    <button tabIndex={0} className="rounded-full border border-base-300/80 px-4 py-2 text-sm font-semibold text-base-content/78 hover:border-primary hover:text-base-content">
                      Theme
                    </button>
                    <ul tabIndex={0} className="dropdown-content menu z-[1] mt-2 w-36 rounded-[18px] border border-base-300 bg-base-100 p-2 shadow">
                      <li><button onClick={() => setTheme('dark')}>Dark</button></li>
                      <li><button onClick={() => setTheme('light')}>Light</button></li>
                    </ul>
                  </div>

                  <WalletConnectButton />
                </div>
              </div>

              {isMobileMenuOpen ? (
                <div className="inspira-panel rounded-[26px] p-4 lg:hidden">
                  <div className="grid gap-2">
                    {navItems.map((item) => (
                      <NavLink key={item.to} to={item.to} className={({ isActive }) => `rounded-[18px] px-4 py-3 text-sm font-semibold transition ${isActive ? 'bg-primary text-primary-content' : 'bg-base-100/65 text-base-content hover:bg-base-100'}`}>
                        {item.label}
                      </NavLink>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 rounded-[22px] border border-base-300 bg-base-100/55 p-4">
                    <div className="flex items-center gap-2 rounded-full border border-base-300/70 bg-base-100/70 px-3 py-2 text-sm">
                      <div className={`h-2.5 w-2.5 rounded-full ${isConnected === null ? 'bg-gray-400 animate-pulse' : isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-base-content/70">{statusLabel}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button className="rounded-full border border-base-300/80 px-4 py-2 text-sm font-semibold text-base-content/78 hover:border-primary hover:text-base-content" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                        {theme === 'light' ? 'Dark' : 'Light'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </nav>

          <main className="inspira-grid min-h-screen px-4 pb-10 pt-4 md:px-6">
            <div className="mx-auto max-w-7xl">
              <InspiraRoutes />
            </div>
          </main>

          <footer className="mt-12 border-t border-base-300/70 bg-base-200/75">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 text-xs text-base-content/50 md:flex-row md:items-center md:justify-between">
              <p>Built for AI-assisted audio creation, pack generation, and Bitcoin-native experimentation.</p>
              <p className="font-mono uppercase tracking-[0.16em]">Local-first • Generative • Studio-ready</p>
            </div>
          </footer>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
