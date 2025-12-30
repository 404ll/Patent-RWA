import React, { useState, useEffect, useMemo } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { PATENT_COIN_ADDRESS, PATENT_COIN_ABI, PATENT_ASSET_MANAGER_ABI } from '../../config/contracts';
import { useAllPatents } from '../../hooks/usePatent';
import type { PatentAsset } from '../../types/contracts';

const PatentManagement: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'list' | 'add' | 'update' | 'deactivate'>('list');
  const [selectedPatent, setSelectedPatent] = useState<string>('');
  const [patentList, setPatentList] = useState<string[]>([]);

  // 添加专利表单
  const [addForm, setAddForm] = useState({
    patentNumber: '',
    title: '',
    inventors: '',
    valuationUSD: '',
    weight: '',
    ipfsMetadata: ''
  });

  // 更新估值表单
  const [updateForm, setUpdateForm] = useState({
    patentNumber: '',
    newValuationUSD: '',
    newWeight: ''
  });
  
  // 成功提示状态
  const [showUpdateSuccess, setShowUpdateSuccess] = useState(false);

  // 停用专利表单
  const [deactivatePatentNumber, setDeactivatePatentNumber] = useState('');

  const contractAddress = PATENT_COIN_ADDRESS as `0x${string}`;

  // 从主合约获取 PatentAssetManager 地址
  const { data: patentAssetManagerAddress } = useReadContract({
    address: contractAddress,
    abi: PATENT_COIN_ABI,
    functionName: 'patentAssetManager',
  });

  const assetManagerAddress = (patentAssetManagerAddress as `0x${string}` | undefined);

  // 获取专利列表与详情（从 PatentAssetManager 模块）
  const { data: patentCount } = useReadContract({
    address: assetManagerAddress,
    abi: PATENT_ASSET_MANAGER_ABI,
    functionName: 'getPatentCount',
    query: { enabled: !!assetManagerAddress },
  });

  const { data: patentNumbers, refetch: refetchPatents } = useReadContract({
    address: assetManagerAddress,
    abi: PATENT_ASSET_MANAGER_ABI,
    functionName: 'getPatentsPaginated',
    args: [BigInt(0), BigInt(100)],
    query: { enabled: !!assetManagerAddress && (Number(patentCount || 0) > 0) },
  });

  const { patents, isLoading: isLoadingPatents } = useAllPatents(patentNumbers as string[]);
  
  // 如果 useAllPatents 没有返回数据，直接查询选中的专利
  const { data: directPatentData } = useReadContract({
    address: assetManagerAddress,
    abi: PATENT_ASSET_MANAGER_ABI,
    functionName: 'getPatent',
    args: selectedPatent ? [selectedPatent] : undefined,
    query: { enabled: !!assetManagerAddress && !!selectedPatent },
  });

  // 优先使用 useAllPatents 的数据，如果没有则使用直接查询的数据
  const patentDetails = useMemo(() => {
    if (selectedPatent) {
      // 先从批量查询的结果中查找
      const found = patents.find((p) => p.patentNumber === selectedPatent);
      if (found) return found;

      // 如果批量查询没有找到，使用直接查询的结果
      if (directPatentData) {
        const patent = directPatentData as any;
        // 检查专利是否有效
        if (patent.patentNumber && patent.patentNumber.length > 0 && patent.active) {
          return {
            patentNumber: patent.patentNumber,
            title: patent.title ?? '',
            description: '',
            inventors: Array.isArray(patent.inventors) ? patent.inventors : [],
            valuationUSD: BigInt(patent.valuationUSD?.toString() || '0'),
            weight: BigInt(patent.weight?.toString() || '0'),
            addedTimestamp: BigInt(patent.addedTimestamp?.toString() || '0'),
            ipfsMetadata: patent.ipfsMetadata ?? '',
            active: Boolean(patent.active),
          } as PatentAsset;
        }
      }
    }
    return undefined;
  }, [selectedPatent, patents, directPatentData]);

  // 写操作 hooks
  const { 
    writeContract: addPatent, 
    data: addHash, 
    isPending: isAdding,
    error: addError 
  } = useWriteContract();
  
  const { 
    writeContract: updateValuation, 
    data: updateHash, 
    isPending: isUpdating,
    error: updateError 
  } = useWriteContract();
  
  const { 
    writeContract: deactivatePatent, 
    data: deactivateHash, 
    isPending: isDeactivating,
    error: deactivateError 
  } = useWriteContract();

  const { 
    isLoading: isAddConfirming, 
    isSuccess: isAddSuccess,
    isError: isAddFailed 
  } = useWaitForTransactionReceipt({ hash: addHash });
  
  const { 
    isLoading: isUpdateConfirming, 
    isSuccess: isUpdateSuccess,
    isError: isUpdateFailed 
  } = useWaitForTransactionReceipt({ hash: updateHash });
  
  const { 
    isLoading: isDeactivateConfirming, 
    isSuccess: isDeactivateSuccess,
    isError: isDeactivateFailed 
  } = useWaitForTransactionReceipt({ hash: deactivateHash });

  useEffect(() => {
    if (patentNumbers) {
      setPatentList([...(patentNumbers as string[])]);
    }
  }, [patentNumbers]);

  useEffect(() => {
    if (isAddSuccess || isUpdateSuccess || isDeactivateSuccess) {
      refetchPatents();
      // 重置表单
      if (isAddSuccess) {
        setAddForm({ patentNumber: '', title: '', inventors: '', valuationUSD: '', weight: '', ipfsMetadata: '' });
      }
      if (isDeactivateSuccess) {
        setDeactivatePatentNumber('');
      }
    }
  }, [isAddSuccess, isUpdateSuccess, isDeactivateSuccess, refetchPatents]);

  // 单独处理更新成功的提示显示
  useEffect(() => {
    if (isUpdateSuccess) {
      setUpdateForm({ patentNumber: '', newValuationUSD: '', newWeight: '' });
      setShowUpdateSuccess(true);
      // 5秒后自动隐藏成功提示
      const timer = setTimeout(() => {
        setShowUpdateSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isUpdateSuccess]);

  return (
    <div className="space-y-6">
      {/* 操作选择 */}
      <div className="flex space-x-2">
        {[
          { id: 'list', label: '专利列表', icon: '📋' },
          { id: 'add', label: '添加专利', icon: '➕' },
          { id: 'update', label: '更新估值', icon: '📈' },
          { id: 'deactivate', label: '停用专利', icon: '🚫' }
        ].map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id as any)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeSection === section.id
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-purple-300 hover:bg-white/20'
            }`}
          >
            <span className="mr-2">{section.icon}</span>
            {section.label}
          </button>
        ))}
      </div>

      {/* 专利列表 */}
      {activeSection === 'list' && (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">专利资产列表</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 专利列表 */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {patentList.length > 0 ? (
                patentList.map((patent) => (
                  <button
                    key={patent}
                    onClick={() => setSelectedPatent(patent)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedPatent === patent
                        ? 'border-purple-400 bg-purple-600/30'
                        : 'border-purple-500/20 bg-white/5 hover:border-purple-400/50'
                    }`}
                  >
                    <p className="font-mono text-white text-sm">{patent}</p>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-purple-300">暂无专利资产</div>
              )}
            </div>

            {/* 专利详情 */}
            <div className="bg-black/20 rounded-xl p-4">
              <h4 className="font-medium text-white mb-3">专利详情</h4>
              {isLoadingPatents && selectedPatent ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-2"></div>
                  <p className="text-purple-300 text-sm">加载中...</p>
                </div>
              ) : patentDetails ? (
                <div className="space-y-3">
                  <DetailRow label="专利号" value={patentDetails.patentNumber} />
                  <DetailRow label="标题" value={patentDetails.title || '-'} />
                  <DetailRow label="发明人" value={patentDetails.inventors?.join(', ') || '-'} />
                  <DetailRow 
                    label="估值" 
                    value={`$${patentDetails.valuationUSD.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`}
                  />
                  <DetailRow
                    label="权重"
                    value={`${Number(patentDetails.weight) / 100}%`}
                  />
                  <DetailRow 
                    label="状态" 
                    value={patentDetails.active ? '✅ 激活' : '❌ 已停用'} 
                  />
                  {patentDetails.addedTimestamp && Number(patentDetails.addedTimestamp) > 0 ? (
                  <DetailRow 
                    label="添加时间" 
                      value={new Date(Number(patentDetails.addedTimestamp) * 1000).toLocaleString()}
                  />
                  ) : null}
                  {patentDetails.ipfsMetadata && (
                    <DetailRow label="IPFS" value={patentDetails.ipfsMetadata} mono />
                  )}
                </div>
              ) 
              : (
                <p className="text-purple-300 text-sm">选择一个专利查看详情</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 添加专利 */}
      {activeSection === 'add' && (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">添加新专利</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="专利号"
              placeholder="例如: US10123456"
              value={addForm.patentNumber}
              onChange={(v) => setAddForm({ ...addForm, patentNumber: v })}
            />
            <InputField
              label="专利标题"
              placeholder="例如: 新型药物递送系统"
              value={addForm.title}
              onChange={(v) => setAddForm({ ...addForm, title: v })}
            />
            <InputField
              label="发明人（逗号分隔）"
              placeholder="例如: 张三, 李四, 王五"
              value={addForm.inventors}
              onChange={(v) => setAddForm({ ...addForm, inventors: v })}
            />
            <InputField
              label="估值 (USD)"
              placeholder="例如: 5000000"
              type="text"
              value={addForm.valuationUSD}
              onChange={(v) => {
                // 只允许输入数字，避免精度损失
                if (v === '' || /^\d+$/.test(v)) {
                  setAddForm({ ...addForm, valuationUSD: v });
                }
              }}
            />
            <InputField
              label="权重 (%)"
              placeholder="例如: 25 (0-100)"
              type="number"
              value={addForm.weight}
              onChange={(v) => {
                const num = parseFloat(v);
                // 限制在 0-100 之间
                if (v === '' || (!isNaN(num) && num >= 0 && num <= 100)) {
                  setAddForm({ ...addForm, weight: v });
                }
              }}
            />
            <InputField
              label="IPFS 元数据哈希"
              placeholder="例如: QmX..."
              value={addForm.ipfsMetadata}
              onChange={(v) => setAddForm({ ...addForm, ipfsMetadata: v })}
            />
          </div>
          
          {/* 一键填充演示案例按钮 */}
          <div className="mt-4 flex justify-start">
            <button
              onClick={() => {
                setAddForm({
                  patentNumber: 'US11234567B2',
                  title: '一种用于自动驾驶车辆的多传感器融合决策系统',
                  inventors: 'David Brown, Zhao Ming',
                  valuationUSD: '30000000',
                  weight: '40',
                  ipfsMetadata: 'QmFZ8Y7A1T9V5J3R6H2M4XQPBKCDL'
                });
              }}
              type="button"
              className="px-4 py-2 bg-blue-600/30 text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-600/50 transition-colors border border-blue-500/30"
            >
              填充演示案例
            </button>
          </div>
          
          <div className="mt-6">
            <button
              onClick={() => {
                if (!assetManagerAddress) return;
                addPatent({
                  address: assetManagerAddress,
                  abi: PATENT_ASSET_MANAGER_ABI,
                  functionName: 'addPatent',
                  args: [
                    addForm.patentNumber,
                    addForm.title,
                    addForm.inventors.split(',').map(s => s.trim()).filter(s => s.length > 0),
                    BigInt(addForm.valuationUSD || '0'), // 整数美元，不需要 parseEther
                    BigInt(Math.floor(parseFloat(addForm.weight || '0') * 100)), // weight 是基点（100 = 1%）
                    addForm.ipfsMetadata || ''
                  ]
                } as any);
              }}
              disabled={
                !assetManagerAddress ||
                isAdding ||
                isAddConfirming ||
                !addForm.patentNumber ||
                !addForm.title ||
                (addForm.weight !== '' && (isNaN(parseFloat(addForm.weight)) || parseFloat(addForm.weight) < 0 || parseFloat(addForm.weight) > 100))
              }
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isAdding || isAddConfirming ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  处理中...
                </span>
              ) : (
                '添加专利'
              )}
            </button>
            {/* 添加专利成功提示 */}
            {isAddSuccess && (
              <div className="mt-4 p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">✅</div>
                  <div className="flex-1">
                    <p className="text-green-400 font-medium">专利添加成功！</p>
                    {addHash && (
                      <p className="text-green-400/70 text-xs mt-1 font-mono">
                        交易哈希: {addHash}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 添加专利错误提示 */}
            {addError && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">❌</div>
                  <div className="flex-1">
                    <p className="text-red-400 font-medium mb-1">添加专利失败</p>
                    <p className="text-red-300 text-sm">
                      {addError.message?.includes('User rejected') || 
                       addError.message?.includes('user rejected') ||
                       addError.message?.includes('rejected')
                        ? '您已取消交易。如需添加专利，请重新点击按钮并确认交易。'
                        : addError.message || '未知错误，请稍后重试'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 添加专利交易失败提示 */}
            {isAddFailed && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">⚠️</div>
                  <div className="flex-1">
                    <p className="text-red-400 font-medium mb-1">交易执行失败</p>
                    <p className="text-red-300 text-sm">
                      可能的原因：专利已存在、没有权限、或合约已暂停
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 更新估值 */}
      {activeSection === 'update' && (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">更新专利估值</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">选择专利</label>
              <select
                value={updateForm.patentNumber}
                onChange={(e) => setUpdateForm({ ...updateForm, patentNumber: e.target.value })}
                className="w-full bg-white/10 border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400"
              >
                <option value="" className="bg-slate-800">选择专利...</option>
                {patentList.map((patent) => (
                  <option key={patent} value={patent} className="bg-slate-800">{patent}</option>
                ))}
              </select>
            </div>
            <InputField
              label="新估值 (USD)"
              placeholder="例如: 6000000"
              type="number"
              value={updateForm.newValuationUSD}
              onChange={(v) => setUpdateForm({ ...updateForm, newValuationUSD: v })}
            />
            <InputField
              label="新权重 (%)"
              placeholder="例如: 25 (0-100)"
              type="number"
              value={updateForm.newWeight || ''}
              onChange={(v) => {
                const num = parseFloat(v);
                // 限制在 0-100 之间
                if (v === '' || (!isNaN(num) && num >= 0 && num <= 100)) {
                  setUpdateForm({ ...updateForm, newWeight: v });
                }
              }}
            />
          </div>
          <div className="mt-6">
            <button
              onClick={() => {
                if (!assetManagerAddress) return;
                updateValuation({
                  address: assetManagerAddress,
                  abi: PATENT_ASSET_MANAGER_ABI,
                  functionName: 'updatePatentValuation',
                  args: [
                    updateForm.patentNumber,
                    BigInt(updateForm.newValuationUSD || '0'), // 整数美元，不需要 parseEther
                    BigInt(Math.floor(parseFloat(updateForm.newWeight || '0') * 100)) // 将百分比转换为基点（100 = 1%）
                  ]
                } as any);
              }}
              disabled={
                isUpdating ||
                isUpdateConfirming ||
                !updateForm.patentNumber ||
                !updateForm.newValuationUSD ||
                (updateForm.newWeight !== '' && (isNaN(parseFloat(updateForm.newWeight)) || parseFloat(updateForm.newWeight) < 0 || parseFloat(updateForm.newWeight) > 100))
              }
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isUpdating || isUpdateConfirming ? '处理中...' : '更新估值'}
            </button>
            {/* 更新估值成功提示 */}
            {(isUpdateSuccess || showUpdateSuccess) && (
              <div className="mt-4 p-4 bg-green-500/20 border border-green-500/30 rounded-xl animate-fade-in">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">✅</div>
                  <div className="flex-1">
                    <p className="text-green-400 font-medium text-lg">估值更新成功！</p>
                    <p className="text-green-300 text-sm mt-1">
                      专利估值和权重已成功更新到链上
                    </p>
                    {updateHash && (
                      <p className="text-green-400/70 text-xs mt-2 font-mono">
                        交易哈希: {updateHash}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowUpdateSuccess(false)}
                    className="text-green-400/70 hover:text-green-300 transition-colors"
                    aria-label="关闭提示"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* 更新估值错误提示 */}
            {updateError && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">❌</div>
                  <div className="flex-1">
                    <p className="text-red-400 font-medium mb-1">更新估值失败</p>
                    <p className="text-red-300 text-sm">
                      {updateError.message?.includes('User rejected') || 
                       updateError.message?.includes('user rejected') ||
                       updateError.message?.includes('rejected')
                        ? '您已取消交易。如需更新估值，请重新点击按钮并确认交易。'
                        : updateError.message || '未知错误，请稍后重试'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 更新估值交易失败提示 */}
            {isUpdateFailed && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">⚠️</div>
                  <div className="flex-1">
                    <p className="text-red-400 font-medium mb-1">交易执行失败</p>
                    <p className="text-red-300 text-sm">
                      可能的原因：专利不存在、没有权限、或合约已暂停
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 停用专利 */}
      {activeSection === 'deactivate' && (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">停用专利</h3>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
            <p className="text-red-300 text-sm">
              ⚠️ 警告：停用专利后，该专利将不再计入资产支撑比率。此操作需谨慎执行。
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-300 mb-2">选择要停用的专利</label>
            <select
              value={deactivatePatentNumber}
              onChange={(e) => setDeactivatePatentNumber(e.target.value)}
              className="w-full bg-white/10 border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400"
            >
              <option value="" className="bg-slate-800">选择专利...</option>
              {patentList.map((patent) => (
                <option key={patent} value={patent} className="bg-slate-800">{patent}</option>
              ))}
            </select>
          </div>
          <div className="mt-6">
            <button
              onClick={() => {
                if (!assetManagerAddress) return;
                deactivatePatent({
                  address: assetManagerAddress,
                  abi: PATENT_ASSET_MANAGER_ABI,
                  functionName: 'removePatent',
                  args: [deactivatePatentNumber]
                } as any);
              }}
              disabled={
                !assetManagerAddress ||
                isDeactivating ||
                isDeactivateConfirming ||
                !deactivatePatentNumber
              }
              className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white py-3 rounded-xl font-medium hover:from-red-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isDeactivating || isDeactivateConfirming ? '处理中...' : '确认停用'}
            </button>
            {/* 停用专利成功提示 */}
            {isDeactivateSuccess && (
              <div className="mt-4 p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">✅</div>
                  <div className="flex-1">
                    <p className="text-green-400 font-medium">专利已停用！</p>
                    {deactivateHash && (
                      <p className="text-green-400/70 text-xs mt-1 font-mono">
                        交易哈希: {deactivateHash}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 停用专利错误提示 */}
            {deactivateError && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">❌</div>
                  <div className="flex-1">
                    <p className="text-red-400 font-medium mb-1">停用专利失败</p>
                    <p className="text-red-300 text-sm">
                      {deactivateError.message?.includes('User rejected') || 
                       deactivateError.message?.includes('user rejected') ||
                       deactivateError.message?.includes('rejected')
                        ? '您已取消交易。如需停用专利，请重新点击按钮并确认交易。'
                        : deactivateError.message || '未知错误，请稍后重试'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 停用专利交易失败提示 */}
            {isDeactivateFailed && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">⚠️</div>
                  <div className="flex-1">
                    <p className="text-red-400 font-medium mb-1">交易执行失败</p>
                    <p className="text-red-300 text-sm">
                      可能的原因：专利不存在、没有权限、或合约已暂停
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 输入字段组件
const InputField: React.FC<{
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}> = ({ label, placeholder, value, onChange, type = 'text' }) => (
  <div>
    <label className="block text-sm font-medium text-purple-300 mb-2">{label}</label>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white/10 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400 transition-colors"
    />
  </div>
);

// 详情行组件
const DetailRow: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
}> = ({ label, value, mono }) => (
  <div>
    <p className="text-xs text-purple-400">{label}</p>
    <p className={`text-sm text-white ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</p>
  </div>
);

export default PatentManagement;

