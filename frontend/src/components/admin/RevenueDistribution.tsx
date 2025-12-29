import React, { useState, useEffect, useMemo } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContracts } from 'wagmi';
import { parseUnits, formatUnits, formatEther } from 'viem';
import type { Abi } from 'viem';
import { PATENT_COIN_ADDRESS, PATENT_COIN_ABI, REVENUE_DISTRIBUTOR_ABI } from '../../config/contracts';

// 常用代币地址
// const TOKEN_OPTIONS = [
//   { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
//   { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
//   { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EescdeCB5DBe2f', decimals: 18 },
// ];
const MOCK_TOKEN_OPTIONS = [
  { symbol: 'Test Token', address: '0x4102613B42721d40233d360Fc7dFAC05a09678Ea', decimals: 6 },
  
];
const RevenueDistribution: React.FC = () => {
  const [distributeForm, setDistributeForm] = useState({
    amount: '',
    tokenAddress: '',
    tokenDecimals: 6
  });
  // 收益分配历史（从链上获取）
  type RevenueHistoryItem = {
    roundId: number;
    totalAmount: bigint;
    timestamp: bigint;
    revenueToken: string;
    totalSupplySnapshot: bigint;
  };

  const contractAddress = PATENT_COIN_ADDRESS as `0x${string}`;

  // 获取 RevenueDistributor 模块地址
  const { data: revenueDistributorAddress } = useReadContract({
    address: contractAddress,
    abi: PATENT_COIN_ABI,
    functionName: 'revenueDistributor',
  });

  // 获取合约数据
  const { data: currentRound } = useReadContract({
    address: revenueDistributorAddress as `0x${string}` | undefined,
    abi: REVENUE_DISTRIBUTOR_ABI,
    functionName: 'getCurrentRevenueRound',
    query: { enabled: !!revenueDistributorAddress },
  });

  // 生成所有轮次的查询合约列表
  const revenueRoundContracts = useMemo(() => {
    if (!revenueDistributorAddress || !currentRound || Number(currentRound) === 0) return [];
    
    const roundCount = Number(currentRound);
    const contracts = [];
    for (let i = 1; i <= roundCount; i++) {
      contracts.push({
        address: revenueDistributorAddress as `0x${string}`,
        abi: REVENUE_DISTRIBUTOR_ABI as Abi,
        functionName: 'getRevenueRound' as const,
        args: [BigInt(i)] as const,
      });
    }
    return contracts;
  }, [revenueDistributorAddress, currentRound]);

  // 批量获取所有收益分配历史
  const { data: revenueRoundsData, isLoading: isLoadingHistory } = useReadContracts({
    contracts: revenueRoundContracts,
    query: { enabled: revenueRoundContracts.length > 0 },
  });

  // 处理收益分配历史数据
  const revenueHistory: RevenueHistoryItem[] = useMemo(() => {
    if (!revenueRoundsData || !Array.isArray(revenueRoundsData)) return [];
    
    return revenueRoundsData
      .map((result: any, index: number) => {
        if (result?.status !== 'success' || !result?.result) return null;
        
        const round = result.result as any;
        return {
          roundId: index + 1,
          totalAmount: BigInt(round.totalAmount?.toString() || '0'),
          timestamp: BigInt(round.timestamp?.toString() || '0'),
          revenueToken: round.revenueToken || '',
          totalSupplySnapshot: BigInt(round.totalSupplySnapshot?.toString() || '0'),
        } as RevenueHistoryItem;
      })
      .filter((item): item is RevenueHistoryItem => item !== null)
      .reverse(); // 最新的在前
  }, [revenueRoundsData]);

  const { data: totalSupply } = useReadContract({
    address: contractAddress,
    abi: PATENT_COIN_ABI,
    functionName: 'totalSupply'
  });

  const { data: platformFeeRate } = useReadContract({
    address: contractAddress,
    abi: PATENT_COIN_ABI,
    functionName: 'platformFeeRate'
  });

  const { 
    writeContract: distributeRevenue, 
    data: distributeHash, 
    isPending: isDistributing,
    error: distributeError 
  } = useWriteContract();
  
  const { 
    isLoading: isDistributeConfirming, 
    isSuccess: isDistributeSuccess,
    isError: isDistributeFailed 
  } = useWaitForTransactionReceipt({
    hash: distributeHash,
  });

  // 处理分配成功后的状态更新
  useEffect(() => {
    if (isDistributeSuccess) {
      setDistributeForm({ amount: '', tokenAddress: '', tokenDecimals: 6 });
      // 历史记录会自动从链上更新，不需要手动添加
    }
  }, [isDistributeSuccess]);

  // 计算费用和净收益
  // platformFeeRate 是基点（250 = 2.5%），需要除以 10000
  const feeRate = platformFeeRate ? Number(platformFeeRate) / 10000 * 100 : 2.5;
  const grossAmount = parseFloat(distributeForm.amount || '0');
  const platformFee = grossAmount * (feeRate / 100);
  const netAmount = grossAmount - platformFee;

  // 计算每个代币的收益
  const perTokenRevenue = totalSupply && netAmount > 0
    ? netAmount / Number(formatEther(totalSupply as bigint))
    : 0;

  return (
    <div className="space-y-6">
      {/* 收益分配统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-300">当前轮次</p>
              <p className="text-2xl font-bold text-white mt-1">
                #{currentRound ? currentRound.toString() : '0'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
              🔄
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-300">平台费率</p>
              <p className="text-2xl font-bold text-white mt-1">{feeRate}%</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center text-2xl">
              💸
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-300">代币总供应量</p>
              <p className="text-2xl font-bold text-white mt-1">
                {totalSupply ? Number(formatEther(totalSupply as bigint)).toLocaleString() : '0'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-2xl">
              🪙
            </div>
          </div>
        </div>
      </div>

      {/* 分配收益表单 */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">发起收益分配</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-purple-300 mb-2">选择收益代币</label>
            <select
              value={distributeForm.tokenAddress}
              onChange={(e) => {
                const token = MOCK_TOKEN_OPTIONS.find(t => t.address === e.target.value);
                setDistributeForm({
                  ...distributeForm,
                  tokenAddress: e.target.value,
                  tokenDecimals: token?.decimals || 6
                });
              }}
              className="w-full bg-white/10 border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400"
            >
              <option value="" className="bg-slate-800">选择代币...</option>
              {MOCK_TOKEN_OPTIONS.map((token) => (
                <option key={token.symbol} value={token.address} className="bg-slate-800">
                  {token.symbol}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-300 mb-2">
              收益总金额 {distributeForm.tokenAddress && `(${MOCK_TOKEN_OPTIONS.find(t => t.address === distributeForm.tokenAddress)?.symbol})`}
            </label>
            <input
              type="number"
              placeholder="例如: 10000"
              value={distributeForm.amount}
              onChange={(e) => setDistributeForm({ ...distributeForm, amount: e.target.value })}
              className="w-full bg-white/10 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400"
            />
          </div>
        </div>

        {/* 收益预览 */}
        {distributeForm.amount && parseFloat(distributeForm.amount) > 0 && (
          <div className="bg-black/20 rounded-xl p-4 mb-6">
            <h4 className="text-sm font-medium text-purple-300 mb-3">收益分配预览</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-purple-400">总金额</p>
                <p className="text-lg font-semibold text-white">${grossAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-purple-400">平台费用 ({feeRate}%)</p>
                <p className="text-lg font-semibold text-orange-400">-${platformFee.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-purple-400">净分配金额</p>
                <p className="text-lg font-semibold text-green-400">${netAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-purple-400">每PATENT 收益</p>
                <p className="text-lg font-semibold text-cyan-400">${perTokenRevenue.toFixed(6)}</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            if (!distributeForm.amount || !distributeForm.tokenAddress || !revenueDistributorAddress || !totalSupply) return;
            // 直接调用 RevenueDistributor 模块，而不是通过主合约
            // 这样 msg.sender 就是用户地址，不需要给主合约地址授权
            distributeRevenue({
              address: revenueDistributorAddress as `0x${string}`,
              abi: REVENUE_DISTRIBUTOR_ABI,
              functionName: 'distributeRevenue',
              args: [
                parseUnits(distributeForm.amount || '0', distributeForm.tokenDecimals),
                distributeForm.tokenAddress as `0x${string}`,
                totalSupply as bigint
              ],
              // 设置 gas limit 上限，避免超过网络限制
              // Sepolia 测试网的 gas limit 上限通常是 16777216 (2^24)
              gas: BigInt(15000000) // 设置为 1500 万，留有余地
            } as any);
          }}
          disabled={
            isDistributing ||
            isDistributeConfirming ||
            !distributeForm.amount ||
            !distributeForm.tokenAddress ||
            !revenueDistributorAddress ||
            !totalSupply ||
            parseFloat(distributeForm.amount) <= 0
          }
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isDistributing || isDistributeConfirming ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              分配中...
            </span>
          ) : (
            '💰 发起收益分配'
          )}
        </button>

        {/* 收益分配成功提示 */}
        {isDistributeSuccess && (
          <div className="mt-4 p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">✅</div>
              <div className="flex-1">
                <p className="text-green-400 font-medium mb-1">收益分配成功！</p>
                <p className="text-green-300 text-sm">
                  第 {currentRound ? Number(currentRound) + 1 : 1} 轮收益分配已开始，用户现在可以领取收益。
            </p>
                {distributeHash && (
                  <p className="text-green-400/70 text-xs mt-2 font-mono">
                    交易哈希: {distributeHash}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 收益分配错误提示 */}
        {distributeError && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">❌</div>
              <div className="flex-1">
                <p className="text-red-400 font-medium mb-1">收益分配失败</p>
                <p className="text-red-300 text-sm">
                  {distributeError.message?.includes('User rejected') || 
                   distributeError.message?.includes('user rejected') ||
                   distributeError.message?.includes('rejected')
                    ? '您已取消交易。如需分配收益，请重新点击按钮并确认交易。'
                    : distributeError.message?.includes('caller does not have required role') || 
                      distributeError.message?.includes('BaseModule: caller does not have required role')
                    ? '❌ 错误：当前账户没有 REVENUE_MANAGER_ROLE 权限或不是授权的多签钱包。请运行 fix-roles.js 脚本修复权限。'
                    : distributeError.message || '未知错误，请稍后重试'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 收益分配交易失败提示 */}
        {isDistributeFailed && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">⚠️</div>
              <div className="flex-1">
                <p className="text-red-400 font-medium mb-1">交易执行失败</p>
                <p className="text-red-300 text-sm">
                  可能的原因：
                </p>
                <ul className="text-red-300/80 text-xs mt-2 list-disc list-inside space-y-1">
                  <li>代币余额不足</li>
                  <li>未授权代币给合约</li>
                  <li>没有收益分配权限</li>
                  <li>合约已暂停</li>
                </ul>
                {distributeHash && (
                  <p className="text-red-400/70 text-xs mt-2 font-mono">
                    交易哈希: {distributeHash.slice(0, 10)}...{distributeHash.slice(-8)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 收益分配历史 */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">
          收益分配历史
          {isLoadingHistory && (
            <span className="ml-2 text-sm text-purple-400">(加载中...)</span>
          )}
        </h3>
        {revenueHistory.length === 0 ? (
          <p className="text-purple-300 text-sm text-center py-8">
            {isLoadingHistory ? '正在加载历史记录...' : '暂无收益分配记录'}
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {revenueHistory.map((dist) => {
              const selectedToken = MOCK_TOKEN_OPTIONS.find(t => 
                t.address.toLowerCase() === dist.revenueToken.toLowerCase()
              );
              const tokenSymbol = selectedToken?.symbol || 'Unknown';
              const tokenDecimals = selectedToken?.decimals || 6;
              const formattedAmount = formatUnits(dist.totalAmount, tokenDecimals);
              const date = new Date(Number(dist.timestamp) * 1000);
              
              return (
              <div
                  key={dist.roundId}
                  className="flex items-center justify-between p-3 bg-black/20 rounded-xl hover:bg-black/30 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <span className="text-purple-400">💰</span>
                  </div>
                  <div>
                      <p className="text-sm text-white">第 {dist.roundId} 轮</p>
                      <p className="text-xs text-purple-400">
                        {date.toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-400">
                      {parseFloat(formattedAmount).toLocaleString('zh-CN', {
                        maximumFractionDigits: 2
                      })} {tokenSymbol}
                    </p>
                    <p className="text-xs text-purple-400">
                      总供应量: {formatEther(dist.totalSupplySnapshot)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
    </div>
  );
};

export default RevenueDistribution;

