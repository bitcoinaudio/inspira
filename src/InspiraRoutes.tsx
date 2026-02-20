import { Routes, Route } from 'react-router-dom';

import InspiraLanding from './pages/InspiraLanding';
import AIGenerator from './pages/AIGenerator';
import BitcoinAudioDemo from './pages/BitcoinAudioDemo';
import BitcoinAudioSampleEngine from './pages/BitcoinAudioSampleEngine';
import BASEPacks from './pages/BASEPacks';
import BlockchainAudioDemo from './pages/BlockchainAudioDemo';
import SamplePacks from './pages/SamplePacks';
import InspiraStudio from './pages/InspiraStudio';
import SuperPack from './pages/SuperPack';
import SuperPackGallery from './pages/SuperPackGallery';

export default function InspiraRoutes() {
  return (
    <Routes>
      <Route path="" element={<InspiraLanding />} />
      <Route path="ai-generator" element={<AIGenerator />} />
      <Route path="sample-packs" element={<SamplePacks />} />
      <Route path="studio/:packId" element={<InspiraStudio />} />
      <Route path="bitcoin-audio" element={<BitcoinAudioDemo />} />
      <Route path="bitcoin-sample-engine" element={<BitcoinAudioSampleEngine />} />
      <Route path="base-packs" element={<BASEPacks />} />
      <Route path="superpack" element={<SuperPack />} />
      <Route path="superpack-gallery" element={<SuperPackGallery />} />
      <Route path="blockchain-audio" element={<BlockchainAudioDemo />} />
      <Route path="*" element={<div>Inspira page not found</div>} />
    </Routes>
  );
}
