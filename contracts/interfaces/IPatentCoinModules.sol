// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IPatentCoinModules
 * @dev 定义PatentCoin各个模块的基础接口
 */

// ============ 角色管理接口 ============
interface IRoleManager {
    event MultisigWalletAssigned(bytes32 indexed role, address indexed multisigWallet, address indexed assigner);
    event MultisigWalletRevoked(bytes32 indexed role, address indexed multisigWallet, address indexed revoker);
    
    function assignRoleToMultisig(bytes32 role, address multisigWallet) external;
    function reassignRoleMultisig(bytes32 role, address newMultisigWallet) external;
    function getRoleMultisigWallet(bytes32 role) external view returns (address);
    function isAuthorizedMultisig(address wallet) external view returns (bool);
}

// ============ 合规控制接口 ============
interface IComplianceManager {
    event AddressWhitelisted(address indexed account, address indexed operator);
    event AddressRemovedFromWhitelist(address indexed account, address indexed operator);
    event AddressBlacklisted(address indexed account, address indexed operator);
    event AddressUnblacklisted(address indexed account, address indexed operator);
    event AddressFrozen(address indexed account, address indexed operator);
    event AddressUnfrozen(address indexed account, address indexed operator);
    event WhitelistStatusChanged(bool enabled, address indexed operator);
    
    function setWhitelistEnabled(bool enabled) external;
    function addToWhitelist(address account) external;
    function removeFromWhitelist(address account) external;
    function addToBlacklist(address account) external;
    function removeFromBlacklist(address account) external;
    function freezeAddress(address account) external;
    function unfreezeAddress(address account) external;
    
    function isWhitelisted(address account) external view returns (bool);
    function isBlacklisted(address account) external view returns (bool);
    function isFrozen(address account) external view returns (bool);
    function whitelistEnabled() external view returns (bool);
    function checkTransferCompliance(address from, address to) external view returns (bool);
}

// ============ 专利资产管理接口 ============
interface IPatentAssetManager {
    struct PatentAsset {
        string patentNumber;
        string title;
        string[] inventors;
        uint256 valuationUSD;
        uint256 weight;
        bool active;
        uint256 addedTimestamp;
        string ipfsMetadata;
    }
    
    event PatentAdded(string indexed patentNumber, uint256 valuation, uint256 weight);
    event PatentUpdated(string indexed patentNumber, uint256 newValuation, uint256 newWeight);
    event PatentRemoved(string indexed patentNumber);
    
    function addPatent(
        string memory patentNumber,
        string memory title,
        string[] memory inventors,
        uint256 valuationUSD,
        uint256 weight,
        string memory ipfsMetadata
    ) external;
    
    function updatePatentValuation(string memory patentNumber, uint256 newValuationUSD, uint256 newWeight) external;
    function getPatent(string memory patentNumber) external view returns (PatentAsset memory);
    function getPatentCount() external view returns (uint256);
    function getTotalPatentValuation() external view returns (uint256);
}

// ============ 储备资产管理接口 ============
interface IReserveAssetManager {
    struct ReserveAsset {
        address tokenAddress;
        uint256 amount;
        uint256 valueUSD;
        bool isActive;
        uint256 lastUpdated;
    }
    
    event ReserveAssetAdded(address indexed asset, uint256 amount, uint256 valueUSD);
    event ReserveAssetUpdated(address indexed asset, uint256 newAmount, uint256 newValueUSD);
    event ReserveUpdated(uint256 oldValue, uint256 newValue, uint256 backingRatio);
    
    function updateReserveAsset(address tokenAddress, uint256 amount, uint256 valueUSD) external;
    function getReserveAsset(address tokenAddress) external view returns (ReserveAsset memory);
    function getReserveAssetCount() external view returns (uint256);
    function getTotalReserveValueUSD() external view returns (uint256);
    function getBackingRatio(uint256 totalSupply) external view returns (uint256);
}

// ============ 收益分配接口 ============
interface IRevenueDistributor {
    struct RevenueRound {
        uint256 totalAmount;
        uint256 timestamp;
        address revenueToken;
        uint256 totalSupplySnapshot;
    }
    
    event RevenueDistributed(uint256 indexed roundId, uint256 totalAmount, address revenueToken);
    event RevenueClaimed(uint256 indexed roundId, address indexed user, uint256 amount);
    
    function distributeRevenue(uint256 totalRevenue, address revenueToken, uint256 totalSupply) external;
    function claimRevenue(uint256 roundId, address user, uint256 userBalance) external returns (uint256);
    function getClaimableRevenue(uint256 roundId, address user, uint256 userBalance) external view returns (uint256);
    function getCurrentRevenueRound() external view returns (uint256);
    function hasClaimedRevenue(uint256 roundId, address user) external view returns (bool);
}

// ============ 赎回机制接口 ============
interface IRedemptionManager {
    struct RedemptionRequest {
        address requester;
        uint256 amount;
        uint256 timestamp;
        bool processed;
        address reserveAsset;
    }
    
    event RedemptionRequested(uint256 indexed requestId, address indexed requester, uint256 amount);
    event RedemptionProcessed(uint256 indexed requestId, address indexed requester, uint256 amount);
    
    function requestRedemption(address requester, uint256 amount, address preferredAsset) external returns (uint256);
    function processRedemption(uint256 requestId) external;
    function getRedemptionRequest(uint256 requestId) external view returns (RedemptionRequest memory);
    function getRedemptionRequestCounter() external view returns (uint256);
}

// ============ 审计日志接口 ============
interface IAuditLogger {
    struct OperationLog {
        bytes32 role;
        address operator;
        string operation;
        address target;
        uint256 amount;
        uint256 timestamp;
        bytes32 txHash;
    }
    
    event OperationLogged(bytes32 indexed role, address indexed operator, string operation, address indexed target);
    event AuditCompleted(address indexed auditor, string reportHash, uint256 timestamp);
    
    function logOperation(bytes32 role, address operator, string memory operation, address target, uint256 amount) external;
    function setAuditorAddress(address auditor) external;
    function submitAuditReport(string calldata reportHash) external;
    function getOperationLogCount() external view returns (uint256);
    function getRoleOperationCount(bytes32 role) external view returns (uint256);
    function getOperationLog(uint256 index) external view returns (OperationLog memory);
}
