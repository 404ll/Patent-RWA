// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IEIP5269.sol";

contract TokenMetadataRegistry is ITokenMetadataRegistry, Ownable, ReentrancyGuard {
    string public constant IPFS_BASE_URI = "https://ipfs.io/ipfs/";
    
    mapping(address => MetadataInfo) private tokenMetadata;
    mapping(address => bool) public authorizedUpdaters;
    
    modifier onlyAuthorized(address token) {
        require(
            msg.sender == owner() || 
            authorizedUpdaters[msg.sender] || 
            msg.sender == token,
            "Not authorized to update metadata"
        );
        _;
    }
    
    constructor() {}
    
    function addAuthorizedUpdater(address updater) external onlyOwner {
        authorizedUpdaters[updater] = true;
    }
    
    function removeAuthorizedUpdater(address updater) external onlyOwner {
        authorizedUpdaters[updater] = false;
    }
    
    function registerMetadata(
        address token, 
        string calldata ipfsHash
    ) external override onlyAuthorized(token) nonReentrant {
        require(token != address(0), "Invalid token address");
        require(bytes(ipfsHash).length > 0, "Empty IPFS hash");
        require(!tokenMetadata[token].active, "Metadata already registered");
        
        tokenMetadata[token] = MetadataInfo({
            ipfsHash: ipfsHash,
            timestamp: block.timestamp,
            updater: msg.sender,
            active: true
        });
        
        emit MetadataRegistered(token, ipfsHash, msg.sender);
    }
    
    function updateMetadata(
        address token, 
        string calldata newIpfsHash
    ) external override onlyAuthorized(token) nonReentrant {
        require(tokenMetadata[token].active, "Metadata not registered");
        require(bytes(newIpfsHash).length > 0, "Empty IPFS hash");
        
        string memory oldHash = tokenMetadata[token].ipfsHash;
        tokenMetadata[token].ipfsHash = newIpfsHash;
        tokenMetadata[token].timestamp = block.timestamp;
        tokenMetadata[token].updater = msg.sender;
        
        emit MetadataUpdated(token, oldHash, newIpfsHash, msg.sender);
    }
    
    function getMetadata(address token) external view override returns (MetadataInfo memory) {
        return tokenMetadata[token];
    }
    
    function getMetadataURI(address token) external view override returns (string memory) {
        MetadataInfo memory metadata = tokenMetadata[token];
        if (!metadata.active || bytes(metadata.ipfsHash).length == 0) {
            return "";
        }
        return string(abi.encodePacked(IPFS_BASE_URI, metadata.ipfsHash));
    }
}