// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../abstract/BaseGuideCoinModule.sol";
import "../interfaces/IGuideCoinModules.sol";

/**
 * @title RoleManager
 * @dev 管理GuideCoin的角色分配和多签钱包授权
 */
contract RoleManager is BaseGuideCoinModule, IRoleManager {
    // ============ 状态变量 ============
    mapping(bytes32 => address) public roleMultisigWallets;

    // 角色冲突检测
    mapping(address => bytes32[]) private accountRoles;
    mapping(address => mapping(bytes32 => bool)) private hasRoleMapping;

    // ============ 事件 ============
    event RoleConflictDetected(
        address indexed account,
        bytes32 role1,
        bytes32 role2
    );

    // ============ 初始化函数 ============
    function initialize(
        address _guideCoinContract,
        address admin,
        address minterMultisig,
        address burnerMultisig,
        address pauserMultisig,
        address resumerMultisig,
        address freezerMultisig,
        address whitelisterMultisig,
        address blacklisterMultisig,
        address upgraderMultisig,
        address patentManagerMultisig,
        address revenueManagerMultisig,
        address reserveManagerMultisig,
        address redemptionProcessorMultisig
    ) public initializer {
        __BaseGuideCoinModule_init(_guideCoinContract, admin);

        // 分配角色给多签钱包
        _assignRoleToMultisig(MINTER_ROLE, minterMultisig, admin);
        _assignRoleToMultisig(BURNER_ROLE, burnerMultisig, admin);
        _assignRoleToMultisig(PAUSER_ROLE, pauserMultisig, admin);
        _assignRoleToMultisig(RESUME_ROLE, resumerMultisig, admin);
        _assignRoleToMultisig(FREEZER_ROLE, freezerMultisig, admin);
        _assignRoleToMultisig(WHITELISTER_ROLE, whitelisterMultisig, admin);
        _assignRoleToMultisig(BLACKLISTER_ROLE, blacklisterMultisig, admin);
        _assignRoleToMultisig(UPGRADER_ROLE, upgraderMultisig, admin);
        _assignRoleToMultisig(
            PATENT_MANAGER_ROLE,
            patentManagerMultisig,
            admin
        );
        _assignRoleToMultisig(
            REVENUE_MANAGER_ROLE,
            revenueManagerMultisig,
            admin
        );
        _assignRoleToMultisig(
            RESERVE_MANAGER_ROLE,
            reserveManagerMultisig,
            admin
        );
        _assignRoleToMultisig(
            REDEMPTION_PROCESSOR_ROLE,
            redemptionProcessorMultisig,
            admin
        );
    }

    // ============ 角色管理函数 ============
    /**
     * @dev 分配角色给多签钱包
     */
    function assignRoleToMultisig(
        bytes32 role,
        address multisigWallet
    ) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _assignRoleToMultisig(role, multisigWallet, msg.sender);
    }

    /**
     * @dev 重新分配角色的多签钱包
     */
    function reassignRoleMultisig(
        bytes32 role,
        address newMultisigWallet
    ) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _requireNonZeroAddress(
            newMultisigWallet,
            "RoleManager: new multisig cannot be zero address"
        );

        address oldMultisig = roleMultisigWallets[role];
        if (oldMultisig != address(0)) {
            _revokeRole(role, oldMultisig);
            _removeRoleFromAccount(oldMultisig, role);
            authorizedMultisigs[oldMultisig] = false;
            emit MultisigWalletRevoked(role, oldMultisig, msg.sender);
        }

        _assignRoleToMultisig(role, newMultisigWallet, msg.sender);
    }

    // ============ 查询函数 ============
    /**
     * @dev 获取角色对应的多签钱包地址
     */
    function getRoleMultisigWallet(
        bytes32 role
    ) external view override returns (address) {
        return roleMultisigWallets[role];
    }

    /**
     * @dev 检查地址是否为授权的多签钱包
     */
    function isAuthorizedMultisig(
        address wallet
    ) external view override(BaseGuideCoinModule, IRoleManager) returns (bool) {
        return authorizedMultisigs[wallet];
    }

    /**
     * @dev 检测地址是否持有冲突的角色
     */
    function checkRoleConflicts(
        address account
    )
        external
        view
        returns (bool hasConflict, bytes32[] memory conflictingRoles)
    {
        bytes32[] memory highRiskRoles = new bytes32[](4);
        highRiskRoles[0] = MINTER_ROLE;
        highRiskRoles[1] = BURNER_ROLE;
        highRiskRoles[2] = UPGRADER_ROLE;
        highRiskRoles[3] = DEFAULT_ADMIN_ROLE;

        bytes32[] memory conflicts = new bytes32[](10);
        uint256 conflictCount = 0;

        for (uint256 i = 0; i < highRiskRoles.length; i++) {
            for (uint256 j = i + 1; j < highRiskRoles.length; j++) {
                if (
                    hasRole(highRiskRoles[i], account) &&
                    hasRole(highRiskRoles[j], account)
                ) {
                    conflicts[conflictCount] = highRiskRoles[i];
                    conflicts[conflictCount + 1] = highRiskRoles[j];
                    conflictCount += 2;
                    hasConflict = true;
                }
            }
        }

        // 调整数组大小
        conflictingRoles = new bytes32[](conflictCount);
        for (uint256 k = 0; k < conflictCount; k++) {
            conflictingRoles[k] = conflicts[k];
        }
    }

    /**
     * @dev 获取账户拥有的所有角色
     */
    function getAccountRoles(
        address account
    ) external view returns (bytes32[] memory) {
        return accountRoles[account];
    }

    // ============ 内部函数 ============
    /**
     * @dev 内部函数：分配角色给多签钱包
     */
    function _assignRoleToMultisig(
        bytes32 role,
        address multisigWallet,
        address assigner
    ) internal {
        _requireNonZeroAddress(
            multisigWallet,
            "RoleManager: multisig cannot be zero address"
        );

        _grantRole(role, multisigWallet);
        roleMultisigWallets[role] = multisigWallet;
        authorizedMultisigs[multisigWallet] = true;

        _addRoleToAccount(multisigWallet, role);

        emit MultisigWalletAssigned(role, multisigWallet, assigner);
    }

    /**
     * @dev 添加角色到账户记录
     */
    function _addRoleToAccount(address account, bytes32 role) internal {
        if (!hasRoleMapping[account][role]) {
            accountRoles[account].push(role);
            hasRoleMapping[account][role] = true;
        }
    }

    /**
     * @dev 从账户记录中移除角色
     */
    function _removeRoleFromAccount(address account, bytes32 role) internal {
        if (hasRoleMapping[account][role]) {
            bytes32[] storage roles = accountRoles[account];
            for (uint256 i = 0; i < roles.length; i++) {
                if (roles[i] == role) {
                    roles[i] = roles[roles.length - 1];
                    roles.pop();
                    break;
                }
            }
            hasRoleMapping[account][role] = false;
        }
    }

    /**
     * @dev 重写角色授予函数以添加冲突检测
     */
    function _grantRole(bytes32 role, address account) internal override {
        super._grantRole(role, account);
        _addRoleToAccount(account, role);
        _checkAndEmitRoleConflicts(account);
    }

    /**
     * @dev 重写角色撤销函数
     */
    function _revokeRole(bytes32 role, address account) internal override {
        super._revokeRole(role, account);
        _removeRoleFromAccount(account, role);
    }

    /**
     * @dev 检查并发出角色冲突事件
     */
    function _checkAndEmitRoleConflicts(address account) internal {
        (bool hasConflict, bytes32[] memory conflictingRoles) = this
            .checkRoleConflicts(account);
        if (hasConflict) {
            for (uint256 i = 0; i < conflictingRoles.length; i += 2) {
                emit RoleConflictDetected(
                    account,
                    conflictingRoles[i],
                    conflictingRoles[i + 1]
                );
            }
        }
    }

    /**
     * @dev 获取模块版本
     */
    function moduleVersion() external pure override returns (string memory) {
        return "1.0.0-RoleManager";
    }
}
