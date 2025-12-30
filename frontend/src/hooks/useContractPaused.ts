import { useReadContract } from 'wagmi';
import { PATENT_COIN_ADDRESS, PATENT_COIN_ABI } from '../config/contracts';
import type { Abi } from 'viem';

/**
 * 检查合约是否暂停的全局 Hook
 * @returns { isPaused: boolean, isLoading: boolean }
 */
export function useContractPaused() {
  const { data: paused, isLoading } = useReadContract({
    address: PATENT_COIN_ADDRESS,
    abi: PATENT_COIN_ABI as Abi,
    functionName: 'paused',
  });

  return {
    isPaused: paused === true,
    isLoading,
  };
}

