// 简化的 IPFS 服务，避免浏览器兼容性问题
// 在实际部署中，应该使用真正的 IPFS 客户端

export interface PatentMetadata {
  type: 'platform_token' | 'patent_asset_token';
  patentId?: string;
  title?: string;
  description?: string;
  inventors?: string[];
  filingDate?: string;
  expirationDate?: string;
  valuationReport?: string;
  complianceDocuments?: string[];
  revenueProjections?: {
    year: number;
    projectedRevenue: number;
  }[];
  compliance?: {
    legalOpinion: string;
    auditReport: string;
    regulatoryLicense: string;
    corporateStructure: string;
  };
  governance?: {
    votingRights: boolean;
    proposalThreshold: string;
    quorumPercentage: number;
  };
  patent?: {
    number: string;
    title: string;
    inventors: string[];
    filingDate: string;
    expirationDate: string;
    jurisdiction: string;
  };
  valuation?: {
    currentValue: number;
    currency: string;
    valuationDate: string;
    valuationMethod: string;
    valuationReport: string;
  };
  legal?: {
    patentCertificate: string;
    legalStatus: string;
    complianceDocuments: string[];
  };
  technical?: {
    technicalDescription: string;
    priorArt: string;
    claims: string;
  };
  updatedAt: string;
}

export const uploadToIPFS = async (data: any): Promise<string> => {
  try {
    // 模拟 IPFS 上传，返回模拟的哈希
    console.log('Uploading to IPFS:', data);
    const mockHash = 'Qm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // 在实际应用中，这里应该调用真正的 IPFS API
    // 暂时存储在 localStorage 中模拟
    localStorage.setItem(`ipfs_${mockHash}`, JSON.stringify(data));

    return mockHash;
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw error;
  }
};

export const getFromIPFS = async (hash: string): Promise<any> => {
  try {
    console.log('Fetching from IPFS:', hash);

    // 从 localStorage 中获取模拟数据
    const data = localStorage.getItem(`ipfs_${hash}`);
    if (data) {
      return JSON.parse(data);
    }

    // 如果没有找到，返回模拟的元数据
    return {
      type: 'patent_asset_token',
      title: '示例专利资产',
      description: '这是一个示例专利资产的元数据',
      inventors: ['张三', '李四'],
      filingDate: '2023-01-15',
      expirationDate: '2043-01-15',
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching from IPFS:', error);
    throw error;
  }
};

export const uploadFileToIPFS = async (file: File): Promise<string> => {
  try {
    console.log('Uploading file to IPFS:', file.name);
    const mockHash = 'Qm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // 在实际应用中，这里应该上传文件到 IPFS
    // 暂时只返回模拟的哈希
    return mockHash;
  } catch (error) {
    console.error('Error uploading file to IPFS:', error);
    throw error;
  }
};

export const pinToIPFS = async (hash: string): Promise<void> => {
  try {
    console.log('Pinning to IPFS:', hash);
    // 在实际应用中，这里应该固定文件到 IPFS
    // 暂时只是日志输出
  } catch (error) {
    console.error('Error pinning to IPFS:', error);
    throw error;
  }
};
