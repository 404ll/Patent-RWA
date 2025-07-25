import React, { useState } from 'react';
import { useContractRead } from 'wagmi';

interface PatentToken {
  address: string;
  name: string;
  symbol: string;
  patentNumber: string;
  title: string;
  valuation: number;
  balance: string;
  totalSupply: string;
}

interface PatentTokenCardProps {
  token: PatentToken;
}

const PatentTokenCard: React.FC<PatentTokenCardProps> = ({ token }) => {
  const [showDetails, setShowDetails] = useState(false);

  const ownership = (parseFloat(token.balance) / parseFloat(token.totalSupply)) * 100;
  const portfolioValue = (token.valuation * parseFloat(token.balance)) / parseFloat(token.totalSupply);

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">{token.symbol.slice(0, 3)}</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">{token.name}</h3>
              <p className="text-sm text-gray-500">{token.symbol}</p>
            </div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className={`w-5 h-5 transform transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Your Holdings</span>
            <span className="font-medium">{parseFloat(token.balance).toLocaleString()} tokens</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-500">Ownership</span>
            <span className="font-medium">{ownership.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-500">Portfolio Value</span>
            <span className="font-medium text-green-600">${portfolioValue.toLocaleString()}</span>
          </div>
        </div>

        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Patent Number</span>
                <span className="font-mono">{token.patentNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Valuation</span>
                <span>${token.valuation.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Supply</span>
                <span>{parseFloat(token.totalSupply).toLocaleString()} tokens</span>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-sm text-gray-600 line-clamp-2">{token.title}</p>
            </div>
            <div className="mt-4 flex space-x-2">
              <button className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700">
                View Details
              </button>
              <button className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm hover:bg-gray-300">
                Trade
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatentTokenCard;