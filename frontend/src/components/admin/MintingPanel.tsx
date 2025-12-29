import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { PATENT_COIN_ABI, PATENT_COIN_ADDRESS } from '../../config/contracts';


const MintingPanel: React.FC = () => {
  const { address } = useAccount();
  const [mintForm, setMintForm] = useState({
    recipient: '',
    amount: ''
  });
  const [recentMints, setRecentMints] = useState<Array<{
    to: string;
    amount: string;
    time: string;
  }>>([]);

  const contractAddress = PATENT_COIN_ADDRESS;

  // 获取合约数据
  const { data: totalSupply } = useReadContract({
    address: contractAddress,
    abi: PATENT_COIN_ABI,
    functionName: 'totalSupply'
  });

  const { data: maxSupply } = useReadContract({
    address: contractAddress,
    abi: PATENT_COIN_ABI,
    functionName: 'maxSupply'
  });

  const { data: dailyMintLimit } = useReadContract({
    address: contractAddress,
    abi: PATENT_COIN_ABI,
    functionName: 'dailyMintLimit'
  });

  const { 
    writeContract: mintTokens, 
    data: mintHash, 
    isPending: isMinting,
    error: mintError 
  } = useWriteContract();
  
  const { 
    isLoading: isMintConfirming, 
    isSuccess: isMintSuccess,
    isError: isMintFailed
  } = useWaitForTransactionReceipt({ 
    hash: mintHash,
  });

  // 处理成功后的状态更新
  useEffect(() => {
    if (isMintSuccess && mintForm.recipient && mintForm.amount) {
      setRecentMints(prev => [{
        to: mintForm.recipient,
        amount: mintForm.amount,
        time: new Date().toLocaleString()
      }, ...prev.slice(0, 9)]);
      // 重置表单
      setMintForm({ recipient: '', amount: '' });
    }
  }, [isMintSuccess, mintForm.recipient, mintForm.amount]);

  // 处理错误：清除错误状态
  useEffect(() => {
    if (mintError) {
      // 错误会在 UI 中显示，5秒后可以自动清除（如果需要）
    }
  }, [mintError]);

  const supplyPercentage = totalSupply && maxSupply 
    ? (Number(totalSupply) / Number(maxSupply) * 100).toFixed(2)
    : '0';

  // 计算下一次重置时间（下一个 UTC 午夜）
  const getNextResetTime = () => {
    const now = new Date();
    const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const nextMidnight = new Date(utcNow);
    nextMidnight.setUTCHours(24, 0, 0, 0); // 下一个 UTC 午夜
    return nextMidnight;
  };

  const nextResetTime = getNextResetTime();
  const timeUntilReset = nextResetTime.getTime() - Date.now();
  const hoursUntilReset = Math.floor(timeUntilReset / (1000 * 60 * 60));
  const minutesUntilReset = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="space-y-6">
      {/* 供应量统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-300">当前供应量</p>
              <p className="text-xl font-bold text-white mt-1">
                {totalSupply ? Number(formatEther(totalSupply as bigint)).toLocaleString() : '0'}
              </p>
              <p className="text-xs text-purple-400">PATENT</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-2xl">
              🪙
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-300">最大供应量</p>
              <p className="text-xl font-bold text-white mt-1">
                {maxSupply ? Number(formatEther(maxSupply as bigint)).toLocaleString() : '0'}
              </p>
              <p className="text-xs text-purple-400">PATENT</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
              📊
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-300">每日铸币限额</p>
              <p className="text-xl font-bold text-white mt-1">
                {dailyMintLimit ? Number(formatEther(dailyMintLimit as bigint)).toLocaleString() : '0'}
              </p>
              <p className="text-xs text-purple-400">PATENT/天</p>
              {(() => {
                // 计算下一次重置时间（下一个 UTC 午夜）
                const now = new Date();
                const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
                const nextMidnight = new Date(utcNow);
                nextMidnight.setUTCHours(24, 0, 0, 0); // 下一个 UTC 午夜
                const timeUntilReset = nextMidnight.getTime() - Date.now();
                const hoursUntilReset = Math.floor(timeUntilReset / (1000 * 60 * 60));
                const minutesUntilReset = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));
                
                return (
                  <>
                    <p className="text-xs text-purple-500/70 mt-1">
                      下次重置: {nextMidnight.toLocaleString('zh-CN', { 
                        timeZone: 'UTC',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                      })} UTC
                    </p>
                    <p className="text-xs text-purple-500/70">
                      ({hoursUntilReset}小时 {minutesUntilReset}分钟后)
                    </p>
                  </>
                );
              })()}
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-2xl">
              ⏰
            </div>
          </div>
        </div>
      </div>

      {/* 供应量进度条 */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-purple-500/20">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm text-purple-300">供应量使用率</p>
          <p className="text-sm font-medium text-white">{supplyPercentage}%</p>
        </div>
        <div className="w-full bg-purple-900/50 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(parseFloat(supplyPercentage), 100)}%` }}
          />
        </div>
      </div>

      {/* 铸币表单 */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">铸造代币</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-purple-300 mb-2">接收地址</label>
            <input
              type="text"
              placeholder="0x..."
              value={mintForm.recipient}
              onChange={(e) => setMintForm({ ...mintForm, recipient: e.target.value })}
              className="w-full bg-white/10 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-300 mb-2">铸币数量 (PATENT)</label>
            <input
              type="number"
              placeholder="例如: 1000"
              value={mintForm.amount}
              onChange={(e) => setMintForm({ ...mintForm, amount: e.target.value })}
              className="w-full bg-white/10 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400"
            />
          </div>
        </div>

        {/* 快速填充按钮 */}
        <div className="flex flex-wrap gap-2 mb-6">
          <p className="text-sm text-purple-300 w-full mb-1">快速填充:</p>
          {['1000', '10000', '100000', '1000000'].map((amount) => (
            <button
              key={amount}
              onClick={() => setMintForm({ ...mintForm, amount })}
              className="px-3 py-1 bg-purple-600/30 text-purple-200 rounded-lg text-sm hover:bg-purple-600/50 transition-colors"
            >
              {Number(amount).toLocaleString()}PATENT
            </button>
          ))}
          <button
            onClick={() => setMintForm({ ...mintForm, recipient: address || '' })}
            className="px-3 py-1 bg-cyan-600/30 text-cyan-200 rounded-lg text-sm hover:bg-cyan-600/50 transition-colors"
          >
            使用我的地址
          </button>
        </div>

        <button
          onClick={() => mintTokens({
            address: contractAddress,
            abi: PATENT_COIN_ABI, 
            functionName: 'mint',
            args: [
              mintForm.recipient as `0x${string}`,
              mintForm.amount || '0'
            ]
          } as any)}
          disabled={
            isMinting ||
            isMintConfirming ||
            !mintForm.recipient ||
            !mintForm.amount ||
            mintForm.amount <= '0'
          }
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isMinting || isMintConfirming ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              铸币中...
            </span>
          ) : (
            '🪙 铸造代币'
          )}
        </button>

        {/* 成功提示 */}
        {isMintSuccess && (
          <div className="mt-4 p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">✅</div>
              <div className="flex-1">
                <p className="text-green-400 font-medium mb-1">铸币成功！</p>
                <p className="text-green-300 text-sm">
                  成功铸造 {mintForm.amount || '0'} PATENT 到{' '}
                  {mintForm.recipient ? `${mintForm.recipient.slice(0, 6)}...${mintForm.recipient.slice(-4)}` : '地址'}
            </p>
                {mintHash && (
                  <p className="text-green-400/70 text-xs mt-2 font-mono">
                    交易哈希: {mintHash.slice(0, 10)}...{mintHash.slice(-8)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {mintError && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">❌</div>
              <div className="flex-1">
                <p className="text-red-400 font-medium mb-1">铸币失败</p>
                <p className="text-red-300 text-sm">
                  {mintError.message?.includes('User rejected') || 
                   mintError.message?.includes('user rejected') ||
                   mintError.message?.includes('rejected') ||
                   mintError.message?.includes('denied') ||
                   mintError.message?.includes('User denied')
                    ? '您已取消交易。如需铸币，请重新点击按钮并确认交易。'
                    : mintError.message || '未知错误，请稍后重试'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 交易失败提示（交易已发送但执行失败） */}
        {isMintFailed && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">⚠️</div>
              <div className="flex-1">
                <p className="text-red-400 font-medium mb-1">交易执行失败</p>
                <p className="text-red-300 text-sm">
                  交易已发送但执行失败。可能的原因：
                </p>
                <ul className="text-red-300/80 text-xs mt-2 list-disc list-inside space-y-1">
                  <li>超过每日铸币限额</li>
                  <li>超过最大供应量</li>
                  <li>没有铸币权限</li>
                  <li>合约已暂停</li>
                </ul>
                {mintHash && (
                  <p className="text-red-400/70 text-xs mt-2 font-mono">
                    交易哈希: {mintHash.slice(0, 10)}...{mintHash.slice(-8)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 最近铸币记录 */}
      {recentMints.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">最近铸币记录</h3>
          <div className="space-y-2">
            {recentMints.map((mint, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-black/20 rounded-xl"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-400">🪙</span>
                  </div>
                  <div>
                    <p className="text-sm text-white font-mono">
                      {mint.to.slice(0, 6)}...{mint.to.slice(-4)}
                    </p>
                    <p className="text-xs text-purple-400">{mint.time}</p>
                  </div>
                </div>
                <p className="text-sm font-medium text-green-400">
                  +{Number(mint.amount).toLocaleString()}PATENT
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MintingPanel;

