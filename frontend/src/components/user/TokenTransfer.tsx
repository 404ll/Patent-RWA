import React, { useState, useEffect, useMemo } from 'react';
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt, useReadContract, useReadContracts } from 'wagmi';
import { formatEther, parseEther, isAddress, type Abi } from 'viem';
import { PATENT_COIN_ADDRESS, PATENT_COIN_ABI, CONTRACT_ADDRESSES } from '../../config/contracts';
import { COMPLIANCE_MANAGER_ABI } from '../../config/contracts';
import { usePatentCoin } from '../../hooks/usePatentCoin';
import { useContractPaused } from '../../hooks/useContractPaused';
import toast from 'react-hot-toast';

const TokenTransfer: React.FC = () => {
  const { address } = useAccount();
  const [recipient, setRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const { balance, tokenInfo } = usePatentCoin();
  const { isPaused } = useContractPaused();
  
  const complianceManagerAddress = CONTRACT_ADDRESSES.sepolia.ComplianceManager;

  // 检查白名单状态
  const { data: whitelistEnabled } = useReadContract({
    address: complianceManagerAddress as `0x${string}` | undefined,
    abi: COMPLIANCE_MANAGER_ABI as Abi,
    functionName: 'whitelistEnabled',
    query: { enabled: !!complianceManagerAddress },
  });

  // 检查发送地址和接收地址的合规状态
  const complianceChecks = useMemo(() => {
    if (!address || !recipient || !isAddress(recipient) || !complianceManagerAddress) return [];
    
    return [
      {
        address: complianceManagerAddress as `0x${string}`,
        abi: COMPLIANCE_MANAGER_ABI as Abi,
        functionName: 'isWhitelisted' as const,
        args: [address] as const,
      },
      {
        address: complianceManagerAddress as `0x${string}`,
        abi: COMPLIANCE_MANAGER_ABI as Abi,
        functionName: 'isWhitelisted' as const,
        args: [recipient as `0x${string}`] as const,
      },
      {
        address: complianceManagerAddress as `0x${string}`,
        abi: COMPLIANCE_MANAGER_ABI as Abi,
        functionName: 'isBlacklisted' as const,
        args: [address] as const,
      },
      {
        address: complianceManagerAddress as `0x${string}`,
        abi: COMPLIANCE_MANAGER_ABI as Abi,
        functionName: 'isBlacklisted' as const,
        args: [recipient as `0x${string}`] as const,
      },
      {
        address: complianceManagerAddress as `0x${string}`,
        abi: COMPLIANCE_MANAGER_ABI as Abi,
        functionName: 'isFrozen' as const,
        args: [address] as const,
      },
      {
        address: complianceManagerAddress as `0x${string}`,
        abi: COMPLIANCE_MANAGER_ABI as Abi,
        functionName: 'isFrozen' as const,
        args: [recipient as `0x${string}`] as const,
      },
      {
        address: complianceManagerAddress as `0x${string}`,
        abi: COMPLIANCE_MANAGER_ABI as Abi,
        functionName: 'checkTransferCompliance' as const,
        args: [address, recipient as `0x${string}`] as const,
      },
    ];
  }, [address, recipient, complianceManagerAddress]);

  const { data: complianceData } = useReadContracts({
    contracts: complianceChecks,
    query: { enabled: complianceChecks.length > 0 },
  });

  // 解析合规状态
  const complianceStatus = useMemo(() => {
    if (!complianceData || complianceData.length < 7) return null;
    
    return {
      senderWhitelisted: complianceData[0]?.result as boolean | undefined,
      recipientWhitelisted: complianceData[1]?.result as boolean | undefined,
      senderBlacklisted: complianceData[2]?.result as boolean | undefined,
      recipientBlacklisted: complianceData[3]?.result as boolean | undefined,
      senderFrozen: complianceData[4]?.result as boolean | undefined,
      recipientFrozen: complianceData[5]?.result as boolean | undefined,
      canTransfer: complianceData[6]?.result as boolean | undefined,
    };
  }, [complianceData]);

  // 转账交易
  const { 
    writeContract, 
    data: transferHash, 
    isPending: isTransferring,
    error: transferError 
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess: isTransferSuccess,
    isError: isTransferFailed 
  } = useWaitForTransactionReceipt({
    hash: transferHash,
  });

  // 转账成功后重置表单
  useEffect(() => {
    if (isTransferSuccess) {
      setTransferAmount('');
      setRecipient('');
      toast.success('转账成功！');
    }
  }, [isTransferSuccess]);

  // 处理错误
  useEffect(() => {
    if (transferError) {
      const errorMessage = transferError.message?.includes('User rejected') || 
                          transferError.message?.includes('user rejected') ||
                          transferError.message?.includes('rejected')
        ? '交易已取消'
        : transferError.message || '转账失败';
      toast.error(errorMessage);
    }
  }, [transferError]);

  // 获取友好的错误消息
  const getErrorMessage = () => {
    if (transferError) {
      const msg = transferError.message || '';
      if (msg.includes('User rejected') || msg.includes('user rejected') || msg.includes('rejected')) {
        return '交易已取消';
      }
      if (msg.includes('transfer not compliant') || msg.includes('compliance check failed')) {
        let reason = '转账不合规：';
        if (complianceStatus) {
          const reasons: string[] = [];
          if (complianceStatus.senderBlacklisted) reasons.push('发送地址在黑名单中');
          if (complianceStatus.recipientBlacklisted) reasons.push('接收地址在黑名单中');
          if (complianceStatus.senderFrozen) reasons.push('发送地址被冻结');
          if (complianceStatus.recipientFrozen) reasons.push('接收地址被冻结');
          if (whitelistEnabled) {
            if (!complianceStatus.senderWhitelisted) reasons.push('发送地址不在白名单中');
            if (!complianceStatus.recipientWhitelisted) reasons.push('接收地址不在白名单中');
          }
          reason += reasons.length > 0 ? reasons.join('、') : '合规检查未通过';
        } else {
          reason += '地址可能不在白名单中、在黑名单中或被冻结';
        }
        return reason;
      }
      if (msg.includes('insufficient balance') || msg.includes('balance')) {
        return '余额不足';
      }
      return msg || '转账失败，请稍后重试';
    }
    if (isTransferFailed) {
      let reason = '转账执行失败：';
      if (complianceStatus) {
        const reasons: string[] = [];
        if (complianceStatus.senderBlacklisted) reasons.push('发送地址在黑名单中');
        if (complianceStatus.recipientBlacklisted) reasons.push('接收地址在黑名单中');
        if (complianceStatus.senderFrozen) reasons.push('发送地址被冻结');
        if (complianceStatus.recipientFrozen) reasons.push('接收地址被冻结');
        if (whitelistEnabled) {
          if (!complianceStatus.senderWhitelisted) reasons.push('发送地址不在白名单中');
          if (!complianceStatus.recipientWhitelisted) reasons.push('接收地址不在白名单中');
        }
        reason += reasons.length > 0 ? reasons.join('、') : '合规检查未通过';
      } else {
        reason += '可能因为合规检查未通过（地址不在白名单、在黑名单或被冻结）';
      }
      return reason;
    }
    return null;
  };

  const errorMessage = getErrorMessage();

  // 处理转账
  const handleTransfer = async () => {
    if (!address) {
      toast.error('请先连接钱包');
      return;
    }

    if (!recipient || !isAddress(recipient)) {
      toast.error('请输入有效的接收地址');
      return;
    }

    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      toast.error('请输入有效的转账金额');
      return;
    }

    const balanceNum = balance ? Number(formatEther(balance)) : 0;
    if (parseFloat(transferAmount) > balanceNum) {
      toast.error('余额不足');
      return;
    }

    try {
      const amountWei = parseEther(transferAmount);
      writeContract({
        address: PATENT_COIN_ADDRESS,
        abi: PATENT_COIN_ABI,
        functionName: 'transfer',
        args: [recipient as `0x${string}`, amountWei],
        gas: BigInt(200000),
      } as any);
    } catch (error: any) {
      console.error('转账失败:', error);
      toast.error(`转账失败: ${error.message || '未知错误'}`);
    }
  };

  // 设置最大金额
  const setMaxAmount = () => {
    if (balance) {
      setTransferAmount(formatEther(balance));
    }
  };

  // 设置百分比
  const setPercentage = (percent: number) => {
    if (balance) {
      const amount = (Number(formatEther(balance)) * percent / 100).toString();
      setTransferAmount(amount);
    }
  };

  const balanceNum = balance ? Number(formatEther(balance)) : 0;

  return (
    <div className="space-y-6">
      {/* 转账说明 */}
      <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-2xl p-6 border border-blue-500/30">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-blue-500/30 rounded-xl flex items-center justify-center text-2xl">
            📤
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">转账 PATENT 代币</h3>
            <p className="text-blue-300 text-sm mt-1">
              将您的 PATENT 代币转账给其他地址
            </p>
          </div>
        </div>
      </div>

      {/* 余额显示 */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-300">可用余额</p>
            <p className="text-2xl font-bold text-white mt-1">
              {balanceNum.toLocaleString(undefined, { maximumFractionDigits: 4 })} PATENT
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-300">代币符号</p>
            <p className="text-xl font-semibold text-white mt-1">{tokenInfo.symbol}</p>
          </div>
        </div>
      </div>

      {/* 转账表单 */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">转账信息</h3>
        
        <div className="space-y-4">
          {/* 接收地址 */}
          <div>
            <label className="block text-sm font-medium text-blue-300 mb-2">
              接收地址
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="w-full bg-black/30 border border-blue-500/30 rounded-xl px-4 py-3 text-white placeholder-blue-400/50 focus:outline-none focus:border-blue-400 transition-colors font-mono text-sm"
            />
            {recipient && !isAddress(recipient) && (
              <p className="text-red-400 text-xs mt-1">⚠️ 无效的地址格式</p>
            )}
            
            {/* 合规状态检查 */}
            {recipient && isAddress(recipient) && complianceStatus && (
              <div className="mt-2 p-3 bg-black/20 rounded-lg border border-blue-500/20">
                <p className="text-xs text-blue-300 mb-2 font-medium">合规状态检查：</p>
                <div className="space-y-1 text-xs">
                  {/* 只在白名单启用时显示白名单状态 */}
                  {whitelistEnabled && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-blue-400">发送地址白名单：</span>
                        <span className={complianceStatus.senderWhitelisted ? 'text-green-400' : 'text-red-400'}>
                          {complianceStatus.senderWhitelisted ? '✅ 已加入' : '❌ 未加入'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-blue-400">接收地址白名单：</span>
                        <span className={complianceStatus.recipientWhitelisted ? 'text-green-400' : 'text-red-400'}>
                          {complianceStatus.recipientWhitelisted ? '✅ 已加入' : '❌ 未加入'}
                        </span>
                      </div>
                      {(!complianceStatus.senderWhitelisted || !complianceStatus.recipientWhitelisted) && (
                        <p className="text-yellow-400 mt-2">
                          ⚠️ 白名单已启用，发送地址和接收地址都必须在白名单中才能转账
                        </p>
                      )}
                    </>
                  )}
                  {complianceStatus.recipientBlacklisted && (
                    <p className="text-red-400 mt-2">
                      ❌ {recipient.slice(0, 6)}...{recipient.slice(-4)} 地址在黑名单中，无法转账
                    </p>
                  )}
                  {complianceStatus.senderFrozen && (
                    <p className="text-red-400 mt-2">
                      ❌ 您的地址被冻结，无法转账
                    </p>
                  )}

                  {complianceStatus.recipientFrozen && (
                    <p className="text-red-400 mt-2">
                      ❌ {recipient.slice(0, 6)}...{recipient.slice(-4)} 地址被冻结，无法转账
                    </p>
                  )}
                  {complianceStatus.canTransfer === true && (
                    <p className="text-green-400 mt-2">
                      ✅ 合规检查通过，可以转账
                    </p>
                  )}
                  {complianceStatus.senderBlacklisted && (
                    <p className="text-red-400 mt-2">
                      ❌ 您的地址在黑名单中，无法转账
                    </p>
                  )}
                  
                </div>
              </div>
            )}
          </div>

          {/* 转账金额 */}
          <div>
            <label className="block text-sm font-medium text-blue-300 mb-2">
              转账金额
            </label>
            <div className="relative">
              <input
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="0.0"
                step="0.0001"
                min="0"
                className="w-full bg-black/30 border border-blue-500/30 rounded-xl px-4 py-3 pr-24 text-white placeholder-blue-400/50 focus:outline-none focus:border-blue-400 transition-colors"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                <span className="text-blue-400 text-sm">PATENT</span>
                <button
                  onClick={setMaxAmount}
                  className="px-2 py-1 bg-blue-600/50 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
                >
                  最大
                </button>
              </div>
            </div>
            
            {/* 快速选择百分比 */}
            <div className="flex space-x-2 mt-2">
              {[25, 50, 75, 100].map((percent) => (
                <button
                  key={percent}
                  onClick={() => setPercentage(percent)}
                  className="px-3 py-1 bg-blue-600/20 text-blue-300 text-xs rounded-lg hover:bg-blue-600/30 transition-colors"
                >
                  {percent}%
                </button>
              ))}
            </div>

            {/* 余额检查 */}
            {transferAmount && parseFloat(transferAmount) > balanceNum && (
              <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">⚠️ 转账数量超过您的余额</p>
              </div>
            )}
          </div>

          {/* 合约暂停提示 */}
          {isPaused && (
            <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">⏸️</div>
                <div className="flex-1">
                  <p className="text-red-400 font-medium mb-1">合约已暂停</p>
                  <p className="text-red-300 text-sm">
                    合约当前已暂停，所有代币转账操作已被禁止，请等待合约恢复
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 转账按钮 */}
          <button
            onClick={handleTransfer}
            disabled={
              isPaused ||
              isTransferring ||
              isConfirming ||
              !recipient ||
              !transferAmount ||
              parseFloat(transferAmount) <= 0 ||
              parseFloat(transferAmount) > balanceNum ||
              !isAddress(recipient) ||
              complianceStatus?.senderBlacklisted === true ||
              complianceStatus?.senderFrozen === true
            }
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 rounded-xl font-medium hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg"
          >
            {isPaused ? (
              '⏸️ 合约已暂停'
            ) : isTransferring || isConfirming ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isConfirming ? '确认中...' : '等待确认...'}
              </span>
            ) : complianceStatus?.senderBlacklisted === true ? (
              '❌ 您在黑名单中'
            ) : complianceStatus?.senderFrozen === true ? (
              '❌ 您的地址被冻结'
            ) : (
              '📤 确认转账'
            )}
          </button>

          {/* 转账失败错误提示 */}
          {errorMessage && (
            <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">❌</div>
                <div className="flex-1">
                  <p className="text-red-400 font-medium mb-1">转账失败</p>
                  <p className="text-red-300 text-sm">
                    {errorMessage}
                  </p>
                  {(errorMessage.includes('不合规') || errorMessage.includes('白名单') || errorMessage.includes('黑名单') || errorMessage.includes('冻结')) && (
                    <p className="text-red-300/70 text-xs mt-2">
                      提示：请确认发送地址和接收地址都在白名单中（如果白名单已启用），且都不在黑名单中或被冻结
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 转账成功提示 */}
          {isTransferSuccess && (
            <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">✅</div>
                <div className="flex-1">
                  <p className="text-green-400 font-medium mb-1">转账成功！</p>
                  <p className="text-green-300 text-sm">
                    交易哈希: {transferHash }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 转账说明 */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">转账说明</h3>
        <div className="space-y-3 text-sm text-blue-300">
          <p>• 转账前请确认接收地址正确，转账后无法撤销</p>
          <p>• 转账需要支付 Gas 费用（ETH）</p>
          <p>• 转账会经过合规检查，黑名单地址无法接收代币</p>
          <p>• 建议先进行小额测试转账</p>
        </div>
      </div>
    </div>
  );
};

export default TokenTransfer;

