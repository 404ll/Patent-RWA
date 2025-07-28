import React, { useState } from 'react';
import { useAccount, useContractRead, useContractWrite } from 'wagmi';

const CompliancePanel: React.FC = () => {
  const { address } = useAccount();
  const [targetAddress, setTargetAddress] = useState('');

  // 检查用户是否被黑名单
  const { data: isBlacklisted } = useContractRead({
    address: process.env.REACT_APP_GUIDECOIN_ADDRESS as `0x${string}`,
    abi: [
      {
        name: 'isBlacklisted',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'bool' }]
      }
    ],
    functionName: 'isBlacklisted',
    args: [address as `0x${string}`],
    enabled: !!address
  });

  // 检查用户是否被冻结
  const { data: isFrozen } = useContractRead({
    address: process.env.REACT_APP_GUIDECOIN_ADDRESS as `0x${string}`,
    abi: [
      {
        name: 'isFrozen',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'bool' }]
      }
    ],
    functionName: 'isFrozen',
    args: [address as `0x${string}`],
    enabled: !!address
  });

  // 检查合约是否暂停
  const { data: isPaused } = useContractRead({
    address: process.env.REACT_APP_GUIDECOIN_ADDRESS as `0x${string}`,
    abi: [
      {
        name: 'paused',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'bool' }]
      }
    ],
    functionName: 'paused'
  });

  // 检查用户角色
  const { data: hasAdminRole } = useContractRead({
    address: process.env.REACT_APP_GUIDECOIN_ADDRESS as `0x${string}`,
    abi: [
      {
        name: 'hasRole',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { name: 'role', type: 'bytes32' },
          { name: 'account', type: 'address' }
        ],
        outputs: [{ name: '', type: 'bool' }]
      }
    ],
    functionName: 'hasRole',
    args: ['0x0000000000000000000000000000000000000000000000000000000000000000', address as `0x${string}`], // DEFAULT_ADMIN_ROLE
    enabled: !!address
  });

  return (
    <div className="space-y-6">
      {/* 用户合规状态 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            我的合规状态
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${isBlacklisted ? 'bg-red-500' : 'bg-green-500'
                  }`}></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">黑名单状态</p>
                  <p className={`text-sm ${isBlacklisted ? 'text-red-600' : 'text-green-600'}`}>
                    {isBlacklisted ? '已列入' : '正常'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${isFrozen ? 'bg-red-500' : 'bg-green-500'
                  }`}></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">冻结状态</p>
                  <p className={`text-sm ${isFrozen ? 'text-red-600' : 'text-green-600'}`}>
                    {isFrozen ? '已冻结' : '正常'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${isPaused ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">合约状态</p>
                  <p className={`text-sm ${isPaused ? 'text-yellow-600' : 'text-green-600'}`}>
                    {isPaused ? '已暂停' : '正常运行'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${hasAdminRole ? 'bg-blue-500' : 'bg-gray-400'
                  }`}></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">管理员权限</p>
                  <p className={`text-sm ${hasAdminRole ? 'text-blue-600' : 'text-gray-600'}`}>
                    {hasAdminRole ? '是' : '否'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HKMA 合规信息 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            HKMA 合规框架
          </h3>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">反洗钱 (AML) 合规</h4>
                <p className="text-sm text-gray-600">
                  实施黑名单机制，支持监管机构要求的账户限制
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">资产冻结机制</h4>
                <p className="text-sm text-gray-600">
                  支持监管要求的紧急资产冻结功能
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">紧急暂停功能</h4>
                <p className="text-sm text-gray-600">
                  在紧急情况下可暂停所有代币转账操作
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">可升级架构</h4>
                <p className="text-sm text-gray-600">
                  采用 UUPS 代理模式，支持合规要求的功能升级
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">审计追踪</h4>
                <p className="text-sm text-gray-600">
                  完整的事件日志记录，支持监管审计要求
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 合规操作说明 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                合规操作提醒
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  如果您的账户被标记为异常状态，请联系平台管理员或监管机构。
                  所有合规操作都将被记录并可供审计。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompliancePanel;