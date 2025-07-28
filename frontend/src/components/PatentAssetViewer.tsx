import React, { useState, useEffect } from 'react';
import { useAccount, useContractRead, useContractWrite } from 'wagmi';
import { formatEther, parseEther } from 'viem';

interface PatentAsset {
  patentNumber: string;
  title: string;
  inventors: string[];
  valuationUSD: bigint;
  weight: bigint;
  active: boolean;
  addedTimestamp: bigint;
  ipfsMetadata: string;
}

const PatentAssetViewer: React.FC = () => {
  const { address } = useAccount();
  const [selectedPatent, setSelectedPatent] = useState<string>('');
  const [patentList, setPatentList] = useState<string[]>([]);

  // 获取专利数量
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

  // 获取专利列表
  const { data: patentNumbers } = useContractRead({
    address: process.env.REACT_APP_GUIDECOIN_ADDRESS as `0x${string}`,
    abi: [
      {
        name: 'getPatentNumbers',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'string[]' }]
      }
    ],
    functionName: 'getPatentNumbers'
  });

  // 获取选中专利的详细信息
  const { data: patentDetails } = useContractRead({
    address: process.env.REACT_APP_GUIDECOIN_ADDRESS as `0x${string}`,
    abi: [
      {
        name: 'patents',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: '', type: 'string' }],
        outputs: [
          {
            name: '',
            type: 'tuple',
            components: [
              { name: 'patentNumber', type: 'string' },
              { name: 'title', type: 'string' },
              { name: 'inventors', type: 'string[]' },
              { name: 'valuationUSD', type: 'uint256' },
              { name: 'weight', type: 'uint256' },
              { name: 'active', type: 'bool' },
              { name: 'addedTimestamp', type: 'uint256' },
              { name: 'ipfsMetadata', type: 'string' }
            ]
          }
        ]
      }
    ],
    functionName: 'patents',
    args: [selectedPatent],
    enabled: !!selectedPatent
  });

  // 获取资产支撑比率
  const { data: backingRatio } = useContractRead({
    address: process.env.REACT_APP_GUIDECOIN_ADDRESS as `0x${string}`,
    abi: [
      {
        name: 'getBackingRatio',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }]
      }
    ],
    functionName: 'getBackingRatio'
  });

  useEffect(() => {
    if (patentNumbers && patentNumbers.length > 0) {
      setPatentList(patentNumbers);
      if (!selectedPatent) {
        setSelectedPatent(patentNumbers[0]);
      }
    }
  }, [patentNumbers, selectedPatent]);

  return (
    <div className="space-y-6">
      {/* 资产支撑比率 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            资产支撑比率
          </h3>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {backingRatio ? formatEther(backingRatio) : '0'} USD
            </div>
            <p className="text-sm text-gray-500 mt-2">每 GUIDE 代币的资产支撑价值</p>
          </div>
        </div>
      </div>

      {/* 专利资产列表 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              专利资产池 ({patentCount ? patentCount.toString() : '0'} 项专利)
            </h3>
          </div>

          {patentList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 专利选择列表 */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">专利列表</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {patentList.map((patentNumber) => (
                    <button
                      key={patentNumber}
                      onClick={() => setSelectedPatent(patentNumber)}
                      className={`w-full text-left p-3 rounded-lg border ${selectedPatent === patentNumber
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <div className="font-medium text-sm">{patentNumber}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 专利详情 */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">专利详情</h4>
                {patentDetails && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">专利号</label>
                      <p className="text-sm text-gray-900">{patentDetails.patentNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">标题</label>
                      <p className="text-sm text-gray-900">{patentDetails.title}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">发明人</label>
                      <p className="text-sm text-gray-900">
                        {patentDetails.inventors.join(', ')}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">估值 (USD)</label>
                      <p className="text-sm text-gray-900 font-semibold">
                        ${Number(formatEther(patentDetails.valuationUSD)).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">权重</label>
                      <p className="text-sm text-gray-900">
                        {(Number(patentDetails.weight) / 100).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">状态</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${patentDetails.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                        }`}>
                        {patentDetails.active ? '激活' : '未激活'}
                      </span>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">添加时间</label>
                      <p className="text-sm text-gray-900">
                        {new Date(Number(patentDetails.addedTimestamp) * 1000).toLocaleDateString()}
                      </p>
                    </div>
                    {patentDetails.ipfsMetadata && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">IPFS 元数据</label>
                        <p className="text-xs text-gray-600 font-mono break-all">
                          {patentDetails.ipfsMetadata}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">暂无专利资产</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatentAssetViewer;