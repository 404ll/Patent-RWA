import React, { useState } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { PATENT_COIN_ADDRESS, PATENT_COIN_ABI } from '../../config/contracts';

const ContractControl: React.FC = () => {

  // 检查合约是否暂停
  const { data: paused } = useReadContract({
    address: PATENT_COIN_ADDRESS,
    abi: PATENT_COIN_ABI,
    functionName: 'paused',
  });

  const isPaused = paused === true;

  const { writeContract, data: txHash, isPending, error: txError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // 暂停合约
  const handlePause = () => {
    if (!confirm('确定要暂停合约吗？\n\n暂停后所有代币转账、铸造和销毁操作将被禁止。')) {
      return;
    }

    writeContract({
      address: PATENT_COIN_ADDRESS as `0x${string}`,
      abi: PATENT_COIN_ABI,
      functionName: 'pause',
      gas: BigInt(200000),
    } as any);
  };

  // 恢复合约
  const handleUnpause = () => {
    if (!confirm('确定要恢复合约吗？\n\n恢复后所有操作将恢复正常。')) {
      return;
    }

    writeContract({
      address: PATENT_COIN_ADDRESS as `0x${string}`,
      abi: PATENT_COIN_ABI,
      functionName: 'unpause',
      gas: BigInt(200000),
    } as any);
  };

  return (
    <div className="space-y-6">
      {/* 合约状态概览 */}
      <div className={`rounded-2xl p-6 border ${
        isPaused 
          ? 'bg-gradient-to-r from-red-600/20 to-pink-600/20 border-red-500/30' 
          : 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-green-500/30'
      }`}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">合约状态控制</h3>
            <p className={`text-sm mt-1 ${isPaused ? 'text-red-300' : 'text-green-300'}`}>
              {isPaused 
                ? '合约当前已暂停，所有代币操作被禁止' 
                : '合约当前正常运行，所有功能可用'}
            </p>
          </div>
          <div className="text-right">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${
              isPaused ? 'bg-red-500/30' : 'bg-green-500/30'
            }`}>
              {isPaused ? '⏸️' : '▶️'}
            </div>
            <p className={`text-xs mt-2 font-semibold ${isPaused ? 'text-red-400' : 'text-green-400'}`}>
              {isPaused ? '已暂停' : '运行中'}
            </p>
          </div>
        </div>
      </div>

      {/* 控制操作 */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">合约控制操作</h3>
        <div className="space-y-4">
          <div className="p-4 bg-black/20 rounded-xl border border-purple-500/20">
            <p className="text-purple-300 text-sm mb-2">当前状态</p>
            <p className={`text-xl font-semibold ${isPaused ? 'text-red-400' : 'text-green-400'}`}>
              {isPaused ? '⏸️ 合约已暂停' : '▶️ 合约运行中'}
            </p>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={handlePause}
              disabled={isPaused || isPending || isConfirming}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-medium hover:from-red-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
            >
              {isPending || isConfirming ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>处理中...</span>
                </>
              ) : (
                <>
                  <span>⏸️</span>
                  <span>暂停合约</span>
                </>
              )}
            </button>
            <button
              onClick={handleUnpause}
              disabled={!isPaused || isPending || isConfirming}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
            >
              {isPending || isConfirming ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>处理中...</span>
                </>
              ) : (
                <>
                  <span>▶️</span>
                  <span>恢复合约</span>
                </>
              )}
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

      {/* 功能说明 */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">合约控制说明</h3>
        <div className="space-y-3 text-sm text-blue-300">
          <div className="p-3 bg-black/20 rounded-lg">
            <p className="font-semibold text-white mb-1">暂停合约 (Pause)</p>
            <p>• 暂停后，所有代币转账操作将被禁止</p>
            <p>• 暂停后，铸造和销毁操作也将被禁止</p>
            <p>• 需要 PAUSER_ROLE 权限</p>
            <p>• 通常用于紧急情况或系统维护</p>
          </div>
          <div className="p-3 bg-black/20 rounded-lg">
            <p className="font-semibold text-white mb-1">恢复合约 (Unpause)</p>
            <p>• 恢复后，所有操作将恢复正常</p>
            <p>• 需要 RESUME_ROLE 权限</p>
            <p>• 暂停和恢复使用不同的角色，提高安全性</p>
          </div>
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="font-semibold text-yellow-400 mb-1">⚠️ 重要提示</p>
            <p>• 暂停合约会影响所有用户，请谨慎操作</p>
            <p>• 建议在暂停前提前通知用户</p>
            <p>• 暂停和恢复操作都需要多签确认</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractControl;

