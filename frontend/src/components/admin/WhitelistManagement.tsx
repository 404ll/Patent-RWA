import React, { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { isAddress, type Abi } from 'viem';
import { CONTRACT_ADDRESSES } from '../../config/contracts';
import { COMPLIANCE_MANAGER_ABI } from '../../config/contracts';
import { useContractPaused } from '../../hooks/useContractPaused';

const WhitelistManagement: React.FC = () => {
  const { isPaused } = useContractPaused();
  const complianceManagerAddress = CONTRACT_ADDRESSES.sepolia.ComplianceManager;
  const [addressInput, setAddressInput] = useState('');
  const [batchAddresses, setBatchAddresses] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);


  // 获取白名单状态和统计
  const { data: whitelistEnabled } = useReadContract({
    address: complianceManagerAddress,
    abi: COMPLIANCE_MANAGER_ABI,
    functionName: 'whitelistEnabled',
    query: { enabled: !!complianceManagerAddress },
  });

  const { data: whitelistedCount } = useReadContract({
    address: complianceManagerAddress,
    abi: COMPLIANCE_MANAGER_ABI,
    functionName: 'whitelistedCount',
    query: { enabled: !!complianceManagerAddress },
  });

  // 检查输入的地址是否在白名单中
  const { data: isWhitelisted } = useReadContract({
    address: complianceManagerAddress as `0x${string}` | undefined,
    abi: COMPLIANCE_MANAGER_ABI as Abi,
    functionName: 'isWhitelisted',
    args: addressInput && isAddress(addressInput) ? [addressInput as `0x${string}`] : undefined,
    query: { enabled: !!complianceManagerAddress && !!addressInput && isAddress(addressInput) },
  });

  const { writeContract, data: txHash, isPending, error: txError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // 添加到白名单
  const handleAddToWhitelist = () => {
    if (!addressInput || !isAddress(addressInput)) {
      alert('请输入有效的地址');
      return;
    }

    if (!complianceManagerAddress) {
      alert('无法获取 ComplianceManager 地址');
      return;
    }

    writeContract({
      address: complianceManagerAddress,
      abi: COMPLIANCE_MANAGER_ABI,
      functionName: 'addToWhitelist',
      args: [addressInput],
      // 设置 gas limit，避免超过网络限制
      gas: BigInt(200000), // 20万 gas 足够用于添加单个地址
    } as any);
  };

  // 从白名单移除
  const handleRemoveFromWhitelist = () => {
    if (!addressInput || !isAddress(addressInput)) {
      alert('请输入有效的地址');
      return;
    }

    if (!complianceManagerAddress) {
      alert('无法获取 ComplianceManager 地址');
      return;
    }

    writeContract({
      address: complianceManagerAddress,
      abi: COMPLIANCE_MANAGER_ABI,
      functionName: 'removeFromWhitelist',
      args: [addressInput],
      // 设置 gas limit，避免超过网络限制
      gas: BigInt(200000), // 20万 gas 足够用于移除单个地址
    } as any);
  };

  // 批量添加到白名单
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

    // 批量操作需要更多 gas，根据地址数量动态计算
    // 每个地址大约需要 5万 gas，加上基础 gas 10万
    const estimatedGas = BigInt(100000 + addresses.length * 50000);
    // 但不超过网络限制（16777216）
    const gasLimit = estimatedGas > BigInt(15000000) ? BigInt(15000000) : estimatedGas;

    writeContract({
      address: complianceManagerAddress as `0x${string}`,
      abi: COMPLIANCE_MANAGER_ABI as Abi,
      functionName: 'batchAddToWhitelist',
      args: [addresses as `0x${string}`[]],
      // 设置 gas limit，避免超过网络限制
      gas: gasLimit,
    } as any);
  };

  // 启用/禁用白名单机制
  const handleToggleWhitelist = (enabled: boolean) => {
    if (!complianceManagerAddress) {
      alert('无法获取 ComplianceManager 地址');
      return;
    }

    writeContract({
      address: complianceManagerAddress as `0x${string}`,
      abi: COMPLIANCE_MANAGER_ABI as Abi,
      functionName: 'setWhitelistEnabled',
      args: [enabled],
      // 设置 gas limit，避免超过网络限制（Sepolia 测试网上限通常是 16777216）
      gas: BigInt(1000000), // 100万 gas 足够用于简单的状态设置
    } as any);
  };

  // 成功后的处理
  useEffect(() => {
    if (isSuccess) {
      setAddressInput('');
      setBatchAddresses('');
      setSelectedAddress(null);
    }
  }, [isSuccess]);

  return (
    <div className="space-y-6">
      {/* 白名单概览 */}
      <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-2xl p-6 border border-green-500/30">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">白名单管理</h3>
            <p className="text-green-300 text-sm mt-1">
              管理允许进行代币转账的地址列表
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-400">
              {whitelistedCount?.toString() || '0'}
            </p>
            <p className="text-xs text-green-300">白名单地址数</p>
          </div>
        </div>
      </div>
      
      {/* 说明 */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">白名单说明</h3>
        <div className="space-y-2 text-sm text-blue-300">
          <p>• 白名单机制启用后，只有白名单中的地址可以进行代币转账</p>
          <p>• 白名单机制禁用时，所有地址都可以转账（除非在黑名单中或被冻结）</p>
          <p>• 添加或移除地址需要 WHITELISTER_ROLE 权限</p>
          <p>• 批量添加可以一次性添加多个地址，提高效率</p>
        </div>
      </div>
      {/* 白名单状态控制 */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">白名单机制控制</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-300">当前状态</p>
            <p className={`text-lg font-semibold mt-1 ${whitelistEnabled ? 'text-green-400' : 'text-gray-400'}`}>
              {whitelistEnabled ? '已启用' : '已禁用'}
            </p>
            <p className="text-xs text-purple-400 mt-1">
              {whitelistEnabled
                ? '只有白名单地址可以进行转账'
                : '所有地址都可以进行转账（除非在黑名单中）'}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => handleToggleWhitelist(true)}
              disabled={isPaused || !!whitelistEnabled || isPending || isConfirming}
              className="px-6 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isPaused ? '⏸️ 合约已暂停' : '启用白名单'}
            </button>
            <button
              onClick={() => handleToggleWhitelist(false)}
              disabled={isPaused || !whitelistEnabled || isPending || isConfirming}
              className="px-6 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isPaused ? '⏸️ 合约已暂停' : '禁用白名单'}
            </button>
          </div>
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
                  状态: <span className={isWhitelisted ? 'text-green-400' : 'text-red-400'}>
                    {isWhitelisted ? `✅ ${addressInput} 已在白名单中` : `❌ ${addressInput} 不在白名单中`}
                  </span>
                </p>
              </div>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleAddToWhitelist}
              disabled={isPaused || !addressInput || !isAddress(addressInput) || isPending || isConfirming || !!isWhitelisted}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isPaused ? '⏸️ 合约已暂停' : isPending || isConfirming ? '处理中...' : '添加到白名单'}
            </button>
            <button
              onClick={handleRemoveFromWhitelist}
              disabled={isPaused || !addressInput || !isAddress(addressInput) || isPending || isConfirming || !isWhitelisted}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-medium hover:from-red-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isPaused ? '⏸️ 合约已暂停' : isPending || isConfirming ? '处理中...' : '从白名单移除'}
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
            className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isPaused ? '⏸️ 合约已暂停' : isPending || isConfirming ? '处理中...' : '批量添加到白名单'}
          </button>
        </div>
      </div>

    </div>
  );
};

export default WhitelistManagement;

