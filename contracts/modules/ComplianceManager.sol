// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../abstract/BasePatentCoinModule.sol";
import "../interfaces/IPatentCoinModules.sol";

/**
 * @title ComplianceManager
 * @dev 管理PatentCoin的合规控制，包括白名单、黑名单和地址冻结
 */
contract ComplianceManager is BasePatentCoinModule, IComplianceManager {
    // ============ 状态变量 ============
    mapping(address => bool) private _blacklisted;
    mapping(address => bool) private _frozen;
    mapping(address => bool) private _whitelisted;
    bool public whitelistEnabled;

    // 合规统计
    uint256 public blacklistedCount;
    uint256 public frozenCount;
    uint256 public whitelistedCount;

    // ============ 初始化函数 ============
    function initialize(address _patentCoinContract, address admin) public initializer {
        __BasePatentCoinModule_init(_patentCoinContract, admin);
        whitelistEnabled = false;
    }

    // ============ 白名单管理 ============
    /**
     * @dev 启用/禁用白名单机制
     */
    function setWhitelistEnabled(bool enabled) external override onlyRoleMultisig(WHITELISTER_ROLE) {
        whitelistEnabled = enabled;
        emit WhitelistStatusChanged(enabled, msg.sender);
    }

    /**
     * @dev 添加地址到白名单
     */
    function addToWhitelist(address account) external override onlyRoleMultisig(WHITELISTER_ROLE) {
        _requireNonZeroAddress(account, "ComplianceManager: cannot whitelist zero address");
        require(!_whitelisted[account], "ComplianceManager: address already whitelisted");

        _whitelisted[account] = true;
        whitelistedCount++;
        emit AddressWhitelisted(account, msg.sender);
    }

    /**
     * @dev 从白名单移除地址
     */
    function removeFromWhitelist(address account) external override onlyRoleMultisig(WHITELISTER_ROLE) {
        _requireNonZeroAddress(account, "ComplianceManager: cannot remove zero address from whitelist");
        require(_whitelisted[account], "ComplianceManager: address not whitelisted");

        _whitelisted[account] = false;
        whitelistedCount--;
        emit AddressRemovedFromWhitelist(account, msg.sender);
    }

    /**
     * @dev 批量添加到白名单
     */
    function batchAddToWhitelist(address[] calldata accounts) external onlyRoleMultisig(WHITELISTER_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            address account = accounts[i];
            _requireNonZeroAddress(account, "ComplianceManager: cannot whitelist zero address");
            
            if (!_whitelisted[account]) {
                _whitelisted[account] = true;
                whitelistedCount++;
                emit AddressWhitelisted(account, msg.sender);
            }
        }
    }

    // ============ 黑名单管理 ============
    /**
     * @dev 添加到黑名单
     */
    function addToBlacklist(address account) external override onlyRoleMultisig(BLACKLISTER_ROLE) {
        _requireNonZeroAddress(account, "ComplianceManager: cannot blacklist zero address");
        require(!_blacklisted[account], "ComplianceManager: address already blacklisted");

        _blacklisted[account] = true;
        blacklistedCount++;
        emit AddressBlacklisted(account, msg.sender);
    }

    /**
     * @dev 从黑名单移除
     */
    function removeFromBlacklist(address account) external override onlyRoleMultisig(BLACKLISTER_ROLE) {
        _requireNonZeroAddress(account, "ComplianceManager: cannot remove zero address from blacklist");
        require(_blacklisted[account], "ComplianceManager: address not blacklisted");

        _blacklisted[account] = false;
        blacklistedCount--;
        emit AddressUnblacklisted(account, msg.sender);
    }

    /**
     * @dev 批量添加到黑名单
     */
    function batchAddToBlacklist(address[] calldata accounts) external onlyRoleMultisig(BLACKLISTER_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            address account = accounts[i];
            _requireNonZeroAddress(account, "ComplianceManager: cannot blacklist zero address");
            
            if (!_blacklisted[account]) {
                _blacklisted[account] = true;
                blacklistedCount++;
                emit AddressBlacklisted(account, msg.sender);
            }
        }
    }

    // ============ 地址冻结管理 ============
    /**
     * @dev 冻结地址
     */
    function freezeAddress(address account) external override onlyRoleMultisig(FREEZER_ROLE) {
        _requireNonZeroAddress(account, "ComplianceManager: cannot freeze zero address");
        require(!_frozen[account], "ComplianceManager: address already frozen");

        _frozen[account] = true;
        frozenCount++;
        emit AddressFrozen(account, msg.sender);
    }

    /**
     * @dev 解冻地址
     */
    function unfreezeAddress(address account) external override onlyRoleMultisig(FREEZER_ROLE) {
        _requireNonZeroAddress(account, "ComplianceManager: cannot unfreeze zero address");
        require(_frozen[account], "ComplianceManager: address not frozen");

        _frozen[account] = false;
        frozenCount--;
        emit AddressUnfrozen(account, msg.sender);
    }

    /**
     * @dev 批量冻结地址
     */
    function batchFreezeAddresses(address[] calldata accounts) external onlyRoleMultisig(FREEZER_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            address account = accounts[i];
            _requireNonZeroAddress(account, "ComplianceManager: cannot freeze zero address");
            
            if (!_frozen[account]) {
                _frozen[account] = true;
                frozenCount++;
                emit AddressFrozen(account, msg.sender);
            }
        }
    }

    // ============ 查询函数 ============
    /**
     * @dev 检查地址是否在白名单中
     */
    function isWhitelisted(address account) external view override returns (bool) {
        return _whitelisted[account];
    }

    /**
     * @dev 检查地址是否在黑名单中
     */
    function isBlacklisted(address account) external view override returns (bool) {
        return _blacklisted[account];
    }

    /**
     * @dev 检查地址是否被冻结
     */
    function isFrozen(address account) external view override returns (bool) {
        return _frozen[account];
    }

    /**
     * @dev 检查转账合规性
     */
    function checkTransferCompliance(address from, address to) external view override returns (bool) {
        // 检查黑名单
        if (_blacklisted[from] || _blacklisted[to]) {
            return false;
        }

        // 检查冻结状态
        if (_frozen[from] || _frozen[to]) {
            return false;
        }

        // 检查白名单（如果启用）
        if (whitelistEnabled) {
            if (!_whitelisted[from] || !_whitelisted[to]) {
                return false;
            }
        }

        return true;
    }

    /**
     * @dev 获取合规统计信息
     */
    function getComplianceStats() external view returns (
        uint256 _blacklistedCount,
        uint256 _frozenCount,
        uint256 _whitelistedCount,
        bool _whitelistEnabled
    ) {
        return (blacklistedCount, frozenCount, whitelistedCount, whitelistEnabled);
    }

    /**
     * @dev 检查地址的完整合规状态
     */
    function getAddressComplianceStatus(address account) external view returns (
        bool isWhitelistedStatus,
        bool isBlacklistedStatus,
        bool isFrozenStatus,
        bool canTransfer
    ) {
        isWhitelistedStatus = _whitelisted[account];
        isBlacklistedStatus = _blacklisted[account];
        isFrozenStatus = _frozen[account];
        
        // 计算是否可以转账
        canTransfer = !isBlacklistedStatus && !isFrozenStatus;
        if (whitelistEnabled) {
            canTransfer = canTransfer && isWhitelistedStatus;
        }
    }

    /**
     * @dev 获取模块版本
     */
    function moduleVersion() external pure override returns (string memory) {
        return "1.0.0-ComplianceManager";
    }

    // ============ 内部辅助函数 ============
    /**
     * @dev 内部函数：检查地址是否受限制
     */
    function _isRestricted(address account) internal view returns (bool) {
        return _blacklisted[account] || _frozen[account];
    }

    /**
     * @dev 内部函数：检查白名单要求
     */
    function _requireWhitelisted(address account) internal view {
        if (whitelistEnabled) {
            require(_whitelisted[account], "ComplianceManager: address not whitelisted");
        }
    }
}
