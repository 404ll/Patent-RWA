import React, { useState, useEffect } from 'react';
import { useAccount, useBalance, useContractRead } from 'wagmi';
import { formatEther } from 'viem';
import PatentAssetViewer from './PatentAssetViewer';
import MetadataViewer from './MetadataViewer';
import RevenueStats from './RevenueStats';
import CompliancePanel from './CompliancePanel';

const Dashboard: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('overview');

  // GuideCoin 合约读取
  const { data: guideBalance } = useContractRead({
    address: process.env.REACT_APP_GUIDECOIN_ADDRESS as `0x${string}`,
    abi: [
      {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }]
      }
    ],
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    enabled: !!address
  });

  const { data: totalPatentValuation } = useContractRead({
    address: process.env.REACT_APP_GUIDECOIN_ADDRESS as `0x${string}`,
    abi: [
      {
        name: 'totalPatentValuation',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }]
      }
    ],
    functionName: 'totalPatentValuation'
  });

  const { data: patentCount } = useContractRead({
    address: process.env.REACT_APP_GUIDECOIN_ADDRESS as `0x${string}`,
    abi: [
      {
        name: 'getPatentCount',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }]
      }
    ],
    functionName: 'getPatentCount'
  });

  const tabs = [
    { id: 'overview', name: '概览', icon: '📊' },
    { id: 'patents', name: '专利资产', icon: '🔬' },
    { id: 'revenue', name: '收益分配', icon: '💰' },
    { id: 'metadata', name: '元数据', icon: '📄' },
    { id: 'compliance', name: '合规管理', icon: '⚖️' }
  ];

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            GuideCoin 专利资产平台
          </h1>
          <p className="text-gray-600 mb-8">
            连接钱包以访问专利代币化平台
          </p>
          <w3m-button />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              GuideCoin 专利资产平台
            </h1>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">GUIDE 余额</p>
                <p className="font-semibold">
                  {guideBalance ? formatEther(guideBalance) : '0'} GUIDE
                </p>
              </div>
              <span className="text-sm text-gray-600">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
              <w3m-button />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {activeTab === 'overview' && (
            <OverviewTab
              totalValuation={totalPatentValuation}
              patentCount={patentCount}
              guideBalance={guideBalance}
            />
          )}
          {activeTab === 'patents' && <PatentAssetViewer />}
          {activeTab === 'revenue' && <RevenueStats />}
          {activeTab === 'metadata' && <MetadataViewer />}
          {activeTab === 'compliance' && <CompliancePanel />}
        </div>
      </main>
    </div>
  );
};

const OverviewTab: React.FC<{
  totalValuation?: bigint;
  patentCount?: bigint;
  guideBalance?: bigint;
}> = ({ totalValuation, patentCount, guideBalance }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            GuideCoin 平台概览
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            多专利资产支撑的统一代币平台
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    我的 GUIDE 余额
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {guideBalance ? formatEther(guideBalance) : '0'}
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
                <span className="text-2xl">🔬</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    专利资产数量
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {patentCount ? patentCount.toString() : '0'}
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
                <span className="text-2xl">📈</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    总资产估值
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ${totalValuation ? (Number(formatEther(totalValuation))).toLocaleString() : '0'}
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
                <span className="text-2xl">⚖️</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    HKMA 合规
                  </dt>
                  <dd className="text-lg font-medium text-green-600">
                    已认证
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
