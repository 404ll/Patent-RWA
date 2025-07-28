// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../abstract/BaseGuideCoinModule.sol";
import "../interfaces/IGuideCoinModules.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

/**
 * @title RevenueDistributor
 * @dev 管理GuideCoin的收益分配，包括收益分配、用户领取和平台费用
 */
contract RevenueDistributor is BaseGuideCoinModule, IRevenueDistributor {
    // ============ 状态变量 ============
    struct RevenueRoundInternal {
        uint256 totalAmount;
        uint256 timestamp;
        address revenueToken;
        uint256 totalSupplySnapshot;
        mapping(address => bool) claimed;
        uint256 claimedAmount;
        bool finalized;
    }

    mapping(uint256 => RevenueRoundInternal) internal revenueRounds;
    uint256 public currentRevenueRound;
    
    // 平台费用配置
    address public treasuryAddress;
    uint256 public platformFeeRate = 250; // 2.5%
    uint256 public constant MAX_FEE_RATE = 1000; // 10%

    // 收益统计
    mapping(address => uint256) public totalClaimedByUser;
    mapping(address => uint256) public totalDistributedByToken;
    uint256 public totalPlatformFees;

    // 领取时间限制
    uint256 public claimDeadline = 365 days; // 1年领取期限

    // ============ 事件 ============
    event TreasuryAddressUpdated(address indexed oldTreasury, address indexed newTreasury);
    event PlatformFeeRateUpdated(uint256 oldRate, uint256 newRate);
    event RevenueRoundFinalized(uint256 indexed roundId, uint256 unclaimedAmount);
    event ClaimDeadlineUpdated(uint256 oldDeadline, uint256 newDeadline);

    // ============ 初始化函数 ============
    function initialize(
        address _guideCoinContract,
        address admin,
        address _treasuryAddress
    ) public initializer {
        __BaseGuideCoinModule_init(_guideCoinContract, admin);
        _requireNonZeroAddress(_treasuryAddress, "RevenueDistributor: treasury cannot be zero address");
        treasuryAddress = _treasuryAddress;
    }

    // ============ 收益分配函数 ============
    /**
     * @dev 分配收益
     */
    function distributeRevenue(
        uint256 totalRevenue,
        address revenueToken,
        uint256 totalSupply
    ) external override onlyRoleMultisig(REVENUE_MANAGER_ROLE) nonReentrant {
        _requirePositiveValue(totalRevenue, "RevenueDistributor: invalid revenue amount");
        _requireNonZeroAddress(revenueToken, "RevenueDistributor: invalid revenue token");
        _requirePositiveValue(totalSupply, "RevenueDistributor: no tokens in circulation");

        uint256 platformFee = (totalRevenue * platformFeeRate) / 10000;
        uint256 netRevenue = totalRevenue - platformFee;

        currentRevenueRound++;
        RevenueRoundInternal storage round = revenueRounds[currentRevenueRound];
        round.totalAmount = netRevenue;
        round.revenueToken = revenueToken;
        round.timestamp = block.timestamp;
        round.totalSupplySnapshot = totalSupply;
        round.finalized = false;

        // 转移收益代币到合约
        IERC20Upgradeable(revenueToken).transferFrom(msg.sender, address(this), totalRevenue);

        // 转移平台费用到资金库
        if (platformFee > 0) {
            IERC20Upgradeable(revenueToken).transfer(treasuryAddress, platformFee);
            totalPlatformFees += platformFee;
        }

        // 更新统计
        totalDistributedByToken[revenueToken] += netRevenue;

        emit RevenueDistributed(currentRevenueRound, netRevenue, revenueToken);
    }

    /**
     * @dev 用户领取收益
     */
    function claimRevenue(
        uint256 roundId,
        address user,
        uint256 userBalance
    ) external override onlyGuideCoin nonReentrant returns (uint256) {
        require(roundId <= currentRevenueRound, "RevenueDistributor: invalid round");
        
        RevenueRoundInternal storage round = revenueRounds[roundId];
        require(!round.claimed[user], "RevenueDistributor: already claimed");
        require(round.totalAmount > 0, "RevenueDistributor: no revenue to claim");
        require(!round.finalized, "RevenueDistributor: round finalized");
        require(
            block.timestamp <= round.timestamp + claimDeadline,
            "RevenueDistributor: claim deadline passed"
        );

        _requirePositiveValue(userBalance, "RevenueDistributor: no tokens held");

        uint256 userShare = (round.totalAmount * userBalance) / round.totalSupplySnapshot;
        require(userShare > 0, "RevenueDistributor: no revenue share");

        round.claimed[user] = true;
        round.claimedAmount += userShare;

        // 更新用户统计
        totalClaimedByUser[user] += userShare;

        IERC20Upgradeable(round.revenueToken).transfer(user, userShare);

        emit RevenueClaimed(roundId, user, userShare);
        return userShare;
    }

    /**
     * @dev 批量领取多轮收益
     */
    function batchClaimRevenue(
        uint256[] calldata roundIds,
        address user,
        uint256 userBalance
    ) external onlyGuideCoin nonReentrant returns (uint256 totalClaimed) {
        for (uint256 i = 0; i < roundIds.length; i++) {
            if (!hasClaimedRevenue(roundIds[i], user)) {
                totalClaimed += this.claimRevenue(roundIds[i], user, userBalance);
            }
        }
    }

    // ============ 管理函数 ============
    /**
     * @dev 设置资金库地址
     */
    function setTreasuryAddress(address _treasuryAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _requireNonZeroAddress(_treasuryAddress, "RevenueDistributor: treasury cannot be zero address");
        
        address oldTreasury = treasuryAddress;
        treasuryAddress = _treasuryAddress;
        
        emit TreasuryAddressUpdated(oldTreasury, _treasuryAddress);
    }

    /**
     * @dev 设置平台费率
     */
    function setPlatformFeeRate(uint256 _feeRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_feeRate <= MAX_FEE_RATE, "RevenueDistributor: fee rate too high");
        
        uint256 oldRate = platformFeeRate;
        platformFeeRate = _feeRate;
        
        emit PlatformFeeRateUpdated(oldRate, _feeRate);
    }

    /**
     * @dev 设置领取期限
     */
    function setClaimDeadline(uint256 _deadline) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_deadline >= 30 days, "RevenueDistributor: deadline too short");
        require(_deadline <= 730 days, "RevenueDistributor: deadline too long");
        
        uint256 oldDeadline = claimDeadline;
        claimDeadline = _deadline;
        
        emit ClaimDeadlineUpdated(oldDeadline, _deadline);
    }

    /**
     * @dev 结算过期轮次
     */
    function finalizeExpiredRound(uint256 roundId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(roundId <= currentRevenueRound, "RevenueDistributor: invalid round");
        
        RevenueRoundInternal storage round = revenueRounds[roundId];
        require(!round.finalized, "RevenueDistributor: already finalized");
        require(
            block.timestamp > round.timestamp + claimDeadline,
            "RevenueDistributor: round not expired"
        );

        uint256 unclaimedAmount = round.totalAmount - round.claimedAmount;
        round.finalized = true;

        // 将未领取的收益转移到资金库
        if (unclaimedAmount > 0) {
            IERC20Upgradeable(round.revenueToken).transfer(treasuryAddress, unclaimedAmount);
        }

        emit RevenueRoundFinalized(roundId, unclaimedAmount);
    }

    // ============ 查询函数 ============
    /**
     * @dev 获取当前收益轮次
     */
    function getCurrentRevenueRound() external view override returns (uint256) {
        return currentRevenueRound;
    }

    /**
     * @dev 检查用户是否已领取收益
     */
    function hasClaimedRevenue(uint256 roundId, address user) public view override returns (bool) {
        if (roundId > currentRevenueRound) return false;
        return revenueRounds[roundId].claimed[user];
    }

    /**
     * @dev 获取可领取的收益
     */
    function getClaimableRevenue(
        uint256 roundId,
        address user,
        uint256 userBalance
    ) external view override returns (uint256) {
        if (roundId > currentRevenueRound) return 0;

        RevenueRoundInternal storage round = revenueRounds[roundId];
        if (round.claimed[user] || round.totalAmount == 0 || round.finalized) return 0;
        if (block.timestamp > round.timestamp + claimDeadline) return 0;

        if (userBalance == 0) return 0;

        return (round.totalAmount * userBalance) / round.totalSupplySnapshot;
    }

    /**
     * @dev 获取收益轮次信息
     */
    function getRevenueRound(uint256 roundId) external view returns (RevenueRound memory) {
        require(roundId <= currentRevenueRound, "RevenueDistributor: invalid round");
        
        RevenueRoundInternal storage round = revenueRounds[roundId];
        return RevenueRound({
            totalAmount: round.totalAmount,
            timestamp: round.timestamp,
            revenueToken: round.revenueToken,
            totalSupplySnapshot: round.totalSupplySnapshot
        });
    }

    /**
     * @dev 获取用户收益统计
     */
    function getUserRevenueStats(address user) external view returns (
        uint256 totalClaimed,
        uint256 pendingRounds,
        uint256 totalPending
    ) {
        totalClaimed = totalClaimedByUser[user];
        
        // 计算待领取轮次和金额（需要外部提供用户余额）
        for (uint256 i = 1; i <= currentRevenueRound; i++) {
            if (!hasClaimedRevenue(i, user) && !revenueRounds[i].finalized) {
                if (block.timestamp <= revenueRounds[i].timestamp + claimDeadline) {
                    pendingRounds++;
                }
            }
        }
    }

    /**
     * @dev 获取模块版本
     */
    function moduleVersion() external pure override returns (string memory) {
        return "1.0.0-RevenueDistributor";
    }
}
