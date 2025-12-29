import { useAccount } from 'wagmi';
import { useReadContract, useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { useMemo } from 'react';
import type { Abi } from 'viem';
import { PATENT_COIN_ABI, PATENT_COIN_ADDRESS, PATENT_ASSET_MANAGER_ABI, PATENT_ASSET_MANAGER_ADDRESS, REVENUE_DISTRIBUTOR_ABI, RESERVE_ASSET_MANAGER_ABI } from '../config/contracts';
import type { PatentAsset, TokenInfo, RevenueInfo, PatentStats } from '../types/contracts';
import { useAllPatents } from './usePatent';

type PatentCoinResult = {
  isConnected: boolean;
  contractAddress: `0x${string}`;
  loading: boolean;
  error: null;
  balance: bigint;
  tokenInfo: TokenInfo;
  patentStats: PatentStats;
  patentNumbers: string[];
  patents: PatentAsset[];
  revenueInfo: RevenueInfo;
  refreshAllData: () => Promise<void>;
};

/**
 * 只读模式的 PatentCoin Hook (Wagmi v2)
 * 使用 useReadContract 获取合约数据
 */
export function usePatentCoin(): PatentCoinResult {
  const { address, isConnected } = useAccount();
  // 优先环境变量，回落默认配置
  const contractAddress = (
    PATENT_COIN_ADDRESS 
  ) as `0x${string}`;

  // ==================== 读取 Token 基本信息 ====================
  
  const { data: name } = useReadContract({
    address: contractAddress,
    abi: PATENT_COIN_ABI,
    functionName: 'name',
  });

  const { data: symbol } = useReadContract({
    address: contractAddress,
    abi: PATENT_COIN_ABI,
    functionName: 'symbol',
  });

  const { data: decimals } = useReadContract({
    address: contractAddress,
    abi: PATENT_COIN_ABI,
    functionName: 'decimals',
  });

  const { data: totalSupply } = useReadContract({
    address: contractAddress,
    abi: PATENT_COIN_ABI,
    functionName: 'totalSupply',
  });

  const { data: maxSupply } = useReadContract({
    address: contractAddress,
    abi: PATENT_COIN_ABI,
    functionName: 'maxSupply',
  });

  // ==================== 获取 PatentAssetManager 地址 ====================
  const { data: patentAssetManagerAddress } = useReadContract({
    address: contractAddress,
    abi: PATENT_COIN_ABI,
    functionName: 'patentAssetManager',
  });

  // 优先使用从主合约获取的地址（更准确），如果没有则使用环境变量或默认配置
  const assetManagerAddress = (patentAssetManagerAddress || PATENT_ASSET_MANAGER_ADDRESS) as `0x${string}` | undefined;


  // ==================== 读取专利信息（从 PatentAssetManager 模块）====================
  
  const { data: patentCount, isLoading: isLoadingPatentCount, error: patentCountError } = useReadContract({
    address: assetManagerAddress,
    abi: PATENT_ASSET_MANAGER_ABI,
    functionName: 'getPatentCount',
    query: { enabled: !!assetManagerAddress },
  });

  // 使用 getPatentsPaginated 获取所有专利编号（分页获取）
  const { data: patentNumbersPage1 } = useReadContract({
    address: assetManagerAddress,
    abi: PATENT_ASSET_MANAGER_ABI,
    functionName: 'getPatentsPaginated',
    args: [BigInt(0), BigInt(100)], // 获取前100个
    query: { enabled: !!assetManagerAddress && (Number(patentCount || 0) > 0) },
  });

  const patentNumbersList = (patentNumbersPage1 as string[] | undefined) || [];

  // 调试信息
  console.log('=== usePatentCoin 调试信息 ===');
  console.log('patentCount:', patentCount);
  console.log('assetManagerAddress:', assetManagerAddress);
  console.log('patentNumbersPage1:', patentNumbersPage1);
  console.log('patentNumbersList:', patentNumbersList);
  console.log('isLoadingPatentCount:', isLoadingPatentCount);
  console.log('patentCountError:', patentCountError);

  // 从主合约获取总估值（它会调用模块）
  const { data: totalValuation } = useReadContract({
    address: contractAddress,
    abi: PATENT_COIN_ABI,
    functionName: 'getTotalPatentValuation',
  });

  // 从主合约获取 ReserveAssetManager 地址
  const { data: reserveAssetManagerAddress } = useReadContract({
    address: contractAddress,
    abi: PATENT_COIN_ABI,
    functionName: 'reserveAssetManager',
  });

  // 从 ReserveAssetManager 模块获取总储备价值
  const { data: totalReserveValueUSD } = useReadContract({
    address: reserveAssetManagerAddress as `0x${string}` | undefined,
    abi: RESERVE_ASSET_MANAGER_ABI,
    functionName: 'getTotalReserveValueUSD',
    query: { enabled: !!reserveAssetManagerAddress },
  });

  // 从主合约获取支撑比率
  const { data: backingRatio } = useReadContract({
    address: contractAddress,
    abi: PATENT_COIN_ABI,
    functionName: 'getBackingRatio',
  });


  const { patents: patentInfo, isLoading: isLoadingPatents, error: patentsError } = useAllPatents(patentNumbersList);
  
  // 备用方案：如果 useAllPatents 返回空数组，但 patentNumbersList 有数据，直接使用 useReadContracts 查询
  const fallbackContracts = useMemo(() => {
    // 如果 patentInfo 为空且 patentNumbersList 有数据，使用备用方案
    if ((!patentInfo || patentInfo.length === 0) && patentNumbersList.length > 0 && assetManagerAddress) {
      return patentNumbersList.map((num) => ({
        address: assetManagerAddress,
        abi: PATENT_ASSET_MANAGER_ABI as Abi,
        functionName: 'getPatent' as const,
        args: [num] as const,
      }));
    }
    return [];
  }, [patentInfo, patentNumbersList, assetManagerAddress]);

  const { data: fallbackData } = useReadContracts({
    contracts: fallbackContracts,
    query: { enabled: fallbackContracts.length > 0 },
  });

  // 处理备用查询结果
  const fallbackPatents: PatentAsset[] = useMemo(() => {
    if (!fallbackData || !Array.isArray(fallbackData) || fallbackData.length === 0) return [];
    
    return fallbackData
      .map((res: any, idx: number) => {
        if (res?.status !== 'success' || !res?.result) return null;
        
        const patent = res.result as any;
        // 检查专利是否存在（不检查 active 状态，因为停用的专利也应该显示）
        const isValidPatent = 
          patent.patentNumber && 
          patent.patentNumber.length > 0;
        
        if (!isValidPatent) return null;
        
        return {
          patentNumber: patent.patentNumber ?? patentNumbersList[idx] ?? '',
          title: patent.title ?? '',
          description: '',
          inventors: Array.isArray(patent.inventors) ? patent.inventors : [],
          valuationUSD: BigInt(patent.valuationUSD?.toString() || '0'),
          weight: BigInt(patent.weight?.toString() || '0'),
          addedTimestamp: BigInt(patent.addedTimestamp?.toString() || '0'),
          ipfsMetadata: patent.ipfsMetadata ?? '',
          active: Boolean(patent.active),
        } as PatentAsset;
      })
      .filter((patent): patent is PatentAsset => patent !== null);
  }, [fallbackData, patentNumbersList]);

  // 优先使用 useAllPatents 的结果，如果为空则使用备用查询结果
  const finalPatents = (patentInfo && patentInfo.length > 0) ? patentInfo : fallbackPatents;
  
  // 调试信息：专利详情
  console.log('patentInfo:', patentInfo);
  console.log('isLoadingPatents:', isLoadingPatents);
  console.log('patentsError:', patentsError);
  console.log('fallbackPatents:', fallbackPatents);
  console.log('finalPatents:', finalPatents);

  // ==================== 用户余额 ====================
  const { data: balance } = useReadContract({
    address: contractAddress,
    abi: PATENT_COIN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // ========== 精度处理 ==========
  const decimalsNum = typeof decimals === 'number' ? decimals : 18;
  const toUnits = (v?: bigint) => formatUnits((v as bigint) || BigInt(0), decimalsNum);

  // ==================== 收益信息 ====================
  // 从主合约获取 revenueDistributor 模块地址
  const { data: revenueDistributorAddress } = useReadContract({
    address: contractAddress,
    abi: PATENT_COIN_ABI,
    functionName: 'revenueDistributor',
  });

  // 从主合约获取当前收益轮次（它会调用模块）
  const { data: currentRound } = useReadContract({
    address: contractAddress,
    abi: PATENT_COIN_ABI,
    functionName: 'getCurrentRevenueRound',
  });

  // 获取用户余额（用于计算可领取收益）
  const userBalance = (balance as bigint) || BigInt(0);

  // 从 RevenueDistributor 模块获取当前轮次的可领取收益
  // 注意：如果 currentRound 为 0，说明还没有收益分配
  const { data: claimableRevenueForCurrentRound } = useReadContract({
    address: revenueDistributorAddress as `0x${string}` | undefined,
    abi: REVENUE_DISTRIBUTOR_ABI,
    functionName: 'getClaimableRevenue',
    args: currentRound && address ? [currentRound as bigint, address, userBalance] : undefined,
    query: { enabled: !!revenueDistributorAddress && !!address && !!currentRound && Number(currentRound) > 0 },
  });

  // 获取当前轮次的收益信息（用于计算总收益）
  // getRevenueRound 返回 RevenueRound 结构体：{ totalAmount, timestamp, revenueToken, totalSupplySnapshot }
  const { data: revenueRoundInfo } = useReadContract({
    address: revenueDistributorAddress as `0x${string}` | undefined,
    abi: REVENUE_DISTRIBUTOR_ABI,
    functionName: 'getRevenueRound',
    args: currentRound ? [currentRound as bigint] : undefined,
    query: { enabled: !!revenueDistributorAddress && !!currentRound && Number(currentRound) > 0 },
  });

  // 计算总收益（当前轮次的总金额）
  // revenueRoundInfo 是一个对象，包含 totalAmount 字段
  const totalRevenue = revenueRoundInfo && typeof revenueRoundInfo === 'object' && 'totalAmount' in revenueRoundInfo
    ? (revenueRoundInfo.totalAmount as bigint) || BigInt(0)
    : BigInt(0);

  // 可领取收益（当前轮次）
  const claimableRevenue = (claimableRevenueForCurrentRound as bigint) || BigInt(0);

  // ==================== 返回数据 ====================
  
  return {
    // 连接状态
    isConnected,
    contractAddress,
    loading: false, // wagmi 自动处理加载状态
    error: null,
    balance: (balance as bigint) || BigInt(0),

    // Token 信息
    tokenInfo: {
      name: (name as string) || '',
      symbol: (symbol as string) || '',
      totalSupply: (totalSupply as bigint) || BigInt(0),
      maxSupply: (maxSupply as bigint) || BigInt(0),
      decimals: decimalsNum,
    },


    // 专利统计
    patentStats: {
      patentCount: Number(patentCount || 0),
      totalValuation:(totalValuation as bigint) || BigInt(0),
      backingRatio: (backingRatio as bigint) || BigInt(0),
    },

    // 专利列表（编号 + 详情）
    patentNumbers: patentNumbersList,
    patents: finalPatents as PatentAsset[],

    // 收益信息
    revenueInfo: {
      claimableRevenue: toUnits(claimableRevenue as bigint),
      totalRevenue: toUnits(totalRevenue as bigint),
      currentRound: (currentRound as bigint) || BigInt(0),
    },


    // 刷新方法（wagmi 会自动刷新）
    refreshAllData: async () => {
      // wagmi 会自动处理数据刷新
      console.log('Data will be auto-refreshed by wagmi');
    },
  };
}
