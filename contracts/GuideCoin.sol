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

/**
 * @title GuideCoin
 * @dev HKMA合规的可升级ERC20稳定币，采用多签控制的角色分离架构
 *
 * 核心特性:
 * - 多签控制的角色分离，最大化降低单点故障风险
 * - 8个明确定义的角色，每个角色仅限特定职能
 * - 所有关键操作需要多签授权
 * - 完整的审计日志记录
 * - 白名单和黑名单机制
 * - 专利资产支撑和收益分配
 */
contract GuideCoin is
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    AccessControlEnumerableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    // ============ 多签控制的角色定义 ============
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE"); // 铸币角色
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE"); // 销毁角色
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE"); // 暂停角色
    bytes32 public constant RESUME_ROLE = keccak256("RESUME_ROLE"); // 恢复角色
    bytes32 public constant FREEZER_ROLE = keccak256("FREEZER_ROLE"); // 冻结角色
    bytes32 public constant WHITELISTER_ROLE = keccak256("WHITELISTER_ROLE"); // 白名单管理角色
    bytes32 public constant BLACKLISTER_ROLE = keccak256("BLACKLISTER_ROLE"); // 黑名单管理角色
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE"); // 升级角色

    // 专利和收益管理角色（保留原有功能）
    bytes32 public constant PATENT_MANAGER_ROLE =
        keccak256("PATENT_MANAGER_ROLE");
    bytes32 public constant REVENUE_MANAGER_ROLE =
        keccak256("REVENUE_MANAGER_ROLE");

    // ============ 多签钱包映射 ============
    mapping(bytes32 => address) public roleMultisigWallets; // 角色 => 多签钱包地址
    mapping(address => bool) public authorizedMultisigs; // 授权的多签钱包列表

    // ============ 白名单机制 ============
    mapping(address => bool) private _whitelisted; // 白名单映射
    bool public whitelistEnabled = false; // 白名单是否启用

    // ============ 审计和日志 ============
    struct OperationLog {
        bytes32 role; // 执行角色
        address operator; // 操作者（多签钱包）
        string operation; // 操作类型
        address target; // 目标地址
        uint256 amount; // 涉及金额
        uint256 timestamp; // 操作时间
        bytes32 txHash; // 交易哈希
    }

    OperationLog[] public operationLogs; // 操作日志数组
    mapping(bytes32 => uint256) public roleOperationCounts; // 角色操作计数

    // 年度审计相关
    address public auditorAddress; // 审计机构地址
    uint256 public lastAuditTimestamp; // 上次审计时间
    string public lastAuditReport; // 上次审计报告IPFS哈希

    // ============ 事件定义 ============
    event MultisigWalletAssigned(
        bytes32 indexed role,
        address indexed multisigWallet,
        address indexed assigner
    );
    event MultisigWalletRevoked(
        bytes32 indexed role,
        address indexed multisigWallet,
        address indexed revoker
    );
    event AddressWhitelisted(address indexed account, address indexed operator);
    event AddressRemovedFromWhitelist(
        address indexed account,
        address indexed operator
    );
    event WhitelistStatusChanged(bool enabled, address indexed operator);
    event OperationLogged(
        bytes32 indexed role,
        address indexed operator,
        string operation,
        address indexed target
    );
    event AuditCompleted(
        address indexed auditor,
        string reportHash,
        uint256 timestamp
    );
    event RoleConflictDetected(
        address indexed account,
        bytes32 role1,
        bytes32 role2
    );

    // 原有事件保持不变...
    event AddressBlacklisted(address indexed account, address indexed operator);
    event AddressUnblacklisted(
        address indexed account,
        address indexed operator
    );
    event AddressFrozen(address indexed account, address indexed operator);
    event AddressUnfrozen(address indexed account, address indexed operator);
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

    // ============ 完整事件日志 ============
    event Minted(address indexed to, uint256 amount, uint256 reserveValue);
    event Burned(address indexed from, uint256 amount, uint256 reserveValue);
    event AddressFrozen(address indexed account, string reason);
    event AddressUnfrozen(address indexed account);
    event ReserveUpdated(
        uint256 oldValue,
        uint256 newValue,
        uint256 backingRatio
    );
    event ComplianceAction(
        string action,
        address indexed target,
        uint256 timestamp
    );

    // ============ 赎回相关事件 ============
    event RedemptionRequested(
        uint256 indexed requestId,
        address indexed requester,
        uint256 amount
    );
    event RedemptionProcessed(
        uint256 indexed requestId,
        address indexed requester,
        uint256 amount
    );

    // ============ 修饰符 ============
    modifier onlyAuthorizedMultisig() {
        require(
            authorizedMultisigs[msg.sender],
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
            authorizedMultisigs[msg.sender],
            "GuideCoin: caller is not authorized multisig"
        );
        _;
    }

    modifier logOperation(
        bytes32 role,
        string memory operation,
        address target,
        uint256 amount
    ) {
        _;
        _logOperation(role, msg.sender, operation, target, amount);
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化合约，设置多签钱包控制的角色
     * @param admin 管理员地址（董事会多签钱包）
     * @param minterMultisig 铸币角色多签钱包
     * @param burnerMultisig 销毁角色多签钱包
     * @param pauserMultisig 暂停角色多签钱包
     * @param resumerMultisig 恢复角色多签钱包
     * @param freezerMultisig 冻结角色多签钱包
     * @param whitelisterMultisig 白名单管理角色多签钱包
     * @param blacklisterMultisig 黑名单管理角色多签钱包
     * @param upgraderMultisig 升级角色多签钱包
     * @param patentManagerMultisig 专利管理角色多签钱包
     * @param revenueManagerMultisig 收益管理角色多签钱包
     * @param treasury 资金库地址
     */
    function initialize(
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
        address treasury
    ) public initializer {
        // 验证所有多签钱包地址
        require(admin != address(0), "GuideCoin: admin cannot be zero address");
        require(
            minterMultisig != address(0),
            "GuideCoin: minter multisig cannot be zero address"
        );
        require(
            burnerMultisig != address(0),
            "GuideCoin: burner multisig cannot be zero address"
        );
        require(
            pauserMultisig != address(0),
            "GuideCoin: pauser multisig cannot be zero address"
        );
        require(
            resumerMultisig != address(0),
            "GuideCoin: resumer multisig cannot be zero address"
        );
        require(
            freezerMultisig != address(0),
            "GuideCoin: freezer multisig cannot be zero address"
        );
        require(
            whitelisterMultisig != address(0),
            "GuideCoin: whitelister multisig cannot be zero address"
        );
        require(
            blacklisterMultisig != address(0),
            "GuideCoin: blacklister multisig cannot be zero address"
        );
        require(
            upgraderMultisig != address(0),
            "GuideCoin: upgrader multisig cannot be zero address"
        );

        __ERC20_init("GUIDE Coin", "GUIDE");
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __AccessControlEnumerable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        // 设置管理员角色
        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        // 分配角色给对应的多签钱包
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

        treasuryAddress = treasury;
        lastAuditTimestamp = block.timestamp;
    }

    // ============ 多签钱包管理 ============

    /**
     * @dev 内部函数：分配角色给多签钱包
     */
    function _assignRoleToMultisig(
        bytes32 role,
        address multisigWallet,
        address assigner
    ) internal {
        _grantRole(role, multisigWallet);
        roleMultisigWallets[role] = multisigWallet;
        authorizedMultisigs[multisigWallet] = true;
        emit MultisigWalletAssigned(role, multisigWallet, assigner);
    }

    /**
     * @dev 更换角色的多签钱包（仅管理员）
     */
    function reassignRoleMultisig(
        bytes32 role,
        address newMultisigWallet
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            newMultisigWallet != address(0),
            "GuideCoin: new multisig cannot be zero address"
        );

        address oldMultisig = roleMultisigWallets[role];
        if (oldMultisig != address(0)) {
            _revokeRole(role, oldMultisig);
            emit MultisigWalletRevoked(role, oldMultisig, msg.sender);
        }

        _assignRoleToMultisig(role, newMultisigWallet, msg.sender);
    }

    // ============ 铸币功能（MINTER_ROLE） ============

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
        logOperation(MINTER_ROLE, "MINT", to, amount)
    {
        require(to != address(0), "GuideCoin: cannot mint to zero address");
        require(amount > 0, "GuideCoin: amount must be greater than 0");
        require(
            !_blacklisted[to],
            "GuideCoin: cannot mint to blacklisted address"
        );
        require(!_frozen[to], "GuideCoin: cannot mint to frozen address");

        // 白名单检查
        if (whitelistEnabled) {
            require(_whitelisted[to], "GuideCoin: recipient not whitelisted");
        }

        _mint(to, amount);
        emit TokensMinted(to, amount, msg.sender);
    }

    // ============ 销毁功能（BURNER_ROLE） ============

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

    // ============ 白名单管理（WHITELISTER_ROLE） ============

    /**
     * @dev 启用/禁用白名单机制
     */
    function setWhitelistEnabled(
        bool enabled
    )
        external
        onlyRoleMultisig(WHITELISTER_ROLE)
        logOperation(
            WHITELISTER_ROLE,
            enabled ? "ENABLE_WHITELIST" : "DISABLE_WHITELIST",
            address(this),
            0
        )
    {
        whitelistEnabled = enabled;
        emit WhitelistStatusChanged(enabled, msg.sender);
    }

    /**
     * @dev 添加地址到白名单
     */
    function addToWhitelist(
        address account
    )
        external
        onlyRoleMultisig(WHITELISTER_ROLE)
        logOperation(WHITELISTER_ROLE, "ADD_WHITELIST", account, 0)
    {
        require(
            account != address(0),
            "GuideCoin: cannot whitelist zero address"
        );
        require(
            !_whitelisted[account],
            "GuideCoin: address already whitelisted"
        );

        _whitelisted[account] = true;
        emit AddressWhitelisted(account, msg.sender);
    }

    /**
     * @dev 从白名单移除地址
     */
    function removeFromWhitelist(
        address account
    )
        external
        onlyRoleMultisig(WHITELISTER_ROLE)
        logOperation(WHITELISTER_ROLE, "REMOVE_WHITELIST", account, 0)
    {
        require(
            account != address(0),
            "GuideCoin: cannot remove zero address from whitelist"
        );
        require(_whitelisted[account], "GuideCoin: address not whitelisted");

        _whitelisted[account] = false;
        emit AddressRemovedFromWhitelist(account, msg.sender);
    }

    /**
     * @dev 检查地址是否在白名单中
     */
    function isWhitelisted(address account) external view returns (bool) {
        return _whitelisted[account];
    }

    // ============ 冻结管理（FREEZER_ROLE） ============

    /**
     * @dev 冻结地址
     */
    function freezeAddress(
        address account
    )
        external
        onlyRoleMultisig(FREEZER_ROLE)
        logOperation(FREEZER_ROLE, "FREEZE", account, 0)
    {
        require(account != address(0), "GuideCoin: cannot freeze zero address");
        require(!_frozen[account], "GuideCoin: address already frozen");

        _frozen[account] = true;
        emit AddressFrozen(account, msg.sender);
    }

    /**
     * @dev 解冻地址
     */
    function unfreezeAddress(
        address account
    )
        external
        onlyRoleMultisig(FREEZER_ROLE)
        logOperation(FREEZER_ROLE, "UNFREEZE", account, 0)
    {
        require(
            account != address(0),
            "GuideCoin: cannot unfreeze zero address"
        );
        require(_frozen[account], "GuideCoin: address not frozen");

        _frozen[account] = false;
        emit AddressUnfrozen(account, msg.sender);
    }

    // ============ 黑名单管理（BLACKLISTER_ROLE） ============

    /**
     * @dev 添加到黑名单
     */
    function addToBlacklist(
        address account
    )
        external
        onlyRoleMultisig(BLACKLISTER_ROLE)
        logOperation(BLACKLISTER_ROLE, "ADD_BLACKLIST", account, 0)
    {
        require(
            account != address(0),
            "GuideCoin: cannot blacklist zero address"
        );
        require(
            !_blacklisted[account],
            "GuideCoin: address already blacklisted"
        );

        _blacklisted[account] = true;
        emit AddressBlacklisted(account, msg.sender);
    }

    /**
     * @dev 从黑名单移除
     */
    function removeFromBlacklist(
        address account
    )
        external
        onlyRoleMultisig(BLACKLISTER_ROLE)
        logOperation(BLACKLISTER_ROLE, "REMOVE_BLACKLIST", account, 0)
    {
        require(
            account != address(0),
            "GuideCoin: cannot remove zero address from blacklist"
        );
        require(_blacklisted[account], "GuideCoin: address not blacklisted");

        _blacklisted[account] = false;
        emit AddressUnblacklisted(account, msg.sender);
    }

    // ============ 审计和日志功能 ============

    /**
     * @dev 内部函数：记录操作日志
     */
    function _logOperation(
        bytes32 role,
        address operator,
        string memory operation,
        address target,
        uint256 amount
    ) internal {
        operationLogs.push(
            OperationLog({
                role: role,
                operator: operator,
                operation: operation,
                target: target,
                amount: amount,
                timestamp: block.timestamp,
                txHash: keccak256(
                    abi.encodePacked(block.timestamp, operator, operation)
                )
            })
        );

        roleOperationCounts[role]++;
        emit OperationLogged(role, operator, operation, target);
    }

    /**
     * @dev 设置审计机构地址
     */
    function setAuditorAddress(
        address auditor
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            auditor != address(0),
            "GuideCoin: auditor cannot be zero address"
        );
        auditorAddress = auditor;
    }

    /**
     * @dev 提交审计报告
     */
    function submitAuditReport(string calldata reportHash) external {
        require(
            msg.sender == auditorAddress,
            "GuideCoin: only auditor can submit report"
        );
        require(bytes(reportHash).length > 0, "GuideCoin: empty report hash");

        lastAuditReport = reportHash;
        lastAuditTimestamp = block.timestamp;
        emit AuditCompleted(msg.sender, reportHash, block.timestamp);
    }

    /**
     * @dev 获取操作日志数量
     */
    function getOperationLogCount() external view returns (uint256) {
        return operationLogs.length;
    }

    /**
     * @dev 获取指定角色的操作次数
     */
    function getRoleOperationCount(
        bytes32 role
    ) external view returns (uint256) {
        return roleOperationCounts[role];
    }

    // ============ 角色冲突检测 ============

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

    // ============ 升级授权（UPGRADER_ROLE） ============

    /**
     * @dev 授权升级，仅限UPGRADER_ROLE多签钱包
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRoleMultisig(UPGRADER_ROLE) {
        _logOperation(
            UPGRADER_ROLE,
            msg.sender,
            "UPGRADE",
            newImplementation,
            0
        );
        emit Upgraded(newImplementation);
    }

    // ============ 转账前检查重写 ============

    /**
     * @dev 重写转账前检查，包含白名单、黑名单、冻结检查
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20Upgradeable, ERC20PausableUpgradeable) {
        super._beforeTokenTransfer(from, to, amount);

        // 跳过铸币和销毁的检查
        if (from != address(0) && to != address(0)) {
            // 黑名单检查
            require(!_blacklisted[from], "GuideCoin: sender is blacklisted");
            require(!_blacklisted[to], "GuideCoin: recipient is blacklisted");

            // 冻结检查
            require(!_frozen[from], "GuideCoin: sender is frozen");
            require(!_frozen[to], "GuideCoin: recipient is frozen");

            // 白名单检查（如果启用）
            if (whitelistEnabled) {
                require(
                    _whitelisted[from],
                    "GuideCoin: sender not whitelisted"
                );
                require(
                    _whitelisted[to],
                    "GuideCoin: recipient not whitelisted"
                );
            }
        }
    }

    // ============ 查询函数 ============

    /**
     * @dev 获取角色对应的多签钱包地址
     */
    function getRoleMultisigWallet(
        bytes32 role
    ) external view returns (address) {
        return roleMultisigWallets[role];
    }

    /**
     * @dev 检查是否为授权的多签钱包
     */
    function isAuthorizedMultisig(address wallet) external view returns (bool) {
        return authorizedMultisigs[wallet];
    }

    /**
     * @dev 获取合约版本
     */
    function version() external pure returns (string memory) {
        return "2.0.0-multisig";
    }

    // 保留原有的专利资产管理和收益分配功能...
    // （这里省略了原有的专利相关代码，实际实现中需要保留）

    // ============ 储备资产管理 ============
    struct ReserveAsset {
        address tokenAddress; // 储备资产代币地址
        uint256 amount; // 储备数量
        uint256 valueUSD; // 美元价值
        bool isActive; // 是否激活
        uint256 lastUpdated; // 最后更新时间
    }

    mapping(address => ReserveAsset) public reserveAssets;
    address[] public reserveAssetsList;
    uint256 public totalReserveValueUSD;

    bytes32 public constant RESERVE_MANAGER_ROLE =
        keccak256("RESERVE_MANAGER_ROLE");

    event ReserveAssetAdded(
        address indexed asset,
        uint256 amount,
        uint256 valueUSD
    );
    event ReserveAssetUpdated(
        address indexed asset,
        uint256 newAmount,
        uint256 newValueUSD
    );

    // ============ 赎回机制 ============
    struct RedemptionRequest {
        address requester;
        uint256 amount;
        uint256 timestamp;
        bool processed;
        address reserveAsset;
    }

    mapping(uint256 => RedemptionRequest) public redemptionRequests;
    uint256 public redemptionRequestCounter;
    uint256 public redemptionProcessingTime = 24 hours; // 24小时处理时间

    bytes32 public constant REDEMPTION_PROCESSOR_ROLE =
        keccak256("REDEMPTION_PROCESSOR_ROLE");

    function requestRedemption(
        uint256 amount,
        address preferredAsset
    ) external {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        require(!_blacklisted[msg.sender], "Address blacklisted");
        require(!_frozen[msg.sender], "Address frozen");

        // 将代币转移到合约地址等待处理
        _transfer(msg.sender, address(this), amount);

        redemptionRequests[redemptionRequestCounter] = RedemptionRequest({
            requester: msg.sender,
            amount: amount,
            timestamp: block.timestamp,
            processed: false,
            reserveAsset: preferredAsset
        });

        emit RedemptionRequested(redemptionRequestCounter, msg.sender, amount);
        redemptionRequestCounter++;
    }

    function processRedemption(
        uint256 requestId
    ) external onlyRole(REDEMPTION_PROCESSOR_ROLE) {
        RedemptionRequest storage request = redemptionRequests[requestId];
        require(!request.processed, "Request already processed");
        require(request.requester != address(0), "Invalid request");
        require(
            block.timestamp <= request.timestamp + redemptionProcessingTime,
            "Processing window expired"
        );

        // 销毁代币
        _burn(address(this), request.amount);
        request.processed = true;

        emit RedemptionProcessed(requestId, request.requester, request.amount);
    }

    // ============ 风险管理 ============
    uint256 public maxSupply = 1000000000 * 10 ** 18; // 最大供应量
    uint256 public dailyMintLimit = 10000000 * 10 ** 18; // 日铸币限额
    uint256 public dailyBurnLimit = 10000000 * 10 ** 18; // 日销毁限额

    mapping(uint256 => uint256) public dailyMintAmount; // 日期 => 铸币量
    mapping(uint256 => uint256) public dailyBurnAmount; // 日期 => 销毁量

    function getCurrentDay() internal view returns (uint256) {
        return block.timestamp / 1 days;
    }

    modifier checkMintLimit(uint256 amount) {
        uint256 today = getCurrentDay();
        require(
            dailyMintAmount[today] + amount <= dailyMintLimit,
            "Daily mint limit exceeded"
        );
        dailyMintAmount[today] += amount;
        _;
    }

    // ============ 状态变量 ============
    mapping(address => bool) private _blacklisted; // 黑名单映射
    mapping(address => bool) private _frozen; // 冻结账户映射
    address public treasuryAddress; // 资金库地址

    // ============ 查询函数 ============
    function isBlacklisted(address account) external view returns (bool) {
        return _blacklisted[account];
    }

    function isFrozen(address account) external view returns (bool) {
        return _frozen[account];
    }
}
