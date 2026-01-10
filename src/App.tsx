import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUIStore } from './stores/uiStore';
import { useEffect } from 'react';

// Page components  
import AIGenerator from './pages/AIGenerator';
import BitcoinAudioDemo from './pages/BitcoinAudioDemo';
import BlockchainAudioDemo from './pages/BlockchainAudioDemo';

import './App.css';

const queryClient = new QueryClient();

function App() {
  const { theme, setTheme } = useUIStore();

  useEffect(() => {
    // Initialize audio on first click (browser autoplay policy)
    const handleClick = () => {
      console.log('🚀 Inspira audio engine ready');
    };
    document.addEventListener('click', handleClick, { once: true });
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-base-100" data-theme={theme}>
          {/* Navigation */}
          <nav className="navbar bg-base-200 shadow-lg sticky top-0 z-50">
            <div className="navbar-start">
              <div className="flex items-center gap-2 px-4">
               <img src="/inspira-logo.png" alt="Inspira Logo" className="w-12 h-12" />
               </div>
            </div>
            
            <div className="navbar-center">
              <ul className="menu menu-horizontal px-1 gap-2">
                <li>
                  <NavLink 
                    to="/ai-generator" 
                    className={({ isActive }) => isActive ? 'active' : ''}
                  >
                    🤖 AI Generator
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/bitcoin-audio" 
                    className={({ isActive }) => isActive ? 'active' : ''}
                  >
                    🎹 Bitcoin Audio
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/blockchain-audio" 
                    className={({ isActive }) => isActive ? 'active' : ''}
                  >
                    ⛓️ Blockchain Audio
                  </NavLink>
                </li>
              </ul>
            </div>
            
            <div className="navbar-end">
              <div className="dropdown dropdown-end">
                <label tabIndex={0} className="btn btn-ghost btn-sm">
                  🎨 Theme
                </label>
                <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-200 rounded-box w-32">
                  <li><button onClick={() => setTheme('dark')}>🌙 Dark</button></li>
                  <li><button onClick={() => setTheme('light')}>☀️ Light</button></li>
                  <li><button onClick={() => setTheme('synthwave')}>🌆 Synthwave</button></li>
                  <li><button onClick={() => setTheme('cyberpunk')}>🤖 Cyberpunk</button></li>
                  <li><button onClick={() => setTheme('retro')}>📼 Retro</button></li>
                </ul>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="min-h-[calc(100vh-64px)]">
            <Routes>
              <Route path="/" element={<Navigate to="/ai-generator" replace />} />
              <Route path="/ai-generator" element={<AIGenerator />} />
              <Route path="/bitcoin-audio" element={<BitcoinAudioDemo />} />
              <Route path="/blockchain-audio" element={<BlockchainAudioDemo />} />
            </Routes>
          </main>

          {/* Footer */}
          <footer className="footer footer-center p-4 bg-base-200 text-base-content border-t border-base-300">
            <div>
              <p>Built with ❤️ using React, Tone.js, and Bitcoin</p>
            </div>
          </footer>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
