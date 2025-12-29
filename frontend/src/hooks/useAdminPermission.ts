import { useAccount } from 'wagmi';
import { useReadContracts } from 'wagmi';
import { useMemo } from 'react';
import type { Abi } from 'viem';
import { PATENT_COIN_ABI, PATENT_COIN_ADDRESS } from '../config/contracts';
import { keccak256, toBytes } from 'viem';

/**
 * 检查用户是否为授权的多签钱包或拥有管理角色
 * @returns { isAuthorized: boolean, isLoading: boolean }
 */
export function useAdminPermission() {
  const { address, isConnected } = useAccount();
  const contractAddress = PATENT_COIN_ADDRESS as `0x${string}`;

  // 定义需要检查的角色
  // DEFAULT_ADMIN_ROLE 在 OpenZeppelin 中是 bytes32(0) = 0x0000...0000
  // 其他角色使用 keccak256 计算
  const roles = useMemo(() => {
    return [
      '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`, // DEFAULT_ADMIN_ROLE = bytes32(0)
      keccak256(toBytes('MINTER_ROLE')), // MINTER_ROLE
      keccak256(toBytes('PATENT_MANAGER_ROLE')), // PATENT_MANAGER_ROLE
      keccak256(toBytes('REVENUE_MANAGER_ROLE')), // REVENUE_MANAGER_ROLE
    ];
  }, []);

  // 构建查询合约
  const contracts = useMemo(() => {
    if (!address || !isConnected) return [];

    // 1. 检查是否为授权的多签钱包
    const multisigCheck = {
      address: contractAddress,
      abi: PATENT_COIN_ABI as Abi,
      functionName: 'isAuthorizedMultisig' as const,
      args: [address] as const,
    };

    // 2. 检查是否拥有各个管理角色
    const roleChecks = roles.map((role) => ({
      address: contractAddress,
      abi: PATENT_COIN_ABI as Abi,
      functionName: 'hasRole' as const,
      args: [role, address] as const,
    }));

    return [multisigCheck, ...roleChecks];
  }, [address, isConnected, contractAddress, roles]);

  // 执行批量查询
  const { data, isLoading, error } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0 && !!address && isConnected,
    },
  });

  // 处理查询结果
  const result = useMemo(() => {
    if (!data || data.length === 0) {
      return { isAuthorized: false, isLoading };
    }

    // 第一个结果是 isAuthorizedMultisig
    const isMultisig = data[0]?.result as boolean | undefined;
    
    // 后续结果是各个角色的检查
    const hasAnyRole = data.slice(1).some((item) => item?.result === true);

    // 如果是授权的多签钱包或拥有任一管理角色，则授权
    const isAuthorized = (isMultisig === true) || hasAnyRole;

    return { isAuthorized, isLoading };
  }, [data, isLoading]);

  // 如果有错误，默认不授权（安全默认）
  if (error) {
    console.error('权限检查错误:', error);
    return { isAuthorized: false, isLoading: false };
  }

  return result;
}

