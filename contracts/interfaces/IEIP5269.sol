// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IEIP5269 {
    event MetadataUpdate(uint256 indexed _tokenId);
    event BatchMetadataUpdate(uint256 _fromTokenId, uint256 _toTokenId);
    
    function tokenURI(uint256 tokenId) external view returns (string memory);
}

interface ITokenMetadataRegistry {
    struct MetadataInfo {
        string ipfsHash;
        uint256 timestamp;
        address updater;
        bool active;
    }
    
    event MetadataRegistered(address indexed token, string ipfsHash, address indexed updater);
    event MetadataUpdated(address indexed token, string oldHash, string newHash, address indexed updater);
    
    function registerMetadata(address token, string calldata ipfsHash) external;
    function updateMetadata(address token, string calldata newIpfsHash) external;
    function getMetadata(address token) external view returns (MetadataInfo memory);
    function getMetadataURI(address token) external view returns (string memory);
}