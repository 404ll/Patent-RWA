import { create } from 'ipfs-http-client';

const ipfs = create({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: `Basic ${Buffer.from(`${process.env.REACT_APP_IPFS_PROJECT_ID}:${process.env.REACT_APP_IPFS_SECRET}`).toString('base64')}`,
  },
});

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
    const result = await ipfs.add(JSON.stringify(data, null, 2));
    return result.path;
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw error;
  }
};

export const getFromIPFS = async (hash: string): Promise<any> => {
  try {
    const chunks = [];
    for await (const chunk of ipfs.cat(hash)) {
      chunks.push(chunk);
    }
    const data = Buffer.concat(chunks).toString();
    return JSON.parse(data);
  } catch (error) {
    console.error('Error fetching from IPFS:', error);
    throw error;
  }
};

export const uploadFileToIPFS = async (file: File): Promise<string> => {
  try {
    const result = await ipfs.add(file);
    return result.path;
  } catch (error) {
    console.error('Error uploading file to IPFS:', error);
    throw error;
  }
};

export const pinToIPFS = async (hash: string): Promise<void> => {
  try {
    await ipfs.pin.add(hash);
  } catch (error) {
    console.error('Error pinning to IPFS:', error);
    throw error;
  }
};
