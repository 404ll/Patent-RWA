// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import "./interfaces/IGuideCoinModules.sol";
import "./modules/RoleManager.sol";
import "./modules/ComplianceManager.sol";
import "./modules/PatentAssetManager.sol";
import "./modules/ReserveAssetManager.sol";
import "./modules/RevenueDistributor.sol";
import "./modules/RedemptionManager.sol";
import "./modules/AuditLogger.sol";

/**
 * @title GuideCoinModular
 * @dev HKMA合规的可升级ERC20稳定币，采用模块化架构和多签控制的角色分离
 *
 * 核心特性:
 * - 模块化架构，各功能独立管理
 * - 多签控制的角色分离，最大化降低单点故障风险
 * - 8个明确定义的角色，每个角色仅限特定职能
 * - 所有关键操作需要多签授权
 * - 完整的审计日志记录
 * - 白名单和黑名单机制
 * - 专利资产支撑和收益分配
 */
contract GuideCoinModular is
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    AccessControlEnumerableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    // ============ 角色定义 ============
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant RESUME_ROLE = keccak256("RESUME_ROLE");
    bytes32 public constant FREEZER_ROLE = keccak256("FREEZER_ROLE");
    bytes32 public constant WHITELISTER_ROLE = keccak256("WHITELISTER_ROLE");
    bytes32 public constant BLACKLISTER_ROLE = keccak256("BLACKLISTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PATENT_MANAGER_ROLE =
        keccak256("PATENT_MANAGER_ROLE");
    bytes32 public constant REVENUE_MANAGER_ROLE =
        keccak256("REVENUE_MANAGER_ROLE");
    bytes32 public constant RESERVE_MANAGER_ROLE =
        keccak256("RESERVE_MANAGER_ROLE");
    bytes32 public constant REDEMPTION_PROCESSOR_ROLE =
        keccak256("REDEMPTION_PROCESSOR_ROLE");

    // ============ 模块合约地址 ============
    RoleManager public roleManager;
    ComplianceManager public complianceManager;
    PatentAssetManager public patentAssetManager;
    ReserveAssetManager public reserveAssetManager;
    RevenueDistributor public revenueDistributor;
    RedemptionManager public redemptionManager;
    AuditLogger public auditLogger;

    // ============ 系统配置 ============
    address public treasuryAddress;
    uint256 public platformFeeRate = 250; // 2.5%

    // ============ 风险管理 ============
    uint256 public maxSupply = 1_000_000_000 * 10 ** 18;
    uint256 public dailyMintLimit = 10_000_000 * 10 ** 18;
    uint256 public dailyBurnLimit = 10_000_000 * 10 ** 18;

    mapping(uint256 => uint256) public dailyMintAmount;
    mapping(uint256 => uint256) public dailyBurnAmount;

    // ============ 事件定义 ============
    event ModuleUpdated(
        string indexed moduleName,
        address indexed oldModule,
        address indexed newModule
    );
    event TokensMinted(
        address indexed to,
        uint256 amount,
        address indexed minter
    );
    event TokensBurned(
        address indexed from,
        uint256 amount,
        address indexed burner
    );
    event ContractPaused(address indexed pauser);
    event ContractUnpaused(address indexed resumer);

    // ============ 修饰符 ============
    modifier onlyAuthorizedMultisig() {
        require(
            roleManager.isAuthorizedMultisig(msg.sender),
            "GuideCoin: caller is not authorized multisig"
        );
        _;
    }

    modifier onlyRoleMultisig(bytes32 role) {
        require(
            hasRole(role, msg.sender),
            "GuideCoin: caller does not have required role"
        );
        require(
            roleManager.isAuthorizedMultisig(msg.sender),
            "GuideCoin: caller is not authorized multisig"
        );
        _;
    }

    modifier checkMintLimit(uint256 amount) {
        uint256 today = block.timestamp / 1 days;
        require(
            dailyMintAmount[today] + amount <= dailyMintLimit,
            "GuideCoin: daily mint limit exceeded"
        );
        dailyMintAmount[today] += amount;
        _;
    }

    modifier checkBurnLimit(uint256 amount) {
        uint256 today = block.timestamp / 1 days;
        require(
            dailyBurnAmount[today] + amount <= dailyBurnLimit,
            "GuideCoin: daily burn limit exceeded"
        );
        dailyBurnAmount[today] += amount;
        _;
    }

    modifier logOperation(
        bytes32 role,
        string memory operation,
        address target,
        uint256 amount
    ) {
        _;
        auditLogger.logOperation(role, msg.sender, operation, target, amount);
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化合约，设置模块地址和基本配置
     */
    function initialize(
        address admin,
        address _roleManager,
        address _complianceManager,
        address _patentAssetManager,
        address _reserveAssetManager,
        address _revenueDistributor,
        address _redemptionManager,
        address _auditLogger,
        address treasury
    ) public initializer {
        // 验证地址
        require(
            treasury != address(0),
            "GuideCoin: treasury cannot be zero address"
        );
        require(
            _roleManager != address(0),
            "GuideCoin: roleManager cannot be zero address"
        );
        require(
            _complianceManager != address(0),
            "GuideCoin: complianceManager cannot be zero address"
        );
        require(
            _patentAssetManager != address(0),
            "GuideCoin: patentAssetManager cannot be zero address"
        );
        require(
            _reserveAssetManager != address(0),
            "GuideCoin: reserveAssetManager cannot be zero address"
        );
        require(
            _revenueDistributor != address(0),
            "GuideCoin: revenueDistributor cannot be zero address"
        );
        require(
            _redemptionManager != address(0),
            "GuideCoin: redemptionManager cannot be zero address"
        );
        require(
            _auditLogger != address(0),
            "GuideCoin: auditLogger cannot be zero address"
        );

        // 初始化父合约
        __ERC20_init("GUIDE Coin", "GUIDE");
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __AccessControlEnumerable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        // 设置管理员角色
        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        // 设置模块地址
        roleManager = RoleManager(_roleManager);
        complianceManager = ComplianceManager(_complianceManager);
        patentAssetManager = PatentAssetManager(_patentAssetManager);
        reserveAssetManager = ReserveAssetManager(_reserveAssetManager);
        revenueDistributor = RevenueDistributor(_revenueDistributor);
        redemptionManager = RedemptionManager(_redemptionManager);
        auditLogger = AuditLogger(_auditLogger);

        // 设置资金库地址
        treasuryAddress = treasury;
    }

    // ============ 模块管理函数 ============
    /**
     * @dev 更新模块地址（仅管理员）
     */
    function updateModule(
        string calldata moduleName,
        address newModule
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            newModule != address(0),
            "GuideCoin: new module cannot be zero address"
        );

        address oldModule;
        bytes32 moduleHash = keccak256(bytes(moduleName));

        if (moduleHash == keccak256("RoleManager")) {
            oldModule = address(roleManager);
            roleManager = RoleManager(newModule);
        } else if (moduleHash == keccak256("ComplianceManager")) {
            oldModule = address(complianceManager);
            complianceManager = ComplianceManager(newModule);
        } else if (moduleHash == keccak256("PatentAssetManager")) {
            oldModule = address(patentAssetManager);
            patentAssetManager = PatentAssetManager(newModule);
        } else if (moduleHash == keccak256("ReserveAssetManager")) {
            oldModule = address(reserveAssetManager);
            reserveAssetManager = ReserveAssetManager(newModule);
        } else if (moduleHash == keccak256("RevenueDistributor")) {
            oldModule = address(revenueDistributor);
            revenueDistributor = RevenueDistributor(newModule);
        } else if (moduleHash == keccak256("RedemptionManager")) {
            oldModule = address(redemptionManager);
            redemptionManager = RedemptionManager(newModule);
        } else if (moduleHash == keccak256("AuditLogger")) {
            oldModule = address(auditLogger);
            auditLogger = AuditLogger(newModule);
        } else {
            revert("GuideCoin: unknown module name");
        }

        emit ModuleUpdated(moduleName, oldModule, newModule);
    }

    // ============ 铸币功能 ============
    /**
     * @dev 铸币功能，仅限MINTER_ROLE多签钱包
     */
    function mint(
        address to,
        uint256 amount
    )
        external
        onlyRoleMultisig(MINTER_ROLE)
        nonReentrant
        checkMintLimit(amount)
        logOperation(MINTER_ROLE, "MINT", to, amount)
    {
        require(to != address(0), "GuideCoin: cannot mint to zero address");
        require(amount > 0, "GuideCoin: amount must be greater than 0");
        require(
            totalSupply() + amount <= maxSupply,
            "GuideCoin: exceeds max supply"
        );

        // 合规检查
        require(
            complianceManager.checkTransferCompliance(address(0), to),
            "GuideCoin: compliance check failed"
        );

        _mint(to, amount);
        emit TokensMinted(to, amount, msg.sender);
    }

    // ============ 销毁功能 ============
    /**
     * @dev 销毁功能，仅限BURNER_ROLE多签钱包
     */
    function burnFrom(
        address account,
        uint256 amount
    )
        public
        override
        onlyRoleMultisig(BURNER_ROLE)
        nonReentrant
        checkBurnLimit(amount)
        logOperation(BURNER_ROLE, "BURN", account, amount)
    {
        require(
            account != address(0),
            "GuideCoin: cannot burn from zero address"
        );
        require(amount > 0, "GuideCoin: amount must be greater than 0");

        _burn(account, amount);
        emit TokensBurned(account, amount, msg.sender);
    }

    // ============ 暂停/恢复功能 ============
    /**
     * @dev 暂停合约，仅限PAUSER_ROLE多签钱包
     */
    function pause()
        external
        onlyRoleMultisig(PAUSER_ROLE)
        logOperation(PAUSER_ROLE, "PAUSE", address(this), 0)
    {
        _pause();
        emit ContractPaused(msg.sender);
    }

    /**
     * @dev 恢复合约，仅限RESUME_ROLE多签钱包
     */
    function unpause()
        external
        onlyRoleMultisig(RESUME_ROLE)
        logOperation(RESUME_ROLE, "UNPAUSE", address(this), 0)
    {
        _unpause();
        emit ContractUnpaused(msg.sender);
    }

    // ============ 赎回功能 ============
    /**
     * @dev 请求赎回
     */
    function requestRedemption(
        uint256 amount,
        address preferredAsset
    ) external nonReentrant returns (uint256) {
        require(amount > 0, "GuideCoin: invalid amount");
        require(
            balanceOf(msg.sender) >= amount,
            "GuideCoin: insufficient balance"
        );

        // 合规检查
        require(
            !complianceManager.isBlacklisted(msg.sender),
            "GuideCoin: address blacklisted"
        );
        require(
            !complianceManager.isFrozen(msg.sender),
            "GuideCoin: address frozen"
        );

        // 转移代币到合约
        _transfer(msg.sender, address(this), amount);

        // 调用赎回管理器
        return
            redemptionManager.requestRedemption(
                msg.sender,
                amount,
                preferredAsset
            );
    }

    /**
     * @dev 处理赎回（仅限REDEMPTION_PROCESSOR_ROLE）
     */
    function processRedemption(
        uint256 requestId
    ) external onlyRoleMultisig(REDEMPTION_PROCESSOR_ROLE) {
        IRedemptionManager.RedemptionRequest memory request = redemptionManager
            .getRedemptionRequest(requestId);

        // 销毁代币
        _burn(address(this), request.amount);

        // 调用赎回管理器处理
        redemptionManager.processRedemption(requestId);
    }

    // ============ 收益分配功能 ============
    /**
     * @dev 分配收益（仅限REVENUE_MANAGER_ROLE）
     */
    function distributeRevenue(
        uint256 totalRevenue,
        address revenueToken
    ) external onlyRoleMultisig(REVENUE_MANAGER_ROLE) nonReentrant {
        revenueDistributor.distributeRevenue(
            totalRevenue,
            revenueToken,
            totalSupply()
        );
    }

    /**
     * @dev 用户领取收益
     */
    function claimRevenue(uint256 roundId) external nonReentrant {
        require(
            !complianceManager.isBlacklisted(msg.sender),
            "GuideCoin: address blacklisted"
        );
        require(
            !complianceManager.isFrozen(msg.sender),
            "GuideCoin: address frozen"
        );

        revenueDistributor.claimRevenue(
            roundId,
            msg.sender,
            balanceOf(msg.sender)
        );
    }

    // ============ 升级授权 ============
    /**
     * @dev 授权升级，仅限UPGRADER_ROLE多签钱包
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRoleMultisig(UPGRADER_ROLE) {
        auditLogger.logOperation(
            UPGRADER_ROLE,
            msg.sender,
            "UPGRADE",
            newImplementation,
            0
        );
    }

    // ============ 转账前检查重写 ============
    /**
     * @dev 重写转账前检查，包含合规检查
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20Upgradeable, ERC20PausableUpgradeable) {
        super._beforeTokenTransfer(from, to, amount);

        // 跳过铸币和销毁的检查
        if (from != address(0) && to != address(0)) {
            require(
                complianceManager.checkTransferCompliance(from, to),
                "GuideCoin: transfer not compliant"
            );
        }
    }

    // ============ 查询函数 ============
    /**
     * @dev 检查地址是否在黑名单中
     */
    function isBlacklisted(address account) external view returns (bool) {
        return complianceManager.isBlacklisted(account);
    }

    /**
     * @dev 检查地址是否被冻结
     */
    function isFrozen(address account) external view returns (bool) {
        return complianceManager.isFrozen(account);
    }

    /**
     * @dev 检查地址是否在白名单中
     */
    function isWhitelisted(address account) external view returns (bool) {
        return complianceManager.isWhitelisted(account);
    }

    /**
     * @dev 获取角色对应的多签钱包地址
     */
    function getRoleMultisigWallet(
        bytes32 role
    ) external view returns (address) {
        return roleManager.getRoleMultisigWallet(role);
    }

    /**
     * @dev 检查地址是否为授权的多签钱包
     */
    function isAuthorizedMultisig(address wallet) external view returns (bool) {
        return roleManager.isAuthorizedMultisig(wallet);
    }

    /**
     * @dev 获取专利数量
     */
    function getPatentCount() external view returns (uint256) {
        return patentAssetManager.getPatentCount();
    }

    /**
     * @dev 获取储备资产数量
     */
    function getReserveAssetCount() external view returns (uint256) {
        return reserveAssetManager.getReserveAssetCount();
    }

    /**
     * @dev 获取支撑比率
     */
    function getBackingRatio() external view returns (uint256) {
        return reserveAssetManager.getBackingRatio(totalSupply());
    }

    /**
     * @dev 获取总专利估值
     */
    function getTotalPatentValuation() external view returns (uint256) {
        return patentAssetManager.getTotalPatentValuation();
    }

    /**
     * @dev 获取总储备价值
     */
    function getTotalReserveValueUSD() external view returns (uint256) {
        return reserveAssetManager.getTotalReserveValueUSD();
    }

    /**
     * @dev 获取当前收益轮次
     */
    function getCurrentRevenueRound() external view returns (uint256) {
        return revenueDistributor.getCurrentRevenueRound();
    }

    /**
     * @dev 获取赎回请求计数器
     */
    function getRedemptionRequestCounter() external view returns (uint256) {
        return redemptionManager.getRedemptionRequestCounter();
    }

    /**
     * @dev 获取操作日志数量
     */
    function getOperationLogCount() external view returns (uint256) {
        return auditLogger.getOperationLogCount();
    }

    /**
     * @dev 获取合约版本
     */
    function version() external pure returns (string memory) {
        return "2.0.0-modular";
    }

    // ============ 管理函数 ============
    /**
     * @dev 设置日常限额（仅管理员）
     */
    function setDailyLimits(
        uint256 _mintLimit,
        uint256 _burnLimit
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_mintLimit > 0, "GuideCoin: invalid mint limit");
        require(_burnLimit > 0, "GuideCoin: invalid burn limit");

        dailyMintLimit = _mintLimit;
        dailyBurnLimit = _burnLimit;
    }

    /**
     * @dev 设置最大供应量（仅管理员）
     */
    function setMaxSupply(
        uint256 _maxSupply
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            _maxSupply >= totalSupply(),
            "GuideCoin: max supply cannot be less than current supply"
        );
        maxSupply = _maxSupply;
    }

    /**
     * @dev 设置资金库地址（仅管理员）
     */
    function setTreasuryAddress(
        address _treasury
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            _treasury != address(0),
            "GuideCoin: treasury cannot be zero address"
        );
        treasuryAddress = _treasury;
    }

    /**
     * @dev 设置平台费率（仅管理员）
     */
    function setPlatformFeeRate(
        uint256 _feeRate
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_feeRate <= 1000, "GuideCoin: fee rate cannot exceed 10%");
        platformFeeRate = _feeRate;
    }

    // ============ 紧急功能 ============
    /**
     * @dev 紧急暂停（仅管理员）
     */
    function emergencyPause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
        auditLogger.logOperation(
            DEFAULT_ADMIN_ROLE,
            msg.sender,
            "EMERGENCY_PAUSE",
            address(this),
            0
        );
        emit ContractPaused(msg.sender);
    }

    /**
     * @dev 紧急恢复（仅管理员）
     */
    function emergencyUnpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
        auditLogger.logOperation(
            DEFAULT_ADMIN_ROLE,
            msg.sender,
            "EMERGENCY_UNPAUSE",
            address(this),
            0
        );
        emit ContractUnpaused(msg.sender);
    }
}
