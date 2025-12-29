import patentCoinAbiJson from '../../../artifacts/contracts/PatentCoinModular.sol/PatentCoinModular.json';
import patentAssetManagerAbiJson from '../../../artifacts/contracts/modules/PatentAssetManager.sol/PatentAssetManager.json';
import revenueDistributorAbiJson from '../../../artifacts/contracts/modules/RevenueDistributor.sol/RevenueDistributor.json';
import reserveAssetManagerAbiJson from '../../../artifacts/contracts/modules/ReserveAssetManager.sol/ReserveAssetManager.json';

export const PATENT_COIN_ABI = patentCoinAbiJson.abi;
export const PATENT_ASSET_MANAGER_ABI = patentAssetManagerAbiJson.abi;
export const REVENUE_DISTRIBUTOR_ABI = revenueDistributorAbiJson.abi;
export const RESERVE_ASSET_MANAGER_ABI = reserveAssetManagerAbiJson.abi;

// 合约地址配置
export const CONTRACT_ADDRESSES = {
  // Sepolia 测试网
  sepolia: {
    PatentCoin: "0xA29057f94EAEda93020664032D4a5A2da2DDa488",
    PatentAssetManager: "0x8BDe84b49f208fA1A0D7506ECd0b3A2Dcb4aD9d2", // 从部署日志获取的实际地址
  }
} as const;

const env = (import.meta as any).env as Record<string, string | undefined>;

// 统一的地址导出，优先使用环境变量，缺省回落到默认配置
export const PATENT_COIN_ADDRESS = (
  env.VITE_PATENTCOIN_ADDRESS || CONTRACT_ADDRESSES.sepolia.PatentCoin
) as `0x${string}`;

// PatentAssetManager 地址（可以从主合约的 patentAssetManager getter 获取，或通过环境变量）
export const PATENT_ASSET_MANAGER_ADDRESS = (
  env.VITE_PATENT_ASSET_MANAGER_ADDRESS || CONTRACT_ADDRESSES.sepolia.PatentAssetManager
) as `0x${string}` | undefined;

// PatentCoinPurchase 购买合约地址（从环境变量获取）
export const PATENT_COIN_PURCHASE_ADDRESS = (
  env.VITE_PATENT_COIN_PURCHASE_ADDRESS || undefined
) as `0x${string}` | undefined;

// 获取当前网络的合约地址
export function getContractAddress(): string {
  return PATENT_COIN_ADDRESS;
}
