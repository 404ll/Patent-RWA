import React, { useState } from 'react';
import { useAccount, useContractRead, useContractWrite } from 'wagmi';
import { formatEther, parseEther } from 'viem';

const RevenueStats: React.FC = () => {
  const { address } = useAccount();
  const [selectedToken, setSelectedToken] = useState('0x123...');
  const [distributeAmount, setDistributeAmount] = useState('');

  // Mock data - in real app, fetch from contracts
  const revenueData = {
    totalDistributed: '150000',
    pendingRevenue: '2500',
    claimableRounds: [
      { roundId: 1, amount: '1000', token: 'USDC', date: '2024-01-15' },
      { roundId: 2, amount: '1500', token: 'USDC', date: '2024-01-30' }
    ],
    distributionHistory: [
      { roundId: 3, amount: '5000', token: 'USDC', date: '2024-02-15', claimed: true },
      { roundId: 4, amount: '3000', token: 'USDC', date: '2024-02-28', claimed: true }
    ]
  };

  const patentTokens = [
    { address: '0x123...', name: 'BioPharma Patent #001', symbol: 'BPP001' },
    { address: '0x456...', name: 'BioPharma Patent #002', symbol: 'BPP002' }
  ];

  // Contract interactions (mock)
  const { write: claimRevenue, isLoading: isClaiming } = useContractWrite({
    address: process.env.REACT_APP_REVENUE_DISTRIBUTION_ADDRESS as `0x${string}`,
    abi: [
      {
        name: 'claimRevenue',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'roundId', type: 'uint256' }],
        outputs: []
      }
    ],
    functionName: 'claimRevenue',
  });

  const { write: distributeRevenue, isLoading: isDistributing } = useContractWrite({
    address: process.env.REACT_APP_REVENUE_DISTRIBUTION_ADDRESS as `0x${string}`,
    abi: [
      {
        name: 'distributeRevenue',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'amount', type: 'uint256' }],
        outputs: []
      }
    ],
    functionName: 'distributeRevenue',
  });

  const handleClaimRevenue = (roundId: number) => {
    claimRevenue({ args: [BigInt(roundId)] });
  };

  const handleDistributeRevenue = () => {
    if (!distributeAmount) return;
    distributeRevenue({ args: [parseEther(distributeAmount)] });
    setDistributeAmount('');
  };

  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
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
                    Total Revenue Distributed
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ${parseFloat(revenueData.totalDistributed).toLocaleString()}
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
                    Pending Revenue
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ${parseFloat(revenueData.pendingRevenue).toLocaleString()}
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
                    Claimable Rounds
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {revenueData.claimableRounds.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Claimable Revenue */}
      {revenueData.claimableRounds.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Claimable Revenue
            </h3>
            <div className="space-y-4">
              {revenueData.claimableRounds.map((round) => (
                <div key={round.roundId} className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">Round #{round.roundId}</span>
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Claimable
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {round.amount} {round.token} • {round.date}
                    </div>
                  </div>
                  <button
                    onClick={() => handleClaimRevenue(round.roundId)}
                    disabled={isClaiming}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {isClaiming ? 'Claiming...' : 'Claim'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Revenue Distribution (Admin) */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Distribute Revenue (Admin)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patent Token
              </label>
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {patentTokens.map((token) => (
                  <option key={token.address} value={token.address}>
                    {token.name} ({token.symbol})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (USDC)
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
                {isDistributing ? 'Distributing...' : 'Distribute'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Distribution History */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Distribution History
          </h3>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Round
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {revenueData.distributionHistory.map((round) => (
                  <tr key={round.roundId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{round.roundId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {round.amount} {round.token}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {round.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Claimed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueStats;