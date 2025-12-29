import React from 'react';
import { formatEther } from 'viem';
import { PatentStats, TokenInfo } from '../../types/contracts';

type PortfolioProps = {
  balance: bigint;
  patentStats: PatentStats;
  tokenInfo: TokenInfo;
  onTabChange?: (tabId: string) => void;
};

const Portfolio: React.FC<PortfolioProps> = ({ balance, patentStats, tokenInfo, onTabChange }) => {

  // 计算用户持仓比例
  const holdingPercentage = balance && tokenInfo.totalSupply && Number(tokenInfo.totalSupply) > 0
    ? (Number(balance) / Number(tokenInfo.totalSupply) * 100).toFixed(4)
    : '0';

  // 计算用户持仓价值
  const holdingValue = balance && patentStats.backingRatio
    ? Number(formatEther(balance)) * Number((patentStats.backingRatio as bigint) / BigInt(1e6))
    : 0;

  return (
    <div className="space-y-6">
      {/* 持仓概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <PortfolioCard
          icon="🪙"
          title="PATENT 余额"
          value={balance ? Number(formatEther(balance)).toLocaleString() : '0'}
          subtitle="PATENT"
          color="from-blue-500 to-cyan-500"
        />
        <PortfolioCard
          icon="💵"
          title="持仓价值"
          value={`$${holdingValue ? holdingValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}`}
          subtitle="USD"
          color="from-green-500 to-emerald-500"
        />
        <PortfolioCard
          icon="📊"
          title="持仓占比"
          value={`${holdingPercentage}%`}
          subtitle="总供应量"
          color="from-purple-500 to-pink-500"
        />
        <PortfolioCard
          icon="💎"
          title="支撑比率"
          value={`$${patentStats.backingRatio ? Number((patentStats.backingRatio as bigint) / BigInt(1e6)).toFixed(4) : '0.0000'}`}
          subtitle="每PATENT"
          color="from-orange-500 to-amber-500"
        />
      </div>

      {/* 资产详情 */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">资产详情</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 持仓信息 */}
          <div className="bg-black/20 rounded-xl p-4">
            <h4 className="text-sm font-medium text-blue-300 mb-3">我的持仓</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-blue-400">代币数量</span>
                <span className="text-white font-medium">
                  {balance ? Number(formatEther(balance)).toLocaleString() : '0'}PATENT
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-400">持仓价值</span>
                <span className="text-white font-medium">
                  ${holdingValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-400">占总供应</span>
                <span className="text-white font-medium">{holdingPercentage}%</span>
              </div>
            </div>
          </div>

          {/* 平台信息 */}
          <div className="bg-black/20 rounded-xl p-4">
            <h4 className="text-sm font-medium text-blue-300 mb-3">平台信息</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-blue-400">总供应量</span>
                <span className="text-white font-medium">
                  {tokenInfo.totalSupply ? Number(formatEther(tokenInfo.totalSupply)).toLocaleString() : '0'} PATENT
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-400">专利总估值</span>
                <span className="text-white font-medium">
                  ${patentStats.totalValuation ? Number((patentStats.totalValuation)).toLocaleString() : '0'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-400">支撑比率</span>
                <span className="text-white font-medium">
                  ${patentStats.backingRatio ? Number((patentStats.backingRatio as bigint) / BigInt(1e6)).toFixed(4) : '0.0000'}/PATENT
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 持仓可视化 */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">持仓占比可视化</h3>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="w-full bg-blue-900/50 rounded-full h-6 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${Math.max(parseFloat(holdingPercentage), 1)}%` }}
              >
                {parseFloat(holdingPercentage) > 5 && (
                  <span className="text-xs text-white font-medium">{holdingPercentage}%</span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-white">{holdingPercentage}%</p>
            <p className="text-xs text-blue-400">我的占比</p>
          </div>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickAction
          icon="🛒"
          title="购买代币"
          description="购买更多PATENT 代币"
          buttonText="去购买"
          href="purchase"
          color="from-blue-600 to-cyan-600"
          onClick={() => onTabChange?.('purchase')}
        />
        <QuickAction
          icon="💱"
          title="赎回代币"
          description="将PATENT 兑换为稳定币"
          buttonText="去赎回"
          href="redemption"
          color="from-purple-600 to-pink-600"
          onClick={() => onTabChange?.('redemption')}
        />
        <QuickAction
          icon="💰"
          title="领取收益"
          description="领取专利许可费分红"
          buttonText="去领取"
          href="revenue"
          color="from-green-600 to-emerald-600"
          onClick={() => onTabChange?.('revenue')}
        />
      </div>
    </div>
  );
};

// 持仓卡片组件
const PortfolioCard: React.FC<{
  icon: string;
  title: string;
  value: string;
  subtitle: string;
  color: string;
}> = ({ icon, title, value, subtitle, color }) => (
  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-blue-500/20 hover:border-blue-400/40 transition-all">
    <div className="flex items-start justify-between">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${color} flex items-center justify-center text-2xl`}>
        {icon}
      </div>
    </div>
    <div className="mt-4">
      <p className="text-sm text-blue-300">{title}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      <p className="text-xs text-blue-400">{subtitle}</p>
    </div>
  </div>
);

// 快速操作组件
const QuickAction: React.FC<{
  icon: string;
  title: string;
  description: string;
  buttonText: string;
  href: string;
  color: string;
  onClick?: () => void;
}> = ({ icon, title, description, buttonText, color, onClick }) => (
  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-blue-500/20 hover:border-blue-400/40 transition-all">
    <div className="text-3xl mb-3">{icon}</div>
    <h4 className="font-semibold text-white">{title}</h4>
    <p className="text-sm text-blue-300 mt-1 mb-4">{description}</p>
    <button 
      onClick={onClick}
      className={`w-full bg-gradient-to-r ${color} text-white py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer`}
    >
      {buttonText}
    </button>
  </div>
);

export default Portfolio;

