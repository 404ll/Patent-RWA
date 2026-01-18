import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WagmiProvider, createConfig } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UserDashboard from './components/user/UserDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import { http } from 'viem';
import { sepolia } from 'wagmi/chains';
import { ConnectKitProvider, getDefaultConfig } from 'connectkit';
import { Toaster } from 'react-hot-toast'; 
const rpcUrl = "https://sepolia.infura.io/v3/cf8ac5c33c5e4e30a82b9859de4ab411";

export const config = createConfig(
  getDefaultConfig({
    // 必需的配置
    appName: 'PatentCoin',
    appDescription: '专利资产代币化平台',
    appUrl: 'https://patentcoin.com',
    appIcon: 'https://patentcoin.com/logo.png',
    walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'placeholder-project-id',
    
    // 链配置
    chains: [sepolia],
  })
);

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider 
          mode="auto"
          options={{
            hideNoWalletCTA: false,
            hideQuestionMarkCTA: false,
            hideTooltips: false,
          }}
        >
          <Router>
            <Toaster />
            <div className="min-h-screen">
              <Routes>
                {/* 用户端路由 */}
                <Route path="/" element={<UserDashboard />} />
                {/* 管理端路由 */}
                <Route path="/admin" element={<AdminDashboard />} />
             
              </Routes>   
            </div>
          </Router>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
