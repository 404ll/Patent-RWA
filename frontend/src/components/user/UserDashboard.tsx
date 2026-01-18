'use client';
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { formatUnits } from 'viem';
import TokenPurchase from './TokenPurchase';
import TokenTransfer from './TokenTransfer';
import RevenueClaim from './RevenueClaim';
import Portfolio from './Portfolio';
import { usePatentCoin } from '../../hooks/usePatentCoin';
import WalletHeader from '../common/WalletHeader';

const UserDashboard: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const tabFromUrl = searchParams.get('tab') || 'portfolio';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // 用户端有效的标签页
  const validTabs = ['portfolio', 'purchase', 'transfer', 'redemption', 'revenue'];

  // 检查路径和标签页有效性，清空无效的查询参数
  useEffect(() => {
    // 只在用户端路径下处理
    if (location.pathname !== '/') {
      return;
    }

    const tab = searchParams.get('tab');
    // 如果标签页无效，清空查询参数并重置为默认标签
    if (tab && !validTabs.includes(tab)) {
      navigate('/', { replace: true });
      setActiveTab('portfolio');
      return;
    }

    // 更新 activeTab
    const currentTab = tab || 'portfolio';
    if (validTabs.includes(currentTab) && currentTab !== activeTab) {
      setActiveTab(currentTab);
    }
  }, [location.pathname, searchParams, navigate, validTabs, activeTab]);

  // 当 activeTab 变化时更新 URL
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    navigate(`/?tab=${tabId}`, { replace: true });
  };
  const { patentStats, tokenInfo, balance, revenueInfo } = usePatentCoin();
  const tabs = [
    { id: 'portfolio', name: '我的持仓', icon: '💼' },
    { id: 'purchase', name: '购买代币', icon: '🛒' },
    // { id: 'redemption', name: '赎回代币', icon: '💱' },
    {id: "transfer", name: "转账", icon: "💳"},
    { id: 'revenue', name: '领取收益', icon: '💰' },
  ];

  const backing =
  patentStats.backingRatio
    ? Number(formatUnits(patentStats.backingRatio, 6)).toFixed(4)
    : '0.0000'

  // 未连接钱包时显示连接页面
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <WalletHeader 
          title="基于专利的 RWA 系统" 
          subtitle="基于以太坊的专利真实世界资产(RWA)代币化平台"
        />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center max-w-md mx-auto px-4">
            <h1 className="text-3xl font-bold text-white mb-2">
              基于专利的 RWA 系统
            </h1>
            <p className="text-blue-300 mb-8">
              连接钱包以开始
            </p>

            {/* <div className="bg-white/5 border border-blue-500/30 rounded-2xl px-6 py-6 shadow-2xl backdrop-blur-md space-y-4">
              <div className="flex items-center space-x-3 justify-center">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                  🔗
                </div>
                <div className="text-left">
                  <p className="text-white font-semibold">连接您的钱包</p>
                  <p className="text-xs text-blue-200">支持 MetaMask / OKX / WalletConnect</p>
                </div>
              </div>

              <div className="bg-black/30 rounded-xl border border-blue-500/20 px-4 py-3 flex justify-center">
                <ConnectKitButton />
              </div>

              <p className="text-xs text-blue-300 text-center">
                未安装钱包？可在移动端或浏览器扩展安装后再重试
              </p>
            </div> */}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <WalletHeader 
        title="基于专利的 RWA 系统" 
        showUserLink={true}
        userLinkText="管理端"
        userLinkPath="/admin"
      />

      {/* Stats Bar */}
      <div className="bg-black/20 border-b border-blue-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <span className="text-blue-400">💎</span>
                <span className="text-blue-300">支撑比率:</span>
                <span className="text-white font-medium">
                  ${backing} / PATENT
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-blue-400">🔬</span>
                <span className="text-blue-300">专利数量:</span>
                <span className="text-white font-medium">
                  {patentStats.patentCount ? patentStats.patentCount.toString() : '0'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-black/10 border-b border-blue-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`py-3 px-4 font-medium text-sm transition-all rounded-t-lg whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600/30 text-white border-b-2 border-blue-400'
                    : 'text-blue-300 hover:text-white hover:bg-blue-600/10'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeTab === 'portfolio' && <Portfolio balance={balance} patentStats={patentStats} tokenInfo={tokenInfo} onTabChange={handleTabChange} />}
        {activeTab === 'purchase' && <TokenPurchase />}
        {activeTab === 'transfer' && <TokenTransfer />}
        {/* {activeTab === 'redemption' && <TokenRedemption />} */}
        {activeTab === 'revenue' && <RevenueClaim patentBalance={balance} totalSupply={tokenInfo.totalSupply} revenueInfo={revenueInfo} />}
      </main>
    </div>
  );
};

export default UserDashboard;

