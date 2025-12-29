// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../modules/RoleManager.sol";
import "../modules/ComplianceManager.sol";
import "../modules/PatentAssetManager.sol";
import "../modules/ReserveAssetManager.sol";
import "../modules/RevenueDistributor.sol";
import "../modules/RedemptionManager.sol";
import "../modules/AuditLogger.sol";
import "../PatentCoinModular.sol";

/**
 * @title DeploymentHelper
 * @dev 帮助部署PatentCoin模块化系统的辅助合约
 */
contract DeploymentHelper {
    struct DeploymentConfig {
        address admin;
        address minterMultisig;
        address burnerMultisig;
        address pauserMultisig;
        address resumerMultisig;
        address freezerMultisig;
        address whitelisterMultisig;
        address blacklisterMultisig;
        address upgraderMultisig;
        address patentManagerMultisig;
        address revenueManagerMultisig;
        address reserveManagerMultisig;
        address redemptionProcessorMultisig;
        address treasury;
        address feeRecipient;
    }

    struct DeployedContracts {
        address roleManager;
        address complianceManager;
        address patentAssetManager;
        address reserveAssetManager;
        address revenueDistributor;
        address redemptionManager;
        address auditLogger;
        address patentCoin;
    }

    event ModuleDeployed(string indexed moduleName, address indexed moduleAddress);
    event SystemDeployed(address indexed patentCoin, address indexed admin);

    /**
     * @dev 部署所有模块和主合约
     */
    function deployCompleteSystem(
        DeploymentConfig memory config
    ) external returns (DeployedContracts memory deployed) {
        // 验证配置
        _validateConfig(config);

        // 部署模块
        deployed.roleManager = _deployRoleManager(config);
        deployed.complianceManager = _deployComplianceManager(config);
        deployed.patentAssetManager = _deployPatentAssetManager(config);
        deployed.reserveAssetManager = _deployReserveAssetManager(config);
        deployed.revenueDistributor = _deployRevenueDistributor(config);
        deployed.redemptionManager = _deployRedemptionManager(config);
        deployed.auditLogger = _deployAuditLogger(config);

        // 部署主合约
        deployed.patentCoin = _deployPatentCoin(config, deployed);

        emit SystemDeployed(deployed.patentCoin, config.admin);
    }

    /**
     * @dev 部署角色管理器
     */
    function _deployRoleManager(
        DeploymentConfig memory config
    ) internal returns (address) {
        RoleManager roleManager = new RoleManager();
        
        roleManager.initialize(
            address(0), // 临时设置，稍后更新
            config.admin,
            config.minterMultisig,
            config.burnerMultisig,
            config.pauserMultisig,
            config.resumerMultisig,
            config.freezerMultisig,
            config.whitelisterMultisig,
            config.blacklisterMultisig,
            config.upgraderMultisig,
            config.patentManagerMultisig,
            config.revenueManagerMultisig,
            config.reserveManagerMultisig,
            config.redemptionProcessorMultisig
        );

        emit ModuleDeployed("RoleManager", address(roleManager));
        return address(roleManager);
    }

    /**
     * @dev 部署合规管理器
     */
    function _deployComplianceManager(
        DeploymentConfig memory config
    ) internal returns (address) {
        ComplianceManager complianceManager = new ComplianceManager();
        complianceManager.initialize(address(0), config.admin);

        emit ModuleDeployed("ComplianceManager", address(complianceManager));
        return address(complianceManager);
    }

    /**
     * @dev 部署专利资产管理器
     */
    function _deployPatentAssetManager(
        DeploymentConfig memory config
    ) internal returns (address) {
        PatentAssetManager patentAssetManager = new PatentAssetManager();
        patentAssetManager.initialize(address(0), config.admin);

        emit ModuleDeployed("PatentAssetManager", address(patentAssetManager));
        return address(patentAssetManager);
    }

    /**
     * @dev 部署储备资产管理器
     */
    function _deployReserveAssetManager(
        DeploymentConfig memory config
    ) internal returns (address) {
        ReserveAssetManager reserveAssetManager = new ReserveAssetManager();
        reserveAssetManager.initialize(address(0), config.admin);

        emit ModuleDeployed("ReserveAssetManager", address(reserveAssetManager));
        return address(reserveAssetManager);
    }

    /**
     * @dev 部署收益分配器
     */
    function _deployRevenueDistributor(
        DeploymentConfig memory config
    ) internal returns (address) {
        RevenueDistributor revenueDistributor = new RevenueDistributor();
        revenueDistributor.initialize(address(0), config.admin, config.treasury);

        emit ModuleDeployed("RevenueDistributor", address(revenueDistributor));
        return address(revenueDistributor);
    }

    /**
     * @dev 部署赎回管理器
     */
    function _deployRedemptionManager(
        DeploymentConfig memory config
    ) internal returns (address) {
        RedemptionManager redemptionManager = new RedemptionManager();
        redemptionManager.initialize(address(0), config.admin, config.feeRecipient);

        emit ModuleDeployed("RedemptionManager", address(redemptionManager));
        return address(redemptionManager);
    }

    /**
     * @dev 部署审计日志器
     */
    function _deployAuditLogger(
        DeploymentConfig memory config
    ) internal returns (address) {
        AuditLogger auditLogger = new AuditLogger();
        auditLogger.initialize(address(0), config.admin);

        emit ModuleDeployed("AuditLogger", address(auditLogger));
        return address(auditLogger);
    }

    /**
     * @dev 部署主合约
     */
    function _deployPatentCoin(
        DeploymentConfig memory config,
        DeployedContracts memory modules
    ) internal returns (address) {
        PatentCoinModular patentCoin = new PatentCoinModular();
        
        patentCoin.initialize(
            config.admin,
            modules.roleManager,
            modules.complianceManager,
            modules.patentAssetManager,
            modules.reserveAssetManager,
            modules.revenueDistributor,
            modules.redemptionManager,
            modules.auditLogger,
            config.treasury
        );

        // 更新所有模块的PatentCoin合约地址
        _updateModuleReferences(modules, address(patentCoin));

        emit ModuleDeployed("PatentCoinModular", address(patentCoin));
        return address(patentCoin);
    }

    /**
     * @dev 更新模块中的PatentCoin合约引用
     */
    function _updateModuleReferences(
        DeployedContracts memory modules,
        address patentCoinAddress
    ) internal {
        RoleManager(modules.roleManager).setPatentCoinContract(patentCoinAddress);
        ComplianceManager(modules.complianceManager).setPatentCoinContract(patentCoinAddress);
        PatentAssetManager(modules.patentAssetManager).setPatentCoinContract(patentCoinAddress);
        ReserveAssetManager(modules.reserveAssetManager).setPatentCoinContract(patentCoinAddress);
        RevenueDistributor(modules.revenueDistributor).setPatentCoinContract(patentCoinAddress);
        RedemptionManager(modules.redemptionManager).setPatentCoinContract(patentCoinAddress);
        AuditLogger(modules.auditLogger).setPatentCoinContract(patentCoinAddress);
    }

    /**
     * @dev 验证部署配置
     */
    function _validateConfig(DeploymentConfig memory config) internal pure {
        require(config.admin != address(0), "DeploymentHelper: admin cannot be zero");
        require(config.minterMultisig != address(0), "DeploymentHelper: minterMultisig cannot be zero");
        require(config.burnerMultisig != address(0), "DeploymentHelper: burnerMultisig cannot be zero");
        require(config.pauserMultisig != address(0), "DeploymentHelper: pauserMultisig cannot be zero");
        require(config.resumerMultisig != address(0), "DeploymentHelper: resumerMultisig cannot be zero");
        require(config.freezerMultisig != address(0), "DeploymentHelper: freezerMultisig cannot be zero");
        require(config.whitelisterMultisig != address(0), "DeploymentHelper: whitelisterMultisig cannot be zero");
        require(config.blacklisterMultisig != address(0), "DeploymentHelper: blacklisterMultisig cannot be zero");
        require(config.upgraderMultisig != address(0), "DeploymentHelper: upgraderMultisig cannot be zero");
        require(config.patentManagerMultisig != address(0), "DeploymentHelper: patentManagerMultisig cannot be zero");
        require(config.revenueManagerMultisig != address(0), "DeploymentHelper: revenueManagerMultisig cannot be zero");
        require(config.reserveManagerMultisig != address(0), "DeploymentHelper: reserveManagerMultisig cannot be zero");
        require(config.redemptionProcessorMultisig != address(0), "DeploymentHelper: redemptionProcessorMultisig cannot be zero");
        require(config.treasury != address(0), "DeploymentHelper: treasury cannot be zero");
        require(config.feeRecipient != address(0), "DeploymentHelper: feeRecipient cannot be zero");
    }

    /**
     * @dev 获取部署配置模板
     */
    function getDeploymentConfigTemplate() external pure returns (DeploymentConfig memory) {
        return DeploymentConfig({
            admin: address(0),
            minterMultisig: address(0),
            burnerMultisig: address(0),
            pauserMultisig: address(0),
            resumerMultisig: address(0),
            freezerMultisig: address(0),
            whitelisterMultisig: address(0),
            blacklisterMultisig: address(0),
            upgraderMultisig: address(0),
            patentManagerMultisig: address(0),
            revenueManagerMultisig: address(0),
            reserveManagerMultisig: address(0),
            redemptionProcessorMultisig: address(0),
            treasury: address(0),
            feeRecipient: address(0)
        });
    }
}
