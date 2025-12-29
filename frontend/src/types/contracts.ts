
export interface PatentAsset {
  patentNumber: string;
  title: string;
  description?: string; // PatentAssetManager 没有这个字段，但保留以兼容
  inventors: string[];
  valuationUSD: bigint;
  weight?: bigint; // PatentAssetManager 有这个字段
  addedTimestamp?: bigint; // PatentAssetManager 有这个字段
  ipfsMetadata: string;
  active: boolean;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  totalSupply: bigint;
  maxSupply: bigint;
  decimals: number;
}

export interface RevenueInfo {
  claimableRevenue: string;
  totalRevenue: string;
  currentRound: bigint;
}

export interface PatentStats {
  patentCount: number;
  totalValuation: bigint;
  backingRatio: bigint;
}

