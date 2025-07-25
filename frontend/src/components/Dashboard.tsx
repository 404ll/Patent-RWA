import React, { useState, useEffect } from 'react';
import { useAccount, useBalance, useContractRead } from 'wagmi';
import { formatEther } from 'viem';
import PatentTokenCard from './PatentTokenCard';
import MetadataViewer from './MetadataViewer';
import RevenueStats from './RevenueStats';

const Dashboard: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', name: '概览', icon: '📊' },
    { id: 'patents', name: '专利代币', icon: '🔬' },
    { id: 'metadata', name: '元数据管理', icon: '📄' },
    { id: 'revenue', name: '收益统计', icon: '💰' }
  ];

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            BioPharma Patent RWA Platform
          </h1>
          <p className="text-gray-600 mb-8">
            Connect your wallet to access the patent tokenization platform
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
              BioPharma Patent RWA
            </h1>
            <div className="flex items-center space-x-4">
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
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'patents' && <PatentTokenCard />}
          {activeTab === 'metadata' && <MetadataViewer />}
          {activeTab === 'revenue' && <RevenueStats />}
        </div>
      </main>
    </div>
  );
};

const OverviewTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            平台概览
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            专利代币化和收益分配平台
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🔬</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    专利代币
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    代币化专利资产
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
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    收益分配
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    自动收益分配
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
                <span className="text-2xl">📄</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    元数据管理
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    IPFS存储
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
