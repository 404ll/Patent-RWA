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
  patentId: string;
  title: string;
  description: string;
  inventors: string[];
  filingDate: string;
  expirationDate: string;
  valuationReport: string;
  complianceDocuments: string[];
  revenueProjections: {
    year: number;
    projectedRevenue: number;
  }[];
}

export const uploadPatentMetadata = async (metadata: PatentMetadata): Promise<string> => {
  try {
    const result = await ipfs.add(JSON.stringify(metadata));
    return result.path;
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw error;
  }
};

export const getPatentMetadata = async (hash: string): Promise<PatentMetadata> => {
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