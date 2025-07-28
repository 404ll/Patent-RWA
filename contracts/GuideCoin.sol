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
 * @dev HKMA合规的可升级ERC20稳定币，由多个专利资产支撑
 *
 * 核心特性:
 * - UUPS可升级代理模式
 * - 基于角色的访问控制与可枚举角色
 * - 暂停功能，分离暂停/恢复角色
 * - 铸币和销毁功能
 * - 黑名单和冻结机制，满足监管合规
 * - 多专利资产支撑的单一代币
 * - 统一收益分配机制
 * - 完整的事件日志，支持审计
 * - 重入攻击防护
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
    // ============ 角色定义 ============
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant RESUME_ROLE = keccak256("RESUME_ROLE");
    bytes32 public constant BLACKLISTER_ROLE = keccak256("BLACKLISTER_ROLE");
    bytes32 public constant FREEZER_ROLE = keccak256("FREEZER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PATENT_MANAGER_ROLE =
        keccak256("PATENT_MANAGER_ROLE");
    bytes32 public constant REVENUE_MANAGER_ROLE =
        keccak256("REVENUE_MANAGER_ROLE");

    // 专利资产结构
    struct PatentAsset {
        string patentNumber; // 专利号
        string title; // 专利标题
        string[] inventors; // 发明人列表
        uint256 valuationUSD; // 美元估值
        uint256 weight; // 在资产池中的权重 (基点, 10000 = 100%)
        bool active; // 是否激活
        uint256 addedTimestamp; // 添加时间
        string ipfsMetadata; // IPFS元数据哈希
    }

    // 收益分配轮次
    struct RevenueRound {
        uint256 totalAmount; // 总收益金额
        uint256 timestamp; // 分配时间
        address revenueToken; // 收益代币地址
        mapping(address => bool) claimed; // 用户领取状态
        uint256 totalSupplySnapshot; // 总供应量快照
    }

    // 黑名单和冻结映射
    mapping(address => bool) private _blacklisted;
    mapping(address => bool) private _frozen;

    // 专利资产相关状态
    mapping(string => PatentAsset) public patents; // 专利号 => 专利资产
    string[] public patentNumbers; // 专利号列表
    uint256 public totalPatentValuation; // 专利总估值

    // 收益分配相关状态
    mapping(uint256 => RevenueRound) public revenueRounds; // 收益分配轮次
    uint256 public currentRevenueRound; // 当前收益轮次
    uint256 public totalRevenueDistributed; // 累计分配收益

    // 平台管理
    address public treasuryAddress; // 资金库地址
    uint256 public platformFeeRate = 250; // 平台费率 (2.5%)
    uint256 public constant MAX_FEE_RATE = 1000; // 最大费率 (10%)

    // 监管合规和审计事件
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
    event Upgraded(address indexed implementation);

    // 专利资产管理事件
    event PatentAdded(
        string indexed patentNumber,
        string title,
        uint256 valuation,
        uint256 weight
    );
    event PatentUpdated(
        string indexed patentNumber,
        uint256 newValuation,
        uint256 newWeight
    );
    event PatentRemoved(string indexed patentNumber);

    // 收益分配事件
    event RevenueDistributed(
        uint256 indexed round,
        uint256 totalAmount,
        address revenueToken
    );
    event RevenueClaimed(address indexed user, uint256 amount, uint256 round);

    // 平台管理事件
    event TreasuryUpdated(
        address indexed oldTreasury,
        address indexed newTreasury
    );
    event PlatformFeeUpdated(uint256 oldRate, uint256 newRate);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化合约，设置初始参数
     * @param admin 将被授予DEFAULT_ADMIN_ROLE的地址
     * @param minter 将被授予MINTER_ROLE的地址
     * @param pauser 将被授予PAUSER_ROLE的地址
     * @param resumer 将被授予RESUME_ROLE的地址
     * @param blacklister 将被授予BLACKLISTER_ROLE的地址
     * @param freezer 将被授予FREEZER_ROLE的地址
     * @param upgrader 将被授予UPGRADER_ROLE的地址
     * @param patentManager 将被授予PATENT_MANAGER_ROLE的地址
     * @param revenueManager 将被授予REVENUE_MANAGER_ROLE的地址
     * @param treasury 资金库地址
     */
    function initialize(
        address admin,
        address minter,
        address pauser,
        address resumer,
        address blacklister,
        address freezer,
        address upgrader,
        address patentManager,
        address revenueManager,
        address treasury
    ) public initializer {
        require(admin != address(0), "GuideCoin: admin cannot be zero address");
        require(
            minter != address(0),
            "GuideCoin: minter cannot be zero address"
        );
        require(
            pauser != address(0),
            "GuideCoin: pauser cannot be zero address"
        );
        require(
            resumer != address(0),
            "GuideCoin: resumer cannot be zero address"
        );
        require(
            blacklister != address(0),
            "GuideCoin: blacklister cannot be zero address"
        );
        require(
            freezer != address(0),
            "GuideCoin: freezer cannot be zero address"
        );
        require(
            upgrader != address(0),
            "GuideCoin: upgrader cannot be zero address"
        );
        require(
            patentManager != address(0),
            "GuideCoin: patentManager cannot be zero address"
        );
        require(
            revenueManager != address(0),
            "GuideCoin: revenueManager cannot be zero address"
        );

        __ERC20_init("GUIDE Coin", "GUIDE");
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __AccessControlEnumerable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        // 授予角色给指定地址
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, minter);
        _grantRole(BURNER_ROLE, admin); // 管理员也可以销毁
        _grantRole(PAUSER_ROLE, pauser);
        _grantRole(RESUME_ROLE, resumer);
        _grantRole(BLACKLISTER_ROLE, blacklister);
        _grantRole(FREEZER_ROLE, freezer);
        _grantRole(UPGRADER_ROLE, upgrader);
        _grantRole(PATENT_MANAGER_ROLE, patentManager);
        _grantRole(REVENUE_MANAGER_ROLE, revenueManager);

        treasuryAddress = treasury;
    }

    // ============ 代币基础功能 ============

    /**
     * @dev 向指定地址铸造代币
     * @param to 铸造代币的目标地址
     * @param amount 铸造的代币数量
     */
    function mint(
        address to,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) nonReentrant {
        require(to != address(0), "GuideCoin: cannot mint to zero address");
        require(amount > 0, "GuideCoin: amount must be greater than 0");
        require(
            !_blacklisted[to],
            "GuideCoin: cannot mint to blacklisted address"
        );
        require(!_frozen[to], "GuideCoin: cannot mint to frozen address");

        _mint(to, amount);
        emit TokensMinted(to, amount, _msgSender());
    }

    /**
     * @dev 从指定地址销毁代币
     * @param account 销毁代币的目标地址
     * @param amount 销毁的代币数量
     */
    function burnFrom(
        address account,
        uint256 amount
    ) public override onlyRole(BURNER_ROLE) nonReentrant {
        require(
            account != address(0),
            "GuideCoin: cannot burn from zero address"
        );
        require(amount > 0, "GuideCoin: amount must be greater than 0");

        _burn(account, amount);
        emit TokensBurned(account, amount, _msgSender());
    }

    /**
     * @dev 暂停所有代币转账
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
        emit ContractPaused(_msgSender());
    }

    /**
     * @dev 恢复所有代币转账
     */
    function unpause() external onlyRole(RESUME_ROLE) {
        _unpause();
        emit ContractUnpaused(_msgSender());
    }

    // ============ 专利资产管理 ============

    /**
     * @dev 添加专利资产到资产池
     * @param patentNumber 专利号
     * @param title 专利标题
     * @param inventors 发明人列表
     * @param valuationUSD 美元估值
     * @param weight 在资产池中的权重 (基点)
     * @param ipfsMetadata IPFS元数据哈希
     */
    function addPatent(
        string memory patentNumber,
        string memory title,
        string[] memory inventors,
        uint256 valuationUSD,
        uint256 weight,
        string memory ipfsMetadata
    ) external onlyRole(PATENT_MANAGER_ROLE) {
        require(bytes(patentNumber).length > 0, "Invalid patent number");
        require(
            bytes(patents[patentNumber].patentNumber).length == 0,
            "Patent already exists"
        );
        require(valuationUSD > 0, "Valuation must be > 0");
        require(weight > 0 && weight <= 10000, "Invalid weight");

        patents[patentNumber] = PatentAsset({
            patentNumber: patentNumber,
            title: title,
            inventors: inventors,
            valuationUSD: valuationUSD,
            weight: weight,
            active: true,
            addedTimestamp: block.timestamp,
            ipfsMetadata: ipfsMetadata
        });

        patentNumbers.push(patentNumber);
        totalPatentValuation += valuationUSD;

        emit PatentAdded(patentNumber, title, valuationUSD, weight);
    }

    /**
     * @dev 更新专利资产信息
     * @param patentNumber 专利号
     * @param newValuationUSD 新的美元估值
     * @param newWeight 新的权重
     * @param newIpfsMetadata 新的IPFS元数据哈希
     */
    function updatePatent(
        string memory patentNumber,
        uint256 newValuationUSD,
        uint256 newWeight,
        string memory newIpfsMetadata
    ) external onlyRole(PATENT_MANAGER_ROLE) {
        require(
            bytes(patents[patentNumber].patentNumber).length > 0,
            "Patent not found"
        );
        require(newValuationUSD > 0, "Valuation must be > 0");
        require(newWeight > 0 && newWeight <= 10000, "Invalid weight");

        PatentAsset storage patent = patents[patentNumber];

        // 更新总估值
        totalPatentValuation =
            totalPatentValuation -
            patent.valuationUSD +
            newValuationUSD;

        patent.valuationUSD = newValuationUSD;
        patent.weight = newWeight;
        patent.ipfsMetadata = newIpfsMetadata;

        emit PatentUpdated(patentNumber, newValuationUSD, newWeight);
    }

    /**
     * @dev 停用专利资产
     * @param patentNumber 专利号
     */
    function deactivatePatent(
        string memory patentNumber
    ) external onlyRole(PATENT_MANAGER_ROLE) {
        require(
            bytes(patents[patentNumber].patentNumber).length > 0,
            "Patent not found"
        );
        require(patents[patentNumber].active, "Patent already inactive");

        patents[patentNumber].active = false;
        totalPatentValuation -= patents[patentNumber].valuationUSD;

        emit PatentRemoved(patentNumber);
    }

    // ============ 收益分配功能 ============

    /**
     * @dev 分配收益给所有GUIDE持有者
     * @param totalRevenue 总收益金额
     * @param revenueToken 收益代币地址 (如USDC)
     */
    function distributeRevenue(
        uint256 totalRevenue,
        address revenueToken
    ) external onlyRole(REVENUE_MANAGER_ROLE) nonReentrant {
        require(totalRevenue > 0, "Revenue must be > 0");
        require(revenueToken != address(0), "Invalid revenue token");
        require(totalSupply() > 0, "No tokens in circulation");

        // 计算平台费用
        uint256 platformFee = (totalRevenue * platformFeeRate) / 10000;
        uint256 netRevenue = totalRevenue - platformFee;

        currentRevenueRound++;

        RevenueRound storage round = revenueRounds[currentRevenueRound];
        round.totalAmount = netRevenue;
        round.timestamp = block.timestamp;
        round.revenueToken = revenueToken;
        round.totalSupplySnapshot = totalSupply();

        totalRevenueDistributed += netRevenue;

        // 转入收益代币
        IERC20Upgradeable(revenueToken).transferFrom(
            msg.sender,
            address(this),
            totalRevenue
        );

        // 转移平台费用到资金库
        if (platformFee > 0 && treasuryAddress != address(0)) {
            IERC20Upgradeable(revenueToken).transfer(
                treasuryAddress,
                platformFee
            );
        }

        emit RevenueDistributed(currentRevenueRound, netRevenue, revenueToken);
    }

    /**
     * @dev 用户领取收益
     * @param roundId 收益分配轮次ID
     */
    function claimRevenue(uint256 roundId) external nonReentrant {
        require(roundId <= currentRevenueRound && roundId > 0, "Invalid round");
        require(balanceOf(msg.sender) > 0, "No GUIDE tokens");

        RevenueRound storage round = revenueRounds[roundId];
        require(!round.claimed[msg.sender], "Already claimed");
        require(round.totalAmount > 0, "No revenue in this round");

        uint256 userBalance = balanceOf(msg.sender);
        uint256 userShare = (round.totalAmount * userBalance) /
            round.totalSupplySnapshot;

        round.claimed[msg.sender] = true;
        IERC20Upgradeable(round.revenueToken).transfer(msg.sender, userShare);

        emit RevenueClaimed(msg.sender, userShare, roundId);
    }

    /**
     * @dev 查询用户在指定轮次的可领取收益
     * @param user 用户地址
     * @param roundId 收益分配轮次ID
     * @return 可领取的收益金额
     */
    function getClaimableRevenue(
        address user,
        uint256 roundId
    ) external view returns (uint256) {
        if (roundId > currentRevenueRound || roundId == 0) return 0;

        RevenueRound storage round = revenueRounds[roundId];
        if (round.claimed[user] || round.totalAmount == 0) return 0;

        uint256 userBalance = balanceOf(user);
        if (userBalance == 0) return 0;

        return (round.totalAmount * userBalance) / round.totalSupplySnapshot;
    }

    // ============ 黑名单管理 ============

    /**
     * @dev 将地址添加到黑名单
     * @param account 要加入黑名单的地址
     */
    function addToBlacklist(
        address account
    ) external onlyRole(BLACKLISTER_ROLE) {
        require(account != address(0), "Cannot blacklist zero address");
        require(!_blacklisted[account], "Address already blacklisted");

        _blacklisted[account] = true;
        emit AddressBlacklisted(account, _msgSender());
    }

    /**
     * @dev 将地址从黑名单中移除
     * @param account 要从黑名单移除的地址
     */
    function removeFromBlacklist(
        address account
    ) external onlyRole(BLACKLISTER_ROLE) {
        require(account != address(0), "Cannot unblacklist zero address");
        require(_blacklisted[account], "Address not blacklisted");

        _blacklisted[account] = false;
        emit AddressUnblacklisted(account, _msgSender());
    }

    /**
     * @dev 检查地址是否在黑名单中
     * @param account 要检查的地址
     * @return 如果在黑名单中返回true
     */
    function isBlacklisted(address account) external view returns (bool) {
        return _blacklisted[account];
    }

    // ============ 地址冻结管理 ============

    /**
     * @dev 冻结地址
     * @param account 要冻结的地址
     */
    function freezeAddress(address account) external onlyRole(FREEZER_ROLE) {
        require(account != address(0), "Cannot freeze zero address");
        require(!_frozen[account], "Address already frozen");

        _frozen[account] = true;
        emit AddressFrozen(account, _msgSender());
    }

    /**
     * @dev 解冻地址
     * @param account 要解冻的地址
     */
    function unfreezeAddress(address account) external onlyRole(FREEZER_ROLE) {
        require(account != address(0), "Cannot unfreeze zero address");
        require(_frozen[account], "Address not frozen");

        _frozen[account] = false;
        emit AddressUnfrozen(account, _msgSender());
    }

    /**
     * @dev 检查地址是否被冻结
     * @param account 要检查的地址
     * @return 如果被冻结返回true
     */
    function isFrozen(address account) external view returns (bool) {
        return _frozen[account];
    }

    // ============ 查询函数 ============

    /**
     * @dev 获取专利资产数量
     * @return 专利资产总数
     */
    function getPatentCount() external view returns (uint256) {
        return patentNumbers.length;
    }

    /**
     * @dev 获取专利资产详情
     * @param patentNumber 专利号
     * @return 专利资产信息
     */
    function getPatent(
        string memory patentNumber
    ) external view returns (PatentAsset memory) {
        return patents[patentNumber];
    }

    /**
     * @dev 获取所有专利号列表
     * @return 专利号数组
     */
    function getAllPatentNumbers() external view returns (string[] memory) {
        return patentNumbers;
    }

    /**
     * @dev 获取资产支撑比率 (专利总估值 / 代币总供应量)
     * @return 资产支撑比率 (18位小数)
     */
    function getBackingRatio() external view returns (uint256) {
        if (totalSupply() == 0) return 0;
        return (totalPatentValuation * 1e18) / totalSupply();
    }

    // ============ 平台管理功能 ============

    /**
     * @dev 更新资金库地址
     * @param newTreasury 新的资金库地址
     */
    function setTreasuryAddress(
        address newTreasury
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldTreasury = treasuryAddress;
        treasuryAddress = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @dev 更新平台费率
     * @param newRate 新的费率 (基点)
     */
    function setPlatformFeeRate(
        uint256 newRate
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newRate <= MAX_FEE_RATE, "Fee rate too high");
        uint256 oldRate = platformFeeRate;
        platformFeeRate = newRate;
        emit PlatformFeeUpdated(oldRate, newRate);
    }

    /**
     * @dev 紧急功能：恢复意外发送的ERC20代币
     * @param token 代币合约地址
     * @param amount 恢复数量
     */
    function emergencyRecoverToken(
        address token,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Amount must be > 0");

        IERC20Upgradeable(token).transfer(msg.sender, amount);
    }

    // ============ 内部函数重写 ============

    /**
     * @dev 重写_beforeTokenTransfer以实现黑名单和冻结检查
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20Upgradeable, ERC20PausableUpgradeable) {
        // 调用父合约实现
        super._beforeTokenTransfer(from, to, amount);

        // 跳过铸币 (from == address(0)) 和销毁 (to == address(0)) 的检查
        if (from != address(0) && to != address(0)) {
            require(!_blacklisted[from], "GuideCoin: sender is blacklisted");
            require(!_blacklisted[to], "GuideCoin: recipient is blacklisted");
            require(!_frozen[from], "GuideCoin: sender is frozen");
            require(!_frozen[to], "GuideCoin: recipient is frozen");
        }
    }

    /**
     * @dev 授权升级函数 - 只有UPGRADER_ROLE可以升级
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {
        emit Upgraded(newImplementation);
    }

    /**
     * @dev 重写supportsInterface以包含所有继承的接口
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(AccessControlEnumerableUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev 获取合约版本
     * @return 版本字符串
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }

    /**
     * @dev 获取实现合约地址
     * @return 实现合约地址
     */
    function getImplementation() external view returns (address) {
        return _getImplementation();
    }

    /**
     * @dev 获取指定角色的所有成员
     * @param role 角色哈希
     * @return 成员地址数组
     */
    function getRoleMembers(
        bytes32 role
    ) external view returns (address[] memory) {
        uint256 count = getRoleMemberCount(role);
        address[] memory members = new address[](count);

        for (uint256 i = 0; i < count; i++) {
            members[i] = getRoleMember(role, i);
        }

        return members;
    }
}
