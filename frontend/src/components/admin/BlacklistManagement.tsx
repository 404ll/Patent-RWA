import React, { useState, useEffect, useMemo } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { isAddress, type Abi } from 'viem';
import { COMPLIANCE_MANAGER_ABI, CONTRACT_ADDRESSES } from '../../config/contracts';
import { useContractPaused } from '../../hooks/useContractPaused';


const BlacklistManagement: React.FC = () => {
  const { isPaused } = useContractPaused();
  const [addressInput, setAddressInput] = useState('');
  const [batchAddresses, setBatchAddresses] = useState('');
  const complianceManagerAddress = CONTRACT_ADDRESSES.sepolia.ComplianceManager;

  // 获取黑名单统计
  const { data: blacklistedCount } = useReadContract({
    address: complianceManagerAddress,
    abi: COMPLIANCE_MANAGER_ABI as Abi,
    functionName: 'blacklistedCount',
    query: { enabled: !!complianceManagerAddress },
  });

  const isValidAddress =
  !!addressInput && isAddress(addressInput)

const { data: isBlacklisted } = useReadContract({
  address: complianceManagerAddress,
  abi: COMPLIANCE_MANAGER_ABI as Abi,
  functionName: 'isBlacklisted',
  args: isValidAddress
    ? [addressInput as `0x${string}`]
    : undefined,
  query: {
    enabled: !!complianceManagerAddress && isValidAddress,
  },
})


  const { writeContract, data: txHash, isPending, error: txError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // 添加到黑名单
  const handleAddToBlacklist = () => {
    if (!addressInput || !isAddress(addressInput)) {
      alert('请输入有效的地址');
      return;
    }

    if (!complianceManagerAddress) {
      alert('无法获取 ComplianceManager 地址');
      return;
    }

    if (!confirm(`确定要将地址 ${addressInput} 添加到黑名单吗？\n\n黑名单地址将无法进行任何代币转账。`)) {
      return;
    }

    writeContract({
      address: complianceManagerAddress as `0x${string}`,
      abi: COMPLIANCE_MANAGER_ABI as Abi,
      functionName: 'addToBlacklist',
      args: [addressInput as `0x${string}`],
      gas: BigInt(200000),
    } as any);
  };

  // 从黑名单移除
  const handleRemoveFromBlacklist = () => {
    if (!addressInput || !isAddress(addressInput)) {
      alert('请输入有效的地址');
      return;
    }

    if (!complianceManagerAddress) {
      alert('无法获取 ComplianceManager 地址');
      return;
    }

    writeContract({
      address: complianceManagerAddress as `0x${string}`,
      abi: COMPLIANCE_MANAGER_ABI as Abi,
      functionName: 'removeFromBlacklist',
      args: [addressInput as `0x${string}`],
      gas: BigInt(200000),
    } as any);
  };

  // 批量添加到黑名单
  const handleBatchAdd = () => {
    if (!batchAddresses.trim()) {
      alert('请输入地址列表');
      return;
    }

    const addresses = batchAddresses
      .split('\n')
      .map((addr) => addr.trim())
      .filter((addr) => addr && isAddress(addr));

    if (addresses.length === 0) {
      alert('没有有效的地址');
      return;
    }

    if (!complianceManagerAddress) {
      alert('无法获取 ComplianceManager 地址');
      return;
    }

    if (!confirm(`确定要将 ${addresses.length} 个地址添加到黑名单吗？\n\n这些地址将无法进行任何代币转账。`)) {
      return;
    }

    writeContract({
      address: complianceManagerAddress as `0x${string}`,
      abi: COMPLIANCE_MANAGER_ABI as Abi,
      functionName: 'batchAddToBlacklist',
      args: [addresses as `0x${string}`[]],
      gas: BigInt(200000),
    } as any);
  };

  // 成功后的处理
  useEffect(() => {
    if (isSuccess) {
      setAddressInput('');
      setBatchAddresses('');
    }
  }, [isSuccess]);

  return (
    <div className="space-y-6">
      {/* 黑名单概览 */}
      <div className="bg-gradient-to-r from-red-600/20 to-pink-600/20 rounded-2xl p-6 border border-red-500/30">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">黑名单管理</h3>
            <p className="text-red-300 text-sm mt-1">
              管理被禁止进行代币转账的地址列表
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-red-400">
              {blacklistedCount?.toString() || '0'}
            </p>
            <p className="text-xs text-red-300">黑名单地址数</p>
          </div>
        </div>
      </div>

            {/* 说明 */}
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-red-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">黑名单说明</h3>
        <div className="space-y-2 text-sm text-red-300">
          <p>• 黑名单中的地址将无法进行任何代币转账操作</p>
          <p>• 黑名单优先级最高，即使地址在白名单中，如果同时在黑名单中也会被阻止</p>
          <p>• 添加或移除地址需要 BLACKLISTER_ROLE 权限</p>
          <p>• 批量添加可以一次性添加多个地址，提高效率</p>
          <p>• ⚠️ 请谨慎操作，确保地址正确后再添加到黑名单</p>
        </div>
      </div>

  {/* 交易状态 */}
  {(txError || isSuccess) && (
        <div className={`p-4 rounded-xl border ${
          txError ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'
        }`}>
          {txError && (
            <div>
              <p className="text-red-400 font-medium">操作失败</p>
              <p className="text-red-300 text-sm mt-1">
                {txError.message || '交易执行失败，请检查权限或稍后重试'}
              </p>
            </div>
          )}
          {isSuccess && (
            <p className="text-green-400 font-medium">✅ 操作成功！交易已确认</p>
          )}
        </div>
      )}
      {/* 单个地址管理 */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">单个地址管理</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-purple-300 mb-2">地址</label>
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-3 bg-black/30 border border-purple-500/30 rounded-xl text-white placeholder-purple-400 focus:border-purple-400 focus:outline-none"
            />
            {addressInput && isAddress(addressInput) && (
              <div className="mt-2 p-3 bg-black/20 rounded-lg border border-purple-500/20">
                <p className="text-sm text-purple-300">
                  状态: <span className={isBlacklisted ? 'text-red-400' : 'text-green-400'}>
                    {isBlacklisted ? '🚫 已在黑名单中' : '✅ 不在黑名单中'}
                  </span>
                </p>
              </div>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleAddToBlacklist}
              disabled={
                isPaused ||
                !addressInput || 
                !isAddress(addressInput) || 
                Boolean(isPending) || 
                Boolean(isConfirming) || 
                Boolean(isBlacklisted)
              }
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-medium hover:from-red-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isPaused ? '⏸️ 合约已暂停' : isPending || isConfirming ? '处理中...' : '添加到黑名单'}
            </button>
            <button
              onClick={handleRemoveFromBlacklist}
              disabled={isPaused || !addressInput || !isAddress(addressInput) || isPending || isConfirming || !isBlacklisted}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isPaused ? '⏸️ 合约已暂停' : isPending || isConfirming ? '处理中...' : '从黑名单移除'}
            </button>
          </div>
        </div>
      </div>

      {/* 批量添加 */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">批量添加地址</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-purple-300 mb-2">
              地址列表（每行一个地址）
            </label>
            <textarea
              value={batchAddresses}
              onChange={(e) => setBatchAddresses(e.target.value)}
              placeholder="0x1234...&#10;0x5678...&#10;0x9abc..."
              rows={6}
              className="w-full px-4 py-3 bg-black/30 border border-purple-500/30 rounded-xl text-white placeholder-purple-400 focus:border-purple-400 focus:outline-none font-mono text-sm"
            />
            <p className="text-xs text-purple-400 mt-2">
              每行输入一个地址，系统会自动过滤无效地址
            </p>
          </div>
          <button
            onClick={handleBatchAdd}
            disabled={isPaused || !batchAddresses.trim() || isPending || isConfirming}
            className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-medium hover:from-red-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isPaused ? '⏸️ 合约已暂停' : isPending || isConfirming ? '处理中...' : '批量添加到黑名单'}
          </button>
        </div>
      </div>

    </div>
  );
};

export default BlacklistManagement;

