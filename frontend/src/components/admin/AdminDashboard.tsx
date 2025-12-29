import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { formatUnits } from 'viem';
import { ConnectKitButton } from 'connectkit';
import PatentManagement from './PatentManagement';
import MintingPanel from './MintingPanel';
import RevenueDistribution from './RevenueDistribution';
import { usePatentCoin } from '../../hooks/usePatentCoin';
import type { PatentAsset } from '../../types/contracts';
import WalletHeader from '../common/WalletHeader';

const AdminDashboard: React.FC = () => {
  const { isConnected } = useAccount();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const tabFromUrl = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // 管理端有效的标签页
  const validTabs = ['overview', 'patents', 'minting', 'revenue'];

  // 检查路径和标签页有效性，清空无效的查询参数
  useEffect(() => {
    // 只在管理端路径下处理
    if (location.pathname !== '/admin') {
      return;
    }

    const tab = searchParams.get('tab');
    // 如果标签页无效，清空查询参数并重置为默认标签
    if (tab && !validTabs.includes(tab)) {
      navigate('/admin', { replace: true });
      setActiveTab('overview');
      return;
    }

    // 更新 activeTab
    const currentTab = tab || 'overview';
    if (validTabs.includes(currentTab) && currentTab !== activeTab) {
      setActiveTab(currentTab);
    }
  }, [location.pathname, searchParams, navigate, validTabs, activeTab]);

  // 当 activeTab 变化时更新 URL
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    navigate(`/admin?tab=${tabId}`, { replace: true });
  };
  const { tokenInfo, patentStats, revenueInfo, patents, patentNumbers } = usePatentCoin();
  
  // 调试信息
  useEffect(() => {
    console.log('=== AdminDashboard 调试信息 ===');
    console.log('patentStats:', patentStats);
    console.log('patentNumbers:', patentNumbers);
    console.log('patents:', patents);
    console.log('patents.length:', patents?.length || 0);
  }, [patentStats, patentNumbers, patents]);
  
  const tabs = [
    { id: 'overview', name: '管理概览', icon: '📊' },
    { id: 'patents', name: '专利管理', icon: '🔬' },
    { id: 'minting', name: '代币铸造', icon: '🪙' },
    { id: 'revenue', name: '收益分配', icon: '💰' },
  ];

  // 未连接钱包时显示连接页面
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <WalletHeader 
          title="PatentCoin 管理后台" 
          subtitle="Administrator Panel"
          showUserLink={true}
        />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="bg-white/5 border border-purple-500/30 rounded-2xl px-6 py-8 shadow-2xl backdrop-blur-md space-y-4">
              <div className="flex items-center space-x-3 justify-center mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl">
                  🔗
                </div>
                <div className="text-left">
                  <p className="text-white font-semibold text-lg">连接您的钱包</p>
                  <p className="text-xs text-purple-200">支持 MetaMask / OKX / WalletConnect</p>
                </div>
              </div>
              <div className="bg-black/30 rounded-xl border border-purple-500/20 px-4 py-3 flex justify-center">
                <ConnectKitButton />
              </div>
              <p className="text-xs text-purple-300 text-center mt-4">
                连接钱包后即可访问管理后台功能
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <WalletHeader 
        title="PatentCoin 管理后台" 
        subtitle="Administrator Panel"
        showUserLink={true}
      />

      {/* Navigation */}
      <nav className="bg-black/20 backdrop-blur-sm border-b border-purple-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`py-3 px-4 font-medium text-sm transition-all rounded-t-lg ${
                  activeTab === tab.id
                    ? 'bg-purple-600/30 text-white border-b-2 border-purple-400'
                    : 'text-purple-300 hover:text-white hover:bg-purple-600/10'
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
        {activeTab === 'overview' && (
          <AdminOverview
            decimals={tokenInfo.decimals}
            totalSupply={tokenInfo.totalSupply}
            patentCount={BigInt(patentStats.patentCount)}
            totalValuation={patentStats.totalValuation}
            currentRound={revenueInfo.currentRound}
            patents={patents}
            onTabChange={handleTabChange}
          />
        )}
        {activeTab === 'patents' && <PatentManagement />}
        {activeTab === 'minting' && <MintingPanel />}
        {activeTab === 'revenue' && <RevenueDistribution />}
      </main>
    </div>
  );
};

// 管理概览组件
const AdminOverview: React.FC<{
  decimals: number;
  totalSupply?: bigint;
  patentCount?: bigint;
  totalValuation?: bigint;
  currentRound?: bigint;
  patents: PatentAsset[];
  onTabChange: (tab: string) => void;
}> = ({ decimals, totalSupply, patentCount, totalValuation, currentRound, patents, onTabChange }) => {
  const formatToken = (v?: bigint) =>
    v !== undefined ? Number(formatUnits(v, decimals)).toLocaleString() : '0';
  const formatUSD = (v?: bigint) =>
    v !== undefined ? `$${Number(v).toLocaleString()}` : '$0';

  // 调试信息：检查专利数据
  useEffect(() => {
    console.log('=== AdminOverview 调试信息 ===');
    console.log('patents:', patents);
    console.log('patents.length:', patents?.length || 0);
    console.log('patents 类型:', Array.isArray(patents) ? 'Array' : typeof patents);
    if (patents && patents.length > 0) {
      console.log('第一个专利:', patents[0]);
    }
  }, [patents]);
  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="🪙"
          title="代币总供应量"
          value={formatToken(totalSupply)}
          subtitle="PATENT"
          color="from-blue-500 to-cyan-500"
        />
        <StatCard
          icon="🔬"
          title="专利资产数量"
          value={patentCount ? patentCount.toString() : '0'}
          subtitle="个专利"
          color="from-purple-500 to-pink-500"
        />
        <StatCard
          icon="💎"
          title="总资产估值"
          value={formatUSD(totalValuation)}
          subtitle="USD"
          color="from-green-500 to-emerald-500"
        />
        <StatCard
          icon="📊"
          title="收益分配轮次"
          value={currentRound ? `#${currentRound.toString()}` : '#0'}
          subtitle="当前轮次"
          color="from-orange-500 to-amber-500"
        />
      </div>

      {/* 专利列表预览 */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">专利资产概览</h3>
        {patents.length === 0 ? (
          <p className="text-purple-300 text-sm">暂无专利数据</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-purple-200">
              <thead>
                <tr className="text-xs uppercase text-purple-400 border-b border-purple-500/20">
                  <th className="py-2 pr-4">专利号</th>
                  <th className="py-2 pr-4">标题</th>
                  <th className="py-2 pr-4">发明人</th>
                  <th className="py-2 pr-4">估值 (USD)</th>
                  <th className="py-2 pr-4">状态</th>
                </tr>
              </thead>
              <tbody>
                {patents.map((p) => (
                  <tr key={p.patentNumber} className="border-b border-purple-500/10">
                    <td className="py-2 pr-4 font-mono text-xs">{p.patentNumber}</td>
                    <td className="py-2 pr-4">{p.title || '-'}</td>
                    <td className="py-2 pr-4 truncate max-w-xs">
                      {p.inventors?.length ? p.inventors.join(', ') : '-'}
                    </td>
                    <td className="py-2 pr-4 text-green-300">{Number(p.valuationUSD).toLocaleString()}</td>
                    <td className="py-2 pr-4">{p.active ? '✅' : '❌'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 快速操作 */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">快速操作</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionCard
            icon="➕"
            title="添加专利"
            description="上传新的专利资产到平台"
            onClick={() => onTabChange('patents')}
          />
          <QuickActionCard
            icon="🪙"
            title="铸造代币"
            description="为用户铸造PATENT 代币"
            onClick={() => onTabChange('minting')}
          />
          <QuickActionCard
            icon="💸"
            title="分配收益"
            description="发起新一轮收益分配"
            onClick={() => onTabChange('revenue')}
          />
        </div>
      </div>

      {/* 系统状态 */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">系统状态</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatusIndicator label="合约状态" status="active" text="正常运行" />
          <StatusIndicator label="HKMA合规" status="active" text="已认证" />
          <StatusIndicator label="预言机" status="active" text="已连接" />
          <StatusIndicator label="IPFS节点" status="warning" text="本地模式" />
        </div>
      </div>
    </div>
  );
};

// 统计卡片组件
const StatCard: React.FC<{
  icon: string;
  title: string;
  value: string;
  subtitle: string;
  color: string;
}> = ({ icon, title, value, subtitle, color }) => (
  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-purple-500/20 hover:border-purple-400/40 transition-all">
    <div className="flex items-start justify-between">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${color} flex items-center justify-center text-2xl`}>
        {icon}
      </div>
    </div>
    <div className="mt-4">
      <p className="text-sm text-purple-300">{title}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      <p className="text-xs text-purple-400">{subtitle}</p>
    </div>
  </div>
);

// 快速操作卡片
const QuickActionCard: React.FC<{
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}> = ({ icon, title, description, onClick }) => (
  <button
    onClick={onClick}
    className="text-left p-4 bg-purple-600/20 rounded-xl border border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-600/30 transition-all group"
  >
    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{icon}</div>
    <h4 className="font-semibold text-white">{title}</h4>
    <p className="text-sm text-purple-300 mt-1">{description}</p>
  </button>
);

// 状态指示器
const StatusIndicator: React.FC<{
  label: string;
  status: 'active' | 'warning' | 'error';
  text: string;
}> = ({ label, status, text }) => {
  const statusColors = {
    active: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  };

  return (
    <div className="flex items-center space-x-3">
      <div className={`w-3 h-3 rounded-full ${statusColors[status]} animate-pulse`} />
      <div>
        <p className="text-xs text-purple-400">{label}</p>
        <p className="text-sm text-white">{text}</p>
      </div>
    </div>
  );
};

export default AdminDashboard;

