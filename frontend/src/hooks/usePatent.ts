import { useMemo } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import type { Abi } from 'viem';
import { PATENT_COIN_ABI, PATENT_COIN_ADDRESS, PATENT_ASSET_MANAGER_ABI, PATENT_ASSET_MANAGER_ADDRESS } from '../config/contracts';
import type { PatentAsset } from '../types/contracts';

// 从主合约获取 PatentAssetManager 地址
function usePatentAssetManagerAddress() {
  const { data: address } = useReadContract({
    address: PATENT_COIN_ADDRESS,
    abi: PATENT_COIN_ABI as Abi,
    functionName: 'patentAssetManager',
  });
  return (PATENT_ASSET_MANAGER_ADDRESS || address) as `0x${string}` | undefined;
}

export function usePatentInfo(patentNumber?: string) {
  const assetManagerAddress = usePatentAssetManagerAddress();
  
  return useReadContract({
    address: assetManagerAddress,
    abi: PATENT_ASSET_MANAGER_ABI as Abi,
    functionName: 'getPatent',
    args: patentNumber ? [patentNumber] : undefined,
    query: { enabled: !!patentNumber && !!assetManagerAddress },
  });
}

// 获取链上全部专利编号（使用分页方式）
export function usePatentNumbers() {
  const assetManagerAddress = usePatentAssetManagerAddress();
  
  // 先获取专利数量
  const { data: patentCount } = useReadContract({
    address: assetManagerAddress,
    abi: PATENT_ASSET_MANAGER_ABI as Abi,
    functionName: 'getPatentCount',
    query: { enabled: !!assetManagerAddress },
  });

  // 然后获取所有专利编号（分页获取，最多100个）
  const { data: patentNumbers } = useReadContract({
    address: assetManagerAddress,
    abi: PATENT_ASSET_MANAGER_ABI as Abi,
    functionName: 'getPatentsPaginated',
    args: [BigInt(0), BigInt(100)],
    query: { enabled: !!assetManagerAddress && (Number(patentCount || 0) > 0) },
  });

  return { data: patentNumbers as string[] | undefined };
}

// 批量获取所有专利详情，传入专利编号数组
export function useAllPatents(patentNumbers?: string[]) {
  const assetManagerAddress = usePatentAssetManagerAddress();
  const { data: fetchedPatentNumbers } = usePatentNumbers();

  const resolvedNumbers = patentNumbers ?? (fetchedPatentNumbers as string[] | undefined) ?? [];

  const contracts = useMemo<NonNullable<Parameters<typeof useReadContracts>[0]>['contracts']>(() => {
    if (!resolvedNumbers || resolvedNumbers.length === 0 || !assetManagerAddress) return [];
    return resolvedNumbers.map((num) => ({
      address: assetManagerAddress,
      abi: PATENT_ASSET_MANAGER_ABI as Abi,
      functionName: 'getPatent' as const,
      args: [num] as const,
    }));
  }, [resolvedNumbers, assetManagerAddress]);

  const { data, isLoading, error } = useReadContracts({
    contracts: contracts ?? [],
    query: { enabled: (contracts?.length ?? 0) > 0 && !!assetManagerAddress },
  });

  // 调试信息
  console.log('=== useAllPatents 调试信息 ===');
  console.log('resolvedNumbers:', resolvedNumbers);
  console.log('assetManagerAddress:', assetManagerAddress);
  console.log('contracts.length:', contracts?.length || 0);
  console.log('data:', data);
  console.log('isLoading:', isLoading);
  console.log('error:', error);

  // useReadContracts 返回的数据结构：{ status: 'success' | 'error', result?: any, error?: Error }[]
  const patents: PatentAsset[] = useMemo(() => {
    console.log('=== useAllPatents useMemo 调试 ===');
    console.log('data:', data);
    console.log('data isArray:', Array.isArray(data));
    
    if (!data || !Array.isArray(data)) {
      console.log('数据为空或不是数组，返回空数组');
      return [];
    }
    
    console.log('data.length:', data.length);
    
    const mapped = data.map((res: any, idx: number) => {
      console.log(`处理专利 ${idx}:`, res);
      
      // 检查响应状态和结果
      if (res?.status !== 'success' || !res?.result) {
        console.log(`专利 ${idx} 查询失败:`, res?.status, res?.error);
        // 静默处理错误，不打印警告（可能是专利不存在）
        return null;
      }
      
      // PatentAssetManager.getPatent 返回的结构体：
      // { patentNumber, title, inventors[], valuationUSD, weight, active, addedTimestamp, ipfsMetadata }
      const patent = res.result as any;
      console.log(`专利 ${idx} 数据:`, patent);
      
      // 检查专利是否存在（不检查 active 状态，因为停用的专利也应该显示）
      // 如果专利不存在，patentNumber 会是空字符串
      // 有效的专利必须满足：patentNumber 不为空
      const isValidPatent = 
        patent.patentNumber && 
        patent.patentNumber.length > 0;
      
      console.log(`专利 ${idx} 有效性:`, isValidPatent, {
        patentNumber: patent.patentNumber,
        active: patent.active
      });
      
      if (!isValidPatent) {
        // 专利不存在（patentNumber 为空），跳过（不打印警告，这是正常情况）
        return null;
      }
      
      // 确保所有字段都有默认值
      const patentAsset = {
        patentNumber: patent.patentNumber ?? resolvedNumbers[idx] ?? '',
        title: patent.title ?? '',
        description: '', // PatentAssetManager 没有这个字段，设为空字符串
        inventors: Array.isArray(patent.inventors) ? patent.inventors : [],
        valuationUSD: BigInt(patent.valuationUSD?.toString() || '0'),
        weight: BigInt(patent.weight?.toString() || '0'),
        addedTimestamp: BigInt(patent.addedTimestamp?.toString() || '0'),
        ipfsMetadata: patent.ipfsMetadata ?? '',
        active: Boolean(patent.active),
      } as PatentAsset;
      
      console.log(`专利 ${idx} 处理结果:`, patentAsset);
      return patentAsset;
    });
    
    const filtered = mapped.filter((patent): patent is PatentAsset => patent !== null);
    console.log('过滤后的专利数量:', filtered.length);
    return filtered;
  }, [data, resolvedNumbers]);

  return { patents, isLoading, error };
}