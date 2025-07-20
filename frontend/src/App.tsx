import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WagmiConfig, createConfig, configureChains, mainnet } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';

import Dashboard from './components/Dashboard';
import PatentDetails from './components/PatentDetails';
import Governance from './components/Governance';
import Revenue from './components/Revenue';

const { chains, publicClient } = configureChains([mainnet], [publicProvider()]);

const config = createConfig({
  autoConnect: true,
  connectors: [new MetaMaskConnector({ chains })],
  publicClient,
});

function App() {
  return (
    <WagmiConfig config={config}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/patent/:id" element={<PatentDetails />} />
            <Route path="/governance" element={<Governance />} />
            <Route path="/revenue" element={<Revenue />} />
          </Routes>
        </div>
      </Router>
    </WagmiConfig>
  );
}

export default App;