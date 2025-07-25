import React, { useState, useEffect } from 'react';
import { useContractRead, useContractWrite, useAccount } from 'wagmi';
import { uploadToIPFS, getFromIPFS } from '../services/ipfs';

interface MetadataInfo {
  ipfsHash: string;
  timestamp: number;
  updater: string;
  active: boolean;
}

const MetadataViewer: React.FC = () => {
  const { address } = useAccount();
  const [selectedToken, setSelectedToken] = useState('platform');
  const [metadataContent, setMetadataContent] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newMetadata, setNewMetadata] = useState('');

  // Available tokens
  const tokens = [
    { id: 'platform', name: 'Platform Token (PATENT)', address: process.env.REACT_APP_PATENT_TOKEN_ADDRESS },
    { id: 'patent1', name: 'BioPharma Patent #001', address: '0x123...' }
  ];

  // Read metadata from registry
  const { data: metadataInfo } = useContractRead({
    address: process.env.REACT_APP_METADATA_REGISTRY_ADDRESS as `0x${string}`,
    abi: [
      {
        name: 'getMetadata',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'token', type: 'address' }],
        outputs: [
          {
            name: '',
            type: 'tuple',
            components: [
              { name: 'ipfsHash', type: 'string' },
              { name: 'timestamp', type: 'uint256' },
              { name: 'updater', type: 'address' },
              { name: 'active', type: 'bool' }
            ]
          }
        ]
      }
    ],
    functionName: 'getMetadata',
    args: [tokens.find(t => t.id === selectedToken)?.address as `0x${string}`],
  });

  // Update metadata
  const { write: updateMetadata, isLoading: isUpdating } = useContractWrite({
    address: process.env.REACT_APP_METADATA_REGISTRY_ADDRESS as `0x${string}`,
    abi: [
      {
        name: 'updateMetadata',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'token', type: 'address' },
          { name: 'newIpfsHash', type: 'string' }
        ],
        outputs: []
      }
    ],
    functionName: 'updateMetadata',
  });

  // Load metadata content from IPFS
  useEffect(() => {
    if (metadataInfo && metadataInfo.ipfsHash) {
      getFromIPFS(metadataInfo.ipfsHash)
        .then(setMetadataContent)
        .catch(console.error);
    }
  }, [metadataInfo]);

  const handleUploadMetadata = async () => {
    if (!newMetadata.trim()) return;

    setIsUploading(true);
    try {
      const metadata = JSON.parse(newMetadata);
      const ipfsHash = await uploadToIPFS(metadata);

      updateMetadata({
        args: [
          tokens.find(t => t.id === selectedToken)?.address as `0x${string}`,
          ipfsHash
        ]
      });

      setNewMetadata('');
    } catch (error) {
      console.error('Error uploading metadata:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const getMetadataTemplate = (tokenType: string) => {
    if (tokenType === 'platform') {
      return {
        type: 'platform_token',
        compliance: {
          legalOpinion: 'QmLegalOpinionHash...',
          auditReport: 'QmAuditReportHash...',
          regulatoryLicense: 'QmRegulatoryLicenseHash...',
          corporateStructure: 'QmCorporateStructureHash...'
        },
        tokenomics: {
          maxSupply: '1000000000000000000000000',
          initialSupply: '100000000000000000000000',
          mintable: true
        },
        updatedAt: new Date().toISOString()
      };
    } else {
      return {
        type: 'patent_asset_token',
        patent: {
          number: 'US10123456B2',
          title: 'Novel Cancer Treatment Method',
          filingDate: '2020-01-15',
          grantDate: '2022-03-20',
          expiryDate: '2040-01-15'
        },
        valuation: {
          currentValue: 5000000,
          currency: 'USD',
          valuationDate: new Date().toISOString().split('T')[0],
          valuationMethod: 'DCF Analysis',
          valuationReport: 'QmValuationReportHash...'
        },
        legal: {
          patentCertificate: 'QmPatentCertificateHash...',
          legalStatus: 'Active',
          complianceDocuments: ['QmComplianceDoc1...', 'QmComplianceDoc2...']
        },
        technical: {
          technicalDescription: 'QmTechnicalDescHash...',
          priorArt: 'QmPriorArtHash...',
          claims: 'QmClaimsHash...'
        },
        updatedAt: new Date().toISOString()
      };
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Token Metadata Management
          </h3>

          {/* Token Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Token
            </label>
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {tokens.map((token) => (
                <option key={token.id} value={token.id}>
                  {token.name}
                </option>
              ))}
            </select>
          </div>

          {/* Current Metadata */}
          {metadataInfo && metadataInfo.active && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-2">Current Metadata</h4>
              <div className="bg-gray-50 rounded-md p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">IPFS Hash:</span>
                    <p className="font-mono text-xs break-all">{metadataInfo.ipfsHash}</p>
                  </div>
                  <div>
                    <span className="font-medium">Last Updated:</span>
                    <p>{new Date(Number(metadataInfo.timestamp) * 1000).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="font-medium">Updated By:</span>
                    <p className="font-mono text-xs">{metadataInfo.updater}</p>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <p className="text-green-600">Active</p>
                  </div>
                </div>
              </div>

              {metadataContent && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Metadata Content</h5>
                  <pre className="bg-gray-100 rounded-md p-4 text-xs overflow-auto max-h-64">
                    {JSON.stringify(metadataContent, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Update Metadata */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-md font-medium text-gray-900">Update Metadata</h4>
              <button
                onClick={() => setNewMetadata(JSON.stringify(getMetadataTemplate(selectedToken), null, 2))}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Load Template
              </button>
            </div>
            <textarea
              value={newMetadata}
              onChange={(e) => setNewMetadata(e.target.value)}
              placeholder="Enter metadata JSON..."
              rows={12}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleUploadMetadata}
                disabled={isUploading || isUpdating || !newMetadata.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Uploading to IPFS...' : isUpdating ? 'Updating...' : 'Update Metadata'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata Types Info */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Metadata Types
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Platform Token Metadata</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Legal opinion documents</li>
                <li>• Compliance audit reports</li>
                <li>• Regulatory licenses</li>
                <li>• Corporate governance structure</li>
                <li>• Voting rights and parameters</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Patent Asset Metadata</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Patent registration certificates</li>
                <li>• Technical evaluation reports</li>
                <li>• Market valuation analysis</li>
                <li>• Legal status documents</li>
                <li>• Prior art and claims</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetadataViewer;
