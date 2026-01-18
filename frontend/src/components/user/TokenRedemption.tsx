import React, { useState, useEffect } from 'react';
import {  useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { PATENT_COIN_ADDRESS } from '../../config/contracts';
import { PATENT_COIN_ABI } from '../../config/contracts';
import { usePatentCoin } from '../../hooks/usePatentCoin';
import { useContractPaused } from '../../hooks/useContractPaused';
// 赎回资产选项
const REDEMPTION_ASSETS = [
  { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', icon: '💵' },
  { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', icon: '💲' },
  { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EescdeCB5DBe2f', icon: '📀' },
];

const TokenRedemption: React.FC = () => {
  const [redeemAmount, setRedeemAmount] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(REDEMPTION_ASSETS[0].address);
  const { isPaused } = useContractPaused();

  const contractAddress = PATENT_COIN_ADDRESS;

 const{patentStats,balance:patentBalance} = usePatentCoin();


  const { 
    writeContract, 
    data: redeemHash, 
    isPending: isRedeeming,
    error: redeemError 
  } = useWriteContract();
  
  const { 
    isLoading: isRedeemConfirming, 
    isSuccess: isRedeemSuccess,
    isError: isRedeemFailed 
  } = useWaitForTransactionReceipt({
    hash: redeemHash,
  });

  // 购买成功后重置表单
  useEffect(() => {
    if (isRedeemSuccess) {
      setRedeemAmount('');
    }
  }, [isRedeemSuccess]);

  const balance = patentBalance ? Number(formatEther(patentBalance as bigint)) : 0;
  const ratio = patentStats.backingRatio ? Number((patentStats.backingRatio as bigint) / BigInt(1e18)) : 1;
  const redeemValue = redeemAmount ? parseFloat(redeemAmount) * ratio : 0;
  const selectedAssetInfo = REDEMPTION_ASSETS.find(a => a.address === selectedAsset);

  // 设置最大赎回
  const setMaxAmount = () => {
    if (patentBalance) {
      setRedeemAmount(formatEther(patentBalance as bigint));
    }
  };

  // 设置百分比
  const setPercentage = (percent: number) => {
    if (patentBalance) {
      const amount = Number(formatEther(patentBalance as bigint)) * (percent / 100);
      setRedeemAmount(amount.toString());
    }
  };

  return (
    <div className="space-y-6">
      {/* 赎回说明 */}
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-2xl p-6 border border-purple-500/30">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-purple-500/30 rounded-xl flex items-center justify-center text-2xl">
            💱
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">赎回 PATENT 代币</h3>
            <p className="text-purple-300 text-sm mt-1">
              将您的 PATENT 代币按当前支撑比率兑换为稳定币
            </p>
          </div>
        </div>
      </div>

      {/* 余额和比率信息 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-blue-500/20">
          <p className="text-sm text-blue-300">可赎回余额</p>
          <p className="text-2xl font-bold text-white mt-1">{balance.toLocaleString()}</p>
          <p className="text-xs text-blue-400">PATENT</p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-blue-500/20">
          <p className="text-sm text-blue-300">当前支撑比率</p>
          <p className="text-2xl font-bold text-white mt-1">${ratio.toFixed(4)}</p>
          <p className="text-xs text-blue-400">每 PATENT</p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-blue-500/20">
          <p className="text-sm text-blue-300">总持仓价值</p>
          <p className="text-2xl font-bold text-green-400 mt-1">
            ${(balance * ratio).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-blue-400">USD</p>
        </div>
      </div>

      {/* 赎回表单 */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">发起赎回请求</h3>

        {/* 选择赎回资产 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-blue-300 mb-2">选择赎回资产</label>
          <div className="grid grid-cols-3 gap-3">
            {REDEMPTION_ASSETS.map((asset) => (
              <button
                key={asset.symbol}
                onClick={() => setSelectedAsset(asset.address)}
                className={`p-4 rounded-xl border transition-all ${
                  selectedAsset === asset.address
                    ? 'border-purple-400 bg-purple-600/30'
                    : 'border-blue-500/20 bg-white/5 hover:border-purple-400/50'
                }`}
              >
                <div className="text-3xl mb-2">{asset.icon}</div>
                <p className="text-white font-medium">{asset.symbol}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 赎回数量 */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-blue-300">赎回数量 (PATENT)</label>
            <button
              onClick={setMaxAmount}
              className="text-sm text-purple-400 hover:text-purple-300"
            >
              最大: {balance.toLocaleString()}
            </button>
          </div>
          <div className="relative">
            <input
              type="number"
              placeholder="输入赎回数量"
              value={redeemAmount}
              onChange={(e) => setRedeemAmount(e.target.value)}
              max={balance}
              className="w-full bg-white/10 border border-blue-500/30 rounded-xl px-4 py-4 text-white text-lg placeholder-blue-400/50 focus:outline-none focus:border-purple-400"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400">PATENT</span>
          </div>
          {/* 百分比按钮 */}
          <div className="flex gap-2 mt-3">
            {[25, 50, 75, 100].map((percent) => (
              <button
                key={percent}
                onClick={() => setPercentage(percent)}
                className="flex-1 py-2 bg-purple-600/30 text-purple-200 rounded-lg text-sm hover:bg-purple-600/50 transition-colors"
              >
                {percent}%
              </button>
            ))}
          </div>
        </div>

        {/* 赎回预览 */}
        {redeemAmount && parseFloat(redeemAmount) > 0 && (
          <div className="bg-black/20 rounded-xl p-4 mb-6">
            <h4 className="text-sm font-medium text-blue-300 mb-3">赎回预览</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-blue-400">赎回数量</span>
                <span className="text-white">{parseFloat(redeemAmount).toLocaleString()} PATENT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-400">支撑比率</span>
                <span className="text-white">${ratio.toFixed(4)}/PATENT</span>
              </div>
              <div className="border-t border-blue-500/20 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-blue-400">预计获得</span>
                  <span className="text-green-400 font-semibold text-lg">
                    {redeemValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {selectedAssetInfo?.symbol}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 验证警告 */}
        {redeemAmount && parseFloat(redeemAmount) > balance && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 mb-4">
            <p className="text-red-400 text-sm">⚠️ 赎回数量超过您的余额</p>
          </div>
        )}

        <button
          onClick={() => writeContract({
            address: contractAddress,
            abi: PATENT_COIN_ABI,
            functionName: 'requestRedemption',
            args: [
              parseEther(redeemAmount || '0'),
              selectedAsset as `0x${string}`
            ]
          } as any)}
          disabled={
            isPaused ||
            isRedeeming ||
            isRedeemConfirming ||
            !redeemAmount ||
            parseFloat(redeemAmount) <= 0 ||
            parseFloat(redeemAmount) > balance
          }
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg"
        >
          {isPaused ? (
            '⏸️ 合约已暂停'
          ) : isRedeeming || isRedeemConfirming ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              处理中...
            </span>
          ) : (
            `💱 赎回 ${redeemValue > 0 ? `获得 ${redeemValue.toFixed(2)} ${selectedAssetInfo?.symbol}` : ''}`
          )}
        </button>

        {/* 赎回成功提示 */}
        {isRedeemSuccess && (
          <div className="mt-4 p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">✅</div>
              <div className="flex-1">
                <p className="text-green-400 font-medium mb-1">赎回请求已提交！</p>
                <p className="text-green-300 text-sm">
                  您的赎回请求已成功提交，请等待管理员处理。
                </p>
                {redeemHash && (
                  <p className="text-green-400/70 text-xs mt-2 font-mono">
                    交易哈希: {redeemHash.slice(0, 10)}...{redeemHash.slice(-8)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 赎回错误提示 */}
        {redeemError && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">❌</div>
              <div className="flex-1">
                <p className="text-red-400 font-medium mb-1">赎回请求失败</p>
                <p className="text-red-300 text-sm">
                  {redeemError.message?.includes('User rejected') || 
                   redeemError.message?.includes('user rejected') ||
                   redeemError.message?.includes('rejected')
                    ? '您已取消交易。如需赎回，请重新点击按钮并确认交易。'
                    : redeemError.message || '未知错误，请稍后重试'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 赎回交易失败提示 */}
        {isRedeemFailed && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">⚠️</div>
              <div className="flex-1">
                <p className="text-red-400 font-medium mb-1">交易执行失败</p>
                <p className="text-red-300 text-sm">
                  可能的原因：
                </p>
                <ul className="text-red-300/80 text-xs mt-2 list-disc list-inside space-y-1">
                  <li>赎回数量超过余额</li>
                  <li>超过每日赎回限额</li>
                  <li>赎回数量低于最小限额</li>
                  <li>合约已暂停</li>
                </ul>
                {redeemHash && (
                  <p className="text-red-400/70 text-xs mt-2 font-mono">
                    交易哈希: {redeemHash.slice(0, 10)}...{redeemHash.slice(-8)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 赎回说明 */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">赎回须知</h3>
        <div className="space-y-3 text-sm text-blue-300">
          <p>• 赎回按当前资产支撑比率计算，可能因市场波动而变化</p>
          <p>• 赎回请求提交后需要等待处理，通常在 1-3 个工作日内完成</p>
          <p>• 处理完成后，稳定币将自动转入您的钱包地址</p>
          <p>• 大额赎回可能需要额外的审核时间</p>
        </div>
      </div>
    </div>
  );
};

export default TokenRedemption;

