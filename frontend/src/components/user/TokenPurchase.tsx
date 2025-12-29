import React, { useState, useEffect } from 'react';
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { PATENT_COIN_ADDRESS, PATENT_COIN_ABI, PATENT_COIN_PURCHASE_ADDRESS } from '../../config/contracts';
import { usePatentCoin } from '../../hooks/usePatentCoin';
import { useEthPrice } from '../../hooks/useEthPrice';

const TokenPurchase: React.FC = () => {
  const { address } = useAccount();
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('ETH');

  const{patentStats} = usePatentCoin();
  
  // 从 Chainlink 预言机获取 ETH 价格
  const { ethPrice, isLoading: isLoadingEthPrice, isSupported: isPriceFeedSupported } = useEthPrice();

  // 获取用户 ETH 余额
  const { data: ethBalance } = useBalance({
    address: address
  });


  // 计算 PATENT 价格 (1PATENT = 支撑比率 USD)
  // 如果 PATENT 和 USDC 是 1:1，那么 patentPrice 应该是 1
  const patentPrice = patentStats.backingRatio ? Number((patentStats.backingRatio as bigint) / BigInt(1e6)) : 1;
  // 使用预言机价格，如果不可用则使用默认值
  const ethPriceValue = ethPrice || 2500; // 如果预言机不可用，使用默认值

  // 用户输入的 PATENT 数量
  const patentAmount = purchaseAmount ? parseFloat(purchaseAmount) : 0;
  
  // 如果使用 ETH 支付，需要根据要购买的 PATENT 数量来计算需要的 ETH
  // ETH 数量 = (PATENT 数量 * PATENT 价格) / ETH 价格
  const ethCost = patentAmount > 0 && selectedPayment === 'ETH' 
    ? (patentAmount * patentPrice) / ethPriceValue 
    : 0;
  
  // 计算购买金额（USD）
  const purchaseValueUSD = patentAmount * patentPrice;

  // 购买交易
  const { 
    writeContract, 
    data: purchaseHash, 
    isPending: isPurchasing,
    error: purchaseError 
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess: isPurchaseSuccess,
    isError: isPurchaseFailed 
  } = useWaitForTransactionReceipt({
    hash: purchaseHash,
  });

  // 购买成功后重置表单
  useEffect(() => {
    if (isPurchaseSuccess) {
      setPurchaseAmount('');
      // 可以在这里添加成功提示
    }
  }, [isPurchaseSuccess]);

  // 处理购买
  const handlePurchase = async () => {
    if (!address || !purchaseAmount || parseFloat(purchaseAmount) <= 0) {
      return;
    }

    if (selectedPayment === 'ETH') {
      // 使用 ETH 支付
      if (ethCost <= 0) {
        alert('ETH 成本计算错误，请检查价格');
        return;
      }

      // 检查 ETH 余额
      const userEthBalance = ethBalance ? Number(formatEther(ethBalance.value)) : 0;
      if (userEthBalance < ethCost) {
        alert(`ETH 余额不足，需要 ${ethCost.toFixed(6)} ETH，当前余额 ${userEthBalance.toFixed(6)} ETH`);
        return;
      }

      // 检查购买合约地址是否配置
      if (!PATENT_COIN_PURCHASE_ADDRESS) {
        alert('购买合约地址未配置。请联系管理员配置购买合约地址。\n\n' +
              `购买数量: ${patentAmount.toLocaleString()} PATENT\n` +
              `需要支付: ${ethCost.toFixed(6)} ETH\n` +
              `价值: $${purchaseValueUSD.toLocaleString()} USD`);
        return;
      }

      try {
        // 调用购买合约的 buyWithETH 函数
        const patentAmountWei = parseEther(patentAmount.toString());
        const ethAmountWei = parseEther(ethCost.toString());

        writeContract({
          address: PATENT_COIN_PURCHASE_ADDRESS,
          abi: [
            {
              name: 'buyWithETH',
              type: 'function',
              stateMutability: 'payable',
              inputs: [
                { name: 'patentAmount', type: 'uint256' }
              ],
              outputs: []
            }
          ],
          functionName: 'buyWithETH',
          args: [patentAmountWei],
          value: ethAmountWei,
        });
      } catch (error: any) {
        console.error('购买失败:', error);
        alert(`购买失败: ${error.message || '未知错误'}`);
      }
    } else {
      // USDC/USDT 支付（待实现）
      alert(`${selectedPayment} 支付功能待实现`);
    }
  };

  const paymentOptions = [
    { id: 'ETH', name: 'ETH', icon: '⟠', balance: ethBalance ? formatEther(ethBalance.value) : '0' },
    { id: 'USDC', name: 'USDC', icon: '💵', balance: '0' },
    { id: 'USDT', name: 'USDT', icon: '💲', balance: '0' },
  ];

  return (
    <div className="space-y-6">
      {/* 购买说明 */}
      <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-2xl p-6 border border-blue-500/30">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-blue-500/30 rounded-xl flex items-center justify-center text-2xl">
            🛒
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">购买PATENT 代币</h3>
            <p className="text-blue-300 text-sm mt-1">
             PATENT 代币由多个专利资产支撑，持有代币即可享受专利许可费分红
            </p>
          </div>
        </div>
      </div>

      {/* 当前价格信息 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-blue-500/20">
          <p className="text-sm text-blue-300">当前PATENT 价格</p>
          <p className="text-2xl font-bold text-white mt-1">${patentPrice.toFixed(4)}</p>
          <p className="text-xs text-blue-400">基于资产支撑比率</p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-blue-500/20">
          <p className="text-sm text-blue-300">ETH 价格</p>
          <p className="text-2xl font-bold text-white mt-1">
            {isLoadingEthPrice ? (
              <span className="text-blue-400">加载中...</span>
            ) : (
              `$${ethPriceValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            )}
          </p>
          <p className="text-xs text-blue-400">
            {isPriceFeedSupported ? 'Chainlink 预言机' : '默认价格'}
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-blue-500/20">
          <p className="text-sm text-blue-300">我的 ETH 余额</p>
          <p className="text-2xl font-bold text-white mt-1">
            {ethBalance ? Number(formatEther(ethBalance.value)).toFixed(4) : '0'}
          </p>
          <p className="text-xs text-blue-400">ETH</p>
        </div>
      </div>

      {/* 购买表单 */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">输入购买 PATENT 数量</h3>

        {/* 支付方式选择 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-blue-300 mb-2">选择支付方式</label>
          <div className="grid grid-cols-3 gap-3">
            {paymentOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedPayment(option.id)}
                className={`p-3 rounded-xl border transition-all ${
                  selectedPayment === option.id
                    ? 'border-blue-400 bg-blue-600/30'
                    : 'border-blue-500/20 bg-white/5 hover:border-blue-400/50'
                }`}
              >
                <div className="text-2xl mb-1">{option.icon}</div>
                <p className="text-white font-medium">{option.name}</p>
                <p className="text-xs text-blue-400">余额: {Number(option.balance).toFixed(4)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 金额输入 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-blue-300 mb-2">购买 PATENT 数量</label>
          <div className="relative">
            <input
              type="number"
              placeholder="输入购买 PATENT 数量"
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(e.target.value)}
              className="w-full bg-white/10 border border-blue-500/30 rounded-xl px-4 py-4 text-white text-lg placeholder-blue-400/50 focus:outline-none focus:border-blue-400"
            />
            {/* <span className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400">PATENT</span> */}
          </div>
          {/* 快速金额按钮 */}
          <div className="flex flex-wrap gap-2 mt-3">
            {['100', '500', '1000', '5000'].map((amount) => (
              <button
                key={amount}
                onClick={() => setPurchaseAmount(amount)}
                className="px-3 py-1 bg-blue-600/30 text-blue-200 rounded-lg text-sm hover:bg-blue-600/50 transition-colors"
              >
                ${amount}
              </button>
            ))}
          </div>
        </div>

        {/* 预览 */}
        {purchaseAmount && parseFloat(purchaseAmount) > 0 && (
          <div className="bg-black/20 rounded-xl p-4 mb-6">
            <h4 className="text-sm font-medium text-blue-300 mb-3">购买预览</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-blue-400">购买 PATENT 数量</span>
                <span className="text-green-400 font-semibold">{patentAmount.toLocaleString()} PATENT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-400">购买金额</span>
                <span className="text-white">${purchaseValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
              </div>
              {selectedPayment === 'ETH' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-blue-400">需要支付 ETH</span>
                    <span className="text-white">{ethCost.toFixed(6)} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-400">ETH 价格</span>
                    <span className="text-white">${ethPriceValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-blue-400">PATENT 单价</span>
                <span className="text-white">${patentPrice.toFixed(4)} / PATENT</span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handlePurchase}
          disabled={
            !address || 
            !purchaseAmount || 
            parseFloat(purchaseAmount) <= 0 || 
            isPurchasing || 
            isConfirming ||
            (selectedPayment === 'ETH' && ethBalance && Number(formatEther(ethBalance.value)) < ethCost)
          }
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 rounded-xl font-medium hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg"
        >
          {isPurchasing || isConfirming ? (
            <span className="flex items-center justify-center">
              <span className="animate-spin mr-2">⏳</span>
              {isPurchasing ? '发送交易中...' : '等待确认...'}
            </span>
          ) : isPurchaseSuccess ? (
            '✅ 购买成功！'
          ) : (
            `🛒 购买 ${patentAmount > 0 ? `${patentAmount.toLocaleString()} PATENT` : 'PATENT 代币'}`
          )}
        </button>

        {/* 购买错误提示 */}
        {purchaseError && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">❌</div>
              <div className="flex-1">
                <p className="text-red-400 font-medium mb-1">购买失败</p>
                <p className="text-red-300 text-sm">
                  {purchaseError.message?.includes('User rejected') || 
                   purchaseError.message?.includes('user rejected') ||
                   purchaseError.message?.includes('rejected')
                    ? '您已取消交易。如需购买，请重新点击按钮并确认交易。'
                    : purchaseError.message || '未知错误，请稍后重试'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 购买成功提示 */}
        {isPurchaseSuccess && (
          <div className="mt-4 p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">✅</div>
              <div className="flex-1">
                <p className="text-green-400 font-medium mb-1">购买成功！</p>
                <p className="text-green-300 text-sm">
                  已成功获得 {purchaseAmount.toLocaleString()} PATENT 代币
                </p>
                {purchaseHash && (
                  <p className="text-green-400/70 text-xs mt-2 font-mono">
                    交易哈希: {purchaseHash.slice(0, 10)}...{purchaseHash.slice(-8)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 购买交易失败提示 */}
        {isPurchaseFailed && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">⚠️</div>
              <div className="flex-1">
                <p className="text-red-400 font-medium mb-1">交易执行失败</p>
                <p className="text-red-300 text-sm">
                  可能的原因：
                </p>
                <ul className="text-red-300/80 text-xs mt-2 list-disc list-inside space-y-1">
                  <li>ETH 金额不足</li>
                  <li>超过每日铸币限额</li>
                  <li>购买合约未授权铸币权限</li>
                  <li>合约已暂停</li>
                </ul>
                {purchaseHash && (
                  <p className="text-red-400/70 text-xs mt-2 font-mono">
                    交易哈希: {purchaseHash.slice(0, 10)}...{purchaseHash.slice(-8)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-blue-400 text-center mt-4">
          {selectedPayment === 'ETH' && ethCost > 0 && (
            <>需要支付: {ethCost.toFixed(6)} ETH ({purchaseValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)</>
          )}
          {selectedPayment !== 'ETH' && '注意：购买功能需要管理员处理'}
        </p>
      </div>

      {/* 购买说明 */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">购买须知</h3>
        <div className="space-y-3 text-sm text-blue-300">
          <p>•PATENT 代币由多个专利资产组合支撑，价值与专利估值挂钩</p>
          <p>• 持有PATENT 可按比例获得专利许可费分红</p>
          <p>• 购买后可随时在赎回页面将代币兑换为稳定币</p>
          <p>• 请确保您了解相关风险后再进行投资</p>
        </div>
      </div>
    </div>
  );
};

export default TokenPurchase;

