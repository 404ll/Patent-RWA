import React, { useEffect, useState, useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, formatUnits, type Abi } from 'viem';
import { PATENT_COIN_ADDRESS, PATENT_COIN_ABI, REVENUE_DISTRIBUTOR_ABI } from '../../config/contracts';
import { RevenueInfo } from '../../types/contracts';

type RevenueClaimProps = {
  patentBalance: bigint;
  totalSupply: bigint;
  revenueInfo: RevenueInfo;
};

const RevenueClaim: React.FC<RevenueClaimProps> = ({ patentBalance, totalSupply, revenueInfo }) => {
  const { address } = useAccount();
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [claimingRounds, setClaimingRounds] = useState<number[]>([]);

  const contractAddress = PATENT_COIN_ADDRESS;

  // 获取 RevenueDistributor 模块地址
  const { data: revenueDistributorAddress } = useReadContract({
    address: contractAddress,
    abi: PATENT_COIN_ABI,
    functionName: 'revenueDistributor',
  });

  // 获取当前轮次
  const currentRound = Number(revenueInfo.currentRound || 0);

  // 获取所有轮次的信息和可领取状态
  const roundIds = useMemo(() => {
    if (currentRound === 0) return [];
    return Array.from({ length: currentRound }, (_, i) => i + 1);
  }, [currentRound]);

  // 批量查询每轮的信息
  const roundQueries = useMemo(() => {
    if (!revenueDistributorAddress || !address || roundIds.length === 0) return [];
    
    return roundIds.flatMap(roundId => [
      {
        address: revenueDistributorAddress as `0x${string}`,
        abi: REVENUE_DISTRIBUTOR_ABI as Abi,
        functionName: 'getRevenueRound' as const,
        args: [BigInt(roundId)] as const,
      },
      {
        address: revenueDistributorAddress as `0x${string}`,
        abi: REVENUE_DISTRIBUTOR_ABI as Abi,
        functionName: 'hasClaimedRevenue' as const,
        args: [BigInt(roundId), address] as const,
      },
      {
        address: revenueDistributorAddress as `0x${string}`,
        abi: REVENUE_DISTRIBUTOR_ABI as Abi,
        functionName: 'getClaimableRevenue' as const,
        args: [BigInt(roundId), address, patentBalance] as const,
      },
    ]);
  }, [revenueDistributorAddress, address, roundIds, patentBalance]);

  const { data: roundsData } = useReadContracts({
    contracts: roundQueries,
    query: { enabled: roundQueries.length > 0 },
  });

  // 处理轮次数据
  const roundsInfo = useMemo(() => {
    if (!roundsData || roundsData.length === 0) return [];
    
    const rounds: Array<{
      roundId: number;
      totalAmount: bigint;
      timestamp: bigint;
      revenueToken: string;
      claimed: boolean;
      claimable: bigint;
    }> = [];

    for (let i = 0; i < roundIds.length; i++) {
      const baseIdx = i * 3;
      const roundInfo = roundsData[baseIdx]?.result as any;
      const claimed = roundsData[baseIdx + 1]?.result as boolean;
      const claimable = roundsData[baseIdx + 2]?.result as bigint;

      if (roundInfo) {
        rounds.push({
          roundId: roundIds[i],
          totalAmount: roundInfo.totalAmount || BigInt(0),
          timestamp: roundInfo.timestamp || BigInt(0),
          revenueToken: roundInfo.revenueToken || '',
          claimed: claimed || false,
          claimable: claimable || BigInt(0),
        });
      }
    }

    return rounds;
  }, [roundsData, roundIds]);

  // 计算总可领取收益
  const totalClaimable = useMemo(() => {
    return roundsInfo
      .filter(r => !r.claimed && r.claimable > 0)
      .reduce((sum, r) => sum + r.claimable, BigInt(0));
  }, [roundsInfo]);

  const { writeContract, data: claimHash, isPending: isClaiming, error: claimError } = useWriteContract();
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
    hash: claimHash,
  });

  useEffect(() => {
    if (isClaimSuccess && selectedRound !== null) {
      setClaimingRounds(prev => prev.filter(r => r !== selectedRound));
      setSelectedRound(null);
    }
  }, [isClaimSuccess, selectedRound]);

  // 处理错误：当用户拒绝交易或交易失败时，清除 claimingRounds 状态
  useEffect(() => {
    if (claimError && selectedRound !== null) {
      setClaimingRounds(prev => prev.filter(r => r !== selectedRound));
      // 延迟清除 selectedRound，以便错误消息可以显示
      setTimeout(() => {
        setSelectedRound(null);
      }, 5000); // 5秒后清除错误状态
    }
  }, [claimError, selectedRound]);

  const handleClaimRevenue = (roundId: number) => {
    if (!roundId || roundId <= 0) return;
    
    setSelectedRound(roundId);
    setClaimingRounds(prev => [...prev, roundId]);
    
    writeContract({
      address: contractAddress,
      abi: PATENT_COIN_ABI,
      functionName: 'claimRevenue',
      args: [BigInt(roundId)],
    } as any);
  };

  const handleBatchClaim = () => {
    const unclaimedRounds = roundsInfo
      .filter(r => !r.claimed && r.claimable > 0)
      .map(r => BigInt(r.roundId));
    
    if (unclaimedRounds.length === 0) {
      alert('没有可领取的收益');
      return;
    }

    // 注意：批量领取需要调用 RevenueDistributor 模块的 batchClaimRevenue
    // 但主合约可能没有这个函数，需要逐个领取
    alert(`将领取 ${unclaimedRounds.length} 轮收益，请逐个确认交易`);
    
    // 这里可以实现批量领取逻辑
    // 由于需要多次交易确认，建议用户逐个领取
  };

  // 计算用户持仓比例
  const holdingPercentage = patentBalance && totalSupply && Number(totalSupply) > 0
    ? Number(patentBalance) / Number(totalSupply)
    : 0;

  return (
    <div className="space-y-6">
      {/* 收益概览 */}
      <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-2xl p-6 border border-green-500/30">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-green-500/30 rounded-xl flex items-center justify-center text-2xl">
            💰
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">专利收益分红</h3>
            <p className="text-green-300 text-sm mt-1">
              根据您的PATENT 持仓比例，领取专利许可费分红
            </p>
          </div>
        </div>
      </div>

      {/* 收益统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-blue-500/20">
          <p className="text-sm text-blue-300">可领取收益</p>
          <p className="text-2xl font-bold text-green-400 mt-1">
            {formatUnits(totalClaimable, 18)}
          </p>
          <p className="text-xs text-blue-400">代币</p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-blue-500/20">
          <p className="text-sm text-blue-300">已领取轮次</p>
          <p className="text-2xl font-bold text-white mt-1">
            {roundsInfo.filter(r => r.claimed).length} / {roundsInfo.length}
          </p>
          <p className="text-xs text-blue-400">轮次</p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-blue-500/20">
          <p className="text-sm text-blue-300">我的持仓比例</p>
          <p className="text-2xl font-bold text-white mt-1">
            {(holdingPercentage * 100).toFixed(4)}%
          </p>
          <p className="text-xs text-blue-400">占总供应</p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-blue-500/20">
          <p className="text-sm text-blue-300">分配轮次</p>
          <p className="text-2xl font-bold text-white mt-1">
            #{revenueInfo.currentRound ? revenueInfo.currentRound.toString() : '0'}
          </p>
          <p className="text-xs text-blue-400">当前轮次</p>
        </div>
      </div>

      {/* 收益轮次列表 */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">收益分配记录</h3>
        
        {roundsInfo.length > 0 ? (
          <div className="space-y-3">
            {roundsInfo.map((round) => (
                <div
                key={round.roundId}
                className={`p-4 rounded-xl border ${
                    round.claimed
                    ? 'bg-black/20 border-blue-500/20 opacity-60'
                    : 'bg-black/20 border-green-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      round.claimed ? 'bg-blue-500/30' : 'bg-green-500/30'
                      }`}>
                      <span className={round.claimed ? 'text-blue-400' : 'text-green-400'}>
                        {round.claimed ? '✅' : '💰'}
                        </span>
                      </div>
                      <div>
                      <p className="text-white font-medium">
                        第 {round.roundId} 轮收益
                        {round.claimed && <span className="text-blue-400 text-sm ml-2">(已领取)</span>}
                      </p>
                      <p className="text-xs text-blue-400">
                        {new Date(Number(round.timestamp) * 1000).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${round.claimed ? 'text-white' : 'text-green-400'}`}>
                      {formatUnits(round.claimable, 18)}
                    </p>
                    <p className="text-xs text-blue-400">
                      {round.claimed ? '已领取' : '可领取'}
                      </p>
                    </div>
                  </div>

                {!round.claimed && round.claimable > 0 && (
                    <div className="mt-4 pt-4 border-t border-green-500/20">
                    {claimError && selectedRound === round.roundId && (
                      <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <span className="text-red-400 text-lg">⚠️</span>
                          <div className="flex-1">
                            <p className="text-red-400 text-sm font-medium">
                              {claimError.message?.includes('User rejected') || 
                               claimError.message?.includes('user rejected') ||
                               claimError.message?.includes('rejected') ||
                               claimError.message?.includes('denied') ||
                               claimError.message?.includes('User denied')
                                ? '交易已取消'
                                : '领取失败'}
                            </p>
                            <p className="text-red-300/80 text-xs mt-1">
                              {claimError.message?.includes('User rejected') || 
                               claimError.message?.includes('user rejected') ||
                               claimError.message?.includes('rejected') ||
                               claimError.message?.includes('denied') ||
                               claimError.message?.includes('User denied')
                                ? '您已取消交易，可以重新尝试领取'
                                : claimError.message || '请检查网络连接或稍后重试'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                      <button
                      onClick={() => handleClaimRevenue(round.roundId)}
                      disabled={
                        isClaiming ||
                        isClaimConfirming ||
                        claimingRounds.includes(round.roundId)
                      }
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                      {isClaiming && claimingRounds.includes(round.roundId) ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          等待确认...
                          </span>
                        ) : (
                        `💰 领取第 ${round.roundId} 轮收益`
                        )}
                      </button>
                    </div>
                  )}
                </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-blue-300">暂无收益分配记录</p>
            <p className="text-xs text-blue-400 mt-2">当有新的收益分配时，您将在这里看到</p>
          </div>
        )}

        {claimError && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">❌</div>
              <div className="flex-1">
                <p className="text-red-400 font-medium mb-1">领取失败</p>
                <p className="text-red-300 text-sm">
                  {claimError.message?.includes('User rejected') || 
                   claimError.message?.includes('user rejected') ||
                   claimError.message?.includes('rejected') ||
                   claimError.message?.includes('denied')
                    ? '您已取消交易。如需领取收益，请重新点击领取按钮。'
                    : claimError.message || '未知错误，请稍后重试'}
                </p>
                {selectedRound && (
                  <p className="text-red-400/70 text-xs mt-2">
                    第 {selectedRound} 轮收益领取失败
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {isClaimSuccess && selectedRound && (
          <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-xl">
            <p className="text-green-400 text-sm text-center">
              ✅ 第 {selectedRound} 轮收益领取成功！已转入您的钱包
            </p>
          </div>
        )}
      </div>

      {/* 一键领取所有 */}
      {totalClaimable > 0n && (
        <div className="bg-gradient-to-r from-green-600/10 to-emerald-600/10 rounded-2xl p-6 border border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">未领取收益汇总</h4>
              <p className="text-sm text-green-300 mt-1">
                共 {roundsInfo.filter(r => !r.claimed && r.claimable > 0).length} 轮未领取收益
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-400">
                {formatUnits(totalClaimable, 18)}
              </p>
              <p className="text-xs text-blue-400 mt-1">总可领取金额</p>
              <button
                onClick={handleBatchClaim}
                disabled={isClaiming || isClaimConfirming}
                className="mt-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2 rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                批量领取
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 收益说明 */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">收益分配说明</h3>
        <div className="space-y-3 text-sm text-blue-300">
          <p>• 收益来源于专利资产的许可费、授权费等收入</p>
          <p>• 分配按持仓比例进行，您持有的PATENT 越多，获得的收益越多</p>
          <p>• 平台收取 2.5% 的管理费用，剩余部分全额分配给持币人</p>
          <p>• 每轮收益需要单独领取，过期未领取的收益不会自动发放</p>
        </div>
      </div>
    </div>
  );
};

export default RevenueClaim;

