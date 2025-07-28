import React, { useState } from 'react';
import { useAccount, useContractRead, useContractWrite } from 'wagmi';
import { formatEther, parseEther } from 'viem';

const RevenueStats: React.FC = () => {
  const { address } = useAccount();
  const [distributeAmount, setDistributeAmount] = useState('');

  // 获取用户可领取的收益
  const { data: claimableRevenue } = useContractRead({
    address: process.env.REACT_APP_GUIDECOIN_ADDRESS as `0x${string}`,
    abi: [
      {
        name: 'getClaimableRevenue',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }]
      }
    ],
    functionName: 'getClaimableRevenue',
    args: [address as `0x${string}`],
    enabled: !!address
  });

  // 获取总分配收益
  const { data: totalDistributedRevenue } = useContractRead({
    address: process.env.REACT_APP_GUIDECOIN_ADDRESS as `0x${string}`,
    abi: [
      {
        name: 'totalDistributedRevenue',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }]
      }
    ],
    functionName: 'totalDistributedRevenue'
  });

  // 获取当前分配轮次
  const { data: currentRound } = useContractRead({
    address: process.env.REACT_APP_GUIDECOIN_ADDRESS as `0x${string}`,
    abi: [
      {
        name: 'currentRevenueRound',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }]
      }
    ],
    functionName: 'currentRevenueRound'
  });

  // 领取收益
  const { write: claimRevenue, isLoading: isClaiming } = useContractWrite({
    address: process.env.REACT_APP_GUIDECOIN_ADDRESS as `0x${string}`,
    abi: [
      {
        name: 'claimRevenue',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: []
      }
    ],
    functionName: 'claimRevenue'
  });

  // 分配收益 (仅管理员)
  const { write: distributeRevenue, isLoading: isDistributing } = useContractWrite({
    address: process.env.REACT_APP_GUIDECOIN_ADDRESS as `0x${string}`,
    abi: [
      {
        name: 'distributeRevenue',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'amount', type: 'uint256' }],
        outputs: []
      }
    ],
    functionName: 'distributeRevenue'
  });

  const handleClaimRevenue = () => {
    claimRevenue();
  };

  const handleDistributeRevenue = () => {
    if (!distributeAmount) return;
    distributeRevenue({ args: [parseEther(distributeAmount)] });
    setDistributeAmount('');
  };

  return (
    <div className="space-y-6">
      {/* 收益概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    可领取收益
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {claimableRevenue ? formatEther(claimableRevenue) : '0'} USDC
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    总分配收益
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {totalDistributedRevenue ? formatEther(totalDistributedRevenue) : '0'} USDC
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    当前轮次
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    #{currentRound ? currentRound.toString() : '0'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 领取收益 */}
      {claimableRevenue && claimableRevenue > 0n && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              领取收益
            </h3>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-md font-medium text-green-900">
                    您有可领取的收益
                  </h4>
                  <p className="text-sm text-green-700 mt-1">
                    {formatEther(claimableRevenue)} USDC 可立即领取
                  </p>
                </div>
                <button
                  onClick={handleClaimRevenue}
                  disabled={isClaiming}
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isClaiming ? '领取中...' : '领取收益'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 收益分配 (管理员功能) */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            收益分配 (管理员)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分配金额 (USDC)
              </label>
              <input
                type="number"
                value={distributeAmount}
                onChange={(e) => setDistributeAmount(e.target.value)}
                placeholder="0.00"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleDistributeRevenue}
                disabled={isDistributing || !distributeAmount}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isDistributing ? '分配中...' : '分配收益'}
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            收益将按照 GUIDE 代币持有比例自动分配给所有持有者
          </p>
        </div>
      </div>

      {/* 收益分配说明 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            收益分配机制
          </h3>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">1</span>
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">专利收益收集</h4>
                <p className="text-sm text-gray-600">
                  来自专利授权、许可费用等收益汇集到平台
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">2</span>
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">按比例分配</h4>
                <p className="text-sm text-gray-600">
                  根据 GUIDE 代币持有量按比例分配收益
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">3</span>
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">用户领取</h4>
                <p className="text-sm text-gray-600">
                  用户可随时领取已分配的收益
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueStats;
