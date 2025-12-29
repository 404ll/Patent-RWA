import { useReadContract } from 'wagmi';
import { useChainId } from 'wagmi';
import { formatUnits } from 'viem';

// Chainlink ETH/USD 价格预言机地址
const CHAINLINK_ETH_USD_FEEDS: Record<number, `0x${string}`> = {
  // Ethereum Mainnet
  1: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
  // Sepolia Testnet
  11155111: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
  // 其他网络可以继续添加
};

// Chainlink AggregatorV3Interface ABI (只需要 latestRoundData 函数)
const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { name: 'roundId', type: 'uint80', internalType: 'uint80' },
      { name: 'answer', type: 'int256', internalType: 'int256' },
      { name: 'startedAt', type: 'uint256', internalType: 'uint256' },
      { name: 'updatedAt', type: 'uint256', internalType: 'uint256' },
      { name: 'answeredInRound', type: 'uint80', internalType: 'uint80' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8', internalType: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Hook 用于从 Chainlink 价格预言机获取 ETH/USD 价格
 */
export function useEthPrice() {
  const chainId = useChainId();
  const priceFeedAddress = CHAINLINK_ETH_USD_FEEDS[chainId];

  // 获取价格数据
  const { data: priceData, isLoading, error } = useReadContract({
    address: priceFeedAddress,
    abi: CHAINLINK_ABI,
    functionName: 'latestRoundData',
    query: {
      enabled: !!priceFeedAddress,
      refetchInterval: 60000, // 每 60 秒刷新一次
    },
  });

  // 获取小数位数（通常是 8）
  const { data: decimals } = useReadContract({
    address: priceFeedAddress,
    abi: CHAINLINK_ABI,
    functionName: 'decimals',
    query: {
      enabled: !!priceFeedAddress,
    },
  });

  // 解析价格
  let ethPrice: number | null = null;
  if (priceData && Array.isArray(priceData) && priceData[1] !== undefined) {
    const priceValue = priceData[1] as bigint;
    const decimalsNum = decimals ? Number(decimals) : 8;
    // Chainlink 价格通常是 8 位小数，例如 250000000000 表示 $2500
    ethPrice = Number(formatUnits(priceValue, decimalsNum));
  }

  return {
    ethPrice,
    isLoading,
    error,
    isSupported: !!priceFeedAddress,
  };
}

